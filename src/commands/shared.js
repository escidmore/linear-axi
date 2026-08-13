import { basename, resolve } from "node:path";
import { AxiError, usage } from "../args.js";
import { renderToon } from "../format.js";
import { formatCommandArg, TOOL_BOOLEAN_FLAGS } from "../lib/cli-helpers.js";
import { sanitizeDocument, sanitizeProject } from "../lib/linear-format.js";
import { asArray, callAvailableTool, extractData, hasTool, isUnknownToolError, mutationData } from "../lib/mcp-tools.js";
import { projectMatches } from "../lib/project-match.js";
import { findGitRoot } from "../lib/repo-project.js";

export const DEFAULT_LIMIT = 50;

const UNVERIFIED_DETAIL = Symbol("unverifiedDetail");

export const LIST_TOOL_ALIASES = {
  issues: ["list_issues"],
  projects: ["list_projects"],
  teams: ["list_teams"],
  users: ["list_users"],
  documents: ["list_documents"],
  labels: ["list_issue_labels"],
};

export const PROJECT_SCOPED_LIST_ALIASES = ["issues", "documents"];

export const LIST_BOOLEAN_FLAGS = [
  "full",
  "all-projects",
  ...TOOL_BOOLEAN_FLAGS,
];

export const LIST_TOOL_ARG_FLAGS = [
  "assignee",
  "createdAt",
  "cursor",
  "cycle",
  "delegate",
  "label",
  "limit",
  "member",
  "name",
  "orderBy",
  "parentId",
  "priority",
  "project",
  "query",
  "state",
  "team",
  "teamId",
  "updatedAt",
  ...TOOL_BOOLEAN_FLAGS,
];

export const LIST_CONTINUATION_FLAGS = [
  ...LIST_TOOL_ARG_FLAGS.filter((name) => name !== "cursor"),
  "fields",
  "full",
  "all-projects",
];

const ISSUE_RELATION_FIELDS = ["blocks", "blockedBy", "relatedTo", "duplicateOf"];

export async function getIssueDetail(id, runtime, options = {}) {
  const detail = await getDetailWithListFallback(runtime, {
    detailTool: "get_issue",
    detailArgs: { id, includeRelations: true },
    listTool: "list_issues",
    listArgs: { query: id, limit: 10 },
    identityFields: ["identifier", "id", "title"],
    matches: (issue) => issue.id === id || issue.identifier === id,
  });
  return options.includeRelationStatuses ? includeRelationStatuses(detail, runtime) : detail;
}

export async function ensureIssueExists(id, runtime, options) {
  return requireExistingDetail(getIssueDetail(id, runtime, options), "issue", id, [
    `Run \`linear-axi issues list --query ${formatCommandArg(id)}\` to search for the issue`,
    "Run `linear-axi issues create --title \"Title\" --team \"<team>\"` to create a new issue",
  ]);
}

async function includeRelationStatuses(detail, runtime) {
  if (!detail?.relations || typeof detail.relations !== "object") return detail;

  const relationIds = new Set();
  for (const field of ISSUE_RELATION_FIELDS) {
    for (const relation of relationItems(detail.relations[field])) {
      const id = relationId(relation);
      if (id && relationStatus(relation) === undefined) relationIds.add(id);
    }
  }
  if (relationIds.size === 0) return detail;

  const statusEntries = await Promise.all([...relationIds].map(async (id) => {
    try {
      const result = await runtime.client.callTool("get_issue", { id });
      return [id, relationStatus(extractData(result))];
    } catch {
      return [id, undefined];
    }
  }));
  const statuses = new Map(statusEntries.filter(([, status]) => status !== undefined));
  if (statuses.size === 0) return detail;

  return {
    ...detail,
    relations: Object.fromEntries(
      Object.entries(detail.relations).map(([field, value]) => [field, addRelationStatuses(value, statuses)]),
    ),
  };
}

function relationItems(value) {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function relationId(value) {
  if (typeof value === "string") return value;
  const issue = value?.issue ?? value;
  return issue?.identifier ?? issue?.id ?? issue?.key;
}

function relationStatus(value) {
  const issue = value?.issue ?? value;
  return issue?.status?.name ?? issue?.status ?? issue?.state?.name ?? issue?.state;
}

function addRelationStatuses(value, statuses) {
  if (Array.isArray(value)) return value.map((item) => addRelationStatuses(item, statuses));
  if (!value || typeof value !== "object") {
    const status = statuses.get(value);
    return status === undefined ? value : { id: value, status };
  }

  const status = relationStatus(value) ?? statuses.get(relationId(value));
  if (status === undefined) return value;
  if (value.issue) return { ...value, issue: { ...value.issue, status } };
  return { ...value, status };
}

export async function getProjectDetail(id, runtime) {
  return getDetailWithListFallback(runtime, {
    detailTool: "get_project",
    detailArgs: { query: id },
    detailIdKey: "query",
    listTool: "list_projects",
    listArgs: { query: id, limit: 10 },
    identityFields: ["id", "slugId", "name"],
    requireKnownDetailTool: true,
    fallbackOnBlankDetail: true,
    detailMatches: (project) => projectMatches(project, id),
    matches: (project) => projectMatches(project, id),
    transform: (project) => sanitizeProject(project, id),
  });
}

export async function ensureProjectExists(id, runtime) {
  return requireExistingDetail(getProjectDetail(id, runtime), "project", id, [
    `Run \`linear-axi projects list --query ${formatCommandArg(id)} --fields id,name,status\` to search for the project`,
    'Run `linear-axi projects create --name "Roadmap" --team "<team>"` to create a new project',
  ]);
}

export function projectSaveToolArgs(toolName, args) {
  if (toolName !== "save_project") return args;
  const { team, teamId, ...projectArgs } = args;
  const teamRef = teamId ?? team;
  if (teamRef === undefined) return projectArgs;
  return {
    ...projectArgs,
    [projectArgs.id ? "addTeams" : "setTeams"]: [teamRef],
  };
}

export async function renderMutation(runtime, options) {
  const result = options.toolNames
    ? await callAvailableTool(runtime, options.toolNames, options.argsForTool ?? options.args)
    : await runtime.client.callTool(options.tool, options.args);
  return renderToon(options.render(mutationData(result, options.help)));
}

export function renderDetailView(options) {
  const unverified = isUnverifiedDetail(options.detail);
  const help = unverified
    ? [`This ${options.resource} came from list results and may be truncated by the Linear MCP server`]
    : [];
  if (options.full) {
    return renderToon({
      [options.resource]: options.detail,
      ...(help.length ? { help } : {}),
    });
  }
  const compact = options.compact(options.detail, unverified);
  if (compact.truncated) help.push(`Run \`${options.fullCommand}\` to show the complete ${options.resource}`);
  return renderToon({
    [options.resource]: compact[options.resource],
    ...(help.length ? { help } : {}),
  });
}

export async function getDocumentDetail(id, runtime) {
  return getDetailWithListFallback(runtime, {
    detailTool: "get_document",
    detailArgs: { id },
    listTool: "list_documents",
    listArgs: { query: id, limit: 10 },
    identityFields: ["id", "title", "name"],
    matches: (document) => document.id === id || document.slugId === id,
    transform: (document) => sanitizeDocument(document, id),
  });
}

async function getDetailWithListFallback(runtime, options) {
  const knownToolNames = options.requireKnownDetailTool
    ? new Set((typeof runtime.client.listTools === "function" ? await runtime.client.listTools() : []).map((tool) => tool.name))
    : null;
  const hasListTool = () => knownToolNames
    ? knownToolNames.has(options.listTool)
    : hasTool(runtime, options.listTool);

  if (!options.requireKnownDetailTool || knownToolNames.has(options.detailTool)) {
    try {
      const detailed = options.requireKnownDetailTool
        ? await runtime.client.callTool(options.detailTool, options.detailArgs)
        : await callAvailableTool(runtime, [options.detailTool], options.detailArgs);
      const data = extractData(detailed);
      if (isBlankDetail(data, options.identityFields)) {
        if (!options.fallbackOnBlankDetail || !(await hasListTool())) return null;
      } else if (options.detailMatches && !options.detailMatches(data)) {
        if (!(await hasListTool())) return null;
      } else {
        return detailResult(data, options);
      }
    } catch (error) {
      if (!isUnknownToolError(error)) throw error;
    }
  }

  const listed = await runtime.client.callTool(options.listTool, options.listArgs);
  const match = asArray(extractData(listed)).find(options.matches);
  if (!match) return null;
  const refetched = await refetchDetailById(runtime, options, match, knownToolNames);
  return refetched ? detailResult(refetched, options) : markUnverified(match);
}

async function refetchDetailById(runtime, options, match, knownToolNames) {
  const id = typeof match.id === "string" ? match.id.trim() : "";
  if (!id) return null;
  const known = knownToolNames ? knownToolNames.has(options.detailTool) : await hasTool(runtime, options.detailTool);
  if (!known) return null;
  try {
    const data = extractData(await runtime.client.callTool(options.detailTool, {
      ...options.detailArgs,
      [options.detailIdKey ?? "id"]: id,
    }));
    if (isBlankDetail(data, options.identityFields) || !identityMatches(data, id)) return null;
    return data;
  } catch {
    return null;
  }
}

function identityMatches(detail, id) {
  const target = id.toLocaleLowerCase();
  return [detail?.id, detail?.slugId].some((value) => String(value ?? "").trim().toLocaleLowerCase() === target);
}

function markUnverified(detail) {
  if (!detail || typeof detail !== "object") return detail;
  return Object.defineProperty({ ...detail }, UNVERIFIED_DETAIL, { value: true });
}

export function isUnverifiedDetail(detail) {
  return Boolean(detail && typeof detail === "object" && detail[UNVERIFIED_DETAIL]);
}

function detailResult(detail, options) {
  return options.transform ? options.transform(detail) : detail;
}

export async function ensureDocumentExists(id, runtime) {
  return requireExistingDetail(getDocumentDetail(id, runtime), "document", id, [
    `Run \`linear-axi documents list --query ${formatCommandArg(id)} --fields id,title,updatedAt\` to search for the document`,
    'Run `linear-axi documents create --title "Spec" --team "<team>"` to create a new document',
  ]);
}

async function requireExistingDetail(detailPromise, resource, id, help) {
  const detail = await detailPromise;
  if (!detail) throw notFound(resource, id, help);
  return detail;
}

export async function ensureMilestoneExists(project, id, runtime) {
  const result = await runtime.client.callTool("get_milestone", { project, query: id });
  const milestone = extractData(result);
  if (!milestone || isEmptyContainer(milestone)) {
    throw notFound("milestone", id, [
      `Run \`linear-axi milestones list --project ${formatCommandArg(project)}\` to find the milestone id`,
      `Run \`linear-axi milestones create --project ${formatCommandArg(project)} --name "<name>"\` to create a new milestone`,
    ]);
  }
  return milestone;
}

export function rejectUnsupportedCommentFlags(parsed) {
  const unsupported = ["issueId", "project", "projectId", "initiative", "initiativeId", "document", "documentId", "milestone", "milestoneId", "parentId"]
    .find((name) => parsed[name] !== undefined);
  if (unsupported) {
    throw usage(`--${unsupported} is not supported for comments`, [
      "Run `linear-axi comments list --issue LIN-123`",
      'Run `linear-axi comments create --issue LIN-123 --body "Ready"`',
    ]);
  }
}

export function normalizeError(error) {
  if (error instanceof AxiError) return error;
  if (error?.authorizationUrl) {
    return new AxiError("operational", "Linear MCP OAuth authorization required", [
      "Run `linear-axi auth login`",
      "Open the authorization URL and finish with `linear-axi auth finish --code <code>`",
    ]);
  }
  return new AxiError("operational", mcpErrorMessage(error), [
    "Run `linear-axi issues list --assignee me` to verify Linear access",
    "Run `linear-axi auth login` to authorize the default Linear MCP endpoint",
  ]);
}

export function notFound(resource, id, help = []) {
  return new AxiError("not_found", `${resource} not found: ${id}`, help);
}

export function mcpErrorMessage(error) {
  if (error?.authorizationUrl) {
    return "Linear MCP OAuth authorization required";
  }
  const message = error && typeof error.message === "string" ? error.message : String(error);
  if (/unauthorized|401|invalid_token|access token/i.test(message)) {
    return "Linear MCP authentication failed";
  }
  return message;
}

export async function workspaceName(cwd) {
  const root = await findGitRoot(cwd);
  return basename(root ?? resolve(cwd));
}

function isEmptyContainer(value) {
  return value && typeof value === "object" && Object.keys(value).length === 0;
}

function isBlankDetail(value, identityFields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return identityFields.every((field) => !hasText(value[field]));
}

function hasText(value) {
  return String(value ?? "").trim() !== "";
}
