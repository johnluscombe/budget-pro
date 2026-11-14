import { appendFileSync, readFileSync } from "node:fs";

const { total } = JSON.parse(
    readFileSync(
        new URL("../coverage/coverage-summary.json", import.meta.url),
        "utf8"
    )
);
const rows = ["statements", "branches", "functions", "lines"].map(metric => {
    const result = total[metric];
    return `| ${metric} | ${result.pct}% | ${result.covered} / ${result.total} |`;
});
const summary = [
    "## Unit test coverage",
    "",
    "| Metric | Coverage | Covered / Total |",
    "| --- | ---: | ---: |",
    ...rows,
    "",
    "Coverage includes budget logic, translation lookup, and budget file handling. UI workflows are verified separately with Playwright.",
    "",
    "Download the **unit-coverage** artifact for the HTML report and LCOV data.",
    ""
].join("\n");

if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
} else {
    process.stdout.write(summary);
}
