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

There is no GitHub app connected to this session and no personal access token in the sandbox, so
the commits exist locally and in a transportable bundle rather than on github.com. Two ways to
publish:

**A. From the bundle (recommended — keeps the three commits and the tag)**

```bash
# 1. Create an empty repository on GitHub, then:
git clone /path/to/exploratorium-events-ui.bundle exploratorium-events-ui
cd exploratorium-events-ui
git remote add origin git@github.com:<owner>/exploratorium-events-ui.git
git push -u origin main --tags
```

**B. From this workspace, with a token**

```bash
cd exploratorium-events-ui
git remote add origin https://<token>@github.com/<owner>/exploratorium-events-ui.git
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
