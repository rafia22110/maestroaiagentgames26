import { createConciergeServer } from './server.mjs';
import { boardPage } from './board-page.mjs';

// Fail closed until a shared store and server-side authorization are integrated.
process.env.BOARD_WRITE = '0';
const server = createConciergeServer();
const original = server.listeners('request')[0];
server.removeAllListeners('request');
server.on('request', (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if ((req.method === 'GET' || req.method === 'HEAD') && path === '/') {
    res.writeHead(302, { location: '/board', 'cache-control': 'no-store' });
    return res.end();
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && (path === '/board' || path === '/board/')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" });
    return res.end(req.method === 'HEAD' ? undefined : boardPage);
  }
  return original.call(server, req, res);
});
export default server;
