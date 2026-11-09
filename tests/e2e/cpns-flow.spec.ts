import { expect, test } from '@playwright/test';
import path from 'node:path';

test('importa dataset, filtra pendidikan, abre detalhe, salva favorito, compara e exporta XLSX', async ({ page }) => {
  await page.goto('/data');
  await page.getByLabel('File dataset').setInputFiles(path.resolve('tests/fixtures/casn-2024.csv'));
  await page.getByRole('button', { name: 'Unggah dan pratinjau' }).click();
  await expect(page.getByText('Pratinjau dan mapping kolom')).toBeVisible();
  await page.getByRole('button', { name: 'Validasi dan impor' }).click();
  await expect(page.getByRole('status')).toContainText('Impor selesai: 2 baris berhasil');

  await page.getByRole('link', { name: 'Database Formasi' }).click();
  const search = page.getByRole('textbox', { name: 'Cari jabatan atau instansi' });
  await search.fill('Manajemen Informatika');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Detail Pranata Komputer Ahli Pertama' }).click();
  const detail = page.getByRole('dialog', { name: 'Detail formasi' });
  await expect(detail).toContainText('D-III Manajemen Informatika');
  await page.getByRole('button', { name: 'Tutup detail' }).click();

  await page.getByRole('button', { name: 'Favoritkan Pranata Komputer Ahli Pertama' }).click();
  await page.getByRole('button', { name: 'Bandingkan Pranata Komputer Ahli Pertama' }).click();
  await page.getByRole('button', { name: 'Bandingkan Pengelola Sistem Informasi' }).click();
  await page.getByRole('link', { name: 'My CPNS Plan' }).click();
  await expect(page.getByText('Pranata Komputer Ahli Pertama')).toBeVisible();
  await page.getByRole('link', { name: 'Bandingkan 2 formasi' }).click();
  await expect(page.getByRole('heading', { name: 'Tabel perbandingan' })).toBeVisible();
  await expect(page.getByText('Pengelola Sistem Informasi')).toBeVisible();

  await page.getByRole('link', { name: 'Database Formasi' }).click();
  await page.getByRole('button', { name: 'Ekspor' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'xlsx', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
});
