import { readFileSync, accessSync } from "node:fs";

const read = file =>
    JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const version = read("package.json").version;
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
if (tag !== `v${version}`) {
    throw new Error(
        `Release tag ${tag} does not match package version v${version}.`
    );
}
for (const file of [
    "src-electron/package.json",
    "package-lock.json",
    "src-electron/package-lock.json"
]) {
    const manifest = read(file);
    if (
        manifest.version !== version ||
        (manifest.packages && manifest.packages[""].version !== version)
    ) {
        throw new Error(`Release version mismatch in ${file}.`);
    }
}
accessSync(new URL(`../docs/releases/${version}.md`, import.meta.url));
console.log(
    `Verified ${tag}: package versions, lockfiles, and release notes match.`
);
