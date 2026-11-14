import { describe, expect, it } from "vitest";
import en from "../../src/i18n/en";
import { locale, t } from "../../src/i18n";

describe("translations", () => {
    it("uses the English catalog and locale", () => {
        expect(locale).toBe("en-US");
        expect(t("files.actions.saveBudget")).toBe("Save budget");
    });

    it("interpolates named parameters in complete sentences", () => {
        expect(
            t("editor.descriptions.plan", {
                category: "Groceries",
                month: "November 2026"
            })
        ).toBe("Set aside money for Groceries in November 2026.");
        expect(t("summary.transactionCount", { count: 0 })).toBe(
            "0 transactions this month"
        );
    });

    it("preserves user text, including braces, markup, and replacement tokens", () => {
        const name = "{month} <b>My budget</b> $&";
        expect(t("common.actions.optionsFor", { name })).toBe(
            `Options for ${name}`
        );
    });

    it("reports missing parameters instead of rendering a broken message", () => {
        // @ts-expect-error Required named parameters are checked for TypeScript callers.
        expect(() => t("common.actions.optionsFor")).toThrow(
            "Missing translation parameter: name"
        );
    });

    it("rejects sections and unknown paths as message keys", () => {
        // @ts-expect-error Sections cannot be used as translation keys.
        expect(() => t("common.actions")).toThrow("must identify a message");
        // @ts-expect-error Unknown nested keys are rejected by TypeScript.
        expect(() => t("common.actions.missing")).toThrow(
            "Unknown translation key"
        );
    });

    it("has no empty messages or positional placeholders", () => {
        function* messages(tree: object): Generator<string> {
            for (const value of Object.values(tree)) {
                if (typeof value === "string") yield value;
                else yield* messages(value);
            }
        }
        for (const value of messages(en)) {
            expect(value.trim()).not.toBe("");
            expect(value).not.toMatch(/\{value\d+\}/);
        }
    });
});
