import { describe, expect, it } from 'vitest';
import { AESEN_PROGRAM_CODE, fetchAesenD3MiRows, mapAesenFormation, type AesenFormation } from './aesen.js';

function page(currentPage: number, totalPages: number, rows: AesenFormation[]) {
  return {
    status: 'success',
    data: rows,
    pagination: { current_page: currentPage, per_page: 100, total_pages: totalPages, total_items: totalPages },
  };
}

describe('automatic Aesen D3 MI source', () => {
  it('requests each page using the verified Manajemen Informatika program code', async () => {
    const urls: URL[] = [];
    const records = [
      { formasi_id: 'a', ins_nm: 'Kementerian Contoh', jabatan_nm: 'Pranata Komputer', lokasi_nm: 'Unit Data', pendidikan_nm: 'D-III MANAJEMEN INFORMATIKA', jumlah_formasi: 2, jumlah_ms: 60, gaji_min: 2.79, gaji_max: 8.5 },
      { formasi_id: 'b', ins_nm: 'Pemda Contoh', jabatan_nm: 'Pengelola Sistem Informasi', lokasi_nm: 'Dinas Digital', pendidikan_nm: 'D3 Manajemen Informatika', jumlah_formasi: 1, jumlah_ms: 20, gaji_min: null, gaji_max: null },
    ];
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input)); urls.push(url);
      const pageNumber = Number(url.searchParams.get('page'));
      const body = pageNumber === 1 ? page(1, 2, [records[0]!]) : page(2, 2, [records[1]!]);
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const result = await fetchAesenD3MiRows(fetcher, async () => {});
    expect(result.rows).toHaveLength(2);
    expect(urls.map((url) => url.searchParams.get('page'))).toEqual(['1', '2']);
    expect(urls.every((url) => url.searchParams.get('pendidikan_kode') === AESEN_PROGRAM_CODE)).toBe(true);
    expect(urls.every((url) => url.searchParams.get('limit') === '100')).toBe(true);
  });

  it('maps the source units, keeps the original requirement, and converts million-IDR salary', () => {
    const mapped = mapAesenFormation({
      formasi_id: 'a', ins_nm: 'Kementerian Contoh', jabatan_nm: 'Pranata Komputer', lokasi_nm: 'Unit Data',
      pendidikan_nm: 'D-III MANAJEMEN INFORMATIKA', jumlah_formasi: 2, jumlah_ms: 60, gaji_min: 2.79, gaji_max: 8.5,
    }, 3, 8);
    expect(mapped).toMatchObject({
      sourceId: 'a', positionName: 'Pranata Komputer', unitWorkName: 'Unit Data', province: null, regency: null,
      requiredEducationRaw: 'D-III MANAJEMEN INFORMATIKA', matchingCategory: 'EXACT_MATCH', quota: 2,
      applicantCount: 60, applicantPerSeat: 30, salaryMin: 2_790_000, salaryMax: 8_500_000,
      datasetId: 3, importBatchId: 8,
    });
  });

  it('stops if the source result exceeds the bounded sync volume', async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({
      status: 'success', data: [], pagination: { current_page: 1, per_page: 100, total_pages: 51, total_items: 5001 },
    }), { status: 200 });
    await expect(fetchAesenD3MiRows(fetcher, async () => {})).rejects.toThrow('melebihi batas sinkronisasi aman');
  });
});
