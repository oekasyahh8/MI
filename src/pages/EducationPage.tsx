import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpenCheck, Building2, CheckCircle2, CircleHelp, MapPin, SearchCheck, UsersRound } from 'lucide-react';
import { api, queryString } from '../lib/api';
import { countLabel, ratioLabel, shortCurrency } from '../lib/format';
import type { Formation, MatchingCategory } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { NoData, PageIntro, StatCard } from '../components/shared';

type Group = { agencyName?: string | null; positionName?: string | null; province?: string | null; regency?: string | null; unitWorkName?: string | null; procurementType?: string | null; locationCount: number; _sum: { quota: number | null; applicantCount: number | null }; _avg: { salaryMin: number | null; salaryMax: number | null }; _count: { _all: number } };
type EducationAnalytics = { exactRecords: number; exactQuota: number; exactAgencyCount: number; exactPositionCount: number; exactRegionCount: number; related: { records: number; quota: number }; manualReview: number; rekap: { instansi: Group[]; jabatan: Group[]; provinsi: Group[]; kabupatenKota: Group[]; unitKerja: Group[]; jenisPengadaan: Group[] } };
const tabs: { label: string; key: string; field: string }[] = [
  { label: 'Instansi', key: 'instansi', field: 'agencyName' }, { label: 'Jabatan', key: 'jabatan', field: 'positionName' },
  { label: 'Provinsi', key: 'provinsi', field: 'province' }, { label: 'Kabupaten / kota', key: 'kabupatenKota', field: 'regency' },
  { label: 'Unit kerja', key: 'unitKerja', field: 'unitWorkName' }, { label: 'Jenis pengadaan', key: 'jenisPengadaan', field: 'procurementType' },
];

export function EducationPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const key = params.toString();
  const [analytics, setAnalytics] = useState<EducationAnalytics | null>(null);
  const [rows, setRows] = useState<Formation[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState('instansi');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const query = new URLSearchParams(key); const listQuery = new URLSearchParams(key); listQuery.set('pageSize', '25'); listQuery.set('sortBy', 'quota'); listQuery.set('sortOrder', 'desc');
    Promise.all([api<EducationAnalytics>(`/analytics/education?${queryString(query)}`), api<Formation[]>(`/formations?${queryString(listQuery)}`)])
      .then(([a, b]) => { if (active) { setAnalytics(a.data); setRows(b.data); setTotal(b.meta?.total ?? 0); } })
      .catch((e: Error) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key]);

  function selectCategory(category?: MatchingCategory) { const next = new URLSearchParams(params); if (category) next.set('matchingCategory', category); else next.delete('matchingCategory'); next.delete('page'); setParams(next); }
  function drill(field: string, value: string) { const next = new URLSearchParams(params); next.set(field, value); next.set('matchingCategory', 'EXACT_MATCH'); navigate(`/database?${next.toString()}`); }
  const exact = analytics?.exactRecords ?? 0;
  const groupRows = analytics?.rekap[tab as keyof EducationAnalytics['rekap']] ?? [];
  const selectedTab = tabs.find((item) => item.key === tab)!;

  return <div className="space-y-5">
    <PageIntro eyebrow="ANALISIS PENDIDIKAN" title="Analisis Peluang D3 Manajemen Informatika" description="Klasifikasi dilakukan dari teks persyaratan pendidikan, terpisah dari nama jabatan. Teks asli selalu disimpan untuk diperiksa." action={<Button variant="secondary" onClick={() => navigate('/database?matchingCategory=EXACT_MATCH')}>Lihat katalog exact match</Button>} />
    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4"><div className="flex items-start gap-3"><BookOpenCheck size={18} className="mt-0.5 shrink-0 text-blue-700" /><div><p className="text-xs font-bold text-blue-900">Kriteria pencocokan yang konservatif</p><p className="mt-1 text-[10px] leading-relaxed text-blue-800">Exact match memerlukan D-III dan Manajemen Informatika tercantum eksplisit. Program serumpun masuk related match dan tidak dianggap otomatis memenuhi syarat. Jika pendidikan kosong atau jenjang ambigu, tandai tinjauan manual.</p></div></div></div>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">Gagal memuat analisis: {error}</div>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard label="Formasi exact match" value={countLabel(analytics?.exactRecords)} detail="Pendidikan disebut eksplisit" icon={<CheckCircle2 size={17} />} />
      <StatCard label="Total kuota exact match" value={countLabel(analytics?.exactQuota)} detail="Dari record exact match" icon={<UsersRound size={17} />} tone="blue" />
      <StatCard label="Instansi exact match" value={countLabel(analytics?.exactAgencyCount)} detail="Seluruh instansi pada filter" icon={<Building2 size={17} />} tone="violet" />
      <StatCard label="Jabatan exact match" value={countLabel(analytics?.exactPositionCount)} detail="Seluruh jabatan pada filter" icon={<SearchCheck size={17} />} tone="amber" />
      <StatCard label="Formasi related match" value={countLabel(analytics?.related.records)} detail="Perlu verifikasi persyaratan resmi" icon={<CircleHelp size={17} />} tone="blue" />
      <StatCard label="Kuota related match" value={countLabel(analytics?.related.quota)} detail="Tidak otomatis memenuhi syarat" icon={<UsersRound size={17} />} tone="amber" />
      <StatCard label="Perlu tinjauan manual" value={countLabel(analytics?.manualReview)} detail="Pendidikan ambigu / tidak tersedia" icon={<CircleHelp size={17} />} tone="violet" />
      <StatCard label="Wilayah exact match" value={countLabel(analytics?.exactRegionCount)} detail="Provinsi yang tercatat" icon={<MapPin size={17} />} />
    </div>
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h3 className="text-sm font-bold text-slate-800">Rekapitulasi exact match</h3><p className="mt-0.5 text-[10px] text-slate-500">Jumlah record, kuota, pelamar, rata-rata gaji, dan lokasi</p></div><div className="flex flex-wrap gap-1">{tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${tab === item.key ? 'bg-teal-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{item.label}</button>)}</div></div>
      {loading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div> : !exact ? <NoData compact title="Belum ada hasil exact match" message="Setelah dataset diimpor, analisis akan menampilkan formasi yang secara eksplisit mensyaratkan D-III Manajemen Informatika." /> : <div className="overflow-x-auto"><table className="data-table min-w-[820px]"><thead><tr><th>{selectedTab.label}</th><th>Jumlah record</th><th>Total kuota</th><th>Total pelamar</th><th>Pelamar / kuota</th><th>Rata-rata gaji min.</th><th>Rata-rata gaji maks.</th><th>Lokasi</th></tr></thead><tbody>{groupRows.map((row, index) => {
        const name = row[selectedTab.field as keyof Group] as string | null; const quota = row._sum.quota ?? 0; const applicants = row._sum.applicantCount ?? null;
        return <tr key={`${name}-${index}`}><td><button className="max-w-[270px] text-left font-semibold text-teal-800 hover:underline" onClick={() => name && drill(selectedTab.field === 'agencyName' ? 'agency' : selectedTab.field === 'positionName' ? 'position' : selectedTab.field, name)}>{name ?? 'Lokasi belum teridentifikasi'}</button></td><td>{countLabel(row._count._all)}</td><td>{countLabel(quota)}</td><td>{countLabel(applicants)}</td><td>{ratioLabel(applicants !== null && quota > 0 ? applicants / quota : null)}</td><td>{shortCurrency(row._avg.salaryMin)}</td><td>{shortCurrency(row._avg.salaryMax)}</td><td>{countLabel(row.locationCount)}</td></tr>;
      })}</tbody></table></div>}
    </Card>
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h3 className="text-sm font-bold text-slate-800">Persyaratan pendidikan dalam dataset</h3><p className="mt-0.5 text-[10px] text-slate-500">Teks sumber ditampilkan tanpa mengganti ketentuan instansi</p></div><select aria-label="Filter kategori matching" value={params.get('matchingCategory') ?? ''} onChange={(e) => selectCategory((e.target.value || undefined) as MatchingCategory | undefined)} className="field-select w-[190px]"><option value="">Semua kategori</option><option value="EXACT_MATCH">Exact match</option><option value="RELATED_MATCH">Related match</option><option value="MANUAL_REVIEW">Perlu tinjauan manual</option><option value="NO_MATCH">Tidak cocok</option></select></div>
      {!loading && rows.length === 0 ? <NoData compact /> : <div className="overflow-x-auto"><table className="data-table min-w-[850px]"><thead><tr><th>Jabatan</th><th>Instansi</th><th>Pendidikan asli</th><th>Kuota</th><th>Kategori</th><th>Alasan kecocokan</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="font-semibold text-slate-700">{row.positionName}</td><td>{row.agencyName}</td><td className="max-w-[260px] whitespace-pre-wrap">{row.requiredEducationRaw ?? 'Belum dapat diverifikasi'}</td><td>{countLabel(row.quota)}</td><td><MatchBadge category={row.matchingCategory} /></td><td className="max-w-[250px]">{row.matchingReason}</td></tr>)}</tbody></table></div>}
      {!loading && rows.length > 0 && <div className="border-t border-slate-200 px-4 py-3 text-[10px] text-slate-500">Menampilkan {countLabel(rows.length)} dari {countLabel(total)} record terfilter.</div>}
    </Card>
    <Card className="border-amber-100 bg-amber-50/60"><div className="flex gap-3 p-4"><CircleHelp className="mt-0.5 shrink-0 text-amber-700" size={17} /><div><p className="text-xs font-bold text-amber-900">Verifikasi sebelum memilih formasi</p><p className="mt-1 text-[10px] leading-relaxed text-amber-900/80">Kecocokan pada dashboard adalah penyaringan awal terhadap data historis. Periksa persyaratan resmi pada pengumuman instansi dan portal SSCASN sebelum mengambil keputusan. Related match tidak berarti kualifikasi Anda pasti diterima.</p></div></div></Card>
  </div>;
}

function MatchBadge({ category }: { category: MatchingCategory }) {
  const className = category === 'EXACT_MATCH' ? 'bg-emerald-50 text-emerald-700' : category === 'RELATED_MATCH' ? 'bg-blue-50 text-blue-700' : category === 'MANUAL_REVIEW' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600';
  const label = category === 'EXACT_MATCH' ? 'Exact match' : category === 'RELATED_MATCH' ? 'Related match' : category === 'MANUAL_REVIEW' ? 'Tinjauan manual' : 'Tidak cocok';
  return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${className}`}>{label}</span>;
}
