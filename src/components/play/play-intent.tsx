'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { playTargetFromUrl, type PlayTarget } from '@/lib/play-url';
import { preloadBoard } from './boards';
import { startEarly } from './start-session';

/** The play target of the same-origin `/play/...` link an event happened in, if any. */
function playLinkTarget(e: Event): { href: string; target: PlayTarget } | null {
  const a = (e.target as Element | null)?.closest?.('a[href^="/play/"]');
  if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== '_self') || a.hasAttribute('download')) return null;
  const url = new URL(a.href);
  if (url.origin !== location.origin) return null;
  const target = playTargetFromUrl(url);
  return target && { href: url.pathname + url.search, target };
}

/**
 * Makes opening a game take one round trip instead of three. Play links do
 * not prefetch on render (a /daily view would render all eight game pages),
 * so instead:
 *  - hover, touch or focus on a play link prefetches that page and its
 *    board's code;
 *  - a plain click also starts the session request right away, in parallel
 *    with the navigation; PlayClient picks it up (see takeEarlyStart).
 * Rendered once in the root layout; covers every play link on every page.
 */
export function PlayIntent() {
  const router = useRouter();
  useEffect(() => {
    // pointerover fires for every element inside a link: warm each link once
    // per 10 s (a later prefetch can still be needed after router.refresh()).
    const warmed = new Map<string, number>();
    const intent = (e: Event) => {
      const hit = playLinkTarget(e);
      if (!hit || Date.now() - (warmed.get(hit.href) ?? 0) < 10_000) return;
      warmed.set(hit.href, Date.now());
      preloadBoard(hit.target.game);
      router.prefetch(hit.href, { kind: 'full' } as Parameters<typeof router.prefetch>[1]);
    };
    const click = (e: MouseEvent) => {
      // Only clicks that navigate in this tab: not new-tab/window clicks.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const hit = playLinkTarget(e);
      if (!hit) return;
      preloadBoard(hit.target.game);
      startEarly(hit.target);
    };
    document.addEventListener('pointerover', intent, { passive: true });
    document.addEventListener('touchstart', intent, { passive: true });
    document.addEventListener('focusin', intent);
    document.addEventListener('click', click, true);
    return () => {
      document.removeEventListener('pointerover', intent);
      document.removeEventListener('touchstart', intent);
      document.removeEventListener('focusin', intent);
      document.removeEventListener('click', click, true);
    };
  }, [router]);
  return null;
}
