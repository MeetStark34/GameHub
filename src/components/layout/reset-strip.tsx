'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Sparkles } from 'lucide-react';

export function ResetStrip() {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    function updateCountdown() {
      const now = new Date();
      // Calculate next UTC midnight
      const nextUtcMidnight = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          0,
          0,
          0,
          0
        )
      );

      const diffMs = Math.max(0, nextUtcMidnight.getTime() - now.getTime());
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ hours, minutes, seconds });
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full bg-theme-surface border-y border-theme-border py-1.5 px-4 text-xs font-mono flex items-center justify-center text-theme-muted">
        <span>NEXT DAILY SET RESET IN --h --m --s</span>
      </div>
    );
  }

  const formattedHours = timeLeft.hours.toString().padStart(2, '0');
  const formattedMins = timeLeft.minutes.toString().padStart(2, '0');
  const formattedSecs = timeLeft.seconds.toString().padStart(2, '0');

  return (
    <div className="w-full bg-theme-surface/90 backdrop-blur-sm border-y border-theme-border py-1.5 px-4 text-xs font-mono text-theme-muted flex items-center justify-between overflow-hidden shadow-inner">
      <div className="flex items-center gap-2 mx-auto sm:mx-0">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-theme-accent"></span>
        </span>
        <Clock className="w-3.5 h-3.5 text-theme-accent" />
        <span className="font-semibold text-theme-text uppercase tracking-wider">
          Next Daily Set Reset in:
        </span>
        <span className="text-theme-accent font-bold">
          {formattedHours}h {formattedMins}m {formattedSecs}s
        </span>
        <span className="hidden md:inline text-theme-muted/60 text-[11px]">
          (00:00 UTC authoritative)
        </span>
      </div>

      <div className="hidden sm:flex items-center gap-2 text-[11px] text-theme-muted">
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span>Play today's 8 Daily games to advance your True Player Streak</span>
      </div>
    </div>
  );
}
