'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeSelector } from '../theme/theme-selector';
import {
  Gamepad2,
  CalendarDays,
  Infinity as InfinityIcon,
  Trophy,
  Award,
  User,
  Menu,
  X,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/daily', label: 'Daily Set', icon: CalendarDays },
    { href: '/unlimited', label: 'Unlimited', icon: InfinityIcon },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/achievements', label: 'Achievements', icon: Award },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-theme-border bg-theme-bg/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-theme-text group-hover:text-theme-accent transition-colors">
                GameHub
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-theme-elevated text-theme-accent border border-theme-border">
                Unlimited
              </span>
            </div>
            <span className="text-[11px] text-theme-muted hidden sm:inline leading-none font-medium">
              Daily brain training, no daily limit
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-theme-surface text-theme-accent border border-theme-border shadow-sm'
                    : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-theme-accent' : ''}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* Theme Selector */}
          <ThemeSelector />

          {/* User Profile / Auth State Link */}
          <Link
            href="/profile"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-elevated transition-colors text-xs font-semibold text-theme-text"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-900 font-bold text-[10px]">
              S
            </div>
            <span>Profile</span>
          </Link>

          <Link
            href="/daily"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-theme-accent hover:opacity-90 text-white text-xs font-bold shadow-md shadow-theme-accent/25 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Play Now</span>
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-theme-border text-theme-muted hover:text-theme-text bg-theme-surface"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-theme-border bg-theme-surface p-4 space-y-2 animate-fade-in">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-theme-elevated text-theme-accent'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-theme-border flex items-center justify-between">
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-sm text-theme-text font-medium"
            >
              <User className="w-4 h-4 text-theme-accent" />
              <span>My Profile & Stats</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
