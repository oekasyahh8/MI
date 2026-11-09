import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { PrismaClient } from '@prisma/client';

if (process.env.VERCEL === '1') {
  const snapshotPath = path.resolve(process.cwd(), 'prisma', 'offline.sqlite.gz');
  const runtimePath = path.join('/tmp', 'mi-casn-offline.sqlite');
  fs.writeFileSync(runtimePath, gunzipSync(fs.readFileSync(snapshotPath)));
  process.env.DATABASE_URL = `file:${runtimePath}`;
  process.env.AUTO_SYNC_AESEN = 'false';
}

export const prisma = new PrismaClient();
