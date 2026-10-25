'use client';

import React, { useState } from 'react';
import {
  Shield,
  Wrench,
  Users,
  Gamepad2,
  Award,
  Sparkles,
  Flame,
  Palette,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tools' | 'users' | 'audit'>('tools');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-xs font-bold uppercase mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Developer / Administrator Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-theme-text">Administration</h1>
          <p className="text-xs text-theme-muted mt-1 max-w-xl">
            Controlled administrative tools, audit logs, and game economy inspection for authorized personnel only.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>All administrative actions are logged</span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-theme-border pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'tools'
              ? 'bg-theme-accent text-white'
              : 'text-theme-muted hover:text-theme-text'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Developer Tools</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'users'
              ? 'bg-theme-accent text-white'
              : 'text-theme-muted hover:text-theme-text'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Management</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'audit'
              ? 'bg-theme-accent text-white'
              : 'text-theme-muted hover:text-theme-text'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* Developer Tools Grid (Section 60) */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-theme-text mb-1">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Grant XP</span>
              </div>
              <p className="text-xs text-theme-muted mb-4">
                Simulate granting verified XP through the XP transaction ledger.
              </p>
            </div>
            <button
              onClick={() => showFeedback('Granted +500 XP to current user session')}
              className="w-full py-2 px-3 rounded-xl bg-theme-elevated hover:bg-theme-border text-xs font-bold text-theme-text transition-colors"
            >
              +500 XP
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-theme-text mb-1">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Repair Streak</span>
              </div>
              <p className="text-xs text-theme-muted mb-4">
                Simulate applying a Gold Streak Repair card to restore missed streak.
              </p>
            </div>
            <button
              onClick={() => showFeedback('Streak repaired successfully')}
              className="w-full py-2 px-3 rounded-xl bg-theme-elevated hover:bg-theme-border text-xs font-bold text-theme-text transition-colors"
            >
              Simulate Repair
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-theme-text mb-1">
                <Award className="w-4 h-4 text-yellow-400" />
                <span>Unlock Achievement</span>
              </div>
              <p className="text-xs text-theme-muted mb-4">
                Test the Steam-inspired achievement notification popup system.
              </p>
            </div>
            <button
              onClick={() => showFeedback('Unlocked achievement: Potato (+150 XP)')}
              className="w-full py-2 px-3 rounded-xl bg-theme-elevated hover:bg-theme-border text-xs font-bold text-theme-text transition-colors"
            >
              Test Unlock
            </button>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl bg-theme-surface border border-theme-border p-5 text-xs">
          <div className="font-bold text-theme-text mb-3">Recent Administrative Actions</div>
          <div className="space-y-2 text-theme-muted font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-theme-elevated/40 border border-theme-border flex justify-between">
              <span>[2026-10-25 03:15:00 UTC] System: Initialized GameHub Phase 01.00</span>
              <span className="text-emerald-400">SUCCESS</span>
            </div>
            <div className="p-2.5 rounded-lg bg-theme-elevated/40 border border-theme-border flex justify-between">
              <span>[2026-10-25 03:10:00 UTC] System: Verified 11 Theme Design Tokens</span>
              <span className="text-emerald-400">SUCCESS</span>
            </div>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="rounded-2xl bg-theme-surface border border-theme-border p-5 text-xs text-theme-muted">
          <div className="font-bold text-theme-text mb-2">User Roles & Permissions</div>
          <p>User assignment and role authorization will be active in Phase 02 with Supabase Auth.</p>
        </div>
      )}
    </div>
  );
}
