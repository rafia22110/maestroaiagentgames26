import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createCompetitionServer, ORIGINAL_BOARD } from '../src/competition-app.mjs';
import { prepareBoardHtml } from '../src/board-html.mjs';

test('original board HTTP integration and AG-UI transport', async t => {
  const previousWrite = process.env.BOARD_WRITE;
  process.env.BOARD_WRITE = '0';
  t.after(() => { if (previousWrite === undefined) delete process.env.BOARD_WRITE; else process.env.BOARD_WRITE = previousWrite; });
  const server = createCompetitionServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  t.after(() => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }));
  const root = await fetch(base + '/', { redirect: 'manual' });
  assert.equal(root.status, 302);
  assert.equal(root.headers.get('location'), '/board');
  const expected = prepareBoardHtml(readFileSync(ORIGINAL_BOARD, 'utf8'));
  for (const path of ['/board', '/board/', '/agent-games-timeline.html']) {
    const page = await fetch(base + path);
    assert.equal(page.status, 200);
    assert.equal(await page.text(), expected);
  }
  const head = await fetch(base + '/board', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  for (const path of ['/healthz', '/agui', '/api/board']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /application\/json/);
  }
  const before = await (await fetch(base + '/api/board/tasks')).json();
  assert.ok(before.tasks.length > 0);
  const task = before.tasks[0];
  const status = task.status === 'done' ? 'open' : 'done';
  const proposed = await fetch(base + '/api/board/tasks/' + task.id, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
  assert.equal(proposed.status, 202);
  const proposal = await proposed.json();
  assert.equal(proposal.proposed, true);
  assert.equal(proposal.changed, false);
  const after = await (await fetch(base + '/api/board/tasks', { headers: { connection: 'close' } })).json();
  assert.equal(after.tasks.find(item => item.id === task.id).status, task.status);
  const invalid = await fetch(base + '/api/board/tasks/' + task.id, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'invalid' }) });
  assert.equal(invalid.status, 400);
  const run = await fetch(base + '/agui', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ threadId: 'http-smoke', runId: 'http-smoke-run', messages: [{ id: 'm1', role: 'user', content: 'Show the project task board status' }], state: {}, tools: [], context: [], forwardedProps: { reducedMotion: true } }), signal: AbortSignal.timeout(10000) });
  assert.equal(run.status, 200);
  assert.match(run.headers.get('content-type'), /text\/event-stream/);
  const events = (await run.text()).split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
  assert.ok(events.some(event => event.type === 'RUN_STARTED'));
  assert.ok(events.some(event => event.type === 'RUN_FINISHED'));
  assert.equal(events.some(event => event.type === 'RUN_ERROR'), false);
});
