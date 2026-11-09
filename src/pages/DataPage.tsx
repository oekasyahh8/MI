import { useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, Database, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { countLabel, dateTimeId } from '../lib/format';
import { Card } from '../components/ui/card';
import { PageIntro, StatCard } from '../components/shared';

type Dataset = { id: number; name: string; year: number; source: string | null; recordCount: number; importedAt: string; notes: string | null };
type Quality = { total: number; noEducation: number; noApplicants: number; noSalary: number; noQuota: number; datasets: Dataset[] };

export function DataPage() {
  const [quality, setQuality] = useState<Quality | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Quality>('/data-quality')
      .then((result) => setQuality(result.data))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const dataset = quality?.datasets[0];

  return <div className="space-y-5">
    <PageIntro
      eyebrow="DATA SNAPSHOT OFFLINE"
      title="Data D3 Manajemen Informatika"
      description="Dataset arsip CASN 2024 disimpan bersama aplikasi. Dashboard tidak mengambil atau memperbarui data dari SSCASN/Aesen."
    />
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-800"><Database size={18} /></span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Snapshot data tetap</h3>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">Snapshot tetap</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
            {quality ? `${countLabel(quality.total)} formasi tersimpan di paket aplikasi.` : 'Memuat ringkasan dataset…'} Data tidak berubah ketika sumber eksternal diperbarui; snapshot hanya berubah jika versi aplikasi diganti.
          </p>
          {dataset?.importedAt && <p className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-500"><CalendarClock size={12} />Snapshot dibuat {dateTimeId(dataset.importedAt)} · tahun data {dataset.year}</p>}
          <a href="https://aesen.vercel.app/casn/2024/formasi" target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] font-semibold text-teal-800 underline underline-offset-2">Lihat keterangan sumber arsip</a>
        </div>
      </div>
      <div className="border-t border-teal-100 px-4 py-2"><p className="text-[9px] leading-relaxed text-slate-500">Data ini merupakan arsip CASN 2024, bukan formasi resmi CPNS 2026. Cocokkan persyaratan dengan pengumuman resmi instansi.</p></div>
    </Card>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard label="Total formasi" value={countLabel(quality?.total)} detail="Snapshot yang dibundel" icon={<Database size={17} />} />
      <StatCard label="Tanpa pendidikan" value={countLabel(quality?.noEducation)} detail="Pendidikan tidak tercantum" icon={<ShieldCheck size={17} />} tone="amber" />
      <StatCard label="Tanpa kuota" value={countLabel(quality?.noQuota)} detail="Baris tanpa kuota" icon={<AlertCircle size={17} />} tone="amber" />
      <StatCard label="Tanpa data pelamar" value={countLabel(quality?.noApplicants)} detail="Bukan berarti nol pelamar" icon={<AlertCircle size={17} />} tone="blue" />
      <StatCard label="Tanpa data gaji" value={countLabel(quality?.noSalary)} detail="Nilai tidak tersedia" icon={<FileSpreadsheet size={17} />} tone="violet" />
    </div>
    <Card>
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><ShieldCheck size={17} /></span>
        <div><h3 className="text-sm font-bold text-slate-800">Asal dataset</h3><p className="mt-1 text-[10px] text-slate-500">Keterangan sumber dipertahankan bersama snapshot.</p></div>
      </div>
      {dataset ? <article className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h4 className="text-xs font-bold text-slate-800">{dataset.name}</h4><p className="mt-1 text-[10px] text-slate-500">{dataset.source ?? 'Sumber tidak dicantumkan'}</p>{dataset.notes && <p className="mt-2 text-[10px] text-slate-500">{dataset.notes}</p>}</div>
          <p className="shrink-0 text-xs font-bold text-teal-800">{countLabel(dataset.recordCount)} record</p>
        </div>
      </article> : <div className="p-5 text-xs text-slate-500">Ringkasan sumber belum tersedia.</div>}
    </Card>
  </div>;
}
