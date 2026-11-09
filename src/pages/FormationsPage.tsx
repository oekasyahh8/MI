import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Download, ExternalLink, Eye, Filter, GitCompareArrows, Search, Star, X } from 'lucide-react';
import { api, downloadExport, queryString } from '../lib/api';
import { addFavorite, getComparison, setComparison } from '../lib/planning';
import { countLabel, displayText, ratioLabel, shortCurrency } from '../lib/format';
import type { Formation } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { NoData, PageIntro } from '../components/shared';

type Column = { key: keyof Formation; label: string; render?: (row: Formation) => React.ReactNode; sort?: string };
const allColumns: Column[] = [
  { key: 'positionName', label: 'Jabatan', sort: 'positionName' }, { key: 'agencyName', label: 'Instansi', sort: 'agencyName' },
  { key: 'unitWorkName', label: 'Unit Kerja' }, { key: 'placementName', label: 'Lokasi Penempatan' }, { key: 'province', label: 'Provinsi', sort: 'province' },
  { key: 'regency', label: 'Kabupaten/Kota' }, { key: 'educationLevel', label: 'Jenjang Pendidikan' }, { key: 'requiredEducationRaw', label: 'Pendidikan Dipersyaratkan' },
  { key: 'quota', label: 'Kuota', sort: 'quota', render: (row) => countLabel(row.quota) }, { key: 'applicantCount', label: 'Pelamar', sort: 'applicantCount', render: (row) => countLabel(row.applicantCount) },
  { key: 'applicantPerSeat', label: 'Pelamar / Kursi', render: (row) => ratioLabel(row.applicantPerSeat) }, { key: 'salaryMin', label: 'Gaji Minimum', sort: 'salaryMin', render: (row) => shortCurrency(row.salaryMin) },
  { key: 'salaryMax', label: 'Gaji Maksimum', sort: 'salaryMax', render: (row) => shortCurrency(row.salaryMax) }, { key: 'procurementType', label: 'Jenis Pengadaan' },
  { key: 'formationType', label: 'Jenis Formasi' }, { key: 'dataSource', label: 'Sumber Data' },
];

export function FormationsPage() {
  const [params, setParams] = useSearchParams();
  const key = params.toString();
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const pageSize = Number(params.get('pageSize') ?? 25);
  const [items, setItems] = useState<Formation[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Formation | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [visible, setVisible] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('mi-casn-visible-columns') ?? '[]') as string[]; } catch { return []; } });

  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const query = new URLSearchParams(key); query.set('page', String(page)); query.set('pageSize', String(pageSize));
    api<Formation[]>(`/formations?${queryString(query)}`).then((res) => {
      if (!active) return; setItems(res.data); setTotal(res.meta?.total ?? 0); setPageCount(res.meta?.pageCount ?? 0);
      if (!visible.length && res.data.length) {
        const selected = allColumns.filter((column) => res.data.some((row) => row[column.key] !== null && row[column.key] !== '')).map((column) => String(column.key));
        setVisible(selected); localStorage.setItem('mi-casn-visible-columns', JSON.stringify(selected));
      }
    }).catch((e: Error) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key, page, pageSize]);

  const columns = useMemo(() => allColumns.filter((column) => visible.includes(String(column.key))), [visible]);
  function change(name: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(name, value); else next.delete(name); next.delete('page'); setParams(next); }
  function changeSort(column: Column) {
    if (!column.sort) return;
    const current = params.get('sortBy'); const next = new URLSearchParams(params);
    if (current === column.sort) next.set('sortOrder', params.get('sortOrder') === 'asc' ? 'desc' : 'asc'); else { next.set('sortBy', column.sort); next.set('sortOrder', 'asc'); }
    next.delete('page'); setParams(next);
  }
  function toggleColumn(keyName: string) {
    const next = visible.includes(keyName) ? visible.filter((item) => item !== keyName) : [...visible, keyName];
    setVisible(next); localStorage.setItem('mi-casn-visible-columns', JSON.stringify(next));
  }
  function addCompare(id: number) {
    const ids = getComparison();
    if (ids.includes(id)) return;
    if (ids.length >= 5) { window.alert('Maksimal 5 formasi untuk dibandingkan.'); return; }
    setComparison([...ids, id]);
  }
  function saveFavorite(id: number) { addFavorite(id); }

  const totalPages = Math.max(1, pageCount);
  return <div>
    <PageIntro eyebrow="KATALOG DATA" title="Database Formasi" description="Pencarian dan tabel menggunakan pagination serta filter server-side. Detail persyaratan tetap menampilkan teks asli dataset." action={<div className="relative flex gap-2"><Button variant="secondary" onClick={() => setFiltersOpen((open) => !open)}><Filter size={14} />Filter</Button><Button variant="secondary" onClick={() => setColumnsOpen((open) => !open)}><Columns3 size={14} />Kolom</Button><Button onClick={() => setExportOpen((open) => !open)}><Download size={14} />Ekspor</Button>
      {(filtersOpen || columnsOpen || exportOpen) && <div className="absolute right-0 top-11 z-20 w-[min(320px,calc(100vw-30px))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        {filtersOpen && <><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold">Filter katalog</p><button onClick={() => setFiltersOpen(false)}><X size={14} /></button></div><div className="grid grid-cols-2 gap-3">
          <FilterField label="Pendidikan" value={params.get('educationLevel') ?? ''} onChange={(v) => change('educationLevel', v)} placeholder="Jenjang" />
          <FilterField label="Kuota minimal" value={params.get('minQuota') ?? ''} onChange={(v) => change('minQuota', v)} type="number" placeholder="0" />
          <FilterField label="Pelamar minimal" value={params.get('minApplicants') ?? ''} onChange={(v) => change('minApplicants', v)} type="number" placeholder="0" />
          <FilterField label="Pelamar maksimum" value={params.get('maxApplicants') ?? ''} onChange={(v) => change('maxApplicants', v)} type="number" placeholder="—" />
          <label className="col-span-2"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Jenis pengadaan</span><select value={params.get('procurementType') ?? ''} onChange={(e) => change('procurementType', e.target.value)} className="field-select"><option value="">Semua</option><option value="CPNS">CPNS</option><option value="PPPK">PPPK</option></select></label>
          <label className="col-span-2"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Pencocokan pendidikan</span><select value={params.get('matchingCategory') ?? ''} onChange={(e) => change('matchingCategory', e.target.value)} className="field-select"><option value="">Semua kategori</option><option value="EXACT_MATCH">Exact match</option><option value="RELATED_MATCH">Related match</option><option value="MANUAL_REVIEW">Tinjauan manual</option><option value="NO_MATCH">Tidak cocok</option></select></label>
        </div><div className="mt-3 flex justify-between"><button className="text-[10px] font-semibold text-slate-500" onClick={() => setParams(new URLSearchParams())}>Reset filter</button><Button size="sm" onClick={() => setFiltersOpen(false)}>Terapkan</Button></div></>}
        {columnsOpen && <><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold">Kolom tabel</p><button onClick={() => setColumnsOpen(false)}><X size={14} /></button></div><div className="grid max-h-[300px] grid-cols-2 gap-2 overflow-auto">{allColumns.map((column) => <label key={String(column.key)} className="flex items-center gap-2 text-[10px] text-slate-600"><input type="checkbox" checked={visible.includes(String(column.key))} onChange={() => toggleColumn(String(column.key))} />{column.label}</label>)}</div></>}
        {exportOpen && <><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold">Ekspor hasil terfilter</p><button onClick={() => setExportOpen(false)}><X size={14} /></button></div><div className="space-y-2">{(['csv', 'xlsx', 'json'] as const).map((format) => <button key={format} onClick={() => { downloadExport(format, params); setExportOpen(false); }} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:bg-slate-50"><span className="font-semibold uppercase text-slate-700">{format}</span><Download size={13} className="text-slate-400" /></button>)}</div><p className="mt-3 text-[10px] text-slate-400">Ekspor mencakup semua hasil filter (maksimal 250.000 baris).</p></>}
      </div>}
    </div>} />
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 sm:max-w-sm"><Search size={14} /><input aria-label="Cari jabatan atau instansi" value={params.get('q') ?? ''} onChange={(event) => change('q', event.target.value)} placeholder="Cari jabatan, instansi, unit kerja…" className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400" /></label>
        <div className="flex items-center gap-2 text-[10px] text-slate-500"><span>Baris per halaman</span><select value={pageSize} onChange={(event) => change('pageSize', event.target.value)} className="field-select h-8 min-h-8 w-[68px] px-2"><option>10</option><option>25</option><option>50</option><option>100</option></select></div>
      </div>
      {error && <div role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">Gagal memuat katalog: {error}</div>}
      {loading ? <div className="space-y-3 p-5">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-9 rounded" />)}</div> : total === 0 ? <NoData compact message="Belum ada formasi yang cocok. Periksa status sinkron otomatis di Data Management atau tambahkan dataset melalui impor file." /> : <>
        <div className="max-h-[calc(100vh-350px)] overflow-auto">
          <table className="data-table min-w-[980px]"><thead><tr><th className="sticky left-0 z-10 w-12 bg-[#f8fafc]">No.</th>{columns.map((column) => <th key={String(column.key)} className={column.sort ? 'cursor-pointer select-none' : ''} onClick={() => changeSort(column)}>{column.label}{column.sort && params.get('sortBy') === column.sort && <span className="ml-1 inline-block">{params.get('sortOrder') === 'desc' ? <ArrowDown size={11} className="inline" /> : <ArrowUp size={11} className="inline" />}</span>}</th>)}<th className="sticky right-0 z-10 bg-[#f8fafc]">Aksi</th></tr></thead><tbody>{items.map((row, index) => <tr key={row.id}>
            <td className="sticky left-0 bg-white text-slate-400">{(page - 1) * pageSize + index + 1}</td>
            {columns.map((column) => <td key={String(column.key)} className={column.key === 'positionName' ? 'min-w-[180px] font-semibold text-slate-700' : column.key === 'agencyName' ? 'min-w-[190px]' : 'min-w-[115px]'}>{column.key === 'requiredEducationRaw' ? <span title={displayText(row.requiredEducationRaw)} className="line-clamp-2 max-w-[220px]">{displayText(row.requiredEducationRaw)}</span> : column.key === 'matchingCategory' ? row.matchingCategory : column.render ? column.render(row) : displayText(row[column.key] as string | number | null)}</td>)}
            <td className="sticky right-0 min-w-[132px] bg-white"><div className="flex gap-1"><button title="Detail formasi" aria-label={`Detail ${row.positionName}`} onClick={() => setDetail(row)} className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100"><Eye size={14} /></button><button title="Simpan favorit" aria-label={`Favoritkan ${row.positionName}`} onClick={() => saveFavorite(row.id)} className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-amber-50 hover:text-amber-600"><Star size={14} /></button><button title="Tambahkan ke perbandingan" aria-label={`Bandingkan ${row.positionName}`} onClick={() => addCompare(row.id)} className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-teal-50 hover:text-teal-700"><GitCompareArrows size={14} /></button></div></td>
          </tr>)}</tbody></table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3"><p className="text-[10px] text-slate-500">Menampilkan <span className="font-semibold text-slate-700">{countLabel(Math.min((page - 1) * pageSize + 1, total))}–{countLabel(Math.min(page * pageSize, total))}</span> dari <span className="font-semibold text-slate-700">{countLabel(total)}</span> record</p><div className="flex items-center gap-2"><button onClick={() => change('page', String(Math.max(1, page - 1)))} disabled={page <= 1} aria-label="Halaman sebelumnya" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"><ChevronLeft size={15} /></button><span className="min-w-[84px] text-center text-[10px] text-slate-600">Halaman {page} dari {totalPages}</span><button onClick={() => change('page', String(Math.min(totalPages, page + 1)))} disabled={page >= totalPages} aria-label="Halaman berikutnya" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"><ChevronRight size={15} /></button></div></div>
      </>}
    </Card>
    {detail && <FormationDetail row={detail} onClose={() => setDetail(null)} />}
  </div>;
}

function FilterField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <label><span className="mb-1 block text-[10px] font-semibold text-slate-500">{label}</span><input value={value} type={type} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="field-select" /></label>;
}

function FormationDetail({ row, onClose }: { row: Formation; onClose: () => void }) {
  const fields: [string, string | number | null | undefined][] = [
    ['Instansi', row.agencyName], ['Jabatan resmi', row.positionName], ['Unit kerja', row.unitWorkName], ['Lokasi penempatan', row.placementName],
    ['Provinsi', row.province], ['Kabupaten/kota', row.regency], ['Jenjang pendidikan', row.educationLevel], ['Jumlah formasi', countLabel(row.quota)],
    ['Jumlah pelamar', countLabel(row.applicantCount)], ['Pelamar per kursi', ratioLabel(row.applicantPerSeat)], ['Gaji minimum', shortCurrency(row.salaryMin)], ['Gaji maksimum', shortCurrency(row.salaryMax)],
    ['Jenis pengadaan', row.procurementType], ['Jenis formasi', row.formationType], ['Sumber data', row.dataSource],
  ];
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-5" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Detail formasi" className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5"><div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-teal-700">DETAIL FORMASI · {row.datasetYear}</p><h3 className="mt-1 font-display text-lg font-extrabold text-slate-800">{row.positionName}</h3><p className="mt-1 text-xs text-slate-500">{row.agencyName}</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup detail"><X size={17} /></button></div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xs font-medium leading-relaxed text-slate-700">{displayText(value)}</p></div>)}
        <div className="col-span-full rounded-xl border border-teal-100 bg-teal-50/70 p-4"><div className="mb-2 flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-wider text-teal-800">Persyaratan pendidikan asli</p><span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-teal-800">{row.matchingCategory.replace('_', ' ')}</span></div><p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{displayText(row.requiredEducationRaw)}</p><p className="mt-2 border-t border-teal-100 pt-2 text-[10px] leading-relaxed text-slate-600">{row.matchingReason}</p></div>
      </div>
      <div className="flex justify-between border-t border-slate-200 p-4"><Button variant="secondary" onClick={onClose}>Tutup</Button>{row.dataSource && <a href={row.dataSource === 'Aesen CASN 2024' ? 'https://aesen.vercel.app/casn/2024/formasi' : 'https://sscasn.bkn.go.id/'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700">{row.dataSource === 'Aesen CASN 2024' ? 'Lihat sumber Aesen' : 'Periksa sumber resmi'}<ExternalLink size={12} /></a>}</div>
    </div>
  </div>;
}
