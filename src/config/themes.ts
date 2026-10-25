export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  category: 'dark' | 'light' | 'special';
  colors: {
    bgPrimary: string;
    bgSurface: string;
    bgElevated: string;
    border: string;
    textPrimary: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    success: string;
    warning: string;
    danger: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'system',
    name: 'System Default',
    description: 'Syncs automatically with your operating system preference',
    category: 'dark',
    colors: {
      bgPrimary: '#0f172a',
      bgSurface: '#1e293b',
      bgElevated: '#334155',
      border: '#334155',
      textPrimary: '#f8fafc',
      textMuted: '#94a3b8',
      accent: '#6366f1',
      accentHover: '#4f46e5',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Iconic dark theme with vibrant pastel accents',
    category: 'dark',
    colors: {
      bgPrimary: '#282a36',
      bgSurface: '#343746',
      bgElevated: '#44475a',
      border: '#44475a',
      textPrimary: '#f8f8f2',
      textMuted: '#6272a4',
      accent: '#bd93f9',
      accentHover: '#ff79c6',
      success: '#50fa7b',
      warning: '#ffb86c',
      danger: '#ff5555',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'An arctic, north-bluish clean color palette',
    category: 'dark',
    colors: {
      bgPrimary: '#2e3440',
      bgSurface: '#3b4252',
      bgElevated: '#434c5e',
      border: '#4c566a',
      textPrimary: '#eceff4',
      textMuted: '#d8dee9',
      accent: '#88c0d0',
      accentHover: '#81a1c1',
      success: '#a3be8c',
      warning: '#ebcb8b',
      danger: '#bf616a',
    },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    description: 'Warm, retro groove color scheme',
    category: 'dark',
    colors: {
      bgPrimary: '#282828',
      bgSurface: '#3c3836',
      bgElevated: '#504945',
      border: '#504945',
      textPrimary: '#ebdbb2',
      textMuted: '#a89984',
      accent: '#fe8019',
      accentHover: '#fabd2f',
      success: '#b8bb26',
      warning: '#fabd2f',
      danger: '#fb4934',
    },
  },
  {
    id: 'onedark',
    name: 'One Dark',
    description: 'Atom-inspired balanced dark theme',
    category: 'dark',
    colors: {
      bgPrimary: '#1e222a',
      bgSurface: '#282c34',
      bgElevated: '#353b45',
      border: '#3e4451',
      textPrimary: '#abb2bf',
      textMuted: '#5c6370',
      accent: '#61afef',
      accentHover: '#4d8cd9',
      success: '#98c379',
      warning: '#e5c07b',
      danger: '#e06c75',
    },
  },
  {
    id: 'solarized',
    name: 'Solarized',
    description: 'Precision colors designed with scientific color theory',
    category: 'dark',
    colors: {
      bgPrimary: '#002b36',
      bgSurface: '#073642',
      bgElevated: '#0f4857',
      border: '#586e75',
      textPrimary: '#93a1a1',
      textMuted: '#657b83',
      accent: '#268bd2',
      accentHover: '#2aa198',
      success: '#859900',
      warning: '#b58900',
      danger: '#dc322f',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'High-contrast electric neon aesthetics',
    category: 'special',
    colors: {
      bgPrimary: '#0d0221',
      bgSurface: '#190a3a',
      bgElevated: '#261447',
      border: '#ff007f',
      textPrimary: '#00f0ff',
      textMuted: '#9d7cd8',
      accent: '#ff007f',
      accentHover: '#ff3898',
      success: '#00ff66',
      warning: '#ffe600',
      danger: '#ff0055',
    },
  },
  {
    id: 'oled',
    name: 'OLED',
    description: 'Pure pitch black for infinite contrast and battery efficiency',
    category: 'dark',
    colors: {
      bgPrimary: '#000000',
      bgSurface: '#0d0d0d',
      bgElevated: '#1a1a1a',
      border: '#262626',
      textPrimary: '#ffffff',
      textMuted: '#737373',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      success: '#22c55e',
      warning: '#eab308',
      danger: '#ef4444',
    },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    description: 'Soothing pastel mocha palette',
    category: 'dark',
    colors: {
      bgPrimary: '#1e1e2e',
      bgSurface: '#313244',
      bgElevated: '#45475a',
      border: '#45475a',
      textPrimary: '#cdd6f4',
      textMuted: '#a6adc8',
      accent: '#cba6f7',
      accentHover: '#b4befe',
      success: '#a6e3a1',
      warning: '#f9e2af',
      danger: '#f38ba8',
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Classic GitHub dark dimension palette',
    category: 'dark',
    colors: {
      bgPrimary: '#0d1117',
      bgSurface: '#161b22',
      bgElevated: '#21262d',
      border: '#30363d',
      textPrimary: '#c9d1d9',
      textMuted: '#8b949e',
      accent: '#2f81f7',
      accentHover: '#1f6feb',
      success: '#238636',
      warning: '#d29922',
      danger: '#da3633',
    },
  },
  {
    id: 'tokyonight',
    name: 'Tokyo Night',
    description: 'Clean, beautiful dark theme celebrating Tokyo night lights',
    category: 'dark',
    colors: {
      bgPrimary: '#1a1b26',
      bgSurface: '#24283b',
      bgElevated: '#2f354f',
      border: '#414868',
      textPrimary: '#c0caf5',
      textMuted: '#7aa2f7',
      accent: '#7aa2f7',
      accentHover: '#bb9af7',
      success: '#9ece6a',
      warning: '#e0af68',
      danger: '#f7768e',
    },
  },
];

export const DEFAULT_THEME = 'system';
