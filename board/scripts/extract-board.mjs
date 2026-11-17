#!/usr/bin/env node
/**
 * Extracts the Agent Games 2026 task board from the source HTML into a reviewable JSON file.
 *
 *   node board/scripts/extract-board.mjs           # writes board/board.json (+ empty state.json)
 *   node board/scripts/extract-board.mjs --check   # exit 1 when the checked-in board.json drifted
 *
 * The board is a self-contained Hebrew RTL HTML file whose whole model lives in a
 * `const DEFAULT_STATE = {...}` literal. Rather than retyping 28 tasks, this script reads that
 * literal — brace-matched, then evaluated as a plain object literal — and normalises it. Nothing
 * in the source HTML is modified, and board.json stays a pure extraction: live tick-offs live in
 * board/state.json, so re-extracting never destroys somebody's progress.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const BOARD_DIR = resolve(here, '..');
export const SOURCE_HTML = join(BOARD_DIR, 'source', 'agent-games-timeline.html');
export const BOARD_JSON = join(BOARD_DIR, 'board.json');
export const STATE_JSON = join(BOARD_DIR, 'state.json');

const PHASE_TITLES = {
  before: 'הכנות לפני התחרות',
  during: 'במהלך התחרות (72 שעות)',
  submit: 'סיום והגשה',
  post: 'אחרי ההגשה ומוניטיזציה',
};

/** Brace-matches one `const NAME = [...]|{...}` literal out of the page's largest script. */
export function readLiteral(js, name) {
  const start = js.indexOf(`const ${name}`);
  if (start < 0) throw new Error(`literal_not_found: ${name}`);
  let i = js.indexOf('=', start) + 1;
  while (js[i] !== '[' && js[i] !== '{' && i < js.length) i += 1;
  const open = js[i];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let j = i; j < js.length; j += 1) {
    const c = js[j];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === open) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (depth === 0) return js.slice(i, j + 1);
    }
  }
  throw new Error(`literal_unterminated: ${name}`);
}

const asLiteral = (js, name) => new Function(`return (${readLiteral(js, name)})`)();

/** Pulls the event facts that are written as prose in the header. */
function readEventFacts(html) {
  const text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const grab = (re) => (re.exec(text)?.[1] ?? '').trim();
  const judging = [...text.matchAll(/([1-5])\.\s([^(]{6,80}?)\s*\(([^)]{3,80})\)\s*(\d{2})%/g)]
    .map((m) => ({ rank: Number(m[1]), criterion: m[2].trim(), criterionEn: m[3].trim(), weight: `${m[4]}%` }));

  return {
    name: 'Agent Games 2026 — Main Street Edition',
    track: grab(/מסלול:\s*([^✅⚖️🏛️]+)/),
    registration: grab(/(✅\s*הרשמה מאושרת[^⚖️☑️🏛️]+)/).replace(/^✅\s*/, ''),
    judges: grab(/⚖️\s*(שופטים:[^🏛️]+)/).replace(/^שופטים:\s*/, ''),
    venue: grab(/🏛️\s*(אולם נבחר:[^🚀]+)/).replace(/^אולם נבחר:\s*/, ''),
    hackathonStart: '2026-12-04T22:00:00+02:00',
    hackathonEnd: '2026-12-07T16:00:00+02:00',
    submissionDeadline: '2026-12-07T22:00:00+02:00',
    shortlistAnnouncement: '2026-12-09',
    winnersAnnouncement: '2026-12-10',
    judging,
  };
}

export function extractBoard() {
  const html = readFileSync(SOURCE_HTML, 'utf8');
  const js = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).sort((a, b) => b.length - a.length)[0];
  const state = asLiteral(js, 'DEFAULT_STATE');
  const gateItems = asLiteral(js, 'GATE_ITEMS');
  const venues = asLiteral(js, 'VENUES_DATA');

  const phases = Object.entries(state.tasks).map(([id, tasks], order) => ({
    id,
    order,
    title: PHASE_TITLES[id] ?? id,
    tasks: tasks.map((t) => ({
      id: t.id,
      text: t.text,
      description: t.desc ?? '',
      note: t.note ?? '',
      tag: t.tag ?? '',
      kind: t.type ?? 'core',
      critical: t.type === 'critical',
      doneByDefault: Boolean(t.done),
    })),
  }));

  const taskCount = phases.reduce((n, p) => n + p.tasks.length, 0);
  const doneByDefault = phases.reduce((n, p) => n + p.tasks.filter((t) => t.doneByDefault).length, 0);

  return {
    board: 'Agent Games 2026',
    source: {
      file: 'board/source/agent-games-timeline.html',
      sha256: createHash('sha256').update(html).digest('hex'),
      bytes: Buffer.byteLength(html),
      driveFileId: '16nHdPycrROdV26cmGzTkMy1Ocpfy7HZY',
      driveLink: 'https://drive.google.com/file/d/16nHdPycrROdV26cmGzTkMy1Ocpfy7HZY/view',
      note: 'Hebrew RTL single-file board. board.json is extracted from it; state.json holds live progress.',
    },
    event: readEventFacts(html),
    selectedVenue: state.selectedVenue,
    phases,
    gate: gateItems.map((g, index) => ({ index, title: g.title, description: g.desc ?? '', passedByDefault: Boolean(state.gate?.[index]) })),
    venues,
    counts: { phases: phases.length, tasks: taskCount, critical: phases.reduce((n, p) => n + p.tasks.filter((t) => t.critical).length, 0), doneByDefault },
    statuses: ['open', 'in_progress', 'done', 'blocked'],
  };
}

const emptyState = () => ({
  version: 1,
  updatedAt: null,
  updatedBy: null,
  tasks: {},
  gate: {},
  note: 'Live progress overlay. Keys are task ids from board.json; values are the current status.',
});

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const extracted = extractBoard();
  const serialized = JSON.stringify(extracted, null, 2) + '\n';

  if (process.argv.includes('--check')) {
    const current = existsSync(BOARD_JSON) ? readFileSync(BOARD_JSON, 'utf8') : '';
    if (current !== serialized) {
      console.error('board.json is out of date — run: node board/scripts/extract-board.mjs');
      process.exit(1);
    }
    console.log(`board.json is current (${extracted.counts.tasks} tasks, sha ${extracted.source.sha256.slice(0, 12)})`);
  } else {
    mkdirSync(BOARD_DIR, { recursive: true });
    writeFileSync(BOARD_JSON, serialized, 'utf8');
    if (!existsSync(STATE_JSON)) writeFileSync(STATE_JSON, JSON.stringify(emptyState(), null, 2) + '\n', 'utf8');
    console.log(`wrote board.json — ${extracted.counts.phases} phases, ${extracted.counts.tasks} tasks (${extracted.counts.critical} critical), ${extracted.gate.length} gate conditions, ${extracted.venues.length} venues`);
  }
}
