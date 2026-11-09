import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, GitCompareArrows, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { getComparison, setComparison } from '../lib/planning';
import { countLabel, ratioLabel, shortCurrency } from '../lib/format';
import type { Formation } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { NoData, PageIntro } from '../components/shared';

export function ComparePage() {
  const [ids, setIds] = useState<number[]>(getComparison()); const [rows, setRows] = useState<Formation[]>([]); const [scores, setScores] = useState<Map<number, number>>(new Map()); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true);
    Promise.all([Promise.all(ids.map((id) => api<Formation>(`/formations/${id}`).then((result) => result.data).catch(() => null))), api<{ recommendations: { id: number; score: number }[] }>(`/analytics/recommendations?ids=${ids.join(',')}`).then((r) => r.data.recommendations).catch(() => [])])
      .then(([items, recommendations]) => { if (active) { setRows(items.filter((item): item is Formation => item !== null)); setScores(new Map(recommendations.map((item) => [item.id, item.score]))); } }).catch((e: Error) => setError(e.message)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ids.join(',')]);
  function remove(id: number) { const next = ids.filter((value) => value !== id); setIds(next); setComparison(next); }
  const chart = rows.map((row, index) => ({ name: `${index + 1}. ${row.positionName.slice(0, 13)}`, kuota: row.quota, rasio: row.applicantPerSeat ?? 0, gajiMaksimum: row.salaryMax ?? 0 }));
  const fields: [string, (row: Formation) => string][] = [
    ['Instansi', (row) => row.agencyName], ['Jabatan', (row) => row.positionName], ['Pendidikan dipersyaratkan', (row) => row.requiredEducationRaw ?? 'Belum tersedia'],
    ['Kuota', (row) => countLabel(row.quota)], ['Jumlah pelamar', (row) => countLabel(row.applicantCount)], ['Pelamar per kuota', (row) => ratioLabel(row.applicantPerSeat)],
    ['Gaji minimum', (row) => shortCurrency(row.salaryMin)], ['Gaji maksimum', (row) => shortCurrency(row.salaryMax)], ['Provinsi', (row) => row.province ?? 'Lokasi belum teridentifikasi'],
    ['Kabupaten / kota', (row) => row.regency ?? 'Tidak tersedia'], ['Jenis pengadaan', (row) => row.procurementType ?? 'Tidak tersedia'], ['Jenis formasi', (row) => row.formationType ?? 'Tidak tersedia'],
    ['Skor prioritas analisis historis', (row) => scores.has(row.id) ? `${scores.get(row.id)} / 100` : 'Tidak tersedia'],
  ];
  return <div className="space-y-5">
    <PageIntro eyebrow="PERBANDINGAN FORMASI" title="Bandingkan Formasi" description="Pilih minimal 2 dan maksimal 5 formasi dari Database Formasi atau My CPNS Plan." action={<Button asChild variant="secondary"><Link to="/database"><ArrowLeftRight size={14} />Pilih formasi</Link></Button>} />
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    {loading ? <div className="skeleton h-[220px] rounded-2xl" /> : rows.length < 2 ? <Card><NoData title="Pilih setidaknya dua formasi" message="Tambahkan formasi ke perbandingan dari katalog, lalu kembali ke halaman ini. Anda dapat membandingkan maksimal lima formasi." /></Card> : <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{[
        ['Perbandingan kuota', 'kuota', '#16847b'], ['Perbandingan pelamar / kuota', 'rasio', '#397da5'], ['Perbandingan gaji maksimum', 'gajiMaksimum', '#8b78ac'],
      ].map(([title, key, color]) => <Card key={key}><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-xs font-bold text-slate-800">{title}</h3></div><div className="h-[210px] p-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ left: -20, right: 6, bottom: 5 }}><CartesianGrid stroke="#eef2f6" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b' }} interval={0} angle={-12} height={36} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => key === 'gajiMaksimum' ? shortCurrency(Number(value)) : countLabel(Number(value))} contentStyle={{ fontSize: 9, borderRadius: 8 }} /><Bar dataKey={key} name={String(title).replace('Perbandingan ', '')} fill={String(color)} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>)}
      </div>
      <Card className="overflow-hidden"><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-bold text-slate-800">Tabel perbandingan</h3><p className="mt-1 text-[10px] text-slate-500">Nilai yang kosong ditampilkan sebagai tidak tersedia</p></div><div className="overflow-x-auto"><table className="data-table min-w-[720px]"><thead><tr><th>Aspek</th>{rows.map((row) => <th key={row.id} className="min-w-[180px]"><div className="flex items-start justify-between gap-2"><span className="line-clamp-2">{row.agencyName}</span><button aria-label="Hapus dari perbandingan" onClick={() => remove(row.id)} className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={12} /></button></div></th>)}</tr></thead><tbody>{fields.map(([label, getValue]) => <tr key={label}><td className="font-semibold text-slate-600">{label}</td>{rows.map((row) => <td key={`${row.id}-${label}`} className="max-w-[240px] whitespace-pre-wrap">{getValue(row)}</td>)}</tr>)}</tbody></table></div></Card>
    </>}
    <Card className="border-blue-100 bg-blue-50/50"><div className="flex gap-3 p-4"><GitCompareArrows size={17} className="mt-0.5 text-blue-700" /><div><p className="text-xs font-bold text-blue-900">Perbandingan bersifat deskriptif</p><p className="mt-1 text-[10px] leading-relaxed text-blue-900/75">Data pelamar dan rasio merupakan data historis dari dataset yang Anda impor. Angka itu bukan jaminan hasil seleksi mendatang.</p></div></div></Card>
  </div>;
}
