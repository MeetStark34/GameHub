export type UserRole =
  | 'Developer'
  | 'Moderator'
  | 'Tester'
  | 'Founder'
  | 'Contributor'
  | 'Player';

export interface RoleDefinition {
  id: UserRole;
  label: string;
  badge: string; // e.g. "🛠 Developer"
  icon: string;
  color: string;
  description: string;
}

export const ROLES: Record<UserRole, RoleDefinition> = {
  Developer: {
    id: 'Developer',
    label: 'Developer',
    badge: '🛠 Developer',
    icon: 'Wrench',
    color: '#38bdf8',
    description: 'GameHub core engineering and architecture',
  },
  Founder: {
    id: 'Founder',
    label: 'Founder',
    badge: '👑 Founder',
    icon: 'Crown',
    color: '#fbbf24',
    description: 'GameHub creator and founding vision',
  },
  Moderator: {
    id: 'Moderator',
    label: 'Moderator',
    badge: '🛡 Moderator',
    icon: 'Shield',
    color: '#34d399',
    description: 'Community integrity and fair play guardian',
  },
  Tester: {
    id: 'Tester',
    label: 'Tester',
    badge: '🔬 Tester',
    icon: 'FlaskConical',
    color: '#c084fc',
    description: 'Early puzzle balance and stability tester',
  },
  Contributor: {
    id: 'Contributor',
    label: 'Contributor',
    badge: '✨ Contributor',
    icon: 'Sparkles',
    color: '#f472b6',
    description: 'Valued platform contributor',
  },
  Player: {
    id: 'Player',
    label: 'Player',
    badge: '🎮 Player',
    icon: 'User',
    color: '#94a3b8',
    description: 'GameHub puzzle player',
  },
};
