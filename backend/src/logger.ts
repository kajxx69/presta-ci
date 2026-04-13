import { promises as fs } from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB rotation

let ensured = false;

async function ensureDir() {
  if (ensured) return;
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch {}
  ensured = true;
}

async function rotateIfNeeded() {
  try {
    const stat = await fs.stat(LOG_FILE);
    if (stat.size > MAX_SIZE) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      await fs.rename(LOG_FILE, path.join(LOG_DIR, `app-${ts}.log`));
    }
  } catch {}
}

function formatLine(level: string, message: string): string {
  return `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
}

async function writeLine(level: string, message: string) {
  await ensureDir();
  const line = formatLine(level, message);
  // Also keep console output
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
  // Write to file
  try {
    await fs.appendFile(LOG_FILE, line + '\n', 'utf-8');
    await rotateIfNeeded();
  } catch {}
}

export const logger = {
  info: (msg: string) => writeLine('info', msg),
  warn: (msg: string) => writeLine('warn', msg),
  error: (msg: string) => writeLine('error', msg),
  request: (method: string, path: string, status?: number, ms?: number) => {
    const parts = [`${method} ${path}`];
    if (status !== undefined) parts.push(`${status}`);
    if (ms !== undefined) parts.push(`${ms}ms`);
    return writeLine('info', parts.join(' - '));
  },
};
