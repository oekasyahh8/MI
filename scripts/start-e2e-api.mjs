import { spawn, spawnSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const databasePath = path.resolve('prisma/e2e.db');
if (existsSync(databasePath)) unlinkSync(databasePath);

const env = {
  ...process.env,
  DATABASE_URL: 'file:./e2e.db',
  PORT: '4010',
  CORS_ORIGIN: 'http://127.0.0.1:5174',
  AUTO_SYNC_AESEN: 'false',
};

function runNode(args) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runNode(['scripts/ensure-database.mjs']);
runNode(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);

const server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'watch', 'server/src/index.ts'], { env, stdio: 'inherit' });
server.on('error', (error) => { console.error(error); process.exitCode = 1; });
server.on('exit', (code) => { process.exit(code ?? 1); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
