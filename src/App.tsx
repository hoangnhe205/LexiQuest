/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AnalyticsView } from './components/AnalyticsView';
import { BattleArena, type BattleCompletionPayload } from './components/BattleArena';
import { CampForgeView } from './components/CampForgeView';
import { LexiconView } from './components/LexiconView';
import { TitleScreen } from './components/TitleScreen';
import { TopBar } from './components/TopBar';
import { WorldMapView } from './components/WorldMapView';
import { ENCOUNTERS, INITIAL_HERO_STATE, TUTORIAL_ENCOUNTER } from './data/gameData';
import type {
  ChapterId,
  EncounterNode,
  GameView,
  GearItem,
  HeroSaveState,
} from './types/game';
import { sfx } from './utils/sound';
import { buildShadowMimicEncounter, getUpgradeCost } from './utils/stats';

const STORAGE_KEY = 'lexiquest_save_v2';

function loadHeroState(): { hero: HeroSaveState; hasSaved: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { hero: INITIAL_HERO_STATE, hasSaved: false };
    const parsed = JSON.parse(raw) as Partial<HeroSaveState>;
    return {
      hero: {
        ...INITIAL_HERO_STATE,
        ...parsed,
        equipped: {
          ...INITIAL_HERO_STATE.equipped,
          ...(parsed.equipped ?? {}),
        },
        telemetry: {
          ...INITIAL_HERO_STATE.telemetry,
          ...(parsed.telemetry ?? {}),
        },
      },
      hasSaved: true,
    };
  } catch {
    return { hero: INITIAL_HERO_STATE, hasSaved: false };
  }
}

export default function App() {
  const initial = loadHeroState();
  const [hero, setHero] = useState<HeroSaveState>(initial.hero);
  const [hasSavedProgress, setHasSavedProgress] = useState<boolean>(
    initial.hasSaved &&
      (initial.hero.clearedNodeIds.length > 0 ||
        initial.hero.xp > 0 ||
        initial.hero.tutorialCompleted)
  );
  const [view, setView] = useState<GameView>('TITLE');
  const [selectedChapter, setSelectedChapter] = useState<ChapterId>('meadow');
  const [activeEncounter, setActiveEncounter] = useState<EncounterNode | null>(null);
  const [battleSessionKey, setBattleSessionKey] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hero));
    } catch {
      // Ignore storage quota issues cleanly
    }
  }, [hero]);

  const startEncounter = (encounter: EncounterNode) => {
    sfx.click(hero.soundEnabled);
    setActiveEncounter(encounter);
    setBattleSessionKey((k) => k + 1);
    setView('BATTLE');
  };

  const handleQuickBattle = () => {
    if (!hero.tutorialCompleted) {
      startEncounter(TUTORIAL_ENCOUNTER);
      return;
    }

    const shadow = buildShadowMimicEncounter(hero.cursedQueue);
    if (shadow) {
      startEncounter(shadow);
      return;
    }

    const nextUnlockedUncleared = ENCOUNTERS.find((node) => {
      const unlocked =
        !node.unlockRequirementId ||
        hero.clearedNodeIds.includes(node.unlockRequirementId);
      const cleared = hero.clearedNodeIds.includes(node.id);
      return unlocked && !cleared;
    });

    if (nextUnlockedUncleared) {
      setSelectedChapter(nextUnlockedUncleared.chapterId);
      startEncounter(nextUnlockedUncleared);
      return;
    }

    const fallback =
      ENCOUNTERS.find((n) => n.chapterId === selectedChapter) ?? ENCOUNTERS[0];
    startEncounter(fallback);
  };

  const handleBattleComplete = (payload: BattleCompletionPayload) => {
    setHasSavedProgress(true);
    setHero((prev) => {
      let nextLevel = prev.level;
      let nextXp = prev.xp + payload.xpGained;
      let nextXpToNext = prev.xpToNext;
      let leveledUp = false;

      while (nextXp >= nextXpToNext) {
        nextXp -= nextXpToNext;
        nextLevel += 1;
        nextXpToNext = Math.round(nextXpToNext * 1.35);
        leveledUp = true;
      }

      if (leveledUp) {
        sfx.levelUp(prev.soundEnabled);
      }

      const nextInventory = [...prev.inventory];
      let extraShardsFromDup = 0;
      if (payload.droppedItem) {
        const exists = nextInventory.some((i) => i.id === payload.droppedItem!.id);
        if (!exists) {
          nextInventory.push(payload.droppedItem);
        } else {
          extraShardsFromDup = 2;
        }
      }

      const isTutorialBattle = payload.encounter.kind === 'tutorial';

      const nextCleared =
        payload.victory &&
        !isTutorialBattle &&
        !payload.encounter.isAiGenerated &&
        payload.encounter.kind !== 'shadow_mimic' &&
        !prev.clearedNodeIds.includes(payload.encounter.id)
          ? [...prev.clearedNodeIds, payload.encounter.id]
          : prev.clearedNodeIds;

      const nextLexicon = { ...prev.lexicon };
      let nextCursed = prev.cursedQueue.filter(
        (c) => !payload.purifiedWordIds.includes(c.id)
      );

      const nextTelemetry = {
        ...prev.telemetry,
        listening: { ...prev.telemetry.listening },
        reading: { ...prev.telemetry.reading },
        writing: { ...prev.telemetry.writing },
        writingHistory: [...prev.telemetry.writingHistory],
        battlesWon: prev.telemetry.battlesWon + (payload.victory ? 1 : 0),
        purifiedCount: prev.telemetry.purifiedCount + payload.purifiedWordIds.length,
      };

      for (const turn of payload.turnResults) {
        const ch = turn.challenge;
        const wordKey = ch.focusWord.toLowerCase();

        // Skill telemetry
        if (ch.skill === 'listening') {
          nextTelemetry.listening.total += 1;
          if (turn.correct) nextTelemetry.listening.correct += 1;
        } else if (ch.skill === 'reading') {
          nextTelemetry.reading.total += 1;
          if (turn.correct) nextTelemetry.reading.correct += 1;
        } else {
          nextTelemetry.writing.total += 1;
          if (turn.correct) nextTelemetry.writing.correct += 1;
          if (turn.writingEval) {
            nextTelemetry.writing.totalScore += turn.writingEval.score;
            nextTelemetry.writingHistory.unshift({
              id: `wlog-${Date.now()}-${Math.random()}`,
              monsterNameVi: payload.encounter.nameVi,
              sentence: turn.writtenSentence ?? '',
              correctedSentence: turn.writingEval.correctedSentence,
              score: turn.writingEval.score,
              verdict: turn.writingEval.verdict,
              feedbackVi: turn.writingEval.feedbackVi,
              timestamp: Date.now(),
            });
          }
        }

        // Combat mechanic telemetry (Parry / Dodge / Heavy)
        if (turn.actionType === 'parry') {
          nextTelemetry.parryTotal += 1;
          if (turn.correct) nextTelemetry.parrySuccess += 1;
        } else if (turn.actionType === 'dodge') {
          nextTelemetry.dodgeTotal += 1;
          if (turn.correct) nextTelemetry.dodgeSuccess += 1;
        } else if (turn.actionType === 'heavy_attack' && turn.correct) {
          nextTelemetry.heavyHits += 1;
        }

        if (turn.correct) {
          nextTelemetry.currentStreak += 1;
          if (nextTelemetry.currentStreak > nextTelemetry.bestStreak) {
            nextTelemetry.bestStreak = nextTelemetry.currentStreak;
          }
        } else {
          nextTelemetry.currentStreak = 0;
          if (
            !isTutorialBattle &&
            !nextCursed.some((c) => c.word.toLowerCase() === wordKey) &&
            payload.encounter.kind !== 'shadow_mimic'
          ) {
            nextCursed = [
              ...nextCursed,
              {
                id: `cursed-${wordKey}-${Date.now()}`,
                word: ch.focusWord,
                meaningVi: ch.focusMeaningVi,
                chapterId: payload.encounter.chapterId,
                challenge: ch,
                addedAt: Date.now(),
              },
            ].slice(-12);
          }
        }

        const existingLex = nextLexicon[wordKey];
        nextLexicon[wordKey] = {
          word: ch.focusWord,
          phonetic: ch.focusPhonetic ?? existingLex?.phonetic ?? '',
          meaningVi: ch.focusMeaningVi,
          exampleEn: ch.exampleEn,
          chapterId: payload.encounter.chapterId,
          monsterSourceVi: payload.encounter.nameVi,
          correctCount: (existingLex?.correctCount ?? 0) + (turn.correct ? 1 : 0),
          wrongCount: (existingLex?.wrongCount ?? 0) + (turn.correct ? 0 : 1),
          lastSeenAt: Date.now(),
        };
      }

      nextTelemetry.writingHistory = nextTelemetry.writingHistory.slice(0, 20);

      return {
        ...prev,
        level: nextLevel,
        xp: nextXp,
        xpToNext: nextXpToNext,
        gold: prev.gold + payload.goldGained,
        runeShards: prev.runeShards + payload.shardsGained + extraShardsFromDup,
        tutorialCompleted: prev.tutorialCompleted || (isTutorialBattle && payload.victory),
        inventory: nextInventory,
        clearedNodeIds: nextCleared,
        lexicon: nextLexicon,
        cursedQueue: nextCursed,
        telemetry: nextTelemetry,
      };
    });
  };

  const handleEquipItem = (item: GearItem) => {
    sfx.click(hero.soundEnabled);
    setHero((prev) => {
      const hasItem = prev.inventory.some((g) => g.id === item.id);
      return {
        ...prev,
        inventory: hasItem ? prev.inventory : [...prev.inventory, item],
        equipped: {
          ...prev.equipped,
          [item.slot]: item.id,
        },
      };
    });
  };

  const handleUpgradeItem = (itemId: string) => {
    setHero((prev) => {
      const target = prev.inventory.find((g) => g.id === itemId);
      if (!target || target.upgradeLevel >= 5) return prev;
      const cost = getUpgradeCost(target);
      if (prev.gold < cost.gold || prev.runeShards < cost.shards) return prev;

      sfx.lootDrop(prev.soundEnabled);
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        runeShards: prev.runeShards - cost.shards,
        inventory: prev.inventory.map((g) =>
          g.id === itemId ? { ...g, upgradeLevel: g.upgradeLevel + 1 } : g
        ),
      };
    });
  };

  const handleCraftBlueprint = (blueprint: GearItem) => {
    const goldCost = blueprint.craftCostGold ?? 150;
    const shardCost = blueprint.craftCostShards ?? 5;
    setHero((prev) => {
      if (prev.gold < goldCost || prev.runeShards < shardCost) return prev;
      if (prev.inventory.some((g) => g.id === blueprint.id)) return prev;

      sfx.levelUp(prev.soundEnabled);
      const crafted = { ...blueprint, upgradeLevel: 0 };
      return {
        ...prev,
        gold: prev.gold - goldCost,
        runeShards: prev.runeShards - shardCost,
        inventory: [...prev.inventory, crafted],
        equipped: {
          ...prev.equipped,
          [crafted.slot]: crafted.id,
        },
      };
    });
  };

  const handleResetSave = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHero(INITIAL_HERO_STATE);
    setHasSavedProgress(false);
    setSelectedChapter('meadow');
    setActiveEncounter(null);
    setView('MAP');
  };

  const handleHuntShadowMimic = () => {
    const shadow = buildShadowMimicEncounter(hero.cursedQueue);
    if (shadow) {
      startEncounter(shadow);
    }
  };

  if (view === 'TITLE') {
    return (
      <TitleScreen
        hasProgress={hasSavedProgress}
        tutorialCompleted={hero.tutorialCompleted}
        heroLevel={hero.level}
        clearedCount={hero.clearedNodeIds.length}
        onStartTutorial={() => startEncounter(TUTORIAL_ENCOUNTER)}
        onStartMap={() => {
          sfx.click(hero.soundEnabled);
          setView('MAP');
        }}
        onResetAndStart={handleResetSave}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#121624] text-slate-100 flex flex-col">
      <TopBar
        activeView={view}
        onNavigate={(next) => {
          sfx.click(hero.soundEnabled);
          setView(next);
        }}
        onQuickBattle={handleQuickBattle}
      />

      <main className="flex-1 pb-12">
        {view === 'MAP' && (
          <WorldMapView
            hero={hero}
            selectedChapter={selectedChapter}
            onSelectChapter={(ch) => {
              sfx.click(hero.soundEnabled);
              setSelectedChapter(ch);
            }}
            onStartEncounter={startEncounter}
            onToggleSound={() =>
              setHero((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
            }
            onNavigateForge={() => {
              sfx.click(hero.soundEnabled);
              setView('FORGE');
            }}
          />
        )}

        {view === 'BATTLE' && activeEncounter && (
          <BattleArena
            key={battleSessionKey}
            hero={hero}
            encounter={activeEncounter}
            onComplete={handleBattleComplete}
            onEquipItemImmediately={handleEquipItem}
            onRetreat={() => {
              sfx.click(hero.soundEnabled);
              setView('MAP');
            }}
            onReplay={() => startEncounter(activeEncounter)}
          />
        )}

        {view === 'FORGE' && (
          <CampForgeView
            hero={hero}
            onEquip={handleEquipItem}
            onUpgrade={handleUpgradeItem}
            onCraft={handleCraftBlueprint}
          />
        )}

        {view === 'LEXICON' && (
          <LexiconView hero={hero} onHuntShadowMimic={handleHuntShadowMimic} />
        )}

        {view === 'ANALYTICS' && (
          <AnalyticsView
            hero={hero}
            onHuntShadowMimic={handleHuntShadowMimic}
            onResetSave={handleResetSave}
          />
        )}
      </main>
    </div>
  );
}
