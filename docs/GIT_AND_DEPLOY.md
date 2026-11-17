# Git and deployment

The project is now a git repository (`main`, three commits, tag `v0.1.0`). This file records what
is in it and how to move it to GitHub, Vercel and OpenBot.

## What the repository contains

| Path | What it is | Rebuild with |
| --- | --- | --- |
| `index.html` | standalone prototype (images and cutout embedded) | `python3 build.py` |
| `events-tab-source.html` | only the Special Events cards | `python3 build.py` |
| `SOURCE_COPY.md`, `UPGRADE_PLAN.md`, `content-inventory.json` | extraction, plan, machine-readable inventory | `python3 build.py` |
| `assets/`, `source/` | normalised stills, wallpaper, cutout, official posters, received brief, map notes | `python3 build.py` |
| `openbot/` | the concierge as an AG-UI bot with tests, Dockerfile, client | `npm test` / `npm run dev` |
| `board/` | the Agent Games 2026 task board: source HTML, extracted model, live state, activity log | `node board/scripts/extract-board.mjs` |
| `openbot/kb/knowledge.json` | venue knowledge base | `node openbot/scripts/build-kb.mjs` |
| `docs/` | this file and the OpenBot integration notes | — |

`Exploratorium_Events_UI_bundle.zip` is a build artefact and is git-ignored; `python3 build.py`
recreates it.

```bash
python3 build.py                                  # regenerate prototype + docs + zip
node board/scripts/extract-board.mjs --check      # fail if the board extraction is stale
cd openbot && npm test && npm run dev             # bot tests, then the live service
```

## Pushing to GitHub

**Target repository:** <https://github.com/rafia22110/maestro-ai-agent-games-2026.git> (branch `main`).

This sandbox has no GitHub credential: Arena has no GitHub connector, there is no `gh` CLI, no SSH
key and no token in the environment, and the repository answers **404 to anonymous requests**, which
means it is private (or not created yet). So the commits exist locally plus in a transportable
bundle, and publication is one command.

**One command, with a token that is never stored:**

```bash
cd exploratorium-events-ui
GITHUB_TOKEN=github_pat_xxx ./scripts/push-to-github.sh --dry-run   # what would be pushed
GITHUB_TOKEN=github_pat_xxx ./scripts/push-to-github.sh             # pushes main + all tags
```

The token needs *Contents: read and write* on that single repository (fine-grained token). The
script passes it inline with `credential.helper=` disabled, so it never lands in `.git/config`,
the shell history or the reflog, and it leaves a token-free `origin` behind.

Without a token, two alternatives:

**A. From the bundle (keeps every commit and tag)**

```bash
# 1. Create an empty repository on GitHub, then:
git clone /path/to/exploratorium-events-ui.bundle exploratorium-events-ui
cd exploratorium-events-ui
git remote add origin git@github.com:<owner>/exploratorium-events-ui.git
git push -u origin main --tags
```

**B. From a checkout of the target repository (GitHub Desktop, VS Code or the web UI)**

Download `25 — git repository bundle v0.2.0.bundle` from the Drive folder, then:

```bash
git clone /path/to/exploratorium-events-ui-v0.2.0.bundle maestro-ai-agent-games-2026
cd maestro-ai-agent-games-2026
git remote add origin https://github.com/rafia22110/maestro-ai-agent-games-2026.git
git push -u origin main --tags
```

Use a fine-grained token scoped to that one repository, and revoke it afterwards — never commit a
token, and never put one in a file in this repository.

If the repository should instead be a **fork of OpenBot** with this bot inside it, clone
`CopilotKit/OpenBot`, copy `openbot/` into it, and follow `docs/OPENBOT_INTEGRATION.md` — the bot
needs no changes to run there, because AG-UI is the contract.

## Vercel

The prototype is a single static file, and the bot is a Node HTTP service. They deploy separately:

| Target | Setting | Notes |
| --- | --- | --- |
| Prototype (static) | Framework preset **Other**, output `index.html`, no build command | 1.7 MB single file; images are data URIs, so no asset pipeline is needed |
| Bot API | Serverless function that wraps `openbot/src/server.mjs` | The AG-UI stream needs a streaming-capable runtime; keep `STREAM_DELAY_MS=0` and set `ALLOWED_ORIGIN` to the prototype's domain |

Exact deploy: connect the GitHub repository to a Vercel project (static preset) for the page, and
deploy `openbot/` as a separate service (Fly, Railway, Cloud Run or a Vercel function) for `/agui`.
Set `EXPLORATORIUM_STATIC=1` wherever you want one origin to serve both, which removes CORS
entirely.

## Before anything is public

- Replace the derived imagery with licensed originals and credit them.
- Keep the guardrails: no pricing, no availability, official inquiry form as the conversion path.
- Put authentication in front of `/agui`; the bot is read-only but it represents the venue.
- Re-extract `content-inventory.json` when the Exploratorium publishes next year's rentals pages.
