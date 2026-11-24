import React, { useMemo, useState } from 'react';
import {
  Anvil,
  Check,
  Coins,
  Hammer,
  Shield,
  Sparkles,
  Swords,
} from 'lucide-react';
import { ARTWORK, GEAR_CATALOG } from '../data/gameData';
import type { GearItem, GearSlot, HeroSaveState } from '../types/game';
import { computeHeroStats, getGearStats, getUpgradeCost } from '../utils/stats';
import { GearPixelIcon, PixelImage } from './PixelSprites';

interface CampForgeViewProps {
  hero: HeroSaveState;
  onEquip: (item: GearItem) => void;
  onUpgrade: (itemId: string) => void;
  onCraft: (blueprint: GearItem) => void;
}

const SLOT_LABELS: Record<GearSlot, string> = {
  weapon: 'Vũ khí (Viết)',
  helm: 'Mũ / Kính (Nghe)',
  armor: 'Áo giáp (Đọc)',
  relic: 'Thánh vật (Hỗ trợ)',
};

const RARITY_LABELS: Record<GearItem['rarity'], { text: string; color: string }> = {
  common: { text: 'Thường', color: 'text-slate-300' },
  rare: { text: 'Hiếm', color: 'text-sky-400' },
  epic: { text: 'Sử Thi', color: 'text-amber-400' },
};

export const CampForgeView: React.FC<CampForgeViewProps> = ({
  hero,
  onEquip,
  onUpgrade,
  onCraft,
}) => {
  const [slotFilter, setSlotFilter] = useState<'all' | GearSlot>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const stats = useMemo(() => computeHeroStats(hero), [hero]);

  const filteredInventory = hero.inventory.filter(
    (item) => slotFilter === 'all' || item.slot === slotFilter
  );

  const craftableBlueprints = GEAR_CATALOG.filter(
    (g) =>
      g.craftCostGold !== undefined &&
      !hero.inventory.some((owned) => owned.id === g.id)
  );

  const notify = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-pixel text-xl sm:text-2xl text-white">
            Trang Bị & Lò Rèn Học Thuật
          </h1>
          <p className="text-sm text-slate-400">
            Mỗi món đồ farm được đều mang nội tại hỗ trợ trực tiếp kỹ năng Nghe, Đọc và Viết trong trận chiến.
          </p>
        </div>

        <div className="flex items-center gap-5 text-sm font-mono-num">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Coins className="w-4 h-4" />
            {hero.gold} Vàng
          </span>
          <span className="flex items-center gap-1.5 text-sky-400">
            <Sparkles className="w-4 h-4" />
            {hero.runeShards} Mảnh Cổ Ngữ
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-sm">
          {feedbackMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Hero Loadout & Active Learning Perks */}
        <aside className="lg:col-span-5 pixel-panel p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border-2 border-amber-400/70 bg-[#121624] overflow-hidden shrink-0">
              <PixelImage
                src={ARTWORK.heroPortrait}
                alt="Hiệp sĩ Học giả"
                className="w-full h-full object-cover"
                fallbackLabel="HERO"
              />
            </div>
            <div className="space-y-1">
              <div className="font-pixel text-base text-white">
                Hiệp Sĩ · Cấp {hero.level}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono-num">
                <span className="text-emerald-400 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> HP {stats.maxHp}
                </span>
                <span className="text-rose-400 flex items-center gap-1">
                  <Swords className="w-3.5 h-3.5" /> ATK {stats.atk}
                </span>
                <span className="text-sky-400">DEF {stats.def}</span>
              </div>
            </div>
          </div>

          {/* 4 Equipped Slots */}
          <div className="space-y-2.5 border-t border-[#343e5c] pt-4">
            <h2 className="text-xs font-semibold text-slate-400">
              4 Ô Trang bị đang mặc
            </h2>
            {(['weapon', 'helm', 'armor', 'relic'] as GearSlot[]).map((slot) => {
              const item = stats.equippedItems[slot];
              const scaled = item ? getGearStats(item) : null;
              return (
                <div
                  key={slot}
                  className="bg-[#121624] border border-[#343e5c] p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-[#1c2236] border border-[#343e5c] flex items-center justify-center shrink-0">
                      {item ? (
                        <GearPixelIcon slot={slot} rarity={item.rarity} size={32} />
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-400">
                        {SLOT_LABELS[slot]}
                      </div>
                      {item ? (
                        <>
                          <div className="text-sm font-semibold text-white truncate">
                            {item.nameVi}{' '}
                            {item.upgradeLevel > 0 && (
                              <span className="text-amber-400 font-mono-num">
                                +{item.upgradeLevel}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-300 truncate">
                            {item.perkLabelVi}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-slate-500">Chưa trang bị</div>
                      )}
                    </div>
                  </div>
                  {scaled && (
                    <div className="text-[11px] font-mono-num text-slate-400 text-right shrink-0">
                      {scaled.atk > 0 && <div>+{scaled.atk} ATK</div>}
                      {scaled.hp > 0 && <div>+{scaled.hp} HP</div>}
                      {scaled.def > 0 && <div>+{scaled.def} DEF</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Learning Perks Summary */}
          <div className="border-t border-[#343e5c] pt-4 space-y-2">
            <h2 className="text-xs font-semibold text-slate-400">
              Tổng hợp Nội tại Học tập đang kích hoạt
            </h2>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li>
                · Nghe chậm 0.75x miễn phí:{' '}
                <strong className={stats.perks.slowAudioFree ? 'text-sky-400' : 'text-slate-500'}>
                  {stats.perks.slowAudioFree ? 'Đã mở khóa' : 'Chưa kích hoạt'}
                </strong>
              </li>
              <li>
                · Soi manh mối Đọc hiểu:{' '}
                <strong
                  className={
                    stats.perks.highlightReadingClue ? 'text-emerald-400' : 'text-slate-500'
                  }
                >
                  {stats.perks.highlightReadingClue ? 'Đã mở khóa' : 'Chưa kích hoạt'}
                </strong>
              </li>
              <li>
                · Cộng sát thương Viết câu:{' '}
                <strong className="font-mono-num text-rose-400">
                  +{Math.round(stats.perks.writingCritBonus * 100)}%
                </strong>
              </li>
              <li>
                · Khiên giảm sát thương khi trả lời nhầm:{' '}
                <strong className="font-mono-num text-amber-400">
                  -{Math.round(stats.perks.mistakeShieldPercent * 100)}%
                </strong>
              </li>
              {stats.perks.comboHeal > 0 && (
                <li>
                  · Hồi máu chuỗi 2 câu đúng:{' '}
                  <strong className="font-mono-num text-emerald-400">
                    +{stats.perks.comboHeal} HP
                  </strong>
                </li>
              )}
            </ul>
          </div>
        </aside>

        {/* Right Column: Inventory + Forge Upgrade + Epic Crafting */}
        <div className="lg:col-span-7 space-y-6">
          {/* Inventory Section */}
          <section className="pixel-panel p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-pixel text-base text-white">
                Hành trang ({hero.inventory.length})
              </h2>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#121624] border border-[#343e5c]">
                {(['all', 'weapon', 'helm', 'armor', 'relic'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSlotFilter(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                      slotFilter === tab
                        ? 'bg-amber-500 text-[#121624]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'all'
                      ? 'Tất cả'
                      : tab === 'weapon'
                        ? 'Vũ khí'
                        : tab === 'helm'
                          ? 'Mũ'
                          : tab === 'armor'
                            ? 'Giáp'
                            : 'Thánh vật'}
                  </button>
                ))}
              </div>
            </div>

            {filteredInventory.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 bg-[#121624] border border-[#343e5c]">
                Chưa có trang bị thuộc loại này. Hãy farm quái thường hoặc đánh Tinh Anh để nhặt thêm đồ!
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInventory.map((item) => {
                  const isEquipped = hero.equipped[item.slot] === item.id;
                  const scaled = getGearStats(item);
                  const cost = getUpgradeCost(item);
                  const canUpgrade =
                    item.upgradeLevel < 5 &&
                    hero.gold >= cost.gold &&
                    hero.runeShards >= cost.shards;
                  const rarityInfo = RARITY_LABELS[item.rarity];

                  return (
                    <div
                      key={item.id}
                      className={`p-4 bg-[#121624] border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isEquipped ? 'border-amber-500/70' : 'border-[#343e5c]'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="p-1.5 bg-[#1c2236] border border-[#343e5c] shrink-0">
                          <GearPixelIcon
                            slot={item.slot}
                            rarity={item.rarity}
                            size={36}
                          />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 text-xs">
                            <span className={`font-semibold ${rarityInfo.color}`}>
                              {rarityInfo.text}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400">
                              {SLOT_LABELS[item.slot]}
                            </span>
                          </div>
                          <div className="font-semibold text-white">
                            {item.nameVi}{' '}
                            {item.upgradeLevel > 0 && (
                              <span className="text-amber-400 font-mono-num">
                                +{item.upgradeLevel}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-300">
                            {item.perkLabelVi}
                          </div>
                          <div className="text-xs font-mono-num text-slate-400">
                            {scaled.atk > 0 ? `+${scaled.atk} ATK ` : ''}
                            {scaled.hp > 0 ? `· +${scaled.hp} HP ` : ''}
                            {scaled.def > 0 ? `· +${scaled.def} DEF` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-col items-stretch gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isEquipped}
                          onClick={() => {
                            onEquip(item);
                            notify(`Đã trang bị ${item.nameVi}.`);
                          }}
                          className={`pixel-btn px-3.5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default ${
                            isEquipped
                              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                              : 'bg-amber-500 hover:bg-amber-400 text-[#121624]'
                          }`}
                        >
                          {isEquipped && <Check className="w-3.5 h-3.5" />}
                          <span>{isEquipped ? 'Đang mặc' : 'Trang bị'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={!canUpgrade}
                          onClick={() => {
                            onUpgrade(item.id);
                            notify(
                              `Cường hóa thành công ${item.nameVi} lên +${item.upgradeLevel + 1}!`
                            );
                          }}
                          className="pixel-btn px-3.5 py-2 bg-[#262e47] hover:bg-[#323d5e] border-[#4b5b87] text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                        >
                          <Hammer className="w-3.5 h-3.5 text-sky-400" />
                          <span className="font-mono-num">
                            {item.upgradeLevel >= 5
                              ? 'Tối đa (+5)'
                              : `Rèn +1 (${cost.gold}V · ${cost.shards}M)`}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Epic Forge Blueprints */}
          {craftableBlueprints.length > 0 && (
            <section className="pixel-panel p-5 space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Anvil className="w-5 h-5" />
                <h2 className="font-pixel text-base text-white">
                  Bản vẽ Chế tác Sử Thi
                </h2>
              </div>

              <div className="space-y-3">
                {craftableBlueprints.map((bp) => {
                  const goldCost = bp.craftCostGold ?? 150;
                  const shardCost = bp.craftCostShards ?? 5;
                  const canCraft = hero.gold >= goldCost && hero.runeShards >= shardCost;

                  return (
                    <div
                      key={bp.id}
                      className="p-4 bg-[#121624] border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-1.5 bg-[#1c2236] border border-amber-500/40 shrink-0">
                          <GearPixelIcon slot={bp.slot} rarity="epic" size={36} />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-amber-400 font-semibold">
                            Bản vẽ Sử Thi · {SLOT_LABELS[bp.slot]}
                          </div>
                          <div className="font-semibold text-white">{bp.nameVi}</div>
                          <div className="text-xs text-slate-300">{bp.perkLabelVi}</div>
                          <div className="text-xs font-mono-num text-slate-400">
                            +{bp.baseAtk} ATK · +{bp.baseHp} HP · +{bp.baseDef} DEF
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canCraft}
                        onClick={() => {
                          onCraft(bp);
                          notify(`Đã rèn thành công trang bị Sử Thi: ${bp.nameVi}!`);
                        }}
                        className="pixel-btn px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#121624] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-num"
                      >
                        Chế tác ({goldCost}V · {shardCost}M)
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
