import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// This job publishes only the generated badge. It never checks out another
// branch, changes the application tree, or force-pushes remote history.
if (process.env.GITHUB_ACTIONS !== "true") {
    throw new Error("Badge publishing is intended for the GitHub Actions job.");
}
const badge = readFileSync("coverage/coverage.svg", "utf8");
const gitEnvironment = {
    ...process.env,
    GIT_AUTHOR_NAME: "github-actions[bot]",
    GIT_AUTHOR_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
    GIT_COMMITTER_NAME: "github-actions[bot]",
    GIT_COMMITTER_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com"
};
function git(args, input) {
    return execFileSync("git", args, {
        input,
        encoding: "utf8",
        env: gitEnvironment,
        stdio: ["pipe", "pipe", "pipe"]
    }).trim();
}
const reference = "refs/heads/coverage-badge";
let parent;
try {
    git(["ls-remote", "--exit-code", "--heads", "origin", reference]);
    git(["fetch", "--depth=1", "origin", reference]);
    parent = git(["rev-parse", "FETCH_HEAD"]);
    if (git(["ls-tree", "--name-only", parent]) !== "coverage.svg") {
        throw new Error(
            "Refusing to replace unrelated files on the coverage-badge branch."
        );
    }
} catch (error) {
    // ls-remote uses exit status 2 when the branch does not exist yet.
    if (error.status !== 2) throw error;
}
const blob = git(["hash-object", "-w", "--stdin"], badge);
const tree = git(["mktree"], `100644 blob ${blob}\tcoverage.svg\n`);
if (parent && git(["rev-parse", `${parent}^{tree}`]) === tree) {
    console.log("Coverage badge is unchanged.");
} else {
    const commit = git([
        "commit-tree",
        tree,
        ...(parent ? ["-p", parent] : []),
        "-m",
        "Update unit coverage badge"
    ]);
    git(["push", "origin", `${commit}:${reference}`]);
    console.log("Published coverage.svg to the coverage-badge branch.");
}
