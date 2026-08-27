import { AxiError, parseFlags, usage } from "../args.js";
import {
  applyTextFileFlag,
  collectKnownArgs,
  dispatchCommandGroup,
  formatCommandArg,
  rejectIdOnCreate,
  rejectUnknownInput,
  requireValue,
  validFlagsHelp,
} from "../lib/cli-helpers.js";
import {
  compactIssueDetail,
  compactIssueMutation,
} from "../lib/linear-format.js";
import { applyRepoProjectDefault } from "../lib/repo-project.js";
import {
  groupHelp,
  issueCreateHelp,
  issueUpdateHelp,
  issueViewHelp,
} from "./help.js";
import { aliasListCommand } from "./list-resource.js";
import {
  ensureIssueExists,
  isUnverifiedDetail,
  renderDetailView,
  renderMutation,
} from "./shared.js";

const ISSUE_MUTATION_FIELDS = [
  "id",
  "title",
  "team",
  "description",
  "state",
  "assignee",
  "project",
  "cycle",
  "parentId",
  "dueDate",
  "estimate",
  "priority",
  "blocks",
  "blockedBy",
  "relatedTo",
  "duplicateOf",
  "removeBlocks",
  "removeBlockedBy",
  "removeRelatedTo",
];
const ISSUE_ARRAY_FLAGS = ["label", "removeLabel", "blocks", "blockedBy", "relatedTo", "removeBlocks", "removeBlockedBy", "removeRelatedTo"];
const ISSUE_CREATE_FLAGS = [...ISSUE_MUTATION_FIELDS.filter((name) => name !== "id" && !name.startsWith("remove")), "label", "description-file"];
const ISSUE_UPDATE_FLAGS = [...ISSUE_MUTATION_FIELDS, "label", "removeLabel", "description-file"];
const ISSUE_CREATE_HELP = [
  'Run `linear-axi issues create --title "Title" --team "<team>"`',
  'Run `linear-axi issues list --team "<team>" --query "Title"` to check existing issues',
];
const ISSUE_UPDATE_HELP = [
  'Run `linear-axi issues update --id LIN-123 --state "Done"`',
  "Run `linear-axi issues list --query <text>` to find the issue id",
];
const ISSUE_ID_ON_CREATE_HELP = [
  'Run `linear-axi issues create --title "Title" --team "<team>"` to create a new issue',
  'Run `linear-axi issues update --id LIN-123 --state "Done"` to edit an existing issue',
];

export async function issueCommand(args, runtime) {
  return dispatchCommandGroup(args, {
    name: "issues",
    help: () => groupHelp("issues", ["list", "view", "create", "update"]),
    handlers: {
      list: (rest) => aliasListCommand("issues", rest, runtime),
      view: (rest) => viewIssueCommand(rest, runtime),
      create: (rest) => createIssueCommand(rest, runtime),
      update: (rest) => updateIssueCommand(rest, runtime),
    },
    unknownHelp: [
      "Run `linear-axi issues list`",
      "Run `linear-axi issues view <id>`",
      "Run `linear-axi issues update --id <id> --state done`",
    ],
  });
}

async function viewIssueCommand(args, runtime) {
  const parsed = parseFlags(args, { boolean: ["help", "full"], example: "issues view LIN-123" });
  if (parsed.help) return issueViewHelp();
  rejectUnknownInput({ ...parsed, positionals: parsed.positionals.slice(1) }, ["full"], validFlagsHelp("linear-axi issues view", ["full"]));
  const id = parsed.positionals[0];
  if (!id) throw usage("issue id is required", ["Run `linear-axi issues view <id>`"]);
  if (id === "all") throw usage("issues view expects one issue id", [
    "Run `linear-axi issues list --limit 50` to view many issues",
    "Run `linear-axi issues view <id>` to view one issue",
  ]);
  const detail = await ensureIssueExists(id, runtime, { includeRelationStatuses: true });
  return renderDetailView({
    resource: "issue",
    detail,
    full: parsed.full,
    compact: compactIssueDetail,
    fullCommand: `linear-axi issues view ${id} --full`,
  });
}

async function createIssueCommand(args, runtime) {
  const parsed = parseFlags(args, { boolean: ["help"], array: ISSUE_ARRAY_FLAGS, example: 'issues create --title "Bug" --team ENG' });
  if (parsed.help) return issueCreateHelp();
  rejectIdOnCreate("issue", ISSUE_ID_ON_CREATE_HELP, parsed);
  rejectUnknownInput(parsed, ISSUE_CREATE_FLAGS, validFlagsHelp("linear-axi issues create", ISSUE_CREATE_FLAGS));
  const toolArgs = await issueToolArgs(parsed, runtime);
  await applyRepoProjectDefault(toolArgs, runtime, {
    command: "linear-axi issues create",
  });
  if (toolArgs.project === "") delete toolArgs.project;
  requireValue(toolArgs.title && toolArgs.team, "creating an issue requires --title and --team", ISSUE_CREATE_HELP);
  await resolveParentId(toolArgs, runtime);
  return saveIssue(toolArgs, runtime, [
    'Run `linear-axi issues create --title "Title" --team "<team>"`',
    "Run `linear-axi projects list --full` to confirm project/team compatibility",
  ]);
}

async function updateIssueCommand(args, runtime) {
  const parsed = parseFlags(args, { boolean: ["help"], array: ISSUE_ARRAY_FLAGS, example: 'issues update --id LIN-123 --state Done' });
  if (parsed.help) return issueUpdateHelp();
  rejectUnknownInput(parsed, ISSUE_UPDATE_FLAGS, validFlagsHelp("linear-axi issues update", ISSUE_UPDATE_FLAGS));
  const toolArgs = await issueToolArgs(parsed, runtime);
  if (!toolArgs.id) await applyRepoProjectDefault(toolArgs, runtime);
  if (toolArgs.project === "") toolArgs.project = null;
  requireValue(toolArgs.id, "updating an issue requires --id", ISSUE_UPDATE_HELP);
  const issue = await ensureIssueExists(toolArgs.id, runtime);
  applyRemovedLabels(toolArgs, parsed.removeLabel, issue);
  await resolveParentId(toolArgs, runtime);
  return saveIssue(toolArgs, runtime, ISSUE_UPDATE_HELP);
}

async function issueToolArgs(parsed, runtime) {
  const toolArgs = collectKnownArgs(parsed, ISSUE_MUTATION_FIELDS);
  if (parsed.label) toolArgs.labels = parsed.label;
  await applyTextFileFlag(toolArgs, parsed, {
    flag: "description-file",
    field: "description",
    cwd: runtime.cwd,
  });
  return toolArgs;
}

function applyRemovedLabels(toolArgs, labelsToRemove, issue) {
  if (!labelsToRemove) return;
  if (labelsToRemove.some((value) => !normalizeLabel(value))) {
    throw usage("--removeLabel requires a label name or id", ISSUE_UPDATE_HELP);
  }
  const explicit = toolArgs.labels !== undefined;
  const labels = toolArgs.labels ?? issue?.labels;
  if (!Array.isArray(labels) || (!explicit && isUnverifiedDetail(issue))) {
    throw new AxiError("operational", "issue labels unavailable; cannot remove labels safely", [
      `Run \`linear-axi issues view ${formatCommandArg(toolArgs.id)} --full\` to inspect the current labels`,
    ]);
  }
  const removals = new Set(labelsToRemove.map(normalizeLabel));
  toolArgs.labels = labels
    .filter((label) => !labelReferences(label).some((value) => removals.has(normalizeLabel(value))))
    .map((label) => {
      const value = typeof label === "string" ? label : label?.id ?? label?.name;
      if (typeof value !== "string" || !value.trim()) {
        throw new AxiError("operational", "issue labels could not be read safely");
      }
      return value;
    });
}

function labelReferences(label) {
  return typeof label === "string" ? [label] : [label?.name, label?.id];
}

function normalizeLabel(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function resolveParentId(toolArgs, runtime) {
  if (toolArgs.parentId === undefined) return;
  const parent = await ensureIssueExists(toolArgs.parentId, runtime);
  if (!parent.id) {
    throw new AxiError("operational", `issue id unavailable for parent: ${toolArgs.parentId}`, [
      `Run \`linear-axi issues view ${formatCommandArg(toolArgs.parentId)} --full\` to inspect the issue`,
    ]);
  }
  toolArgs.parentId = parent.id;
}

async function saveIssue(toolArgs, runtime, help) {
  return renderMutation(runtime, {
    tool: "save_issue",
    args: toolArgs,
    help,
    render: (issue) => ({ issue: compactIssueMutation(issue) }),
  });
}
