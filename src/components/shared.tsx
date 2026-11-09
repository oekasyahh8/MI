import { Link } from 'react-router-dom';
import { ArrowRight, Database, FileUp, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-teal-700">{eyebrow}</p>}<h2 className="font-display text-xl font-extrabold tracking-[-.025em] text-slate-800">{title}</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">{description}</p></div>{action}</div>;
}

export function StatCard({ label, value, detail, icon, tone = 'teal', tooltip }: { label: string; value: string; detail?: string; icon: React.ReactNode; tone?: 'teal' | 'blue' | 'amber' | 'violet'; tooltip?: string }) {
  const tones = { teal: 'bg-teal-50 text-teal-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', violet: 'bg-violet-50 text-violet-700' };
  return <Card className="min-w-0"><CardContent className="p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">{label}{tooltip && <span title={tooltip} className="cursor-help text-slate-400"><Info size={12} /></span>}</p><p className="mt-2 font-display text-[22px] font-extrabold leading-none tracking-tight text-slate-800">{value}</p>{detail && <p className="mt-2 text-[10px] text-slate-400">{detail}</p>}</div><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span></div></CardContent></Card>;
}

export function NoData({ title = 'Belum ada data untuk ditampilkan', message = 'Impor dataset CASN 2024 untuk mulai menggunakan filter dan analisis.', compact = false }: { title?: string; message?: string; compact?: boolean }) {
  return <div className={`flex flex-col items-center justify-center text-center ${compact ? 'min-h-[190px] px-5 py-8' : 'min-h-[310px] px-6 py-12'}`}>
    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Database size={20} /></div>
    <h3 className="text-sm font-bold text-slate-700">{title}</h3><p className="mt-1 max-w-md text-[11px] leading-relaxed text-slate-500">{message}</p>
    <Button asChild size="sm" className="mt-4"><Link to="/data"><FileUp size={14} />Buka Data Management<ArrowRight size={13} /></Link></Button>
  </div>;
}

export function ChartCard({ title, description, action, children, className = '' }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <Card className={className}><CardHeader><div><CardTitle>{title}</CardTitle>{description && <CardDescription className="mt-1">{description}</CardDescription>}</div>{action}</CardHeader><CardContent className="pt-3">{children}</CardContent></Card>;
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: count }, (_, i) => <div key={i} className="h-[96px] animate-pulse rounded-2xl border border-slate-200 bg-white p-4"><div className="skeleton h-3 w-24 rounded" /><div className="skeleton mt-4 h-6 w-20 rounded" /><div className="skeleton mt-2 h-2.5 w-28 rounded" /></div>)}</div>;
}

export function EmptyCard({ title, message }: { title: string; message: string }) {
  return <Card><CardContent><div className="py-4 text-center"><p className="text-xs font-semibold text-slate-600">{title}</p><p className="mx-auto mt-1 max-w-sm text-[10px] leading-relaxed text-slate-400">{message}</p></div></CardContent></Card>;
}
