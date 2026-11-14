import {
    test,
    expect,
    _electron,
    type ElectronApplication,
    type Page
} from "@playwright/test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

let application: ElectronApplication | undefined;
let page: Page;
let directory: string;
let traces: string[];
let pageErrors: string[];

async function launch() {
    const environment: Record<string, string> = Object.fromEntries(
        Object.entries(process.env).filter(
            (entry): entry is [string, string] => entry[1] !== undefined
        )
    );
    environment.BUDGET_PRO_USER_DATA = join(directory, "profile");
    delete environment.ELECTRON_RUN_AS_NODE;
    application = await _electron.launch({
        args: [resolve("dist/electron/UnPackaged")],
        env: environment
    });
    await application
        .context()
        .tracing.start({ screenshots: true, snapshots: true, sources: true });
    page = await application.firstWindow();
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.getByTestId("new-budget").waitFor();
}

async function closeApplication() {
    if (!application) return;
    const trace = join(directory, `trace-${traces.length + 1}.zip`);
    await application
        .context()
        .tracing.stop({ path: trace })
        .then(() => {
            traces.push(trace);
        })
        .catch(() => undefined);
    // Destroying windows also makes cleanup reliable after a failed test leaves
    // an unsaved form or native confirmation open.
    await application
        .evaluate(({ BrowserWindow }) => {
            for (const window of BrowserWindow.getAllWindows())
                window.destroy();
        })
        .catch(() => undefined);
    await application.close().catch(() => undefined);
    application = undefined;
}

async function selectSaveFile(path: string | null) {
    await application!.evaluate(({ dialog }, filePath) => {
        Reflect.set(globalThis, "budgetTestSaveCalls", 0);
        dialog.showSaveDialog = async () => {
            Reflect.set(
                globalThis,
                "budgetTestSaveCalls",
                Number(Reflect.get(globalThis, "budgetTestSaveCalls")) + 1
            );
            return { canceled: filePath === null, filePath: filePath ?? "" };
        };
    }, path);
}

async function selectOpenFile(path: string | null) {
    await application!.evaluate(({ dialog }, filePath) => {
        dialog.showOpenDialog = async () => ({
            canceled: filePath === null,
            filePaths: filePath ? [filePath] : []
        });
    }, path);
}

async function createBudget(name: string) {
    await page.getByTestId("new-budget").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Budget name", { exact: true }).fill(name);
    await dialog
        .getByRole("button", { name: "Create budget", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId("budget-name")).toHaveText(name);
}

async function setIncome(value: string) {
    await page.getByTestId("edit-income").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Income", { exact: true }).fill(value);
    await dialog
        .getByRole("button", { name: "Update income", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();
}

async function clickFileMenu(label: string) {
    await application!.evaluate(({ Menu, BrowserWindow }, itemLabel) => {
        const item = Menu.getApplicationMenu()
            ?.items.find(entry => entry.label === "File")
            ?.submenu?.items.find(entry => entry.label === itemLabel);
        if (!item) throw new Error(`File menu item not found: ${itemLabel}`);
        const window = BrowserWindow.getAllWindows()[0];
        item.click({}, window, window?.webContents);
    }, label);
}

async function chooseCloseResponse(response: number) {
    await application!.evaluate(({ dialog }, value) => {
        Reflect.set(globalThis, "budgetTestClosePrompts", 0);
        dialog.showMessageBoxSync = () => {
            Reflect.set(
                globalThis,
                "budgetTestClosePrompts",
                Number(Reflect.get(globalThis, "budgetTestClosePrompts")) + 1
            );
            return value;
        };
    }, response);
}

async function requestNativeClose() {
    await application!.evaluate(({ BrowserWindow }) => {
        // Let the evaluation return before the native close handler runs.
        setTimeout(() => BrowserWindow.getAllWindows()[0]?.close(), 0);
    });
}

test.beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "budget-pro-e2e-"));
    traces = [];
    pageErrors = [];
    await launch();
});

test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus && application) {
        const screenshot = await page.screenshot().catch(() => undefined);
        if (screenshot) {
            await testInfo.attach("electron-failure", {
                body: screenshot,
                contentType: "image/png"
            });
        }
    }
    await closeApplication();
    if (testInfo.status !== testInfo.expectedStatus) {
        for (const trace of traces) {
            await testInfo.attach("electron-trace", {
                body: await readFile(trace),
                contentType: "application/zip"
            });
        }
    }
    await rm(directory, { recursive: true, force: true });
    expect(pageErrors, "The renderer should not raise uncaught errors").toEqual(
        []
    );
});

test("plans a category, records spending, saves, and restores the previous file", async ({}, testInfo) => {
    await page.screenshot({
        path: testInfo.outputPath("sample-overview.png"),
        fullPage: true
    });
    await createBudget("My personal budget");
    await setIncome("6000");

    await page.getByTestId("add-group").click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Group name", { exact: true }).fill("Travel");
    await dialog
        .getByRole("button", { name: "Add group", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();

    await page
        .getByRole("button", { name: "Add category to Travel", exact: true })
        .click();
    dialog = page.getByRole("dialog");
    await dialog
        .getByLabel("Category name", { exact: true })
        .fill("Summer getaway");
    await dialog
        .getByRole("button", { name: "Add category", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();

    await page
        .getByRole("button", { name: "Plan Summer getaway", exact: true })
        .click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Planned amount", { exact: true }).fill("500");
    await dialog
        .getByRole("button", { name: "Update plan", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();

    await page.getByTestId("add-expense").click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Payee", { exact: true }).fill("Train tickets");
    await dialog.getByLabel("Amount", { exact: true }).fill("42.35");
    await dialog.getByLabel("Category", { exact: true }).click();
    await page
        .getByRole("option", { name: "Summer getaway", exact: true })
        .click();
    await dialog
        .getByRole("button", { name: "Add expense", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByTestId("summary-income")).toContainText("$6,000.00");
    await expect(page.getByTestId("summary-planned")).toContainText("$500.00");
    await expect(page.getByTestId("summary-spent")).toContainText("$42.35");
    await expect(page.getByTestId("summary-remaining")).toContainText(
        "$5,957.65"
    );
    const category = page
        .getByTestId("category-row")
        .filter({ hasText: "Summer getaway" });
    await expect(category).toContainText("$457.65");

    const filename = join(directory, "personal.budget.json");
    await selectSaveFile(filename);
    await page.getByTestId("save-budget").click();
    await expect
        .poll(async () => {
            try {
                return JSON.parse(await readFile(filename, "utf8")).name;
            } catch {
                return null;
            }
        })
        .toBe("My personal budget");
    const saved = JSON.parse(await readFile(filename, "utf8"));
    const travel = saved.groups.find(
        (group: { name: string }) => group.name === "Travel"
    );
    expect(travel.categories[0].name).toBe("Summer getaway");
    const savedMonth = Object.values(saved.months)[0] as {
        income: number;
        allocations: Record<string, number>;
        transactions: Array<{
            payee: string;
            amount: number;
            categoryId: string;
        }>;
    };
    expect(savedMonth.income).toBe(600_000);
    expect(savedMonth.allocations[travel.categories[0].id]).toBe(50_000);
    expect(savedMonth.transactions[0]).toMatchObject({
        payee: "Train tickets",
        amount: 4235,
        categoryId: travel.categories[0].id
    });

    const initialMonth = await page.getByTestId("month-label").textContent();
    await page.getByTestId("next-month").click();
    await expect(page.getByTestId("month-label")).not.toHaveText(initialMonth!);
    await expect(page.getByTestId("summary-income")).toContainText("$0.00");
    await expect(page.getByTestId("summary-spent")).toContainText("$0.00");
    await page.getByTestId("previous-month").click();
    await expect(page.getByTestId("month-label")).toHaveText(initialMonth!);
    await expect(page.getByTestId("summary-spent")).toContainText("$42.35");

    await testInfo.attach("budget-overview", {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png"
    });
    await closeApplication();
    await launch();
    await expect(page.getByTestId("budget-name")).toHaveText(
        "My personal budget"
    );
    await expect(page.getByTestId("summary-spent")).toContainText("$42.35");
    await expect(
        page.getByTestId("category-row").filter({ hasText: "Summer getaway" })
    ).toContainText("$457.65");
});

test("keeps the current budget when opening is canceled or a file is invalid", async () => {
    await createBudget("Safe budget");
    await setIncome("2500");
    const filename = join(directory, "safe.budget.json");
    await selectSaveFile(filename);
    await page.getByTestId("save-budget").click();
    await expect
        .poll(() => readFile(filename, "utf8").catch(() => ""))
        .toContain("Safe budget");

    await selectOpenFile(null);
    await page.getByTestId("open-budget").click();
    await expect(page.getByTestId("budget-name")).toHaveText("Safe budget");

    const invalidFile = join(directory, "invalid.budget.json");
    await writeFile(
        invalidFile,
        JSON.stringify({ version: 999, name: "Broken" })
    );
    await selectOpenFile(invalidFile);
    await page.getByTestId("open-budget").click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("budget-name")).toHaveText("Safe budget");
    await expect(page.getByTestId("summary-income")).toContainText("$2,500.00");

    await closeApplication();
    await launch();
    await expect(page.getByTestId("budget-name")).toHaveText("Safe budget");
});

test("protects unsaved edits and permits retrying a canceled save", async () => {
    await createBudget("In progress");
    await setIncome("1200");
    await page.getByTestId("new-budget").click();
    let dialog = page.getByRole("dialog");
    await dialog
        .getByRole("button", { name: "Keep editing", exact: true })
        .click();
    await expect(page.getByTestId("budget-name")).toHaveText("In progress");
    await expect(page.getByTestId("summary-income")).toContainText("$1,200.00");

    await selectSaveFile(null);
    await page.getByTestId("new-budget").click();
    dialog = page.getByRole("dialog");
    await dialog
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
    await expect(page.getByTestId("budget-name")).toHaveText("In progress");
    await expect(
        page.getByLabel("Budget name", { exact: true })
    ).not.toBeVisible();
    await dialog
        .getByRole("button", { name: "Keep editing", exact: true })
        .click();

    const filename = join(directory, "in-progress.budget.json");
    await selectSaveFile(filename);
    await page
        .getByRole("button", { name: "More file options", exact: true })
        .click();
    await page.getByTestId("save-as-budget").click();
    await expect
        .poll(() => readFile(filename, "utf8").catch(() => ""))
        .toContain("In progress");

    await page.getByTestId("new-budget").click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Budget name", { exact: true }).fill("Next budget");
    await dialog
        .getByRole("button", { name: "Create budget", exact: true })
        .click();
    await expect(page.getByTestId("budget-name")).toHaveText("Next budget");
    await expect(page.getByTestId("summary-income")).toContainText("$0.00");
});

test("moves a category, edits expenses, and protects transaction history during deletion", async () => {
    await createBudget("Editable budget");
    await setIncome("1000");
    await page
        .getByRole("button", { name: "Plan Groceries", exact: true })
        .click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Planned amount", { exact: true }).fill("100");
    await dialog
        .getByRole("button", { name: "Update plan", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();

    await page.getByTestId("add-expense").click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Amount", { exact: true }).fill("25");
    await dialog.getByLabel("Payee", { exact: true }).fill("Market");
    await dialog.getByLabel("Category", { exact: true }).click();
    await page.getByRole("option", { name: "Groceries", exact: true }).click();
    await dialog
        .getByRole("button", { name: "Add expense", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();

    await page
        .getByRole("button", { name: "Options for Groceries", exact: true })
        .click();
    await page.getByLabel("Edit Groceries", { exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog
        .getByLabel("Category name", { exact: true })
        .fill("Fresh groceries");
    await dialog.getByLabel("Group", { exact: true }).click();
    await page.getByRole("option", { name: "Lifestyle", exact: true }).click();
    await dialog
        .getByRole("button", { name: "Update category", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();
    const lifestyle = page.locator(".group-card").filter({
        has: page.getByRole("heading", { name: "Lifestyle", exact: true })
    });
    const category = lifestyle
        .getByTestId("category-row")
        .filter({ hasText: "Fresh groceries" });
    await expect(category).toContainText("$75.00");
    await expect(page.getByTestId("summary-planned")).toContainText("$100.00");
    await expect(page.getByTestId("summary-spent")).toContainText("$25.00");

    await page
        .getByRole("button", {
            name: "Options for Fresh groceries",
            exact: true
        })
        .click();
    await page.getByLabel("Delete Fresh groceries", { exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("alert")).toContainText("transactions");
    await expect(category).toBeVisible();
    await page
        .getByRole("button", { name: "Dismiss error", exact: true })
        .click();

    const navigation = page.getByRole("navigation", {
        name: "Main navigation",
        exact: true
    });
    await navigation.getByRole("button", { name: /Transactions/ }).click();
    await page
        .getByRole("button", { name: "Edit expense Market", exact: true })
        .click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Payee", { exact: true }).fill("Farmers market");
    await dialog.getByLabel("Amount", { exact: true }).fill("35.50");
    await dialog
        .getByRole("button", { name: "Update expense", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId("summary-spent")).toContainText("$35.50");
    await expect(page.getByTestId("summary-remaining")).toContainText(
        "$964.50"
    );
    await page
        .getByRole("button", {
            name: "Delete expense Farmers market",
            exact: true
        })
        .click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId("summary-spent")).toContainText("$0.00");
    await expect(page.getByTestId("summary-remaining")).toContainText(
        "$1,000.00"
    );
    await expect(
        page.getByRole("button", {
            name: "Edit expense Farmers market",
            exact: true
        })
    ).not.toBeVisible();

    await navigation.getByRole("button", { name: /Budget overview/ }).click();
    await page
        .getByRole("button", {
            name: "Options for Fresh groceries",
            exact: true
        })
        .click();
    await page.getByLabel("Delete Fresh groceries", { exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
        page.getByTestId("category-row").filter({ hasText: "Fresh groceries" })
    ).toHaveCount(0);
    await expect(page.getByTestId("summary-planned")).toContainText("$0.00");
});

test("uses native File commands and saves safely when closing an unsaved budget", async () => {
    await application!.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]!.setContentSize(1100, 800);
    });
    await clickFileMenu("New budget");
    let dialog = page.getByRole("dialog");
    await dialog
        .getByLabel("Budget name", { exact: true })
        .fill("Native budget");
    await dialog
        .getByRole("button", { name: "Create budget", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();
    await setIncome("900");
    const filename = join(directory, "native.budget.json");
    await selectSaveFile(filename);
    await clickFileMenu("Save budget");
    await expect
        .poll(() => readFile(filename, "utf8").catch(() => ""))
        .toContain("Native budget");
    // Compact desktop layouts hide this label; its text still reflects save state.
    const saveState = page.locator(".save-state");
    await expect(saveState).toHaveText("All changes saved");
    await expect(saveState).toBeHidden();

    const openedFile = join(directory, "opened-natively.budget.json");
    const otherBudget = JSON.parse(await readFile(filename, "utf8"));
    otherBudget.name = "Opened natively";
    await writeFile(openedFile, JSON.stringify(otherBudget));
    await selectOpenFile(openedFile);
    await page
        .getByRole("button", { name: "Plan Groceries", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await clickFileMenu("Open budget…");
    await expect(page.getByTestId("budget-name")).toHaveText("Opened natively");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await clickFileMenu("New budget");
    dialog = page.getByRole("dialog");
    await dialog
        .getByLabel("Budget name", { exact: true })
        .fill("Saved on close");
    await dialog
        .getByRole("button", { name: "Create budget", exact: true })
        .click();
    await expect(dialog).not.toBeVisible();
    await setIncome("700");

    await chooseCloseResponse(2);
    await requestNativeClose();
    await expect
        .poll(() =>
            application!.evaluate(() =>
                Reflect.get(globalThis, "budgetTestClosePrompts")
            )
        )
        .toBe(1);
    await expect(page.getByTestId("budget-name")).toHaveText("Saved on close");
    expect(page.isClosed()).toBe(false);

    await chooseCloseResponse(0);
    await selectSaveFile(null);
    await requestNativeClose();
    await expect
        .poll(() =>
            application!.evaluate(() =>
                Reflect.get(globalThis, "budgetTestSaveCalls")
            )
        )
        .toBe(1);
    await expect(page.getByTestId("summary-income")).toContainText("$700.00");
    expect(page.isClosed()).toBe(false);

    const closingFile = join(directory, "saved-on-close.budget.json");
    await chooseCloseResponse(0);
    await selectSaveFile(closingFile);
    const closed = page.waitForEvent("close");
    await requestNativeClose();
    await closed;
    expect(page.isClosed()).toBe(true);
    const saved = JSON.parse(await readFile(closingFile, "utf8"));
    expect(saved.name).toBe("Saved on close");
    expect(
        Object.values(saved.months).map(
            month => (month as { income: number }).income
        )
    ).toContain(70_000);
});
