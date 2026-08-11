import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execute = promisify(execFile);

test("package bin executable starts through the SDK boundary", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.bin["linear-axi"], "bin/linear-axi.js");
  const executable = fileURLToPath(new URL(`../${packageJson.bin["linear-axi"]}`, import.meta.url));
  const { stdout, stderr } = await execute(executable, ["--version"]);

  assert.equal(stdout, `${packageJson.version}\n`);
  assert.equal(stderr, "");
});
