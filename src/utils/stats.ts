import type {
  Challenge,
  CursedWord,
  EncounterNode,
  GearItem,
  GearPerk,
  GearSlot,
  HeroSaveState,
} from '../types/game';

export interface ComputedHeroStats {
  maxHp: number;
  atk: number;
  def: number;
  perks: {
    slowAudioFree: boolean;
    highlightReadingClue: boolean;
    writingCritBonus: number;
    mistakeShieldPercent: number;
    comboHeal: number;
    extraGoldPercent: number;
  };
  equippedItems: Record<GearSlot, GearItem | null>;
}

export function getGearStats(item: GearItem): { atk: number; hp: number; def: number } {
  const mult = 1 + item.upgradeLevel * 0.22;
  return {
    atk: Math.round(item.baseAtk * mult),
    hp: Math.round(item.baseHp * mult),
    def: Math.round(item.baseDef * mult),
  };
}

export function getUpgradeCost(item: GearItem): { gold: number; shards: number } {
  const tierFactor = item.rarity === 'epic' ? 1.6 : item.rarity === 'rare' ? 1.25 : 1;
  const nextLv = item.upgradeLevel + 1;
  return {
    gold: Math.round(35 * nextLv * tierFactor),
    shards: Math.max(1, Math.round(nextLv * tierFactor)),
  };
}

export function computeHeroStats(hero: HeroSaveState): ComputedHeroStats {
  const slots: GearSlot[] = ['weapon', 'helm', 'armor', 'relic'];
  const equippedItems: Record<GearSlot, GearItem | null> = {
    weapon: null,
    helm: null,
    armor: null,
    relic: null,
  };

  let bonusAtk = 0;
  let bonusHp = 0;
  let bonusDef = 0;

  const perks: Required<GearPerk> = {
    slowAudioFree: false,
    highlightReadingClue: false,
    writingCritBonus: 0,
    mistakeShieldPercent: 0,
    comboHeal: 0,
    extraGoldPercent: 0,
  };

  for (const slot of slots) {
    const id = hero.equipped[slot];
    if (!id) continue;
    const found = hero.inventory.find((g) => g.id === id) ?? null;
    equippedItems[slot] = found;
    if (!found) continue;

    const scaled = getGearStats(found);
    bonusAtk += scaled.atk;
    bonusHp += scaled.hp;
    bonusDef += scaled.def;

    if (found.perk.slowAudioFree) perks.slowAudioFree = true;
    if (found.perk.highlightReadingClue) perks.highlightReadingClue = true;
    if (found.perk.writingCritBonus) {
      perks.writingCritBonus += found.perk.writingCritBonus + found.upgradeLevel * 0.04;
    }
    if (found.perk.mistakeShieldPercent) {
      perks.mistakeShieldPercent = Math.min(
        0.65,
        perks.mistakeShieldPercent + found.perk.mistakeShieldPercent + found.upgradeLevel * 0.03
      );
    }
    if (found.perk.comboHeal) {
      perks.comboHeal += found.perk.comboHeal + found.upgradeLevel * 2;
    }
    if (found.perk.extraGoldPercent) {
      perks.extraGoldPercent += found.perk.extraGoldPercent + found.upgradeLevel * 0.05;
    }
  }

  return {
    maxHp: hero.baseMaxHp + (hero.level - 1) * 14 + bonusHp,
    atk: hero.baseAtk + (hero.level - 1) * 4 + bonusAtk,
    def: hero.baseDef + (hero.level - 1) * 2 + bonusDef,
    perks,
    equippedItems,
  };
}

export function getTotalQuestionCount(node: EncounterNode): number {
  return (
    node.normalPool.length +
    node.heavyPool.length +
    node.parryPool.length +
    node.dodgePool.length
  );
}

export function buildShadowMimicEncounter(cursedQueue: CursedWord[]): EncounterNode | null {
  if (cursedQueue.length === 0) return null;
  const selected = cursedQueue.slice(0, 4);
  const primaryChapter = selected[0].chapterId;

  const nonWriting = selected.filter((c) => c.challenge.skill !== 'writing').map((c) => c.challenge);
  const allChallenges: Challenge[] = selected.map((c, idx) => ({
    ...c.challenge,
    phaseLabel: `Thanh tẩy Mảnh Nguyền ${idx + 1}/${selected.length}: "${c.word}"`,
  }));

  // Ensure Parry/Dodge pools always have fast-reflex multiple-choice challenges
  const fallbackDefense: Challenge = {
    id: `shadow-def-fallback`,
    skill: 'reading',
    passage: `The Shadow Mimic echoes the cursed word "${selected[0].word}". Recall its Vietnamese meaning to break the curse!`,
    clueSubstring: selected[0].word,
    question: `Nghĩa chính xác của từ "${selected[0].word}" là gì?`,
    options: [
      selected[0].meaningVi,
      'Từ bỏ giữa chừng',
      'Khóa chặt cánh cổng',
      'Đi vòng qua ngọn núi',
    ],
    correctIndex: 0,
    explanationVi: `"${selected[0].word}" có nghĩa là "${selected[0].meaningVi}".`,
    focusWord: selected[0].word,
    focusMeaningVi: selected[0].meaningVi,
    exampleEn: selected[0].challenge.exampleEn,
  };

  const defensePool = nonWriting.length > 0 ? nonWriting : [fallbackDefense];

  return {
    id: `shadow-mimic-${selected.map((c) => c.id).join('_')}`,
    chapterId: primaryChapter,
    nameVi: 'Quái Bóng Tối SRS',
    subtitleEn: 'Shadow Mimic of Forgotten Words',
    kind: 'shadow_mimic',
    sprite: 'shadow_mimic',
    cefrLevel: 'Ôn tập SRS',
    maxHp: 90 + selected.length * 25,
    atk: 16,
    recommendedLevel: 1,
    rewardXp: 55 + selected.length * 18,
    rewardGold: 45 + selected.length * 15,
    rewardShards: 3 + selected.length,
    lootPoolIds: ['relic_memory_prism', 'helm_echo_visor', 'armor_context_cloak'],
    isRepeatable: false,
    normalPool: allChallenges,
    heavyPool: allChallenges,
    parryPool: defensePool,
    dodgePool: defensePool,
    parryTimeSec: 15,
    dodgeTimeSec: 10,
  };
}

export function getMasteryRank(correct: number, wrong: number): 'gold' | 'silver' | 'bronze' {
  if (correct >= 3 && correct > wrong * 2) return 'gold';
  if (correct >= 2) return 'silver';
  return 'bronze';
}
