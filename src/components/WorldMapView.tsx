import React, { useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Flame,
  Ghost,
  GraduationCap,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ARTWORK, CHAPTERS, ENCOUNTERS, TUTORIAL_ENCOUNTER } from '../data/gameData';
import type {
  ChapterId,
  EncounterNode,
  HeroSaveState,
} from '../types/game';
import {
  buildShadowMimicEncounter,
  computeHeroStats,
  getTotalQuestionCount,
} from '../utils/stats';
import { MonsterSprite, PixelImage } from './PixelSprites';

interface WorldMapViewProps {
  hero: HeroSaveState;
  selectedChapter: ChapterId;
  onSelectChapter: (chapter: ChapterId) => void;
  onStartEncounter: (encounter: EncounterNode) => void;
  onToggleSound: () => void;
  onNavigateForge: () => void;
}

export const WorldMapView: React.FC<WorldMapViewProps> = ({
  hero,
  selectedChapter,
  onSelectChapter,
  onStartEncounter,
  onToggleSound,
  onNavigateForge,
}) => {
  const [generatingFarm, setGeneratingFarm] = useState(false);
  const [farmError, setFarmError] = useState<string | null>(null);

  const stats = computeHeroStats(hero);
  const chapter = CHAPTERS.find((c) => c.id === selectedChapter) ?? CHAPTERS[0];
  const chapterNodes = ENCOUNTERS.filter((e) => e.chapterId === chapter.id);
  const shadowMimic = buildShadowMimicEncounter(hero.cursedQueue);

  const isUnlocked = (node: EncounterNode) => {
    if (!node.unlockRequirementId) return true;
    return hero.clearedNodeIds.includes(node.unlockRequirementId);
  };

  const handleSummonAiFarm = async () => {
    setGeneratingFarm(true);
    setFarmError(null);
    try {
      const weakWords = hero.cursedQueue.slice(0, 4).map((c) => c.word);
      const res = await fetch('/api/quest/generate-farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: chapter.id,
          cefrLevel: chapter.cefrLevel,
          chapterTheme: chapter.themeEn,
          weakWords,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể triệu hồi quái Farm AI.');
      }

      const spritePool =
        chapter.id === 'meadow'
          ? (['slime', 'goblin', 'wolf'] as const)
          : chapter.id === 'clockwork'
            ? (['clock_owl', 'golem', 'clock_spider'] as const)
            : (['wraith', 'ink_knight', 'shadow_sentinel'] as const);

      const ts = Date.now();
      const aiEncounter: EncounterNode = {
        id: `ai-farm-${ts}`,
        chapterId: chapter.id,
        nameVi: data.monsterNameVi || 'Quái Ngữ Cảnh AI',
        subtitleEn: `${data.monsterSubtitle || 'Adaptive Monster'} · AI Farm`,
        kind: 'normal',
        sprite: spritePool[Math.floor(Math.random() * spritePool.length)],
        cefrLevel: chapter.cefrLevel,
        maxHp: chapter.order === 1 ? 120 : chapter.order === 2 ? 170 : 220,
        atk: chapter.order === 1 ? 14 : chapter.order === 2 ? 20 : 26,
        recommendedLevel: chapter.order * 2 - 1,
        rewardXp: 65 * chapter.order,
        rewardGold: 50 * chapter.order,
        rewardShards: 2 + chapter.order,
        lootPoolIds:
          chapter.order === 1
            ? ['armor_context_cloak', 'weapon_silver_fountain']
            : chapter.order === 2
              ? ['helm_echo_visor', 'relic_memory_prism']
              : ['armor_obsidian_aegis', 'weapon_golden_quillblade'],
        isRepeatable: false,
        isAiGenerated: true,
        parryTimeSec: chapter.order === 1 ? 15 : chapter.order === 2 ? 14 : 13,
        dodgeTimeSec: chapter.order === 1 ? 10 : 9,
        normalPool: [
          {
            id: `ai-nr-${ts}`,
            skill: 'reading',
            tier: 'normal',
            passage: data.normalReading.passage,
            clueSubstring: data.normalReading.clueSubstring || '',
            question: data.normalReading.question,
            options: data.normalReading.options.slice(0, 4),
            correctIndex: Math.max(0, Math.min(3, Number(data.normalReading.correctIndex) || 0)),
            explanationVi: data.normalReading.explanationVi,
            focusWord: data.normalReading.focusWord,
            focusMeaningVi: data.normalReading.focusMeaningVi,
            exampleEn: data.normalReading.passage,
          },
          {
            id: `ai-nl-${ts}`,
            skill: 'listening',
            tier: 'normal',
            audioText: data.normalListening.audioText,
            voiceName: chapter.order === 3 ? 'Charon' : 'Kore',
            question: data.normalListening.question,
            options: data.normalListening.options.slice(0, 4),
            correctIndex: Math.max(0, Math.min(3, Number(data.normalListening.correctIndex) || 0)),
            explanationVi: data.normalListening.explanationVi,
            focusWord: data.normalListening.focusWord,
            focusMeaningVi: data.normalListening.focusMeaningVi,
            exampleEn: data.normalListening.audioText,
          },
        ],
        heavyPool: [
          {
            id: `ai-hw-${ts}`,
            skill: 'writing',
            tier: 'heavy',
            promptVi: data.heavyWriting.promptVi,
            targetKeywords: Array.isArray(data.heavyWriting.targetKeywords)
              ? data.heavyWriting.targetKeywords
              : [data.heavyWriting.focusWord],
            sampleAnswer: data.heavyWriting.sampleAnswer,
            focusWord: data.heavyWriting.focusWord,
            focusMeaningVi: data.heavyWriting.focusMeaningVi,
            exampleEn: data.heavyWriting.sampleAnswer,
          },
        ],
        parryPool: [
          {
            id: `ai-p-${ts}`,
            skill: 'reading',
            tier: 'parry',
            passage: data.parryChallenge.passage,
            clueSubstring: data.parryChallenge.clueSubstring || '',
            question: data.parryChallenge.question,
            options: data.parryChallenge.options.slice(0, 4),
            correctIndex: Math.max(0, Math.min(3, Number(data.parryChallenge.correctIndex) || 0)),
            explanationVi: data.parryChallenge.explanationVi,
            focusWord: data.parryChallenge.focusWord,
            focusMeaningVi: data.parryChallenge.focusMeaningVi,
            exampleEn: data.parryChallenge.passage,
          },
        ],
        dodgePool: [
          {
            id: `ai-d-${ts}`,
            skill: 'reading',
            tier: 'dodge',
            passage: data.dodgeChallenge.passage,
            clueSubstring: data.dodgeChallenge.clueSubstring || '',
            question: data.dodgeChallenge.question,
            options: data.dodgeChallenge.options.slice(0, 4),
            correctIndex: Math.max(0, Math.min(3, Number(data.dodgeChallenge.correctIndex) || 0)),
            explanationVi: data.dodgeChallenge.explanationVi,
            focusWord: data.dodgeChallenge.focusWord,
            focusMeaningVi: data.dodgeChallenge.focusMeaningVi,
            exampleEn: data.dodgeChallenge.passage,
          },
        ],
      };

      onStartEncounter(aiEncounter);
    } catch (err: unknown) {
      setFarmError(
        err instanceof Error ? err.message : 'Lỗi kết nối khi tạo quái Farm AI.'
      );
    } finally {
      setGeneratingFarm(false);
    }
  };

  const xpPercent = Math.min(100, Math.round((hero.xp / hero.xpToNext) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Compact Hero Status Bar */}
      <section className="pixel-panel p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 border-2 border-amber-400/70 bg-[#121624] overflow-hidden shrink-0">
            <PixelImage
              src={ARTWORK.heroPortrait}
              alt="Hiệp sĩ Học giả"
              className="w-full h-full object-cover"
              fallbackLabel="LV"
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-pixel text-sm sm:text-base text-white">
                Hiệp Sĩ Học Giả
              </span>
              <span className="text-xs font-mono-num text-amber-400">
                Cấp {hero.level}
              </span>
              <span className="text-xs text-slate-400 font-mono-num">
                EXP {hero.xp}/{hero.xpToNext}
              </span>
            </div>
            <div className="w-52 sm:w-64 h-2 bg-[#121624] border border-[#343e5c] overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-transform duration-200 origin-left"
                style={{ transform: `scaleX(${xpPercent / 100})` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-mono-num">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Shield className="w-4 h-4 shrink-0" />
            <span>HP {stats.maxHp}</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <Swords className="w-4 h-4 shrink-0" />
            <span>ATK {stats.atk}</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Coins className="w-4 h-4 shrink-0" />
            <span>{hero.gold} Vàng</span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-400">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{hero.runeShards} Mảnh Cổ Ngữ</span>
          </div>
          <button
            type="button"
            onClick={onNavigateForge}
            className="text-xs font-sans font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-4 cursor-pointer"
          >
            Rèn đồ
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={hero.soundEnabled ? 'Tắt âm thanh 8-bit' : 'Bật âm thanh 8-bit'}
            className="p-2 border border-[#343e5c] bg-[#121624] hover:border-slate-400 text-slate-300 cursor-pointer"
          >
            {hero.soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </section>

      {/* Tutorial Dojo Banner */}
      <section className="pixel-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0 bg-[#121624] p-2 border border-amber-400/40">
            <MonsterSprite sprite="training_dummy" size={48} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>
                Sân Tập Chiến Đấu (Tutorial) ·{' '}
                {hero.tutorialCompleted ? 'Đã hoàn thành' : 'Khuyên chơi trước'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Thực hành đủ 4 cơ chế: Đòn Thường · Đòn Trọng Kích (chí mạng cao) · Parry đòn thường địch (15s) · Né Trọng Kích địch (10s · câu khó nhất màn).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onStartEncounter(TUTORIAL_ENCOUNTER)}
          className={`pixel-btn px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer ${
            hero.tutorialCompleted
              ? 'bg-[#262e47] hover:bg-[#323d5e] border-[#4b5b87] text-slate-100'
              : 'bg-amber-500 hover:bg-amber-400 text-[#121624]'
          }`}
        >
          {hero.tutorialCompleted ? 'Chơi lại Hướng dẫn' : 'Vào Màn Hướng Dẫn'}
        </button>
      </section>

      {/* Dynamic Shadow Mimic SRS Alert */}
      {shadowMimic && (
        <section className="pixel-panel-elevated p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-rose-500/50">
          <div className="flex items-center gap-4">
            <div className="shrink-0 bg-[#121624] p-2 border border-rose-500/40">
              <MonsterSprite sprite="shadow_mimic" size={56} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <Ghost className="w-4 h-4 shrink-0" />
                <span>Quái Bóng Tối SRS xuất hiện!</span>
              </div>
              <p className="text-sm text-slate-200">
                Có{' '}
                <strong className="font-mono-num text-amber-300">
                  {hero.cursedQueue.length}
                </strong>{' '}
                từ/câu trả lời sai đang tích tụ thành Mảnh Nguyền. Hạ gục nó để thanh tẩy và nhận thêm Mảnh Cổ Ngữ.
              </p>
              <div className="text-xs text-slate-400">
                Mục tiêu thanh tẩy:{' '}
                {hero.cursedQueue
                  .slice(0, 4)
                  .map((c) => c.word)
                  .join(' · ')}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartEncounter(shadowMimic)}
            className="pixel-btn px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Săn Quái Bóng Tối
          </button>
        </section>
      )}

      {/* Chapter Segmented Selector + AI Farm */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Chọn chương lộ trình"
          className="flex flex-wrap items-center gap-1.5 p-1 bg-[#1c2236] border border-[#343e5c]"
        >
          {CHAPTERS.map((ch) => {
            const active = ch.id === selectedChapter;
            return (
              <button
                key={ch.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => onSelectChapter(ch.id)}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-[#121624]'
                    : 'text-slate-300 hover:text-white hover:bg-[#262e47]'
                }`}
              >
                Chương {ch.order} · {ch.cefrLevel}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleSummonAiFarm}
          disabled={generatingFarm}
          className="pixel-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#262e47] hover:bg-[#323d5e] border-[#4b5b87] text-sky-300 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 shrink-0 ${generatingFarm ? 'animate-spin' : ''}`} />
          <span>
            {generatingFarm ? 'Đang triệu hồi quái AI...' : 'Triệu hồi quái Farm AI mới'}
          </span>
        </button>
      </div>

      {farmError && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-500/60 text-rose-200 text-sm flex items-center justify-between gap-4">
          <span>{farmError}</span>
          <button
            type="button"
            onClick={handleSummonAiFarm}
            className="text-xs font-bold underline whitespace-nowrap cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Biome Hero Banner */}
      <section className="pixel-panel relative overflow-hidden min-h-[200px] flex items-end">
        <PixelImage
          src={chapter.backdropUrl}
          alt={chapter.nameVi}
          className="absolute inset-0 w-full h-full object-cover"
          fallbackLabel={chapter.nameEn}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121624] via-[#121624]/65 to-[#121624]/25" />
        <div className="relative z-10 w-full p-5 sm:p-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs text-amber-400 font-mono-num">
              {chapter.nameEn} · Trình độ {chapter.cefrLevel} · 6 Màn chơi
            </div>
            <h2 className="font-pixel text-xl sm:text-2xl text-white">
              {chapter.nameVi}
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">{chapter.themeVi}</p>
          </div>
          <div className="text-xs text-slate-300 font-mono-num whitespace-nowrap">
            Tiến độ:{' '}
            {chapterNodes.filter((n) => hero.clearedNodeIds.includes(n.id)).length}/
            {chapterNodes.length} ải
          </div>
        </div>
      </section>

      {/* 6-Stage Roadmap Grid (3 columns x 2 rows on desktop) */}
      <section
        aria-label="Lộ trình 6 màn đánh quái và Boss"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      >
        {chapterNodes.map((node, index) => {
          const unlocked = isUnlocked(node);
          const cleared = hero.clearedNodeIds.includes(node.id);
          const totalQ = getTotalQuestionCount(node);
          const kindLabel =
            node.kind === 'boss'
              ? 'Boss Chương'
              : node.kind === 'elite'
                ? 'Quái Tinh Anh'
                : 'Quái Thường · Farm';
          const kindColor =
            node.kind === 'boss'
              ? 'text-rose-400'
              : node.kind === 'elite'
                ? 'text-amber-400'
                : 'text-emerald-400';

          return (
            <article
              key={node.id}
              className={`pixel-panel p-5 flex flex-col justify-between gap-4 transition-colors ${
                unlocked ? 'hover:border-amber-400/70' : 'opacity-65'
              }`}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={`font-semibold ${kindColor}`}>
                    Ải {index + 1}/6 · {kindLabel}
                  </span>
                  <span className="font-mono-num text-slate-400">
                    {node.cefrLevel}
                  </span>
                </div>

                <div className="h-32 bg-[#121624] border border-[#2c3654] flex items-center justify-center relative">
                  <MonsterSprite
                    sprite={node.sprite}
                    size={node.kind === 'boss' ? 104 : 88}
                    className={unlocked ? 'animate-sprite-bob' : 'grayscale opacity-50'}
                  />
                  {cleared && (
                    <div className="absolute top-2 right-2 text-emerald-400 flex items-center gap-1 text-[11px] font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đã vượt</span>
                    </div>
                  )}
                  {!unlocked && (
                    <div className="absolute inset-0 bg-[#121624]/68 flex flex-col items-center justify-center gap-1.5 text-slate-300 text-xs">
                      <Lock className="w-5 h-5" />
                      <span>Vượt ải trước để mở</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-pixel text-base text-white leading-snug">
                    {node.nameVi}
                  </h3>
                  <div className="text-xs text-slate-300 font-mono-num">
                    HP {node.maxHp} · ATK {node.atk} · {totalQ} câu hỏi (Đọc/Nghe/Viết)
                  </div>
                  <div className="text-xs text-slate-400 font-mono-num">
                    Parry {node.parryTimeSec ?? 15}s · Né {node.dodgeTimeSec ?? 10}s · +{node.rewardGold} Vàng · +{node.rewardShards} Mảnh
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!unlocked}
                onClick={() => onStartEncounter(node)}
                className={`pixel-btn w-full py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  node.kind === 'boss'
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : node.kind === 'elite'
                      ? 'bg-amber-500 hover:bg-amber-400 text-[#121624]'
                      : 'bg-[#262e47] hover:bg-[#323d5e] text-white border-[#4b5b87]'
                }`}
              >
                {node.kind === 'boss' ? (
                  <Flame className="w-4 h-4 shrink-0" />
                ) : (
                  <Swords className="w-4 h-4 shrink-0" />
                )}
                <span>
                  {!unlocked
                    ? 'Chưa mở khóa'
                    : cleared && node.isRepeatable
                      ? 'Đánh lại để Farm'
                      : node.kind === 'boss'
                        ? 'Khiêu chiến Boss'
                        : 'Vào trận'}
                </span>
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
};
