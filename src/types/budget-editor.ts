export type BudgetEditorMode =
    | "budget"
    | "rename"
    | "income"
    | "group"
    | "category"
    | "plan"
    | "expense";

export interface BudgetEditorForm {
    name: string;
    amount: string;
    groupId: string;
    categoryId: string;
    payee: string;
    date: string;
    note: string;
}
