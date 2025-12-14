import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(new URL('.', import.meta.url).pathname, '..');
const tmpDir = resolve(root, '.tmp');
const dbPath = resolve(tmpDir, 'test.db');

mkdirSync(tmpDir, { recursive: true });
rmSync(dbPath, { force: true });

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: `file:${dbPath}`
};

const result = spawnSync('prisma', ['db', 'push', '--skip-generate'], {
  cwd: root,
  env,
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
