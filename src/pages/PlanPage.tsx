import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, GitCompareArrows, MapPin, MessageSquareText, Plus, Star, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { getFavorites, removeFavorite, updateFavorite, getComparison, setComparison } from '../lib/planning';
import { countLabel, ratioLabel, shortCurrency } from '../lib/format';
import type { Formation, LocalFavorite } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { NoData, PageIntro } from '../components/shared';

const statuses = ['Belum Dipelajari', 'Sedang Dianalisis', 'Target Prioritas', 'Cadangan', 'Tidak Dipilih'];

export function PlanPage() {
  const [favorites, setFavorites] = useState<LocalFavorite[]>(getFavorites());
  const [formations, setFormations] = useState<Formation[]>([]);
  const [targets, setTargets] = useState(() => { try { return JSON.parse(localStorage.getItem('mi-casn-targets-v1') ?? '{"province":"","position":""}') as { province: string; position: string }; } catch { return { province: '', position: '' }; } });
  const [compareIds, setCompareIds] = useState<number[]>(getComparison()); const [savingTarget, setSavingTarget] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all(favorites.map((item) => api<Formation>(`/formations/${item.formationId}`).then((r) => r.data).catch(() => null)))
      .then((rows) => { if (active) setFormations(rows.filter((row): row is Formation => row !== null)); });
    return () => { active = false; };
  }, [favorites.map((item) => `${item.formationId}:${item.status}:${item.note}`).join(',')]);
  function refresh() { setFavorites(getFavorites()); }
  function update(id: number, data: Partial<LocalFavorite>) { updateFavorite(id, data); refresh(); }
  function remove(id: number) { removeFavorite(id); refresh(); setFormations((current) => current.filter((row) => row.id !== id)); }
  function toggleCompare(id: number) {
    const next = compareIds.includes(id) ? compareIds.filter((item) => item !== id) : [...compareIds, id].slice(0, 5);
    setCompareIds(next); setComparison(next);
  }
  function saveTargets() { setSavingTarget(true); localStorage.setItem('mi-casn-targets-v1', JSON.stringify(targets)); window.setTimeout(() => setSavingTarget(false), 600); }
  const favoriteMap = new Map(favorites.map((item) => [item.formationId, item]));
  return <div className="space-y-5">
    <PageIntro eyebrow="PERENCANAAN PRIBADI" title="My CPNS Plan" description="Favorit, status persiapan, catatan, dan target disimpan di local storage pada perangkat ini." action={<Button asChild variant="secondary"><Link to="/database"><Plus size={14} />Tambah dari katalog</Link></Button>} />
    <Card><div className="flex items-start gap-3 border-b border-slate-200 p-4"><MapPin size={17} className="mt-0.5 text-teal-700" /><div><h3 className="text-sm font-bold text-slate-800">Target riset</h3><p className="mt-0.5 text-[10px] text-slate-500">Preferensi ini disimpan lokal, tidak dikirim ke server.</p></div></div><div className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]"><label><span className="mb-1 block text-[10px] font-semibold text-slate-500">Target wilayah</span><input className="field-select" value={targets.province} onChange={(event) => setTargets({ ...targets, province: event.target.value })} placeholder="Contoh: Jawa Barat" /></label><label><span className="mb-1 block text-[10px] font-semibold text-slate-500">Target jabatan</span><input className="field-select" value={targets.position} onChange={(event) => setTargets({ ...targets, position: event.target.value })} placeholder="Contoh: Pranata Komputer" /></label><Button className="self-end" onClick={saveTargets}>{savingTarget ? <Check size={14} /> : <Bookmark size={14} />}Simpan target</Button></div></Card>
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-800">Shortlist formasi</h3><p className="mt-1 text-[10px] text-slate-500">{countLabel(favorites.length)} favorit tersimpan · pilih 2–5 formasi untuk perbandingan</p></div>{compareIds.length >= 2 && <Button asChild><Link to="/compare"><GitCompareArrows size={14} />Bandingkan {compareIds.length} formasi</Link></Button>}</div>
    {favorites.length === 0 ? <Card><NoData title="Belum ada formasi favorit" message="Simpan formasi dari katalog atau rekomendasi, lalu tambahkan catatan dan status persiapan." /></Card> : <div className="space-y-3">{formations.map((formation) => {
      const favorite = favoriteMap.get(formation.id)!;
      return <Card key={formation.id}><div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.1fr_auto] lg:items-start"><div><div className="flex items-center gap-2"><Star size={15} className="fill-amber-400 text-amber-400" /><h4 className="text-xs font-bold text-slate-800">{formation.positionName}</h4></div><p className="mt-1 text-[10px] text-slate-500">{formation.agencyName}</p><div className="mt-2 flex flex-wrap gap-2 text-[9px] text-slate-500"><span>{countLabel(formation.quota)} kuota</span><span>•</span><span>{ratioLabel(formation.applicantPerSeat)}</span><span>•</span><span>{shortCurrency(formation.salaryMax)}</span><span>•</span><span>{formation.province ?? 'Wilayah belum teridentifikasi'}</span></div><div className="mt-3"><label className="text-[9px] font-semibold text-slate-500">Status persiapan<select className="field-select mt-1 max-w-[210px]" value={favorite.status} onChange={(event) => update(formation.id, { status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label></div></div>
        <div><label className="mb-2 block text-[9px] font-semibold text-slate-500">Alasan memilih / catatan riset<textarea className="field-select mt-1 min-h-[76px] resize-y py-2" placeholder="Tambahkan pertimbangan, tanggal periksa, atau tautan sumber resmi…" value={favorite.note} onChange={(event) => update(formation.id, { note: event.target.value })} /><span className="mt-1 block text-right text-[9px] text-slate-400">Tersimpan otomatis di perangkat ini</span></label></div>
        <div className="flex items-center gap-2 lg:flex-col"><Button variant={compareIds.includes(formation.id) ? 'primary' : 'secondary'} size="sm" onClick={() => toggleCompare(formation.id)}><GitCompareArrows size={13} />{compareIds.includes(formation.id) ? 'Dipilih' : 'Bandingkan'}</Button><button onClick={() => remove(formation.id)} aria-label="Hapus favorit" className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button></div>
      </div></Card>;
    })}{formations.length < favorites.length && <p className="text-[10px] text-slate-500">Sebagian favorit tidak ditemukan di dataset aktif. Data tersebut tetap tersimpan dalam catatan lokal.</p>}</div>}
    <Card className="border-slate-200 bg-white"><div className="flex gap-3 p-4"><MessageSquareText size={17} className="mt-0.5 shrink-0 text-slate-500" /><div><p className="text-xs font-bold text-slate-700">Privasi shortlist</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">Favorit dan catatan tidak memuat identitas sensitif. Karena aplikasi ini belum memakai autentikasi, data personal hanya tersimpan di browser saat ini dan dapat hilang bila data situs dihapus.</p></div></div></Card>
  </div>;
}
