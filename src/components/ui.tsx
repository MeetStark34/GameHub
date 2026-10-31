import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-110 active:brightness-95 shadow-sm',
  secondary: 'bg-card text-fg border border-border hover:bg-elevated',
  ghost: 'text-fg hover:bg-subtle',
  danger: 'bg-danger text-white hover:brightness-110',
};
const SIZES = { sm: 'h-8 px-3 text-sm gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-base gap-2' };

export function buttonClass(variant: Variant = 'primary', size: keyof typeof SIZES = 'md', extra?: string) {
  return cn(
    'inline-flex select-none items-center whitespace-nowrap justify-center rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ComponentProps<'button'> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({ variant = 'primary', size = 'md', className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('rounded-2xl border border-border bg-card', className)} />;
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="font-display text-lg font-bold tracking-tight">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted', className)}>{children}</p>;
}

export function Progress({ value, label, className, tone = 'accent' }: { value: number; label: string; className?: string; tone?: 'accent' | 'gold' | 'success' }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const bar = tone === 'gold' ? 'bg-gold' : tone === 'success' ? 'bg-success' : 'bg-accent';
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className={cn('h-2 overflow-hidden rounded-full bg-subtle', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full border border-border bg-subtle px-2 py-0.5 text-xs font-medium', className)}>{children}</span>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-muted">{children}</div>}
    </header>
  );
}

export const BADGE_LABELS: Record<string, string> = {
  developer: 'Developer',
  moderator: 'Moderator',
  tester: 'Tester',
  founder: 'Founder',
  contributor: 'Contributor',
};
