import { t } from "../src/i18n";
import {
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    Menu,
    type IpcMainEvent,
    type IpcMainInvokeEvent,
    type MenuItemConstructorOptions
} from "electron";
import path from "node:path";
import {
    registerQuasarRuntime,
    resolveElectronAssetsPath
} from "#q-app/electron/main";
import { BudgetFileService } from "./file-service";
import type { BudgetDocument } from "../src/lib/budget";
import type { BudgetAction } from "../src/types/budget-files";

if (
    process.env.BUDGET_PRO_USER_DATA &&
    path.isAbsolute(process.env.BUDGET_PRO_USER_DATA)
) {
    app.setPath("userData", process.env.BUDGET_PRO_USER_DATA);
}

let mainWindow: BrowserWindow | null = null;
let files: BudgetFileService;
let dirty = false;
let closeAfterSave = false;
let closeSaveSucceeded = false;
let allowClose = false;
let quitting = false;
let fileBusy = false;

async function fileOperation<T>(action: () => Promise<T>): Promise<T> {
    if (fileBusy) throw new Error(t("files.locks.busy"));
    fileBusy = true;
    try {
        return await action();
    } finally {
        fileBusy = false;
    }
}

function assertSender(event: IpcMainInvokeEvent | IpcMainEvent) {
    if (
        !mainWindow ||
        event.sender !== mainWindow.webContents ||
        event.senderFrame !== mainWindow.webContents.mainFrame
    ) {
        throw new Error(t("desktop.errors.unauthorizedFileAccess"));
    }
}

function sendAction(action: BudgetAction) {
    mainWindow?.webContents.send("budget:action", action);
}

function installHandlers() {
    ipcMain.handle("budget:close", event => {
        assertSender(event);
        if (fileBusy) throw new Error(t("files.locks.busy"));
        files.close();
    });
    ipcMain.handle("budget:unlock", async event => {
        assertSender(event);
        return fileOperation(async () => {
            if (!files.readOnly) return null;
            const response = await dialog.showMessageBox(mainWindow!, {
                type: "warning",
                title: t("files.locks.unlockTitle"),
                message: t("files.locks.unlockMessage"),
                detail: t("files.locks.unlockDetail"),
                buttons: [
                    t("common.actions.cancel"),
                    t("files.locks.removeLock")
                ],
                defaultId: 0,
                cancelId: 0,
                noLink: true
            });
            if (response.response !== 1) return null;
            return files.unlock();
        });
    });
    ipcMain.handle("budget:restore", async event => {
        assertSender(event);
        return fileOperation(() => files.restore());
    });

    ipcMain.handle("budget:open", async event => {
        assertSender(event);
        return fileOperation(async () => {
            const chosen = await dialog.showOpenDialog(mainWindow!, {
                title: t("files.actions.openBudget"),
                properties: ["openFile"],
                filters: [
                    {
                        name: t("desktop.dialogs.fileFilter"),
                        extensions: ["json"]
                    }
                ]
            });
            if (chosen.canceled || !chosen.filePaths[0]) return null;
            return files.open(chosen.filePaths[0]);
        });
    });

    ipcMain.handle(
        "budget:save",
        async (
            event,
            document: BudgetDocument,
            requestedPath?: string,
            saveAs = false
        ) => {
            assertSender(event);
            return fileOperation(async () => {
                try {
                    if (files.readOnly) saveAs = true;
                    if (
                        requestedPath !== undefined &&
                        requestedPath !== files.currentPath
                    ) {
                        throw new Error(
                            t("desktop.errors.chooseSaveDestination")
                        );
                    }
                    let destination = requestedPath;
                    if (!destination || saveAs) {
                        const title =
                            typeof document?.name === "string"
                                ? document.name
                                : t("defaults.budgets.unnamed");
                        const safeName =
                            title
                                // Control characters are intentionally removed from filenames.
                                // oxlint-disable-next-line no-control-regex
                                .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
                                .slice(0, 100) || t("defaults.budgets.unnamed");
                        const chosen = await dialog.showSaveDialog(
                            mainWindow!,
                            {
                                title: t("files.actions.saveBudget"),
                                defaultPath:
                                    files.readOnly && files.currentPath
                                        ? path.join(
                                              path.dirname(files.currentPath),
                                              `${t("files.locks.copyName", { name: safeName })}.budget.json`
                                          )
                                        : saveAs && files.currentPath
                                          ? files.currentPath
                                          : `${safeName}.budget.json`,
                                filters: [
                                    {
                                        name: t("desktop.dialogs.fileFilter"),
                                        extensions: ["budget.json"]
                                    }
                                ],
                                properties: [
                                    "showOverwriteConfirmation",
                                    "createDirectory"
                                ]
                            }
                        );
                        if (chosen.canceled || !chosen.filePath) {
                            closeAfterSave = false;
                            closeSaveSucceeded = false;
                            quitting = false;
                            return null;
                        }
                        destination = chosen.filePath.endsWith(".json")
                            ? chosen.filePath
                            : `${chosen.filePath}.budget.json`;
                    }
                    const result = await files.save(document, destination);
                    // IPC resolves only after this flag is set. The renderer can then mark
                    // its saved snapshot clean without racing the close confirmation.
                    if (closeAfterSave) closeSaveSucceeded = true;
                    return result;
                } catch (error) {
                    closeAfterSave = false;
                    closeSaveSucceeded = false;
                    quitting = false;
                    throw error;
                }
            });
        }
    );

    ipcMain.on("budget:dirty", (event, value: unknown) => {
        assertSender(event);
        if (typeof value !== "boolean") return;
        dirty = value;
        mainWindow?.setDocumentEdited(dirty);
        if (!dirty && closeAfterSave && closeSaveSucceeded) {
            allowClose = true;
            mainWindow?.close();
            if (quitting) app.quit();
        }
    });
}

function installMenu() {
    const template: MenuItemConstructorOptions[] = [];
    if (process.platform === "darwin") template.push({ role: "appMenu" });
    template.push(
        {
            label: t("desktop.menu.file"),
            submenu: [
                {
                    label: t("files.actions.newBudget"),
                    accelerator: "CmdOrCtrl+N",
                    click: () => sendAction("new")
                },
                {
                    label: t("desktop.menu.openBudget"),
                    accelerator: "CmdOrCtrl+O",
                    click: () => sendAction("open")
                },
                { type: "separator" },
                {
                    label: t("files.actions.saveBudget"),
                    accelerator: "CmdOrCtrl+S",
                    click: () => sendAction("save")
                },
                {
                    label: t("desktop.menu.saveBudgetAs"),
                    accelerator: "CmdOrCtrl+Shift+S",
                    click: () => sendAction("save-as")
                },
                { type: "separator" },
                { role: process.platform === "darwin" ? "close" : "quit" }
            ]
        },
        { role: "editMenu" },
        {
            label: t("desktop.menu.view"),
            submenu: [
                { role: "resetZoom" },
                { role: "zoomIn" },
                { role: "zoomOut" },
                { type: "separator" },
                { role: "togglefullscreen" }
            ]
        },
        { role: "windowMenu" }
    );
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
    dirty = false;
    closeAfterSave = false;
    closeSaveSucceeded = false;
    allowClose = false;
    quitting = false;
    const window = new BrowserWindow({
        title: "Budget Pro",
        icon: resolveElectronAssetsPath("icons/icon.png"),
        width: 1460,
        height: 1000,
        minWidth: 960,
        minHeight: 680,
        backgroundColor: "#f7f8f5",
        useContentSize: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(import.meta.dirname, "electron-preload.cjs")
        }
    });
    mainWindow = window;
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", event => event.preventDefault());
    window.on("close", event => {
        if (fileBusy) {
            event.preventDefault();
            return;
        }
        if (!dirty || allowClose) return;
        event.preventDefault();
        // A second close attempt must remain cancellable even if the renderer
        // could not begin a previously requested save.
        closeAfterSave = false;
        closeSaveSucceeded = false;
        const response = dialog.showMessageBoxSync(window, {
            type: "question",
            title: t("desktop.dialogs.closeTitle"),
            message: t("desktop.dialogs.closeMessage"),
            detail: t("desktop.dialogs.closeDetail"),
            buttons: [
                t("common.actions.save"),
                t("desktop.dialogs.discard"),
                t("common.actions.cancel")
            ],
            defaultId: 0,
            cancelId: 2,
            noLink: true
        });
        if (response === 0) {
            closeAfterSave = true;
            sendAction("save");
        } else if (response === 1) {
            allowClose = true;
            window.close();
            if (quitting) app.quit();
        } else {
            quitting = false;
        }
    });
    window.on("closed", () => {
        files.close();
        mainWindow = null;
    });

    if (import.meta.env.QUASAR_DEV) {
        await window.loadURL(import.meta.env.QUASAR_APP_URL);
    } else {
        await window.loadFile("index.html");
    }
}

void app.whenReady().then(async () => {
    registerQuasarRuntime();
    files = new BudgetFileService(app.getPath("userData"));
    installHandlers();
    installMenu();
    await createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
});

app.on("before-quit", () => {
    quitting = true;
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
app.on("will-quit", () => files?.close());
