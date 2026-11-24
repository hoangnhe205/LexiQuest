import React from 'react';
import type { GameView } from '../types/game';

interface TopBarProps {
  activeView: GameView;
  onNavigate: (view: GameView) => void;
  onQuickBattle: () => void;
}

const NAV_ITEMS: { view: GameView; label: string }[] = [
  { view: 'MAP', label: 'Bản đồ' },
  { view: 'FORGE', label: 'Trang bị' },
  { view: 'LEXICON', label: 'Sổ từ vựng' },
  { view: 'ANALYTICS', label: 'Thống kê' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onNavigate,
  onQuickBattle,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#121624]/95 backdrop-blur border-b-2 border-[#343e5c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('MAP')}
          className="font-pixel text-lg sm:text-xl tracking-wide text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          LexiQuest
        </button>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Điều hướng chính"
          className="flex items-center gap-4 sm:gap-7 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
                className={`relative py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[2px] h-[2px] bg-amber-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onQuickBattle}
            className="pixel-btn px-4 py-2 bg-amber-500 hover:bg-amber-400 text-[#121624] text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            Vào trận nhanh
          </button>
        </div>
      </div>
    </header>
  );
};
