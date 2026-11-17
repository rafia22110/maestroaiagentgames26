# Pier 15 Concierge — the bot in this repository

An **AG-UI agent** for Exploratorium event rentals, plus the endpoints and browser client the
prototype needs. It is designed to be registered in [CopilotKit OpenBot](https://github.com/CopilotKit/OpenBot)
as a Bot, and it also runs standalone with no dependencies.

The point of the bot is not conversation for its own sake: it turns a brief ("a 250-person
conference with Bay views") into a **grounded shortlist, a programme and a handoff**, using only
the venue facts extracted in this repository. It never quotes a price, never confirms a date, and
never answers from memory.

```
openbot/
├── src/
│   ├── server.mjs    HTTP surface: POST /agui (SSE), /api/*, optional static hosting
│   ├── agui.mjs      AG-UI event stream (RUN_*, STEP_*, TOOL_CALL_*, TEXT_MESSAGE_*, CUSTOM)
│   ├── brain.mjs     intent → tool plan → composed, cited answer (EN / HE)
│   ├── tools.mjs     the declared tools — the only path to venue and board data
│   ├── board.mjs     the task board: read, propose, and (with BOARD_WRITE=1) record
│   └── kb.mjs        loads kb/knowledge.json once per process
├── kb/knowledge.json generated from ../content-inventory.json
├── scripts/build-kb.mjs    the generator (run it after editing the inventory)
├── test/agui.test.mjs      protocol, grounding and guardrail tests (node --test)
├── web/concierge-client.js AG-UI browser client used by any frontend
├── Dockerfile, docker-compose.openbot.yml, .env.example
```

## Run it

```bash
cd openbot
npm test            # 7 tests, no install step, no network
npm run dev         # http://localhost:8787 — serves the prototype AND the bot API
```

`npm run dev` sets `EXPLORATORIUM_STATIC=1`, so the same origin serves `index.html` and `/agui`.
Open <http://localhost:8787/> and type a question in the Maestro panel: the status chip turns to
**● live AG-UI**, the six stage nodes animate from the bot's own events, and the answer streams in
with its citations. Opened from disk (`file://`) the same page falls back to the scripted demo.

## Register it in OpenBot

1. Start OpenBot (`scripts/start.sh` in a clone of `CopilotKit/OpenBot`) and this service:
   `docker compose -f openbot/docker-compose.openbot.yml up --build`.
2. In OpenBot go to **/bots → New Bot** and fill in:
   - **Name** `Pier 15 Concierge`, **Role** `Exploratorium event rentals concierge`
   - **AG-UI endpoint** `http://host.docker.internal:8787/agui` (Docker) or `http://localhost:8787/agui`
   - **Authorization header** empty — this service authenticates nobody itself; put it behind the
     proxy that does, and OpenBot stores the header write-only.
3. Grant tools and components in **/admin/components** and **/admin/boundaries** if you want the
   bot to render cards or take further actions. It needs no browser, file or shell access: the
   six tools are read-only and return JSON.
4. Talk to it from `/bot`, a channel, Slack or Teams — every call lands in **/admin/audit**.

Full walkthrough, policy notes and the API contract: [`../docs/OPENBOT_INTEGRATION.md`](../docs/OPENBOT_INTEGRATION.md).

## Contract

`POST /agui` takes a standard AG-UI `RunAgentInput`:

```json
{ "threadId": "t1", "runId": "r1",
  "messages": [{ "id": "m1", "role": "user", "content": "conference for 250 guests" }],
  "state": { "guests": 250, "format": "theatre" } }
```

and streams `data: {...}` frames: `RUN_STARTED`, `STEP_STARTED` per stage, `CUSTOM bot.stage`
(for the six-node animation), `TOOL_CALL_START/ARGS/END/RESULT`, `TEXT_MESSAGE_*`,
`CUSTOM artifact.brief`, `CUSTOM artifact.citations`, `STATE_SNAPSHOT`, `STEP_FINISHED`,
`RUN_FINISHED` with `{intent, language, citations, brief?, handoff}`.

Other routes: `GET /agui` (agent card), `GET /healthz`, `GET /api/venues|/api/venues/:id|/api/events|/api/media|/api/documents|/api/kb`,
`POST /api/bot/brief` (same brain, JSON not SSE), `POST /api/inquiries` (records an intent, returns a
reference, sends nothing).

## Grounding rules the tests enforce

| Rule | Where |
| --- | --- |
| Answers may only use `kb/knowledge.json`, which is generated from `content-inventory.json` | `test`: the checked-in KB must equal its generator |
| No price, no date confirmation, ever | `test`: pricing/availability answers contain no `$`, must name the Events Team and end at the form |
| Every answer carries citations and the official handoff | `test`: `/rentals/form` on `RUN_FINISHED` |
| Capacities come from the published labels | `test`: 250 theatre → Bechtel Central, 500 seated |
| Hebrew in, Hebrew out | `test`: Hebrew request returns Hebrew text |
| Media answers point at real source pages | `test`: every tile has an `http(s)` source |

The brain is deterministic on purpose. Swapping in a model means letting it *choose* the tool plan
and write the prose in `brain.mjs`; `tools.mjs` stays the only data path, so the guardrails hold.
