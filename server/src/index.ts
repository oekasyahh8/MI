import 'dotenv/config';
import { timingSafeEqual } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import ExcelJS from 'exceljs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from './db.js';
import { getStagedImport, parseUploadedFile, removeStagedImport, stageImport, suggestMapping, transformRows, fieldKeys, type ColumnMapping } from './data/importer.js';
import { AESEN_DATASET_NAME, AESEN_DATASET_SOURCE, AESEN_PROGRAM_CODE, AESEN_PROGRAM_LABEL, AESEN_SOURCE_PAGE, ensureAesenD3MiDataset, getAesenSyncState, syncAesenD3MiDataset } from './data/aesen.js';
import { competitionLabel } from './data/normalize.js';
import { scoreRecommendation } from './data/recommendation.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const uploadMb = Number(process.env.UPLOAD_MAX_MB ?? 25);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((v) => v.trim()) ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }));

let initialDataSync: Promise<unknown> | null = null;
function beginInitialDataSync() {
  if (initialDataSync || process.env.AUTO_SYNC_AESEN === 'false') return;
  initialDataSync = ensureAesenD3MiDataset().then((result) => {
    if (result) console.info(`Data Aesen D3 MI siap: ${result.imported} formasi, pembaruan ${result.syncedAt}.`);
    return result;
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Sinkronisasi sumber gagal.';
    console.error(`[source-sync] ${new Date().toISOString()} ${message}`);
    return null;
  });
}
app.use('/api', (req, res, next) => {
  const syncExemptPaths = ['/health', '/source/aesen/status', '/source/aesen/sync', '/source/aesen/cron'];
  if (syncExemptPaths.includes(req.path)) { next(); return; }
  if (!initialDataSync) { next(); return; }
  void initialDataSync.then(() => next()).catch(() => next());
});

const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: uploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx', 'json'].includes(ext ?? '')) return cb(new Error('Ekstensi file tidak didukung.'));
    const mime = file.mimetype.toLowerCase();
    const allowed = new Set(['text/csv', 'application/csv', 'text/plain', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream', 'application/zip']);
    if (!allowed.has(mime)) return cb(new Error('Tipe MIME file tidak didukung. Pastikan file berformat CSV, XLSX, atau JSON.'));
    cb(null, true);
  },
});

const numberParam = z.coerce.number().finite();
function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = numberParam.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
function textParam(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }

function buildWhere(query: Record<string, unknown>): Prisma.FormationWhereInput {
  const and: Prisma.FormationWhereInput[] = [];
  const year = optionalNumber(query.year);
  if (year) and.push({ datasetYear: year });
  const ids = textParam(query.ids)?.split(',').map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
  if (ids?.length) and.push({ id: { in: ids } });
  const fields: [string, string][] = [
    ['agency', 'agencyName'], ['position', 'positionName'], ['unitWork', 'unitWorkName'],
    ['province', 'province'], ['regency', 'regency'], ['educationLevel', 'educationLevel'],
    ['procurementType', 'procurementType'], ['formationType', 'formationType'],
  ];
  for (const [param, field] of fields) {
    const value = textParam(query[param]);
    if (value) and.push({ [field]: { contains: value } } as Prisma.FormationWhereInput);
  }
  const match = textParam(query.matchingCategory);
  if (match && ['EXACT_MATCH', 'RELATED_MATCH', 'MANUAL_REVIEW', 'NO_MATCH'].includes(match)) and.push({ matchingCategory: match });
  const q = textParam(query.q);
  if (q) and.push({ OR: ['positionName', 'agencyName', 'unitWorkName', 'requiredEducationRaw', 'province', 'regency'].map((field) => ({ [field]: { contains: q } })) });
  if (textParam(query.it) === 'true') and.push({ OR: ['INFORMAT', 'KOMPUT', 'TEKNOLOGI INFORMASI', 'SISTEM INFORMASI', 'APLIKASI'].map((term) => ({ positionName: { contains: term } })) });
  const ranges: [string, string, string][] = [
    ['minQuota', 'quota', 'gte'], ['maxQuota', 'quota', 'lte'], ['minSalary', 'salaryMin', 'gte'], ['maxSalary', 'salaryMax', 'lte'],
    ['minApplicants', 'applicantCount', 'gte'], ['maxApplicants', 'applicantCount', 'lte'], ['minRatio', 'applicantPerSeat', 'gte'], ['maxRatio', 'applicantPerSeat', 'lte'],
  ];
  for (const [param, field, op] of ranges) {
    const value = optionalNumber(query[param]);
    if (value !== undefined) and.push({ [field]: { [op]: value } } as Prisma.FormationWhereInput);
  }
  return and.length ? { AND: and } : {};
}

function safePage(value: unknown, fallback: number, max: number) {
  const number = Math.trunc(optionalNumber(value) ?? fallback);
  return Math.max(1, Math.min(max, number));
}
function response<T>(data: T, meta?: unknown) { return { success: true, data, ...(meta ? { meta } : {}) }; }

app.get('/api/health', (_req, res) => res.json(response({ status: 'ok', service: 'MI CASN Analytics API', time: new Date().toISOString() })));

app.get('/api/source/aesen/status', async (_req, res, next) => {
  try {
    const dataset = await prisma.dataset.findFirst({ where: { name: AESEN_DATASET_NAME, source: AESEN_DATASET_SOURCE }, orderBy: { importedAt: 'desc' } });
    const state = getAesenSyncState();
    const [exactMatch, manualReview] = dataset ? await Promise.all([
      prisma.formation.count({ where: { datasetId: dataset.id, matchingCategory: 'EXACT_MATCH' } }),
      prisma.formation.count({ where: { datasetId: dataset.id, matchingCategory: 'MANUAL_REVIEW' } }),
    ]) : [0, 0];
    res.json(response({
      enabled: process.env.AUTO_SYNC_AESEN !== 'false', syncing: state.syncing, datasetId: dataset?.id ?? null,
      datasetName: AESEN_DATASET_NAME, recordCount: dataset?.recordCount ?? 0, exactMatch, manualReview,
      lastSyncAt: dataset?.importedAt ?? state.finishedAt, lastError: state.lastError,
      refreshAfter: dataset ? new Date(dataset.importedAt.getTime() + 24 * 60 * 60 * 1000) : null,
      source: AESEN_SOURCE_PAGE, programCode: AESEN_PROGRAM_CODE, program: AESEN_PROGRAM_LABEL,
    }));
  } catch (error) { next(error); }
});

const aesenSyncRateLimit = rateLimit({ windowMs: 10 * 60_000, limit: 1, standardHeaders: true, legacyHeaders: false });
app.post('/api/source/aesen/sync', aesenSyncRateLimit, async (_req, res, next) => {
  try {
    if (process.env.VERCEL === '1') { res.status(410).json({ success: false, error: 'Dataset production adalah snapshot offline dan tidak disinkronkan.' }); return; }
    if (process.env.AUTO_SYNC_AESEN === 'false') { res.status(409).json({ success: false, error: 'Sinkronisasi Aesen dinonaktifkan oleh konfigurasi.' }); return; }
    res.json(response(await syncAesenD3MiDataset()));
  } catch (error) { next(error); }
});

app.get('/api/source/aesen/cron', async (req, res, next) => {
  if (process.env.VERCEL === '1') { res.status(410).json({ success: false, error: 'Dataset production adalah snapshot offline dan tidak disinkronkan.' }); return; }
  const secret = process.env.CRON_SECRET;
  const authorization = req.get('authorization') ?? '';
  const expected = secret ? `Bearer ${secret}` : '';
  const authorized = Boolean(expected) && Buffer.byteLength(authorization) === Buffer.byteLength(expected)
    && timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
  if (!authorized) { res.status(401).json({ success: false, error: 'Unauthorized.' }); return; }
  try {
    if (process.env.AUTO_SYNC_AESEN === 'false') { res.status(409).json({ success: false, error: 'Sinkronisasi Aesen dinonaktifkan oleh konfigurasi.' }); return; }
    res.json(response(await syncAesenD3MiDataset()));
  } catch (error) { next(error); }
});

app.get('/api/formations', async (req, res, next) => {
  try {
    const page = safePage(req.query.page, 1, 10_000_000);
    const pageSize = safePage(req.query.pageSize, 25, 100);
    const sortByAllowed = new Set(['positionName', 'agencyName', 'quota', 'applicantCount', 'province', 'salaryMin', 'salaryMax', 'datasetYear']);
    const requestedSort = textParam(req.query.sortBy) ?? 'positionName';
    const sortBy = sortByAllowed.has(requestedSort) ? requestedSort : 'positionName';
    const orderBy = textParam(req.query.sortOrder) === 'desc' ? 'desc' : 'asc';
    const where = buildWhere(req.query as Record<string, unknown>);
    const [items, total] = await Promise.all([
      prisma.formation.findMany({ where, orderBy: { [sortBy]: orderBy } as Prisma.FormationOrderByWithRelationInput, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.formation.count({ where }),
    ]);
    res.json(response(items, { page, pageSize, total, pageCount: Math.ceil(total / pageSize) }));
  } catch (error) { next(error); }
});

app.get('/api/formations/export', async (req, res, next) => {
  try {
    const rows = await prisma.formation.findMany({ where: buildWhere(req.query as Record<string, unknown>), orderBy: { positionName: 'asc' }, take: 250_000 });
    const format = textParam(req.query.format) ?? 'csv';
    const columns: Record<string, string> = {
      positionName: 'Jabatan', agencyName: 'Instansi', unitWorkName: 'Unit Kerja', placementName: 'Lokasi Penempatan',
      province: 'Provinsi', regency: 'Kabupaten/Kota', educationLevel: 'Jenjang Pendidikan', requiredEducationRaw: 'Pendidikan Dipersyaratkan',
      quota: 'Jumlah Formasi', applicantCount: 'Jumlah Pelamar', applicantPerSeat: 'Pelamar per Kursi', salaryMin: 'Gaji Minimum', salaryMax: 'Gaji Maksimum',
      procurementType: 'Jenis Pengadaan', formationType: 'Jenis Formasi', matchingCategory: 'Kategori Kecocokan', matchingReason: 'Alasan Kecocokan', dataSource: 'Sumber Data', datasetYear: 'Tahun',
    };
    const data = rows.map((row) => Object.fromEntries(Object.entries(columns).map(([field, label]) => [label, row[field as keyof typeof row] ?? ''])));
    const base = `mi-casn-formasi-${new Date().toISOString().slice(0, 10)}`;
    if (format === 'json') { res.type('application/json').attachment(`${base}.json`).send(JSON.stringify(data)); return; }
    if (format === 'xlsx') {
      const book = new ExcelJS.Workbook();
      const sheet = book.addWorksheet('Formasi');
      sheet.columns = Object.entries(columns).map(([key, header]) => ({ header, key, width: 22 }));
      sheet.addRows(data);
      const content = await book.xlsx.writeBuffer();
      res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').attachment(`${base}.xlsx`).send(content); return;
    }
    const papa = await import('papaparse');
    res.type('text/csv; charset=utf-8').attachment(`${base}.csv`).send(`\uFEFF${papa.default.unparse(data)}`);
  } catch (error) { next(error); }
});

app.get('/api/formations/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) { res.status(400).json({ success: false, error: 'ID formasi tidak valid.' }); return; }
    const item = await prisma.formation.findUnique({ where: { id } });
    if (!item) { res.status(404).json({ success: false, error: 'Formasi tidak ditemukan.' }); return; }
    res.json(response(item));
  } catch (error) { next(error); }
});

app.get('/api/dashboard/overview', async (req, res, next) => {
  try {
    const where = buildWhere(req.query as Record<string, unknown>);
    const [totalRecords, quotaSum, agencies, positions, units, provinces, matchingRecords, matchingQuota, relatedRecords, manualRecords,
      agencyGroups, positionGroups, provinceGroups, procurementGroups, educationGroups] = await Promise.all([
      prisma.formation.count({ where }),
      prisma.formation.aggregate({ where, _sum: { quota: true } }),
      prisma.formation.findMany({ where, distinct: ['agencyName'], select: { agencyName: true } }),
      prisma.formation.findMany({ where, distinct: ['positionName'], select: { positionName: true } }),
      prisma.formation.findMany({ where, distinct: ['unitWorkName'], select: { unitWorkName: true } }),
      prisma.formation.findMany({ where, distinct: ['province'], select: { province: true } }),
      prisma.formation.count({ where: { AND: [where, { matchingCategory: 'EXACT_MATCH' }] } }),
      prisma.formation.aggregate({ where: { AND: [where, { matchingCategory: 'EXACT_MATCH' }] }, _sum: { quota: true } }),
      prisma.formation.count({ where: { AND: [where, { matchingCategory: 'RELATED_MATCH' }] } }),
      prisma.formation.count({ where: { AND: [where, { matchingCategory: 'MANUAL_REVIEW' }] } }),
      prisma.formation.groupBy({ by: ['agencyName'], where, _sum: { quota: true }, _count: { _all: true }, orderBy: { _sum: { quota: 'desc' } }, take: 8 }),
      prisma.formation.groupBy({ by: ['positionName'], where, _sum: { quota: true }, _count: { _all: true }, orderBy: { _sum: { quota: 'desc' } }, take: 8 }),
      prisma.formation.groupBy({ by: ['province'], where, _sum: { quota: true }, _count: { _all: true }, orderBy: { _sum: { quota: 'desc' } }, take: 10 }),
      prisma.formation.groupBy({ by: ['procurementType'], where, _count: { _all: true }, orderBy: { _count: { procurementType: 'desc' } }, take: 8 }),
      prisma.formation.groupBy({ by: ['educationLevel'], where, _sum: { quota: true }, _count: { _all: true }, orderBy: { _sum: { quota: 'desc' } }, take: 8 }),
    ]);
    res.json(response({
      totalRecords, totalQuota: quotaSum._sum.quota ?? 0, uniqueAgencies: agencies.length, uniquePositions: positions.length,
      uniqueUnits: units.filter((x) => x.unitWorkName).length, matchingRecords, matchingQuota: matchingQuota._sum.quota ?? 0,
      placementRegions: provinces.filter((x) => x.province).length, relatedRecords, manualReviewRecords: manualRecords,
      charts: {
        agencies: agencyGroups.map((x) => ({ name: x.agencyName, quota: x._sum.quota ?? 0, records: x._count._all })),
        positions: positionGroups.map((x) => ({ name: x.positionName, quota: x._sum.quota ?? 0, records: x._count._all })),
        regions: provinceGroups.map((x) => ({ name: x.province ?? 'Lokasi belum teridentifikasi', quota: x._sum.quota ?? 0, records: x._count._all })),
        procurement: procurementGroups.filter((x) => x.procurementType).map((x) => ({ name: x.procurementType, value: x._count._all })),
        education: educationGroups.filter((x) => x.educationLevel).map((x) => ({ name: x.educationLevel, quota: x._sum.quota ?? 0, records: x._count._all })),
      },
    }));
  } catch (error) { next(error); }
});

app.get('/api/analytics/education', async (req, res, next) => {
  try {
    const where = buildWhere(req.query as Record<string, unknown>);
    const exactWhere = { AND: [where, { matchingCategory: 'EXACT_MATCH' }] };
    const [summary, agencies, positions, provinces, regencies, units, procurement, exactAgencies, exactPositions, exactRegions, locationGroups] = await Promise.all([
      prisma.formation.groupBy({ by: ['matchingCategory'], where, _sum: { quota: true }, _count: { _all: true } }),
      prisma.formation.groupBy({ by: ['agencyName'], where: { AND: [where, { matchingCategory: 'EXACT_MATCH' }] }, _sum: { quota: true, applicantCount: true }, _avg: { salaryMin: true, salaryMax: true }, _count: { _all: true }, orderBy: { _sum: { quota: 'desc' } }, take: 50 }),
      prisma.formation.groupBy({ by: ['positionName'], where: { AND: [where, { matchingCategory: 'EXACT_MATCH' }] }, _sum: { quota: true, applicantCount: true }, _avg: { salaryMin: true, salaryMax: true }, _count: { _all: true }, orderBy: { _sum: { quota: 'desc' } }, take: 50 }),
      prisma.formation.groupBy({ by: ['province'], where: { AND: [where, { matchingCategory: 'EXACT_MATCH' }] }, _sum: { quota: true, applicantCount: true }, _avg: { salaryMin: true, salaryMax: true }, _count: { _all: true }, orderBy: { _sum: { quota: 'desc' } }, take: 50 }),
      prisma.formation.groupBy({ by: ['regency'], where: { AND: [where, { matchingCategory: 'EXACT_MATCH' }] }, _sum: { quota: true, applicantCount: true }, _avg: { salaryMin: true, salaryMax: true }, _count: { _all: true }, orderBy: { _sum: { quota: 'desc' } }, take: 50 }),
      prisma.formation.groupBy({ by: ['unitWorkName'], where: { AND: [where, { matchingCategory: 'EXACT_MATCH' }] }, _sum: { quota: true, applicantCount: true }, _avg: { salaryMin: true, salaryMax: true }, _count: { _all: true }, orderBy: { _sum: { quota: 'desc' } }, take: 50 }),
      prisma.formation.groupBy({ by: ['procurementType'], where: { AND: [where, { matchingCategory: 'EXACT_MATCH' }] }, _sum: { quota: true, applicantCount: true }, _avg: { salaryMin: true, salaryMax: true }, _count: { _all: true }, orderBy: { _sum: { quota: 'desc' } }, take: 50 }),
      prisma.formation.findMany({ where: exactWhere, distinct: ['agencyName'], select: { agencyName: true } }),
      prisma.formation.findMany({ where: exactWhere, distinct: ['positionName'], select: { positionName: true } }),
      prisma.formation.findMany({ where: exactWhere, distinct: ['province'], select: { province: true } }),
      prisma.formation.groupBy({ by: ['agencyName', 'positionName', 'province', 'regency', 'placementName', 'unitWorkName', 'procurementType'], where: exactWhere, _count: { _all: true }, orderBy: { agencyName: 'asc' }, take: 250_000 }),
    ]);
    const counts = new Map(summary.map((x) => [x.matchingCategory, { records: x._count._all, quota: x._sum.quota ?? 0 }]));
    const exact = counts.get('EXACT_MATCH') ?? { records: 0, quota: 0 };
    const locationIndexes: Record<string, Map<string, Set<string>>> = {};
    const locationDimensions = ['agencyName', 'positionName', 'province', 'regency', 'unitWorkName', 'procurementType'];
    for (const dimension of locationDimensions) locationIndexes[dimension] = new Map();
    for (const row of locationGroups) {
      if (!row.province && !row.regency && !row.placementName) continue;
      const location = [row.province, row.regency, row.placementName].filter(Boolean).join('|');
      for (const dimension of locationDimensions) {
        const entity = (row as unknown as Record<string, string | null>)[dimension];
        if (!entity) continue;
        const entityLocations = locationIndexes[dimension]!.get(entity) ?? new Set<string>();
        entityLocations.add(location); locationIndexes[dimension]!.set(entity, entityLocations);
      }
    }
    const withLocationCount = (groups: object[], dimension: string) => groups.map((row) => {
      const name = (row as unknown as Record<string, string | null>)[dimension];
      const totalLocations = name ? locationIndexes[dimension]?.get(name)?.size ?? 0 : 0;
      return { ...row, locationCount: totalLocations };
    });
    res.json(response({
      exactRecords: exact.records, exactQuota: exact.quota, related: counts.get('RELATED_MATCH') ?? { records: 0, quota: 0 },
      manualReview: counts.get('MANUAL_REVIEW')?.records ?? 0, exactAgencyCount: exactAgencies.length, exactPositionCount: exactPositions.length, exactRegionCount: exactRegions.filter((x) => x.province).length,
      rekap: { instansi: withLocationCount(agencies, 'agencyName'), jabatan: withLocationCount(positions, 'positionName'), provinsi: withLocationCount(provinces, 'province'), kabupatenKota: withLocationCount(regencies, 'regency'), unitKerja: withLocationCount(units, 'unitWorkName'), jenisPengadaan: withLocationCount(procurement, 'procurementType') },
    }));
  } catch (error) { next(error); }
});

const groupFields: Record<string, string> = { agencies: 'agencyName', positions: 'positionName', regions: 'province', competition: 'positionName' };
app.get(['/api/analytics/agencies', '/api/analytics/positions', '/api/analytics/regions', '/api/analytics/competition'], async (req, res, next) => {
  try {
    const type = req.path.split('/').pop() ?? '';
    if (!['agencies', 'positions', 'regions', 'competition'].includes(type)) { res.status(404).json({ success: false, error: 'Analisis tidak ditemukan.' }); return; }
    const where = buildWhere(req.query as Record<string, unknown>);
    if (type === 'competition') {
      const rows = await prisma.formation.findMany({ where, orderBy: [{ applicantPerSeat: 'desc' }, { quota: 'desc' }], take: 100,
        select: { id: true, agencyName: true, positionName: true, province: true, regency: true, quota: true, applicantCount: true, applicantPerSeat: true, salaryMin: true, salaryMax: true, requiredEducationRaw: true, matchingCategory: true } });
      res.json(response(rows.map((x) => ({ ...x, competitionLabel: competitionLabel(x.applicantPerSeat) })))); return;
    }
    const field = groupFields[type] as 'agencyName' | 'positionName' | 'province';
    const sortBy = textParam(req.query.sortBy) ?? 'quota';
    const orderBy = sortBy === 'records' ? { _count: { id: 'desc' as const } }
      : sortBy === 'applicants' ? { _sum: { applicantCount: 'desc' as const } }
        : sortBy === 'salary' ? { _avg: { salaryMax: 'desc' as const } }
          : { _sum: { quota: 'desc' as const } };
    const groups = await prisma.formation.groupBy({ by: [field], where, _sum: { quota: true, applicantCount: true }, _avg: { salaryMin: true, salaryMax: true }, _count: { _all: true }, orderBy, take: 100 });
    res.json(response(groups.map((group) => {
      const records = group._count._all;
      const quota = group._sum.quota ?? 0;
      const applicants = group._sum.applicantCount ?? null;
      return { name: (group as unknown as Record<string, unknown>)[field] ?? 'Lokasi belum teridentifikasi', records, quota, applicants,
        applicantPerSeat: applicants !== null && quota > 0 ? applicants / quota : null,
        salaryMinAverage: group._avg.salaryMin, salaryMaxAverage: group._avg.salaryMax };
    })));
  } catch (error) { next(error); }
});

app.get('/api/analytics/recommendations', async (req, res, next) => {
  try {
    const where = buildWhere(req.query as Record<string, unknown>);
    const weightsSchema = z.object({ education: z.coerce.number().min(0).max(100).default(40), quota: z.coerce.number().min(0).max(100).default(20),
      competition: z.coerce.number().min(0).max(100).default(20), salary: z.coerce.number().min(0).max(100).default(10), location: z.coerce.number().min(0).max(100).default(10) });
    const weights = weightsSchema.parse(req.query);
    const formations = await prisma.formation.findMany({ where, orderBy: { quota: 'desc' }, take: 500,
      select: { id: true, agencyName: true, positionName: true, province: true, regency: true, unitWorkName: true, quota: true, applicantCount: true, applicantPerSeat: true, salaryMin: true, salaryMax: true, requiredEducationRaw: true, matchingCategory: true, matchingReason: true } });
    const maxQuota = Math.max(1, ...formations.map((x) => x.quota));
    const maxSalary = Math.max(1, ...formations.map((x) => x.salaryMax ?? 0));
    const desiredProvince = textParam(req.query.targetProvince)?.toUpperCase();
    const data = formations.map((x) => {
      const scored = scoreRecommendation(x, weights, maxQuota, maxSalary, desiredProvince);
      return { ...x, ...scored, limitation: 'Skor ini membantu menyusun prioritas riset historis dan bukan probabilitas kelulusan.', reasons: [x.matchingReason, `${x.quota} kuota tercatat.`, x.applicantPerSeat === null ? 'Data persaingan belum tersedia.' : `${x.applicantPerSeat.toFixed(1)} pelamar per kuota secara historis.`] };
    }).sort((a, b) => b.score - a.score);
    res.json(response({ weights, recommendations: data.slice(0, 100) }));
  } catch (error) { next(error); }
});

app.get('/api/analytics/summary', async (req, res, next) => {
  try {
    const where = buildWhere(req.query as Record<string, unknown>);
    const [aggregate, recordsWithApplicants, procurementTypes, availableYears, datasets] = await Promise.all([
      prisma.formation.aggregate({ where, _sum: { quota: true, applicantCount: true }, _avg: { salaryMin: true, salaryMax: true }, _min: { salaryMin: true, salaryMax: true }, _max: { salaryMin: true, salaryMax: true } }),
      prisma.formation.count({ where: { AND: [where, { applicantCount: { not: null } }] } }),
      prisma.formation.groupBy({ by: ['procurementType'], where, _count: { _all: true } }),
      prisma.dataset.findMany({ select: { year: true }, distinct: ['year'], orderBy: { year: 'desc' } }),
      prisma.dataset.findMany({ orderBy: { importedAt: 'desc' } }),
    ]);
    res.json(response({ ...aggregate, recordsWithApplicants, procurementTypes, availableYears: availableYears.map((x) => x.year), datasets }));
  } catch (error) { next(error); }
});

app.get('/api/datasets', async (_req, res, next) => {
  try { res.json(response(await prisma.dataset.findMany({ orderBy: { importedAt: 'desc' }, include: { batches: { orderBy: { importedAt: 'desc' }, take: 1 } } }))); }
  catch (error) { next(error); }
});

app.get('/api/data-quality', async (_req, res, next) => {
  try {
    const [total, noEducation, noApplicants, noSalary, batches, datasets] = await Promise.all([
      prisma.formation.count(), prisma.formation.count({ where: { requiredEducationRaw: null } }), prisma.formation.count({ where: { applicantCount: null } }),
      prisma.formation.count({ where: { salaryMin: null, salaryMax: null } }), prisma.importBatch.aggregate({ _sum: { emptyQuotaCount: true } }), prisma.dataset.findMany({ orderBy: { importedAt: 'desc' } }),
    ]);
    res.json(response({ total, noEducation, noApplicants, noSalary, noQuota: batches._sum.emptyQuotaCount ?? 0, datasets }));
  } catch (error) { next(error); }
});

const previewSchema = z.object({ previewId: z.string().uuid(), year: z.coerce.number().int().min(2000).max(2100), source: z.string().max(300).optional().nullable(), datasetName: z.string().min(1).max(150), notes: z.string().max(2000).optional().nullable(), mapping: z.record(z.string(), z.string().nullable()) });
app.post('/api/import/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) { res.status(400).json({ success: false, error: 'Pilih file CSV, XLSX, atau JSON.' }); return; }
    const parsed = await parseUploadedFile(req.file.originalname, req.file.buffer);
    const previewId = stageImport(req.file.originalname, parsed.columns, parsed.rows);
    const mapping = suggestMapping(parsed.columns);
    res.json(response({ previewId, fileName: req.file.originalname, columns: parsed.columns, suggestedMapping: mapping, fieldKeys,
      rowCount: parsed.rows.length, preview: parsed.rows.slice(0, 8) }));
  } catch (error) { next(error); }
});

app.post('/api/import/commit', async (req, res, next) => {
  try {
    const input = previewSchema.parse(req.body);
    const source = input.source?.trim() || null;
    const mapping: ColumnMapping = Object.fromEntries(Object.entries(input.mapping).filter(([key, value]) => fieldKeys.includes(key as typeof fieldKeys[number]) && typeof value === 'string')) as ColumnMapping;
    const staged = getStagedImport(input.previewId);
    if (!staged) { res.status(410).json({ success: false, error: 'Pratinjau impor kedaluwarsa. Unggah ulang file untuk melanjutkan.' }); return; }
    const dataset = await prisma.dataset.create({ data: { name: input.datasetName.trim(), year: input.year, source, notes: input.notes ?? null } });
    const batch = await prisma.importBatch.create({ data: { datasetId: dataset.id, fileName: staged.fileName, source, notes: input.notes ?? null } });
    const transformed = transformRows(staged.rows, mapping, input.year, source, batch.id, dataset.id);
    if (transformed.accepted.length === 0) {
      await prisma.dataset.delete({ where: { id: dataset.id } });
      res.status(422).json({ success: false, error: 'Tidak ada baris valid untuk diimpor. Pastikan kolom Jabatan, Instansi, dan Kuota sudah dipetakan.', data: { errors: transformed.errors.slice(0, 100) } }); return;
    }
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < transformed.accepted.length; i += 500) await tx.formation.createMany({ data: transformed.accepted.slice(i, i + 500) });
      await tx.importBatch.update({ where: { id: batch.id }, data: { recordCount: transformed.accepted.length, failedCount: transformed.errors.length, duplicateCount: transformed.duplicateCount, emptyQuotaCount: transformed.quality.emptyQuotaCount } });
      await tx.dataset.update({ where: { id: dataset.id }, data: { recordCount: transformed.accepted.length } });
    }, { timeout: 60_000 });
    removeStagedImport(input.previewId);
    res.status(201).json(response({ datasetId: dataset.id, batchId: batch.id, fileName: staged.fileName, imported: transformed.accepted.length,
      failed: transformed.errors.length, duplicates: transformed.duplicateCount, errors: transformed.errors.slice(0, 100), quality: transformed.quality }));
  } catch (error) { next(error); }
});

app.get('/api/favorites', async (_req, res, next) => {
  try { res.json(response(await prisma.favoriteFormation.findMany({ where: { profileId: 'local' }, orderBy: { createdAt: 'desc' } }))); }
  catch (error) { next(error); }
});
app.post('/api/favorites', async (req, res, next) => {
  try {
    const input = z.object({ formationId: z.number().int().positive(), note: z.string().max(2000).optional(), reason: z.string().max(1000).optional(), status: z.string().max(40).optional() }).parse(req.body);
    const found = await prisma.formation.findUnique({ where: { id: input.formationId }, select: { id: true } });
    if (!found) { res.status(404).json({ success: false, error: 'Formasi tidak ditemukan.' }); return; }
    res.status(201).json(response(await prisma.favoriteFormation.upsert({ where: { profileId_formationId: { profileId: 'local', formationId: input.formationId } }, create: { ...input, profileId: 'local' }, update: input })));
  } catch (error) { next(error); }
});
app.delete('/api/favorites/:id', async (req, res, next) => {
  try { await prisma.favoriteFormation.deleteMany({ where: { profileId: 'local', formationId: Number(req.params.id) } }); res.json(response({ deleted: true })); }
  catch (error) { next(error); }
});

app.use((req, res) => res.status(404).json({ success: false, error: `Endpoint ${req.method} ${req.path} tidak ditemukan.` }));
const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  void next;
  const status = error instanceof z.ZodError ? 400 : error instanceof multer.MulterError ? 413 : 500;
  const message = error instanceof z.ZodError ? error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    : error instanceof Error ? error.message : 'Terjadi kesalahan di server.';
  if (status >= 500) console.error(`[api] ${new Date().toISOString()} ${message}`);
  res.status(status).json({ success: false, error: message });
};
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test' && process.env.VERCEL !== '1') {
  const server = app.listen(port, () => {
    console.info(`MI CASN Analytics API berjalan di http://localhost:${port}`);
    beginInitialDataSync();
  });
  process.on('SIGINT', () => { server.close(); void prisma.$disconnect(); });
  process.on('SIGTERM', () => { server.close(); void prisma.$disconnect(); });
}

export { app };
export default app;
