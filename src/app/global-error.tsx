'use client';

import './globals.css';

/**
 * Last-resort boundary for failures in the root layout itself (e.g. the
 * database being unreachable while loading the header). Providers and
 * translations are unavailable here, so it is plain English.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-bg px-4 font-sans text-fg antialiased">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl font-bold">GameHub is temporarily unavailable</h1>
          <p className="mt-2 text-muted">Something went wrong on our side. Please try again in a moment.</p>
          {error.digest && <p className="mt-2 font-mono text-xs text-muted">ref {error.digest}</p>}
          <button type="button" onClick={reset} className="mt-6 h-11 rounded-xl bg-accent px-5 font-semibold text-accent-fg hover:brightness-110">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
