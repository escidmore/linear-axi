import { parseFlags, usage } from "../args.js";
import { renderToon } from "../format.js";
import { collectKnownArgs, dispatchCommandGroup, rejectIdOnCreate, requireValue } from "../lib/cli-helpers.js";
import { compactLabelMutation } from "../lib/linear-format.js";
import { callAvailableTool, mutationData } from "../lib/mcp-tools.js";
import {
  groupHelp,
  labelCreateHelp,
  labelDeleteHelp,
  labelUpdateHelp,
} from "./help.js";
import { aliasListCommand } from "./list-resource.js";
import { renderMutation } from "./shared.js";

const LABEL_MUTATION_FIELDS = ["id", "name", "color", "description", "parent", "isGroup", "team", "teamId"];
const LABEL_CREATE_HELP = ['Run `linear-axi labels create --name "Bug" --team "<team>"`'];
const LABEL_UPDATE_HELP = [
  'Run `linear-axi labels update --id <id> --name "Bug"`',
  "Run `linear-axi labels list --team <team>` to find the label id",
];
const LABEL_DELETE_HELP = [
  "Run `linear-axi labels delete --id <id>`",
  "Run `linear-axi labels list --team <team>` to find the label id",
];
const LABEL_ID_ON_CREATE_HELP = [
  'Run `linear-axi labels create --name "Bug" --team "<team>"`',
  'Run `linear-axi labels update --id <id> --name "Bug"` to rename an existing label',
];

export async function labelCommand(args, runtime) {
  return dispatchCommandGroup(args, {
    name: "labels",
    help: () => groupHelp("labels", ["list", "create", "update", "delete"]),
    handlers: {
      list: (rest) => aliasListCommand("labels", rest, runtime),
      create: (rest) => createLabelCommand(rest, runtime),
      update: (rest) => updateLabelCommand(rest, runtime),
      delete: (rest) => deleteLabelCommand(rest, runtime),
    },
    unknownHelp: [
      "Run `linear-axi labels list`",
      'Run `linear-axi labels create --name "Bug" --team "<team>"`',
      "Run `linear-axi labels delete --id <id>`",
    ],
  });
}

async function createLabelCommand(args, runtime) {
  const parsed = parseFlags(args, { boolean: ["help", "isGroup"], example: 'labels create --name "Bug" --team ENG' });
  if (parsed.help) return labelCreateHelp();
  rejectIdOnCreate("label", LABEL_ID_ON_CREATE_HELP, parsed);
  rejectUnknownLabelInput(parsed, LABEL_MUTATION_FIELDS.filter((name) => name !== "id"), LABEL_CREATE_HELP);
  const toolArgs = labelToolArgs(parsed);
  requireValue(toolArgs.name, "creating a label requires --name", LABEL_CREATE_HELP);
  return saveLabel(toolArgs, runtime, ["create_issue_label"], LABEL_CREATE_HELP);
}

async function updateLabelCommand(args, runtime) {
  const parsed = parseFlags(args, { boolean: ["help", "isGroup"], example: 'labels update --id <id> --name "Bug"' });
  if (parsed.help) return labelUpdateHelp();
  rejectUnknownLabelInput(parsed, LABEL_MUTATION_FIELDS, LABEL_UPDATE_HELP);
  const toolArgs = labelToolArgs(parsed);
  requireValue(toolArgs.id, "updating a label requires --id", LABEL_UPDATE_HELP);
  return saveLabel(toolArgs, runtime, ["update_issue_label", "save_issue_label"], LABEL_UPDATE_HELP);
}

async function deleteLabelCommand(args, runtime) {
  const parsed = parseFlags(args, { boolean: ["help"], example: "labels delete --id <id>" });
  if (parsed.help) return labelDeleteHelp();
  rejectUnknownLabelInput(parsed, ["id"], LABEL_DELETE_HELP);
  requireValue(parsed.id, "deleting a label requires --id", LABEL_DELETE_HELP);
  const result = await callAvailableTool(runtime, ["delete_issue_label"], { id: parsed.id });
  if (result?.isError) mutationData(result, LABEL_DELETE_HELP);
  return renderToon({ label: { id: parsed.id, status: "deleted" } });
}

function rejectUnknownLabelInput(parsed, acceptedFlags, help) {
  const unknownFlag = Object.keys(parsed).find((name) => name !== "positionals" && !acceptedFlags.includes(name));
  if (unknownFlag) throw usage(`unknown flag --${unknownFlag}`, help);
  if (parsed.positionals.length > 0) throw usage(`unexpected argument: ${parsed.positionals[0]}`, help);
}

function labelToolArgs(parsed) {
  const { team, ...toolArgs } = collectKnownArgs(parsed, LABEL_MUTATION_FIELDS);
  if (team !== undefined && toolArgs.teamId === undefined) toolArgs.teamId = team;
  return toolArgs;
}

async function saveLabel(toolArgs, runtime, toolNames, help) {
  return renderMutation(runtime, {
    toolNames,
    args: toolArgs,
    help,
    render: (label) => ({ label: compactLabelMutation(label) }),
  });
}
