import test from "node:test";
import assert from "node:assert/strict";
import { LinearMcpClient, LinearOAuthProvider } from "../src/mcp.js";
import { chmod, mkdtemp, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("remote client uses OAuth provider when no bearer token is configured", () => {
  const client = new LinearMcpClient({ url: "https://mcp.linear.app/mcp" });

  assert.ok(client.authProvider instanceof LinearOAuthProvider);
});

test("remote client sends its configured bearer token", async () => {
  let request;
  const client = new LinearMcpClient({
    url: "https://example.test/mcp",
    token: "secret",
    fetchImpl: async (url, init) => {
      request = { url, init };
      throw new Error("stop after request capture");
    },
  });

  await assert.rejects(() => client.connect(), /stop after request capture/);
  assert.equal(request.url.toString(), "https://example.test/mcp");
  assert.equal(new Headers(request.init.headers).get("authorization"), "Bearer secret");
});

test("OAuth provider persists state for Linear CSRF validation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "linear-axi-oauth-"));
  const storePath = join(dir, "oauth.json");
  const provider = new LinearOAuthProvider({ storePath });

  const first = await provider.state();
  const second = await provider.state();
  const store = JSON.parse(await readFile(storePath, "utf8"));

  assert.equal(first, second);
  assert.equal(store.state, first);

  await provider.invalidateCredentials("verifier");
  const resetStore = JSON.parse(await readFile(storePath, "utf8"));
  assert.equal(resetStore.state, undefined);
});

test("OAuth provider persists the SDK authorization exchange", async () => {
  const dir = await mkdtemp(join(tmpdir(), "linear-axi-oauth-"));
  const storePath = join(dir, "oauth.json");
  const provider = new LinearOAuthProvider({ storePath });
  const clientInformation = { client_id: "client", client_secret: "secret" };
  const tokens = { access_token: "access", refresh_token: "refresh" };

  assert.equal(provider.redirectUrl, "http://127.0.0.1:14566/oauth/callback");
  assert.deepEqual(provider.clientMetadata.redirect_uris, [provider.redirectUrl]);
  await provider.redirectToAuthorization(new URL("https://linear.example/authorize"));
  await provider.saveClientInformation(clientInformation);
  await provider.saveTokens(tokens);
  await provider.saveCodeVerifier("verifier");

  assert.equal(provider.authorizationUrl, "https://linear.example/authorize");
  const restored = new LinearOAuthProvider({ storePath });
  assert.deepEqual(await restored.clientInformation(), clientInformation);
  assert.deepEqual(await restored.tokens(), tokens);
  assert.equal(await restored.codeVerifier(), "verifier");

  await restored.invalidateCredentials("all");
  assert.equal(await restored.clientInformation(), undefined);
  assert.equal(await restored.tokens(), undefined);
  await assert.rejects(() => restored.codeVerifier(), /No OAuth code verifier saved/);
});

test("OAuth provider deletes the local credential store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "linear-axi-oauth-"));
  const storePath = join(dir, "oauth.json");
  const provider = new LinearOAuthProvider({ storePath });

  await provider.saveTokens({ access_token: "initial" });

  assert.equal(await provider.deleteStore(), true);
  await assert.rejects(() => stat(storePath), /ENOENT/);
  assert.equal(await provider.deleteStore(), false);
});

test("OAuth provider tightens permissions on existing token store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "linear-axi-oauth-"));
  const storePath = join(dir, "oauth.json");
  const provider = new LinearOAuthProvider({ storePath });

  await provider.saveTokens({ access_token: "initial" });
  await chmod(storePath, 0o666);
  await provider.saveTokens({ access_token: "updated" });

  assert.equal((await stat(storePath)).mode & 0o777, 0o600);
});
