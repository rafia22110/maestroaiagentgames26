#!/usr/bin/env node
/**
 * Pier 15 Concierge — HTTP surface.
 *
 *   POST /agui                 AG-UI run endpoint (SSE). This is the URL OpenBot stores on a Bot.
 *   GET  /agui                 Agent card: id, tools, stages (what OpenBot's Bot page lists).
 *   GET  /healthz              Liveness.
 *   GET  /api/venues           Six rental spaces with capacities.
 *   GET  /api/venues/:id       One space.
 *   GET  /api/events           Event-type catalogue (the events tab).
 *   GET  /api/media?category=  Media wall items.
 *   GET  /api/documents        Map, brochures, FAQ, inquiry form.
 *   GET  /api/board            Task-board summary: progress, gate, countdown, next actions.
 *   GET  /api/board/tasks      Tasks, filtered by ?phase=&status=&critical=1&limit=
 *   GET  /api/board/activity   Recent board changes (board/activity.jsonl).
 *   POST /api/board/tasks/:id  Change a task status. 202 = proposal when BOARD_WRITE is off.
 *   POST /api/board/gate/:i    Tick a submission-gate condition.
 *   POST /api/bot/brief        Same brain, non-streaming: returns the grounded brief as JSON.
 *   POST /api/inquiries        Records an inquiry intent and returns a reference (no email is sent).
 *
 * Zero runtime dependencies, so it runs on a bare Node 20 image and in the repo's own tests.
 * Every tool call and every refusal is written to stdout as one JSON line — the local mirror of
 * the audit row OpenBot writes before it acts.
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { streamRun, toSSE, agentInfo, collectRun } from './agui.mjs';
import { runTurn } from './brain.mjs';
import { kb } from './kb.mjs';
import { summary as boardSummary, listTasks, nextTasks, updateTask, activity as boardActivity, setGate, countdown, board as boardData } from './board.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(here, '..', '..');

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const STATIC_DIR = process.env.EXPLORATORIUM_STATIC === '1' ? (process.env.EXPLORATORIUM_STATIC_DIR ?? PROJECT_ROOT) : null;
const MAX_BODY = 256 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
  '.pdf': 'application/pdf',
};

export function audit(entry) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, x-openbot-run-id, x-request-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('payload_too_large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolveBody({});
      try {
        resolveBody(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('invalid_json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(pathname, res) {
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const target = join(STATIC_DIR, safe === '/' ? 'index.html' : safe);
  if (!target.startsWith(STATIC_DIR)) return json(res, 403, { error: 'forbidden' });
  try {
    const stat = statSync(target);
    if (stat.isDirectory()) return json(res, 404, { error: 'not_found' });
    res.writeHead(200, {
      'content-type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': extname(target) === '.html' ? 'no-cache' : 'public, max-age=300',
    });
    createReadStream(target).pipe(res);
  } catch {
    json(res, 404, { error: 'not_found', path: pathname });
  }
}

export function createConciergeServer() {
  return createServer(async (req, res) => {
    cors(res);
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const { pathname } = url;

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    try {
      if (pathname === '/healthz') {
        return json(res, 200, { ok: true, agent: agentInfo().id, protocolVersion: agentInfo().protocolVersion, kb: `${kb().venues.length} venues` });
      }

      if (pathname === '/agui' && req.method === 'GET') return json(res, 200, agentInfo());

      if (pathname === '/agui' && req.method === 'POST') {
        const input = await readBody(req);
        const threadId = input.threadId ?? `thread-${Date.now().toString(36)}`;
        const runId = input.runId ?? `run-${Date.now().toString(36)}`;
        res.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'x-accel-buffering': 'no',
        });
        res.flushHeaders?.();
        audit({ event: 'run_started', threadId, runId, actor: req.headers['x-openbot-user'] ?? 'anonymous' });

        const abort = new AbortController();
        req.on('close', () => abort.abort());
        try {
          for await (const event of streamRun({ ...input, threadId, runId }, { delay: Number(process.env.STREAM_DELAY_MS ?? 12) })) {
            if (abort.signal.aborted) break;
            if (event.type === 'TOOL_CALL_START') audit({ event: 'tool_call', runId, tool: event.toolCallName });
            if (event.type === 'RUN_FINISHED') audit({ event: 'run_finished', runId, intent: event.result?.intent, citations: event.result?.citations?.length ?? 0 });
            res.write(toSSE(event));
          }
        } catch (error) {
          res.write(toSSE({ type: 'RUN_ERROR', message: String(error?.message ?? error) }));
          audit({ event: 'run_error', runId, message: String(error?.message ?? error) });
        }
        return res.end();
      }

      const data = kb();
      if (pathname === '/api/venues') return json(res, 200, { count: data.venues.length, venues: data.venues });
      if (pathname.startsWith('/api/venues/')) {
        const id = decodeURIComponent(pathname.split('/').pop());
        const venue = data.venues.find((v) => v.id === id);
        return venue ? json(res, 200, venue) : json(res, 404, { error: 'unknown_venue', known: data.venues.map((v) => v.id) });
      }
      if (pathname === '/api/events') return json(res, 200, { count: data.eventTypes.length, eventTypes: data.eventTypes });
      if (pathname === '/api/media') {
        const category = url.searchParams.get('category');
        const media = category ? data.media.filter((m) => m.category === category) : data.media;
        return json(res, 200, { category: category ?? 'all', count: media.length, media });
      }
      if (pathname === '/api/documents') return json(res, 200, { count: data.documents.length, documents: data.documents });
      if (pathname === '/api/kb') return json(res, 200, data);

      if (pathname === '/api/board') {
        return json(res, 200, { ...boardSummary(), countdown: countdown(), nextActions: nextTasks({ limit: 5 }).tasks, writesEnabled: process.env.BOARD_WRITE === '1' });
      }
      if (pathname === '/api/board/tasks') {
        const phase = url.searchParams.get('phase');
        const status = url.searchParams.get('status');
        const critical = url.searchParams.get('critical') === '1';
        const limit = Number(url.searchParams.get('limit') ?? 50);
        return json(res, 200, listTasks({ phase, status, criticalOnly: critical, limit }));
      }
      if (pathname === '/api/board/activity') {
        return json(res, 200, boardActivity({ limit: Number(url.searchParams.get('limit') ?? 20) }));
      }
      if (pathname === '/api/board/source') return json(res, 200, boardData().source);

      const taskRoute = /^\/api\/board\/tasks\/([a-z]\d{1,2})$/i.exec(pathname);
      if (taskRoute && req.method === 'POST') {
        const body = await readBody(req);
        const result = updateTask({ taskId: taskRoute[1], status: body.status ?? null, done: body.done ?? null, note: body.note ?? null, by: body.by ?? 'http' });
        if (result.error === 'unknown_task') return json(res, 404, result);
        if (result.error) return json(res, 400, result);
        audit({ event: 'board_write', taskId: taskRoute[1], from: result.from, to: result.to, changed: result.changed, by: body.by ?? 'http' });
        return json(res, result.changed ? 200 : 202, result);
      }

      const gateRoute = /^\/api\/board\/gate\/(\d)$/.exec(pathname);
      if (gateRoute && req.method === 'POST') {
        const body = await readBody(req);
        const result = setGate({ index: Number(gateRoute[1]), passed: body.passed ?? true, by: body.by ?? 'http' });
        if (result.error) return json(res, 404, result);
        audit({ event: 'board_gate', index: Number(gateRoute[1]), passed: body.passed ?? true, changed: result.changed });
        return json(res, result.changed ? 200 : 202, result);
      }

      if (pathname === '/api/bot/brief' && req.method === 'POST') {
        const body = await readBody(req);
        const text = String(body.prompt ?? body.text ?? '').trim();
        const turn = runTurn({ text, state: body.state ?? {} });
        audit({ event: 'brief_export', intent: turn.intent, cites: turn.citations.length });
        return json(res, 200, {
          intent: turn.intent,
          inputs: turn.inputs,
          brief: turn.brief ?? null,
          answer: turn.answer,
          citations: turn.citations,
          handoff: turn.handoff,
        });
      }

      if (pathname === '/api/inquiries' && req.method === 'POST') {
        const body = await readBody(req);
        const reference = `PIER15-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        audit({ event: 'inquiry_recorded', reference, guests: body.guests ?? null, eventType: body.eventType ?? null });
        return json(res, 202, {
          reference,
          recorded: true,
          note: 'Demo endpoint: nothing was emailed. The official inquiry form remains the conversion path.',
          officialForm: kb().contact.form,
        });
      }

      if (pathname.startsWith('/api/')) return json(res, 404, { error: 'not_found', path: pathname });

      if (STATIC_DIR) return serveStatic(pathname, res);

      return json(res, 404, { error: 'not_found', hint: 'POST /agui is the AG-UI endpoint; GET /agui lists the agent card.' });
    } catch (error) {
      const status = error?.status ?? 500;
      audit({ event: 'request_error', path: pathname, status, message: String(error?.message ?? error) });
      return json(res, status, { error: String(error?.message ?? error) });
    }
  });
}

/** Small helper for the repo's tests and for embedding a run without HTTP. */
export { collectRun, streamRun, agentInfo };

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const server = createConciergeServer();
  server.listen(PORT, HOST, () => {
    audit({ event: 'listening', url: `http://${HOST}:${PORT}`, agui: `http://${HOST}:${PORT}/agui`, static: STATIC_DIR ?? 'off' });
    console.log(`Pier 15 Concierge listening on http://${HOST}:${PORT}  (AG-UI: POST /agui)`);
  });
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      audit({ event: 'shutdown', signal });
      server.close(() => process.exit(0));
    });
  }
}
