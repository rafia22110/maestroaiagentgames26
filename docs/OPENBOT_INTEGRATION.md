# Integrating the Exploratorium bot with OpenBot

This document explains what was integrated, why the bot is shaped the way it is, and how to move
it from this repository into a running [OpenBot](https://github.com/CopilotKit/OpenBot)
workspace. It follows OpenBot's own vocabulary, so the same words mean the same things on both
sides.

> Verified against `CopilotKit/OpenBot` `main` on 2026-11-17 (1,266 commits, apps 3010 / API 3001 /
> agent-computer 4100 / supervisor 4500 / PostgreSQL 5432). OpenBot is an MIT-licensed **template**,
> not a hosted product: you clone it, run it, and keep your own data and model keys.

## 1. What OpenBot actually gives the bot

OpenBot has three parts. Only the first matters for this repository:

| Part | What it is | What we use |
| --- | --- | --- |
| **Frontends** | React/Vite app on `:3010`, plus desktop, mobile, Slack and Teams surfaces | A place to talk to the concierge with approvals, screen view and history |
| **Backend** | Hono API on `:3001`: workspace API, built-in Bots, gateway, policy, audit, credentials, components | The gateway that decides and records every tool call |
| **CopilotKit Intelligence** | Durable threads, memory, learning — separately licensed, runs alongside | Optional: conversation memory for repeat planners |

The one protocol that matters is **AG-UI**: a Bot is *any* endpoint that speaks it. That is why the
integration here is a small AG-UI server (`openbot/src/agui.mjs`) rather than an OpenBot fork.
Nothing in OpenBot has to change, and nothing in this repository depends on OpenBot being installed.

## 2. The three ways to wire it, and the one chosen

| Option | What it means | Trade-off |
| --- | --- | --- |
| **A. Register as an AG-UI Bot** (chosen) | OpenBot's `/bots` page stores the endpoint `POST /agui`; each turn is an AG-UI run; tools are refused or allowed through OpenBot's gateway and written to audit | Zero coupling: the same bot runs standalone, on Vercel, or from a Docker image; the repo stays a static prototype plus one service |
| B. Run inside OpenBot's server | Port the brain into OpenBot's built-in Bot harness (`agent-langgraph-agui`) | Gets OpenBot's memory and approvals for free, but drags in PostgreSQL, Intelligence licensing and a much heavier deployment for a prototype |
| C. Fork the front end | Copy the glass UI into `app/src/components/gallery/` as a published component so the bot can render it | Worth doing later for the brief card; wrong first step because it ties the design to one deployment |

Option A is also the only one that survives the real constraint in this project: the prototype must
keep working as a **single standalone HTML file** with no server at all.

## 3. What is in the repository now

```
openbot/                     AG-UI bot: brain, tools, SSE transport, HTTP server, tests, Docker
openbot/kb/knowledge.json     venue/capacity/media/document knowledge base
openbot/scripts/build-kb.mjs  generator: content-inventory.json -> knowledge.json
openbot/web/concierge-client.js  AG-UI client for any frontend
index.html                   prototype; its Maestro panel streams from /agui when one is present
docs/OPENBOT_INTEGRATION.md   this file
```

The prototype's bridge is deliberately forgiving: on load it probes `GET /healthz`. If the bot
answers, the chip reads **● live AG-UI** and typed questions stream from the real endpoint —
stage events animate the same six nodes, `artifact.brief` fills the conference builder result, and
`artifact.citations` renders the source links. If the probe fails (file://, offline, no service),
the scripted six-step simulation answers instead, so the demo never breaks.

## 4. Bot definition

| Field | Value |
| --- | --- |
| Name | Pier 15 Concierge |
| Role | Exploratorium event rentals concierge: venue matching, conference briefs, galleries, official handoff |
| AG-UI endpoint | `http://host.docker.internal:8787/agui` (Docker) · `http://localhost:8787/agui` (host) |
| Authorization header | none by default — terminate auth in front of it and let OpenBot store the header write-only |
| Visibility | private while the content and photography rights are unresolved |
| Computer | not required. The bot is read-only over its own KB: no browser, no files, no shell |
| Model | none in this build. The brain is deterministic; see §7 to add one |

### Tools (all read-only)

| Tool | Input | Returns |
| --- | --- | --- |
| `match_venue` | `guests`, `format`, `event_type`, `preferences[]` | ranked shortlist with fit, headroom and the capacity notice |
| `get_venue` | `venueId` | square footage, seated/standing, description, map zone, source page, documents |
| `list_event_types` | `category?` | the five event programmes |
| `search_media` | `category`, `limit` | gallery tiles with captions and source URLs |
| `draft_brief` | `guests`, `format`, `goal` | anchor space, runners-up, day flow, open questions, handoff |
| `contact_paths` | — | phone, email, inquiry form, documents |

`callTool` throws `tool_not_granted` for anything else. In OpenBot this is belt and braces: the
gateway refuses unknown tools too, and records the refusal.

## 5. Policy and audit

OpenBot's rule is that no action happens without a decision recorded first. Map it as follows:

| Surface | Setting for this bot |
| --- | --- |
| `/admin/boundaries` | browser actions **deny all**, file actions **deny all**, shell **deny all**, MCP `allow` only `GET`-shaped read tools if you add any |
| `/admin/plugins` | add MCP servers only when the bot needs a CMS or CRM; grant per tool |
| `/admin/components` | publish a `venue-brief` card if you want the brief rendered natively; grant its data function separately |
| `/admin/audit` | expect `match_venue`, `draft_brief`, `search_media` rows, plus `run_started` / `run_finished` from this service's JSON logs |

The service writes one JSON line per event to stdout (`run_started`, `tool_call`, `run_finished`,
`brief_export`, `inquiry_recorded`, `request_error`, `shutdown`). Ship stdout to the same log sink
as OpenBot and a planner conversation can be reconstructed end to end without this service keeping
any state.

## 6. Grounding, and what the bot must never say

| Must | Why |
| --- | --- |
| Cite the venue page, the 2026 map or a brochure for every factual claim | The source pages say capacities are **subject to change**; a citation makes the claim checkable |
| Say it cannot quote price or confirm a date | Pricing, availability, catering approval and COI approval belong to the Events Team |
| End every answer at `https://www.exploratorium.edu/rentals/form` | The form is the only conversion path that can produce a proposal |
| Answer in the language it was asked in (EN/HE) | The Maestro brief is Hebrew; planners switch languages mid-thread |

`npm test` fails if any of these regress.

## 7. Adding a model later

`brain.mjs` is a deterministic replacement for an LLM turn, deliberately kept to the same shape:

1. `detectIntent` → what the planner wants.
2. `calls` → the tool plan, executed through `callTool`.
3. `compose` → prose built **only** from tool results.

To put a model in the loop, keep steps 2 and 3 and let the model emit the plan (tool name + args)
and the prose. Give it `TOOL_DEFINITIONS` as its tool schema, run the calls through `callTool`, and
pass the JSON results back for the wording. Never let it answer from its own knowledge: the
grounding tests read the composed text, so a hallucinated capacity fails CI.

## 8. Deployment checklist

- [x] Bot runs with zero dependencies on Node 20 (`node src/server.mjs`).
- [x] `Dockerfile` runs the test suite during build.
- [x] AG-UI stream validated against the protocol's event names (`@ag-ui/core` 1.0.4).
- [x] CORS origin is a single env var; `EXPLORATORIUM_STATIC=1` removes the need for it entirely.
- [ ] Put authentication in front of `/agui` before sharing the URL (OAuth2 proxy, Cloudflare
      Access, or an OpenBot-issued header).
- [ ] Replace `POST /api/inquiries` with a real CRM or email handoff; today it only records intent.
- [ ] Rights review for the 31 stills and the official reel before public hosting.
- [ ] Confirm the venue facts against the current year's pages: `content-inventory.json` is a
      2026 extraction.

## 9. Why not just paste the bot into OpenBot?

Because the deliverables are different. OpenBot's value is governance — sign-in, permissions,
approvals, audit — for a team of people using many agents. This project's value is a **specific
venue experience**: an extracted events tab, a designed UI, and a concierge that knows which of six
rooms fits 250 people in theatre format. Keeping the bot as an AG-UI endpoint lets both sides keep
their value and replace neither.
