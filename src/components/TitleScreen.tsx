import React from 'react';
import {
  Flame,
  GraduationCap,
  ShieldAlert,
  Swords,
  Wind,
} from 'lucide-react';
import { ARTWORK } from '../data/gameData';
import { PixelImage } from './PixelSprites';

interface TitleScreenProps {
  hasProgress: boolean;
  tutorialCompleted: boolean;
  heroLevel: number;
  clearedCount: number;
  onStartTutorial: () => void;
  onStartMap: () => void;
  onResetAndStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasProgress,
  tutorialCompleted,
  heroLevel,
  clearedCount,
  onStartTutorial,
  onStartMap,
  onResetAndStart,
}) => {
  return (
    <div className="min-h-screen bg-[#121624] text-slate-100 flex flex-col justify-between">
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Hero Story & Primary CTA */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="text-xs font-medium text-amber-400 tracking-wide">
              RPG Pixel Học Tiếng Anh · 3 Bản đồ · 18 Ải chiến đấu · Nghe – Đọc – Viết
            </div>

            <h1
              className="font-pixel text-3xl sm:text-5xl text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Chinh phục Tiếng Anh qua từng đòn đánh Pixel
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              Lựa chọn chiến thuật giữa Đòn Đánh Thường và Đòn Trọng Kích Chí Mạng, căn chuẩn
              thời gian Parry đòn thường của kẻ địch và né đòn Trọng Kích bằng câu hỏi khó nhất màn
              để farm trang bị học thuật và hạ gục Boss.
            </p>

            {/* 4 Core Combat Mechanics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="pixel-panel p-4 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Swords className="w-4 h-4 shrink-0" />
                  <span>Đánh Thường & Trọng Kích</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Trọng Kích yêu cầu câu hỏi khó hơn (Viết AI / Đọc-Nghe nâng cao) để gây 1.75x sát thương và tăng tỉ lệ Chí Mạng.
                </p>
              </div>

              <div className="pixel-panel p-4 space-y-1">
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Parry Đòn Thường (Giới hạn thời gian)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Khi kẻ địch đánh thường, trả lời đúng trong thời gian đếm ngược để chặn 100% sát thương và phản công.
                </p>
              </div>

              <div className="pixel-panel p-4 space-y-1">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <Wind className="w-4 h-4 shrink-0" />
                  <span>Né Trọng Kích (Thời gian ngắn hơn)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Trọng Kích địch không thể Parry — buộc phải giải câu khó nhất màn trong thời gian ngắn hơn để né hoàn hảo.
                </p>
              </div>

              <div className="pixel-panel p-4 space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <Flame className="w-4 h-4 shrink-0" />
                  <span>18 Ải · Farm Đồ & Quái Bóng Tối SRS</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  6 ải mỗi vùng đất (Quái thường, Tinh Anh, Boss) kèm cơ chế săn lại từ sai SRS và rèn trang bị.
                </p>
              </div>
            </div>

            {/* Primary Action Zone */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {!tutorialCompleted ? (
                <>
                  <button
                    type="button"
                    onClick={onStartTutorial}
                    className="pixel-btn inline-flex items-center gap-2.5 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-[#121624] font-bold text-base cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <GraduationCap className="w-5 h-5 shrink-0" />
                    <span>Vào Màn Hướng Dẫn (Tutorial)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onStartMap}
                    className="pixel-btn px-5 py-3.5 bg-[#262e47] hover:bg-[#323d5e] border-[#4b5b87] text-white text-sm font-semibold cursor-pointer"
                  >
                    Vào thẳng Bản đồ
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onStartMap}
                    className="pixel-btn inline-flex items-center gap-2.5 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-[#121624] font-bold text-base cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <Swords className="w-5 h-5 shrink-0" />
                    <span>
                      {hasProgress
                        ? `Tiếp tục hành trình (Cấp ${heroLevel})`
                        : 'Vào Bản đồ chiến đấu'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onStartTutorial}
                    className="px-4 py-3 text-sm font-medium text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                  >
                    Chơi lại Hướng dẫn
                  </button>
                  {hasProgress && (
                    <button
                      type="button"
                      onClick={onResetAndStart}
                      className="px-3 py-3 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      Chơi lại từ đầu
                    </button>
                  )}
                </>
              )}
            </div>

            {hasProgress && (
              <p className="text-xs text-slate-400 font-mono-num">
                Tiến trình đã lưu tự động · Cấp {heroLevel} · Đã vượt {clearedCount}/18 ải
              </p>
            )}
          </div>

          {/* Right Pixel-Art Showcase Stage */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="pixel-panel relative overflow-hidden flex-1 min-h-[360px] flex flex-col justify-end">
              <PixelImage
                src={ARTWORK.citadelBackdrop}
                alt="Thành trì Hắc Diện Thạch LexiQuest"
                className="absolute inset-0 w-full h-full object-cover"
                fallbackLabel="Obsidian Citadel"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121624] via-[#121624]/55 to-transparent" />

              <div className="relative z-10 p-6 space-y-5">
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-sky-400/70 bg-[#121624] overflow-hidden shadow-[0_6px_0_rgba(7,9,16,0.85)] animate-sprite-bob">
                      <PixelImage
                        src={ARTWORK.heroPortrait}
                        alt="Hiệp sĩ Học giả"
                        className="w-full h-full object-cover"
                        fallbackLabel="HERO"
                      />
                    </div>
                    <div className="text-xs font-pixel text-sky-300">Hiệp Sĩ Học Giả</div>
                  </div>

                  <div className="font-pixel text-amber-400 text-sm pb-10">VS</div>

                  <div className="space-y-2 text-right">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-amber-500/70 bg-[#121624] overflow-hidden shadow-[0_6px_0_rgba(7,9,16,0.85)] animate-sprite-bob">
                      <PixelImage
                        src={ARTWORK.bossDragon}
                        alt="Rồng Cổ Ngữ Malakor"
                        className="w-full h-full object-cover"
                        fallbackLabel="BOSS"
                      />
                    </div>
                    <div className="text-xs font-pixel text-amber-400">Rồng Malakor</div>
                  </div>
                </div>

                <div className="border-t border-slate-700/80 pt-4 flex items-center justify-between text-xs text-slate-300 font-mono-num">
                  <span>3 Vùng đất · 18 Ải · 150+ Câu hỏi</span>
                  <span>Tutorial tương tác</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#262e47] py-4 px-6 text-center text-xs text-slate-500">
        LexiQuest — Đồ án ứng dụng RPG Pixel học tiếng Anh theo lộ trình chiến đấu
      </footer>
    </div>
  );
};
