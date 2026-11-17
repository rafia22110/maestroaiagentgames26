import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, copyFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConciergeServer } from '../src/server.mjs';
import { createConcierge } from '../web/concierge-client.js';
import { extractBoard, BOARD_JSON } from '../../board/scripts/extract-board.mjs';
import { runTurn } from '../src/brain.mjs';

const source = JSON.parse(readFileSync(BOARD_JSON, 'utf8'));

test('board.json matches the extracted source board', () => {
  assert.deepEqual(source, extractBoard());
  assert.equal(source.counts.tasks, 28);
  assert.equal(source.counts.critical, 9);
  assert.equal(source.gate.length, 6);
  assert.equal(source.venues.length, 6);
  assert.match(source.source.sha256, /^[0-9a-f]{64}$/);
});

test('task ids are unique and stable', () => {
  const ids = source.phases.flatMap((p) => p.tasks.map((t) => t.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids.filter((id) => id.startsWith('b')).length, 9);
});

test('the bot answers board questions from the board, not from memory', async () => {
  const turn = runTurn({ text: 'what is left on the board before the hackathon?' });
  assert.equal(turn.intent, 'board');
  const status = turn.calls.find((c) => c.name === 'board_status').result;
  const total = source.phases.reduce((n, p) => n + p.tasks.length, 0);
  assert.match(turn.answer, new RegExp(`/${total} tasks done`));
  assert.equal(status.gate.total, 6);
  assert.ok(status.nextActions.length > 0);
});

test('marking a task is a proposal while write mode is off', async () => {
  const turn = runTurn({ text: 'mark b2 as done' });
  const call = turn.calls.find((c) => c.name === 'board_update_task');
  assert.equal(call.result.proposed, true);
  assert.equal(call.result.requiresApproval, true);
  assert.match(turn.answer, /Proposal only/);
});

test('writes land in state.json and the activity log when enabled', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'board-'));
  copyFileSync(BOARD_JSON, join(dir, 'board.json'));
  writeFileSync(join(dir, 'state.json'), JSON.stringify({ version: 1, updatedAt: null, updatedBy: null, tasks: {}, gate: {} }));
  process.env.EXPLORATORIUM_BOARD_DIR = dir;
  process.env.BOARD_WRITE = '1';

  const { updateTask, summary, setGate, activity } = await import(`../src/board.mjs?write=${Date.now()}`);
  const result = updateTask({ taskId: 'b2', done: true, note: 'joined the Discord', by: 'test' });
  assert.equal(result.changed, true);
  assert.equal(result.to, 'done');
  assert.equal(summary().overall.done, source.counts.doneByDefault + 1);
  assert.equal(JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')).tasks.b2.status, 'done');

  const gate = setGate({ index: 0, passed: true, by: 'test' });
  assert.equal(gate.changed, true);
  assert.equal(summary().gate.passed, 1);

  const log = activity({ limit: 5 });
  assert.ok(log.count >= 2);
  assert.equal(log.entries[0].gate, 0);

  const unknown = updateTask({ taskId: 'z9', done: true });
  assert.equal(unknown.error, 'unknown_task');
  assert.equal(existsSync(join(dir, 'activity.jsonl')), true);

  delete process.env.EXPLORATORIUM_BOARD_DIR;
  delete process.env.BOARD_WRITE;
});

const server = createConciergeServer();
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());

test('the board is served over HTTP and writes are gated', async () => {
  const summaryRes = await (await fetch(`${base}/api/board`)).json();
  assert.equal(summaryRes.overall.total, 28);
  assert.equal(summaryRes.gate.total, 6);

  const critical = await (await fetch(`${base}/api/board/tasks?critical=1&limit=50`)).json();
  assert.equal(critical.count, 9);

  const proposed = await fetch(`${base}/api/board/tasks/b2`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ done: true }),
  });
  assert.equal(proposed.status, 202, 'write mode is off, so the API answers with a proposal');
  assert.equal((await proposed.json()).requiresApproval, true);

  assert.equal((await fetch(`${base}/api/board/tasks/z9`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 404);
});

test('the AG-UI client receives the board artefact', async () => {
  const bot = createConcierge({ endpoint: `${base}/agui` });
  let board;
  const result = await bot.ask('show me the submission gate', { onBoard: (b) => (board = b) });
  assert.match(result.text, /Submission gate/);
  assert.ok(board?.summary, 'artifact.board is delivered to the client');
  assert.equal(board.summary.gate.total, 6);
});
