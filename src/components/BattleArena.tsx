import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  Flame,
  GraduationCap,
  Headphones,
  Loader2,
  PenTool,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Swords,
  Volume2,
  Wind,
  XCircle,
  Zap,
} from 'lucide-react';
import { ARTWORK, CHAPTERS, GEAR_CATALOG } from '../data/gameData';
import type {
  AttackStance,
  Challenge,
  DefenseKind,
  EncounterNode,
  GearItem,
  HeroSaveState,
  WritingEvalResult,
} from '../types/game';
import { sfx } from '../utils/sound';
import { computeHeroStats } from '../utils/stats';
import { GearPixelIcon, MonsterSprite, PixelImage } from './PixelSprites';

export interface BattleTurnRecord {
  challenge: Challenge;
  correct: boolean;
  actionType: 'normal_attack' | 'heavy_attack' | 'parry' | 'dodge';
  writingEval?: WritingEvalResult;
  writtenSentence?: string;
}

export interface BattleCompletionPayload {
  victory: boolean;
  encounter: EncounterNode;
  xpGained: number;
  goldGained: number;
  shardsGained: number;
  droppedItem: GearItem | null;
  purifiedWordIds: string[];
  turnResults: BattleTurnRecord[];
}

interface BattleArenaProps {
  hero: HeroSaveState;
  encounter: EncounterNode;
  onComplete: (payload: BattleCompletionPayload) => void;
  onEquipItemImmediately: (item: GearItem) => void;
  onRetreat: () => void;
  onReplay: () => void;
}

interface FloatingBanner {
  id: number;
  side: 'hero' | 'enemy';
  text: string;
  tone: 'crit' | 'hit' | 'heal' | 'damage' | 'parry' | 'dodge';
}

type CombatPhase =
  | 'PLAYER_SELECT'
  | 'PLAYER_CHALLENGE'
  | 'ENEMY_DEFENSE'
  | 'TURN_FEEDBACK';

const clientTtsCache = new Map<string, string>();

export const BattleArena: React.FC<BattleArenaProps> = ({
  hero,
  encounter,
  onComplete,
  onEquipItemImmediately,
  onRetreat,
  onReplay,
}) => {
  const stats = useMemo(() => computeHeroStats(hero), [hero]);
  const chapter = useMemo(
    () => CHAPTERS.find((c) => c.id === encounter.chapterId) ?? CHAPTERS[0],
    [encounter.chapterId]
  );

  const isTutorial = encounter.kind === 'tutorial';
  const parryLimit = encounter.parryTimeSec ?? 15;
  const dodgeLimit = encounter.dodgeTimeSec ?? 10;

  const [heroHp, setHeroHp] = useState(stats.maxHp);
  const [enemyHp, setEnemyHp] = useState(encounter.maxHp);
  const [comboStreak, setComboStreak] = useState(0);
  const [dodgeCritBuff, setDodgeCritBuff] = useState(false);

  // Tutorial step index (0..3)
  const [tutorialStepIdx, setTutorialStepIdx] = useState(0);

  // Combat phase & pool cursors
  const [phase, setPhase] = useState<CombatPhase>('PLAYER_SELECT');
  const [activeStance, setActiveStance] = useState<AttackStance>('normal');
  const [nextEnemyIntent, setNextEnemyIntent] = useState<DefenseKind>('parry');
  const [activeDefense, setActiveDefense] = useState<DefenseKind>('parry');
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [nextPhaseAfterFeedback, setNextPhaseAfterFeedback] = useState<'ENEMY' | 'PLAYER'>('ENEMY');

  const [poolCursor, setPoolCursor] = useState({
    normal: 0,
    heavy: 0,
    parry: 0,
    dodge: 0,
  });
  const [roundNumber, setRoundNumber] = useState(1);

  // Countdown timer state (for Parry & Dodge)
  const [timeLeftMs, setTimeLeftMs] = useState<number>(parryLimit * 1000);
  const [timerMaxMs, setTimerMaxMs] = useState<number>(parryLimit * 1000);
  const lastTickSecRef = useRef<number>(-1);

  // Animations & Floating Numbers
  const [heroAnim, setHeroAnim] = useState<'idle' | 'lunge' | 'shake' | 'dodge'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'lunge' | 'shake'>('idle');
  const [banners, setBanners] = useState<FloatingBanner[]>([]);

  // Active challenge input states
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [clueRevealed, setClueRevealed] = useState(false);
  const [writtenText, setWrittenText] = useState('');
  const [evaluatingWriting, setEvaluatingWriting] = useState(false);
  const [writingError, setWritingError] = useState<string | null>(null);

  // Listening TTS state
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [slowMode, setSlowMode] = useState(false);
  const [audioPlayedOnce, setAudioPlayedOnce] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Turn resolution feedback
  const [turnFeedback, setTurnFeedback] = useState<{
    correct: boolean;
    headline: string;
    detailVi: string;
    correctedSentence?: string;
    bonusNote?: string;
    transcript?: string;
  } | null>(null);

  const [turnResults, setTurnResults] = useState<BattleTurnRecord[]>([]);
  const [outcome, setOutcome] = useState<BattleCompletionPayload | null>(null);
  const [equippedDropped, setEquippedDropped] = useState(false);

  const activeTutorialGuide =
    isTutorial && encounter.tutorialSteps
      ? encounter.tutorialSteps[Math.min(tutorialStepIdx, encounter.tutorialSteps.length - 1)]
      : null;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const pushBanner = (
    side: 'hero' | 'enemy',
    text: string,
    tone: FloatingBanner['tone']
  ) => {
    const id = Date.now() + Math.random();
    setBanners((prev) => [...prev.slice(-3), { id, side, text, tone }]);
    setTimeout(() => {
      setBanners((prev) => prev.filter((b) => b.id !== id));
    }, 1050);
  };

  const triggerAnim = (who: 'hero' | 'enemy', kind: 'lunge' | 'shake' | 'dodge') => {
    if (who === 'hero') {
      setHeroAnim(kind);
      setTimeout(() => setHeroAnim('idle'), 380);
    } else if (kind !== 'dodge') {
      setEnemyAnim(kind);
      setTimeout(() => setEnemyAnim('idle'), 380);
    }
  };

  const resetChallengeInputs = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
    setSelectedOption(null);
    setClueRevealed(false);
    setWrittenText('');
    setWritingError(null);
    setAudioError(null);
    setAudioPlayedOnce(false);
    setTurnFeedback(null);
  };

  const finalizeBattle = (
    victory: boolean,
    finalTurnResults: BattleTurnRecord[]
  ) => {
    const goldMult = 1 + stats.perks.extraGoldPercent;
    const xpGained = victory ? encounter.rewardXp : Math.round(encounter.rewardXp * 0.45);
    const goldGained = victory ? Math.round(encounter.rewardGold * goldMult) : 0;
    const shardsGained = victory ? encounter.rewardShards : 0;

    let droppedItem: GearItem | null = null;
    if (victory && encounter.lootPoolIds.length > 0) {
      const dropChance =
        encounter.kind === 'boss' || encounter.kind === 'elite' || isTutorial
          ? 1
          : encounter.kind === 'shadow_mimic'
            ? 0.8
            : 0.6;
      if (Math.random() <= dropChance) {
        const unowned = encounter.lootPoolIds.filter(
          (id) => !hero.inventory.some((owned) => owned.id === id)
        );
        const pool = unowned.length > 0 ? unowned : encounter.lootPoolIds;
        const pickedId = pool[Math.floor(Math.random() * pool.length)];
        const template = GEAR_CATALOG.find((g) => g.id === pickedId);
        if (template) {
          droppedItem = { ...template };
        }
      }
    }

    const purifiedWordIds =
      victory && encounter.kind === 'shadow_mimic'
        ? hero.cursedQueue.slice(0, encounter.normalPool.length).map((c) => c.id)
        : [];

    if (victory) {
      if (encounter.kind === 'shadow_mimic') {
        sfx.purify(hero.soundEnabled);
      } else {
        sfx.lootDrop(hero.soundEnabled);
      }
    }

    const payload: BattleCompletionPayload = {
      victory,
      encounter,
      xpGained,
      goldGained,
      shardsGained,
      droppedItem,
      purifiedWordIds,
      turnResults: finalTurnResults,
    };

    setOutcome(payload);
    onComplete(payload);
  };

  // Start Player Attack (Normal or Heavy)
  const handleSelectAttackStance = (stance: AttackStance) => {
    if (phase !== 'PLAYER_SELECT' || outcome) return;
    resetChallengeInputs();
    setActiveStance(stance);

    if (stance === 'heavy') {
      sfx.heavyCharge(hero.soundEnabled);
      const list = encounter.heavyPool;
      const picked = list[poolCursor.heavy % list.length];
      setPoolCursor((c) => ({ ...c, heavy: c.heavy + 1 }));
      setActiveChallenge(picked);
    } else {
      sfx.click(hero.soundEnabled);
      const list = encounter.normalPool;
      const picked = list[poolCursor.normal % list.length];
      setPoolCursor((c) => ({ ...c, normal: c.normal + 1 }));
      setActiveChallenge(picked);
    }
    setPhase('PLAYER_CHALLENGE');
  };

  // Start Enemy Defense turn (Parry or Dodge with countdown timer)
  const startEnemyDefensePhase = (kind: DefenseKind) => {
    resetChallengeInputs();
    setActiveDefense(kind);

    if (kind === 'dodge') {
      sfx.heavyCharge(hero.soundEnabled);
      const list = encounter.dodgePool;
      const picked = list[poolCursor.dodge % list.length];
      setPoolCursor((c) => ({ ...c, dodge: c.dodge + 1 }));
      setActiveChallenge(picked);
      setTimerMaxMs(dodgeLimit * 1000);
      setTimeLeftMs(dodgeLimit * 1000);
      lastTickSecRef.current = dodgeLimit;
    } else {
      sfx.click(hero.soundEnabled);
      const list = encounter.parryPool;
      const picked = list[poolCursor.parry % list.length];
      setPoolCursor((c) => ({ ...c, parry: c.parry + 1 }));
      setActiveChallenge(picked);
      setTimerMaxMs(parryLimit * 1000);
      setTimeLeftMs(parryLimit * 1000);
      lastTickSecRef.current = parryLimit;
    }

    setPhase('ENEMY_DEFENSE');
  };

  // Apply Player Attack Resolution
  const resolvePlayerAttack = (params: {
    correct: boolean;
    baseMultiplier: number;
    headline: string;
    detailVi: string;
    correctedSentence?: string;
    bonusNote?: string;
    writingEval?: WritingEvalResult;
    writtenSentence?: string;
    transcript?: string;
    forceCrit?: boolean;
  }) => {
    if (!activeChallenge) return;

    const isHeavy = activeStance === 'heavy';
    const baseCritChance =
      (isHeavy ? 0.45 : 0.15) +
      (dodgeCritBuff ? 0.15 : 0) +
      stats.perks.writingCritBonus * 0.35;
    const rolledCrit =
      params.correct &&
      (params.forceCrit || Math.random() < Math.min(0.88, baseCritChance));

    let nextEnemyHp = enemyHp;
    let nextHeroHp = heroHp;
    const nextStreak = params.correct ? comboStreak + 1 : 0;

    if (params.baseMultiplier > 0) {
      const stanceMult = isHeavy ? 1.75 : 1.0;
      const critMult = rolledCrit ? 1.45 : 1.0;
      const dmg = Math.max(
        10,
        Math.round(stats.atk * stanceMult * params.baseMultiplier * critMult)
      );

      // In Tutorial, keep dummy alive at >= 1 HP until Step 4 (Dodge) finishes
      const rawNextHp = Math.max(0, enemyHp - dmg);
      nextEnemyHp = isTutorial && tutorialStepIdx < 3 ? Math.max(15, rawNextHp) : rawNextHp;
      setEnemyHp(nextEnemyHp);

      triggerAnim('hero', 'lunge');
      triggerAnim('enemy', 'shake');
      pushBanner(
        'enemy',
        rolledCrit
          ? `-${dmg} ${isHeavy ? 'TRỌNG KÍCH CHÍ MẠNG!' : 'CHÍ MẠNG!'}`
          : `-${dmg} ${isHeavy ? 'TRỌNG KÍCH' : 'ĐÁNH THƯỜNG'}`,
        rolledCrit ? 'crit' : 'hit'
      );

      if (rolledCrit) {
        sfx.critSpell(hero.soundEnabled);
      } else {
        sfx.slash(hero.soundEnabled);
      }
    } else {
      // Missed player attack -> light counter chip from enemy
      const chipDmg = Math.max(5, Math.round(encounter.atk * 0.45 * (1 - stats.perks.mistakeShieldPercent)));
      nextHeroHp = Math.max(isTutorial ? 20 : 0, heroHp - chipDmg);
      setHeroHp(nextHeroHp);
      triggerAnim('hero', 'shake');
      pushBanner('hero', `-${chipDmg} HP (Hụt đòn)`, 'damage');
      sfx.monsterHit(hero.soundEnabled);
    }

    if (params.correct && stats.perks.comboHeal > 0 && nextStreak % 2 === 0) {
      const healed = Math.min(stats.maxHp - nextHeroHp, stats.perks.comboHeal);
      if (healed > 0) {
        nextHeroHp += healed;
        setHeroHp(nextHeroHp);
        pushBanner('hero', `+${healed} HP Hồi phục`, 'heal');
      }
    }

    setDodgeCritBuff(false);
    setComboStreak(nextStreak);

    const updatedHistory: BattleTurnRecord[] = [
      ...turnResults,
      {
        challenge: activeChallenge,
        correct: params.correct,
        actionType: isHeavy ? 'heavy_attack' : 'normal_attack',
        writingEval: params.writingEval,
        writtenSentence: params.writtenSentence,
      },
    ];
    setTurnResults(updatedHistory);

    setTurnFeedback({
      correct: params.correct,
      headline: rolledCrit
        ? `${params.headline} · CHÍ MẠNG!`
        : params.headline,
      detailVi: params.detailVi,
      correctedSentence: params.correctedSentence,
      bonusNote: params.bonusNote,
      transcript: params.transcript,
    });
    setNextPhaseAfterFeedback('ENEMY');
    setPhase('TURN_FEEDBACK');

    if (nextEnemyHp <= 0) {
      setTimeout(() => finalizeBattle(true, updatedHistory), 900);
    } else if (nextHeroHp <= 0) {
      setTimeout(() => finalizeBattle(false, updatedHistory), 900);
    }
  };

  // Apply Enemy Defense Resolution (Parry or Dodge, including Timeout!)
  const resolveDefenseTurn = (
    success: boolean,
    timedOut: boolean,
    explanationVi: string,
    rightAnswerText?: string,
    transcript?: string
  ) => {
    if (!activeChallenge || phase !== 'ENEMY_DEFENSE' || outcome) return;

    const isDodge = activeDefense === 'dodge';
    let nextEnemyHp = enemyHp;
    let nextHeroHp = heroHp;
    const nextStreak = success ? comboStreak + 1 : 0;

    if (success) {
      if (isDodge) {
        // Perfect Dodge! Evade 100% heavy attack + grant +15% crit buff!
        setDodgeCritBuff(true);
        triggerAnim('hero', 'dodge');
        triggerAnim('enemy', 'lunge');
        pushBanner('hero', 'NÉ ĐÒN HOÀN HẢO! (+15% CHÍ MẠNG)', 'dodge');
        sfx.dodge(hero.soundEnabled);

        if (isTutorial && tutorialStepIdx >= 3) {
          // Finish tutorial cleanly after Step 4 Dodge!
          nextEnemyHp = 0;
          setEnemyHp(0);
        }
      } else {
        // Parry Success! Block 100% damage + Counter-strike!
        const counterDmg = Math.max(12, Math.round(stats.atk * 0.8));
        const rawNext = Math.max(0, enemyHp - counterDmg);
        nextEnemyHp = isTutorial && tutorialStepIdx < 3 ? Math.max(15, rawNext) : rawNext;
        setEnemyHp(nextEnemyHp);
        triggerAnim('hero', 'lunge');
        triggerAnim('enemy', 'shake');
        pushBanner('enemy', `-${counterDmg} PARRY PHẢN CÔNG!`, 'parry');
        sfx.parry(hero.soundEnabled);
      }
    } else {
      // Failed Parry or Failed Dodge -> Enemy lands attack!
      const rawEnemyAtk = isDodge ? encounter.atk * 1.65 : encounter.atk;
      const mitigated = Math.max(
        6,
        Math.round(
          Math.max(8, rawEnemyAtk - Math.floor(stats.def * 0.45)) *
            (1 - stats.perks.mistakeShieldPercent)
        )
      );
      nextHeroHp = Math.max(isTutorial ? 15 : 0, heroHp - mitigated);
      setHeroHp(nextHeroHp);
      triggerAnim('enemy', 'lunge');
      triggerAnim('hero', 'shake');
      pushBanner(
        'hero',
        `-${mitigated} HP ${timedOut ? '(HẾT GIỜ!)' : isDodge ? '(TRỌNG KÍCH!)' : ''}`,
        'damage'
      );
      if (isDodge) {
        sfx.heavyMonsterHit(hero.soundEnabled);
      } else {
        sfx.monsterHit(hero.soundEnabled);
      }

      if (isTutorial && tutorialStepIdx >= 3) {
        // Even if missed in tutorial step 4, allow finishing cleanly or retrying
        nextEnemyHp = 0;
        setEnemyHp(0);
      }
    }

    setComboStreak(nextStreak);

    const updatedHistory: BattleTurnRecord[] = [
      ...turnResults,
      {
        challenge: activeChallenge,
        correct: success,
        actionType: isDodge ? 'dodge' : 'parry',
      },
    ];
    setTurnResults(updatedHistory);

    const headline = success
      ? isDodge
        ? 'NÉ TRỌNG KÍCH HOÀN HẢO! (+15% Chí Mạng lượt kế tiếp)'
        : 'PARRY THÀNH CÔNG! Chặn 100% sát thương & phản công!'
      : timedOut
        ? `HẾT GIỜ ${isDodge ? 'NÉ ĐÒN' : 'PARRY'}! · Đáp án đúng: "${rightAnswerText ?? ''}"`
        : `${isDodge ? 'Né Trọng Kích thất bại' : 'Parry hụt'} · Đáp án đúng: "${rightAnswerText ?? ''}"`;

    setTurnFeedback({
      correct: success,
      headline,
      detailVi: explanationVi,
      transcript,
    });
    setNextPhaseAfterFeedback('PLAYER');
    setPhase('TURN_FEEDBACK');

    if (nextEnemyHp <= 0) {
      setTimeout(() => finalizeBattle(true, updatedHistory), 950);
    } else if (nextHeroHp <= 0) {
      setTimeout(() => finalizeBattle(false, updatedHistory), 950);
    }
  };

  // Live Countdown Timer for Parry & Dodge (pauses automatically while TTS audio is loading!)
  useEffect(() => {
    if (phase !== 'ENEMY_DEFENSE' || outcome || !activeChallenge) return;
    if (audioLoading) return;

    const interval = window.setInterval(() => {
      setTimeLeftMs((prev) => {
        const next = Math.max(0, prev - 100);
        const secCeil = Math.ceil(next / 1000);
        if (secCeil <= 3 && secCeil > 0 && secCeil !== lastTickSecRef.current) {
          lastTickSecRef.current = secCeil;
          sfx.timerTick(hero.soundEnabled, secCeil <= 2);
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [phase, outcome, activeChallenge, audioLoading, hero.soundEnabled]);

  // Trigger timeout failure when defense timer hits 0
  useEffect(() => {
    if (phase !== 'ENEMY_DEFENSE' || timeLeftMs > 0 || !activeChallenge || outcome) return;
    if (activeChallenge.skill === 'writing') return;

    const rightAnswer = activeChallenge.options[activeChallenge.correctIndex];
    resolveDefenseTurn(
      false,
      true,
      activeChallenge.explanationVi,
      rightAnswer,
      activeChallenge.skill === 'listening' ? activeChallenge.audioText : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftMs, phase]);

  // Handle Multiple Choice selection (Reading & Listening)
  const handleSelectChoice = (idx: number) => {
    if (
      (phase !== 'PLAYER_CHALLENGE' && phase !== 'ENEMY_DEFENSE') ||
      !activeChallenge ||
      activeChallenge.skill === 'writing' ||
      outcome
    ) {
      return;
    }

    setSelectedOption(idx);
    const isCorrect = idx === activeChallenge.correctIndex;
    const rightAnswer = activeChallenge.options[activeChallenge.correctIndex];
    const transcript =
      activeChallenge.skill === 'listening' ? activeChallenge.audioText : undefined;

    if (phase === 'ENEMY_DEFENSE') {
      resolveDefenseTurn(isCorrect, false, activeChallenge.explanationVi, rightAnswer, transcript);
    } else {
      resolvePlayerAttack({
        correct: isCorrect,
        baseMultiplier: isCorrect ? 1.0 : 0,
        headline: isCorrect
          ? activeStance === 'heavy'
            ? 'Trọng Kích trúng đích!'
            : 'Đòn Đánh Thường chuẩn xác!'
          : `Đòn đánh bị trượt · Đáp án đúng: "${rightAnswer}"`,
        detailVi: activeChallenge.explanationVi,
        transcript,
      });
    }
  };

  // Play Gemini TTS Audio
  const handlePlayListeningAudio = async (useSlow: boolean) => {
    if (!activeChallenge || activeChallenge.skill !== 'listening') return;
    setAudioError(null);
    setSlowMode(useSlow);

    const voiceName = activeChallenge.voiceName || 'Kore';
    const cacheKey = `${voiceName}::${activeChallenge.audioText}`;

    try {
      let base64 = clientTtsCache.get(cacheKey);
      if (!base64) {
        setAudioLoading(true);
        const res = await fetch('/api/audio/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: activeChallenge.audioText,
            voiceName,
            style:
              encounter.kind === 'boss'
                ? 'Dramatic, articulate fantasy RPG character speaking clear English'
                : 'Clear, natural English speaker for language learners',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.audioBase64) {
          throw new Error(data.error || 'Không thể tải giọng đọc tiếng Anh.');
        }
        base64 = data.audioBase64 as string;
        clientTtsCache.set(cacheKey, base64);
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audio.playbackRate = useSlow ? 0.75 : 1.0;
      audioRef.current = audio;

      audio.onplay = () => {
        setIsPlayingAudio(true);
        setAudioPlayedOnce(true);
      };
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => {
        setIsPlayingAudio(false);
        setAudioError('Trình duyệt không thể phát âm thanh. Hãy nhấn thử lại.');
      };

      await audio.play();
    } catch (err: unknown) {
      setAudioError(err instanceof Error ? err.message : 'Lỗi kết nối giọng đọc AI.');
      setIsPlayingAudio(false);
    } finally {
      setAudioLoading(false);
    }
  };

  // Submit AI Writing Heavy Spell
  const handleSubmitWriting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      phase !== 'PLAYER_CHALLENGE' ||
      !activeChallenge ||
      activeChallenge.skill !== 'writing' ||
      evaluatingWriting ||
      outcome
    ) {
      return;
    }

    const trimmed = writtenText.trim();
    if (trimmed.length < 3) {
      setWritingError('Hãy nhập một câu tiếng Anh hoàn chỉnh trước khi tung chiêu.');
      return;
    }

    setEvaluatingWriting(true);
    setWritingError(null);

    try {
      const res = await fetch('/api/combat/evaluate-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: trimmed,
          promptContext: activeChallenge.promptVi,
          targetKeywords: activeChallenge.targetKeywords,
          cefrLevel: encounter.cefrLevel,
          monsterName: encounter.nameVi,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể chấm câu qua Gemini AI.');
      }

      const evalRes = data as WritingEvalResult;
      const gearWriteMult = 1 + stats.perks.writingCritBonus;

      if (evalRes.verdict === 'CRITICAL') {
        resolvePlayerAttack({
          correct: true,
          baseMultiplier: 1.25 * gearWriteMult,
          forceCrit: true,
          headline: `Tuyệt kỹ Viết hoàn hảo! · Điểm AI: ${evalRes.score}/100`,
          detailVi: evalRes.feedbackVi,
          correctedSentence: evalRes.correctedSentence,
          bonusNote: evalRes.bonusNote,
          writingEval: evalRes,
          writtenSentence: trimmed,
        });
      } else if (evalRes.verdict === 'HIT') {
        resolvePlayerAttack({
          correct: true,
          baseMultiplier: 1.0 * gearWriteMult,
          headline: `Viết câu chuẩn xác! · Điểm AI: ${evalRes.score}/100`,
          detailVi: evalRes.feedbackVi,
          correctedSentence: evalRes.correctedSentence,
          bonusNote: evalRes.bonusNote,
          writingEval: evalRes,
          writtenSentence: trimmed,
        });
      } else if (evalRes.verdict === 'GRAZE') {
        resolvePlayerAttack({
          correct: false,
          baseMultiplier: 0.45 * gearWriteMult,
          headline: `Sát thương sượt · Điểm AI: ${evalRes.score}/100`,
          detailVi: evalRes.feedbackVi,
          correctedSentence: evalRes.correctedSentence,
          bonusNote: evalRes.grammarIssues.join(' · '),
          writingEval: evalRes,
          writtenSentence: trimmed,
        });
      } else {
        resolvePlayerAttack({
          correct: false,
          baseMultiplier: 0,
          headline: `Phép thuật hụt đích · Điểm AI: ${evalRes.score}/100`,
          detailVi: evalRes.feedbackVi,
          correctedSentence: evalRes.correctedSentence,
          bonusNote: evalRes.grammarIssues.join(' · '),
          writingEval: evalRes,
          writtenSentence: trimmed,
        });
      }
    } catch (err: unknown) {
      setWritingError(err instanceof Error ? err.message : 'Lỗi kết nối khi chấm câu Viết.');
    } finally {
      setEvaluatingWriting(false);
    }
  };

  // Continue from Feedback to Enemy Defense or Back to Player Action Selection
  const handleContinueAfterFeedback = () => {
    if (outcome) return;
    sfx.click(hero.soundEnabled);

    if (isTutorial) {
      const nextStep = tutorialStepIdx + 1;
      setTutorialStepIdx(nextStep);
      if (nextStep === 1) {
        startEnemyDefensePhase('parry');
        return;
      }
      if (nextStep === 2) {
        setNextEnemyIntent('dodge');
        resetChallengeInputs();
        setActiveChallenge(null);
        setPhase('PLAYER_SELECT');
        return;
      }
      if (nextStep === 3) {
        startEnemyDefensePhase('dodge');
        return;
      }
    }

    if (nextPhaseAfterFeedback === 'ENEMY') {
      startEnemyDefensePhase(nextEnemyIntent);
    } else {
      // Decide enemy's telegraphed intent for next round
      const nextRound = roundNumber + 1;
      setRoundNumber(nextRound);
      const heavyChance =
        encounter.kind === 'boss' ? 0.52 : encounter.kind === 'elite' ? 0.45 : 0.35;
      // Guarantee Dodge appears regularly on every 2nd/3rd round
      const willHeavy = nextRound % 2 === 0 ? true : Math.random() < heavyChance;
      setNextEnemyIntent(willHeavy ? 'dodge' : 'parry');
      resetChallengeInputs();
      setActiveChallenge(null);
      setPhase('PLAYER_SELECT');
    }
  };

  const renderHighlightedPassage = (passage: string, clue: string) => {
    if (!clueRevealed || !clue) return passage;
    const idx = passage.toLowerCase().indexOf(clue.toLowerCase());
    if (idx === -1) return passage;
    return (
      <>
        {passage.slice(0, idx)}
        <mark className="bg-amber-400/30 text-amber-200 px-1 border-b border-amber-400">
          {passage.slice(idx, idx + clue.length)}
        </mark>
        {passage.slice(idx + clue.length)}
      </>
    );
  };

  const heroHpPct = Math.max(0, Math.min(100, (heroHp / stats.maxHp) * 100));
  const enemyHpPct = Math.max(0, Math.min(100, (enemyHp / encounter.maxHp) * 100));
  const timerPct = timerMaxMs > 0 ? Math.max(0, Math.min(100, (timeLeftMs / timerMaxMs) * 100)) : 0;

  const isDefense = phase === 'ENEMY_DEFENSE';
  const normalLockedByTutorial =
    isTutorial && activeTutorialGuide?.mode === 'player_heavy';
  const heavyLockedByTutorial =
    isTutorial && activeTutorialGuide?.mode === 'player_normal';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-4">
      {/* Top Arena Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onRetreat}
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Rút lui về Bản đồ</span>
        </button>

        <div className="text-xs sm:text-sm text-slate-300 font-mono-num">
          {encounter.nameVi} · {encounter.cefrLevel} · Hiệp {roundNumber}
        </div>
      </div>

      {/* Interactive Tutorial Step Banner */}
      {isTutorial && activeTutorialGuide && !outcome && (
        <section className="pixel-panel-elevated p-4 border-amber-400/80 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>{activeTutorialGuide.titleVi}</span>
          </div>
          <p className="text-sm text-white leading-relaxed">
            {activeTutorialGuide.instructionVi}
          </p>
          <p className="text-xs text-slate-300">{activeTutorialGuide.tipVi}</p>
        </section>
      )}

      {/* ZONE 1: 2D Pixel Battle Stage */}
      <section className="pixel-panel relative overflow-hidden min-h-[275px] sm:min-h-[305px] flex flex-col justify-between p-5 sm:p-6">
        <PixelImage
          src={chapter.backdropUrl}
          alt={chapter.nameVi}
          className="absolute inset-0 w-full h-full object-cover"
          fallbackLabel={chapter.nameEn}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#121624]/78 via-[#121624]/45 to-[#121624]/92" />

        {/* HUD Row */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-10">
          {/* Hero HUD */}
          <div className="bg-[#121624]/88 border border-[#343e5c] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-pixel text-sky-300">
                Hiệp Sĩ · Lv.{hero.level}
              </span>
              <span className="font-mono-num text-slate-200">
                HP {heroHp}/{stats.maxHp} · {heroHpPct > 40 ? 'Ổn định' : 'Nguy cấp'}
              </span>
            </div>
            <div className="h-3 bg-[#1c2236] border border-[#343e5c] overflow-hidden">
              <div
                className={`h-full transition-transform duration-300 origin-left ${
                  heroHpPct > 40 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ transform: `scaleX(${heroHpPct / 100})` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400 font-mono-num">
              <span>ATK {stats.atk}</span>
              <span>DEF {stats.def}</span>
              <span>Chuỗi: {comboStreak}</span>
              {dodgeCritBuff && (
                <span className="text-emerald-400 font-semibold">
                  +15% Chí Mạng (Né đòn)
                </span>
              )}
            </div>
          </div>

          {/* Enemy HUD + Telegraphed Intent */}
          <div className="bg-[#121624]/88 border border-[#343e5c] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-pixel text-amber-400">{encounter.nameVi}</span>
              <span className="font-mono-num text-slate-200">
                HP {enemyHp}/{encounter.maxHp}
              </span>
            </div>
            <div className="h-3 bg-[#1c2236] border border-[#343e5c] overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-transform duration-300 origin-left"
                style={{ transform: `scaleX(${enemyHpPct / 100})` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono-num">
              <span
                className={
                  (isDefense ? activeDefense : nextEnemyIntent) === 'dodge'
                    ? 'text-rose-400 font-semibold'
                    : 'text-sky-300 font-semibold'
                }
              >
                {(isDefense ? activeDefense : nextEnemyIntent) === 'dodge'
                  ? `Cảnh báo: Đòn Trọng Kích · Buộc Né (${dodgeLimit}s)`
                  : `Ý đồ địch: Đòn Thường · Có thể Parry (${parryLimit}s)`}
              </span>
            </div>
          </div>
        </div>

        {/* Sprites Arena Floor */}
        <div className="relative z-10 flex items-end justify-between px-4 sm:px-14 pt-6 pb-2">
          {/* Hero Sprite */}
          <div className="relative flex flex-col items-center">
            {banners
              .filter((b) => b.side === 'hero')
              .map((b) => (
                <div
                  key={b.id}
                  className={`absolute -top-10 font-pixel text-xs sm:text-sm whitespace-nowrap animate-float-damage ${
                    b.tone === 'heal' || b.tone === 'dodge'
                      ? 'text-emerald-300'
                      : 'text-rose-400'
                  }`}
                >
                  {b.text}
                </div>
              ))}
            <div
              className={`w-24 h-24 sm:w-32 sm:h-32 border-2 border-sky-400/80 bg-[#121624] overflow-hidden shadow-[0_8px_0_rgba(7,9,16,0.85)] transition-transform ${
                heroAnim === 'lunge'
                  ? 'animate-lunge-right'
                  : heroAnim === 'shake'
                    ? 'animate-hit-shake'
                    : heroAnim === 'dodge'
                      ? '-translate-x-8 opacity-75 duration-200'
                      : 'animate-sprite-bob'
              }`}
            >
              <PixelImage
                src={ARTWORK.heroPortrait}
                alt="Hiệp sĩ Học giả"
                className="w-full h-full object-cover"
                fallbackLabel="HERO"
              />
            </div>
          </div>

          {/* Center Phase Cue */}
          <div className="hidden md:flex flex-col items-center text-center pb-8">
            {phase === 'PLAYER_SELECT' && (
              <span className="font-pixel text-xs text-amber-300">
                LƯỢT CỦA BẠN · CHỌN ĐÒN ĐÁNH
              </span>
            )}
            {phase === 'PLAYER_CHALLENGE' && (
              <span
                className={`font-pixel text-xs ${
                  activeStance === 'heavy' ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {activeStance === 'heavy' ? 'TỤ LỰC TRỌNG KÍCH!' : 'ĐÒN ĐÁNH THƯỜNG'}
              </span>
            )}
            {phase === 'ENEMY_DEFENSE' && (
              <span
                className={`font-pixel text-xs ${
                  activeDefense === 'dodge' ? 'text-rose-400' : 'text-sky-300'
                }`}
              >
                {activeDefense === 'dodge'
                  ? 'KẺ ĐỊCH TRỌNG KÍCH · NÉ NGAY!'
                  : 'KẺ ĐỊCH TẤN CÔNG · PARRY!'}
              </span>
            )}
          </div>

          {/* Enemy Sprite */}
          <div className="relative flex flex-col items-center">
            {banners
              .filter((b) => b.side === 'enemy')
              .map((b) => (
                <div
                  key={b.id}
                  className={`absolute -top-10 font-pixel text-xs sm:text-sm whitespace-nowrap animate-float-damage ${
                    b.tone === 'crit'
                      ? 'text-amber-300'
                      : b.tone === 'parry'
                        ? 'text-sky-300'
                        : 'text-emerald-300'
                  }`}
                >
                  {b.text}
                </div>
              ))}
            <div
              className={
                enemyAnim === 'lunge'
                  ? 'animate-lunge-left'
                  : enemyAnim === 'shake'
                    ? 'animate-hit-shake'
                    : 'animate-sprite-bob'
              }
            >
              <MonsterSprite
                sprite={encounter.sprite}
                size={encounter.kind === 'boss' ? 124 : 108}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 2: Tactical Combat Command & Challenge Deck */}
      <section className="pixel-panel p-5 sm:p-6 space-y-5">
        {/* === PHASE A: PLAYER ATTACK CHOICE (NORMAL vs HEAVY) === */}
        {phase === 'PLAYER_SELECT' && !outcome && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#343e5c] pb-3">
              <div className="font-semibold text-white text-base">
                Chọn chiêu thức tấn công của bạn
              </div>
              <div className="text-xs text-slate-400">
                Lượt sau kẻ địch sẽ tung:{' '}
                <strong
                  className={
                    nextEnemyIntent === 'dodge' ? 'text-rose-400' : 'text-sky-400'
                  }
                >
                  {nextEnemyIntent === 'dodge'
                    ? `Trọng Kích (Buộc Né · ${dodgeLimit}s)`
                    : `Đòn Thường (Parry · ${parryLimit}s)`}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Normal Attack Card */}
              <button
                type="button"
                disabled={normalLockedByTutorial}
                onClick={() => handleSelectAttackStance('normal')}
                className={`text-left p-5 border-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  !normalLockedByTutorial && isTutorial && activeTutorialGuide?.mode === 'player_normal'
                    ? 'bg-emerald-950/40 border-emerald-400'
                    : 'bg-[#121624] border-[#343e5c] hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="flex items-center gap-2 font-pixel text-sm sm:text-base text-emerald-400">
                    <Swords className="w-4 h-4 shrink-0" />
                    Đòn Đánh Thường
                  </span>
                  <span className="text-xs font-mono-num text-slate-300">
                    1.0x ATK · 15% Chí Mạng
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Trả lời câu hỏi Đọc hoặc Nghe ở mức tiêu chuẩn. Ổn định, chắc chắn để giữ chuỗi đúng và tích nội tại hồi máu.
                </p>
              </button>

              {/* Heavy Attack Card */}
              <button
                type="button"
                disabled={heavyLockedByTutorial}
                onClick={() => handleSelectAttackStance('heavy')}
                className={`text-left p-5 border-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  !heavyLockedByTutorial && isTutorial && activeTutorialGuide?.mode === 'player_heavy'
                    ? 'bg-rose-950/45 border-amber-400'
                    : 'bg-[#121624] border-[#343e5c] hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="flex items-center gap-2 font-pixel text-sm sm:text-base text-amber-400">
                    <Flame className="w-4 h-4 shrink-0" />
                    Đòn Trọng Kích
                  </span>
                  <span className="text-xs font-mono-num text-rose-300">
                    1.75x ATK · {45 + (dodgeCritBuff ? 15 : 0)}% Chí Mạng
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Điều kiện câu hỏi khó hơn (Viết câu AI chấm hoặc Đọc/Nghe nâng cao). Gây sát thương vượt trội và tỉ lệ Chí Mạng cao.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* === PHASE B & C: ACTIVE CHALLENGE (PLAYER ATTACK OR TIMED ENEMY DEFENSE) === */}
        {(phase === 'PLAYER_CHALLENGE' || phase === 'ENEMY_DEFENSE' || phase === 'TURN_FEEDBACK') &&
          activeChallenge && (
            <div className="space-y-4">
              {/* Timed Countdown Bar for Parry & Dodge */}
              {phase === 'ENEMY_DEFENSE' && (
                <div
                  className={`p-3.5 border-2 space-y-2 ${
                    activeDefense === 'dodge'
                      ? 'bg-rose-950/50 border-rose-500'
                      : 'bg-sky-950/45 border-sky-400'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                    <span
                      className={`flex items-center gap-2 font-bold ${
                        activeDefense === 'dodge' ? 'text-rose-300' : 'text-sky-300'
                      }`}
                    >
                      {activeDefense === 'dodge' ? (
                        <>
                          <Wind className="w-4 h-4 shrink-0" />
                          <span>
                            KẺ ĐỊCH TUNG TRỌNG KÍCH · KHÔNG THỂ PARRY · BUỘC PHẢI NÉ! (Câu khó nhất màn)
                          </span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>
                            KẺ ĐỊCH ĐÁNH THƯỜNG · TRẢ LỜI NHANH ĐỂ PARRY & PHẢN CÔNG!
                          </span>
                        </>
                      )}
                    </span>

                    <span
                      className={`flex items-center gap-1.5 font-mono-num font-bold text-sm sm:text-base ${
                        timeLeftMs <= 3000 ? 'text-rose-300' : 'text-white'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      {audioLoading
                        ? 'Đang tải âm thanh...'
                        : `${(timeLeftMs / 1000).toFixed(1)}s`}
                    </span>
                  </div>

                  <div className="h-2.5 bg-[#121624] border border-[#343e5c] overflow-hidden">
                    <div
                      className={`h-full transition-transform duration-100 origin-left ${
                        activeDefense === 'dodge'
                          ? 'bg-rose-500'
                          : timeLeftMs <= 4000
                            ? 'bg-amber-400'
                            : 'bg-sky-400'
                      }`}
                      style={{ transform: `scaleX(${timerPct / 100})` }}
                    />
                  </div>
                </div>
              )}

              {/* Challenge Header Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#343e5c] pb-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 font-semibold text-white">
                  {activeChallenge.skill === 'reading' && (
                    <>
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Đọc Hiểu</span>
                    </>
                  )}
                  {activeChallenge.skill === 'listening' && (
                    <>
                      <Headphones className="w-4 h-4 text-sky-400" />
                      <span className="text-sky-400">Nghe Hiểu</span>
                    </>
                  )}
                  {activeChallenge.skill === 'writing' && (
                    <>
                      <PenTool className="w-4 h-4 text-rose-400" />
                      <span className="text-rose-400">Viết Câu (AI Chấm)</span>
                    </>
                  )}
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300">
                    {phase === 'ENEMY_DEFENSE'
                      ? activeDefense === 'dodge'
                        ? 'Né Trọng Kích'
                        : 'Parry Đòn Thường'
                      : activeStance === 'heavy'
                        ? 'Điều kiện Trọng Kích'
                        : 'Điều kiện Đánh Thường'}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  Từ trọng tâm:{' '}
                  <span className="text-amber-300 font-semibold">
                    {activeChallenge.focusWord}
                  </span>
                </div>
              </div>

              {/* READING UI */}
              {activeChallenge.skill === 'reading' && (
                <div className="space-y-4">
                  <div className="bg-[#121624] border border-[#343e5c] p-4 sm:p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">Ngữ cảnh tiếng Anh</span>
                      {stats.perks.highlightReadingClue && phase !== 'TURN_FEEDBACK' && (
                        <button
                          type="button"
                          disabled={clueRevealed}
                          onClick={() => setClueRevealed(true)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-50 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{clueRevealed ? 'Đã soi manh mối' : 'Soi manh mối (Giáp)'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-slate-100 text-base leading-relaxed">
                      {renderHighlightedPassage(
                        activeChallenge.passage,
                        activeChallenge.clueSubstring
                      )}
                    </p>
                  </div>

                  <div className="text-sm sm:text-base font-semibold text-white">
                    {activeChallenge.question}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeChallenge.options.map((opt, idx) => {
                      const isSelected = selectedOption === idx;
                      const isRight = idx === activeChallenge.correctIndex;
                      let style =
                        'bg-[#262e47] hover:bg-[#323d5e] border-[#414d70] text-slate-100';
                      if (phase === 'TURN_FEEDBACK') {
                        if (isRight) {
                          style = 'bg-emerald-950/70 border-emerald-400 text-emerald-100';
                        } else if (isSelected && !isRight) {
                          style = 'bg-rose-950/70 border-rose-400 text-rose-100';
                        } else {
                          style = 'bg-[#1c2236] border-[#2c3654] text-slate-500';
                        }
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={phase === 'TURN_FEEDBACK'}
                          onClick={() => handleSelectChoice(idx)}
                          className={`text-left p-3.5 border-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-default ${style}`}
                        >
                          <span className="font-mono-num text-amber-400 mr-2">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LISTENING UI */}
              {activeChallenge.skill === 'listening' && (
                <div className="space-y-4">
                  <div className="bg-[#121624] border border-[#343e5c] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-sky-400 font-semibold">
                        Âm thanh tiếng Anh (Gemini TTS)
                      </div>
                      <p className="text-sm text-slate-300">
                        {audioPlayedOnce
                          ? 'Chọn đáp án chính xác nhất dựa trên câu vừa nghe.'
                          : 'Nhấn Phát âm thanh để nghe (đồng hồ sẽ tạm dừng khi đang tải âm thanh).'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        disabled={audioLoading}
                        onClick={() => handlePlayListeningAudio(false)}
                        className="pixel-btn inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-[#121624] text-sm font-bold cursor-pointer disabled:opacity-60"
                      >
                        {audioLoading && !slowMode ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                        <span>
                          {isPlayingAudio && !slowMode ? 'Đang phát...' : 'Phát âm thanh 1.0x'}
                        </span>
                      </button>

                      {stats.perks.slowAudioFree && (
                        <button
                          type="button"
                          disabled={audioLoading}
                          onClick={() => handlePlayListeningAudio(true)}
                          className="pixel-btn inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#262e47] hover:bg-[#323d5e] border-[#4b5b87] text-sky-200 text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-60"
                        >
                          {audioLoading && slowMode ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Headphones className="w-4 h-4" />
                          )}
                          <span>Nghe chậm 0.75x</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {audioError && (
                    <div className="p-3 bg-rose-950/60 border border-rose-500/60 text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {audioError}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePlayListeningAudio(slowMode)}
                        className="underline font-bold whitespace-nowrap cursor-pointer"
                      >
                        Thử lại
                      </button>
                    </div>
                  )}

                  <div className="text-sm sm:text-base font-semibold text-white">
                    {activeChallenge.question}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeChallenge.options.map((opt, idx) => {
                      const isSelected = selectedOption === idx;
                      const isRight = idx === activeChallenge.correctIndex;
                      let style =
                        'bg-[#262e47] hover:bg-[#323d5e] border-[#414d70] text-slate-100';
                      if (phase === 'TURN_FEEDBACK') {
                        if (isRight) {
                          style = 'bg-emerald-950/70 border-emerald-400 text-emerald-100';
                        } else if (isSelected && !isRight) {
                          style = 'bg-rose-950/70 border-rose-400 text-rose-100';
                        } else {
                          style = 'bg-[#1c2236] border-[#2c3654] text-slate-500';
                        }
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={phase === 'TURN_FEEDBACK'}
                          onClick={() => handleSelectChoice(idx)}
                          className={`text-left p-3.5 border-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-default ${style}`}
                        >
                          <span className="font-mono-num text-sky-400 mr-2">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WRITING UI (AI SPELL-FORGING FOR HEAVY ATTACKS) */}
              {activeChallenge.skill === 'writing' && (
                <form onSubmit={handleSubmitWriting} className="space-y-4">
                  <div className="bg-[#121624] border border-[#343e5c] p-4 space-y-2.5">
                    <div className="text-sm sm:text-base font-semibold text-white">
                      {activeChallenge.promptVi}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="text-slate-400">Từ khóa thưởng Chí Mạng:</span>
                      {activeChallenge.targetKeywords.map((kw) => {
                        const matched = writtenText
                          .toLowerCase()
                          .includes(kw.toLowerCase());
                        return (
                          <span
                            key={kw}
                            className={`font-mono-num font-semibold ${
                              matched ? 'text-emerald-400' : 'text-amber-300'
                            }`}
                          >
                            {matched ? '✓ ' : ''}
                            {kw}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="spell-writing-input" className="sr-only">
                      Nhập câu tiếng Anh của bạn
                    </label>
                    <textarea
                      id="spell-writing-input"
                      rows={2}
                      disabled={evaluatingWriting || phase === 'TURN_FEEDBACK'}
                      value={writtenText}
                      onChange={(e) => setWrittenText(e.target.value)}
                      placeholder="Gõ câu tiếng Anh của bạn tại đây để tung Trọng Kích..."
                      className="w-full bg-[#121624] border-2 border-[#414d70] focus:border-amber-400 focus:outline-none p-3.5 text-base text-white placeholder:text-slate-500 disabled:opacity-65"
                    />

                    {writingError && (
                      <div className="text-xs sm:text-sm text-rose-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{writingError}</span>
                      </div>
                    )}

                    {phase !== 'TURN_FEEDBACK' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-slate-400">
                          Nội tại vũ khí: +{Math.round(stats.perks.writingCritBonus * 100)}% sát thương Viết
                        </span>
                        <button
                          type="submit"
                          disabled={evaluatingWriting || writtenText.trim().length < 3}
                          className="pixel-btn inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
                        >
                          {evaluatingWriting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>AI đang chấm Trọng Kích...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              <span>Tung Trọng Kích (AI chấm)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              )}

              {/* TURN FEEDBACK PANEL */}
              {phase === 'TURN_FEEDBACK' && turnFeedback && !outcome && (
                <div
                  className={`p-4 border-2 space-y-2.5 ${
                    turnFeedback.correct
                      ? 'bg-emerald-950/40 border-emerald-500/60'
                      : 'bg-rose-950/40 border-rose-500/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div
                        className={`flex items-center gap-2 font-semibold text-sm ${
                          turnFeedback.correct ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {turnFeedback.correct ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{turnFeedback.headline}</span>
                      </div>
                      <p className="text-sm text-slate-200">{turnFeedback.detailVi}</p>
                      {turnFeedback.transcript && (
                        <p className="text-xs text-sky-200">
                          <span className="text-slate-400">Bản ghi âm thanh: </span>
                          &ldquo;{turnFeedback.transcript}&rdquo;
                        </p>
                      )}
                      {turnFeedback.correctedSentence && (
                        <p className="text-xs sm:text-sm text-amber-200">
                          <span className="text-slate-400">Câu chuẩn tự nhiên: </span>
                          {turnFeedback.correctedSentence}
                        </p>
                      )}
                      {turnFeedback.bonusNote && (
                        <p className="text-xs text-slate-300">{turnFeedback.bonusNote}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleContinueAfterFeedback}
                      className="pixel-btn px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#121624] text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {nextPhaseAfterFeedback === 'ENEMY'
                        ? nextEnemyIntent === 'dodge'
                          ? 'Đỡ Trọng Kích địch!'
                          : 'Kẻ địch phản công!'
                        : 'Tới lượt bạn'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
      </section>

      {/* Victory / Defeat Loot Summary Modal */}
      {outcome && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="battle-outcome-title"
          className="fixed inset-0 z-50 bg-[#090c14]/85 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="pixel-panel-elevated max-w-lg w-full p-6 space-y-5">
            <div className="space-y-1 text-center">
              <div
                className={`text-xs font-mono-num ${
                  outcome.victory ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {isTutorial
                  ? 'HOÀN THÀNH MÀN HƯỚNG DẪN'
                  : outcome.victory
                    ? 'CHIẾN THẮNG TRẬN ĐẤU'
                    : 'CẦN RÈN LUYỆN THÊM'}
              </div>
              <h2
                id="battle-outcome-title"
                className="font-pixel text-2xl text-white"
              >
                {isTutorial
                  ? 'Bạn đã nắm vững 4 cơ chế chiến đấu!'
                  : outcome.victory
                    ? `Đã hạ gục ${outcome.encounter.nameVi}!`
                    : 'Hiệp sĩ tạm rút lui'}
              </h2>
              <p className="text-sm text-slate-300">
                {isTutorial
                  ? 'Đánh Thường · Trọng Kích · Parry (15s) · Né Đòn (10s) đã sẵn sàng cho hành trình 18 ải.'
                  : outcome.victory
                    ? 'Kiến thức tiếng Anh đã chuyển hóa thành kinh nghiệm và chiến lợi phẩm.'
                    : 'Bạn vẫn giữ 45% EXP và các câu sai đã được ghi nhận vào hàng đợi Quái Bóng Tối SRS.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center bg-[#121624] border border-[#343e5c] p-3.5 font-mono-num">
              <div>
                <div className="text-xs text-slate-400 font-sans">Kinh nghiệm</div>
                <div className="text-base font-bold text-emerald-400">
                  +{outcome.xpGained} EXP
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-sans">Vàng</div>
                <div className="text-base font-bold text-amber-400 flex items-center justify-center gap-1">
                  <Coins className="w-4 h-4" />+{outcome.goldGained}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-sans">Mảnh Cổ Ngữ</div>
                <div className="text-base font-bold text-sky-400 flex items-center justify-center gap-1">
                  <Sparkles className="w-4 h-4" />+{outcome.shardsGained}
                </div>
              </div>
            </div>

            {outcome.purifiedWordIds.length > 0 && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 text-xs sm:text-sm text-emerald-200">
                Đã thanh tẩy thành công {outcome.purifiedWordIds.length} Mảnh Nguyền SRS!
              </div>
            )}

            {outcome.droppedItem && (
              <div className="p-4 bg-[#121624] border-2 border-amber-500/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <GearPixelIcon
                    slot={outcome.droppedItem.slot}
                    rarity={outcome.droppedItem.rarity}
                    size={40}
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-amber-400 font-semibold">
                      Nhặt được trang bị ·{' '}
                      {outcome.droppedItem.rarity === 'epic'
                        ? 'Sử Thi'
                        : outcome.droppedItem.rarity === 'rare'
                          ? 'Hiếm'
                          : 'Thường'}
                    </div>
                    <div className="font-semibold text-white truncate">
                      {outcome.droppedItem.nameVi}
                    </div>
                    <div className="text-xs text-slate-300">
                      {outcome.droppedItem.perkLabelVi}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={equippedDropped}
                  onClick={() => {
                    onEquipItemImmediately(outcome.droppedItem!);
                    setEquippedDropped(true);
                  }}
                  className="pixel-btn px-3 py-2 bg-amber-500 hover:bg-amber-400 text-[#121624] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {equippedDropped ? 'Đã trang bị' : 'Trang bị ngay'}
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              {encounter.isRepeatable && (
                <button
                  type="button"
                  onClick={onReplay}
                  className="pixel-btn inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#262e47] hover:bg-[#323d5e] border-[#4b5b87] text-white text-sm font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isTutorial ? 'Luyện lại Hướng dẫn' : 'Đánh lại để Farm'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onRetreat}
                className="pixel-btn px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#121624] text-sm font-bold cursor-pointer"
              >
                Về bản đồ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
