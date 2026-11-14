import { t } from "../src/i18n";
import { randomUUID } from "node:crypto";
import * as fileSystem from "node:fs/promises";
import path from "node:path";
import { validateBudget, type BudgetDocument } from "../src/lib/budget";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export interface BudgetFileResult {
    document: BudgetDocument;
    path: string;
    warning?: string;
}

/** The renderer never receives a general-purpose filesystem API. */
export class BudgetFileService {
    private readonly statePath: string;
    private readonly fs: typeof fileSystem;
    currentPath: string | undefined;

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
        const resolvedPath = path.resolve(filePath);
        let document: BudgetDocument;
        try {
            const stats = await this.fs.stat(resolvedPath);
            if (!stats.isFile() || stats.size > MAX_FILE_SIZE) {
                throw new Error(t("files.errors.fileTooLarge"));
            }
            document = validateBudget(
                JSON.parse(await this.fs.readFile(resolvedPath, "utf8"))
            );
        } catch (error) {
            if (hasCode(error, "ENOENT")) {
                throw new Error(
                    t("files.errors.notFound", {
                        filename: path.basename(resolvedPath)
                    }),
                    { cause: error }
                );
            }
            throw new Error(
                t("files.errors.invalidFile", {
                    filename: path.basename(resolvedPath)
                }),
                { cause: error }
            );
        }
        const warning = await this.remember(resolvedPath);
        this.currentPath = resolvedPath;
        return {
            document,
            path: resolvedPath,
            ...(warning ? { warning } : {})
        };
    }

    async save(
        document: BudgetDocument,
        filePath: string
    ): Promise<BudgetFileResult> {
        const validated = validateBudget(document);
        const resolvedPath = path.resolve(filePath);
        const contents = `${JSON.stringify(validated, null, 2)}\n`;
        if (Buffer.byteLength(contents, "utf8") > MAX_FILE_SIZE) {
            throw new Error(t("files.errors.budgetTooLarge"));
        }
        try {
            await this.atomicWrite(resolvedPath, contents);
        } catch (error) {
            throw new Error(
                t("files.errors.write", {
                    filename: path.basename(resolvedPath)
                }),
                { cause: error }
            );
        }
        const warning = await this.remember(resolvedPath);
        this.currentPath = resolvedPath;
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

    private async atomicWrite(filePath: string, contents: string) {
        const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
        try {
            await this.fs.writeFile(temporaryPath, contents, {
                encoding: "utf8",
                flag: "wx",
                mode: 0o600
            });
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
