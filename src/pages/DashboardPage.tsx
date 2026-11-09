import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowRight, BriefcaseBusiness, Building2, MapPin, MousePointer2, Rows3, UsersRound, ChartNoAxesCombined, FileUp, Lightbulb, Target, TriangleAlert } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { api, queryString } from '../lib/api';
import { countLabel, shortCurrency } from '../lib/format';
import type { Formation, Overview } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ChartCard, PageIntro, StatCard } from '../components/shared';

type AnalyticsSummary = { datasets: { id: number; name: string; year: number; importedAt: string; source: string | null; recordCount: number }[]; availableYears: number[] };
const palette = ['#11847c', '#5ab8ad', '#93d7c9', '#2570a3', '#73a8ca', '#d0a752', '#7c8fa6', '#c8d1da'];

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const key = searchParams.toString();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [scatter, setScatter] = useState<{ id: number; positionName: string; agencyName: string; quota: number; applicantCount: number | null; applicantPerSeat: number | null }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const params = new URLSearchParams(key);
    Promise.all([
      api<Overview>(`/dashboard/overview?${queryString(params)}`),
      api<AnalyticsSummary>('/analytics/summary'),
      api<Formation[]>(`/formations?${queryString(new URLSearchParams([...params, ['pageSize', '200'], ['sortBy', 'applicantCount'], ['sortOrder', 'desc']]))}`),
    ]).then(([a, b, c]) => { if (active) { setOverview(a.data); setSummary(b.data); setScatter(c.data.filter((x) => x.applicantCount !== null && x.quota > 0)); } })
      .catch((e: Error) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key]);

  function drill(keyName: string, value: string) {
    const next = new URLSearchParams(searchParams); next.set(keyName, value); next.delete('page');
    setSearchParams(next); navigate(`/database?${next.toString()}`);
  }
  const hasData = (overview?.totalRecords ?? 0) > 0;
  const dataset = summary?.datasets?.[0];
  const exactShare = overview && overview.totalRecords ? (overview.matchingRecords / overview.totalRecords * 100).toFixed(1) : '0';
  const scatterData = useMemo(() => scatter.map((row) => ({ ...row, label: `${row.positionName} · ${row.agencyName}` })), [scatter]);

  return <div className="space-y-5">
    <PageIntro eyebrow="PUSAT ANALISIS CASN" title="Selamat datang di MI CASN Analytics" description="Pahami pola formasi D3 Manajemen Informatika yang dimuat otomatis dari arsip CASN 2024 sebagai bahan riset persiapan seleksi 2026." action={<Button variant="secondary" onClick={() => navigate('/data')}><FileUp size={15} />Status data</Button>} />
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">Tidak dapat memuat ringkasan data: {error}</div>}
    {!loading && !hasData && <Card className="overflow-hidden border-dashed border-teal-200 bg-[#f7fbfa]"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800"><FileUp size={18} /></span><div><h3 className="text-sm font-bold text-slate-800">Data snapshot belum bisa dimuat</h3><p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-600">Dashboard memakai arsip CASN 2024 yang dibundel bersama aplikasi. Coba muat ulang halaman; data tidak disinkronkan langsung dari SSCASN.</p></div></div><Button onClick={() => navigate('/data')}>Lihat status data<ArrowRight size={14} /></Button></CardContent></Card>}
    {loading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-[100px] rounded-2xl" />)}</div> : <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Total record formasi" value={countLabel(overview?.totalRecords)} detail={dataset ? `${dataset.year} · diperbarui ${new Intl.DateTimeFormat('id-ID').format(new Date(dataset.importedAt))}` : 'Belum ada dataset'} icon={<Rows3 size={17} />} tone="blue" />
      <StatCard label="Total kuota formasi" value={countLabel(overview?.totalQuota)} detail="Akumulasi seluruh record terfilter" icon={<Target size={17} />} />
      <StatCard label="Instansi unik" value={countLabel(overview?.uniqueAgencies)} detail="Nama berbeda dalam dataset" icon={<Building2 size={17} />} tone="violet" />
      <StatCard label="Jabatan unik" value={countLabel(overview?.uniquePositions)} detail="Nama jabatan resmi terdata" icon={<BriefcaseBusiness size={17} />} tone="blue" />
      <StatCard label="Unit kerja unik" value={countLabel(overview?.uniqueUnits)} detail="Unit yang memiliki nilai" icon={<Activity size={17} />} tone="amber" />
      <StatCard label="Formasi exact match" value={countLabel(overview?.matchingRecords)} detail={`${exactShare}% dari record terfilter`} icon={<Target size={17} />} tooltip="Kualifikasi pendidikan menyebut D-III Manajemen Informatika secara eksplisit." />
      <StatCard label="Kuota exact match" value={countLabel(overview?.matchingQuota)} detail="Kuota dengan exact match pendidikan" icon={<UsersRound size={17} />} tone="blue" />
      <StatCard label="Wilayah teridentifikasi" value={countLabel(overview?.placementRegions)} detail="Provinsi tercantum dalam dataset" icon={<MapPin size={17} />} tone="violet" />
    </div>}

    {hasData && overview && <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Formasi menurut instansi" description="Top 8 instansi berdasarkan jumlah record · klik grafik untuk melihat katalog terfilter" action={<Button size="sm" variant="ghost" onClick={() => navigate('/agencies')}>Detail <ArrowRight size={13} /></Button>}>
          {overview.charts.agencies.length ? <div className="h-[270px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.charts.agencies} layout="vertical" margin={{ left: 5, right: 14, top: 3, bottom: 3 }} onClick={(event) => { const name = (event as { activePayload?: { payload?: { name?: string } }[] })?.activePayload?.[0]?.payload?.name; if (name) drill('agency', name); }}><CartesianGrid stroke="#eef2f6" horizontal={false} /><XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f8fa' }} /><Bar dataKey="records" name="Jumlah record" fill="#17847b" radius={[0, 5, 5, 0]} barSize={16} cursor="pointer" /></BarChart></ResponsiveContainer></div> : <NoChart />}
        </ChartCard>
        <ChartCard title="Kuota menurut jabatan" description="Top 8 jabatan berdasarkan jumlah kuota · nama jabatan resmi dipertahankan" action={<Button size="sm" variant="ghost" onClick={() => navigate('/positions')}>Detail <ArrowRight size={13} /></Button>}>
          {overview.charts.positions.length ? <div className="h-[270px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.charts.positions} layout="vertical" margin={{ left: 5, right: 14, top: 3, bottom: 3 }} onClick={(event) => { const name = (event as { activePayload?: { payload?: { name?: string } }[] })?.activePayload?.[0]?.payload?.name; if (name) drill('position', name); }}><CartesianGrid stroke="#eef2f6" horizontal={false} /><XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><YAxis dataKey="name" type="category" width={142} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="quota" name="Jumlah kuota" fill="#399e95" radius={[0, 5, 5, 0]} barSize={16} cursor="pointer" /></BarChart></ResponsiveContainer></div> : <NoChart />}
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Distribusi kuota per provinsi" description="Lokasi tanpa provinsi tidak dikelompokkan sebagai wilayah tertentu" action={<MapPin size={15} className="text-slate-400" />}>
          {overview.charts.regions.length ? <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.charts.regions.slice(0, 8)} margin={{ left: -15, right: 5, top: 10, bottom: 38 }} onClick={(event) => { const name = (event as { activePayload?: { payload?: { name?: string } }[] })?.activePayload?.[0]?.payload?.name; if (name) drill('province', name); }}><CartesianGrid stroke="#eef2f6" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b' }} angle={-28} textAnchor="end" interval={0} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="quota" name="Kuota" fill="#3486ac" radius={[4, 4, 0, 0]} barSize={23} cursor="pointer" /></BarChart></ResponsiveContainer></div> : <NoChart />}
        </ChartCard>
        <ChartCard title="Jenis pengadaan" description="Distribusi record berdasarkan tipe pengadaan">
          {overview.charts.procurement.length ? <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={overview.charts.procurement} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3} onClick={(slice) => { if (slice.name) drill('procurementType', slice.name); }}>{overview.charts.procurement.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} cursor="pointer" />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="bottom" height={34} iconType="circle" wrapperStyle={{ fontSize: '10px' }} /></PieChart></ResponsiveContainer></div> : <NoChart />}
        </ChartCard>
        <ChartCard title="Level pendidikan" description="Sebaran formasi menurut jenjang pendidikan">
          {overview.charts.education.length ? <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.charts.education.slice(0, 7)} margin={{ left: -17, right: 5, top: 8, bottom: 30 }}><CartesianGrid stroke="#eef2f6" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="quota" name="Kuota" fill="#9a83ba" radius={[4, 4, 0, 0]} barSize={22} /></BarChart></ResponsiveContainer></div> : <NoChart />}
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Jumlah kuota dan pelamar" description="Setiap titik adalah record formasi yang memiliki data pelamar dan kuota" action={<MousePointer2 size={15} className="text-slate-400" />}>
          {scatterData.length ? <div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ left: 3, right: 16, top: 10, bottom: 6 }}><CartesianGrid stroke="#eef2f6" /><XAxis type="number" dataKey="quota" name="Kuota" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value: 'Jumlah kuota', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#64748b' }} /><YAxis type="number" dataKey="applicantCount" name="Pelamar" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><ZAxis range={[35, 100]} /><Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTooltip />} /><Scatter data={scatterData} fill="#18877e" fillOpacity={0.65} /></ScatterChart></ResponsiveContainer></div> : <NoChart />}
        </ChartCard>
        <ChartCard title="Rentang gaji terdata" description="Rentang gaji maksimum tertinggi di dalam data terfilter; nominal disimpan sebagaimana nilai sumber">
          <SalaryChart params={searchParams} />
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="bg-[#10263d] text-white"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200"><Lightbulb size={18} /></div><div><p className="text-xs font-bold text-white">Fokus analisis pendidikan</p><p className="mt-1 max-w-xl text-[10px] leading-relaxed text-slate-300">Exact match mensyaratkan teks pendidikan secara eksplisit menyebut D-III Manajemen Informatika. Nama jabatan saja tidak digunakan sebagai penentu kecocokan.</p></div></div><Button variant="secondary" size="sm" onClick={() => navigate('/education')}>Analisis jurusan<ArrowRight size={13} /></Button></CardContent></Card>
        <Card><CardContent className="flex h-full items-center gap-3 p-4"><span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><TriangleAlert size={16} /></span><div><p className="text-[11px] font-bold text-slate-700">Baca rasio secara proporsional</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">Pelamar per kursi adalah indikator historis, bukan probabilitas kelulusan.</p></div></CardContent></Card>
      </div>
    </>}
    {loading && <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-[300px] rounded-2xl" />)}</div>}
  </div>;
}

function NoChart() { return <div className="flex h-[230px] flex-col items-center justify-center text-center"><span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><ChartNoAxesCombined size={18} /></span><p className="text-xs font-semibold text-slate-500">Dimensi ini belum tersedia</p><p className="mt-1 max-w-[250px] text-[10px] leading-relaxed text-slate-400">Periksa kolom dataset yang diimpor atau pilih filter lain.</p></div>; }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: string | number; color?: string; payload?: { name?: string } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><p className="mb-1 font-bold text-slate-700">{label ?? payload[0]?.payload?.name}</p>{payload.map((item, index) => <p key={index} style={{ color: item.color }}><span className="font-semibold">{item.name ?? 'Jumlah'}:</span> {countLabel(Number(item.value))}</p>)}</div>;
}
function ScatterTooltip({ active, payload }: { active?: boolean; payload?: { payload?: { label: string; quota: number; applicantCount: number } }[] }) {
  const item = payload?.[0]?.payload; if (!active || !item) return null;
  return <div className="chart-tooltip max-w-[260px]"><p className="font-bold text-slate-700">{item.label}</p><p>Kuota: {countLabel(item.quota)}</p><p>Pelamar: {countLabel(item.applicantCount)}</p></div>;
}

function SalaryChart({ params }: { params: URLSearchParams }) {
  const [data, setData] = useState<{ salaryMin: number | null; salaryMax: number | null }[]>([]);
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams([...params, ['pageSize', '100'], ['sortBy', 'salaryMax'], ['sortOrder', 'desc']]);
    api<Formation[]>(`/formations?${queryString(query)}`).then((result) => { if (active) setData(result.data.filter((row) => row.salaryMin !== null || row.salaryMax !== null).slice(0, 8)); }).catch(() => { if (active) setData([]); });
    return () => { active = false; };
  }, [params.toString()]);
  if (!data.length) return <NoChart />;
  const chart = data.map((item, index) => ({ name: `Formasi ${index + 1}`, minimum: item.salaryMin ?? 0, maksimum: item.salaryMax ?? 0 }));
  return <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ left: -5, right: 7, top: 9, bottom: 5 }}><CartesianGrid stroke="#eef2f6" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)} jt`} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => shortCurrency(Number(value))} contentStyle={{ fontSize: 10, borderRadius: 9, borderColor: '#e2e8f0' }} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="minimum" name="Gaji minimum" fill="#70b5a9" radius={[4, 4, 0, 0]} /><Bar dataKey="maksimum" name="Gaji maksimum" fill="#146f69" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}
