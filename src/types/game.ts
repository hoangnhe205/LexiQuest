export type SkillType = 'listening' | 'reading' | 'writing';

export type EncounterKind = 'tutorial' | 'normal' | 'elite' | 'boss' | 'shadow_mimic';

export type AttackStance = 'normal' | 'heavy';

export type DefenseKind = 'parry' | 'dodge';

export type ChallengeTier = 'normal' | 'heavy' | 'parry' | 'dodge';

export type GearSlot = 'weapon' | 'helm' | 'armor' | 'relic';

export type Rarity = 'common' | 'rare' | 'epic';

export type ChapterId = 'meadow' | 'clockwork' | 'citadel';

export type SpriteType =
  | 'training_dummy'
  | 'slime'
  | 'goblin'
  | 'wolf'
  | 'guardian'
  | 'slime_king'
  | 'clock_owl'
  | 'golem'
  | 'clock_spider'
  | 'warden'
  | 'chronos'
  | 'wraith'
  | 'ink_knight'
  | 'shadow_sentinel'
  | 'librarian'
  | 'obsidian_dragon'
  | 'shadow_mimic';

export type GameView = 'TITLE' | 'MAP' | 'BATTLE' | 'FORGE' | 'LEXICON' | 'ANALYTICS';

export interface GearPerk {
  slowAudioFree?: boolean;
  highlightReadingClue?: boolean;
  writingCritBonus?: number; // e.g., 0.25 = +25% writing damage
  mistakeShieldPercent?: number; // e.g., 0.35 = -35% damage taken on wrong answer
  comboHeal?: number; // heal HP every 2 correct answers in a row
  extraGoldPercent?: number; // bonus gold %
}

export interface GearItem {
  id: string;
  nameVi: string;
  slot: GearSlot;
  rarity: Rarity;
  upgradeLevel: number;
  baseAtk: number;
  baseHp: number;
  baseDef: number;
  perkLabelVi: string;
  perk: GearPerk;
  craftCostGold?: number;
  craftCostShards?: number;
}

interface BaseChallenge {
  id: string;
  skill: SkillType;
  tier?: ChallengeTier;
  phaseLabel?: string;
  focusWord: string;
  focusPhonetic?: string;
  focusMeaningVi: string;
  exampleEn: string;
}

export interface ReadingChallenge extends BaseChallenge {
  skill: 'reading';
  passage: string;
  clueSubstring: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanationVi: string;
}

export interface ListeningChallenge extends BaseChallenge {
  skill: 'listening';
  audioText: string;
  voiceName?: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  question: string;
  options: string[];
  correctIndex: number;
  explanationVi: string;
}

export interface WritingChallenge extends BaseChallenge {
  skill: 'writing';
  promptVi: string;
  targetKeywords: string[];
  sampleAnswer: string;
}

export type Challenge = ReadingChallenge | ListeningChallenge | WritingChallenge;

export interface TutorialStepGuide {
  stepNumber: number;
  mode: 'player_normal' | 'player_heavy' | 'enemy_parry' | 'enemy_dodge';
  titleVi: string;
  instructionVi: string;
  tipVi: string;
}

export interface EncounterNode {
  id: string;
  chapterId: ChapterId;
  stageNumber?: number;
  nameVi: string;
  subtitleEn: string;
  kind: EncounterKind;
  sprite: SpriteType;
  cefrLevel: string;
  maxHp: number;
  atk: number;
  recommendedLevel: number;
  rewardXp: number;
  rewardGold: number;
  rewardShards: number;
  lootPoolIds: string[];
  isRepeatable: boolean;
  unlockRequirementId?: string;
  /** Standard attack pool (Normal Attack) */
  normalPool: Challenge[];
  /** Harder attack pool (Heavy Attack: higher DMG + Crit chance) */
  heavyPool: Challenge[];
  /** Timed Parry defense pool (Enemy Normal Attack -> Parry window) */
  parryPool: Challenge[];
  /** Hardest Dodge defense pool (Enemy Heavy Attack -> shorter Dodge window) */
  dodgePool: Challenge[];
  /** Time limits in seconds for defensive reactions */
  parryTimeSec?: number;
  dodgeTimeSec?: number;
  isAiGenerated?: boolean;
  tutorialSteps?: TutorialStepGuide[];
}

export interface ChapterDefinition {
  id: ChapterId;
  order: number;
  nameVi: string;
  nameEn: string;
  cefrLevel: string;
  themeVi: string;
  themeEn: string;
  backdropUrl: string;
  accentColor: string;
}

export interface LexiconEntry {
  word: string;
  phonetic: string;
  meaningVi: string;
  exampleEn: string;
  chapterId: ChapterId;
  monsterSourceVi: string;
  correctCount: number;
  wrongCount: number;
  lastSeenAt: number;
}

export interface CursedWord {
  id: string;
  word: string;
  meaningVi: string;
  chapterId: ChapterId;
  challenge: Challenge;
  addedAt: number;
}

export interface WritingLogEntry {
  id: string;
  monsterNameVi: string;
  sentence: string;
  correctedSentence: string;
  score: number;
  verdict: 'CRITICAL' | 'HIT' | 'GRAZE' | 'MISS';
  feedbackVi: string;
  timestamp: number;
}

export interface SkillTelemetry {
  listening: { correct: number; total: number };
  reading: { correct: number; total: number };
  writing: { correct: number; total: number; totalScore: number };
  parrySuccess: number;
  parryTotal: number;
  dodgeSuccess: number;
  dodgeTotal: number;
  heavyHits: number;
  bestStreak: number;
  currentStreak: number;
  purifiedCount: number;
  battlesWon: number;
  writingHistory: WritingLogEntry[];
}

export interface HeroSaveState {
  level: number;
  xp: number;
  xpToNext: number;
  baseMaxHp: number;
  baseAtk: number;
  baseDef: number;
  gold: number;
  runeShards: number;
  hintScrolls: number;
  tutorialCompleted: boolean;
  equipped: Record<GearSlot, string | null>;
  inventory: GearItem[];
  clearedNodeIds: string[];
  lexicon: Record<string, LexiconEntry>;
  cursedQueue: CursedWord[];
  telemetry: SkillTelemetry;
  soundEnabled: boolean;
}

export interface WritingEvalResult {
  score: number;
  verdict: 'CRITICAL' | 'HIT' | 'GRAZE' | 'MISS';
  usedKeywords: string[];
  grammarIssues: string[];
  feedbackVi: string;
  correctedSentence: string;
  bonusNote: string;
}
