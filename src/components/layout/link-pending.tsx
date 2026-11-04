'use client';

import { useLinkStatus } from 'next/link';
import { cn } from '@/components/ui';

/**
 * Pending hint for a navigation link; render it inside the `<Link>` (which
 * needs `relative`). It fades in only when the next page takes longer than
 * 150 ms (see `.link-pending` in globals.css), so quick navigations stay clean
 * and slow ones still acknowledge the click.
 *
 * Pages deliberately have no `loading.tsx`: React holds a Suspense fallback
 * for at least 300 ms once shown, which made every navigation that slow even
 * when the server answered in a fraction of that.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return <span aria-hidden data-pending={pending || undefined} className={cn('link-pending pointer-events-none absolute h-0.5 rounded-full bg-accent', className)} />;
}
