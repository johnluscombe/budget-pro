import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { BudgetFileService } from "../../src-electron/file-service";
import { budgetLockPath } from "../../src-electron/file-lock";
import { createBudget } from "../../src/lib/budget";

describe("advisory budget locks", () => {
    let directory: string;
    let filename: string;
    let services: BudgetFileService[];
    function session(override = fs) {
        const service = new BudgetFileService(
            path.join(directory, `profile-${services.length}`),
            override
        );
        services.push(service);
        return service;
    }
    const exists = async (name: string) =>
        fs.stat(name).then(
            () => true,
            () => false
        );
    const foreignLock = (token = "foreign") =>
        JSON.stringify({
            version: 1,
            token,
            owner: "Alex",
            host: "Other computer",
            openedAt: "2000-01-01T00:00:00Z"
        });
    beforeEach(async () => {
        directory = await fs.realpath(
            await fs.mkdtemp(path.join(tmpdir(), "budget-locks-"))
        );
        filename = path.join(directory, "shared.budget.json");
        services = [];
    });
    afterEach(async () => {
        for (const service of services) service.close();
        await fs.rm(directory, { recursive: true, force: true });
    });

    it("allows only one of two simultaneous writers to acquire a new budget", async () => {
        const first = session(),
            second = session();
        const results = await Promise.allSettled([
            first.save(createBudget("First writer"), filename),
            second.save(createBudget("Second writer"), filename)
        ]);
        expect(
            results.filter(result => result.status === "fulfilled")
        ).toHaveLength(1);
        expect(
            results.filter(result => result.status === "rejected")
        ).toHaveLength(1);
        const winner = results.find(result => result.status === "fulfilled");
        if (winner?.status !== "fulfilled")
            throw new Error("No writer acquired the lock");
        expect(JSON.parse(await fs.readFile(filename, "utf8"))).toEqual(
            winner.value.document
        );
    });

    it("reloads safely after its previous lock was replaced", async () => {
        const owner = session();
        await owner.save(createBudget("Shared"), filename);
        await fs.writeFile(budgetLockPath(filename), foreignLock());
        expect((await owner.open(filename)).readOnly).toBe(true);
        owner.close();
        expect(await fs.readFile(budgetLockPath(filename), "utf8")).toBe(
            foreignLock()
        );
    });

    it("does not leave a new lock behind when reloading an invalid budget after lock loss", async () => {
        const owner = session();
        await owner.save(createBudget("Shared"), filename);
        await fs.unlink(budgetLockPath(filename));
        await fs.writeFile(filename, "{}");
        await expect(owner.open(filename)).rejects.toThrow(
            "valid Budget Pro file"
        );
        expect(await exists(budgetLockPath(filename))).toBe(false);
    });

    it("records an owner and holds the lock across repeated saves", async () => {
        const owner = session();
        const document = createBudget("Shared");
        await owner.save(document, filename);
        const first = await fs.readFile(budgetLockPath(filename), "utf8");
        expect(JSON.parse(first)).toMatchObject({
            version: 1,
            token: expect.any(String),
            owner: expect.any(String),
            host: expect.any(String),
            openedAt: expect.any(String)
        });
        await owner.save(document, filename);
        expect(await fs.readFile(budgetLockPath(filename), "utf8")).toBe(first);
        owner.close();
        expect(await exists(budgetLockPath(filename))).toBe(false);
    });

    it("opens a second session read-only and blocks direct overwrites", async () => {
        const owner = session(),
            reader = session();
        const original = createBudget("Shared");
        await owner.save(original, filename);
        const result = await reader.open(filename);
        expect(result).toMatchObject({
            document: original,
            readOnly: true,
            lockDescription: expect.stringContaining("Read-only")
        });
        await expect(
            reader.save(createBudget("Overwritten"), filename)
        ).rejects.toThrow("read-only");
        expect(JSON.parse(await fs.readFile(filename, "utf8"))).toEqual(
            original
        );
        reader.close();
        expect(await exists(budgetLockPath(filename))).toBe(true);
        owner.close();
        expect((await reader.open(filename)).readOnly).not.toBe(true);
    });

    it("allows a read-only session to save its own editable copy", async () => {
        const owner = session(),
            reader = session();
        const original = createBudget("Shared");
        await owner.save(original, filename);
        await reader.open(filename);
        const copy = path.join(directory, "copy.budget.json");
        const result = await reader.save(original, copy);
        expect(result.readOnly).not.toBe(true);
        expect(reader.readOnly).toBe(false);
        expect(await exists(budgetLockPath(copy))).toBe(true);
        expect(await exists(budgetLockPath(filename))).toBe(true);
        reader.close();
        expect(await exists(budgetLockPath(copy))).toBe(false);
        expect(await exists(budgetLockPath(filename))).toBe(true);
    });

    it("does not automatically make a read-only session writable when the owner closes", async () => {
        const owner = session(),
            reader = session();
        const original = createBudget("Shared");
        await owner.save(original, filename);
        await reader.open(filename);
        owner.close();
        await expect(reader.save(original, filename)).rejects.toThrow(
            "read-only"
        );
        expect((await reader.unlock()).readOnly).not.toBe(true);
    });

    it("releases the previous lock only after successfully opening another budget", async () => {
        const owner = session();
        await owner.save(createBudget("First"), filename);
        const invalid = path.join(directory, "invalid.json");
        await fs.writeFile(invalid, "{}");
        await expect(owner.open(invalid)).rejects.toThrow(
            "valid Budget Pro file"
        );
        expect(await exists(budgetLockPath(invalid))).toBe(false);
        expect(await exists(budgetLockPath(filename))).toBe(true);
        const other = path.join(directory, "other.budget.json");
        await fs.writeFile(other, JSON.stringify(createBudget("Other")));
        await owner.open(other);
        expect(await exists(budgetLockPath(filename))).toBe(false);
        expect(await exists(budgetLockPath(other))).toBe(true);
    });

    it("releases the previous lock after a successful Save As", async () => {
        const owner = session();
        const document = createBudget("Shared");
        await owner.save(document, filename);
        const other = path.join(directory, "other.budget.json");
        await owner.save(document, other);
        expect(await exists(budgetLockPath(filename))).toBe(false);
        expect(await exists(budgetLockPath(other))).toBe(true);
    });

    it("keeps the current lock and releases the destination lock if Save As fails", async () => {
        const document = createBudget("Shared");
        const seed = session();
        await seed.save(document, filename);
        seed.close();
        const broken = {
            ...fs,
            rename: vi.fn().mockRejectedValue(new Error("Disk full"))
        } as typeof fs;
        const owner = session(broken);
        await owner.open(filename);
        const other = path.join(directory, "other.budget.json");
        await expect(owner.save(document, other)).rejects.toThrow(
            "Could not save"
        );
        expect(owner.currentPath).toBe(filename);
        expect(await exists(budgetLockPath(filename))).toBe(true);
        expect(await exists(budgetLockPath(other))).toBe(false);
    });

    it("refuses to save after a lock is removed", async () => {
        const owner = session();
        const original = createBudget("Shared");
        await owner.save(original, filename);
        await fs.unlink(budgetLockPath(filename));
        await expect(
            owner.save(createBudget("Changed"), filename)
        ).rejects.toThrow("removed or replaced");
        expect(JSON.parse(await fs.readFile(filename, "utf8"))).toEqual(
            original
        );
    });

    it("never removes a replacement owner's lock", async () => {
        const owner = session();
        const original = createBudget("Shared");
        await owner.save(original, filename);
        const replacement = foreignLock();
        await fs.writeFile(budgetLockPath(filename), replacement);
        await expect(
            owner.save(createBudget("Changed"), filename)
        ).rejects.toThrow("removed or replaced");
        owner.close();
        expect(await fs.readFile(budgetLockPath(filename), "utf8")).toBe(
            replacement
        );
        expect(JSON.parse(await fs.readFile(filename, "utf8"))).toEqual(
            original
        );
    });

    it("checks ownership again before replacing the budget", async () => {
        const original = createBudget("Shared");
        const seed = session();
        await seed.save(original, filename);
        seed.close();
        const fsWithRace = {
            ...fs,
            writeFile: vi.fn(
                async (...args: Parameters<typeof fs.writeFile>) => {
                    await fs.writeFile(...args);
                    if (
                        String(args[0]).startsWith(filename + ".") &&
                        String(args[0]).endsWith(".tmp")
                    ) {
                        await fs.writeFile(
                            budgetLockPath(filename),
                            foreignLock("replacement-during-save")
                        );
                    }
                }
            )
        } as typeof fs;
        const owner = session(fsWithRace);
        await owner.open(filename);
        await expect(
            owner.save(createBudget("Changed"), filename)
        ).rejects.toThrow();
        expect(JSON.parse(await fs.readFile(filename, "utf8"))).toEqual(
            original
        );
        expect(
            (await fs.readdir(directory)).filter(name => name.endsWith(".tmp"))
        ).toEqual([]);
    });

    it("keeps old locks until explicit recovery and reloads the latest budget", async () => {
        await fs.writeFile(filename, JSON.stringify(createBudget("Before")));
        await fs.writeFile(budgetLockPath(filename), foreignLock());
        const reader = session();
        expect(await reader.open(filename)).toMatchObject({
            readOnly: true,
            lockDescription: expect.stringContaining("Alex")
        });
        const updated = createBudget("Latest from disk");
        await fs.writeFile(filename, JSON.stringify(updated));
        expect((await reader.unlock()).document).toEqual(updated);
        expect(reader.readOnly).toBe(false);
        expect(
            JSON.parse(await fs.readFile(budgetLockPath(filename), "utf8"))
                .token
        ).not.toBe("foreign");
    });

    it("does not break a lock that changed after it was observed", async () => {
        await fs.writeFile(filename, JSON.stringify(createBudget("Shared")));
        await fs.writeFile(budgetLockPath(filename), foreignLock());
        const reader = session();
        await reader.open(filename);
        const changed = foreignLock("new-session");
        await fs.writeFile(budgetLockPath(filename), changed);
        await expect(reader.unlock()).rejects.toThrow("lock has changed");
        expect(reader.readOnly).toBe(true);
        expect(await fs.readFile(budgetLockPath(filename), "utf8")).toBe(
            changed
        );
    });

    it("permits explicit recovery of a malformed lock without automatically deleting it", async () => {
        await fs.writeFile(filename, JSON.stringify(createBudget("Shared")));
        await fs.writeFile(budgetLockPath(filename), "incomplete lock");
        const reader = session();
        expect(await reader.open(filename)).toMatchObject({
            readOnly: true,
            lockDescription: expect.stringContaining("Another user")
        });
        expect(await fs.readFile(budgetLockPath(filename), "utf8")).toBe(
            "incomplete lock"
        );
        await reader.unlock();
        expect(reader.readOnly).toBe(false);
    });

    it.skipIf(process.platform === "win32")(
        "uses the same lock when the file is opened through a symlink",
        async () => {
            const owner = session(),
                reader = session();
            await owner.save(createBudget("Shared"), filename);
            const alias = path.join(directory, "alias.budget.json");
            await fs.symlink(filename, alias);
            expect(await reader.open(alias)).toMatchObject({
                path: filename,
                readOnly: true
            });
            expect(await exists(budgetLockPath(alias))).toBe(false);
        }
    );
});
