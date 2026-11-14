import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/unit/**/*.test.ts"],
        coverage: {
            provider: "v8",
            // NYC consumes this Istanbul-compatible data and generates the reports.
            reportsDirectory: ".nyc_output",
            reporter: ["json"],
            include: [
                "src/lib/**/*.ts",
                "src/i18n/index.ts",
                "src-electron/file-service.ts"
            ]
        }
    }
});
