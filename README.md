# linear-axi

`linear-axi` is a community-maintained fork of [AnonymousMorris/linear-axi](https://github.com/AnonymousMorris/linear-axi). It lets coding agents work with Linear more easily than an MCP server by re-exporting the same functionality behind a new interface designed with care.

The fork is published as [`@escidmore/linear-axi`](https://www.npmjs.com/package/@escidmore/linear-axi); the installed executable remains `linear-axi`.

[![Check](https://github.com/escidmore/linear-axi/actions/workflows/check.yml/badge.svg)](https://github.com/escidmore/linear-axi/actions/workflows/check.yml)

The project follows the [AXI](https://axi.md/) pattern: an Agent eXperience. 

![terminal demo](docs/demo.gif)

## Install

Run the CLI without installing it globally:

```sh
npx -y @escidmore/linear-axi --help
```

Or install it as a global command:

```sh
npm install -g @escidmore/linear-axi
linear-axi --help
```

Agents that support [Agent Skills](https://agentskills.io) can also install the linear-axi skill with the [Vercel skill installer](https://github.com/vercel-labs/skills):

```sh
npx skills add escidmore/linear-axi -g
```

That is enough for agents that support skills. The skill teaches the agent to run `linear-axi` through `npx -y @escidmore/linear-axi`, so the CLI is resolved on demand. You still need access to a Linear MCP endpoint. The default endpoint uses OAuth; run `npx -y @escidmore/linear-axi auth login` when authorization is needed, or use the manual flow documented below for headless environments.

`-g` installs the skill globally. Drop `-g` to install it only for the current project.

To install the skill from a local checkout, run:

```sh
npx skills add . -g
```

To install the CLI directly from a checkout:

```sh
npm install
npm link
```

`linear-axi` requires Node.js 20 or newer.

## Releasing

The `@escidmore/linear-axi` package is published by GitHub Actions when a `v*` tag is pushed. For the first release, add a short-lived npm publish token as the `NPM_BOOTSTRAP_TOKEN` repository secret; the workflow uses it only while the package is being created. Then configure npm Trusted Publishing for the `escidmore/linear-axi` repository and the `.github/workflows/publish.yml` workflow, remove `NPM_BOOTSTRAP_TOKEN`, and use the OIDC-only path for subsequent releases:

For the initial fork release:

```sh
git tag v0.2.0
git push origin v0.2.0
```

For subsequent releases:

```sh
npm version patch
git push origin main --follow-tags
```

## Configuration

By default, the CLI reads the Linear MCP URL from `[mcp_servers.linear].url` in `~/.codex/config.toml` and falls back to `https://mcp.linear.app/mcp` (current official remote MCP by linear).

The default remote Linear MCP endpoint uses OAuth. Run `linear-axi auth login`, open the returned URL, and the CLI will capture the localhost callback and save tokens automatically. 

In a headless environment, run `linear-axi auth login --manual`, open the URL, copy the `code` from the failed localhost redirect, then finish with `linear-axi auth finish --code <code>`. Run `linear-axi auth logout` to remove the saved OAuth state; it is safe to rerun and does not unset bearer-token environment variables. Set `LINEAR_AXI_MCP_URL` to use a different MCP endpoint, or `CODEX_CONFIG` to read the URL from another Codex config file. Set `LINEAR_AXI_MCP_TOKEN` or `LINEAR_MCP_TOKEN` only when your endpoint expects a bearer token. Set `LINEAR_AXI_AUTH_FILE` to store OAuth state somewhere other than `${XDG_CONFIG_HOME:-~/.config}/linear-axi/oauth.json`.

## Project setup

We store a `.linear-project` file to avoid having every new agent rediscover which Linear project the current coding project is for. Run this once from a Git repository to bind the repo to its Linear project by id, name, or slug:

```sh
linear-axi init --project "Roadmap"
```

## Commands

The CLI is organized as `linear-axi <resource> <action>`. Each action forwards to the matching Linear MCP tool and formats the result for agents. Run `linear-axi --help` for commands or `linear-axi <resource> <action> --help` for flags.

```sh
linear-axi init --project "Roadmap"
linear-axi issues list --assignee me --limit 25
linear-axi issues list --assignee me --all-projects
linear-axi issues view LIN-123 --full
linear-axi issues create --title "Fix auth" --team ENG --project "Roadmap"
linear-axi issues update --id LIN-123 --state Done
linear-axi projects list --query roadmap
```

## Output behavior

Output uses [TOON](https://toonformat.dev/) so agents can parse compact structured results. The default dashboard shows setup hints until the current Git repo is bound to a Linear project, then shows the configured project and assigned-issue count. Lists include pagination hints, detail commands return one item, and structured errors include recovery commands.

If the saved project is not found in the authenticated workspace, project-scoped commands fail with `VALIDATION_ERROR` and suggest replacing `.linear-project`.

## Development

`src/cli.js` is the runtime/router layer. It delegates top-level CLI behavior to `axi-sdk-js` while keeping one Linear command registry shared by the SDK entrypoint and the testable dispatcher. Resource command handlers live in `src/commands/`, with shared command behavior in `src/commands/shared.js` and lower-level formatting, MCP, argument, and repo-project helpers in `src/lib/`.

```sh
npm test
npm run check
npm run demo
```

The npm package includes the installable `skills/linear-axi/SKILL.md` documented in Install.

GitHub Actions runs `npm run check` on pushes and pull requests through `.github/workflows/check.yml`.

`npm run demo` renders `docs/demo.webm` from `docs/demo.tape` using [VHS](https://github.com/charmbracelet/vhs). WebM keeps the demo high resolution while using much less memory than GIF during generation. The tape uses the local executable path, so it can be regenerated from a checkout without installing `linear-axi` globally.
