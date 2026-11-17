# Exploratorium Events UI — adaptation bundle

**Main deliverable:** `index.html` — open it in the workspace viewer or download it. It is fully standalone: images, wallpaper, transparent cutout, styles and scripts are embedded.

**New Drive folder:** [Exploratorium Events UI · המשך התאמה · 2026-11-17](https://drive.google.com/drive/folders/1RdxbW61BqWv8S8Y9TeGHcNtV0gGWGBx1)  
`צור תקיה חדשה במאגר לצורך המשך התאמה` — בוצע. התיקייה נוצרה בתוך המאגר שסיפקת.

## Files

- `index.html` — interactive Sakshinhiro Model A demo / Netflix-style glass events OS.
- `events-tab-source.html` — faithful, minimal copy of only the Events / Special Events cards.
- `SOURCE_COPY.md` — exact source text, media URLs, capacities, map labels and proposed sub-tabs.
- `UPGRADE_PLAN.md` — IA, design system, bot contract, phased roadmap and acceptance criteria.
- `content-inventory.json` — machine-readable extraction for continued adaptation.
- `assets/` — 31 compressed local media stills, derived glass wallpaper, transparent logo cutout, official video poster.
- `source/` — the received Maestro AI HTML brief, original uploaded logo, and extracted venue-map notes.
- `build.py` — reproducible generator; `Exploratorium_Events_UI_bundle.zip` — portable archive.
- `openbot/` — the concierge as an AG-UI bot (`POST /agui`) with tools, tests, Dockerfile and a knowledge base generated from `content-inventory.json`.
- `docs/OPENBOT_INTEGRATION.md` — how to register the bot in CopilotKit OpenBot, policy, audit and deployment notes.
- `board/` — the project's task board in the repository: original HTML, extracted `board.json`, live `state.json`, append-only `activity.jsonl`.
- `docs/GIT_AND_DEPLOY.md` — repository history, GitHub publication and split deployment.

## Running the bot

```bash
cd openbot
npm test          # protocol, grounding and guardrail tests
npm run dev       # http://localhost:8787 — serves this prototype AND the AG-UI endpoint
```

The same service reads the task board, so the bot can answer "what is left before the hackathon?"
and record a tick-off with approval:

```bash
node board/scripts/extract-board.mjs            # rebuild board.json from the source HTML
curl -s localhost:8787/api/board                # progress, gate, countdown, next actions
```

With the service running, the Maestro panel in `index.html` streams live answers from the bot and
its status chip reads **● live AG-UI**. Without it (opened as a file, or offline) the panel falls
back to the scripted demonstration, so the page is always usable.

## Provenance

Primary source: [https://www.exploratorium.edu/rentals](https://www.exploratorium.edu/rentals) and its linked venue/event pages. Official reel: [https://www.youtube.com/watch?v=qVxsUfNnzNw](https://www.youtube.com/watch?v=qVxsUfNnzNw). 2026 map: [https://www.exploratorium.edu/sites/default/files/2026-06/2026_RentalsMap_Pier15_w_0.pdf](https://www.exploratorium.edu/sites/default/files/2026-06/2026_RentalsMap_Pier15_w_0.pdf). Attachment received as Maestro AI HTML rather than PDF; the official map PDF was fetched from the site.

Editorial text, images and marks belong to their respective owners. Prototype is for design adaptation; confirm rights, availability and pricing before production.
