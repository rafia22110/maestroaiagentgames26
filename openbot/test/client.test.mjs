import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createConciergeServer } from '../src/server.mjs';
import { createConcierge } from '../web/concierge-client.js';

const server = createConciergeServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
after(() => server.close());

test('the AG-UI endpoint and the browser client agree end to end', async () => {
  const bot = createConcierge({ endpoint: `${base}/agui` });
  const health = await bot.health();
  assert.equal(health.ok, true);

  const stages = [];
  const citations = [];
  const result = await bot.ask('We need a conference for 250 guests, theatre style', {
    onStage: (stage) => stages.push(stage),
    onCitations: (cites) => citations.push(...cites),
  });

  assert.deepEqual(stages, ['intake', 'capacity_check', 'curatorial_constraints', 'gallery_match', 'brief', 'human_handoff']);
  assert.match(result.text, /Bechtel Central/);
  assert.ok(citations.length >= 2);
  assert.equal(result.result.handoff, 'https://www.exploratorium.edu/rentals/form');
  assert.ok(result.brief, 'a conference turn produces a brief artefact');
  assert.equal(result.brief.anchorSpace.id, 'central');
});

test('a second turn keeps the thread state', async () => {
  const bot = createConcierge({ endpoint: `${base}/agui` });
  await bot.ask('conference for 300 guests');
  const second = await bot.ask('and what is the standing capacity?');
  assert.equal(bot.state.guests, 300);
  assert.match(second.text, /standing|seated/i);
});

test('the JSON API serves the same knowledge', async () => {
  const venues = await (await fetch(`${base}/api/venues`)).json();
  assert.equal(venues.count, 6);
  const media = await (await fetch(`${base}/api/media?category=weddings`)).json();
  assert.ok(media.media.length > 0 && media.media.every((m) => m.category === 'weddings'));
  const brief = await (await fetch(`${base}/api/bot/brief`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'conference for 250 guests' }),
  })).json();
  assert.equal(brief.intent, 'conference');
  assert.ok(brief.brief.anchorSpace.name);
});

test('unknown routes and bad input fail cleanly', async () => {
  assert.equal((await fetch(`${base}/api/venues/nowhere`)).status, 404);
  assert.equal((await fetch(`${base}/api/nope`)).status, 404);
  const bad = await fetch(`${base}/agui`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
  assert.equal(bad.status, 400);
});
