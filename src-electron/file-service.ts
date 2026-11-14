import { t } from "../src/i18n";
import { randomUUID } from "node:crypto";
import * as fileSystem from "node:fs/promises";
import path from "node:path";
import { validateBudget, type BudgetDocument } from "../src/lib/budget";
import { BudgetFileLocks, type LockObservation } from "./file-lock";
import type { BudgetFileResult } from "../src/types/budget-files";
export type { BudgetFileResult } from "../src/types/budget-files";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** The renderer never receives a general-purpose filesystem API. */
export class BudgetFileService {
    private readonly statePath: string;
    private readonly fs: typeof fileSystem;
    currentPath: string | undefined;
    readOnly = false;
    private observation: LockObservation | undefined;
    private readonly locks = new BudgetFileLocks();

    close() {
        this.locks.releaseAll();
        this.currentPath = undefined;
        this.readOnly = false;
        this.observation = undefined;
    }

    async unlock(): Promise<BudgetFileResult> {
        if (!this.currentPath || !this.readOnly || !this.observation)
            throw new Error(t("files.locks.changed"));
        this.locks.removeObserved(this.currentPath, this.observation);
        return this.open(this.currentPath);
    }

    private async canonical(filePath: string) {
        const absolute = path.resolve(filePath);
        try {
            return await this.fs.realpath(absolute);
        } catch (error) {
            if (!hasCode(error, "ENOENT")) throw error;
            return path.join(
                await this.fs.realpath(path.dirname(absolute)),
                path.basename(absolute)
            );
        }
    }

    private adopt(filePath: string, observation?: LockObservation) {
        if (this.currentPath && (this.currentPath !== filePath || observation))
            this.locks.release(this.currentPath);
        this.currentPath = filePath;
        this.readOnly = Boolean(observation);
        this.observation = observation;
    }

    constructor(userDataDirectory: string, fs = fileSystem) {
        this.statePath = path.join(userDataDirectory, "recent-budget.json");
        this.fs = fs;
    }

    async restore(): Promise<BudgetFileResult | null> {
        let contents: string;
        try {
            contents = await this.fs.readFile(this.statePath, "utf8");
        } catch (error) {
            if (hasCode(error, "ENOENT")) return null;
            throw new Error(t("files.errors.readRecent"), { cause: error });
        }

        let previousPath: unknown;
        try {
            previousPath = (JSON.parse(contents) as { lastFile?: unknown })
                .lastFile;
            if (
                typeof previousPath !== "string" ||
                !path.isAbsolute(previousPath)
            ) {
                throw new Error(t("files.errors.invalidRecentPath"));
            }
        } catch (error) {
            throw new Error(t("files.errors.invalidRecent"), { cause: error });
        }

        try {
            return await this.open(previousPath as string);
        } catch (error) {
            throw new Error(
                t("files.errors.restoreFile", {
                    filename: path.basename(previousPath as string)
                }),
                { cause: error }
            );
        }
    }

    async open(filePath: string): Promise<BudgetFileResult> {
        let resolvedPath = path.resolve(filePath);
        try {
            resolvedPath = await this.canonical(resolvedPath);
            const stats = await this.fs.stat(resolvedPath);
            if (!stats.isFile() || stats.size > MAX_FILE_SIZE)
                throw new Error(t("files.errors.fileTooLarge"));
        } catch (error) {
            if (hasCode(error, "ENOENT"))
                throw new Error(
                    t("files.errors.notFound", {
                        filename: path.basename(resolvedPath)
                    }),
                    { cause: error }
                );
            throw new Error(
                t("files.errors.invalidFile", {
                    filename: path.basename(resolvedPath)
                }),
                { cause: error }
            );
        }
        const acquisition = this.locks.acquire(resolvedPath);
        let document: BudgetDocument;
        try {
            document = validateBudget(
                JSON.parse(await this.fs.readFile(resolvedPath, "utf8"))
            );
        } catch (error) {
            if (acquisition.owned && acquisition.newlyAcquired)
                this.locks.release(resolvedPath);
            throw new Error(
                t("files.errors.invalidFile", {
                    filename: path.basename(resolvedPath)
                }),
                { cause: error }
            );
        }
        const warning = await this.remember(resolvedPath);
        const observation = acquisition.owned
            ? undefined
            : acquisition.observation;
        this.adopt(resolvedPath, observation);
        return {
            document,
            path: resolvedPath,
            ...(warning ? { warning } : {}),
            ...(observation
                ? {
                      readOnly: true,
                      lockDescription: t("files.locks.readOnly", {
                          owner: observation.owner,
                          host: observation.host
                      })
                  }
                : {})
        };
    }

    async save(
        document: BudgetDocument,
        filePath: string
    ): Promise<BudgetFileResult> {
        const validated = validateBudget(document);
        const contents = `${JSON.stringify(validated, null, 2)}\n`;
        if (Buffer.byteLength(contents, "utf8") > MAX_FILE_SIZE)
            throw new Error(t("files.errors.budgetTooLarge"));
        const resolvedPath = await this.canonical(filePath);
        if (this.readOnly && resolvedPath === this.currentPath)
            throw new Error(t("files.locks.readOnlySave"));
        if (resolvedPath === this.currentPath)
            this.locks.assertOwned(resolvedPath);
        const acquisition = this.locks.acquire(resolvedPath);
        if (!acquisition.owned) throw new Error(t("files.locks.locked"));
        try {
            this.locks.assertOwned(resolvedPath);
            await this.atomicWrite(resolvedPath, contents, () =>
                this.locks.assertOwned(resolvedPath)
            );
        } catch (error) {
            if (resolvedPath !== this.currentPath)
                this.locks.release(resolvedPath);
            throw new Error(
                t("files.errors.write", {
                    filename: path.basename(resolvedPath)
                }),
                { cause: error }
            );
        }
        const warning = await this.remember(resolvedPath);
        this.adopt(resolvedPath);
        return {
            document: validated,
            path: resolvedPath,
            ...(warning ? { warning } : {})
        };
    }

    private async remember(filePath: string) {
        try {
            await this.fs.mkdir(path.dirname(this.statePath), {
                recursive: true
            });
            await this.atomicWrite(
                this.statePath,
                JSON.stringify({ lastFile: filePath })
            );
        } catch {
            return t("files.errors.rememberWarning");
        }
    }

    private async atomicWrite(
        filePath: string,
        contents: string,
        guard?: () => void
    ) {
        const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
        try {
            await this.fs.writeFile(temporaryPath, contents, {
                encoding: "utf8",
                flag: "wx",
                mode: 0o600
            });
            guard?.();
            await this.fs.rename(temporaryPath, filePath);
        } finally {
            await this.fs.unlink(temporaryPath).catch(() => undefined);
        }
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
