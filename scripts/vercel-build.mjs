import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ['node_modules/prisma/build/index.js', 'generate', '--schema', 'prisma/postgresql/schema.prisma']);

if (process.env.VERCEL_ENV === 'production') {
  run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'prisma/postgresql/schema.prisma']);
}

run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'server/tsconfig.json']);

if (process.env.VERCEL_ENV === 'production') {
  run(process.execPath, ['scripts/sync-aesen-production.mjs']);
}

run(process.execPath, ['node_modules/typescript/bin/tsc', '-b']);
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build']);
