- **Prefer source over docs when source is available.** For third-party projects
  with public or local source, use `opensrc <project>` to inspect the actual
  implementation before relying on documentation. Treat docs as secondary
  context when source access is impractical or the project is closed-source.
- **Leave the tree clean.** Every file you create must end the task committed,
  gitignored, or deleted. Untracked leftovers become unidentifiable
  "catch-up commit" fodder. Don't say you're done if the work isn't committed.
- **Work in a leased worktree, never the main checkout.** Take one with
  `treehouse get --lease` before starting ticket work, and return it when the
  work has landed. Branching in the main checkout moves the ground under every
  other session sharing it — see **Worktrees** below.
- **Push through no-mistakes.** You should have a skill available for this
- **Definition of "done" or "implemented"** requires completion of the no-mistakes gate, up to and including a merged PR.

## Worktrees

[treehouse](https://github.com/kunchenguid/treehouse) keeps a pool of pre-warmed
git worktrees so several agents can work this repo at once. Use it instead of
`git worktree add`, and instead of branching in the main checkout.

```sh
treehouse get --lease --lease-holder ORC-<n>   # prints the worktree path, nothing else
treehouse status                               # pool state; --json to parse it
treehouse return <path> --if-lease-holder ORC-<n>
```

`--lease` is the agent-facing mode: no subshell, only the absolute path on
stdout, banners on stderr. Move your session into that path (in Claude Code,
`EnterWorktree` with `path`), and do all the work there.

A lease is durable. Until it is returned, `prune` will not reclaim the worktree
and no later `get` will hand it to another agent — so a lease you forget is a
worktree nobody else can use. Return it once the work has landed, passing
`--if-lease-holder` so you cannot release a worktree that is no longer yours.

Rules of thumb:

- One lease per ticket, labelled with the ticket id.
- A trivial one-file fix on the branch you are already on does not need a lease.
- Never `destroy` a worktree you did not lease. It is a dry run by default; keep
  it that way unless you are certain.
- The repo has no `treehouse.toml` — the pool runs on defaults. `treehouse init`
  writes one if the defaults ever stop fitting.

## CLI Tools

- Search: firecrawl
- Github: gh-axi
- Forgejo: forgejo-axi
- Linear: linear-axi
- Browser: chrome-devtools-axi
- GUI collaboration: lavish-axi

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
