import Link from 'next/link';
import { Wordmark } from '@/components/brand';

export function Footer() {
  return (
    <footer className="mb-16 border-t border-border md:mb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="hidden sm:inline">Play. Progress. Master.</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/how-to-play" className="hover:text-fg">How to play</Link>
          <Link href="/leaderboards" className="hover:text-fg">Leaderboards</Link>
          <Link href="/privacy" className="hover:text-fg">Privacy</Link>
          <Link href="/settings" className="hover:text-fg">Themes</Link>
        </nav>
      </div>
    </footer>
  );
}
