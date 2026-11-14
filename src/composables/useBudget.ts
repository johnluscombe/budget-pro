import { t } from "../i18n";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
    createBudget,
    validateBudget,
    type BudgetDocument
} from "../lib/budget";

const RECENT_KEY = "budget-pro:recent";
type FileResult = import("../types/budget-files").BudgetFileResult;

export function useBudget() {
    const document = ref<BudgetDocument>(
        createBudget(t("defaults.budgets.sample"), undefined, true)
    );
    const filePath = ref("");
    const readOnly = ref(false);
    const lockDescription = ref("");
    const loadVersion = ref(0);
    const snapshot = ref(JSON.stringify(document.value));
    const dirty = computed(
        () => JSON.stringify(document.value) !== snapshot.value
    );
    const busy = ref(false);
    const ready = ref(false);
    const error = ref("");
    const notice = ref("");
    const confirming = ref(false);
    let pending: (() => void | Promise<void>) | undefined;
    let unsubscribe: (() => void) | undefined;

    function accept(result: FileResult) {
        document.value = validateBudget(result.document);
        filePath.value = result.path;
        readOnly.value = Boolean(result.readOnly);
        lockDescription.value = result.lockDescription || "";
        snapshot.value = JSON.stringify(document.value);
        loadVersion.value++;
    }

    async function save(saveAs = false): Promise<boolean> {
        if (busy.value || !ready.value) return false;
        if (readOnly.value) saveAs = true;
        busy.value = true;
        error.value = "";
        try {
            const data = validateBudget(
                JSON.parse(JSON.stringify(document.value))
            );
            let warning: string | undefined;
            if (window.budgetFiles) {
                const result = await window.budgetFiles.save(
                    data,
                    filePath.value || undefined,
                    saveAs
                );
                if (!result) return false;
                filePath.value = result.path;
                readOnly.value = Boolean(result.readOnly);
                lockDescription.value = result.lockDescription || "";
                snapshot.value = JSON.stringify(
                    validateBudget(result.document)
                );
                warning = result.warning;
            } else {
                const filename = `${data.name.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || t("defaults.budgets.unnamed")}.budget.json`;
                const url = URL.createObjectURL(
                    new Blob([JSON.stringify(data, null, 2)], {
                        type: "application/json"
                    })
                );
                const link = documentElement("a");
                link.href = url;
                link.download = filename;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                localStorage.setItem(
                    RECENT_KEY,
                    JSON.stringify({ document: data, path: filename })
                );
                filePath.value = filename;
                snapshot.value = JSON.stringify(data);
            }
            notice.value =
                warning ||
                (dirty.value
                    ? t("files.status.savedWithNewerChanges")
                    : t("files.status.saved"));
            return true;
        } catch (cause) {
            error.value =
                cause instanceof Error ? cause.message : t("files.errors.save");
            return false;
        } finally {
            busy.value = false;
        }
    }

    function guard(action: () => void | Promise<void>) {
        if (busy.value || !ready.value) return;
        if (dirty.value) {
            pending = action;
            confirming.value = true;
        } else void action();
    }

    async function continueAction(shouldSave: boolean) {
        if (shouldSave && (!(await save()) || dirty.value)) return;
        const action = pending;
        pending = undefined;
        confirming.value = false;
        await action?.();
    }

    function open() {
        guard(async () => {
            error.value = "";
            busy.value = true;
            try {
                let result: FileResult | null = null;
                if (window.budgetFiles) {
                    result = await window.budgetFiles.open();
                } else {
                    const input = documentElement("input");
                    input.type = "file";
                    input.accept = ".json,.budget";
                    result = await new Promise<FileResult | null>(
                        (resolve, reject) => {
                            input.oncancel = () => resolve(null);
                            input.onchange = () => {
                                const file = input.files?.[0];
                                if (!file) return resolve(null);
                                void file
                                    .text()
                                    .then(text =>
                                        resolve({
                                            document: validateBudget(
                                                JSON.parse(text)
                                            ),
                                            path: file.name
                                        })
                                    )
                                    .catch(reject);
                            };
                            input.click();
                        }
                    );
                    if (result)
                        localStorage.setItem(
                            RECENT_KEY,
                            JSON.stringify(result)
                        );
                }
                if (result) {
                    accept(result);
                    notice.value = result.warning || t("files.status.opened");
                }
            } catch (cause) {
                error.value =
                    cause instanceof Error
                        ? cause.message
                        : t("files.errors.open");
            } finally {
                busy.value = false;
            }
        });
    }

    async function newBudget(name: string) {
        const next = createBudget(name);
        busy.value = true;
        try {
            await window.budgetFiles?.close();
            document.value = next;
            filePath.value = "";
            readOnly.value = false;
            lockDescription.value = "";
            snapshot.value = "";
            loadVersion.value++;
            notice.value = t("files.status.created");
        } finally {
            busy.value = false;
        }
    }

    async function unlock() {
        if (busy.value || !readOnly.value || !window.budgetFiles) return;
        busy.value = true;
        error.value = "";
        try {
            const result = await window.budgetFiles.unlock();
            if (result) accept(result);
        } catch (cause) {
            error.value =
                cause instanceof Error ? cause.message : t("files.errors.open");
        } finally {
            busy.value = false;
        }
    }

    const requestNew = ref(0);
    function nativeAction(action: "new" | "open" | "save" | "save-as") {
        if (action === "new")
            guard(() => {
                requestNew.value++;
            });
        else if (action === "open") open();
        else void save(action === "save-as");
    }

    function beforeUnload(event: BeforeUnloadEvent) {
        if (dirty.value && !window.budgetFiles) event.preventDefault();
    }

    watch(dirty, value => window.budgetFiles?.setDirty(value), {
        flush: "sync"
    });
    onMounted(async () => {
        window.addEventListener("beforeunload", beforeUnload);
        if (window.budgetFiles)
            unsubscribe = window.budgetFiles.onAction(nativeAction);
        try {
            const result = window.budgetFiles
                ? await window.budgetFiles.restore()
                : (JSON.parse(
                      localStorage.getItem(RECENT_KEY) || "null"
                  ) as FileResult | null);
            if (result) {
                accept(result);
                if (result.warning) notice.value = result.warning;
            }
        } catch (cause) {
            error.value =
                cause instanceof Error
                    ? cause.message
                    : t("files.errors.restore");
        } finally {
            ready.value = true;
        }
    });
    onBeforeUnmount(() => {
        unsubscribe?.();
        window.removeEventListener("beforeunload", beforeUnload);
    });

    return {
        document,
        filePath,
        readOnly,
        lockDescription,
        unlock,
        loadVersion,
        dirty,
        busy,
        ready,
        error,
        notice,
        confirming,
        requestNew,
        save,
        open,
        guard,
        continueAction,
        newBudget
    };
}

function documentElement<K extends keyof HTMLElementTagNameMap>(tag: K) {
    return window.document.createElement(tag);
}
