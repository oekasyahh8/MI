import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();
const connection = process.env.DATABASE_URL ?? 'file:./dev.db';
if (!connection.startsWith('file:')) throw new Error('DATABASE_URL untuk aplikasi lokal harus menggunakan SQLite file: URL.');
const relativePath = decodeURIComponent(connection.slice('file:'.length).split('?')[0]);
if (!relativePath || relativePath === ':memory:') process.exit(0);
const databasePath = path.isAbsolute(relativePath) ? relativePath : path.resolve('prisma', relativePath);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const handle = fs.openSync(databasePath, 'a');
fs.closeSync(handle);
console.info(`SQLite siap: ${databasePath}`);
