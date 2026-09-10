// E2E orchestrator: boot the stack in REAL-API mode for Playwright.
//
//   1. Reuses the backend dev server on :5000 if already healthy, else starts it.
//   2. Runs `npm run seed` (idempotent) to restore canonical demo data.
//   3. Starts the Vite dev server on :3000 with mocks disabled.
//
// Playwright kills this process when the run finishes; on Windows the child
// trees are torn down with `taskkill /t /f` to release the ports.

import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');
const backendRoot = path.resolve(frontendRoot, '..', 'backend');

const VITE_PORT = 3000;
const BACKEND_URL = 'http://localhost:5000';
const isWin = process.platform === 'win32';

const children = new Set();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (msg) => console.log(`[e2e-server] ${msg}`);

function killTree(child) {
  if (!child || child.pid === undefined) return;
  if (isWin) {
    try {
      execSync(`taskkill /pid ${child.pid} /t /f`, { stdio: 'ignore' });
    } catch {
      /* already gone */
    }
  } else {
    try {
      child.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
}

function shutdown() {
  for (const child of children) killTree(child);
  children.clear();
}

async function httpOK(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitFor(url, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await httpOK(url)) return true;
    await sleep(1000);
  }
  return false;
}

function run(cmd, args, cwd, env = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: isWin,
  });
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}

async function main() {
  process.on('SIGINT', () => {
    shutdown();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    shutdown();
    process.exit(143);
  });
  process.on('exit', shutdown);

  // 1) Backend — reuse a healthy dev server, otherwise start one.
  if (await httpOK(`${BACKEND_URL}/health`)) {
    log(`Backend already healthy on :5000 - reusing.`);
  } else {
    log(`Starting backend dev server...`);
    run('npm', ['run', 'dev'], backendRoot, {
      // Self-contained demo: OCR from upload buffer, no external media creds.
      CLOUDINARY_ENABLED: 'false',
    });
    if (!(await waitFor(`${BACKEND_URL}/health`, 60_000))) {
      log('Backend failed to become healthy.');
      shutdown();
      process.exit(1);
    }
    log('Backend healthy.');
  }

  // 2) Seed — idempotent, restores canonical demo data.
  log('Running seed...');
  const seed = run('npm', ['run', 'seed'], backendRoot);
  const seedExit = await new Promise((resolve) => seed.on('exit', resolve));
  if (seedExit !== 0) {
    log('Seed failed.');
    shutdown();
    process.exit(1);
  }
  log('Seed complete.');

  // 3) Frontend dev server in real-API mode (process env beats .env files).
  log('Starting frontend dev server (real API mode)...');
  run('npm', ['run', 'dev'], frontendRoot, {
    VITE_USE_MOCK_API: 'false',
    VITE_DEMO_FEATURES: 'false',
    VITE_API_BASE_URL: `${BACKEND_URL}/api/v1`,
  });
  if (!(await waitFor(`http://localhost:${VITE_PORT}`, 60_000))) {
    log('Frontend failed to become ready.');
    shutdown();
    process.exit(1);
  }
  log(`Frontend ready on http://localhost:${VITE_PORT} - holding until Playwright finishes.`);

  // Keep the process alive until Playwright terminates us.
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  shutdown();
  process.exit(1);
});