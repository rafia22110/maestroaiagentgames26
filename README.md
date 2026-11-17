# maestro-ai-agent-games-2026

**Agent Games 2026 · Wedding Venues track (`tthezgqmvrrh`) · The Exploratorium, Pier 15, San Francisco.**

One repository, four surfaces that work together: the **Maestro AI app** that was already here, an
**events-OS prototype** built from the venue's own rentals pages, the **concierge bot** that answers
from the extracted venue data, and the **project task board**.

| Surface | Entry point | What it is |
| --- | --- | --- |
| **Maestro AI — OKF v2.5** | [`index.html`](index.html) · [`maestro-ai-standalone.html`](maestro-ai-standalone.html) | The original submission app: ontology/knowledge-framework engine, 3-level spatial journey, stakeholder micro-survey, SVG floor plan, IF-THEN operational rules, venue-config switcher (`config/`). |
| **Exploratorium Events OS** | [`events-os.html`](events-os.html) | Netflix-style glassmorphism events UI: 7 tabs, 30 sub-tab states, rotating rails, live mouseovers, animated wallpaper from the venue imagery, 3D glass cube with a background-free logo cutout, media wall, floor-plan hotspots, conference builder. One standalone file. |
| **Pier 15 Concierge bot** | [`openbot/`](openbot) · [OpenBot fork branch](https://github.com/rafia22110/OpenBot/tree/exploratorium-concierge/integrations/exploratorium-concierge) | An **AG-UI** service — 11 read-only tools over the extracted venue data plus the board, streamed steps, citations, approval-gated writes, 18 tests, Docker image. Lives here and, adapted, inside a fork of [CopilotKit OpenBot](https://github.com/CopilotKit/OpenBot) on branch `exploratorium-concierge`. |
| **Task board** | [`board/`](board) | The Agent Games planning board, extracted and versioned: 4 phases, 28 tasks, 6 submission-gate conditions, 6 compared venues, live `state.json`, append-only `activity.jsonl`. |

Judges: [`SUBMISSION.md`](SUBMISSION.md) maps each official scoring criterion to the artefact that
satisfies it. Architecture notes: [`docs/OPENBOT_INTEGRATION.md`](docs/OPENBOT_INTEGRATION.md).

## Run it

```bash
# 1. the apps — no build step, no CDN, no API key
open index.html            # Maestro AI OKF app
open events-os.html        # Exploratorium Events OS

# 2. the bot + board on one origin (serves both apps too)
cd openbot && npm run dev  # http://localhost:8787

# 3. verification
cd openbot && npm test                              # 18 tests
node board/scripts/extract-board.mjs --check        # board.json vs its source HTML
python3 build.py                                    # regenerate events-os.html + docs
```

`npm run dev` serves the apps at `/` and `/events-os.html`, the AG-UI endpoint at `POST /agui`, and
the board at `/api/board` and `/board/source/agent-games-timeline.html`.

## How the pieces connect

```
index.html (Maestro AI OKF)          events-os.html (Events OS)
   └── config/*.json, js/*.js            └── build.py ← content-inventory.json
                                                    │
                                    openbot/  (AG-UI · 11 tools)
                                      ├── kb/knowledge.json  ← content-inventory.json
                                      └── board/board.json   ← board/source/*.html
                                                    │
                        OpenBot Bot endpoint  POST /agui  +  approval-gated board writes
```

- The **bot** never invents venue facts: capacities, square footage, map zones and documents come
  from `openbot/kb/knowledge.json`, generated from `content-inventory.json`, which was extracted from
  the Exploratorium's own rentals pages. Pricing is never quoted; availability is never confirmed;
  every answer ends at the official inquiry form.
- The **board** is read by the bot (`board_status`, `board_tasks`, `board_gate`, `board_activity`) and
  written only when `BOARD_WRITE=1`; otherwise a change comes back as a proposal, which is exactly
  the approval OpenBot can enforce.
- The **Maestro AI app** is untouched by this work. To give it live answers, point it at the bot:
  `POST /agui` with an AG-UI `RunAgentInput`, or reuse `openbot/web/concierge-client.js`.

## Repository map

```
index.html, css/, js/, config/, prompts/, maestro-ai-standalone.html   the original Maestro AI app
events-os.html            Exploratorium Events OS prototype (generated)
events-tab-source.html    faithful copy of only the events-tab cards
build.py                  generator for events-os.html, docs and the zip bundle
assets/, source/          normalised stills, wallpaper, logo cutout, received brief, map notes
content-inventory.json    the extraction everything else is derived from
SOURCE_COPY.md            the extracted text in reviewable form
UPGRADE_PLAN.md           IA, design system, bot contract, roadmap
openbot/                  AG-UI bot: brain, tools, board, server, tests, Dockerfile, client
board/                    task board: source HTML, extracted model, live state, activity log
docs/                     integration notes, git/deployment notes, generated bundle README
scripts/                  push-to-github.sh
SUBMISSION.md             judging map
```

## Provenance and guardrails

- Venue facts: <https://www.exploratorium.edu/rentals> and its linked venue and event pages; the
  official 2026 Pier 15 rentals map PDF; the 2026 corporate and wedding brochures. Capacities are
  stated as "subject to change" and are not a confirmation of availability or price.
- Editorial text, photography and marks belong to their respective owners; this is a design
  adaptation for the competition, not an endorsement by the Exploratorium.
- The Maestro vendor roster (Paula LeDuc, McCalls, Blueprint Studios, Argus HD, Entire Productions,
  Brookline Electric) is a generic San Francisco model used as interaction scaffolding.
- Board data was extracted from `board/source/agent-games-timeline.html`, which is tracked verbatim.

## Working copies

A parallel copy of the bundle, the git bundle and the source archives live in the shared Drive
folder: <https://drive.google.com/drive/folders/1RdxbW61BqWv8S8Y9TeGHcNtV0gGWGBx1>.
