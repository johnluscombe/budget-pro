import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import { hostname, userInfo } from "node:os";
import { t } from "../src/i18n";

export function budgetLockPath(filePath: string) {
    return `${filePath}.lock`;
}

export interface LockObservation {
    fingerprint: string;
    owner: string;
    host: string;
    openedAt: string;
}

type Acquisition =
    | { owned: true; newlyAcquired: boolean }
    | { owned: false; observation: LockObservation };

/** Advisory sidecar locks; cloud synchronization cannot make these distributed locks. */
export class BudgetFileLocks {
    private readonly owned = new Map<string, string>();

    acquire(filePath: string): Acquisition {
        if (this.owned.has(filePath)) {
            try {
                this.assertOwned(filePath);
                return { owned: true, newlyAcquired: false };
            } catch {
                // Reopening reloads from disk and can recover a lost lease.
                this.owned.delete(filePath);
            }
        }
        const token = randomUUID();
        try {
            writeFileSync(
                budgetLockPath(filePath),
                JSON.stringify({
                    version: 1,
                    token,
                    owner: userInfo().username,
                    host: hostname(),
                    openedAt: new Date().toISOString(),
                    pid: process.pid
                }),
                { flag: "wx", mode: 0o644 }
            );
            this.owned.set(filePath, token);
            return { owned: true, newlyAcquired: true };
        } catch (error) {
            if (!hasCode(error, "EEXIST"))
                throw new Error(t("files.locks.unavailable"), { cause: error });
            return { owned: false, observation: this.observe(filePath) };
        }
    }

    private read(filePath: string) {
        if (statSync(budgetLockPath(filePath)).size > 16 * 1024) {
            throw new Error(t("files.locks.unreadable"));
        }
        return readFileSync(budgetLockPath(filePath), "utf8");
    }

    private observe(filePath: string): LockObservation {
        const contents = this.read(filePath);
        let data: Record<string, unknown> = {};
        try {
            data = JSON.parse(contents) ?? {};
        } catch {
            /* Keep malformed locks until explicit recovery. */
        }
        return {
            fingerprint: createHash("sha256").update(contents).digest("hex"),
            owner:
                typeof data.owner === "string"
                    ? data.owner
                    : t("files.locks.unknownOwner"),
            host:
                typeof data.host === "string"
                    ? data.host
                    : t("files.locks.unknownComputer"),
            openedAt: typeof data.openedAt === "string" ? data.openedAt : ""
        };
    }

    assertOwned(filePath: string) {
        try {
            const data = JSON.parse(this.read(filePath));
            if (
                !this.owned.has(filePath) ||
                data.token !== this.owned.get(filePath)
            )
                throw new Error("ownership changed");
        } catch (error) {
            throw new Error(t("files.locks.lost"), { cause: error });
        }
    }

    /** Only an explicitly confirmed, unchanged foreign lock can be removed. */
    removeObserved(filePath: string, observation: LockObservation) {
        try {
            if (
                this.observe(filePath).fingerprint !== observation.fingerprint
            ) {
                throw new Error(t("files.locks.changed"));
            }
            unlinkSync(budgetLockPath(filePath));
        } catch (error) {
            if (!hasCode(error, "ENOENT")) throw error;
        }
    }

    release(filePath: string) {
        if (!this.owned.has(filePath)) return;
        try {
            const data = JSON.parse(this.read(filePath));
            if (data.token === this.owned.get(filePath))
                unlinkSync(budgetLockPath(filePath));
        } catch {
            /* A missing/replaced lock is never removed on behalf of another owner. */
        }
        this.owned.delete(filePath);
    }

    releaseAll() {
        for (const filePath of this.owned.keys()) this.release(filePath);
    }
}

function hasCode(error: unknown, code: string) {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === code
    );
}
