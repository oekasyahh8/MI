import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Production uses the packaged SQLite snapshot. No network database or migration is required.
run(process.execPath, ['node_modules/prisma/build/index.js', 'generate', '--schema', 'prisma/schema.prisma']);

run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'server/tsconfig.json']);

run(process.execPath, ['node_modules/typescript/bin/tsc', '-b']);
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build']);
