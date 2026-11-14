import { t, locale } from "../i18n";
import type { BudgetEditorMode } from "../types/budget-editor";
import { computed, reactive, ref, watch } from "vue";
import { useBudget } from "../composables/useBudget";
import {
    categoryTotals,
    getMonth,
    monthKey,
    parseMoney,
    removeCategory,
    removeGroup,
    summary,
    validateBudget,
    type BudgetDocument
} from "../lib/budget";

export function useBudgetPage() {
    type Modal = BudgetEditorMode;
    const {
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
    } = useBudget();
    const selectedMonth = ref(monthKey());
    const view = ref<"budget" | "activity">("budget");
    const collapsed = reactive(new Set<string>());
    const search = ref("");
    const modal = ref<Modal | null>(null);
    const editingId = ref("");
    const formError = ref("");
    const form = reactive({
        name: "",
        amount: "",
        groupId: "",
        categoryId: "",
        payee: "",
        date: "",
        note: ""
    });
    const activeMonth = computed(() =>
        getMonth(document.value, selectedMonth.value)
    );
    const totals = computed(() => summary(document.value, selectedMonth.value));
    const categories = computed(() =>
        document.value.groups.flatMap(group => group.categories)
    );
    const monthLabel = computed(() =>
        new Intl.DateTimeFormat(locale, {
            month: "long",
            year: "numeric"
        }).format(new Date(`${selectedMonth.value}-01T12:00:00`))
    );
    const fileName = computed(() => filePath.value.split(/[\\/]/).pop());
    const groupOptions = computed(() =>
        document.value.groups.map(group => ({
            label: group.name,
            value: group.id
        }))
    );
    const categoryOptions = computed(() =>
        document.value.groups.flatMap(group =>
            group.categories.map(category => ({
                label: category.name,
                value: category.id,
                description: group.name
            }))
        )
    );
    const groupSpending = computed(() =>
        document.value.groups.map(group => ({
            id: group.id,
            name: group.name,
            spent: group.categories.reduce(
                (sum, category) =>
                    sum +
                    categoryTotals(
                        document.value,
                        selectedMonth.value,
                        category.id
                    ).spent,
                0
            )
        }))
    );
    const filteredTransactions = computed(() =>
        [...activeMonth.value.transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .filter(transaction =>
                `${transaction.payee} ${categoryName(transaction.categoryId)} ${transaction.note}`
                    .toLowerCase()
                    .includes(search.value.toLowerCase())
            )
    );
    watch(requestNew, () => showModal("budget"));
    watch(loadVersion, () => {
        selectedMonth.value = monthKey();
        collapsed.clear();
        view.value = "budget";
        modal.value = null;
        deleteConfirmation.value = false;
        deleteAction = undefined;
    });
    function categoryName(id: string) {
        return (
            categories.value.find(category => category.id === id)?.name ||
            t("common.fields.category")
        );
    }
    function toggleGroup(id: string) {
        if (collapsed.has(id)) collapsed.delete(id);
        else collapsed.add(id);
    }
    function ensureMonth(budget = document.value) {
        return (budget.months[selectedMonth.value] ||= {
            income: 0,
            allocations: {},
            transactions: []
        });
    }
    function showModal(type: Modal, groupId = "") {
        if (busy.value || !ready.value || (readOnly.value && type !== "budget"))
            return;
        editingId.value = "";
        formError.value = "";
        Object.assign(form, {
            name: type === "rename" ? document.value.name : "",
            amount:
                type === "income"
                    ? (activeMonth.value.income / 100).toFixed(2)
                    : "",
            groupId,
            categoryId: categories.value[0]?.id || "",
            payee: "",
            date:
                monthKey() === selectedMonth.value
                    ? localDate()
                    : `${selectedMonth.value}-01`,
            note: ""
        });
        modal.value = type;
    }
    function localDate() {
        const now = new Date();
        return `${monthKey(now)}-${String(now.getDate()).padStart(2, "0")}`;
    }
    function editGroup(id: string) {
        showModal("group");
        editingId.value = id;
        form.name =
            document.value.groups.find(group => group.id === id)?.name || "";
    }
    function editCategory(groupId: string, id: string) {
        showModal("category", groupId);
        editingId.value = id;
        form.name = categoryName(id);
    }
    function planCategory(id: string) {
        showModal("plan");
        editingId.value = id;
        form.amount = (
            categoryTotals(document.value, selectedMonth.value, id).planned /
            100
        ).toFixed(2);
    }
    function editExpense(id: string) {
        const transaction = activeMonth.value.transactions.find(
            item => item.id === id
        );
        if (!transaction) return;
        showModal("expense");
        editingId.value = id;
        Object.assign(form, {
            ...transaction,
            amount: (transaction.amount / 100).toFixed(2)
        });
    }
    async function submitForm() {
        if (
            busy.value ||
            !ready.value ||
            (readOnly.value && modal.value !== "budget")
        )
            return;
        try {
            if (modal.value === "budget") {
                await newBudget(form.name.trim());
                modal.value = null;
                return;
            }
            const candidate: BudgetDocument = validateBudget(document.value);
            if (modal.value === "rename") candidate.name = form.name.trim();
            if (modal.value === "income")
                ensureMonth(candidate).income = parseMoney(form.amount);
            if (modal.value === "group") {
                if (editingId.value) {
                    const group = candidate.groups.find(
                        item => item.id === editingId.value
                    );
                    if (group) group.name = form.name.trim();
                } else
                    candidate.groups.push({
                        id: crypto.randomUUID(),
                        name: form.name.trim(),
                        icon: "folder_open",
                        categories: []
                    });
            }
            if (modal.value === "category") {
                const target = candidate.groups.find(
                    group => group.id === form.groupId
                );
                if (!target)
                    throw new Error(t("editor.validation.groupRequired"));
                if (editingId.value) {
                    const source = candidate.groups.find(group =>
                        group.categories.some(
                            category => category.id === editingId.value
                        )
                    );
                    const category = source?.categories.find(
                        item => item.id === editingId.value
                    );
                    if (category && source) {
                        category.name = form.name.trim();
                        if (source.id !== target.id) {
                            source.categories = source.categories.filter(
                                item => item.id !== category.id
                            );
                            target.categories.push(category);
                        }
                    }
                } else
                    target.categories.push({
                        id: crypto.randomUUID(),
                        name: form.name.trim()
                    });
                collapsed.delete(target.id);
            }
            if (modal.value === "plan")
                ensureMonth(candidate).allocations[editingId.value] =
                    parseMoney(form.amount);
            if (modal.value === "expense") {
                const transaction = {
                    id: editingId.value || crypto.randomUUID(),
                    categoryId: form.categoryId,
                    amount: parseMoney(form.amount),
                    date: form.date,
                    payee: form.payee.trim(),
                    note: form.note.trim()
                };
                const candidateMonth = ensureMonth(candidate);
                candidateMonth.transactions =
                    candidateMonth.transactions.filter(
                        item => item.id !== transaction.id
                    );
                candidateMonth.transactions.push(transaction);
            }
            document.value = validateBudget(candidate);
            modal.value = null;
        } catch (cause) {
            formError.value =
                cause instanceof Error
                    ? cause.message
                    : t("editor.validation.invalidEntry");
        }
    }
    const deleteConfirmation = ref(false);
    const deleteTitle = ref("");
    const deleteDescription = ref("");
    let deleteAction: (() => void) | undefined;
    function askDelete(title: string, description: string, action: () => void) {
        if (busy.value || !ready.value || readOnly.value) return;
        deleteTitle.value = title;
        deleteDescription.value = description;
        deleteAction = action;
        deleteConfirmation.value = true;
    }
    function deleteCategory(id: string) {
        askDelete(
            t("dialogs.delete.title", { name: categoryName(id) }),
            t("dialogs.delete.categoryDescription"),
            () => removeCategory(document.value, id)
        );
    }
    function deleteGroup(id: string) {
        const group = document.value.groups.find(item => item.id === id);
        askDelete(
            t("dialogs.delete.title", {
                name: group?.name ?? t("common.fields.group")
            }),
            t("dialogs.delete.groupDescription"),
            () => removeGroup(document.value, id)
        );
    }
    function removeExpense(id: string) {
        const transaction = activeMonth.value.transactions.find(
            item => item.id === id
        );
        askDelete(
            t("dialogs.delete.expenseTitle"),
            t("dialogs.delete.expenseDescription", {
                payee: transaction?.payee ?? t("common.fields.payee")
            }),
            () => {
                ensureMonth().transactions =
                    activeMonth.value.transactions.filter(
                        item => item.id !== id
                    );
            }
        );
    }
    function confirmDelete() {
        if (busy.value || !ready.value || readOnly.value) return;
        try {
            deleteAction?.();
        } catch (cause) {
            error.value =
                cause instanceof Error
                    ? cause.message
                    : t("editor.validation.deleteFailed");
        }
    }
    return {
        document,
        filePath,
        readOnly,
        lockDescription,
        unlock,
        dirty,
        busy,
        ready,
        error,
        notice,
        confirming,
        save,
        open,
        guard,
        continueAction,
        selectedMonth,
        view,
        collapsed,
        search,
        modal,
        editingId,
        formError,
        form,
        activeMonth,
        totals,
        categories,
        monthLabel,
        fileName,
        groupOptions,
        categoryOptions,
        groupSpending,
        filteredTransactions,
        categoryName,
        toggleGroup,
        showModal,
        editGroup,
        editCategory,
        planCategory,
        editExpense,
        submitForm,
        deleteConfirmation,
        deleteTitle,
        deleteDescription,
        deleteCategory,
        deleteGroup,
        removeExpense,
        confirmDelete
    };
}
