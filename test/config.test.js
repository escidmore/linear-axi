import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractLinearMcpUrl, resolveMcpUrl } from "../src/config.js";

test("Codex Linear MCP URL lookup stays inside linear table", () => {
  const text = `
[mcp_servers.linear]
command = "linear-mcp"

[mcp_servers.other]
url = "https://wrong.example/mcp"
`;

  assert.equal(extractLinearMcpUrl(text), null);
});

test("Codex Linear MCP URL lookup reads the linear table URL", () => {
  const text = `
[mcp_servers.other]
url = "https://wrong.example/mcp"

[mcp_servers.linear]
url = "https://linear.example/mcp"
`;

  assert.equal(extractLinearMcpUrl(text), "https://linear.example/mcp");
});

test("MCP URL resolution prefers the environment over Codex config", async () => {
  const dir = await mkdtemp(join(tmpdir(), "linear-axi-config-"));
  const config = join(dir, "config.toml");
  await writeFile(config, '[mcp_servers.linear]\nurl = "https://config.example/mcp"\n');

  assert.equal(
    await resolveMcpUrl({
      CODEX_CONFIG: config,
      LINEAR_AXI_MCP_URL: "https://env.example/mcp",
    }),
    "https://env.example/mcp",
  );
});

test("MCP URL resolution reads Codex config and falls back to Linear", async () => {
  const dir = await mkdtemp(join(tmpdir(), "linear-axi-config-"));
  const config = join(dir, "config.toml");
  await writeFile(config, '[mcp_servers.linear]\nurl = "https://config.example/mcp"\n');

  assert.equal(await resolveMcpUrl({ CODEX_CONFIG: config }), "https://config.example/mcp");
  assert.equal(
    await resolveMcpUrl({ CODEX_CONFIG: join(dir, "missing.toml") }),
    "https://mcp.linear.app/mcp",
  );
});
