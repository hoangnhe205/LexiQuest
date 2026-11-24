import React, { useMemo, useState } from 'react';
import { BookOpen, Ghost, Loader2, Search, Volume2 } from 'lucide-react';
import { CHAPTERS } from '../data/gameData';
import type { HeroSaveState } from '../types/game';
import { getMasteryRank } from '../utils/stats';

interface LexiconViewProps {
  hero: HeroSaveState;
  onHuntShadowMimic: () => void;
}

const lexiconAudioCache = new Map<string, string>();

export const LexiconView: React.FC<LexiconViewProps> = ({
  hero,
  onHuntShadowMimic,
}) => {
  const [filter, setFilter] = useState<'all' | 'cursed' | 'gold'>('all');
  const [query, setQuery] = useState('');
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const cursedWordSet = useMemo(
    () => new Set(hero.cursedQueue.map((c) => c.word.toLowerCase())),
    [hero.cursedQueue]
  );

  const entries = useMemo(() => {
    const all = Object.values(hero.lexicon).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    return all.filter((entry) => {
      if (filter === 'cursed' && !cursedWordSet.has(entry.word.toLowerCase())) {
        return false;
      }
      if (filter === 'gold' && getMasteryRank(entry.correctCount, entry.wrongCount) !== 'gold') {
        return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          entry.word.toLowerCase().includes(q) ||
          entry.meaningVi.toLowerCase().includes(q) ||
          entry.monsterSourceVi.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [hero.lexicon, filter, query, cursedWordSet]);

  const handlePronounce = async (word: string, exampleEn: string) => {
    setAudioError(null);
    setPlayingWord(word);
    const spokenText = `${word}. ${exampleEn}`;
    try {
      let base64 = lexiconAudioCache.get(spokenText);
      if (!base64) {
        const res = await fetch('/api/audio/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: spokenText,
            voiceName: 'Kore',
            style: 'Clear English dictionary pronunciation followed by example sentence',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.audioBase64) {
          throw new Error(data.error || 'Không thể phát âm từ vựng.');
        }
        base64 = data.audioBase64 as string;
        lexiconAudioCache.set(spokenText, base64);
      }

      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audio.onended = () => setPlayingWord(null);
      audio.onerror = () => setPlayingWord(null);
      await audio.play();
    } catch (err: unknown) {
      setAudioError(err instanceof Error ? err.message : 'Lỗi phát âm TTS.');
      setPlayingWord(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-pixel text-xl sm:text-2xl text-white">
            Sổ Từ Vựng & Quái Vật (Bestiary Lexicon)
          </h1>
          <p className="text-sm text-slate-400">
            Mỗi quái vật bạn giao chiến đều mở khóa cụm từ vựng kèm ví dụ, phát âm AI và cấp độ thông thạo.
          </p>
        </div>

        {hero.cursedQueue.length > 0 && (
          <button
            type="button"
            onClick={onHuntShadowMimic}
            className="pixel-btn inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer"
          >
            <Ghost className="w-4 h-4" />
            <span>Ôn {hero.cursedQueue.length} từ sai với Quái Bóng Tối</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#1c2236] border border-[#343e5c]">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
              filter === 'all' ? 'bg-amber-500 text-[#121624]' : 'text-slate-300 hover:text-white'
            }`}
          >
            Tất cả ({Object.keys(hero.lexicon).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('cursed')}
            className={`px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
              filter === 'cursed' ? 'bg-rose-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Cần ôn SRS ({hero.cursedQueue.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('gold')}
            className={`px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
              filter === 'gold' ? 'bg-emerald-500 text-[#121624]' : 'text-slate-300 hover:text-white'
            }`}
          >
            Thông thạo Vàng
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm từ tiếng Anh, nghĩa hoặc quái..."
            className="w-full bg-[#1c2236] border border-[#343e5c] focus:border-amber-400 focus:outline-none pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {audioError && (
        <div className="p-3 bg-rose-950/60 border border-rose-500/60 text-rose-200 text-sm">
          {audioError}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="pixel-panel p-10 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="font-semibold text-slate-200">
            Chưa có mục từ vựng nào khớp bộ lọc
          </div>
          <p className="text-sm text-slate-400">
            Hãy tham gia các trận chiến trên Bản đồ để thu thập từ vựng vào Sổ Quái Vật.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const rank = getMasteryRank(entry.correctCount, entry.wrongCount);
            const isCursed = cursedWordSet.has(entry.word.toLowerCase());
            const chapterName =
              CHAPTERS.find((c) => c.id === entry.chapterId)?.nameEn ?? entry.chapterId;

            const rankLabel =
              rank === 'gold'
                ? 'Hạng Vàng'
                : rank === 'silver'
                  ? 'Hạng Bạc'
                  : 'Hạng Đồng';
            const rankColor =
              rank === 'gold'
                ? 'text-amber-400'
                : rank === 'silver'
                  ? 'text-sky-300'
                  : 'text-slate-400';

            return (
              <article
                key={entry.word}
                className={`pixel-panel p-5 space-y-3 ${
                  isCursed ? 'border-rose-500/60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h2 className="text-lg font-bold text-white">{entry.word}</h2>
                      {entry.phonetic && (
                        <span className="text-xs font-mono-num text-slate-400">
                          {entry.phonetic}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-emerald-300 font-medium">
                      {entry.meaningVi}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={playingWord === entry.word}
                    onClick={() => handlePronounce(entry.word, entry.exampleEn)}
                    aria-label={`Nghe phát âm ${entry.word}`}
                    className="p-2 bg-[#121624] border border-[#343e5c] hover:border-sky-400 text-sky-400 cursor-pointer disabled:opacity-60"
                  >
                    {playingWord === entry.word ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-sm text-slate-300 bg-[#121624] border border-[#2c3654] p-3">
                  &ldquo;{entry.exampleEn}&rdquo;
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num text-slate-400">
                  <span>
                    {entry.monsterSourceVi} · {chapterName}
                  </span>
                  <span className={isCursed ? 'text-rose-400 font-semibold' : rankColor}>
                    {isCursed ? 'Đang dính Mảnh Nguyền SRS' : rankLabel} · Đúng{' '}
                    {entry.correctCount}/{entry.correctCount + entry.wrongCount}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
