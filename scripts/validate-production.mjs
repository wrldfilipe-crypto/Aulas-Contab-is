import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const port = Number(process.env.VALIDATE_PORT || 4173);
const baseUrl = `http://127.0.0.1:${port}`;
const forbiddenInHtml = [
  '/@vite/client',
  'failed to connect to websocket',
  'WebSocket closed without opened',
];
const forbiddenInBundles = [
  '/@vite/client',
  'import.meta.hot',
  'WebSocket closed without opened',
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: process.env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} terminou com código ${code}`)));
  });
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} respondeu HTTP ${response.status}`);
  return response.text();
}

async function waitForServer(child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Servidor de produção terminou antes do health check.');
    try {
      return await fetchText(`${baseUrl}/`);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('Timeout aguardando o servidor de produção.');
}

async function assertSingleReactTree() {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ls', 'react', 'react-dom', '--all', '--json'], {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => {
      try {
        resolve(JSON.parse(stdout || '{}'));
      } catch (error) {
        reject(new Error(`Não foi possível ler npm ls: ${stderr || error.message}`));
      }
      if (code !== 0 && !stdout) reject(new Error(`npm ls falhou: ${stderr}`));
    });
  });

  const versions = new Set();
  const visit = (node, packageName = '') => {
    if (!node || typeof node !== 'object') return;
    if ((packageName === 'react' || packageName === 'react-dom') && node.version) {
      versions.add(`${packageName}@${node.version}`);
    }
    Object.entries(node.dependencies || {}).forEach(([name, dependency]) => visit(dependency, name));
  };
  visit(result);
  const reactVersions = [...versions].filter((value) => value.startsWith('react@'));
  const domVersions = [...versions].filter((value) => value.startsWith('react-dom@'));
  if (reactVersions.length !== 1 || domVersions.length !== 1) {
    throw new Error(`Árvore React não deduplicada: ${[...versions].join(', ')}`);
  }
  console.log(`[validate-production] React deduplicado: ${reactVersions[0]} / ${domVersions[0]}`);
}

function readBuiltFiles() {
  const candidates = [];
  const walk = (directory) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(js|mjs|cjs|html)$/.test(entry.name)) candidates.push(path);
    }
  };
  walk(join(root, 'dist'));
  return candidates;
}

async function main() {
  console.log('[validate-production] 1/4 — limpar e compilar build');
  rmSync(join(root, 'dist'), { recursive: true, force: true });
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);

  console.log('[validate-production] 2/4 — verificar React deduplicado e bundles produzidos');
  await assertSingleReactTree();
  const builtFiles = readBuiltFiles();
  if (builtFiles.length === 0) throw new Error('Nenhum ficheiro foi encontrado em dist.');
  const builtText = builtFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
  const bundleFailures = forbiddenInBundles.filter((needle) => builtText.includes(needle));
  if (bundleFailures.length > 0) {
    throw new Error(`Cliente HMR/WebSocket encontrado no bundle: ${bundleFailures.join(', ')}`);
  }

  console.log('[validate-production] 3/4 — iniciar preview de produção sem HMR');
  const server = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverOutput = '';
  server.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

  try {
    const html = await waitForServer(server);
    console.log('[validate-production] 4/4 — validar HTML, headers e logs');
    const htmlFailures = forbiddenInHtml.filter((needle) => html.toLowerCase().includes(needle.toLowerCase()));
    if (htmlFailures.length > 0) {
      throw new Error(`Cliente HMR/WebSocket encontrado no HTML: ${htmlFailures.join(', ')}`);
    }
    const logFailures = forbiddenInHtml.filter((needle) => serverOutput.toLowerCase().includes(needle.toLowerCase()));
    if (logFailures.length > 0) {
      throw new Error(`Falha HMR/WebSocket encontrada nos logs: ${logFailures.join(', ')}`);
    }
    console.log('PASS: build de produção, React e HMR/WebSocket validados.');
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
