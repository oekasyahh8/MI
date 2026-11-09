import 'dotenv/config';

const [{ ensureAesenD3MiDataset }, { prisma }] = await Promise.all([
  import('../dist-server/data/aesen.js'),
  import('../dist-server/db.js'),
]);

try {
  const result = await ensureAesenD3MiDataset();
  if (!result || result.imported < 1) throw new Error('Dataset Aesen D3 Manajemen Informatika tidak berhasil disiapkan.');
  console.info(`Dataset Aesen production siap: ${result.imported} formasi, ${result.syncedAt}.`);
} finally {
  await prisma.$disconnect();
}
