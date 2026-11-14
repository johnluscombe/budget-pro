import { readFileSync, writeFileSync } from "node:fs";

const { total } = JSON.parse(
    readFileSync(
        new URL("../coverage/coverage-summary.json", import.meta.url),
        "utf8"
    )
);
const percent = total.lines.pct;
if (
    typeof percent !== "number" ||
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > 100
) {
    throw new Error(
        "Cannot generate a badge without a valid line coverage percentage."
    );
}
const value = `${Number(percent.toFixed(2))}%`;
const color =
    percent >= 90
        ? "#4c1"
        : percent >= 80
          ? "#97ca00"
          : percent >= 70
            ? "#dfb317"
            : "#e05d44";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="154" height="20" role="img" aria-label="Unit line coverage: ${value}">
<title>Unit line coverage: ${value}</title>
<linearGradient id="shine" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="corners"><rect width="154" height="20" rx="3"/></clipPath>
<g clip-path="url(#corners)"><path fill="#555" d="M0 0h94v20H0z"/><path fill="${color}" d="M94 0h60v20H94z"/><path fill="url(#shine)" d="M0 0h154v20H0z"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="47" y="15" fill="#010101" fill-opacity=".3">unit coverage</text><text x="47" y="14">unit coverage</text><text x="124" y="15" fill="#010101" fill-opacity=".3">${value}</text><text x="124" y="14">${value}</text></g>
</svg>
`;
writeFileSync(new URL("../coverage/coverage.svg", import.meta.url), svg);
console.log(`Generated coverage badge: ${value}`);
