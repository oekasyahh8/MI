import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { parseUploadedFile, suggestMapping, transformRows } from './importer.js';

describe('import validation and cleaning', () => {
  it('suggests mapping for common Indonesian headers', () => {
    expect(suggestMapping(['Nama Jabatan', 'Instansi', 'Jumlah Formasi', 'Kualifikasi Pendidikan', 'Gaji Minimum (Juta IDR)'])).toMatchObject({
      positionName: 'Nama Jabatan', agencyName: 'Instansi', quota: 'Jumlah Formasi', requiredEducationRaw: 'Kualifikasi Pendidikan', salaryMin: 'Gaji Minimum (Juta IDR)',
    });
  });
  it('keeps source education text, converts million-IDR salaries, and counts invalid and duplicate rows', () => {
    const rows = [
      { Jabatan: 'Pranata Komputer', Instansi: 'Kementerian Contoh', Kuota: '2', Pendidikan: 'D3 Manajemen Informatika', 'Gaji Minimum (Juta IDR)': '5.5' },
      { Jabatan: 'Pranata Komputer', Instansi: 'Kementerian Contoh', Kuota: '2', Pendidikan: 'D3 Manajemen Informatika', 'Gaji Minimum (Juta IDR)': '5.5' },
      { Jabatan: '', Instansi: 'Kementerian Contoh', Kuota: 'x', Pendidikan: '' },
    ];
    const result = transformRows(rows, { positionName: 'Jabatan', agencyName: 'Instansi', quota: 'Kuota', requiredEducationRaw: 'Pendidikan', salaryMin: 'Gaji Minimum (Juta IDR)' }, 2024, 'Tes', 1, 1);
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]?.requiredEducationRaw).toBe('D3 Manajemen Informatika');
    expect(result.accepted[0]?.matchingCategory).toBe('EXACT_MATCH');
    expect(result.accepted[0]?.salaryMin).toBe(5_500_000);
    expect(result.duplicateCount).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
  it('reads the first worksheet of an XLSX workbook while preserving header names', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Formasi');
    sheet.addRow(['Jabatan', 'Instansi', 'Jumlah Formasi', 'Pendidikan']);
    sheet.addRow(['Pranata Komputer', 'Kementerian Contoh', 2, 'D3 Manajemen Informatika']);
    const parsed = await parseUploadedFile('formasi.xlsx', await workbook.xlsx.writeBuffer());
    expect(parsed.columns).toEqual(['Jabatan', 'Instansi', 'Jumlah Formasi', 'Pendidikan']);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({ Jabatan: 'Pranata Komputer', 'Jumlah Formasi': 2 });
  });
  it('rejects legacy XLS rather than passing it to the XLSX parser', async () => {
    await expect(parseUploadedFile('formasi.xls', Buffer.alloc(0))).rejects.toThrow('Format tidak didukung');
  });
});
