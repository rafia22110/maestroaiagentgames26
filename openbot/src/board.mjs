/**
 * The project's task board, as the bot sees it.
 *
 * board/board.json is a pure extraction of the Agent Games 2026 board (see
 * board/scripts/extract-board.mjs). Live progress lives in board/state.json as an overlay, so
 * re-extracting the source never erases a tick-off. Every write also appends one line to
 * board/activity.jsonl — the same "decide, then record" shape OpenBot uses for tool calls.
 *
 * Writes are off unless BOARD_WRITE=1. With the flag off, updateTask returns a proposal the
 * person can approve, which is exactly the approval OpenBot would ask for in a governed
 * deployment.
 */
import { readFileSync, writeFileSync, appendFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const BOARD_DIR = process.env.EXPLORATORIUM_BOARD_DIR ?? resolve(here, '..', '..', 'board');
const BOARD_JSON = join(BOARD_DIR, 'board.json');
const STATE_JSON = join(BOARD_DIR, 'state.json');
const ACTIVITY = join(BOARD_DIR, 'activity.jsonl');

const STATUSES = ['open', 'in_progress', 'done', 'blocked'];
const writesEnabled = () => process.env.BOARD_WRITE === '1';

let boardCache = null;

export function board() {
  if (!boardCache) {
    if (!existsSync(BOARD_JSON)) throw new Error(`board_missing: ${BOARD_JSON}`);
    boardCache = JSON.parse(readFileSync(BOARD_JSON, 'utf8'));
  }
  return boardCache;
}

export function state() {
  if (!existsSync(STATE_JSON)) return { version: 1, updatedAt: null, updatedBy: null, tasks: {}, gate: {} };
  try {
    return JSON.parse(readFileSync(STATE_JSON, 'utf8'));
  } catch {
    return { version: 1, updatedAt: null, updatedBy: null, tasks: {}, gate: {} };
  }
}

/** Every task, in board order, with the overlay applied. */
export function tasks() {
  const overlay = state().tasks ?? {};
  return board().phases.flatMap((phase) =>
   phase.tasks.map((task) => {
      const current = overlay[task.id];
      const status = current?.status ?? (task.doneByDefault ? 'done' : 'open');
      return {
        id: task.id,
        phase: phase.id,
        phaseTitle: phase.title,
        text: task.text,
        tag: task.tag,
        kind: task.kind,
        critical: task.critical,
        description: task.description,
        note: current?.note ?? task.note ?? '',
        status,
        updatedAt: current?.updatedAt ?? null,
        updatedBy: current?.updatedBy ?? null,
      };
    }),
  );
}

export function findTask(id) {
  return tasks().find((t) => t.id === String(id).toLowerCase()) ?? null;
}

/** Counts per phase and overall, plus the four-condition gate. */
export function summary() {
  const all = tasks();
  const count = (list) => ({
    total: list.length,
    done: list.filter((t) => t.status === 'done').length,
    inProgress: list.filter((t) => t.status === 'in_progress').length,
    blocked: list.filter((t) => t.status === 'blocked').length,
    open: list.filter((t) => t.status === 'open').length,
    percent: list.length ? Math.round((list.filter((t) => t.status === 'done').length / list.length) * 100) : 0,
  });

  const gateState = state().gate ?? {};
  const gate = board().gate.map((g) => ({
    index: g.index,
    title: g.title,
    description: g.description,
    passed: Boolean(gateState[g.index] ?? g.passedByDefault),
  }));

  return {
    event: board().event,
    selectedVenue: board().selectedVenue,
    overall: count(all),
    phases: board().phases.map((p) => ({ id: p.id, title: p.title, ...count(all.filter((t) => t.phase === p.id)) })),
    critical: count(all.filter((t) => t.critical)),
    gate: { passed: gate.filter((g) => g.passed).length, total: gate.length, items: gate },
    updatedAt: state().updatedAt,
    writesEnabled: writesEnabled(),
  };
}

/** Open work, critical first, then board order. */
export function nextTasks({ limit = 5, phase = null, status = null, criticalOnly = false } = {}) {
  let list = tasks().filter((t) => t.status !== 'done');
  if (phase) list = list.filter((t) => t.phase === phase);
  if (status) list = list.filter((t) => t.status === status);
  if (criticalOnly) list = list.filter((t) => t.critical);
  const phaseOrder = new Map(board().phases.map((p, i) => [p.id, i]));
  list.sort((a, b) => Number(b.critical) - Number(a.critical) || phaseOrder.get(a.phase) - phaseOrder.get(b.phase));
  return { count: list.length, tasks: list.slice(0, Math.max(1, Number(limit) || 5)) };
}

export function listTasks({ phase = null, status = null, criticalOnly = false, tag = null, limit = 50 } = {}) {
  let list = tasks();
  if (phase) list = list.filter((t) => t.phase === phase);
  if (status) list = list.filter((t) => t.status === status);
  if (criticalOnly) list = list.filter((t) => t.critical);
  if (tag) list = list.filter((t) => t.tag === tag);
  return { count: list.length, returned: Math.min(list.length, limit), tasks: list.slice(0, limit) };
}

/** Countdown to the hackathon window, from the board's own dates. */
export function countdown(now = new Date()) {
  const start = new Date(board().event.hackathonStart);
  const deadline = new Date(board().event.submissionDeadline);
  const ms = (date) => date.getTime() - now.getTime();
  const human = (delta) => {
    if (delta <= 0) return 'passed';
    const days = Math.floor(delta / 86400000);
    const hours = Math.floor((delta % 86400000) / 3600000);
    return `${days}d ${hours}h`;
  };
  return {
    now: now.toISOString(),
    hastaStart: human(ms(start)),
    hastaDeadline: human(ms(deadline)),
    inWindow: ms(start) <= 0 && ms(deadline) > 0,
  };
}

/**
 * Changes one task's status.
 * With BOARD_WRITE unset, returns a proposal and writes nothing.
 */
export function updateTask({ taskId, status = null, done = null, note = null, by = 'concierge' } = {}) {
  const task = findTask(taskId);
  if (!task) return { ok: false, error: 'unknown_task', taskId, hint: 'Call list_tasks to see valid ids.' };

  const nextStatus = done === true ? 'done' : done === false ? 'open' : status;
  if (!nextStatus || !STATUSES.includes(nextStatus)) {
    return { ok: false, error: 'invalid_status', allowed: STATUSES, received: nextStatus ?? status ?? done };
  }
  if (nextStatus === task.status && (note ?? null) === (task.note ?? null)) {
    return { ok: true, changed: false, task, message: 'Already in that state.' };
  }

  const proposed = { taskId: task.id, from: task.status, to: nextStatus, note: note ?? task.note ?? '', by };

  if (!writesEnabled()) {
    return {
      ok: true,
      changed: false,
      proposed: true,
      requiresApproval: true,
      ...proposed,
      message: 'Write mode is off. This is a proposal: set BOARD_WRITE=1 on the service (or approve it in OpenBot) to record it.',
      activityLog: ACTIVITY,
    };
  }

  const current = state();
  const at = new Date().toISOString();
  current.tasks = { ...(current.tasks ?? {}), [task.id]: { status: nextStatus, note: note ?? task.note ?? '', updatedAt: at, updatedBy: by } };
  current.updatedAt = at;
  current.updatedBy = by;
  const tmp = `${STATE_JSON}.tmp`;
  writeFileSync(tmp, JSON.stringify(current, null, 2) + '\n', 'utf8');
  renameSync(tmp, STATE_JSON);
  appendFileSync(ACTIVITY, JSON.stringify({ at, taskId: task.id, from: task.status, to: nextStatus, note: proposalNote(note), by }) + '\n', 'utf8');

  return { ok: true, changed: true, task: findTask(task.id), from: task.status, to: nextStatus, by, at, activityLog: ACTIVITY };
}

const proposalNote = (note) => (typeof note === 'string' ? note.slice(0, 400) : '');

/** Ticks a submission-gate condition on or off. Writes only when BOARD_WRITE=1. */
export function setGate({ index, passed = true, by = 'concierge' } = {}) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= board().gate.length) {
    return { ok: false, error: 'unknown_gate', valid: board().gate.map((g) => g.index) };
  }
  if (!writesEnabled()) {
    return { ok: true, changed: false, proposed: true, requiresApproval: true, gate: i, passed, message: 'Write mode is off; this is a proposal.' };
  }
  const current = state();
  current.gate = { ...(current.gate ?? {}), [i]: Boolean(passed) };
  const at = new Date().toISOString();
  current.updatedAt = at;
  current.updatedBy = by;
  const tmp = `${STATE_JSON}.tmp`;
  writeFileSync(tmp, JSON.stringify(current, null, 2) + '\n', 'utf8');
  renameSync(tmp, STATE_JSON);
  appendFileSync(ACTIVITY, JSON.stringify({ at, gate: i, passed: Boolean(passed), by }) + '\n', 'utf8');
  return { ok: true, changed: true, gate: summary().gate, at };
}

/** Recent activity lines, newest first. */
export function activity({ limit = 20 } = {}) {
  if (!existsSync(ACTIVITY)) return { count: 0, entries: [] };
  const lines = readFileSync(ACTIVITY, 'utf8').trim().split('\n').filter(Boolean);
  const entries = lines.slice(-limit).reverse().map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { raw: line };
    }
  });
  return { count: lines.length, entries };
}
