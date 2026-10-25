import { describe, it, expect } from 'vitest';
import { calculateRankFromXp, LEVEL_CONFIG } from './levels';

describe('Level and Prestige Calculation Engine', () => {
  it('assigns Rookie for 0 XP', () => {
    const result = calculateRankFromXp(0);
    expect(result.level).toBe(1);
    expect(result.rank).toBe('Rookie');
    expect(result.prestigeSuffix).toBe('I');
  });

  it('assigns correct prestige tier within Rookie', () => {
    const tier2 = calculateRankFromXp(350);
    expect(tier2.level).toBe(1);
    expect(tier2.prestigeSuffix).toBe('II');

    const tier3 = calculateRankFromXp(700);
    expect(tier3.level).toBe(1);
    expect(tier3.prestigeSuffix).toBe('III');
  });

  it('assigns Novice at 1,000 XP', () => {
    const result = calculateRankFromXp(1000);
    expect(result.level).toBe(2);
    expect(result.rank).toBe('Novice');
  });

  it('assigns Amateur at 3,000 XP', () => {
    const result = calculateRankFromXp(3000);
    expect(result.level).toBe(3);
    expect(result.rank).toBe('Amateur');
  });

  it('assigns Elite at 60,000 XP', () => {
    const result = calculateRankFromXp(60000);
    expect(result.level).toBe(7);
    expect(result.rank).toBe('Elite');
  });

  it('assigns Elite III at 85,000 XP (Mr. Stark example)', () => {
    const result = calculateRankFromXp(85000);
    expect(result.level).toBe(7);
    expect(result.rank).toBe('Elite');
    expect(result.prestigeSuffix).toBe('III');
    expect(result.formattedRank).toBe('Elite III');
  });

  it('assigns Legend at 300,000 XP and accumulates indefinitely with no hard cap', () => {
    const result = calculateRankFromXp(347421);
    expect(result.level).toBe(10);
    expect(result.rank).toBe('Legend');
    expect(result.currentXp).toBe(347421);
    expect(result.nextLevelMinXp).toBeNull();
  });

  it('handles negative or invalid XP safely', () => {
    const result = calculateRankFromXp(-100);
    expect(result.level).toBe(1);
    expect(result.rank).toBe('Rookie');
    expect(result.currentXp).toBe(0);
  });
});
