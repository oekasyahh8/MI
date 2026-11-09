import { z } from 'zod';
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../db.js';
import { normalizeEducation, applicantPerSeat } from './normalize.js';

export const AESEN_SOURCE_PAGE = 'https://aesen.vercel.app/casn/2024/formasi';
export const AESEN_API_URL = 'https://aesen.vercel.app/api/casn/2024/formasi';
export const AESEN_PROGRAM_CODE = '4480237';
export const AESEN_PROGRAM_LABEL = 'D-III Manajemen Informatika';
export const AESEN_DATASET_NAME = 'Aesen CASN 2024 — D-III Manajemen Informatika';
export const AESEN_DATASET_SOURCE = 'Aesen API — pendidikan kode 4480237';
const PAGE_SIZE = 100;
const MAX_SOURCE_ROWS = 5_000;
const MAX_SOURCE_PAGES = 50;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const numberValue = z.union([z.number().finite(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)]);
const nullableNumber = z.union([numberValue, z.null()]).optional();
const sourceRowSchema = z.object({
  formasi_id: z.string().min(1),
  ins_nm: z.string().nullable().optional(),
  jabatan_nm: z.string().nullable().optional(),
  lokasi_nm: z.string().nullable().optional(),
  pendidikan_nm: z.string().nullable().optional(),
  jumlah_formasi: numberValue,
  jumlah_ms: nullableNumber,
  gaji_min: nullableNumber,
  gaji_max: nullableNumber,
});
const pageSchema = z.object({
  status: z.string(),
  data: z.array(sourceRowSchema),
  pagination: z.object({
    current_page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    total_pages: z.number().int().nonnegative(),
    total_items: z.number().int().nonnegative(),
  }),
});

export type AesenFormation = z.infer<typeof sourceRowSchema>;
export type AesenSyncResult = { datasetId: number; imported: number; exactMatch: number; manualReview: number; duplicates: number; failed: number; syncedAt: string };
export type AesenSyncState = { syncing: boolean; startedAt: string | null; finishedAt: string | null; lastError: string | null; result: AesenSyncResult | null };

const syncState: AesenSyncState = { syncing: false, startedAt: null, finishedAt: null, lastError: null, result: null };
let inFlight: Promise<AesenSyncResult> | null = null;

const pause = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function pageUrl(page: number): string {
  const url = new URL(AESEN_API_URL);
  url.search = new URLSearchParams({
    page: String(page), limit: String(PAGE_SIZE), instansi_kode: '', jabatan_kode: '',
    pendidikan_kode: AESEN_PROGRAM_CODE, sort_by: '', sort_order: 'desc', search: '',
  }).toString();
  return url.toString();
}

async function readPage(page: number, fetcher: typeof fetch): Promise<z.infer<typeof pageSchema>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetcher(pageUrl(page), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < 2) {
          const retryAfter = Number(response.headers.get('retry-after'));
          await pause(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : 500 * (attempt + 1));
          continue;
        }
        throw new Error(`Aesen mengembalikan HTTP ${response.status} pada halaman ${page}.`);
      }
      const parsed = pageSchema.safeParse(await response.json());
      if (!parsed.success || parsed.data.status.toLowerCase() !== 'success') {
        throw new Error(`Format respons Aesen tidak dikenali pada halaman ${page}.`);
      }
      if (parsed.data.pagination.current_page !== page) throw new Error(`Nomor halaman Aesen tidak cocok pada halaman ${page}.`);
      return parsed.data;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await pause(500 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Gagal membaca data Aesen halaman ${page}.`);
}

export async function fetchAesenD3MiRows(fetcher: typeof fetch = fetch, delay = pause) {
  const rows: AesenFormation[] = [];
  const ids = new Set<string>();
  let totalPages = 0;
  let totalItems = 0;
  let duplicates = 0;

  for (let page = 1; page <= Math.max(totalPages, 1); page += 1) {
    const response = await readPage(page, fetcher);
    if (page === 1) {
      totalPages = response.pagination.total_pages;
      totalItems = response.pagination.total_items;
      if (totalItems > MAX_SOURCE_ROWS || totalPages > MAX_SOURCE_PAGES) {
        throw new Error(`Hasil Aesen (${totalItems} baris) melebihi batas sinkronisasi aman ${MAX_SOURCE_ROWS} baris.`);
      }
      if (response.pagination.per_page > PAGE_SIZE) throw new Error('Batas halaman Aesen berubah; sinkronisasi dibatalkan untuk ditinjau.');
    } else if (response.pagination.total_pages !== totalPages || response.pagination.total_items !== totalItems) {
      throw new Error('Jumlah halaman Aesen berubah saat sinkronisasi; coba ulangi nanti.');
    }

    for (const row of response.data) {
      if (ids.has(row.formasi_id)) { duplicates += 1; continue; }
      ids.add(row.formasi_id);
      rows.push(row);
    }
    if (page < totalPages) await delay(125);
  }

  if (rows.length !== totalItems) {
    throw new Error(`Aesen menyatakan ${totalItems} baris, tetapi hanya ${rows.length} ID unik berhasil dibaca.`);
  }
  return { rows, totalItems, totalPages, duplicates };
}

export function mapAesenFormation(source: AesenFormation, datasetId: number, importBatchId: number): Prisma.FormationUncheckedCreateInput {
  const rawEducation = source.pendidikan_nm?.trim() || null;
  const applicants = source.jumlah_ms ?? null;
  const quota = Number(source.jumlah_formasi);
  const hasRawEducation = Boolean(rawEducation);
  return {
    sourceId: source.formasi_id,
    datasetYear: 2024,
    procurementType: null,
    formationType: null,
    positionName: source.jabatan_nm?.trim() || 'Jabatan belum tersedia',
    agencyName: source.ins_nm?.trim() || 'Instansi belum tersedia',
    unitWorkName: source.lokasi_nm?.trim() || null,
    placementName: null,
    province: null,
    regency: null,
    educationLevel: 'D-III',
    requiredEducationRaw: rawEducation,
    requiredEducationNormalized: normalizeEducation(rawEducation),
    quota: Number.isSafeInteger(quota) && quota >= 0 ? quota : 0,
    applicantCount: applicants === null ? null : Number(applicants),
    applicantPerSeat: applicants !== null && quota > 0 ? applicantPerSeat(Number(applicants), quota) : null,
    salaryMin: source.gaji_min == null ? null : Number(source.gaji_min) * 1_000_000,
    salaryMax: source.gaji_max == null ? null : Number(source.gaji_max) * 1_000_000,
    salaryCurrency: 'IDR',
    matchingCategory: hasRawEducation ? 'EXACT_MATCH' : 'MANUAL_REVIEW',
    matchingReason: hasRawEducation
      ? `Disaring oleh sumber Aesen dengan kode prodi ${AESEN_PROGRAM_CODE} (${AESEN_PROGRAM_LABEL}); teks persyaratan asli dipertahankan untuk verifikasi.`
      : `Kode prodi Aesen cocok dengan ${AESEN_PROGRAM_LABEL}, tetapi teks persyaratan kosong sehingga perlu verifikasi manual.`,
    dataSource: 'Aesen CASN 2024',
    datasetId,
    importBatchId,
  };
}

async function persistAesenRows(client: PrismaClient, sourceRows: AesenFormation[], duplicates: number): Promise<AesenSyncResult> {
  const existing = await client.dataset.findFirst({ where: { name: AESEN_DATASET_NAME, source: AESEN_DATASET_SOURCE }, orderBy: { importedAt: 'desc' } });
  const manualReview = sourceRows.filter((row) => !row.pendidikan_nm?.trim()).length;
  const failed = sourceRows.filter((row) => !Number.isSafeInteger(Number(row.jumlah_formasi)) || Number(row.jumlah_formasi) < 0 || !row.jabatan_nm?.trim() || !row.ins_nm?.trim()).length;
  const validRows = sourceRows.filter((row) => !failedRow(row));
  if (!validRows.length) throw new Error('Aesen tidak mengembalikan baris formasi yang dapat disimpan.');
  const syncedAt = new Date();

  return client.$transaction(async (tx) => {
    const dataset = existing
      ? await tx.dataset.update({ where: { id: existing.id }, data: { importedAt: syncedAt, recordCount: validRows.length, status: 'source-synced', notes: `${validRows.length} formasi hasil filter prodi ${AESEN_PROGRAM_CODE}; data sumber historis 2024.` } })
      : await tx.dataset.create({ data: { name: AESEN_DATASET_NAME, year: 2024, source: AESEN_DATASET_SOURCE, status: 'source-synced', recordCount: validRows.length, notes: `Sinkron otomatis dari ${AESEN_API_URL}; filter kode prodi ${AESEN_PROGRAM_CODE}.` } });
    const batch = await tx.importBatch.create({ data: {
      datasetId: dataset.id, fileName: 'aesen-api-d3-mi', source: AESEN_API_URL,
      notes: `Filter pendidikan kode ${AESEN_PROGRAM_CODE}; halaman diminta berurutan (${Math.ceil(sourceRows.length / PAGE_SIZE)} halaman, maksimum 100 baris/halaman).`,
      recordCount: validRows.length, failedCount: failed, duplicateCount: duplicates,
    } });

    for (const source of validRows) {
      const create = mapAesenFormation(source, dataset.id, batch.id);
      const sourceId = source.formasi_id;
      const { datasetId, importBatchId, ...update } = create;
      await tx.formation.upsert({
        where: { datasetId_sourceId: { datasetId: dataset.id, sourceId } },
        create,
        update: { ...update, datasetId: dataset.id, importBatchId: batch.id },
      });
    }
    await tx.formation.deleteMany({ where: { datasetId: dataset.id, OR: [{ sourceId: null }, { sourceId: { notIn: validRows.map((row) => row.formasi_id) } }] } });
    const exactMatch = await tx.formation.count({ where: { datasetId: dataset.id, matchingCategory: 'EXACT_MATCH' } });
    await tx.dataset.update({ where: { id: dataset.id }, data: { recordCount: validRows.length } });
    return { datasetId: dataset.id, imported: validRows.length, exactMatch, manualReview, duplicates, failed, syncedAt: syncedAt.toISOString() };
  }, { timeout: 120_000 });
}

function failedRow(row: AesenFormation): boolean {
  const quota = Number(row.jumlah_formasi);
  return !Number.isSafeInteger(quota) || quota < 0 || !row.jabatan_nm?.trim() || !row.ins_nm?.trim();
}

export function getAesenSyncState(): AesenSyncState { return { ...syncState }; }

export async function syncAesenD3MiDataset(client: PrismaClient = prisma): Promise<AesenSyncResult> {
  if (inFlight) return inFlight;
  syncState.syncing = true;
  syncState.startedAt = new Date().toISOString();
  syncState.lastError = null;
  const job = (async () => {
    const source = await fetchAesenD3MiRows();
    return persistAesenRows(client, source.rows, source.duplicates);
  })();
  inFlight = job;
  try {
    const result = await job;
    syncState.result = result;
    syncState.finishedAt = result.syncedAt;
    return result;
  } catch (error) {
    syncState.lastError = error instanceof Error ? error.message : 'Sinkronisasi Aesen gagal.';
    syncState.finishedAt = new Date().toISOString();
    throw error;
  } finally {
    syncState.syncing = false;
    inFlight = null;
  }
}

export async function ensureAesenD3MiDataset(client: PrismaClient = prisma): Promise<AesenSyncResult | null> {
  const existing = await client.dataset.findFirst({ where: { name: AESEN_DATASET_NAME, source: AESEN_DATASET_SOURCE }, orderBy: { importedAt: 'desc' } });
  if (existing && existing.recordCount > 0 && Date.now() - existing.importedAt.getTime() < CACHE_TTL_MS) {
    return syncState.result ?? {
      datasetId: existing.id, imported: existing.recordCount, exactMatch: 0, manualReview: 0,
      duplicates: 0, failed: 0, syncedAt: existing.importedAt.toISOString(),
    };
  }
  return syncAesenD3MiDataset(client);
}
