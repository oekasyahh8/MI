import { useEffect, useState } from 'react';
import { AlertCircle, ArrowDownToLine, CheckCircle2, ClipboardCheck, Database, FileSpreadsheet, FileUp, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { api } from '../lib/api';
import { countLabel, dateTimeId } from '../lib/format';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { PageIntro, StatCard } from '../components/shared';

type Preview = { previewId: string; fileName: string; columns: string[]; suggestedMapping: Record<string, string>; fieldKeys: string[]; rowCount: number; preview: Record<string, unknown>[] };
type Dataset = { id: number; name: string; year: number; source: string | null; status: string; recordCount: number; importedAt: string; notes: string | null; batches?: { fileName: string; recordCount: number; failedCount: number; duplicateCount: number }[] };
type Quality = { total: number; noEducation: number; noApplicants: number; noSalary: number; noQuota: number; datasets: Dataset[] };
type AesenStatus = { enabled: boolean; syncing: boolean; datasetId: number | null; datasetName: string; recordCount: number; exactMatch: number; manualReview: number; lastSyncAt: string | null; lastError: string | null; source: string; programCode: string; program: string };
const fieldLabels: Record<string, string> = {
  sourceId: 'ID sumber', positionName: 'Jabatan *', agencyName: 'Instansi *', unitWorkName: 'Unit kerja', placementName: 'Lokasi penempatan',
  province: 'Provinsi', regency: 'Kabupaten / kota', educationLevel: 'Jenjang pendidikan', requiredEducationRaw: 'Pendidikan dipersyaratkan',
  quota: 'Jumlah formasi / kuota *', applicantCount: 'Jumlah pelamar', salaryMin: 'Gaji minimum', salaryMax: 'Gaji maksimum',
  procurementType: 'Jenis pengadaan', formationType: 'Jenis formasi', dataSource: 'Sumber data',
};

export function DataPage() {
  const [year, setYear] = useState('2024'); const [datasetName, setDatasetName] = useState('CASN 2024'); const [source, setSource] = useState(''); const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState<Preview | null>(null); const [mapping, setMapping] = useState<Record<string, string>>({});
  const [quality, setQuality] = useState<Quality | null>(null); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const [aesen, setAesen] = useState<AesenStatus | null>(null); const [aesenBusy, setAesenBusy] = useState(false);
  async function refresh() { try { const result = await api<Quality>('/data-quality'); setQuality(result.data); } catch (e) { setError((e as Error).message); } }
  async function refreshAesen() { try { setAesen((await api<AesenStatus>('/source/aesen/status')).data); } catch { /* API may still be starting */ } }
  async function syncAesen() {
    setAesenBusy(true); setError(''); setMessage('');
    try {
      const result = await api<{ imported: number }>('/source/aesen/sync', { method: 'POST' });
      setMessage(`Sinkronisasi Aesen selesai: ${countLabel(result.data.imported)} formasi D3 Manajemen Informatika.`);
      await Promise.all([refresh(), refreshAesen()]);
    } catch (e) { setError((e as Error).message); await refreshAesen(); }
    finally { setAesenBusy(false); }
  }
  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const pollAesen = async () => {
      try {
        const status = (await api<AesenStatus>('/source/aesen/status')).data;
        if (!active) return;
        setAesen(status);
        if (status.syncing) timer = window.setTimeout(() => void pollAesen(), 1500);
      } catch { timer = window.setTimeout(() => void pollAesen(), 2000); }
    };
    void refresh(); void pollAesen();
    return () => { active = false; if (timer !== undefined) window.clearTimeout(timer); };
  }, []);

  async function makePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file) { setError('Pilih file dataset yang akan diimpor.'); return; }
    setBusy(true); setError(''); setMessage(''); setPreview(null);
    try {
      const form = new FormData(); form.append('file', file);
      const response = await fetch('/api/import/preview', { method: 'POST', body: form }); const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error ?? 'File tidak dapat diproses.');
      const data = json.data as Preview; setPreview(data); setMapping(data.suggestedMapping); setDatasetName(file.name.replace(/\.(csv|xlsx|json)$/i, '').slice(0, 150));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function commitImport() {
    if (!preview) return;
    if (!mapping.positionName || !mapping.agencyName || !mapping.quota) { setError('Pemetaan kolom Jabatan, Instansi, dan Kuota wajib dipilih.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api<{ imported: number; failed: number; duplicates: number; errors: { row: number; message: string }[]; quality: { emptyEducationCount: number; emptyApplicantsCount: number; emptySalaryCount: number; emptyQuotaCount: number } }>('/import/commit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ previewId: preview.previewId, year: Number(year), source: source || null, datasetName, notes: notes || null, mapping }),
      });
      setMessage(`Impor selesai: ${countLabel(result.data.imported)} baris berhasil, ${countLabel(result.data.failed)} gagal, ${countLabel(result.data.duplicates)} duplikat dilewati.`);
      setPreview(null); setFile(null); setNotes(''); await refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const [fileQuality, setFileQuality] = useState<{ imported: number; failed: number; duplicates: number } | null>(null);
  useEffect(() => { const match = message.match(/Impor selesai: ([\d.]+) baris berhasil, ([\d.]+) gagal, ([\d.]+) duplikat/); if (match) setFileQuality({ imported: Number(match[1].replace(/\./g, '')), failed: Number(match[2].replace(/\./g, '')), duplicates: Number(match[3].replace(/\./g, '')) }); }, [message]);

  return <div className="space-y-5">
    <PageIntro eyebrow="DATA MANAGEMENT" title="Data D3 Manajemen Informatika" description="Formasi yang cocok dimuat otomatis dari sumber Aesen saat aplikasi berjalan. Impor file tetap tersedia bila Anda ingin menambahkan dataset lain." action={<Button variant="secondary" onClick={() => { void refresh(); void refreshAesen(); }}><RefreshCw size={14} />Segarkan status</Button>} />
    {message && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"><CheckCircle2 size={15} className="mt-0.5 shrink-0" />{message}</div>}
    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"><AlertCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}
    <Card className="overflow-hidden border-teal-200 bg-gradient-to-br from-teal-50 to-white">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-800"><Database size={18} /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-800">Sinkron otomatis D3 Manajemen Informatika</h3><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${aesen?.syncing ? 'bg-amber-100 text-amber-800' : aesen?.recordCount ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{aesen?.syncing ? 'Sedang memuat' : aesen?.recordCount ? 'Data tersedia' : 'Menunggu sumber'}</span></div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-600">{aesen?.recordCount ? `${countLabel(aesen.recordCount)} formasi historis 2024 tersaring otomatis untuk ${aesen.program}.` : aesen?.syncing ? 'Aplikasi sedang mengambil formasi yang sesuai. Halaman analisis akan terisi setelah pemuatan selesai.' : 'Aplikasi akan memuat formasi yang sesuai saat server aktif.'}</p>
            {aesen?.lastSyncAt && <p className="mt-1 text-[9px] text-slate-500">Pembaruan terakhir {dateTimeId(aesen.lastSyncAt)} · kode program {aesen.programCode} · cek otomatis setiap 24 jam.</p>}
            {aesen?.lastError && <p role="alert" className="mt-2 text-[10px] text-rose-700">Sumber belum dapat diperbarui: {aesen.lastError}</p>}
            <a href={aesen?.source ?? 'https://aesen.vercel.app/casn/2024/formasi'} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] font-semibold text-teal-800 underline underline-offset-2">Lihat sumber Aesen</a>
          </div>
        </div>
        <Button onClick={() => void syncAesen()} disabled={aesenBusy || aesen?.syncing || !aesen?.enabled}><RefreshCw size={14} className={aesenBusy || aesen?.syncing ? 'animate-spin' : ''} />{aesenBusy || aesen?.syncing ? 'Memuat data…' : 'Perbarui data'}</Button>
      </div>
      <div className="border-t border-teal-100 px-4 py-2"><p className="text-[9px] leading-relaxed text-slate-500">Sumber yang tersedia saat ini adalah arsip CASN 2024; data ini bukan formasi resmi CPNS 2026. Wilayah dan unit mengikuti nama lokasi dari sumber.</p></div>
    </Card>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><StatCard label="Total record aktif" value={countLabel(quality?.total)} detail="Bersumber dari database lokal" icon={<Database size={17} />} /><StatCard label="Tanpa pendidikan" value={countLabel(quality?.noEducation)} detail="Ditandai manual review saat impor" icon={<ClipboardCheck size={17} />} tone="amber" /><StatCard label="Tanpa kuota" value={countLabel(quality?.noQuota)} detail="Baris tanpa kuota ditolak saat validasi" icon={<AlertCircle size={17} />} tone="amber" /><StatCard label="Tanpa data pelamar" value={countLabel(quality?.noApplicants)} detail="Tidak otomatis dianggap nol" icon={<AlertCircle size={17} />} tone="blue" /><StatCard label="Tanpa data gaji" value={countLabel(quality?.noSalary)} detail="Tidak otomatis dianggap nol" icon={<FileSpreadsheet size={17} />} tone="violet" /></div>
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <Card><div className="border-b border-slate-200 p-4"><div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-800"><UploadCloud size={17} /></span><div><h3 className="text-sm font-bold text-slate-800">Import dataset</h3><p className="mt-1 text-[10px] text-slate-500">CSV · XLSX · JSON · maksimum 25 MB dan 250.000 baris</p></div></div></div>
        <form onSubmit={makePreview} className="space-y-3 p-4">
          <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-500">File dataset</span><input required type="file" accept=".csv,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-[10px] text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-[10px] file:font-semibold file:text-teal-800" /></label>
          <div className="grid grid-cols-2 gap-3"><label><span className="mb-1 block text-[10px] font-semibold text-slate-500">Tahun dataset</span><input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} className="field-select" /></label><label><span className="mb-1 block text-[10px] font-semibold text-slate-500">Nama dataset</span><input required value={datasetName} onChange={(event) => setDatasetName(event.target.value)} className="field-select" placeholder="CASN 2024" /></label></div>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Sumber data / URL</span><input value={source} onChange={(event) => setSource(event.target.value)} className="field-select" placeholder="Contoh: sumber dataset / portal resmi" /></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Catatan provenance</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="field-select min-h-[64px] py-2" placeholder="Catatan verifikasi, tanggal pengambilan, filter yang diterapkan…" /></label>
          <Button type="submit" disabled={busy || !file} className="w-full"><FileUp size={14} />{busy ? 'Memproses file…' : 'Unggah dan pratinjau'}</Button>
        </form>
        <div className="border-t border-slate-200 px-4 py-3"><p className="text-[9px] leading-relaxed text-slate-400">Field wajib setelah pemetaan: jabatan, instansi, dan kuota (bilangan bulat). Nilai kosong tetap kosong, tidak dikonversi menjadi nol. File diproses di backend; pratinjau sementara kedaluwarsa setelah 30 menit.</p></div>
      </Card>
      <Card><div className="flex items-center gap-3 border-b border-slate-200 p-4"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><ShieldCheck size={17} /></span><div><h3 className="text-sm font-bold text-slate-800">Kualitas dan riwayat dataset</h3><p className="mt-1 text-[10px] text-slate-500">Provenance impor dipertahankan per dataset dan batch.</p></div></div>
        {(quality?.datasets.length ?? 0) === 0 ? <div className="p-6 text-center"><Database size={22} className="mx-auto text-slate-300" /><p className="mt-2 text-xs font-semibold text-slate-600">Belum ada dataset</p><p className="mt-1 text-[10px] text-slate-400">Dataset yang Anda import akan tercatat di sini.</p></div> : <div className="max-h-[380px] divide-y divide-slate-100 overflow-auto">{quality?.datasets.map((dataset) => <article key={dataset.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-xs font-bold text-slate-800">{dataset.name}</h4><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">{dataset.year}</span></div><p className="mt-1 text-[10px] text-slate-500">{dataset.source ?? 'Sumber tidak dicantumkan'}</p><p className="mt-1 text-[9px] text-slate-400">Impor {dateTimeId(dataset.importedAt)} · {dataset.batches?.[0]?.fileName}</p></div><p className="shrink-0 text-xs font-bold text-teal-800">{countLabel(dataset.recordCount)} record</p></div>{dataset.notes && <p className="mt-2 text-[10px] text-slate-500">{dataset.notes}</p>}{dataset.batches?.[0] && <p className="mt-2 text-[9px] text-slate-400">Gagal {countLabel(dataset.batches[0].failedCount)} · Duplikat dilewati {countLabel(dataset.batches[0].duplicateCount)}</p>}</article>)}</div>}
      </Card>
    </div>
    {fileQuality && <div className="grid grid-cols-3 gap-3"><StatCard label="Import terakhir berhasil" value={countLabel(fileQuality.imported)} icon={<CheckCircle2 size={17} />} /><StatCard label="Baris gagal" value={countLabel(fileQuality.failed)} icon={<AlertCircle size={17} />} tone="amber" /><StatCard label="Duplikat dilewati" value={countLabel(fileQuality.duplicates)} icon={<ClipboardCheck size={17} />} tone="blue" /></div>}
    {preview && <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div><h3 className="text-sm font-bold text-slate-800">Pratinjau dan mapping kolom</h3><p className="mt-1 text-[10px] text-slate-500">{preview.fileName} · {countLabel(preview.rowCount)} baris terbaca · 8 baris contoh</p></div><Button onClick={() => void commitImport()} disabled={busy}><CheckCircle2 size={14} />{busy ? 'Mengimpor…' : 'Validasi dan impor'}</Button></div>
      <div className="grid gap-4 p-4 lg:grid-cols-[.7fr_1.3fr]"><div><p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Mapping kolom</p><div className="max-h-[400px] space-y-2 overflow-auto">{preview.fieldKeys.map((field) => <label key={field} className="block"><span className="mb-1 block text-[9px] font-semibold text-slate-600">{fieldLabels[field] ?? field}</span><select className="field-select" value={mapping[field] ?? ''} onChange={(event) => setMapping({ ...mapping, [field]: event.target.value })}><option value="">— Tidak dipetakan —</option>{preview.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>)}</div><p className="mt-3 text-[9px] text-slate-400">Tanda * menandai kolom wajib.</p></div>
        <div className="overflow-auto"><p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contoh data sumber</p><table className="data-table min-w-[650px]"><thead><tr>{preview.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{preview.preview.map((row, index) => <tr key={index}>{preview.columns.map((column) => <td key={column} className="max-w-[180px]">{String(row[column] ?? '—')}</td>)}</tr>)}</tbody></table></div>
      </div>
    </Card>}
    <Card className="border-blue-100 bg-blue-50/50"><div className="flex gap-3 p-4"><ArrowDownToLine size={17} className="mt-0.5 shrink-0 text-blue-700" /><div><p className="text-xs font-bold text-blue-900">Template data yang disarankan</p><p className="mt-1 text-[10px] leading-relaxed text-blue-900/75">Header yang dikenali otomatis: Jabatan, Instansi, Unit Kerja, Lokasi Penempatan, Provinsi, Kabupaten/Kota, Jenjang Pendidikan, Pendidikan/Kualifikasi Pendidikan, Jumlah Formasi/Kuota, Jumlah Pelamar, Gaji Minimum, Gaji Maksimum, Jenis Pengadaan, Jenis Formasi, Sumber Data. Header lain dapat dipetakan manual.</p></div></div></Card>
  </div>;
}
