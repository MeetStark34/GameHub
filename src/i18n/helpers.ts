import { ACHIEVEMENTS_BY_ID } from '@/config/achievements';
import type { Translator } from './translate';

/** Localized achievement name/description with the config's English as fallback. */
export function achievementText(tr: Pick<Translator, 'msg'>, id: string) {
  const def = ACHIEVEMENTS_BY_ID.get(id);
  return {
    name: tr.msg({ key: `achievements.items.${id}.name` }, def?.name ?? id),
    description: tr.msg({ key: `achievements.items.${id}.description` }, def?.description ?? ''),
  };
}
