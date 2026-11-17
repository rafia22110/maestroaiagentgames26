# Agent Games 2026 — the project task board, in the repository

The planning board that used to live only as a downloaded HTML file is now part of the repository,
and the concierge bot reads and writes it.

```
board/
├── source/agent-games-timeline.html   the original board, byte-for-byte (Hebrew RTL, self-contained)
├── board.json                         extracted model: event facts, 4 phases, 28 tasks, 6 gate conditions, 6 venues
├── state.json                         live progress overlay (tick-offs, gate ticks) + who changed what
├── activity.jsonl                     append-only log of every change
└── scripts/extract-board.mjs          source -> board.json (+ --check for CI)
```

## Why three files instead of one

| File | Written by | Why it is separate |
| --- | --- | --- |
| `board.json` | the extractor only | It is a pure extraction, so it can be diffed and re-generated. `node board/scripts/extract-board.mjs --check` fails when it drifts from the source HTML. |
| `state.json` | the bot / the API | Re-extracting the source must never erase somebody's progress. |
| `activity.jsonl` | the bot / the API | Append-only, so a task's history survives a bad edit; this is the same "decide, then record" shape OpenBot uses for tool calls. |

## Commands

```bash
node board/scripts/extract-board.mjs           # rebuild board.json from the source HTML
node board/scripts/extract-board.mjs --check    # exit 1 if board.json is stale (CI-safe)

cd openbot && npm run dev                       # serves the board AND the bot on :8787
open http://localhost:8787/board/source/agent-games-timeline.html
```

The original board keeps working on its own — it stores its state in `localStorage`, so it is still
the fastest way to tick things off by hand. `state.json` is the copy the bot and the API share; the
two are deliberately not synced automatically, because the original page has no backend.

## What the bot can do with it

| Tool | Question it answers |
| --- | --- |
| `board_status` | "What is left before the hackathon?" — progress by phase, critical path, gate, countdown, next actions |
| `board_tasks` | "Which submission tasks are still open?" — filtered by phase, status, tag, critical |
| `board_update_task` | "Mark b2 as done" — records it, or returns a proposal when writes are off |
| `board_gate` | "Show me the submission gate" — the six mandatory conditions |
| `board_activity` | "What changed recently?" — the tail of `activity.jsonl` |

Try them:

```bash
curl -s localhost:8787/api/board | jq '.overall, .gate.passed, .countdown'
curl -s 'localhost:8787/api/board/tasks?critical=1&limit=5' | jq '.tasks[].text'
curl -s -X POST localhost:8787/api/board/tasks/b2 -H 'content-type: application/json' -d '{"done":true}'
```

The last call answers **202 with a proposal** unless the service runs with `BOARD_WRITE=1`. That is
the whole governance story: the bot can always *say* what should change, and a human (or OpenBot's
approval step) decides whether it happens.

## Facts the board contributes

- Event: **Agent Games 2026 — Main Street Edition**, track *Wedding Venues (tthezgqmvrrh)*, judges
  Vlad Yanch (CEO) and Eugene Sorokin (CTO).
- Selected venue: **The Exploratorium (Pier 15)** — the same venue as the rest of this repository,
  which is why the bot answers both venue and board questions in one thread.
- Hackathon window: **4 December 2026, 22:00 → 7 December 2026, 22:00** (Israel time); shortlist
  9 December, winners 10 December.
- Judging weights: real business 25%, agentic behaviour 25%, design 20%, Agentplace capabilities
  15%, reliability and safety 15%.
- Submission gate: six conditions, all mandatory.

Anything the board states about the venue is treated as the board's claim; capacities and pricing
answers still come from the venue knowledge base, and pricing remains unquotable.
