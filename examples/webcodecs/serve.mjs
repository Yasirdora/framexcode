// Zero-dependency static server for the demo. Serves the repository root so the
// page can import ../../dist/index.js. Binds to localhost, where WebCodecs is
// available because localhost counts as a secure context.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const port = Number(process.env.PORT ?? 8080);
const demo = '/examples/webcodecs/';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
};

const server = createServer(async (request, response) => {
  const send = (status, body, headers = {}) => {
    response.writeHead(status, { 'cache-control': 'no-store', ...headers });
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return send(405, 'Method not allowed', { allow: 'GET, HEAD' });

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    return send(400, 'Bad request');
  }
  if (pathname === '/') return send(302, '', { location: demo });

  const file = resolve(join(root, pathname));
  if (file !== root && !file.startsWith(root + sep))
    return send(403, 'Forbidden');
  try {
    const info = await stat(file);
    if (info.isDirectory()) {
      // Relative imports need the trailing slash.
      if (!pathname.endsWith('/')) return send(301, '', { location: pathname + '/' });
      return send(200, await readFile(join(file, 'index.html')), { 'content-type': types['.html'] });
    }
    send(200, await readFile(file), { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  } catch {
    send(404, 'Not found');
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Try PORT=8081 npm run demo.` : error);
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`framecode demo: http://localhost:${port}${demo}`);
});
