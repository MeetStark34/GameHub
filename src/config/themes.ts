/**
 * The eleven GameHub themes. All are available to everyone; there is no
 * unlock system. Colour tokens live in src/app/globals.css under
 * [data-theme="<id>"]; this file is the list the UI offers.
 */
export const THEME_IDS = [
  'system',
  'dracula',
  'nord',
  'gruvbox',
  'one-dark',
  'solarized',
  'cyberpunk',
  'oled',
  'catppuccin',
  'github',
  'tokyo-night',
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEMES: { id: ThemeId; name: string; description: string; swatch: [string, string, string] }[] = [
  { id: 'system', name: 'System Default', description: 'Follows your device light or dark setting.', swatch: ['#f7f7f4', '#16181d', '#4f6bff'] },
  { id: 'dracula', name: 'Dracula', description: 'Deep purple night with vivid pastels.', swatch: ['#282a36', '#f8f8f2', '#bd93f9'] },
  { id: 'nord', name: 'Nord', description: 'Arctic blues, calm and cool.', swatch: ['#2e3440', '#eceff4', '#88c0d0'] },
  { id: 'gruvbox', name: 'Gruvbox', description: 'Warm retro browns and ambers.', swatch: ['#282828', '#ebdbb2', '#fabd2f'] },
  { id: 'one-dark', name: 'One Dark', description: 'Balanced editor-grade dark.', swatch: ['#282c34', '#abb2bf', '#61afef'] },
  { id: 'solarized', name: 'Solarized', description: 'Precision-tuned light parchment.', swatch: ['#fdf6e3', '#586e75', '#268bd2'] },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon magenta on midnight.', swatch: ['#0d0221', '#f5f5ff', '#ff2a6d'] },
  { id: 'oled', name: 'OLED', description: 'True black for OLED screens.', swatch: ['#000000', '#f2f2f2', '#3d8bff'] },
  { id: 'catppuccin', name: 'Catppuccin', description: 'Soothing mocha pastels.', swatch: ['#1e1e2e', '#cdd6f4', '#cba6f7'] },
  { id: 'github', name: 'GitHub', description: 'Crisp, familiar light.', swatch: ['#ffffff', '#1f2328', '#0969da'] },
  { id: 'tokyo-night', name: 'Tokyo Night', description: 'City lights after dark.', swatch: ['#1a1b26', '#c0caf5', '#7aa2f7'] },
];

export const isThemeId = (v: unknown): v is ThemeId => typeof v === 'string' && (THEME_IDS as readonly string[]).includes(v);
