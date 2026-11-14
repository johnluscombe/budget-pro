import { contextBridge, ipcRenderer } from "electron";
import { quasarRuntime } from "#q-app/electron/preload";
import type { BudgetAction, BudgetFilesApi } from "../src/types/budget-files";

const actions: BudgetAction[] = ["new", "open", "save", "save-as"];

const budgetFiles: BudgetFilesApi = {
    close: () => ipcRenderer.invoke("budget:close"),
    unlock: () => ipcRenderer.invoke("budget:unlock"),
    restore: () => ipcRenderer.invoke("budget:restore"),
    open: () => ipcRenderer.invoke("budget:open"),
    save: (document, path, saveAs = false) =>
        ipcRenderer.invoke("budget:save", document, path, saveAs),
    setDirty: dirty => ipcRenderer.send("budget:dirty", dirty),
    onAction(callback) {
        const listener = (_event: unknown, action: BudgetAction) => {
            if (actions.includes(action)) callback(action);
        };
        ipcRenderer.on("budget:action", listener);
        return () => ipcRenderer.removeListener("budget:action", listener);
    }
};

contextBridge.exposeInMainWorld("quasarRuntime", quasarRuntime);
contextBridge.exposeInMainWorld("budgetFiles", budgetFiles);
