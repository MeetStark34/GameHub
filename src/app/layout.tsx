import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Navbar } from '@/components/layout/navbar';
import { ResetStrip } from '@/components/layout/reset-strip';
import { Footer } from '@/components/layout/footer';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'GameHub | Your daily brain training, without the daily limit',
  description:
    'Play unlimited brain-training puzzles inspired by modern classics. Daily sets, unlimited mode, rank progression, streaks, punch cards, and game mastery.',
  keywords: [
    'brain training',
    'puzzle games',
    'unlimited puzzles',
    'sudoku',
    'queens',
    'word games',
    'streaks',
  ],
  authors: [{ name: 'GameHub Team' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        <ThemeProvider>
          <ResetStrip />
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
