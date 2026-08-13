import { fieldHint } from "../lib/linear-format.js";
import { DEFAULT_LIMIT, PROJECT_SCOPED_LIST_ALIASES } from "./shared.js";

export function topHelp() {
  return `usage: linear-axi [command] [args] [flags]
commands[13]:
  (none)=dashboard, init, auth, issues, projects, teams, users, comments, documents, milestones, cycles, statuses, labels
flags[3]:
  --help, -h, -v/-V/--version
examples:
  linear-axi
  linear-axi init --project "Roadmap"
  linear-axi auth login
  linear-axi issues list --assignee me --all-projects --limit 25
  linear-axi projects create --name "Roadmap" --team ENG
  linear-axi documents view <id>
  linear-axi issues update --id LIN-123 --state Done
  linear-axi issues update --id LIN-123 --blockedBy LIN-100 --blocks LIN-124
  linear-axi comments create --issue LIN-123 --body "Ready for review."
  linear-axi update --check
notes:
  issue views include relation ids, titles, and current statuses
env[5]:
  LINEAR_AXI_MCP_URL, LINEAR_AXI_MCP_TOKEN, LINEAR_MCP_TOKEN, LINEAR_AXI_AUTH_FILE, CODEX_CONFIG
`;
}

export function initHelp() {
  return `usage: linear-axi init --project <project> [--force]
description: Validate and save the current Git repository's default Linear project in .linear-project.
flags:
  --project <project>  Linear project id, name, or slug to use by default
  --force             replace an existing .linear-project value
examples:
  linear-axi init --project "Roadmap"
  linear-axi init --project p_123 --force
`;
}

export function groupHelp(name, subcommands) {
  return `usage: linear-axi ${name} <subcommand> [flags]
subcommands[${subcommands.length}]:
  ${subcommands.join(", ")}
help:
  linear-axi ${name} <subcommand> --help
`;
}

export function listAliasHelp(alias) {
  const projectScopedList = PROJECT_SCOPED_LIST_ALIASES.includes(alias);
  const projectScopeHelp = projectScopedList
    ? `  --all-projects
`
    : "";
  const projectScopeNote = projectScopedList
    ? `notes:
  issues and documents require a valid repo default project from .linear-project, --project, or --all-projects.
`
    : "";
  return `usage: linear-axi ${alias} list [filters] [--full]
flags:
  --limit <n> default ${DEFAULT_LIMIT}
  --cursor <cursor>
  --query <text>
  --name <name>
  --team <name-or-id>
  --teamId <team-id>
  --state <name-or-type>
  --assignee <user>
  --delegate <user>
  --member <user>
  --project <project>
${projectScopeHelp}  --cycle <cycle>
  --label <label>
  --parentId <issue-id>
  --priority <number>
  --createdAt <filter>
  --updatedAt <filter>
  --orderBy createdAt|updatedAt
  --includeArchived
  --includeMembers
  --includeMilestones
  --includeStages
  --includeTeams
  --fields <comma-separated-fields>
  --full
examples:
  linear-axi ${alias} list ${projectScopedList ? "--all-projects " : ""}--limit 25
  linear-axi ${alias} list --fields ${fieldHint(alias)}
  linear-axi ${alias} list --query "auth" --full
${projectScopeNote}`;
}

export function commentListHelp() {
  return `usage: linear-axi comments list --issue <id> [--full]
flags:
  --limit <n> default ${DEFAULT_LIMIT}
  --cursor <cursor>
  --orderBy createdAt|updatedAt
  --full
examples:
  linear-axi comments list --issue LIN-123
  linear-axi comments list --issue LIN-123 --full
`;
}

export function commentCreateHelp() {
  return `usage: linear-axi comments create --issue <id> (--body <text> | --body-file <path>)
examples:
  linear-axi comments create --issue LIN-123 --body "Ready for review."
`;
}

const DOCUMENT_MUTATION_FIELDS_HELP = `  --title <title>
  --team <team>
  --project <project>
  --issue <issue>
  --initiative <initiative>
  --cycle <cycle>
  --color <color>
  --icon <icon>
  --content <markdown>
  --content-file <path>
`;

export function documentCreateHelp() {
  return `usage: linear-axi documents create --title <title> [parent] [--content <markdown> | --content-file <path>]
flags:
${DOCUMENT_MUTATION_FIELDS_HELP}examples:
  linear-axi documents create --title "Spec" --team ENG --content-file spec.md
`;
}

export function documentUpdateHelp() {
  return `usage: linear-axi documents update --id <id> [fields]
flags:
  --id <id>
${DOCUMENT_MUTATION_FIELDS_HELP}examples:
  linear-axi documents update --id <id> --content "Updated"
`;
}

export function documentViewHelp() {
  return `usage: linear-axi documents view <id> [--full]
examples:
  linear-axi documents view <id>
  linear-axi documents view <id> --full
`;
}

const PROJECT_MUTATION_FIELDS_HELP = `  --name <name>
  --team <team>
  --teamId <team-id>
  --summary <text>
  --description <markdown>
  --state <state>
  --status <status>
  --lead <user>
  --startDate <yyyy-mm-dd>
  --targetDate <yyyy-mm-dd>
`;

export function projectCreateHelp() {
  return `usage: linear-axi projects create --name <name> --team <team> [fields]
flags:
${PROJECT_MUTATION_FIELDS_HELP}examples:
  linear-axi projects create --name "Roadmap" --team ENG
`;
}

export function projectUpdateHelp() {
  return `usage: linear-axi projects update --id <id> [fields]
flags:
  --id <id>
${PROJECT_MUTATION_FIELDS_HELP}examples:
  linear-axi projects update --id <id> --summary "Updated scope"
notes:
  --description replaces the whole field; run \`linear-axi projects view <id>\` first to avoid losing content.
`;
}

export function projectViewHelp() {
  return `usage: linear-axi projects view <id> [--full]
examples:
  linear-axi projects view <id>
  linear-axi projects view <id> --full
`;
}

export function milestoneListHelp() {
  return `usage: linear-axi milestones list [--project <project>] [--full]
flags:
  --project <project>  overrides the repo default project
  --full
examples:
  linear-axi milestones list
  linear-axi milestones list --project "Roadmap"
`;
}

export function milestoneViewHelp() {
  return `usage: linear-axi milestones view [--project <project>] <milestone>
flags:
  --project <project>  overrides the repo default project
examples:
  linear-axi milestones view "Beta"
  linear-axi milestones view --project "Roadmap" "Beta"
`;
}

export function milestoneCreateHelp() {
  return `usage: linear-axi milestones create [--project <project>] --name <name>
flags:
  --name <name>
  --project <project>  overrides the repo default project
  --description <markdown>
  --targetDate <yyyy-mm-dd>
examples:
  linear-axi milestones create --name "Beta"
  linear-axi milestones create --project "Roadmap" --name "Beta"
`;
}

export function milestoneUpdateHelp() {
  return `usage: linear-axi milestones update --project <project> --id <id> [fields]
flags:
  --id <id>
  --name <name>
  --project <project>  overrides the repo default project
  --description <markdown>
  --targetDate <yyyy-mm-dd>
examples:
  linear-axi milestones update --project "Roadmap" --id <id> --targetDate <yyyy-mm-dd>
`;
}

export function cycleListHelp() {
  return `usage: linear-axi cycles list --team <team> [--type current|previous|next|all] [--full]
flags:
  --team <team>
  --teamId <team-id>
  --type current|previous|next|all
  --full
examples:
  linear-axi cycles list --team ENG --type current
`;
}

export function statusListHelp() {
  return `usage: linear-axi statuses list --team <team> [--full]
flags:
  --team <team>
  --teamId <team-id>
  --type <type>
  --project <project>
  --initiative <initiative>
  --user <user>
  --limit <n>
  --cursor <cursor>
  --orderBy createdAt|updatedAt
  --createdAt <filter>
  --updatedAt <filter>
  --includeArchived
  --full
examples:
  linear-axi statuses list --team ENG
  linear-axi statuses list --team ENG --full
`;
}

const LABEL_MUTATION_FIELDS_HELP = `  --name <name>
  --color <hex>
  --description <text>
  --team <team>
  --teamId <team-id>
  --parent <label-group>
  --isGroup
`;

export function labelCreateHelp() {
  return `usage: linear-axi labels create --name <name> [fields]
flags:
${LABEL_MUTATION_FIELDS_HELP}examples:
  linear-axi labels create --name "Bug" --team ENG
  linear-axi labels create --name "Area" --isGroup
notes:
  omit --team and --teamId to create a workspace label.
`;
}

export function labelUpdateHelp() {
  return `usage: linear-axi labels update --id <id> [fields]
flags:
  --id <id>
${LABEL_MUTATION_FIELDS_HELP}examples:
  linear-axi labels update --id <id> --color "#ff0000"
`;
}

export function labelDeleteHelp() {
  return `usage: linear-axi labels delete --id <id>
flags:
  --id <id>
examples:
  linear-axi labels delete --id <id>
`;
}

export function issueViewHelp() {
  return `usage: linear-axi issues view <id> [--full]
examples:
  linear-axi issues view LIN-123
  linear-axi issues view LIN-123 --full
`;
}

const ISSUE_MUTATION_FIELDS_HELP = `  --title <title>
  --team <team>
  --state <state>
  --assignee <user>
  --project <project> (empty string for no project)
  --cycle <cycle>
  --parentId <issue-id>
  --label <label> repeatable
  --priority <number>
  --estimate <number>
  --dueDate <yyyy-mm-dd>
  --blocks <issue> repeatable (issues this blocks)
  --blockedBy <issue> repeatable (issues blocking this)
  --relatedTo <issue> repeatable
  --duplicateOf <issue>
  --description <markdown>
  --description-file <path>
`;

export function issueCreateHelp() {
  return `usage: linear-axi issues create --title <title> --team <team> [fields]
flags:
${ISSUE_MUTATION_FIELDS_HELP}examples:
  linear-axi issues create --title "Fix auth" --team ENG
  linear-axi issues create --title "Task" --team ENG --project "Roadmap"
`;
}

export function issueUpdateHelp() {
  return `usage: linear-axi issues update --id <id> [fields]
flags:
  --id <id>
${ISSUE_MUTATION_FIELDS_HELP}  --removeBlocks <issue> repeatable
  --removeBlockedBy <issue> repeatable
  --removeRelatedTo <issue> repeatable
examples:
  linear-axi issues update --id LIN-123 --state Done
  linear-axi issues update --id LIN-123 --blockedBy LIN-100 --blockedBy LIN-101
`;
}

export function authLoginHelp() {
  return `usage: linear-axi auth login [--manual] [--timeout <ms>]
flags:
  --manual print the authorization URL and exit so you can paste the code into auth finish
  --timeout <ms> default 300000
examples:
  linear-axi auth login
  linear-axi auth login --manual
`;
}

export function authFinishHelp() {
  return `usage: linear-axi auth finish --code <code>
examples:
  linear-axi auth finish --code <code>
`;
}

export function authLogoutHelp() {
  return `usage: linear-axi auth logout
description: Remove saved Linear MCP OAuth credentials without changing bearer-token environment variables.
examples:
  linear-axi auth logout
`;
}
