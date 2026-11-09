import type { HTMLAttributes } from 'react';
import { cn } from './button';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,35,55,.035)]', className)} {...props} />; }
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)} {...props} />; }
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) { return <h2 className={cn('font-display text-[15px] font-bold text-slate-800', className)} {...props} />; }
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) { return <p className={cn('text-xs leading-relaxed text-slate-500', className)} {...props} />; }
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('p-5', className)} {...props} />; }
