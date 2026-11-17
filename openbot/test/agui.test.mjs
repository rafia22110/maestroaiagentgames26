import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectRun } from '../src/agui.mjs';
import { runTurn } from '../src/brain.mjs';
import { kb } from '../src/kb.mjs';
import { buildKnowledge } from '../scripts/build-kb.mjs';

const run = (text) => collectRun({ threadId: 't', runId: 'r', messages: [{ id: 'm1', role: 'user', content: text }] });

const answerOf = (events) => events.filter((e) => e.type === 'TEXT_MESSAGE_CONTENT').map((e) => e.delta).join('');

test('the checked-in knowledge base matches its generator', () => {
  const { venueById, documentById, ...onDisk } = kb();
  assert.deepEqual(onDisk, buildKnowledge());
});

test('a run is a well-formed AG-UI stream', async () => {
  const events = await run('Conference for 250 guests, theatre style');
  assert.equal(events[0].type, 'RUN_STARTED');
  assert.equal(events.at(-1).type, 'RUN_FINISHED');
  assert.ok(events.some((e) => e.type === 'TOOL_CALL_START' && e.toolCallName === 'match_venue'));
  assert.ok(events.some((e) => e.type === 'TOOL_CALL_RESULT'));
  assert.ok(events.some((e) => e.type === 'TEXT_MESSAGE_START'));
  assert.ok(events.some((e) => e.type === 'STATE_SNAPSHOT'));
  const stages = events.filter((e) => e.type === 'CUSTOM' && e.name === 'bot.stage').map((e) => e.value.stage);
  assert.deepEqual(stages, ['intake', 'capacity_check', 'curatorial_constraints', 'gallery_match', 'brief', 'human_handoff']);
});

test('every answer ends at the official inquiry form', async () => {
  const events = await run('Weddings for 180 guests');
  const finished = events.at(-1);
  assert.equal(finished.type, 'RUN_FINISHED');
  assert.match(finished.result.handoff, /exploratorium\.edu\/rentals\/form$/);
  assert.ok(finished.result.citations.length >= 2);
  for (const citation of finished.result.citations) assert.match(citation.url, /^https?:\/\//);
});

test('capacity answers come from the published figures', () => {
  const turn = runTurn({ text: 'capacity for 250 guests theatre' });
  assert.equal(turn.intent, 'capacity');
  assert.match(turn.answer, /Bechtel Central & Outdoor Gallery/);
  assert.match(turn.answer, /500 seated/);
});

test('pricing and availability are refused, never invented', async () => {
  for (const question of ['How much does a Saturday cost?', 'Is June 12 2027 available?']) {
    const events = await run(question);
    const answer = answerOf(events);
    assert.ok(!/\$\s?\d/.test(answer), `no dollar figure in: ${answer}`);
    assert.match(answer, /can't quote pricing or confirm a date|only confirmed by the Events Team|official inquiry form/i);
    assert.equal(events.at(-1).result.handoff, kb().contact.form);
  }
});

test('Hebrew requests are answered in Hebrew', () => {
  const turn = runTurn({ text: 'אני צריך אירוע ל-300 אורחים, קבלת פנים' });
  assert.equal(turn.language, 'he');
  assert.match(turn.answer, /[\u0590-\u05FF]/);
  assert.ok(turn.citations.length >= 1);
});

test('media requests return gallery tiles from the extracted collections', () => {
  const turn = runTurn({ text: 'show me wedding photos' });
  assert.equal(turn.intent, 'media');
  const result = turn.calls.find((c) => c.name === 'search_media').result;
  assert.ok(result.media.length > 0);
  assert.ok(result.media.every((m) => m.source.startsWith('http')));
});
