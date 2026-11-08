import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../', import.meta.url));
const npm = process.env.npm_execpath;
if (!npm) throw Error('Use npm run verify para verificar o projeto.');

function command(arguments_, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, arguments_, { cwd: directory, env: { ...process.env, ...extraEnv }, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(Error(`Verificação falhou (${code ?? signal}): ${arguments_.join(' ')}`)));
  });
}
let preview;
try {
  for (const check of ['typecheck', 'test', 'build']) await command([npm, 'run', check]);
  try {
    await fetch('http://127.0.0.1:4181');
    throw Error('A porta 4181 está ocupada. Encerre a prévia anterior antes de verificar este build.');
  } catch (error) { if (error.message.includes('ocupada')) throw error; }
  preview = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
    'preview', '--host', '127.0.0.1', '--port', '4181', '--strictPort'], { cwd: directory, stdio: 'inherit' });
  let stopped = false;
  preview.on('error', () => { stopped = true; }); preview.on('exit', () => { stopped = true; });
  let ready = false;
  for (let attempt = 0; attempt < 50 && !stopped && !ready; attempt++) {
    try { ready = (await fetch('http://127.0.0.1:4181')).ok; } catch { /* Server is starting. */ }
    if (!ready) await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!ready) throw Error('A prévia do build não iniciou na porta 4181.');
  await command([fileURLToPath(new URL('../tests/bedroom-browser.mjs', import.meta.url))], { INTERCAMBIO_URL: 'http://127.0.0.1:4181' });
  await command([fileURLToPath(new URL('../tests/browser.mjs', import.meta.url))], { INTERCAMBIO_URL: 'http://127.0.0.1:4181' });
  console.log('O INTERCÂMBIO: TypeScript, testes, build e fluxo real no navegador concluídos. Inspecione as capturas e as medições em /tmp/o-intercambio-*.');
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally { preview?.kill(); }
