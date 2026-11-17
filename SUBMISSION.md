# Submission map — Agent Games 2026

How this repository answers the five official scoring criteria, and where the evidence lives.
Weights are quoted from the board itself (`board/board.json` → `event.judging`).

| # | Criterion (official) | Weight | What we built | Where to look / how to verify |
| --- | --- | --- | --- | --- |
| 1 | **Ready for real business tomorrow morning** — real business, real data, English | 25% | The venue is real and the data is extracted from its own pages: six Pier 15 rental spaces, published capacities, the 2026 rentals map, the brochures, the contact paths. Nothing is invented, and the answer to "what would this cost" is an honest handoff rather than a guess. | `content-inventory.json`, `SOURCE_COPY.md`, `source/venue-map-extracted.txt`, `openbot/kb/knowledge.json`, `GET /api/venues` |
| 2 | **Agentic behaviour** — question → recommendation → pricing → close | 25% | A six-tool venue pipeline plus a board pipeline: `match_venue` ranks the six spaces for a guest count and format, `draft_brief` produces the day flow, citations ride every answer, and the only conversion path is the official inquiry form. Pricing is deliberately *not* generated — it is routed to the Events Team, which is what a real venue requires. | `openbot/src/tools.mjs`, `openbot/src/brain.mjs`, `openbot/test/agui.test.mjs` |
| 3 | **Design and UX** — brand fit, mobile and desktop | 20% | The standalone prototype: Netflix-style glassmorphism, animated wallpaper derived from the venue's own imagery, live mouseovers, rotating media wall, a 3D glass cube with the logo as a background-free cutout, an interactive floor-plan map, and a conference builder. One file, no CDN, works offline and as a download. | `index.html`, `build.py`, `UPGRADE_PLAN.md` (§4 design system, Pinterest mapping) |
| 4 | **Use of platform capabilities** — search, skills, agents, voice | 15% | The bot is an **AG-UI** service, so it plugs into CopilotKit OpenBot as a Bot with no fork: tool declarations, streamed steps, custom artefacts, shared state. The board is a second agent surface (read + approval-gated write). The browser client is reusable by any frontend. | `openbot/src/agui.mjs`, `openbot/web/concierge-client.js`, `docs/OPENBOT_INTEGRATION.md` |
| 5 | **Reliability and safety** — no dead ends, accurate prices and policy | 15% | Guardrails are enforced by tests, not by good intentions: no price or date is ever invented, every answer ends at the official form, capacities are cited and flagged "subject to change", unknown tools and unknown task ids are refused, and board writes are off unless explicitly enabled. | `openbot/test/` — 18 tests, incl. "pricing and availability are refused, never invented" |

## Submission gate — the six mandatory conditions

`GET /api/board` reports them live; `board/board.json` holds the source list.

| # | Condition | State in this repository |
| --- | --- | --- |
| 1 | Published working agent | Bot service runs with `npm run dev`; `POST /agui` streams. Public hosting still pending. |
| 2 | Demo video 30–90 s | Script and beat sheet exist in the board; recording still pending. |
| 3 | Public post on X or LinkedIn | Pending (board task `s3`/post). |
| 4 | 3–5 sentence English summary | Drafted in this file and `README.md`; needs a final pass. |
| 5 | Consent checkbox | To be ticked at submission. |
| 6 | "Built for Agent Games" badge live | Pending — must stay until 10 December 2026. |

The bot is honest about this: ask it *"show me the submission gate"* and it reports 0/6 with the
conditions listed, rather than claiming the work is ready.

## Demo path (60–75 seconds)

1. Open `index.html` — the glass venue world, rails, media wall.
2. Ask the Maestro panel *"conference for 250 guests, theatre style"* — watch the six stage nodes
   animate, then the answer with its citations and the Bechtel Central anchor.
3. Ask *"what is left on the board?"* — the same bot switches to the projection board, 2/28 done,
   gate 0/6, next critical action.
4. Ask *"mark b2 as done"* — it returns a proposal, not a write: the governance beat.
5. Close on the handoff: `exploratorium.edu/rentals/form`, `415.528.4500`.

## What is deliberately *not* claimed

- No pricing is generated; the board's venue intelligence mentions published ranges and the bot does
  not restate them as quotes.
- No live availability.
- No claim that the Exploratorium endorses this project; the imagery and marks belong to their owners
  and are used for a design adaptation.
- The board's venue notes are the board's claim; venue facts come from `kb/knowledge.json`.

## Repository map

```
index.html                 the standalone prototype (also the demo)
openbot/                   AG-UI bot: brain, 11 tools, board wiring, server, tests, Docker
board/                     task board: source HTML, extracted model, live state, activity log
docs/                      OPENBOT_INTEGRATION.md, GIT_AND_DEPLOY.md
SOURCE_COPY.md             exact text extracted from the venue's rentals pages
UPGRADE_PLAN.md            information architecture, design system, roadmap
content-inventory.json     machine-readable extraction behind both the UI and the bot
scripts/push-to-github.sh  one-command push to the repository remote
```
