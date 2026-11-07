// Local static preview of the included build; no npm install, API or backend.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8' };
try { await stat(resolve(root, 'index.html')); }
catch { console.error('Build ausente. Execute npm ci e npm run build, ou extraia o ZIP completo.'); process.exit(1); }

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const url = new URL(request.url, 'http://localhost');
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Arquivo não encontrado.'); }
});
let port = Number(process.env.INTERCAMBIO_PORT || 5180), attempts = 0;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && attempts++ < 20) { port++; server.listen(port, '127.0.0.1'); }
  else { console.error('Não foi possível abrir a prévia local:', error.message); process.exit(1); }
});
server.on('listening', () => {
  const url = `http://localhost:${port}`;
  console.log(`INTERCÂMBIO — Capítulo 1: A Despedida\nAbra ${url}\nMantenha esta janela aberta enquanto joga. Ctrl+C encerra.`);
  if (process.argv.includes('--open')) {
    const child = process.platform === 'win32' ? spawn('rundll32', ['url.dll,FileProtocolHandler', url])
      : process.platform === 'darwin' ? spawn('open', [url]) : spawn('xdg-open', [url]);
    child.on('error', () => console.log(`Abra o navegador em ${url}`)); child.unref();
  }
});
server.listen(port, '127.0.0.1');
