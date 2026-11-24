import React, { useState } from 'react';
import { ARTWORK } from '../data/gameData';
import type { GearSlot, SpriteType } from '../types/game';

interface PixelImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const PixelImage: React.FC<PixelImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel = 'LexiQuest',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#1c2236] via-[#262e47] to-[#121624] text-slate-300 font-pixel text-xs p-4 text-center ${className}`}
      >
        <span>{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`pixel-art ${className}`}
    />
  );
};

interface MonsterSpriteProps {
  sprite: SpriteType;
  size?: number;
  className?: string;
}

export const MonsterSprite: React.FC<MonsterSpriteProps> = ({
  sprite,
  size = 112,
  className = '',
}) => {
  if (sprite === 'obsidian_dragon') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`overflow-hidden border-2 border-amber-500/60 bg-[#121624] shadow-[0_6px_0_rgba(7,9,16,0.85)] ${className}`}
      >
        <PixelImage
          src={ARTWORK.bossDragon}
          alt="Rồng Cổ Ngữ Malakor"
          className="w-full h-full object-cover"
          fallbackLabel="MALAKOR"
        />
      </div>
    );
  }

  // Hand-authored crisp 16x16 pixel-art SVG sprites for every monster archetype
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={`pixel-art drop-shadow-[0_6px_0_rgba(7,9,16,0.75)] ${className}`}
      aria-label={sprite}
    >
      {sprite === 'slime' && (
        <>
          <rect x="4" y="4" width="8" height="1" fill="#065f46" />
          <rect x="3" y="5" width="10" height="1" fill="#10b981" />
          <rect x="2" y="6" width="12" height="6" fill="#10b981" />
          <rect x="3" y="12" width="10" height="2" fill="#059669" />
          <rect x="4" y="6" width="2" height="2" fill="#6ee7b7" />
          <rect x="5" y="8" width="2" height="2" fill="#0f172a" />
          <rect x="10" y="8" width="2" height="2" fill="#0f172a" />
          <rect x="5" y="8" width="1" height="1" fill="#ffffff" />
          <rect x="10" y="8" width="1" height="1" fill="#ffffff" />
          <rect x="7" y="10" width="3" height="1" fill="#064e3b" />
        </>
      )}

      {sprite === 'slime_king' && (
        <>
          {/* Crown */}
          <rect x="4" y="1" width="1" height="3" fill="#f59e0b" />
          <rect x="7" y="0" width="2" height="4" fill="#fbbf24" />
          <rect x="11" y="1" width="1" height="3" fill="#f59e0b" />
          <rect x="4" y="3" width="8" height="2" fill="#d97706" />
          <rect x="7" y="3" width="2" height="1" fill="#f43f5e" />
          {/* Royal Slime Body */}
          <rect x="2" y="5" width="12" height="8" fill="#10b981" />
          <rect x="1" y="7" width="14" height="6" fill="#059669" />
          <rect x="3" y="6" width="10" height="5" fill="#34d399" />
          <rect x="4" y="8" width="2" height="2" fill="#0f172a" />
          <rect x="10" y="8" width="2" height="2" fill="#0f172a" />
          <rect x="4" y="8" width="1" height="1" fill="#fef08a" />
          <rect x="10" y="8" width="1" height="1" fill="#fef08a" />
          <rect x="6" y="11" width="4" height="1" fill="#064e3b" />
          <rect x="2" y="13" width="12" height="2" fill="#065f46" />
        </>
      )}

      {sprite === 'goblin' && (
        <>
          <rect x="1" y="5" width="3" height="2" fill="#65a30d" />
          <rect x="12" y="5" width="3" height="2" fill="#65a30d" />
          <rect x="4" y="3" width="8" height="6" fill="#84cc16" />
          <rect x="5" y="5" width="2" height="2" fill="#0f172a" />
          <rect x="9" y="5" width="2" height="2" fill="#0f172a" />
          <rect x="5" y="5" width="1" height="1" fill="#f59e0b" />
          <rect x="9" y="5" width="1" height="1" fill="#f59e0b" />
          <rect x="6" y="8" width="4" height="1" fill="#365314" />
          {/* Vest & Quill */}
          <rect x="4" y="9" width="8" height="5" fill="#78350f" />
          <rect x="6" y="9" width="4" height="4" fill="#d97706" />
          <rect x="13" y="4" width="1" height="7" fill="#fef3c7" />
          <rect x="12" y="3" width="2" height="2" fill="#f59e0b" />
          <rect x="5" y="14" width="2" height="2" fill="#4d7c0f" />
          <rect x="9" y="14" width="2" height="2" fill="#4d7c0f" />
        </>
      )}

      {sprite === 'guardian' && (
        <>
          <rect x="4" y="1" width="8" height="13" fill="#475569" />
          <rect x="3" y="3" width="10" height="10" fill="#64748b" />
          <rect x="5" y="2" width="6" height="11" fill="#334155" />
          {/* Glowing Cyan Runes */}
          <rect x="6" y="4" width="4" height="1" fill="#38bdf8" />
          <rect x="7" y="4" width="2" height="5" fill="#38bdf8" />
          <rect x="5" y="6" width="2" height="2" fill="#7dd3fc" />
          <rect x="9" y="6" width="2" height="2" fill="#7dd3fc" />
          <rect x="6" y="10" width="4" height="1" fill="#38bdf8" />
          {/* Moss base */}
          <rect x="2" y="13" width="12" height="2" fill="#1e293b" />
          <rect x="3" y="12" width="3" height="2" fill="#10b981" />
          <rect x="10" y="12" width="3" height="2" fill="#059669" />
        </>
      )}

      {sprite === 'clock_owl' && (
        <>
          <rect x="4" y="2" width="2" height="2" fill="#b45309" />
          <rect x="10" y="2" width="2" height="2" fill="#b45309" />
          <rect x="3" y="4" width="10" height="9" fill="#d97706" />
          <rect x="4" y="5" width="8" height="7" fill="#92400e" />
          {/* Brass Clock Eyes */}
          <rect x="4" y="5" width="3" height="3" fill="#fef3c7" />
          <rect x="9" y="5" width="3" height="3" fill="#fef3c7" />
          <rect x="5" y="6" width="1" height="1" fill="#0f172a" />
          <rect x="10" y="6" width="1" height="1" fill="#0f172a" />
          <rect x="7" y="8" width="2" height="2" fill="#fbbf24" />
          {/* Wings */}
          <rect x="1" y="6" width="2" height="5" fill="#78350f" />
          <rect x="13" y="6" width="2" height="5" fill="#78350f" />
          <rect x="5" y="13" width="2" height="2" fill="#fbbf24" />
          <rect x="9" y="13" width="2" height="2" fill="#fbbf24" />
        </>
      )}

      {sprite === 'golem' && (
        <>
          <rect x="5" y="2" width="6" height="4" fill="#94a3b8" />
          <rect x="6" y="3" width="1" height="2" fill="#f59e0b" />
          <rect x="9" y="3" width="1" height="2" fill="#f59e0b" />
          <rect x="2" y="6" width="12" height="6" fill="#64748b" />
          <rect x="4" y="7" width="8" height="4" fill="#475569" />
          <rect x="7" y="8" width="2" height="2" fill="#fbbf24" />
          <rect x="1" y="7" width="2" height="5" fill="#94a3b8" />
          <rect x="13" y="7" width="2" height="5" fill="#94a3b8" />
          <rect x="4" y="12" width="3" height="3" fill="#334155" />
          <rect x="9" y="12" width="3" height="3" fill="#334155" />
        </>
      )}

      {sprite === 'warden' && (
        <>
          <rect x="4" y="1" width="8" height="3" fill="#b45309" />
          <rect x="3" y="4" width="10" height="4" fill="#334155" />
          <rect x="5" y="5" width="2" height="2" fill="#38bdf8" />
          <rect x="9" y="5" width="2" height="2" fill="#38bdf8" />
          <rect x="2" y="8" width="12" height="5" fill="#475569" />
          <rect x="6" y="9" width="4" height="3" fill="#f59e0b" />
          <rect x="7" y="10" width="2" height="1" fill="#0f172a" />
          <rect x="4" y="13" width="3" height="2" fill="#1e293b" />
          <rect x="9" y="13" width="3" height="2" fill="#1e293b" />
        </>
      )}

      {sprite === 'chronos' && (
        <>
          {/* Giant Clock Halo */}
          <rect x="4" y="0" width="8" height="1" fill="#fbbf24" />
          <rect x="2" y="1" width="12" height="1" fill="#f59e0b" />
          <rect x="1" y="2" width="14" height="10" fill="#78350f" />
          <rect x="3" y="3" width="10" height="8" fill="#1e293b" />
          <rect x="4" y="4" width="8" height="6" fill="#fef3c7" />
          {/* Clock Hands */}
          <rect x="7" y="4" width="2" height="4" fill="#0f172a" />
          <rect x="7" y="7" width="4" height="1" fill="#dc2626" />
          {/* Armored Shoulders */}
          <rect x="2" y="11" width="12" height="4" fill="#d97706" />
          <rect x="5" y="12" width="6" height="3" fill="#475569" />
        </>
      )}

      {sprite === 'wraith' && (
        <>
          <rect x="5" y="1" width="6" height="2" fill="#6366f1" />
          <rect x="3" y="3" width="10" height="8" fill="#312e81" />
          <rect x="4" y="4" width="8" height="5" fill="#1e1b4b" />
          <rect x="5" y="5" width="2" height="2" fill="#f43f5e" />
          <rect x="9" y="5" width="2" height="2" fill="#f43f5e" />
          <rect x="3" y="11" width="2" height="3" fill="#4338ca" />
          <rect x="7" y="11" width="2" height="4" fill="#4338ca" />
          <rect x="11" y="11" width="2" height="3" fill="#4338ca" />
        </>
      )}

      {sprite === 'librarian' && (
        <>
          <rect x="4" y="1" width="8" height="2" fill="#9f1239" />
          <rect x="3" y="3" width="10" height="5" fill="#1e293b" />
          <rect x="5" y="4" width="2" height="2" fill="#fbbf24" />
          <rect x="9" y="4" width="2" height="2" fill="#fbbf24" />
          <rect x="2" y="8" width="12" height="6" fill="#881337" />
          <rect x="6" y="8" width="4" height="6" fill="#0f172a" />
          {/* Floating Spellbook */}
          <rect x="12" y="5" width="3" height="4" fill="#f59e0b" />
          <rect x="13" y="6" width="1" height="2" fill="#fef3c7" />
        </>
      )}

      {sprite === 'training_dummy' && (
        <>
          {/* Wooden Post & Crossbar */}
          <rect x="7" y="1" width="2" height="14" fill="#78350f" />
          <rect x="2" y="6" width="12" height="2" fill="#92400e" />
          {/* Straw Head & Helmet */}
          <rect x="5" y="2" width="6" height="4" fill="#eab308" />
          <rect x="5" y="1" width="6" height="2" fill="#64748b" />
          <rect x="6" y="4" width="1" height="1" fill="#0f172a" />
          <rect x="9" y="4" width="1" height="1" fill="#0f172a" />
          {/* Burlap Torso + Bullseye Target */}
          <rect x="4" y="6" width="8" height="6" fill="#ca8a04" />
          <rect x="6" y="7" width="4" height="4" fill="#f8fafc" />
          <rect x="7" y="8" width="2" height="2" fill="#dc2626" />
          {/* Base Stand */}
          <rect x="4" y="14" width="8" height="2" fill="#78350f" />
        </>
      )}

      {sprite === 'wolf' && (
        <>
          <rect x="3" y="2" width="2" height="2" fill="#475569" />
          <rect x="8" y="2" width="2" height="2" fill="#475569" />
          <rect x="2" y="4" width="9" height="5" fill="#64748b" />
          <rect x="1" y="6" width="4" height="2" fill="#94a3b8" />
          <rect x="4" y="5" width="2" height="2" fill="#f59e0b" />
          <rect x="7" y="5" width="2" height="2" fill="#f59e0b" />
          <rect x="5" y="8" width="8" height="4" fill="#475569" />
          <rect x="12" y="6" width="3" height="3" fill="#94a3b8" />
          <rect x="5" y="12" width="2" height="3" fill="#334155" />
          <rect x="10" y="12" width="2" height="3" fill="#334155" />
        </>
      )}

      {sprite === 'clock_spider' && (
        <>
          <rect x="5" y="4" width="6" height="6" fill="#b45309" />
          <rect x="6" y="5" width="4" height="4" fill="#fbbf24" />
          <rect x="7" y="6" width="2" height="2" fill="#0f172a" />
          <rect x="6" y="9" width="1" height="1" fill="#38bdf8" />
          <rect x="9" y="9" width="1" height="1" fill="#38bdf8" />
          {/* Brass Legs */}
          <rect x="2" y="5" width="3" height="1" fill="#92400e" />
          <rect x="1" y="6" width="2" height="4" fill="#78350f" />
          <rect x="11" y="5" width="3" height="1" fill="#92400e" />
          <rect x="13" y="6" width="2" height="4" fill="#78350f" />
          <rect x="3" y="10" width="2" height="4" fill="#78350f" />
          <rect x="11" y="10" width="2" height="4" fill="#78350f" />
        </>
      )}

      {sprite === 'shadow_sentinel' && (
        <>
          <rect x="5" y="1" width="6" height="3" fill="#334155" />
          <rect x="4" y="4" width="8" height="4" fill="#0f172a" />
          <rect x="5" y="5" width="2" height="1" fill="#f43f5e" />
          <rect x="9" y="5" width="2" height="1" fill="#f43f5e" />
          <rect x="3" y="8" width="10" height="6" fill="#1e293b" />
          <rect x="6" y="9" width="4" height="4" fill="#7f1d1d" />
          <rect x="1" y="6" width="2" height="8" fill="#94a3b8" />
          <rect x="13" y="7" width="2" height="6" fill="#475569" />
        </>
      )}

      {(sprite === 'shadow_mimic' || sprite === 'ink_knight') && (
        <>
          {/* Cursed Shadow Chest / Mimic */}
          <rect x="2" y="3" width="12" height="4" fill="#4c1d95" />
          <rect x="3" y="4" width="10" height="2" fill="#7c3aed" />
          <rect x="1" y="7" width="14" height="2" fill="#0f172a" />
          {/* Teeth */}
          <rect x="3" y="7" width="2" height="1" fill="#f8fafc" />
          <rect x="7" y="7" width="2" height="1" fill="#f8fafc" />
          <rect x="11" y="7" width="2" height="1" fill="#f8fafc" />
          {/* Glowing Eyes */}
          <rect x="4" y="4" width="2" height="2" fill="#f43f5e" />
          <rect x="10" y="4" width="2" height="2" fill="#f43f5e" />
          {/* Lower Base */}
          <rect x="2" y="9" width="12" height="5" fill="#3b0764" />
          <rect x="6" y="10" width="4" height="2" fill="#f59e0b" />
        </>
      )}
    </svg>
  );
};

export const GearPixelIcon: React.FC<{ slot: GearSlot; rarity: string; size?: number }> = ({
  slot,
  rarity,
  size = 36,
}) => {
  const accent =
    rarity === 'epic' ? '#f59e0b' : rarity === 'rare' ? '#38bdf8' : '#94a3b8';
  const secondary =
    rarity === 'epic' ? '#fef08a' : rarity === 'rare' ? '#bae6fd' : '#e2e8f0';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className="pixel-art shrink-0"
      aria-hidden="true"
    >
      {slot === 'weapon' && (
        <>
          <rect x="11" y="2" width="3" height="3" fill={secondary} />
          <rect x="9" y="4" width="3" height="3" fill={accent} />
          <rect x="7" y="6" width="3" height="3" fill={secondary} />
          <rect x="5" y="8" width="3" height="3" fill={accent} />
          <rect x="3" y="9" width="5" height="2" fill="#d97706" />
          <rect x="2" y="12" width="3" height="2" fill="#78350f" />
        </>
      )}
      {slot === 'helm' && (
        <>
          <rect x="4" y="3" width="8" height="2" fill={accent} />
          <rect x="3" y="5" width="10" height="6" fill={secondary} />
          <rect x="4" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="9" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="5" y="11" width="6" height="2" fill={accent} />
        </>
      )}
      {slot === 'armor' && (
        <>
          <rect x="3" y="3" width="10" height="3" fill={accent} />
          <rect x="4" y="6" width="8" height="7" fill={secondary} />
          <rect x="6" y="7" width="4" height="4" fill={accent} />
          <rect x="2" y="5" width="2" height="4" fill={accent} />
          <rect x="12" y="5" width="2" height="4" fill={accent} />
        </>
      )}
      {slot === 'relic' && (
        <>
          <rect x="6" y="2" width="4" height="2" fill={accent} />
          <rect x="4" y="4" width="8" height="8" fill={secondary} />
          <rect x="6" y="6" width="4" height="4" fill={accent} />
          <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
          <rect x="6" y="12" width="4" height="2" fill={accent} />
        </>
      )}
    </svg>
  );
};
