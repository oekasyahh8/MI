import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { randomUUID } from 'node:crypto';
import { matchEducation, normalizeText, parseNumber, applicantPerSeat } from './normalize.js';

export const fieldKeys = [
  'sourceId', 'positionName', 'agencyName', 'unitWorkName', 'placementName', 'province', 'regency',
  'educationLevel', 'requiredEducationRaw', 'quota', 'applicantCount', 'salaryMin', 'salaryMax',
  'procurementType', 'formationType', 'dataSource',
] as const;
export type FieldKey = typeof fieldKeys[number];
export type ColumnMapping = Partial<Record<FieldKey, string>>;

const aliases: Record<FieldKey, string[]> = {
  sourceId: ['id', 'source id', 'kode formasi', 'kode'],
  positionName: ['jabatan', 'nama jabatan', 'position', 'position name'],
  agencyName: ['instansi', 'nama instansi', 'agency', 'agency name'],
  unitWorkName: ['unit kerja', 'unit kerja penempatan', 'unitworkname'],
  placementName: ['lokasi penempatan', 'lokasi formasi', 'penempatan', 'lokasi'],
  province: ['provinsi', 'province'], regency: ['kabupaten kota', 'kabupaten/kota', 'kabupaten', 'kota', 'regency'],
  educationLevel: ['jenjang pendidikan', 'jenjang', 'education level'],
  requiredEducationRaw: ['pendidikan yang dipersyaratkan', 'pendidikan', 'kualifikasi pendidikan', 'required education'],
  quota: ['jumlah formasi', 'jumlah kuota', 'kuota', 'formasi', 'quota'],
  applicantCount: ['jumlah pelamar', 'pelamar', 'jumlah pendaftar', 'applicants'],
  salaryMin: ['gaji minimum', 'gaji min', 'salary min', 'gaji minimum (rp)', 'gaji min (rp)', 'gaji minimum (juta idr)', 'gaji min (juta idr)'],
  salaryMax: ['gaji maksimum', 'gaji max', 'salary max', 'gaji maksimum (rp)', 'gaji max (rp)', 'gaji maksimum (juta idr)', 'gaji max (juta idr)'],
  procurementType: ['jenis pengadaan', 'pengadaan', 'procurement type'],
  formationType: ['jenis formasi', 'formasi khusus', 'formation type'],
  dataSource: ['sumber data', 'sumber', 'source'],
};

export function suggestMapping(columns: string[]): ColumnMapping {
  const lookup = new Map(columns.map((column) => [column.toLowerCase().replace(/[^a-z0-9]/g, ''), column]));
  const result: ColumnMapping = {};
  for (const key of fieldKeys) {
    const found = aliases[key].map((alias) => {
      const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      return lookup.get(normalizedAlias) ?? columns.find((column) => column.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(normalizedAlias));
    }).find(Boolean);
    if (found) result[key] = found;
  }
  return result;
}

function excelCellValue(value: ExcelJS.CellValue): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value !== 'object') return value ?? null;
  if ('result' in value) return value.result ?? null;
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('text' in value && 'hyperlink' in value) return value.text;
  return null;
}

export async function parseUploadedFile(fileName: string, buffer: Buffer): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const ext = fileName.toLowerCase().split('.').pop();
  let rows: Record<string, unknown>[];
  if (ext === 'csv') {
    const parsed = Papa.parse<Record<string, unknown>>(buffer.toString('utf8'), { header: true, skipEmptyLines: 'greedy', dynamicTyping: false });
    if (parsed.errors.length && parsed.data.length === 0) throw new Error('CSV tidak dapat dibaca. Periksa delimiter dan header file.');
    rows = parsed.data;
  } else if (ext === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const excelBuffer = Buffer.alloc(buffer.byteLength);
    buffer.copy(excelBuffer);
    await workbook.xlsx.load(excelBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const firstSheet = workbook.worksheets[0];
    if (!firstSheet) throw new Error('Workbook tidak memiliki sheet yang dapat dibaca.');
    if (firstSheet.rowCount > 250_001) throw new Error('Maksimal 250.000 baris per file.');
    if (firstSheet.columnCount > 1_000) throw new Error('Maksimal 1.000 kolom per file.');
    const header = firstSheet.getRow(1);
    const columns = Array.from({ length: header.cellCount }, (_, index) => {
      const value = excelCellValue(header.getCell(index + 1).value);
      return String(value ?? '').trim() || `Kolom ${index + 1}`;
    });
    rows = [];
    for (let rowNumber = 2; rowNumber <= firstSheet.rowCount; rowNumber += 1) {
      const sourceRow = firstSheet.getRow(rowNumber);
      const row = Object.fromEntries(columns.map((column, index) => [column, excelCellValue(sourceRow.getCell(index + 1).value)]));
      if (Object.values(row).some((value) => value !== null && String(value).trim() !== '')) rows.push(row);
    }
    if (!columns.length) throw new Error('Workbook tidak memiliki header pada baris pertama.');
    return { columns, rows };
  } else if (ext === 'json') {
    const parsed = JSON.parse(buffer.toString('utf8')) as unknown;
    rows = Array.isArray(parsed) ? parsed as Record<string, unknown>[] :
      typeof parsed === 'object' && parsed !== null && 'data' in parsed && Array.isArray((parsed as { data: unknown }).data)
        ? (parsed as { data: Record<string, unknown>[] }).data : [];
  } else throw new Error('Format tidak didukung. Gunakan CSV, XLSX, atau JSON.');
  if (!rows.length) throw new Error('File tidak berisi baris data.');
  if (rows.length > 250_000) throw new Error('Maksimal 250.000 baris per file.');
  const columns = Object.keys(rows[0] ?? {});
  return { columns, rows };
}

type StagedImport = { fileName: string; columns: string[]; rows: Record<string, unknown>[]; expires: number };
const staged = new Map<string, StagedImport>();

export function stageImport(fileName: string, columns: string[], rows: Record<string, unknown>[]): string {
  const token = randomUUID();
  staged.set(token, { fileName, columns, rows, expires: Date.now() + 30 * 60 * 1000 });
  return token;
}

export function getStagedImport(token: string): StagedImport | undefined {
  const value = staged.get(token);
  if (!value || value.expires < Date.now()) { staged.delete(token); return undefined; }
  return value;
}

export function removeStagedImport(token: string): void { staged.delete(token); }

export type NormalizedFormation = {
  sourceId: string | null; datasetYear: number; procurementType: string | null; formationType: string | null;
  positionName: string; agencyName: string; unitWorkName: string | null; placementName: string | null;
  province: string | null; regency: string | null; educationLevel: string | null; requiredEducationRaw: string | null;
  requiredEducationNormalized: string | null; quota: number; applicantCount: number | null; applicantPerSeat: number | null;
  salaryMin: number | null; salaryMax: number | null; salaryCurrency: string; matchingCategory: string; matchingReason: string;
  dataSource: string | null; importBatchId: number; datasetId: number;
};

export function transformRows(rows: Record<string, unknown>[], mapping: ColumnMapping, year: number, source: string | null, batchId: number, datasetId: number) {
  const accepted: NormalizedFormation[] = [];
  const errors: { row: number; message: string }[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  let emptyEducationCount = 0;
  let emptyApplicantsCount = 0;
  let emptySalaryCount = 0;
  let emptyQuotaCount = 0;
  const valueAt = (row: Record<string, unknown>, key: FieldKey) => mapping[key] ? row[mapping[key]!] : null;
  const sourceText = (value: unknown) => value === null || value === undefined || String(value).trim() === '' ? null : String(value).trim().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
  const salaryValue = (row: Record<string, unknown>, key: 'salaryMin' | 'salaryMax') => {
    const value = parseNumber(valueAt(row, key));
    const column = mapping[key]?.toLowerCase() ?? '';
    return value !== null && /(juta|million)/.test(column) ? value * 1_000_000 : value;
  };

  rows.forEach((row, index) => {
    const positionName = sourceText(valueAt(row, 'positionName'));
    const agencyName = sourceText(valueAt(row, 'agencyName'));
    const quota = parseNumber(valueAt(row, 'quota'));
    if (!positionName || !agencyName || quota === null || quota < 0 || !Number.isInteger(quota)) {
      if (quota === null) emptyQuotaCount++;
      errors.push({ row: index + 2, message: !positionName ? 'Jabatan wajib diisi.' : !agencyName ? 'Instansi wajib diisi.' : 'Kuota harus berupa bilangan bulat nol atau lebih.' });
      return;
    }
    const rawEducation = sourceText(valueAt(row, 'requiredEducationRaw'));
    const match = matchEducation(rawEducation);
    const sourceIdValue = normalizeText(valueAt(row, 'sourceId'));
    const duplicateKey = sourceIdValue ? `id:${sourceIdValue}` : `${normalizeText(agencyName)}|${normalizeText(positionName)}|${normalizeText(valueAt(row, 'unitWorkName')) ?? ''}|${normalizeText(rawEducation) ?? ''}|${quota}`;
    if (seen.has(duplicateKey)) { duplicateCount++; return; }
    seen.add(duplicateKey);
    const applicants = parseNumber(valueAt(row, 'applicantCount'));
    const salaryMin = salaryValue(row, 'salaryMin');
    const salaryMax = salaryValue(row, 'salaryMax');
    if (!rawEducation) emptyEducationCount++;
    if (applicants === null) emptyApplicantsCount++;
    if (salaryMin === null && salaryMax === null) emptySalaryCount++;
    accepted.push({
      sourceId: sourceIdValue, datasetYear: year, procurementType: normalizeText(valueAt(row, 'procurementType')),
      formationType: sourceText(valueAt(row, 'formationType')), positionName, agencyName,
      unitWorkName: sourceText(valueAt(row, 'unitWorkName')), placementName: sourceText(valueAt(row, 'placementName')),
      province: sourceText(valueAt(row, 'province')), regency: sourceText(valueAt(row, 'regency')),
      educationLevel: sourceText(valueAt(row, 'educationLevel')), requiredEducationRaw: rawEducation,
      requiredEducationNormalized: match.normalized, quota: Math.trunc(quota), applicantCount: applicants,
      applicantPerSeat: applicantPerSeat(applicants, quota), salaryMin, salaryMax, salaryCurrency: 'IDR',
      matchingCategory: match.category, matchingReason: match.reason, dataSource: sourceText(valueAt(row, 'dataSource')) ?? source,
      importBatchId: batchId, datasetId,
    });
  });
  return { accepted, errors, duplicateCount, quality: { emptyEducationCount, emptyApplicantsCount, emptySalaryCount, emptyQuotaCount } };
}
