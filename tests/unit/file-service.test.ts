import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BudgetFileService } from "../../src-electron/file-service";
import { createBudget } from "../../src/lib/budget";

describe("BudgetFileService", () => {
    let directory: string;
    let userData: string;
    let budgetPath: string;

    beforeEach(async () => {
        directory = await fs.mkdtemp(
            path.join(os.tmpdir(), "budget-pro-files-")
        );
        userData = path.join(directory, "profile");
        budgetPath = path.join(directory, "household.budget.json");
    });

    afterEach(async () => {
        await fs.rm(directory, { recursive: true, force: true });
    });

    it("returns no previous file on first launch", async () => {
        expect(await new BudgetFileService(userData).restore()).toBeNull();
    });

    it("saves a portable document and reopens it in a fresh service", async () => {
        const document = createBudget("Household", "2026-11");
        const service = new BudgetFileService(userData);
        expect(await service.save(document, budgetPath)).toEqual({
            document,
            path: budgetPath
        });
        expect(JSON.parse(await fs.readFile(budgetPath, "utf8"))).toEqual(
            document
        );
        expect(await new BudgetFileService(userData).restore()).toEqual({
            document,
            path: budgetPath
        });
        expect(
            (await fs.readdir(directory)).filter(file => file.endsWith(".tmp"))
        ).toEqual([]);
    });

    it("remembers an opened file rather than an earlier saved file", async () => {
        const service = new BudgetFileService(userData);
        const first = createBudget("First", "2026-11");
        await service.save(first, budgetPath);
        const secondPath = path.join(directory, "second.budget.json");
        const second = createBudget("Second", "2026-12");
        await fs.writeFile(secondPath, JSON.stringify(second));
        expect(await service.open(secondPath)).toEqual({
            document: second,
            path: secondPath
        });
        expect(service.currentPath).toBe(secondPath);
        expect(await new BudgetFileService(userData).restore()).toEqual({
            document: second,
            path: secondPath
        });
    });

    it("keeps the previous document and recent location when an invalid file is opened", async () => {
        const document = createBudget("Original", "2026-11");
        const service = new BudgetFileService(userData);
        await service.save(document, budgetPath);
        const invalidPath = path.join(directory, "invalid.json");
        await fs.writeFile(invalidPath, '{"name":"not a budget"}');
        await expect(service.open(invalidPath)).rejects.toThrow(
            "Choose a valid Budget Pro file"
        );
        expect(service.currentPath).toBe(budgetPath);
        expect(await new BudgetFileService(userData).restore()).toEqual({
            document,
            path: budgetPath
        });
    });

    it("rejects malformed JSON and directories", async () => {
        const service = new BudgetFileService(userData);
        await fs.writeFile(budgetPath, "{");
        await expect(service.open(budgetPath)).rejects.toThrow(
            "Could not open"
        );
        await expect(service.open(directory)).rejects.toThrow("Could not open");
    });

    it("rejects invalid money before changing an existing file", async () => {
        const document = createBudget("Original", "2026-11");
        const service = new BudgetFileService(userData);
        await service.save(document, budgetPath);
        const before = await fs.readFile(budgetPath, "utf8");
        const invalid = structuredClone(document);
        invalid.months["2026-11"]!.income = -1;
        await expect(service.save(invalid, budgetPath)).rejects.toThrow();
        expect(await fs.readFile(budgetPath, "utf8")).toBe(before);
    });

    it("preserves the previous file if atomic replacement fails and cleans temporary files", async () => {
        const document = createBudget("Original", "2026-11");
        await new BudgetFileService(userData).save(document, budgetPath);
        const before = await fs.readFile(budgetPath, "utf8");
        const brokenFs = {
            ...fs,
            rename: vi.fn().mockRejectedValue(new Error("Disk is full"))
        } as typeof fs;
        const service = new BudgetFileService(userData, brokenFs);
        await expect(
            service.save(createBudget("Changed", "2026-11"), budgetPath)
        ).rejects.toThrow("Could not save");
        expect(await fs.readFile(budgetPath, "utf8")).toBe(before);
        expect(
            (await fs.readdir(directory)).filter(file => file.endsWith(".tmp"))
        ).toEqual([]);
        expect(await new BudgetFileService(userData).restore()).toEqual({
            document,
            path: budgetPath
        });
    });

    it("reports a missing previous file without creating or overwriting a replacement", async () => {
        const document = createBudget("Original", "2026-11");
        await new BudgetFileService(userData).save(document, budgetPath);
        await fs.unlink(budgetPath);
        await expect(new BudgetFileService(userData).restore()).rejects.toThrow(
            "The file may have moved or changed"
        );
        await expect(fs.stat(budgetPath)).rejects.toMatchObject({
            code: "ENOENT"
        });
    });

    it("reports corrupt recent-file metadata and does not use a relative path", async () => {
        await fs.mkdir(userData, { recursive: true });
        await fs.writeFile(
            path.join(userData, "recent-budget.json"),
            JSON.stringify({ lastFile: "relative.json" })
        );
        await expect(new BudgetFileService(userData).restore()).rejects.toThrow(
            "previous budget location is unreadable"
        );
        await fs.writeFile(path.join(userData, "recent-budget.json"), "broken");
        await expect(new BudgetFileService(userData).restore()).rejects.toThrow(
            "previous budget location is unreadable"
        );
    });

    it("returns a successful save with a warning when the recent-file preference cannot be written", async () => {
        const document = createBudget("Saved safely", "2026-11");
        const brokenFs = {
            ...fs,
            mkdir: vi.fn().mockRejectedValue(new Error("Read-only profile"))
        } as typeof fs;
        const service = new BudgetFileService(userData, brokenFs);
        const result = await service.save(document, budgetPath);
        expect(result).toMatchObject({
            document,
            path: budgetPath,
            warning: expect.stringContaining("Open it manually next time")
        });
        expect(service.currentPath).toBe(budgetPath);
        expect(JSON.parse(await fs.readFile(budgetPath, "utf8"))).toEqual(
            document
        );
        expect(await new BudgetFileService(userData).restore()).toBeNull();
    });

    it("opens a valid file despite unwritable recent preferences and preserves the previous remembered file", async () => {
        const previous = createBudget("Previous", "2026-11");
        await new BudgetFileService(userData).save(previous, budgetPath);
        const next = createBudget("Next", "2026-11");
        const nextPath = path.join(directory, "next.budget.json");
        await fs.writeFile(nextPath, JSON.stringify(next));
        const brokenFs = {
            ...fs,
            rename: vi
                .fn()
                .mockRejectedValue(new Error("Read-only preferences"))
        } as typeof fs;
        const service = new BudgetFileService(userData, brokenFs);
        const result = await service.open(nextPath);
        expect(result).toMatchObject({
            document: next,
            path: nextPath,
            warning: expect.stringContaining("could not be remembered")
        });
        expect(service.currentPath).toBe(nextPath);
        expect(await new BudgetFileService(userData).restore()).toEqual({
            document: previous,
            path: budgetPath
        });
        expect(
            (await fs.readdir(userData)).filter(file => file.endsWith(".tmp"))
        ).toEqual([]);
    });
});
