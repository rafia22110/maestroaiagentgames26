import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createConciergeServer } from './server.mjs';
import { prepareBoardHtml } from './board-html.mjs';

export const ORIGINAL_BOARD = new URL('../../board/source/agent-games-timeline.html', import.meta.url);

export function createCompetitionServer() {
  const existingService = createConciergeServer();
  return createServer((req, res) => {
    try {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      const read = req.method === 'GET' || req.method === 'HEAD';
      if (read && pathname === '/') {
        res.writeHead(302, { location: '/board', 'cache-control': 'no-store' });
        return res.end();
      }
      if (read && ['/board', '/board/', '/agent-games-timeline.html'].includes(pathname)) {
        const html = Buffer.from(prepareBoardHtml(readFileSync(ORIGINAL_BOARD, 'utf8')), 'utf8');
        res.writeHead(200, {
          'content-type': 'text/html; charset=utf-8',
          'content-length': html.byteLength,
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'same-origin'
        });
        return res.end(req.method === 'HEAD' ? undefined : html);
      }
      return existingService.emit('request', req, res);
    } catch (error) {
      console.error('competition_request_failed', error);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ error: 'competition_request_failed' }));
    }
  });
}
