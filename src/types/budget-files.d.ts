import type { BudgetDocument } from "../lib/budget";

export type BudgetAction = "new" | "open" | "save" | "save-as";

export interface BudgetFileResult {
    document: BudgetDocument;
    path: string;
    warning?: string;
}

export interface BudgetFilesApi {
    restore(): Promise<BudgetFileResult | null>;
    open(): Promise<BudgetFileResult | null>;
    save(
        document: BudgetDocument,
        path?: string,
        saveAs?: boolean
    ): Promise<BudgetFileResult | null>;
    setDirty(dirty: boolean): void;
    onAction(callback: (action: BudgetAction) => void): () => void;
}

declare global {
    interface Window {
        budgetFiles?: BudgetFilesApi;
    }
}
