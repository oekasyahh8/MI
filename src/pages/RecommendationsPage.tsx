import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, ChevronDown, Info, Lightbulb, MapPin, Save, Scale, Star, UsersRound } from 'lucide-react';
import { api, queryString } from '../lib/api';
import { addFavorite } from '../lib/planning';
import { countLabel, ratioLabel, shortCurrency } from '../lib/format';
import type { Formation } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { NoData, PageIntro, StatCard } from '../components/shared';

type Weights = { education: number; quota: number; competition: number; salary: number; location: number };
type Recommendation = Formation & { score: number; scoreLabel: string; priority: string; limitation: string; reasons: string[]; scoreBreakdown: Record<string, { value: number; weight: number }> };
const defaults: Weights = { education: 40, quota: 20, competition: 20, salary: 10, location: 10 };
const categories = ['EXACT_MATCH', 'RELATED_MATCH', 'MANUAL_REVIEW', 'NO_MATCH'];

export function RecommendationsPage() {
  const [params] = useSearchParams(); const key = params.toString();
  const [weights, setWeights] = useState<Weights>(defaults); const [savedWeights, setSavedWeights] = useState<Weights>(defaults);
  const [items, setItems] = useState<Recommendation[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const totalWeight = Object.values(weights).reduce((sum, val) => sum + val, 0);
  const query = useMemo(() => new URLSearchParams(key), [key]);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const search = new URLSearchParams(query);
    Object.entries(savedWeights).forEach(([name, value]) => search.set(name, String(value)));
    api<{ weights: Weights; recommendations: Recommendation[] }>(`/analytics/recommendations?${queryString(search)}`)
      .then((result) => { if (active) setItems(result.data.recommendations); }).catch((e: Error) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key, savedWeights]);
  function setWeight(name: keyof Weights, value: number) { setWeights((current) => ({ ...current, [name]: value })); }
  function applyWeights() { setSavedWeights({ ...weights }); }
  const matchCount = Object.fromEntries(categories.map((category) => [category, items.filter((item) => item.matchingCategory === category).length]));

  return <div className="space-y-5">
    <PageIntro eyebrow="STRATEGI PERSIAPAN 2026" title="Rekomendasi Strategi" description="Susun prioritas riset formasi dari sinyal historis dengan bobot yang dapat diubah dan alasan yang terbuka." action={<Button variant="secondary" onClick={() => { setWeights(defaults); setSavedWeights(defaults); }}><Scale size={14} />Bobot awal</Button>} />
    <Card className="border-teal-100 bg-[#f7fbfa]"><div className="flex gap-3 p-4"><Lightbulb className="mt-0.5 shrink-0 text-teal-800" size={18} /><div><p className="text-xs font-bold text-teal-900">Skor Prioritas Analisis Historis</p><p className="mt-1 text-[10px] leading-relaxed text-teal-900/80">Skor 0–100 membantu memilih data yang layak diteliti lebih dulu. Skor ini bukan peluang atau probabilitas lolos seleksi CPNS. Kelayakan pendidikan harus diperiksa kembali ke pengumuman resmi instansi.</p></div></div></Card>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Rekomendasi tersedia" value={countLabel(items.length)} detail="Maksimal 100 baris kandidat" icon={<BadgeCheck size={17} />} /><StatCard label="Exact match di daftar" value={countLabel(matchCount.EXACT_MATCH)} detail="Pendidikan eksplisit" icon={<UsersRound size={17} />} tone="blue" /><StatCard label="Perlu review di daftar" value={countLabel(matchCount.MANUAL_REVIEW)} detail="Kualifikasi belum jelas" icon={<Info size={17} />} tone="amber" /><StatCard label="Bobot aktif" value={`${totalWeight}%`} detail={totalWeight === 100 ? 'Total bobot seimbang' : 'Dinormalisasi otomatis pada skor'} icon={<Scale size={17} />} tone="violet" />
    </div>
    <Card><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4"><div><h3 className="text-sm font-bold text-slate-800">Atur bobot penilaian</h3><p className="mt-1 text-[10px] text-slate-500">Nilai tiap kriteria membentuk skor dengan total bobot dinormalisasi.</p></div><Button size="sm" onClick={applyWeights}><Save size={13} />Terapkan bobot</Button></div>
      <div className="grid gap-5 p-4 sm:grid-cols-2 lg:grid-cols-5">{([
        ['education', 'Kecocokan pendidikan'], ['quota', 'Jumlah kuota'], ['competition', 'Rasio persaingan'], ['salary', 'Rentang gaji'], ['location', 'Wilayah pilihan'],
      ] as [keyof Weights, string][]).map(([name, label]) => <label key={name} className="block"><div className="mb-2 flex items-center justify-between text-[10px]"><span className="font-semibold text-slate-600">{label}</span><span className="font-bold text-teal-800">{weights[name]}%</span></div><input type="range" min="0" max="60" step="5" value={weights[name]} onChange={(event) => setWeight(name, Number(event.target.value))} className="w-full accent-teal-700" /><p className="mt-1 text-[9px] text-slate-400">Rentang 0–60%</p></label>)}</div>
    </Card>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">Tidak dapat menghitung rekomendasi: {error}</div>}
    <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h3 className="text-sm font-bold text-slate-800">Daftar prioritas analisis</h3><p className="mt-0.5 text-[10px] text-slate-500">Bobot: pendidikan {savedWeights.education}% · kuota {savedWeights.quota}% · persaingan {savedWeights.competition}% · gaji {savedWeights.salary}% · lokasi {savedWeights.location}%</p></div><ChevronDown size={16} className="text-slate-400" /></div>
      {loading ? <div className="space-y-3 p-4">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-[90px] rounded-xl" />)}</div> : !items.length ? <NoData compact /> : <div className="divide-y divide-slate-100">{items.slice(0, 30).map((item, index) => <article key={item.id} className="grid gap-3 p-4 md:grid-cols-[50px_1fr_auto] md:items-center">
        <div className="flex size-10 flex-col items-center justify-center rounded-xl bg-slate-100"><span className="font-display text-sm font-extrabold text-slate-700">{index + 1}</span><span className="text-[8px] font-bold text-slate-400">RANK</span></div>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="text-xs font-bold text-slate-800">{item.positionName}</h4><PriorityBadge priority={item.priority} /></div><p className="mt-1 text-[10px] text-slate-500">{item.agencyName}{item.unitWorkName ? ` · ${item.unitWorkName}` : ''}</p><div className="mt-2 grid gap-x-4 gap-y-1 text-[10px] text-slate-600 sm:grid-cols-2 lg:grid-cols-4"><span>Kuota: <b>{countLabel(item.quota)}</b></span><span>Pelamar: <b>{countLabel(item.applicantCount)}</b></span><span>Pelamar / kuota: <b>{ratioLabel(item.applicantPerSeat)}</b></span><span>Gaji: <b>{shortCurrency(item.salaryMin)} – {shortCurrency(item.salaryMax)}</b></span></div><p className="mt-2 text-[10px] text-slate-500">Pendidikan: {item.requiredEducationRaw ?? 'Belum dapat diverifikasi'}</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(item.scoreBreakdown).map(([key, value]) => <span key={key} className="rounded bg-slate-50 px-2 py-1 text-[8px] text-slate-500">{key}: {Math.round(value.value)} × {value.weight}%</span>)}</div><ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{item.reasons.map((reason, i) => <li key={i} className="max-w-[380px] text-[9px] leading-relaxed text-slate-500">• {reason}</li>)}</ul><p className="mt-1 text-[9px] italic text-slate-400">{item.limitation}</p></div>
        <div className="flex items-center gap-2 md:flex-col"><div className="grid size-12 place-items-center rounded-full border-[3px] border-teal-100 bg-teal-50"><span className="font-display text-sm font-extrabold text-teal-800">{item.score}</span></div><span className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Prioritas</span><Button size="sm" variant="secondary" onClick={() => addFavorite(item.id)}><Star size={12} />Simpan</Button></div>
      </article>)}</div>}
    </Card>
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4"><MapPin size={16} className="mt-0.5 shrink-0 text-slate-500" /><div><p className="text-xs font-bold text-slate-700">Wilayah pilihan pada bobot lokasi</p><p className="mt-1 text-[10px] text-slate-500">Isi filter Provinsi di bagian atas untuk memberi nilai lebih pada kecocokan wilayah tersebut. Tanpa filter provinsi, wilayah tersedia mendapat nilai parsial.</p></div></div>
  </div>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const className = priority.includes('Tinggi') ? 'bg-emerald-50 text-emerald-800' : priority.includes('Menengah') ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600';
  return <span className={`rounded-full px-2 py-1 text-[8px] font-bold ${className}`}>{priority}</span>;
}
