import { formatCommandArg } from "./cli-helpers.js";
import { asArray } from "./mcp-tools.js";

const FIELD_HINTS = {
  issues: "id,title,state,assignee",
  documents: "id,title,updatedAt",
  projects: "id,name,status",
  teams: "id,name,key",
  users: "id,name,email",
};

const STATUS_RANKS = {
  "in progress": 0,
  started: 0,
  planned: 1,
  todo: 1,
  "to do": 1,
  backlog: 2,
};
const ISSUE_RELATION_FIELDS = ["blocks", "blockedBy", "relatedTo", "duplicateOf"];

export function compactRows(alias, data) {
  if (alias === "issues") return compactIssues(data);
  if (alias === "projects") return compactProjects(data);
  return asArray(data).map((item) => ({
    id: item.id ?? item.identifier ?? item.key ?? item.slug ?? item.name ?? "",
    name: item.name ?? item.title ?? item.displayName ?? item.email ?? "",
    state: rowState(item),
  }));
}

export function parseFields(fields) {
  return fields.split(",").map((field) => field.trim()).filter(Boolean);
}

export function fieldHint(publicName) {
  return FIELD_HINTS[publicName] ?? "id,name,state";
}

export function selectFields(items, fields) {
  return items.map((item) => Object.fromEntries(fields.map((field) => [field, fieldValue(item, field)])));
}

export function paginationInfo(data, rowCount) {
  const total = data?.totalCount ?? data?.total ?? data?.pageInfo?.totalCount;
  const hasNextPageValue = data?.hasNextPage ?? data?.pageInfo?.hasNextPage;
  const cursor = data?.cursor ?? data?.nextCursor ?? data?.pageInfo?.endCursor;
  const hasCursor = cursor !== undefined && cursor !== null && cursor !== "";
  const hasNextPage = hasNextPageValue === undefined ? hasCursor : Boolean(hasNextPageValue);
  return {
    count: typeof total === "number"
      ? `${rowCount} of ${total} total`
      : `${rowCount} returned${hasNextPage ? " (more available)" : ""}`,
    cursor: hasNextPage ? cursor : undefined,
  };
}

export function compactComment(comment) {
  const body = formattedPreview(comment.body ?? "", 120);
  return {
    id: comment.id ?? "",
    author: comment.user?.name ?? comment.author?.name ?? "",
    created: comment.createdAt ?? "",
    body: body.text,
    truncated: body.truncated,
  };
}

export function compactIssues(data) {
  return groupByStatusPriority(asArray(data).map((issue) => ({
    state: rowState(issue),
    title: issue.title ?? "",
    assignee: personName(issue.assignee),
    id: issue.identifier ?? issue.id ?? "",
  })));
}

function compactProjects(data) {
  return groupByStatusPriority(asArray(data).map((project) => ({
    status: projectStatus(project),
    name: project.name ?? project.title ?? "",
    id: project.id ?? project.identifier ?? "",
  })));
}

export function compactIssueDetail(issue) {
  const description = String(issue.description ?? issue.body ?? "");
  const preview = formattedPreview(description, 1000);
  return {
    truncated: preview.truncated,
    issue: {
      id: issue.identifier ?? issue.id ?? "",
      title: issue.title ?? "",
      state: issueState(issue),
      assignee: personName(issue.assignee),
      description: preview.text,
      url: issue.url ?? "",
      ...(issue.relations !== undefined ? { relations: compactIssueRelations(issue.relations) } : {}),
    },
  };
}

export function compactIssueMutation(issue) {
  return {
    id: issue.identifier ?? issue.id ?? "",
    title: issue.title ?? "",
    state: issueState(issue),
    project: namedValue(issue.project),
    team: namedValue(issue.team),
    url: issue.url ?? "",
  };
}

export function compactProjectMutation(project) {
  return {
    id: project.id ?? "",
    name: project.name ?? "",
    status: projectStatus(project),
    team: project.team?.name ?? project.teams?.[0]?.name ?? project.team ?? "",
    url: project.url ?? "",
  };
}

export function compactLabelMutation(label) {
  return {
    id: label.id ?? "",
    name: label.name ?? "",
    color: label.color ?? "",
    team: namedValue(label.team),
    parent: namedValue(label.parent),
  };
}

export function compactDocumentMutation(document) {
  return {
    id: document.id ?? "",
    title: document.title ?? document.name ?? "",
    team: namedValue(document.team),
    project: namedValue(document.project),
    url: document.url ?? "",
  };
}

export function compactDocumentDetail(document, id) {
  const content = rewriteMcpHints(String(document.content ?? document.body ?? ""), id);
  const preview = formattedPreview(content, 1200);
  return {
    truncated: preview.truncated,
    document: {
      id: document.id ?? id ?? "",
      title: document.title ?? document.name ?? "",
      content: preview.text,
      team: namedValue(document.team),
      project: namedValue(document.project),
      url: document.url ?? "",
    },
  };
}

export function sanitizeDocument(document, id) {
  if (!document || typeof document !== "object") return document;
  return {
    ...document,
    content: document.content === undefined ? document.content : rewriteMcpHints(String(document.content), id ?? document.id),
  };
}

function fieldValue(item, field) {
  const value = field.split(".").reduce((current, part) => current?.[part], item);
  if (value === undefined) return "";
  if (value === null) return null;
  if (typeof value === "object") {
    return value.name ?? value.displayName ?? value.identifier ?? value.id ?? JSON.stringify(value);
  }
  return value;
}

function rowState(item) {
  return item.state?.name ?? item.status?.name ?? item.state ?? item.status ?? "";
}

function issueState(issue) {
  return issue.state?.name ?? issue.status ?? issue.state ?? "";
}

function projectStatus(project) {
  return project.status?.name ?? project.state?.name ?? project.status ?? project.state ?? "";
}

function personName(person) {
  return person?.name ?? person?.displayName ?? person ?? "";
}

function namedValue(value) {
  return value?.name ?? value ?? "";
}

function compactIssueRelations(relations) {
  if (!relations || typeof relations !== "object") return relations;
  return Object.fromEntries(
    ISSUE_RELATION_FIELDS
      .filter((field) => Object.hasOwn(relations, field))
      .map((field) => [field, compactRelationValue(relations[field])]),
  );
}

function compactRelationValue(value) {
  if (Array.isArray(value)) return value.map(compactRelationValue);
  if (!value || typeof value !== "object") return value;
  const issue = value.issue ?? value;
  const id = issue.identifier ?? issue.id ?? issue.key ?? issue.title ?? JSON.stringify(value);
  const status = relationStatus(issue);
  if (status === undefined) return id;
  return {
    id,
    ...(issue.title !== undefined ? { title: issue.title } : {}),
    status,
  };
}

function relationStatus(issue) {
  return issue?.status?.name ?? issue?.status ?? issue?.state?.name ?? issue?.state;
}

function groupByStatusPriority(items) {
  return items.sort((left, right) => {
    const leftStatus = statusLabel(left.status ?? left.state);
    const rightStatus = statusLabel(right.status ?? right.state);
    const rankDifference = (STATUS_RANKS[leftStatus] ?? 3) - (STATUS_RANKS[rightStatus] ?? 3);
    return rankDifference || leftStatus.localeCompare(rightStatus);
  });
}

function statusLabel(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formattedPreview(value, limit) {
  const text = String(value ?? "");
  if (text.length <= limit) return { text, truncated: false };
  return {
    text: `${text.slice(0, limit)}... (truncated, ${text.length} chars total)`,
    truncated: true,
  };
}

function rewriteMcpHints(text, id) {
  const hintId = id ? formatCommandArg(id) : "<id>";
  return text.replace(/use `get_document`/g, `run \`linear-axi documents view ${hintId} --full\``);
}
