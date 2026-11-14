import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/unit/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov", "json-summary"],
            include: [
                "src/lib/**/*.ts",
                "src/i18n/index.ts",
                "src-electron/file-service.ts"
            ]
        }
    }
});
