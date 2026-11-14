import { t, locale } from "../i18n";
export interface BudgetCategory {
    id: string;
    name: string;
}

export interface BudgetGroup {
    id: string;
    name: string;
    icon: string;
    categories: BudgetCategory[];
}

export interface BudgetTransaction {
    id: string;
    categoryId: string;
    amount: number;
    date: string;
    payee: string;
    note: string;
}

export interface BudgetIncome {
    id: string;
    amount: number;
    date: string;
    source: string;
    note: string;
}

export interface BudgetMonth {
    incomes: BudgetIncome[];
    allocations: Record<string, number>;
    transactions: BudgetTransaction[];
}

export interface BudgetDocument {
    version: 2;
    id: string;
    name: string;
    currency: "USD";
    groups: BudgetGroup[];
    months: Record<string, BudgetMonth>;
}

export interface MonthlySummary {
    income: number;
    planned: number;
    spent: number;
    remaining: number;
    leftToBudget: number;
}

const starterGroups = [
    {
        name: t("defaults.groups.essentials"),
        icon: "home",
        categories: [
            t("defaults.categories.rentMortgage"),
            t("defaults.categories.groceries"),
            t("defaults.categories.utilities"),
            t("defaults.categories.transportation")
        ]
    },
    {
        name: t("defaults.groups.lifestyle"),
        icon: "local_cafe",
        categories: [
            t("defaults.categories.diningOut"),
            t("defaults.categories.shopping"),
            t("defaults.categories.entertainment"),
            t("defaults.categories.subscriptions")
        ]
    },
    {
        name: t("defaults.groups.futureYou"),
        icon: "savings",
        categories: [
            t("defaults.categories.emergencyFund"),
            t("defaults.categories.travel"),
            t("defaults.categories.investments")
        ]
    }
];

function id(): string {
    return globalThis.crypto.randomUUID();
}

function emptyMonth(): BudgetMonth {
    return { incomes: [], allocations: {}, transactions: [] };
}

function validMonth(key: string): boolean {
    return /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(key);
}

export function monthKey(date = new Date()): string {
    if (!Number.isFinite(date.getTime()))
        throw new Error(t("validation.date.invalidDate"));
    return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(key: string, delta: number): string {
    if (!validMonth(key) || !Number.isSafeInteger(delta)) {
        throw new Error(t("validation.date.invalidMonth"));
    }
    const year = Number(key.slice(0, 4));
    const month = Number(key.slice(5));
    const total = year * 12 + month - 1 + delta;
    const nextYear = Math.floor(total / 12);
    if (nextYear < 1 || nextYear > 9999)
        throw new Error(t("validation.date.monthOutOfRange"));
    return `${String(nextYear).padStart(4, "0")}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function parseMoney(value: string | number): number {
    const raw = String(value).trim();
    if (raw === "") return 0;
    if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(raw)) {
        throw new Error(t("validation.money.invalidAmount"));
    }
    const [whole = "0", decimal = ""] = raw.split(".");
    const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
    if (!Number.isSafeInteger(cents) || cents < 0) {
        throw new Error(t("validation.money.amountTooLarge"));
    }
    return cents;
}

export function money(cents: number, currency = "USD"): string {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency
    }).format(cents / 100);
}

export function createBudget(
    name: string,
    key = monthKey(),
    sample = false
): BudgetDocument {
    if (!name.trim()) throw new Error(t("validation.budget.nameRequired"));
    if (!validMonth(key)) throw new Error(t("validation.date.invalidMonth"));
    const groups: BudgetGroup[] = starterGroups.map(group => ({
        id: id(),
        name: group.name,
        icon: group.icon,
        categories: group.categories.map(name => ({ id: id(), name }))
    }));
    const document: BudgetDocument = {
        version: 2,
        id: id(),
        name: name.trim(),
        currency: "USD",
        groups,
        months: { [key]: emptyMonth() }
    };
    if (sample) {
        const month = document.months[key]!;
        month.incomes = [
            {
                id: id(),
                amount: 580000,
                date: `${key}-01`,
                source: t("income.sampleSource"),
                note: ""
            }
        ];
        const planned = [
            180000, 60000, 25000, 20000, 25000, 15000, 10000, 5000, 50000,
            30000, 40000
        ];
        const transactions: [number, number, number, string][] = [
            [0, 180000, 1, t("defaults.samplePayees.monthlyRent")],
            [1, 12840, 3, t("defaults.samplePayees.wholeFoodsMarket")],
            [1, 8645, 7, t("defaults.samplePayees.traderJoes")],
            [1, 5875, 10, t("defaults.samplePayees.neighborhoodMarket")],
            [2, 11200, 5, t("defaults.samplePayees.electricWater")],
            [2, 6500, 2, t("defaults.samplePayees.internet")],
            [3, 4520, 4, t("defaults.samplePayees.gasStation")],
            [3, 2500, 8, t("defaults.samplePayees.transitPass")],
            [4, 4250, 5, t("defaults.samplePayees.sundayBrunch")],
            [4, 6875, 9, t("defaults.samplePayees.dinnerWithFriends")],
            [5, 8900, 6, t("defaults.samplePayees.aLittleSomething")],
            [6, 3200, 8, t("defaults.samplePayees.movieNight")],
            [7, 2999, 1, t("defaults.samplePayees.monthlySubscriptions")],
            [8, 50000, 1, t("defaults.samplePayees.savingsTransfer")],
            [9, 15000, 2, t("defaults.samplePayees.travelFund")],
            [10, 40000, 1, t("defaults.samplePayees.investmentContribution")]
        ];
        const categories = groups.flatMap(group => group.categories);
        categories.forEach((category, index) => {
            month.allocations[category.id] = planned[index]!;
        });
        month.transactions = transactions.map(
            ([index, amount, day, payee]) => ({
                id: id(),
                categoryId: categories[index]!.id,
                amount,
                date: `${key}-${String(day).padStart(2, "0")}`,
                payee,
                note: ""
            })
        );
    }
    return document;
}

export function getMonth(document: BudgetDocument, key: string): BudgetMonth {
    if (!validMonth(key)) throw new Error(t("validation.date.invalidMonth"));
    return document.months[key] ?? emptyMonth();
}

export function summary(document: BudgetDocument, key: string): MonthlySummary {
    const month = getMonth(document, key);
    const planned = Object.values(month.allocations).reduce(
        (total, value) => total + value,
        0
    );
    const spent = month.transactions.reduce(
        (total, transaction) => total + transaction.amount,
        0
    );
    const income = month.incomes.reduce(
        (total, entry) => total + entry.amount,
        0
    );
    return {
        income,
        planned,
        spent,
        remaining: income - spent,
        leftToBudget: income - planned
    };
}

export function categoryTotals(
    document: BudgetDocument,
    key: string,
    categoryId: string
) {
    const month = getMonth(document, key);
    const planned = month.allocations[categoryId] ?? 0;
    const spent = month.transactions.reduce(
        (total, transaction) =>
            total +
            (transaction.categoryId === categoryId ? transaction.amount : 0),
        0
    );
    return { planned, spent, available: planned - spent };
}

function assertUnused(document: BudgetDocument, categoryIds: Set<string>) {
    if (
        Object.values(document.months).some(month =>
            month.transactions.some(transaction =>
                categoryIds.has(transaction.categoryId)
            )
        )
    ) {
        throw new Error(t("validation.budget.categoryHasTransactions"));
    }
}

function clearAllocations(document: BudgetDocument, categoryIds: Set<string>) {
    for (const month of Object.values(document.months)) {
        for (const categoryId of categoryIds)
            delete month.allocations[categoryId];
    }
}

export function removeCategory(
    document: BudgetDocument,
    categoryId: string
): void {
    const group = document.groups.find(group =>
        group.categories.some(category => category.id === categoryId)
    );
    if (!group) throw new Error(t("validation.budget.categoryNotFound"));
    const ids = new Set([categoryId]);
    assertUnused(document, ids);
    clearAllocations(document, ids);
    group.categories = group.categories.filter(
        category => category.id !== categoryId
    );
}

export function removeGroup(document: BudgetDocument, groupId: string): void {
    const group = document.groups.find(group => group.id === groupId);
    if (!group) throw new Error(t("validation.budget.groupNotFound"));
    const ids = new Set(group.categories.map(category => category.id));
    assertUnused(document, ids);
    clearAllocations(document, ids);
    document.groups = document.groups.filter(group => group.id !== groupId);
}

function object(value: unknown, label: string): Record<string, unknown> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(
            t("validation.budget.objectRequired", { field: label })
        );
    }
    return value as Record<string, unknown>;
}

function string(value: unknown, label: string, allowEmpty = false): string {
    if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
        throw new Error(t("validation.budget.textRequired", { field: label }));
    }
    return value;
}

function amount(value: unknown, label: string, positive = false): number {
    if (
        typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < (positive ? 1 : 0)
    ) {
        throw new Error(
            t("validation.budget.integerCentsRequired", {
                field: label,
                requirement: positive ? "positive" : "non-negative"
            })
        );
    }
    return value;
}

function array(value: unknown, label: string): unknown[] {
    if (!Array.isArray(value))
        throw new Error(t("validation.budget.listRequired", { field: label }));
    return value;
}

/** Validate and copy an untrusted file before it enters application state. */
export function validateBudget(value: unknown): BudgetDocument {
    const data = object(value, "document");
    if (data.version !== 1 && data.version !== 2)
        throw new Error(t("validation.budget.unsupportedVersion"));
    if (data.currency !== "USD")
        throw new Error(t("validation.budget.unsupportedCurrency"));
    const identifiers = new Set<string>();
    const takeId = (value: unknown, label: string) => {
        const result = string(value, label);
        if (
            result === "__proto__" ||
            result === "constructor" ||
            result === "prototype" ||
            identifiers.has(result)
        ) {
            throw new Error(
                t("validation.budget.duplicateOrReservedId", { field: label })
            );
        }
        identifiers.add(result);
        return result;
    };
    const documentId = takeId(data.id, t("validation.fields.documentId"));
    const categoryIds = new Set<string>();
    const groups = array(data.groups, "groups").map(value => {
        const group = object(value, "group");
        return {
            id: takeId(group.id, t("validation.fields.groupId")),
            name: string(group.name, t("validation.fields.groupName")),
            icon: string(group.icon, t("validation.fields.groupIcon")),
            categories: array(group.categories, "categories").map(value => {
                const category = object(value, "category");
                const id = takeId(
                    category.id,
                    t("validation.fields.categoryId")
                );
                categoryIds.add(id);
                return {
                    id,
                    name: string(
                        category.name,
                        t("validation.fields.categoryName")
                    )
                };
            })
        };
    });
    const months = Object.fromEntries(
        Object.entries(object(data.months, "months")).map(([key, value]) => {
            if (!validMonth(key))
                throw new Error(t("validation.budget.invalidMonth"));
            const month = object(value, "month");
            const allocations = Object.fromEntries(
                Object.entries(object(month.allocations, "allocations")).map(
                    ([id, value]) => {
                        if (!categoryIds.has(id))
                            throw new Error(
                                t("validation.budget.allocationCategoryMissing")
                            );
                        return [id, amount(value, "allocation")];
                    }
                )
            );
            const transactions = array(month.transactions, "transactions").map(
                value => {
                    const transaction = object(value, "transaction");
                    const categoryId = string(
                        transaction.categoryId,
                        t("validation.fields.transactionCategory")
                    );
                    if (!categoryIds.has(categoryId))
                        throw new Error(
                            t("validation.budget.transactionCategoryMissing")
                        );
                    const date = string(
                        transaction.date,
                        t("validation.fields.transactionDate")
                    );
                    const parsedDate = new Date(`${date}T12:00:00.000Z`);
                    if (
                        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                        !date.startsWith(`${key}-`) ||
                        !Number.isFinite(parsedDate.getTime()) ||
                        parsedDate.toISOString().slice(0, 10) !== date
                    ) {
                        throw new Error(
                            t("validation.budget.invalidTransactionDate")
                        );
                    }
                    return {
                        id: takeId(
                            transaction.id,
                            t("validation.fields.transactionId")
                        ),
                        categoryId,
                        amount: amount(
                            transaction.amount,
                            t("validation.fields.transactionAmount"),
                            true
                        ),
                        date,
                        payee: string(transaction.payee, "payee"),
                        note: string(transaction.note, "note", true)
                    };
                }
            );
            const rawIncomes =
                data.version === 1
                    ? amount(month.income, "income") > 0
                        ? [
                              {
                                  id: `legacy-income-${documentId}-${key}`,
                                  amount: month.income,
                                  date: `${key}-01`,
                                  source: t("income.legacySource"),
                                  note: ""
                              }
                          ]
                        : []
                    : array(month.incomes, "incomes");
            const incomes = rawIncomes.map(value => {
                const entry = object(value, "income entry");
                const date = string(entry.date, "income date");
                const parsedDate = new Date(`${date}T12:00:00.000Z`);
                if (
                    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                    !date.startsWith(`${key}-`) ||
                    !Number.isFinite(parsedDate.getTime()) ||
                    parsedDate.toISOString().slice(0, 10) !== date
                ) {
                    throw new Error(t("validation.budget.invalidIncomeDate"));
                }
                return {
                    id: takeId(entry.id, "income ID"),
                    amount: amount(entry.amount, "income amount", true),
                    date,
                    source: string(entry.source, "income source"),
                    note: string(entry.note, "income note", true)
                };
            });
            const totalIncome = incomes.reduce(
                (total, entry) => total + entry.amount,
                0
            );
            // Totals must also stay exact even if individual values are valid integers.
            const totalPlanned = Object.values(allocations).reduce(
                (total, value) => total + value,
                0
            );
            const totalSpent = transactions.reduce(
                (total, transaction) => total + transaction.amount,
                0
            );
            if (
                !Number.isSafeInteger(totalIncome) ||
                !Number.isSafeInteger(totalPlanned) ||
                !Number.isSafeInteger(totalSpent)
            ) {
                throw new Error(t("validation.budget.totalTooLarge"));
            }
            return [key, { incomes, allocations, transactions }];
        })
    );
    return {
        version: 2,
        id: documentId,
        name: string(data.name, t("validation.fields.budgetName")),
        currency: "USD",
        groups,
        months
    };
}
