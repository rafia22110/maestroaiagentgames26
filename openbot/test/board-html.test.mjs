import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { prepareBoardHtml } from '../src/board-html.mjs';

test('Cloudflare wrapper is removed without changing script body', () => {
  const raw = '<script type="1fafbc169e967bae77e35573-text/javascript">window.ready = true;</script><script src="/cdn-cgi/scripts/id/cloudflare-static/rocket-loader.min.js" defer></script>';
  assert.equal(prepareBoardHtml(raw), '<script type="text/javascript">window.ready = true;</script>');
  const plain = '<script type="application/json">{"ok":true}</script>';
  assert.equal(prepareBoardHtml(plain), plain);
});

test('original board keeps its content and has parseable executable code', () => {
  const source = readFileSync(new URL('../../board/source/agent-games-timeline.html', import.meta.url), 'utf8');
  const html = prepareBoardHtml(source);
  assert.doesNotMatch(html, /type=["'][a-f0-9]+-text\/javascript/i);
  assert.doesNotMatch(html, /src=["']\/cdn-cgi\/scripts\//i);
  for (const id of ['tab-checklist', 'tab-whiteboard', 'tab-gate', 'tab-schedule', 'tab-venues', 'tab-judging']) assert.ok(html.includes('id="' + id + '"'));
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(match => !/\bsrc\s*=/i.test(match[1]));
  assert.ok(scripts.length > 0);
  for (const match of scripts) new Script(match[2]);
  assert.equal(prepareBoardHtml(html), html);
});
