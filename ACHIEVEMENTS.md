# GameHub Achievements Specification

## 1. Design & Rarity System
Achievements provide meaningful milestones, celebration feedback, and significant XP rewards.  
All definitions are centralized in `/src/config/achievements.ts`.

### Rarity Tiers:
- **Common:** Readily achievable in the first few sessions.
- **Uncommon:** Requires dedication across multiple days or games.
- **Rare:** Demands sustained focus or distinct puzzle mastery.
- **Epic:** Difficult streak consistency or milestone completion.
- **Legendary:** Elite lifetime accomplishments.
- **Secret:** Hidden requirements revealed only upon unlock.

---

## 2. Categories
1. **Gameplay:** General puzzle solving volume, zero-mistake solves, speed records.
2. **Streaks:** Multi-day consistency markers (7, 30, 100 days).
3. **True Player:** Completing all 8 daily games consistently.
4. **Speed:** Lightning-fast deduction records.
5. **Game-Specific:** Feats tied to particular games (e.g., 6×6 Queen patterns).
6. **Rare:** High difficulty mastery.
7. **Weird:** First-class collection celebrating playful and unconventional player behavior.

---

## 3. The Weird Achievement Collection

| Name | Secret? | Reward | Condition |
|---|---|---|---|
| **Potato** | Yes | +150 XP | Play the exact same game 10 times consecutively. |
| **Night Owl** | No | +250 XP | Complete a Daily Set between 00:00 and 04:00 UTC. |
| **Early Bird** | No | +250 XP | Complete a Daily Set between 04:00 and 06:00 UTC. |
| **Why?** | Yes | +500 XP | Play the same game 50 times in a single UTC day. |
| **Touch Grass** | Yes | +300 XP | Return after a 7+ day absence and complete a Daily Set. |
| **Slow & Steady** | Yes | +200 XP | Spend more than 30 continuous minutes contemplating a puzzle before solving. |
| **WHAT** | Yes | +350 XP | Complete a puzzle under an ultra-fast sub-second threshold. |
| **Chaos** | Yes | +250 XP | Complete the Daily Set in a bizarre reverse or randomized sequence. |
| **Overqualified** | No | +300 XP | Complete 100 Easy games as an established player. |
| **Are You Okay?** | Yes | +1,000 XP | Complete 100 puzzles in a single UTC day. |
| **Hoarder** | No | +500 XP | Hold 3 Gold Repair Cards simultaneously. |
| **Rich** | No | +2,500 XP | Accumulate a lifetime total of 100,000 XP. |
| **Still Here** | No | +5,000 XP | Reach a 100-day Normal Streak. |
| **Waste Not** | No | +500 XP | Have a 4th earned card automatically convert into XP. |
