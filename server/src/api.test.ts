import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './index.js';
import { prisma } from './db.js';

describe('API health and error response', () => {
  it('returns a consistent health envelope', async () => {
    const result = await request(app).get('/api/health').expect(200);
    expect(result.body).toMatchObject({ success: true, data: { status: 'ok' } });
  });
  it('returns a consistent not-found error', async () => {
    const result = await request(app).get('/api/does-not-exist').expect(404);
    expect(result.body).toMatchObject({ success: false });
  });
});

describe('formation, analytics, import, and export integration', () => {
  it('previews, imports, filters, analyzes, favorites, and exports an uploaded dataset', async () => {
    await prisma.favoriteFormation.deleteMany();
    await prisma.userNote.deleteMany();
    await prisma.formation.deleteMany();
    await prisma.importBatch.deleteMany();
    await prisma.dataset.deleteMany();

    const csv = [
      'Jabatan,Instansi,Unit Kerja,Provinsi,Kabupaten/Kota,Pendidikan,Jumlah Formasi,Jumlah Pelamar,Gaji Minimum,Gaji Maksimum,Jenis Pengadaan',
      'Pranata Komputer Ahli Pertama,Kementerian Contoh,Biro Data,Jawa Barat,Kota Bandung,D3 Manajemen Informatika,2,60,5000000,10000000,CPNS',
    ].join('\n');
    const preview = await request(app).post('/api/import/preview').attach('file', Buffer.from(csv), { filename: 'casn.csv', contentType: 'text/csv' }).expect(200);
    expect(preview.body.data.rowCount).toBe(1);
    expect(preview.body.data.suggestedMapping).toMatchObject({ positionName: 'Jabatan', agencyName: 'Instansi', quota: 'Jumlah Formasi' });

    const imported = await request(app).post('/api/import/commit').send({
      previewId: preview.body.data.previewId, year: 2024, datasetName: 'Tes integrasi', source: 'file uji',
      mapping: preview.body.data.suggestedMapping,
    }).expect(201);
    expect(imported.body.data.imported).toBe(1);

    const catalog = await request(app).get('/api/formations?matchingCategory=EXACT_MATCH&pageSize=10').expect(200);
    expect(catalog.body.meta.total).toBe(1);
    expect(catalog.body.data[0].requiredEducationRaw).toBe('D3 Manajemen Informatika');
    const overview = await request(app).get('/api/dashboard/overview?year=2024').expect(200);
    expect(overview.body.data).toMatchObject({ totalRecords: 1, totalQuota: 2, matchingRecords: 1, matchingQuota: 2 });
    const education = await request(app).get('/api/analytics/education?year=2024').expect(200);
    expect(education.body.data).toMatchObject({ exactAgencyCount: 1, exactPositionCount: 1, exactRegionCount: 1 });
    expect(education.body.data.rekap.instansi[0].locationCount).toBe(1);
    const agencies = await request(app).get('/api/analytics/agencies?year=2024').expect(200);
    expect(agencies.body.data[0]).toMatchObject({ name: 'Kementerian Contoh', quota: 2, records: 1 });
    const id = catalog.body.data[0].id as number;
    const competition = await request(app).get('/api/analytics/competition?year=2024').expect(200);
    expect(competition.body.data[0].applicantPerSeat).toBe(30);
    const summary = await request(app).get('/api/analytics/summary?year=2024').expect(200);
    expect(summary.body.data._sum).toMatchObject({ quota: 2, applicantCount: 60 });
    const recommendations = await request(app).get(`/api/analytics/recommendations?ids=${id}`).expect(200);
    expect(recommendations.body.data.recommendations[0].scoreLabel).toBe('Skor Prioritas Analisis Historis');
    await request(app).post('/api/favorites').send({ formationId: id, status: 'Target Prioritas' }).expect(201);
    expect((await request(app).get('/api/favorites').expect(200)).body.data).toHaveLength(1);
    await request(app).get('/api/formations/export?format=csv&year=2024').expect(200).expect('Content-Type', /text\/csv/);
    await request(app).get('/api/formations/export?format=xlsx&year=2024').expect(200).expect('Content-Type', /spreadsheetml/);
  });
});
