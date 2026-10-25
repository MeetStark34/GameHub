import { describe, it, expect } from 'vitest';
import { calculateGameXp, ECONOMY_CONFIG } from './economy';

describe('XP Economy Engine', () => {
  it('calculates unlimited game XP with base and difficulty multiplier', () => {
    const easy = calculateGameXp({ isDaily: false, difficulty: 'easy' });
    expect(easy.baseXp).toBe(20);
    expect(easy.totalXp).toBe(20);

    const normal = calculateGameXp({ isDaily: false, difficulty: 'normal' });
    expect(normal.baseXp).toBe(20);
    expect(normal.difficultyBonus).toBe(5); // 20 * 0.25
    expect(normal.totalXp).toBe(25);
  });

  it('calculates daily game XP with enhanced base reward', () => {
    const dailyNormal = calculateGameXp({ isDaily: true, difficulty: 'normal' });
    expect(dailyNormal.baseXp).toBe(35);
    expect(dailyNormal.totalXp).toBeGreaterThan(25);
  });

  it('awards perfect completion bonus when applicable', () => {
    const normalPerfect = calculateGameXp({
      isDaily: false,
      difficulty: 'normal',
      isPerfect: true,
    });
    expect(normalPerfect.perfectBonus).toBe(ECONOMY_CONFIG.perfectCompletionBonusXp);
    expect(normalPerfect.totalXp).toBe(25 + ECONOMY_CONFIG.perfectCompletionBonusXp);
  });
});
