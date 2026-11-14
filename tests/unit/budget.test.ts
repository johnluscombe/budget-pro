import { describe, expect, it } from "vitest";
import {
    categoryTotals,
    createBudget,
    getMonth,
    money,
    monthKey,
    parseMoney,
    removeCategory,
    removeGroup,
    shiftMonth,
    summary,
    validateBudget
} from "../../src/lib/budget";

const currentMonth = "2026-11";

describe("budget creation and calculation", () => {
    it("creates independent blank budgets with useful category groups", () => {
        const first = createBudget("  Home  ", currentMonth);
        const second = createBudget("Home", currentMonth);
        expect(first.name).toBe("Home");
        expect(first.groups).toHaveLength(3);
        expect(first.groups[0]!.categories.length).toBeGreaterThan(0);
        expect(summary(first, currentMonth)).toEqual({
            income: 0,
            planned: 0,
            spent: 0,
            remaining: 0,
            leftToBudget: 0
        });
        expect(first.id).not.toBe(second.id);
        expect(first.groups[0]!.id).not.toBe(second.groups[0]!.id);
        expect(validateBudget(first)).toEqual(first);
    });

    it("creates a valid sample with allocations and expense history", () => {
        const sample = createBudget("Sample", currentMonth, true);
        expect(validateBudget(sample)).toEqual(sample);
        expect(summary(sample, currentMonth).income).toBe(580000);
        expect(summary(sample, currentMonth).spent).toBeGreaterThan(0);
    });

    it("keeps planned amounts, spending and remaining income distinct", () => {
        const budget = createBudget("Home", currentMonth);
        const category = budget.groups[0]!.categories[0]!;
        const month = getMonth(budget, currentMonth);
        month.incomes = [
            {
                id: "pay",
                amount: 100000,
                date: "2026-11-01",
                source: "Salary",
                note: ""
            }
        ];
        month.allocations[category.id] = 40000;
        month.transactions.push({
            id: "expense",
            categoryId: category.id,
            date: "2026-11-02",
            amount: 45000,
            payee: "Rent",
            note: ""
        });
        expect(summary(budget, currentMonth)).toEqual({
            income: 100000,
            planned: 40000,
            spent: 45000,
            remaining: 55000,
            leftToBudget: 60000
        });
        expect(categoryTotals(budget, currentMonth, category.id)).toEqual({
            planned: 40000,
            spent: 45000,
            available: -5000
        });
        expect(summary(budget, "2026-12").spent).toBe(0);
    });

    it("does not create or share data for months the user has only viewed", () => {
        const budget = createBudget("Home", currentMonth);
        const month = getMonth(budget, "2026-12");
        month.incomes.push({
            id: "pay",
            amount: 100,
            date: "2026-12-01",
            source: "Salary",
            note: ""
        });
        expect(budget.months["2026-12"]).toBeUndefined();
        expect(getMonth(budget, "2026-12").incomes).toEqual([]);
        expect(() => getMonth(budget, "2026-13")).toThrow();
    });
});

describe("money and month handling", () => {
    it.each([
        ["0.29", 29],
        [".50", 50],
        ["10.01", 1001],
        [" 12.5 ", 1250],
        [12.34, 1234],
        ["", 0],
        ["1.", 100]
    ])("parses %j without floating point rounding", (input, cents) => {
        expect(parseMoney(input)).toBe(cents);
    });

    it.each([
        "-1",
        "1.001",
        "NaN",
        "Infinity",
        "1e3",
        "1,000",
        ".",
        "1a",
        Number.NaN,
        Number.POSITIVE_INFINITY,
        "9007199254740991"
    ])("rejects invalid money %j", input => {
        expect(() => parseMoney(input)).toThrow();
    });

    it("formats negative availability and cents correctly", () => {
        expect(money(123456)).toBe("$1,234.56");
        expect(money(-500)).toBe("-$5.00");
    });

    it("moves through year boundaries and leap months", () => {
        expect(shiftMonth("2026-12", 1)).toBe("2027-01");
        expect(shiftMonth("2026-01", -1)).toBe("2025-12");
        expect(shiftMonth("2024-02", 12)).toBe("2025-02");
        expect(monthKey(new Date(2026, 10, 14))).toBe(currentMonth);
        expect(() => shiftMonth("2026-13", 1)).toThrow();
        expect(() => shiftMonth("2026-11", 0.5)).toThrow();
        expect(() => shiftMonth("0001-01", -1)).toThrow();
        expect(() => monthKey(new Date("invalid"))).toThrow();
    });
});

describe("file validation", () => {
    it("copies untrusted data and discards unsupported fields", () => {
        const original = createBudget("Home", currentMonth);
        const loaded = validateBudget({ ...original, extra: "discard" });
        loaded.groups[0]!.name = "Changed";
        expect(original.groups[0]!.name).toBe("Essentials");
        expect(loaded).not.toHaveProperty("extra");
    });

    it.each([null, [], {}, { version: 2 }, { version: 1, currency: "EUR" }])(
        "rejects unsupported documents %j",
        input => {
            expect(() => validateBudget(input)).toThrow();
        }
    );

    it("rejects duplicate identifiers", () => {
        const budget = createBudget("Home", currentMonth);
        budget.groups[1]!.categories[0]!.id =
            budget.groups[0]!.categories[0]!.id;
        expect(() => validateBudget(budget)).toThrow(/duplicate/);
    });

    it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
        "rejects invalid cents %j",
        value => {
            const budget = createBudget("Home", currentMonth);
            budget.months[currentMonth]!.incomes = [
                {
                    id: "pay",
                    amount: value,
                    date: "2026-11-01",
                    source: "Salary",
                    note: ""
                }
            ];
            expect(() => validateBudget(budget)).toThrow(/integer cents/);
        }
    );

    it("rejects allocations and transactions that reference missing categories", () => {
        const budget = createBudget("Home", currentMonth, true);
        budget.months[currentMonth]!.allocations.missing = 100;
        expect(() => validateBudget(budget)).toThrow(/allocation category/);
        delete budget.months[currentMonth]!.allocations.missing;
        budget.months[currentMonth]!.transactions[0]!.categoryId = "missing";
        expect(() => validateBudget(budget)).toThrow(/transaction category/);
    });

    it.each([
        "2026-11-31",
        "2026-11-00",
        "2026-12-01",
        "2026-11-1",
        "not-a-date"
    ])("rejects invalid expense date %s", date => {
        const budget = createBudget("Home", currentMonth, true);
        budget.months[currentMonth]!.transactions[0]!.date = date;
        expect(() => validateBudget(budget)).toThrow(/real date/);
    });

    it("rejects zero-amount transactions and totals that exceed exact integer precision", () => {
        const budget = createBudget("Home", currentMonth, true);
        budget.months[currentMonth]!.transactions[0]!.amount = 0;
        expect(() => validateBudget(budget)).toThrow(/positive integer/);
        budget.months[currentMonth]!.transactions[0]!.amount =
            Number.MAX_SAFE_INTEGER;
        expect(() => validateBudget(budget)).toThrow(/total is too large/);
    });
});

describe("category and group deletion", () => {
    it("removes category allocations in every month", () => {
        const budget = createBudget("Home", currentMonth);
        const category = budget.groups[0]!.categories[0]!;
        budget.months[currentMonth]!.allocations[category.id] = 1200;
        budget.months["2026-12"] = {
            incomes: [],
            allocations: { [category.id]: 1200 },
            transactions: []
        };
        removeCategory(budget, category.id);
        expect(
            budget.groups[0]!.categories.some(item => item.id === category.id)
        ).toBe(false);
        expect(
            budget.months[currentMonth]!.allocations[category.id]
        ).toBeUndefined();
        expect(
            budget.months["2026-12"]!.allocations[category.id]
        ).toBeUndefined();
        expect(validateBudget(budget)).toEqual(budget);
    });

    it("prevents deletion of a category with history in another month without partial mutations", () => {
        const budget = createBudget("Home", currentMonth, true);
        const category = budget.groups[0]!.categories[0]!;
        const snapshot = structuredClone(budget);
        expect(() => removeCategory(budget, category.id)).toThrow(
            /transactions/
        );
        expect(budget).toEqual(snapshot);
    });

    it("checks a whole group before clearing any of its allocations", () => {
        const budget = createBudget("Home", currentMonth, true);
        const snapshot = structuredClone(budget);
        expect(() => removeGroup(budget, budget.groups[0]!.id)).toThrow(
            /transactions/
        );
        expect(budget).toEqual(snapshot);
        budget.months[currentMonth]!.transactions = [];
        const group = budget.groups[0]!;
        removeGroup(budget, group.id);
        expect(budget.groups).toHaveLength(2);
        expect(
            group.categories.every(
                category =>
                    budget.months[currentMonth]!.allocations[category.id] ===
                    undefined
            )
        ).toBe(true);
        expect(validateBudget(budget)).toEqual(budget);
    });
});

describe("income entries", () => {
    const entry = (id: string, amount: number) => ({
        id,
        amount,
        date: "2026-11-15",
        source: "Paycheck",
        note: "Deposit"
    });

    it("uses received income as the allocation allowance and shows over-allocation", () => {
        const budget = createBudget("Home", currentMonth);
        const month = budget.months[currentMonth]!;
        month.incomes.push(entry("salary", 100000), entry("refund", 20000));
        month.allocations[budget.groups[0]!.categories[0]!.id] = 110000;
        expect(summary(budget, currentMonth).leftToBudget).toBe(10000);
        month.incomes[0]!.amount = 90000;
        expect(summary(budget, currentMonth).leftToBudget).toBe(0);
        month.incomes.splice(1, 1);
        expect(summary(budget, currentMonth).leftToBudget).toBe(-20000);
        expect(summary(budget, "2026-12").income).toBe(0);
        expect(validateBudget(JSON.parse(JSON.stringify(budget)))).toEqual(
            budget
        );
    });

    it("migrates legacy totals without changing allocations, expenses, or amounts", () => {
        const sample = createBudget("Home", currentMonth, true);
        const legacy = {
            ...sample,
            version: 1,
            months: {
                [currentMonth]: {
                    income: 580000,
                    allocations: sample.months[currentMonth]!.allocations,
                    transactions: sample.months[currentMonth]!.transactions
                },
                "2026-12": { income: 0, allocations: {}, transactions: [] }
            }
        };
        const migrated = validateBudget(legacy);
        expect(migrated.version).toBe(2);
        expect(migrated.months[currentMonth]!.incomes).toHaveLength(1);
        expect(migrated.months[currentMonth]!.incomes[0]).toMatchObject({
            amount: 580000,
            date: "2026-11-01",
            source: "Previous monthly income"
        });
        expect(summary(migrated, currentMonth)).toEqual(
            summary(sample, currentMonth)
        );
        expect(migrated.months["2026-12"]!.incomes).toEqual([]);
        expect(validateBudget(legacy)).toEqual(migrated);
        expect(validateBudget(migrated)).toEqual(migrated);
        expect(legacy.months[currentMonth]).not.toHaveProperty("incomes");
    });

    it.each(["2026-11-31", "2026-12-01", "2026-11-1", "bad"])(
        "rejects invalid income date %s",
        date => {
            const budget = createBudget("Home", currentMonth);
            budget.months[currentMonth]!.incomes = [
                { ...entry("salary", 100), date }
            ];
            expect(() => validateBudget(budget)).toThrow(/income date/);
        }
    );

    it("rejects zero income, missing sources, duplicate IDs and unsafe totals", () => {
        const budget = createBudget("Home", currentMonth);
        const month = budget.months[currentMonth]!;
        month.incomes = [entry("salary", 0)];
        expect(() => validateBudget(budget)).toThrow(/positive integer/);
        month.incomes = [{ ...entry("salary", 100), source: " " }];
        expect(() => validateBudget(budget)).toThrow(/income source/);
        month.incomes = [entry("salary", 100), entry("salary", 200)];
        expect(() => validateBudget(budget)).toThrow(/duplicate/);
        month.incomes = [
            entry("salary", Number.MAX_SAFE_INTEGER),
            entry("bonus", 1)
        ];
        expect(() => validateBudget(budget)).toThrow(/total is too large/);
    });
});
