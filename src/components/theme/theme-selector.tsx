'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from './theme-provider';
import { Palette, Check } from 'lucide-react';

export function ThemeSelector() {
  const { currentTheme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTheme = availableThemes.find((t) => t.id === currentTheme) || availableThemes[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-elevated transition-colors text-theme-text"
        title="Change theme"
        aria-label="Select color theme"
      >
        <span
          className="w-2.5 h-2.5 rounded-full inline-block"
          style={{ backgroundColor: activeTheme.colors.accent }}
        />
        <Palette className="w-3.5 h-3.5 text-theme-muted" />
        <span className="hidden sm:inline">{activeTheme.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-theme-border bg-theme-surface shadow-2xl p-2 z-50 animate-fade-in backdrop-blur-md">
          <div className="px-2 py-1.5 text-xs font-semibold text-theme-muted uppercase tracking-wider">
            Select Theme ({availableThemes.length})
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {availableThemes.map((theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    setTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-theme-elevated text-theme-text font-semibold'
                      : 'text-theme-muted hover:text-theme-text hover:bg-theme-elevated/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/10"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                      <span
                        className="w-2 h-2 rounded-full border border-white/10"
                        style={{ backgroundColor: theme.colors.bgPrimary }}
                      />
                    </div>
                    <span>{theme.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-theme-accent" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
