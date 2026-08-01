import test from "node:test";
import assert from "node:assert/strict";
import { renderToon } from "../src/format.js";
import { formatCommandArg } from "../src/lib/cli-helpers.js";
import { compactDocumentDetail, compactIssues } from "../src/lib/linear-format.js";

test("renders tabular arrays with counts", () => {
  assert.equal(
    renderToon({
      issues: [
        { id: "LIN-1", title: "Fix auth", state: "Todo" },
        { id: "LIN-2", title: "Ship, docs", state: "Done" },
      ],
    }),
    'issues[2]{id,title,state}:\n  LIN-1,Fix auth,Todo\n  LIN-2,"Ship, docs",Done\n',
  );
});

test("quotes ambiguous scalar values", () => {
  assert.equal(renderToon({ value: "true", empty: "", text: "hello" }), 'value: "true"\nempty: ""\ntext: hello\n');
});

test("renders empty arrays compactly", () => {
  assert.equal(renderToon({ issues: [] }), "issues: []\n");
});

test("renders help arrays as multiline hints", () => {
  assert.equal(
    renderToon({ help: ["Run `linear-axi issues list`", "Run `linear-axi auth login`"] }),
    "help[2]:\n  Run `linear-axi issues list`\n  Run `linear-axi auth login`\n",
  );
});

test("compact issue sorting preserves input order within the same status", () => {
  assert.deepEqual(
    compactIssues([
      { identifier: "LIN-2", title: "Second", state: "Todo" },
      { identifier: "LIN-1", title: "First", state: "Todo" },
    ]).map((issue) => issue.id),
    ["LIN-2", "LIN-1"],
  );
});

test("formatCommandArg shell-quotes ids with metacharacters", () => {
  assert.equal(formatCommandArg("LIN-123"), "LIN-123");
  assert.equal(formatCommandArg("DOC-1; touch pwned"), "'DOC-1; touch pwned'");
  assert.equal(formatCommandArg("a'b"), "'a'\\''b'");
});

test("document hint quotes a server-controlled id with shell metacharacters", () => {
  const detail = compactDocumentDetail(
    { title: "Spec", content: "next, use `get_document` for detail" },
    "DOC-1; rm file",
  );
  assert.match(detail.document.content, /view 'DOC-1; rm file' --full/);
});
