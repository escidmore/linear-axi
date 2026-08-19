import { parseFlags, usage } from "../args.js";
import { renderToon } from "../format.js";
import {
  appendContinuationHelp,
  collectKnownArgs,
  dispatchCommandGroup,
} from "../lib/cli-helpers.js";
import {
  compactRows,
  fieldHint,
  paginationInfo,
  parseFields,
  selectFields,
} from "../lib/linear-format.js";
import { asArray, callAvailableTool, mutationData } from "../lib/mcp-tools.js";
import { applyRepoProjectDefault } from "../lib/repo-project.js";
import { groupHelp, listAliasHelp } from "./help.js";
import {
  DEFAULT_LIMIT,
  LIST_BOOLEAN_FLAGS,
  LIST_TOOL_ARG_FLAGS,
  LIST_CONTINUATION_FLAGS,
  LIST_TOOL_ALIASES,
  PROJECT_SCOPED_LIST_ALIASES,
  ensureProjectExists,
} from "./shared.js";

const EMPTY_LIST_HINTS = {
  issues: [
    'Run `linear-axi issues create --title "..." --team "<team>"` to create an issue',
    "Run `linear-axi issues list --state done` to see done issues",
  ],
  projects: ['Run `linear-axi projects create --name "..." --team "<team>"` to create a project'],
  documents: ['Run `linear-axi documents create --title "..." --team "<team>" --content-file <path>` to create a document'],
};

export async function listResourceCommand(alias, args, runtime) {
  return dispatchCommandGroup(args, {
    name: alias,
    help: () => groupHelp(alias, ["list"]),
    handlers: {
      list: (rest) => aliasListCommand(alias, rest, runtime),
    },
    unknownHelp: [`Run \`linear-axi ${alias} list\``],
  });
}

export async function aliasListCommand(alias, args, runtime) {
  const toolNames = LIST_TOOL_ALIASES[alias];
  const parsed = parseFlags(args, { boolean: ["help", ...LIST_BOOLEAN_FLAGS], example: `${alias} list --limit ${DEFAULT_LIMIT}` });
  if (parsed.help) return listAliasHelp(alias);
  if (parsed["all-projects"] && !PROJECT_SCOPED_LIST_ALIASES.includes(alias)) {
    throw usage("--all-projects is only supported for issues and documents", [
      "Run `linear-axi issues list --all-projects`",
      "Run `linear-axi documents list --all-projects`",
    ]);
  }
  const toolArgs = collectKnownArgs(parsed, LIST_TOOL_ARG_FLAGS);
  if (alias === "issues" && toolArgs.parentId !== undefined) {
    toolArgs.parent ??= toolArgs.parentId;
    delete toolArgs.parentId;
  }
  if (!("limit" in toolArgs)) toolArgs.limit = DEFAULT_LIMIT;
  let repoProjectId;
  if (PROJECT_SCOPED_LIST_ALIASES.includes(alias)) {
    repoProjectId = await applyRepoProjectDefault(toolArgs, runtime, {
      allProjects: Boolean(parsed["all-projects"]),
      allProjectsCommand: `linear-axi ${alias} list --all-projects`,
      command: `linear-axi ${alias} list`,
      requireProject: true,
    });
  }

  if (alias === "documents" && toolArgs.project !== undefined) {
    const projectRef = toolArgs.project;
    delete toolArgs.project;
    toolArgs.projectId = repoProjectId ?? (await ensureProjectExists(projectRef, runtime)).id ?? projectRef;
  }

  const result = await callAvailableTool(runtime, toolNames, toolArgs);
  const data = mutationData(result, [`Run \`linear-axi ${alias} list --help\` to review supported filters`]);
  const dataRows = asArray(data);
  const rows = parsed.full
    ? data
    : parsed.fields
      ? selectFields(dataRows, parseFields(parsed.fields))
      : compactRows(alias, data);
  const rowCount = dataRows.length;
  const page = paginationInfo(data, rowCount);
  const help = listHints(alias, rowCount);
  appendContinuationHelp(help, `linear-axi ${alias} list`, parsed, LIST_CONTINUATION_FLAGS, page.cursor);
  return renderToon({
    count: page.count,
    ...(page.cursor ? { cursor: page.cursor } : {}),
    [alias]: rows,
    help,
  });
}

const VIEW_LIST_ALIASES = new Set(["issues", "documents", "projects"]);

function listHints(publicName, rowCount) {
  if (rowCount > 0) {
    return [
      `Run \`linear-axi ${publicName} list --fields ${fieldHint(publicName)}\` to choose fields`,
      ...(VIEW_LIST_ALIASES.has(publicName)
        ? [`Run \`linear-axi ${publicName} view <id>\` to read one ${publicName.slice(0, -1)} in full`]
        : []),
    ];
  }
  const hints = EMPTY_LIST_HINTS[publicName] ?? [`Run \`linear-axi ${publicName} list --query "<text>"\` to search ${publicName}`];
  return [...hints];
}
