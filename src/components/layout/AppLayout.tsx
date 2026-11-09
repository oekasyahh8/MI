import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Activity, BarChart3, Bell, Bookmark, BriefcaseBusiness, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Database, FileSpreadsheet, Filter, Gauge, LayoutDashboard, MapPinned, Menu, Search, ShieldCheck, Scale, Target, X } from 'lucide-react';
import { api } from '../../lib/api';
import { Button, cn } from '../ui/button';

const nav = [
  { label: 'Dashboard Overview', to: '/', icon: LayoutDashboard, group: 'ANALISIS DATA' },
  { label: 'Database Formasi', to: '/database', icon: Database },
  { label: 'Analisis Jurusan', to: '/education', icon: Target },
  { label: 'Analisis Instansi', to: '/agencies', icon: BriefcaseBusiness },
  { label: 'Analisis Jabatan', to: '/positions', icon: BarChart3 },
  { label: 'Analisis Wilayah', to: '/regions', icon: MapPinned },
  { label: 'Analisis Persaingan', to: '/competition', icon: Scale },
  { label: 'Rekomendasi Strategi', to: '/strategy', icon: Gauge, group: 'PERENCANAAN' },
  { label: 'My CPNS Plan', to: '/plan', icon: Bookmark },
  { label: 'Bandingkan Formasi', to: '/compare', icon: Activity },
  { label: 'Data Management', to: '/data', icon: FileSpreadsheet, group: 'DATA & INFORMASI' },
  { label: 'Tentang Data', to: '/about', icon: CircleHelp },
];
const pageMeta: Record<string, { title: string; subtitle: string; icon: typeof LayoutDashboard }> = {
  '/': { title: 'Dashboard Overview', subtitle: 'Ringkasan data formasi CPNS historis 2024', icon: LayoutDashboard },
  '/database': { title: 'Database Formasi', subtitle: 'Jelajahi dan filter semua data formasi yang diimpor', icon: Database },
  '/education': { title: 'Analisis Peluang D3 Manajemen Informatika', subtitle: 'Pencocokan pendidikan berdasarkan persyaratan formasi', icon: Target },
  '/agencies': { title: 'Analisis Instansi', subtitle: 'Perbandingan kuota dan kebutuhan antar instansi', icon: BriefcaseBusiness },
  '/positions': { title: 'Analisis Jabatan', subtitle: 'Jabatan yang tercatat dalam dataset aktif', icon: BarChart3 },
  '/regions': { title: 'Analisis Wilayah', subtitle: 'Sebaran lokasi penempatan dari data yang tersedia', icon: MapPinned },
  '/competition': { title: 'Analisis Persaingan', subtitle: 'Indikator pelamar per kuota secara historis', icon: Scale },
  '/strategy': { title: 'Rekomendasi Strategi', subtitle: 'Skor prioritas riset historis dengan bobot transparan', icon: Gauge },
  '/plan': { title: 'My CPNS Plan', subtitle: 'Kelola shortlist dan catatan riset pribadi', icon: Bookmark },
  '/compare': { title: 'Bandingkan Formasi', subtitle: 'Bandingkan dua sampai lima formasi pilihan', icon: Activity },
  '/data': { title: 'Data Management', subtitle: 'Import dataset, periksa kualitas, dan kelola sumber data', icon: FileSpreadsheet },
  '/about': { title: 'Tentang Data', subtitle: 'Sumber, batasan, dan cara membaca analisis', icon: CircleHelp },
};

export function AppLayout({ collapsed, onToggleSidebar }: { collapsed: boolean; onToggleSidebar: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [years, setYears] = useState<number[]>([]);
  const [latestDataset, setLatestDataset] = useState<{ recordCount: number; importedAt: string } | null>(null);
  const pathname = location.pathname;
  const current = pageMeta[pathname] ?? pageMeta['/'];
  const CurrentIcon = current.icon;
  useEffect(() => setSearch(searchParams.get('q') ?? ''), [searchParams]);
  useEffect(() => {
    let active = true;
    api<{ availableYears: number[]; datasets: { recordCount: number; importedAt: string }[] }>('/analytics/summary').then((res) => { if (active) { setYears(res.data.availableYears); setLatestDataset(res.data.datasets[0] ?? null); } }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const nextQuery = search.trim();
    const currentQuery = searchParams.get('q') ?? '';
    if (nextQuery === currentQuery) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (nextQuery) next.set('q', nextQuery); else next.delete('q');
      next.delete('page'); setSearchParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, searchParams, setSearchParams]);

  function setFilter(name: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value); else next.delete(name);
    next.delete('page'); setSearchParams(next, { replace: true });
  }
  function resetFilters() { setSearch(''); setSearchParams({}, { replace: true }); }
  const filterCount = [...searchParams.keys()].filter((key) => !['page', 'pageSize', 'sortBy', 'sortOrder'].includes(key)).length;
  const activeChips = [...searchParams.entries()].filter(([key]) => !['page', 'pageSize', 'sortBy', 'sortOrder'].includes(key));

  const sidebar = <aside className={cn('sidebar flex shrink-0 flex-col bg-[#10263d] text-slate-300 transition-[width] duration-200', collapsed ? 'sidebar-collapsed w-[76px]' : 'w-[252px]', mobileOpen && 'sidebar-mobile-open')}>
    <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-950/20"><Activity size={20} strokeWidth={2.5} /></div>
      {!collapsed && <div className="min-w-0"><p className="font-display text-[13px] font-extrabold tracking-wide text-white">MI CASN</p><p className="text-[10px] font-semibold tracking-[.16em] text-teal-300">ANALYTICS</p></div>}
      <button className="ml-auto rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white md:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"><X size={17} /></button>
    </div>
    <div className="border-b border-white/10 px-4 py-4">
      {!collapsed ? <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.055] p-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><ShieldCheck size={15} /></span>
        <div><p className="text-[11px] font-semibold text-slate-100">Riset CASN 2026</p><p className="mt-0.5 text-[10px] text-slate-400">Basis historis 2024</p></div>
        <span className="ml-auto size-1.5 rounded-full bg-amber-400" title="Impor dataset untuk mengaktifkan analisis" />
      </div> : <div className="flex justify-center"><ShieldCheck className="text-emerald-300" size={17} /></div>}
    </div>
    <nav className="sidebar-nav flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {nav.map((item, index) => {
        const Icon = item.icon;
        return <div key={item.to}>
          {item.group && <div className={cn('mb-2 mt-4 px-2 text-[9px] font-bold tracking-[.17em] text-slate-500', index === 0 && 'mt-0', collapsed && 'sr-only')}>{item.group}</div>}
          <NavLink to={{ pathname: item.to, search: searchParams.toString() }} end={item.to === '/'} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}
            className={({ isActive }) => cn('nav-link flex h-10 items-center gap-3 rounded-lg px-3 text-[12px] font-medium transition-colors', isActive ? 'bg-teal-500/15 text-teal-200 ring-1 ring-inset ring-teal-300/10' : 'text-slate-400 hover:bg-white/[.06] hover:text-slate-100', collapsed && 'justify-center px-0')}>
            <Icon size={17} strokeWidth={1.8} /><span className={cn('truncate', collapsed && 'hidden')}>{item.label}</span>
            {item.to === '/plan' && !collapsed && <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] text-slate-300">Personal</span>}
          </NavLink>
        </div>;
      })}
    </nav>
    <div className="border-t border-white/10 px-3 py-3">
      {!collapsed && <div className="px-2 pb-3 text-[10px] leading-relaxed text-slate-500">Analisis historis • Bukan bagian dari BKN / SSCASN</div>}
      <button onClick={onToggleSidebar} className={cn('hidden h-9 w-full items-center gap-3 rounded-lg px-3 text-xs text-slate-400 hover:bg-white/[.06] hover:text-white md:flex', collapsed && 'justify-center px-0')} aria-label={collapsed ? 'Buka sidebar' : 'Perkecil sidebar'}>{collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /> Perkecil sidebar</>}</button>
    </div>
  </aside>;

  return <div className="app-shell flex min-h-screen bg-[#f5f7fa] text-slate-800">
    {sidebar}{mobileOpen && <button className="mobile-scrim fixed inset-0 z-30 bg-slate-950/50 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup navigasi" />}
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="topbar sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Buka navigasi"><Menu size={19} /></button>
        <div className="hidden items-center gap-2 text-teal-700 sm:flex"><CurrentIcon size={18} strokeWidth={2} /></div>
        <div className="min-w-0"><h1 className="font-display truncate text-[15px] font-bold text-slate-800">{current.title}</h1><p className="hidden truncate text-[10px] text-slate-500 sm:block">{current.subtitle}</p></div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <label className="global-search hidden h-9 w-[180px] items-center gap-2 rounded-lg border border-slate-200 bg-[#f9fafb] px-3 text-slate-400 focus-within:border-teal-500 md:flex xl:w-[250px]">
            <Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari instansi, jabatan…" className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400" aria-label="Pencarian global" />
          </label>
          <div className="relative hidden sm:block">
            <select aria-label="Tahun dataset" value={searchParams.get('year') ?? ''} onChange={(event) => setFilter('year', event.target.value)} className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-[11px] font-semibold text-slate-700 outline-none focus:border-teal-500">
              <option value="">Semua tahun</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select><ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-3 text-slate-400" />
          </div>
          <div className="hidden xl:block"><p className={`text-[10px] font-bold ${latestDataset?.recordCount ? 'text-emerald-700' : 'text-amber-700'}`}>{latestDataset?.recordCount ? 'Dataset aktif' : 'Belum ada dataset'}</p><p className="mt-0.5 text-[9px] text-slate-400">{latestDataset ? `Impor ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(latestDataset.importedAt))}` : 'Belum diperbarui'}</p></div>
          <div className="relative">
            <Button variant="secondary" size="icon" aria-label="Filter data global" onClick={() => setFilterOpen((open) => !open)} className="relative h-9 w-9"><Filter size={15} />{filterCount > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-teal-600 text-[9px] text-white">{filterCount}</span>}</Button>
            {filterOpen && <div className="filter-popover absolute right-0 top-11 z-40 w-[min(380px,calc(100vw-32px))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Filter global</h3><button onClick={() => setFilterOpen(false)} aria-label="Tutup filter"><X size={15} /></button></div>
              <div className="grid grid-cols-2 gap-3">
                <FilterInput label="Provinsi" value={searchParams.get('province') ?? ''} onChange={(value) => setFilter('province', value)} placeholder="Cari provinsi" />
                <FilterInput label="Kabupaten / kota" value={searchParams.get('regency') ?? ''} onChange={(value) => setFilter('regency', value)} placeholder="Cari wilayah" />
                <FilterInput label="Instansi" value={searchParams.get('agency') ?? ''} onChange={(value) => setFilter('agency', value)} placeholder="Nama instansi" />
                <FilterInput label="Jabatan" value={searchParams.get('position') ?? ''} onChange={(value) => setFilter('position', value)} placeholder="Nama jabatan" />
                <FilterInput label="Jenjang pendidikan" value={searchParams.get('educationLevel') ?? ''} onChange={(value) => setFilter('educationLevel', value)} placeholder="Contoh: D-III" />
                <FilterInput label="Jenis pengadaan" value={searchParams.get('procurementType') ?? ''} onChange={(value) => setFilter('procurementType', value)} placeholder="CPNS / PPPK" />
                <FilterInput label="Jenis formasi" value={searchParams.get('formationType') ?? ''} onChange={(value) => setFilter('formationType', value)} placeholder="Jenis formasi" />
                <label className="col-span-2"><span className="mb-1 block text-[10px] font-semibold text-slate-500">Kecocokan pendidikan</span><select value={searchParams.get('matchingCategory') ?? ''} onChange={(event) => setFilter('matchingCategory', event.target.value)} className="field-select"><option value="">Semua kategori</option><option value="EXACT_MATCH">Exact match</option><option value="RELATED_MATCH">Related match</option><option value="MANUAL_REVIEW">Perlu tinjauan manual</option><option value="NO_MATCH">Tidak cocok</option></select></label>
                <FilterInput label="Kuota minimum" type="number" value={searchParams.get('minQuota') ?? ''} onChange={(value) => setFilter('minQuota', value)} placeholder="0" />
                <FilterInput label="Kuota maksimum" type="number" value={searchParams.get('maxQuota') ?? ''} onChange={(value) => setFilter('maxQuota', value)} placeholder="—" />
                <FilterInput label="Gaji minimum" type="number" value={searchParams.get('minSalary') ?? ''} onChange={(value) => setFilter('minSalary', value)} placeholder="Rupiah" />
                <FilterInput label="Gaji maksimum" type="number" value={searchParams.get('maxSalary') ?? ''} onChange={(value) => setFilter('maxSalary', value)} placeholder="Rupiah" />
                <FilterInput label="Pelamar minimum" type="number" value={searchParams.get('minApplicants') ?? ''} onChange={(value) => setFilter('minApplicants', value)} placeholder="0" />
                <FilterInput label="Pelamar maksimum" type="number" value={searchParams.get('maxApplicants') ?? ''} onChange={(value) => setFilter('maxApplicants', value)} placeholder="—" />
                <FilterInput label="Pelamar / kursi minimum" type="number" value={searchParams.get('minRatio') ?? ''} onChange={(value) => setFilter('minRatio', value)} placeholder="0" />
                <FilterInput label="Pelamar / kursi maksimum" type="number" value={searchParams.get('maxRatio') ?? ''} onChange={(value) => setFilter('maxRatio', value)} placeholder="—" />
                <label className="col-span-2 flex items-center gap-2 text-[10px] font-semibold text-slate-600"><input type="checkbox" checked={searchParams.get('it') === 'true'} onChange={(event) => setFilter('it', event.target.checked ? 'true' : '')} />Batasi ke jabatan bidang IT (kata kunci jabatan)</label>
              </div>
              <div className="mt-4 flex justify-between"><button onClick={resetFilters} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Hapus semua filter</button><Button size="sm" onClick={() => setFilterOpen(false)}>Selesai</Button></div>
            </div>}
          </div>
          <button title="Notifikasi" className="relative hidden size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 sm:flex"><Bell size={16} /><span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-amber-500" /></button>
          <div className="hidden size-8 items-center justify-center rounded-full bg-[#e5f3f1] text-[11px] font-bold text-teal-800 sm:flex">MI</div>
        </div>
      </header>
      {search && <div className="border-b border-teal-100 bg-teal-50 px-6 py-2 md:hidden"><label className="flex items-center gap-2"><Search size={14} className="text-teal-700" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari instansi, jabatan…" aria-label="Pencarian global" className="w-full bg-transparent text-xs outline-none" /></label></div>}
      {activeChips.length > 0 && <div className="active-chips flex flex-wrap items-center gap-2 border-b border-slate-200/70 bg-white px-6 py-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Filter aktif</span>{activeChips.map(([key, value]) => <button key={key} onClick={() => setFilter(key, '')} className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[10px] font-medium text-teal-800">{filterName(key)}: {value}<X size={11} /></button>)}<button onClick={resetFilters} className="ml-auto text-[10px] font-semibold text-slate-500 hover:text-rose-600">Reset</button>
      </div>}
      <main className="page-area flex-1 px-6 py-6 lg:px-8"><Outlet /></main>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-white px-6 py-3 text-[10px] text-slate-400"><span>MI CASN Analytics <span className="mx-1">•</span> Analisis historis CASN 2024</span><span>Data bukan prediksi atau jaminan seleksi CPNS 2026</span></footer>
    </div>
  </div>;
}

function FilterInput({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return <label><span className="mb-1 block text-[10px] font-semibold text-slate-500">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="field-select" /></label>;
}
function filterName(key: string) { return ({ year: 'Tahun', province: 'Provinsi', regency: 'Kabupaten/kota', agency: 'Instansi', position: 'Jabatan', matchingCategory: 'Kecocokan', minQuota: 'Kuota ≥', maxQuota: 'Kuota ≤', q: 'Cari' } as Record<string, string>)[key] ?? key; }
