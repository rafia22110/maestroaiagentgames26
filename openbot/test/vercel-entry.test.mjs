import test from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import server from '../src/vercel.mjs';

test('Vercel entry exports an HTTP server without opening a listener', () => {
  assert.ok(server instanceof Server);
  assert.equal(server.listening, false);
  assert.equal(server.listenerCount('request'), 1);
});
