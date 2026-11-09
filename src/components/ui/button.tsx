import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes } from 'react';

const buttonStyles = cva('inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: { primary: 'bg-[#0d6d68] text-white hover:bg-[#095d59]', secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50', ghost: 'text-slate-600 hover:bg-slate-100', danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100' },
    size: { default: 'h-10 px-4', sm: 'h-8 px-3 text-xs', icon: 'size-9 p-0' },
  }, defaultVariants: { variant: 'primary', size: 'default' },
});
export function cn(...classes: (string | undefined | false | null)[]) { return twMerge(clsx(classes)); }
type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { asChild?: boolean };
export function Button({ className, variant, size, asChild, ...props }: Props) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
