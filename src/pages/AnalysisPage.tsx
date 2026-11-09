import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowDownWideNarrow, BadgeCheck, BarChart3, Building2, MapPin, UsersRound } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { api, queryString } from '../lib/api';
import { countLabel, ratioLabel, shortCurrency } from '../lib/format';
import type { Formation } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { ChartCard, NoData, PageIntro, StatCard } from '../components/shared';

type Type = 'agencies' | 'positions' | 'regions' | 'competition';
type GroupRow = { name: string; records: number; quota: number; applicants: number | null; applicantPerSeat: number | null; salaryMinAverage: number | null; salaryMaxAverage: number | null; competitionLabel?: string };
const heading: Record<Type, { eyebrow: string; title: string; description: string; dimension: string }> = {
  agencies: { eyebrow: 'ANALISIS INSTANSI', title: 'Analisis Instansi', description: 'Bandingkan instansi berdasarkan kuota, jumlah record, pelamar, dan rentang gaji yang tercatat.', dimension: 'Instansi' },
  positions: { eyebrow: 'ANALISIS JABATAN', title: 'Analisis Jabatan', description: 'Kelompokkan jabatan sebagai klasifikasi analitis dan pertahankan nama resmi sesuai data.', dimension: 'Jabatan' },
  regions: { eyebrow: 'ANALISIS WILAYAH', title: 'Analisis Wilayah', description: 'Peringkat wilayah hanya memakai provinsi/kabupaten yang eksplisit tersedia di dataset.', dimension: 'Wilayah' },
  competition: { eyebrow: 'ANALISIS PERSAINGAN', title: 'Analisis Persaingan', description: 'Rasio historis pelamar per kuota membantu membandingkan data, bukan mengukur peluang lolos.', dimension: 'Formasi' },
};

export function AnalysisPage({ type }: { type: Type }) {
  const [params, setParams] = useSearchParams(); const navigate = useNavigate(); const key = params.toString();
  const [groups, setGroups] = useState<GroupRow[]>([]); const [formations, setFormations] = useState<Formation[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [thresholds, setThresholds] = useState(() => { try { return JSON.parse(localStorage.getItem('mi-casn-competition-thresholds-v1') ?? '{"low":10,"medium":25,"high":50}') as { low: number; medium: number; high: number }; } catch { return { low: 10, medium: 25, high: 50 }; } });
  const meta = heading[type];
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const query = new URLSearchParams(key);
    api<GroupRow[] | Formation[]>(`/analytics/${type}?${queryString(query)}`).then((result) => {
      if (!active) return;
      if (type === 'competition') setFormations(result.data as Formation[]); else setGroups(result.data as GroupRow[]);
    }).catch((e: Error) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type, key]);

  const currentRows = useMemo(() => {
    if (type !== 'competition') return groups;
    return formations.map((row) => ({ name: `${row.positionName} · ${row.agencyName}`, records: 1, quota: row.quota, applicants: row.applicantCount, applicantPerSeat: row.applicantPerSeat, salaryMinAverage: row.salaryMin, salaryMaxAverage: row.salaryMax, competitionLabel: labelCompetition(row.applicantPerSeat, thresholds) }));
  }, [formations, groups, type, thresholds]);
  const count = type === 'competition' ? formations.length : groups.length;
  const totalQuota = currentRows.reduce((sum, item) => sum + item.quota, 0);
  const totalApplicants = currentRows.reduce((sum, item) => sum + (item.applicants ?? 0), 0);
  const averageRatio = totalQuota ? totalApplicants / totalQuota : null;
  const sorted = useMemo(() => {
    const result = [...currentRows];
    const metric = params.get('rank') ?? (type === 'competition' ? 'competition' : 'quota');
    result.sort((a, b) => {
      const av = metric === 'records' ? a.records : metric === 'applicants' ? a.applicants ?? -1 : metric === 'competition' ? a.applicantPerSeat ?? -1 : metric === 'salary' ? a.salaryMaxAverage ?? -1 : a.quota;
      const bv = metric === 'records' ? b.records : metric === 'applicants' ? b.applicants ?? -1 : metric === 'competition' ? b.applicantPerSeat ?? -1 : metric === 'salary' ? b.salaryMaxAverage ?? -1 : b.quota;
      return bv - av;
    });
    return result;
  }, [currentRows, params, type]);
  function rankBy(rank: string) { const next = new URLSearchParams(params); next.set('rank', rank); next.set('sortBy', rank); setParams(next); }
  function drill(row: GroupRow) {
    const next = new URLSearchParams(params);
    const param = type === 'agencies' ? 'agency' : type === 'positions' ? 'position' : 'province';
    const value = type === 'competition' ? row.name.split(' · ')[0] : row.name;
    next.set(param, value); navigate(`/database?${next.toString()}`);
  }
  const chartData = sorted.slice(0, 10).map((row) => ({ name: row.name.length > 27 ? `${row.name.slice(0, 25)}…` : row.name, quota: row.quota, records: row.records, applicants: row.applicants ?? 0 }));
  const distribution = ['Relatif Rendah', 'Menengah', 'Tinggi', 'Sangat Tinggi', 'Data persaingan belum tersedia'].map((label) => ({ name: label, value: formations.filter((row) => labelCompetition(row.applicantPerSeat, thresholds) === label).length }));
  const scatter = formations.filter((row) => row.applicantCount !== null && row.quota > 0).map((row) => ({ quota: row.quota, applicants: row.applicantCount!, name: `${row.positionName} · ${row.agencyName}` }));
  function updateThreshold(key: 'low' | 'medium' | 'high', value: number) { const next = { ...thresholds, [key]: value }; setThresholds(next); localStorage.setItem('mi-casn-competition-thresholds-v1', JSON.stringify(next)); }
  const exact = params.get('matchingCategory') === 'EXACT_MATCH';
  return <div className="space-y-5">
    <PageIntro eyebrow={meta.eyebrow} title={meta.title} description={meta.description} action={type !== 'competition' ? <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">Peringkat<select value={params.get('rank') ?? 'quota'} onChange={(event) => rankBy(event.target.value)} className="field-select w-[170px]"><option value="quota">Total kuota</option><option value="records">Jumlah record</option><option value="applicants">Jumlah pelamar</option><option value="competition">Pelamar per kuota</option><option value="salary">Rata-rata gaji</option></select></label> : undefined} />
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">Gagal memuat analisis: {error}</div>}
    {type === 'positions' && <Card className="border-blue-100 bg-blue-50/60"><div className="flex gap-3 p-4"><BadgeCheck className="mt-0.5 shrink-0 text-blue-700" size={17} /><div><p className="text-xs font-bold text-blue-900">Nama jabatan tetap mengikuti dataset</p><p className="mt-1 text-[10px] leading-relaxed text-blue-900/80">Label kategori analitis tidak mengubah nama jabatan resmi. Pencocokan kelayakan D3 Manajemen Informatika tetap berdasarkan teks pendidikan, bukan kata kunci di jabatan.</p></div></div></Card>}
    {type === 'regions' && <Card className="border-amber-100 bg-amber-50/70"><div className="flex gap-3 p-4"><MapPin className="mt-0.5 shrink-0 text-amber-700" size={17} /><div><p className="text-xs font-bold text-amber-900">Lokasi yang tidak tercatat tidak ditebak</p><p className="mt-1 text-[10px] leading-relaxed text-amber-900/80">Formasi tanpa nilai provinsi akan diberi label “Lokasi belum teridentifikasi” di grafik, tanpa dipetakan ke provinsi tertentu.</p></div></div></Card>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label={`${meta.dimension} teranalisis`} value={loading ? '—' : countLabel(count)} detail="Maksimal 100 hasil teratas" icon={<Building2 size={17} />} /><StatCard label="Total kuota ditampilkan" value={loading ? '—' : countLabel(totalQuota)} detail="Dari daftar ranking di bawah" icon={<UsersRound size={17} />} tone="blue" /><StatCard label="Total pelamar" value={loading ? '—' : countLabel(totalApplicants)} detail="Record tanpa angka dikecualikan" icon={<Activity size={17} />} tone="violet" /><StatCard label="Pelamar per kuota" value={loading ? '—' : ratioLabel(averageRatio)} detail="Rasio deskriptif historis" icon={<ArrowDownWideNarrow size={17} />} tone="amber" tooltip="Pelamar dibagi kuota; tidak sama dengan peluang kelulusan." /></div>
    {type === 'competition' && <Card><div className="flex flex-wrap items-start justify-between gap-4 p-4"><div className="flex gap-3"><Activity className="mt-0.5 text-teal-700" size={17} /><div><p className="text-xs font-bold text-slate-800">Kategori deskriptif persaingan</p><p className="mt-1 max-w-lg text-[10px] leading-relaxed text-slate-500">Atur batas rasio pelamar per kursi. Kategori ini hanya untuk membandingkan data historis dan tidak menunjukkan probabilitas kelulusan.</p></div></div><div className="flex flex-wrap gap-2">{([['low', 'Batas rendah'], ['medium', 'Batas menengah'], ['high', 'Batas tinggi']] as const).map(([key, label]) => <label key={key} className="text-[9px] font-semibold text-slate-500">{label}<input type="number" min="0" step="1" value={thresholds[key]} onChange={(event) => updateThreshold(key, Math.max(0, Number(event.target.value)))} className="field-select mt-1 w-[95px]" /></label>)}</div></div>{!(thresholds.low < thresholds.medium && thresholds.medium < thresholds.high) && <p className="px-4 pb-3 text-[10px] font-semibold text-rose-600">Urutkan nilai: batas rendah &lt; menengah &lt; tinggi.</p>}</Card>}
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[.8fr_1.2fr]">
      <ChartCard title={`Top 10 ${meta.dimension.toLowerCase()}`} description="Klik item untuk melihat katalog terkait">
        {loading ? <div className="skeleton h-[300px] rounded-xl" /> : chartData.length ? <div className="h-[310px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }} onClick={(event) => { const row = (event as { activePayload?: { payload?: { name?: string } }[] })?.activePayload?.[0]?.payload; const item = sorted.find((x) => x.name.startsWith(row?.name?.replace('…', '') ?? '')); if (item) drill(item); }}><CartesianGrid stroke="#eef2f6" horizontal={false} /><XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><YAxis dataKey="name" type="category" width={135} tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => countLabel(Number(value))} contentStyle={{ fontSize: 10, borderRadius: 9, borderColor: '#e2e8f0' }} /><Bar dataKey={type === 'competition' ? 'applicants' : 'quota'} name={type === 'competition' ? 'Pelamar' : 'Kuota'} fill="#158078" radius={[0, 5, 5, 0]} barSize={15} cursor="pointer" /></BarChart></ResponsiveContainer></div> : <NoData compact />}
      </ChartCard>
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h3 className="text-sm font-bold text-slate-800">Peringkat {meta.dimension.toLowerCase()}</h3><p className="mt-0.5 text-[10px] text-slate-500">Agregasi dihitung dari dataset dan filter yang aktif</p></div><BarChart3 size={16} className="text-slate-400" /></div>
        {loading ? <div className="space-y-3 p-4">{Array.from({ length: 7 }, (_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div> : !sorted.length ? <NoData compact /> : <div className="max-h-[430px] overflow-auto"><table className="data-table min-w-[650px]"><thead><tr><th>{meta.dimension}</th><th>Record</th><th>Kuota</th><th>Pelamar</th><th>Pelamar / kuota</th>{type === 'competition' && <th>Kategori</th>}<th>Gaji min. rata-rata</th><th>Gaji maks. rata-rata</th></tr></thead><tbody>{sorted.map((row, index) => <tr key={`${row.name}-${index}`}><td><button onClick={() => drill(row)} className="max-w-[220px] text-left font-semibold text-teal-800 hover:underline">{row.name}</button></td><td>{countLabel(row.records)}</td><td>{countLabel(row.quota)}</td><td>{countLabel(row.applicants)}</td><td>{ratioLabel(row.applicantPerSeat)}</td>{type === 'competition' && <td><CompetitionBadge label={row.competitionLabel ?? 'Data persaingan belum tersedia'} /></td>}<td>{shortCurrency(row.salaryMinAverage)}</td><td>{shortCurrency(row.salaryMaxAverage)}</td></tr>)}</tbody></table></div>}
      </Card>
    </div>
    {type === 'competition' && <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><ChartCard title="Kuota vs jumlah pelamar" description="Setiap titik mewakili satu formasi dengan data persaingan tersedia"><div className="h-[280px]">{scatter.length ? <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ left: 8, right: 16, top: 12, bottom: 8 }}><CartesianGrid stroke="#eef2f6" /><XAxis type="number" dataKey="quota" name="Kuota" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><YAxis type="number" dataKey="applicants" name="Pelamar" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><ZAxis range={[40, 90]} /><Tooltip formatter={(value) => countLabel(Number(value))} contentStyle={{ fontSize: 9, borderRadius: 8 }} /><Scatter data={scatter} fill="#158078" fillOpacity={0.65} /></ScatterChart></ResponsiveContainer> : <NoData compact message="Data pelamar belum tersedia untuk scatter plot." />}</div></ChartCard>
      <ChartCard title="Distribusi kategori persaingan" description="Kategori dihitung ulang memakai batas yang Anda atur"><div className="h-[280px]">{formations.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} nameKey="name" dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={3}>{distribution.map((_, index) => <Cell key={index} fill={['#43a58f', '#4e9dc0', '#dfa74e', '#c66e57', '#b7c1cc'][index]} />)}</Pie><Tooltip formatter={(value) => countLabel(Number(value))} contentStyle={{ fontSize: 10, borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 9 }} /></PieChart></ResponsiveContainer> : <NoData compact />}</div></ChartCard>
    </div>}
    {type === 'positions' && sorted.length > 0 && <Card><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-bold text-slate-800">Kategori analitis jabatan</h3><p className="mt-0.5 text-[10px] text-slate-500">Kategori membantu eksplorasi, tidak mengganti nama jabatan resmi.</p></div><div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">{[...new Set(sorted.map((row) => positionCategory(row.name)))].map((category) => <div key={category} className="rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-semibold text-slate-500">Kategori</p><p className="mt-1 text-xs font-bold text-slate-800">{category}</p><p className="mt-1 text-[10px] text-slate-500">{countLabel(sorted.filter((row) => positionCategory(row.name) === category).length)} nama jabatan di hasil teratas</p></div>)}</div></Card>}
    {type === 'competition' && <Card className="border-emerald-100 bg-emerald-50/50"><CardContent className="p-4"><div className="flex gap-3"><UsersRound size={17} className="mt-0.5 shrink-0 text-emerald-800" /><div><p className="text-xs font-bold text-emerald-900">Formasi berkuota besar dengan pelamar relatif rendah</p><p className="mt-1 text-[10px] text-emerald-900/75">Daftar berikut hanya dapat dihitung jika kuota dan pelamar tersedia pada dataset.</p><div className="mt-3 flex flex-wrap gap-2">{[...formations].filter((row) => row.applicantPerSeat !== null).sort((a, b) => b.quota - a.quota || a.applicantPerSeat! - b.applicantPerSeat!).slice(0, 3).map((row) => <button key={row.id} onClick={() => navigate(`/database?q=${encodeURIComponent(row.positionName)}`)} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left"><p className="max-w-[220px] truncate text-[10px] font-bold text-slate-800">{row.positionName}</p><p className="mt-1 text-[9px] text-slate-500">{countLabel(row.quota)} kuota · {ratioLabel(row.applicantPerSeat)}</p></button>)}{formations.every((row) => row.applicantPerSeat === null) && <p className="text-[10px] text-slate-500">Data persaingan belum tersedia.</p>}</div></div></div></CardContent></Card>}
    {type === 'agencies' && exact && <p className="text-[10px] text-slate-500">Filter global exact match aktif. Matikan filter tersebut untuk melihat seluruh jenis kecocokan pendidikan.</p>}
  </div>;
}

function labelCompetition(ratio: number | null, thresholds: { low: number; medium: number; high: number }) {
  if (ratio === null) return 'Data persaingan belum tersedia';
  if (ratio < thresholds.low) return 'Relatif Rendah';
  if (ratio <= thresholds.medium) return 'Menengah';
  if (ratio <= thresholds.high) return 'Tinggi';
  return 'Sangat Tinggi';
}
function CompetitionBadge({ label }: { label: string }) {
  const color = label === 'Relatif Rendah' ? 'bg-emerald-50 text-emerald-700' : label === 'Menengah' ? 'bg-blue-50 text-blue-700' : label === 'Tinggi' ? 'bg-amber-50 text-amber-800' : label === 'Sangat Tinggi' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500';
  return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${color}`}>{label}</span>;
}

function positionCategory(name: string) {
  const text = name.toUpperCase();
  if (/PRANATA KOMPUTER/.test(text)) return 'Pranata Komputer';
  if (/DATABASE|BASIS DATA/.test(text)) return 'Administrator Database';
  if (/SISTEM INFORMASI/.test(text)) return 'Pengelola Sistem Informasi';
  if (/TEKNOLOGI INFORMASI/.test(text)) return 'Pengelola Teknologi Informasi';
  if (/OPERATOR/.test(text) && /SISTEM|KOMPUTER/.test(text)) return 'Operator Sistem';
  if (/PENGELOLA DATA|DATA/.test(text)) return 'Pengelola Data';
  if (/TEKNISI KOMPUTER|TEKNISI/.test(text)) return 'Teknisi Komputer';
  if (/APLIKASI|PROGRAMMER/.test(text)) return 'Pengelola Aplikasi';
  if (/ADMINISTRASI|PENGELOLA/.test(text)) return 'Jabatan administrasi / pengelolaan';
  return 'Jabatan lain sesuai dataset';
}
