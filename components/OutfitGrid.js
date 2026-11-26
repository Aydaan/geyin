'use client';

import Image from 'next/image';
import { STYLES, getCategoryLabel } from '@/lib/i18n';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface-solid';

export default function OutfitGrid({
  tx,
  lang,
  items,
  activeWeather,
  recommendedOutfit,
  displayedOutfitExplanation,
  outfitAnimKey,
  lockedSlots,
  outfitStyleFilter,
  onStyleFilterChange,
  onRegenerateOutfit,
  onSaveCurrentOutfit,
  onToggleLockSlot,
  onRegenerateSingleSlot,
}) {
  const outfitSlots = recommendedOutfit
    ? [
        { key: 'top', label: tx.slotLabels.top, item: recommendedOutfit.top },
        { key: 'bottom', label: tx.slotLabels.bottom, item: recommendedOutfit.bottom },
        ...(recommendedOutfit.outerwear || lockedSlots.outerwear
          ? [{ key: 'outerwear', label: tx.slotLabels.outerwear, item: recommendedOutfit.outerwear }]
          : []),
        { key: 'shoes', label: tx.slotLabels.shoes, item: recommendedOutfit.shoes },
        ...(recommendedOutfit.accessory || lockedSlots.accessory
          ? [{ key: 'accessory', label: tx.slotLabels.accessory, item: recommendedOutfit.accessory }]
          : []),
      ]
    : [];

  return (
    <div className="space-y-4 pt-3 border-t-2 border-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{tx.todayOutfitTitle}</h3>
          {displayedOutfitExplanation || recommendedOutfit?.explanation ? (
            <p className="text-sm font-semibold text-brand-strong mt-0.5">
              {tx.whyOutfit} {displayedOutfitExplanation || recommendedOutfit.explanation}
            </p>
          ) : (
            <p className="text-sm font-medium text-muted">{tx.defaultOutfitSub}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="outfit-style-select" className="sr-only">
            {tx.styleLabel}
          </label>
          <select
            id="outfit-style-select"
            value={outfitStyleFilter}
            onChange={(e) => onStyleFilterChange(e.target.value)}
            className={`min-h-[40px] rounded-xl bg-surface-2 border-border text-text border-2 px-3.5 py-2 text-sm font-semibold ${FOCUS_RING}`}
          >
            <option value="all">{tx.allStyles}</option>
            {STYLES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label[lang] || st.label.az}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!activeWeather || items.length === 0}
            onClick={onRegenerateOutfit}
            className={`min-h-[40px] rounded-xl bg-surface-solid border-border text-text shadow-sm dark:shadow-none disabled:opacity-40 border-2 px-4 py-2 text-sm font-bold transition cursor-pointer active:scale-95 ${FOCUS_RING}`}
          >
            {tx.generateAnother}
          </button>

          <button
            type="button"
            disabled={!recommendedOutfit}
            onClick={onSaveCurrentOutfit}
            className={`min-h-[40px] rounded-xl disabled:opacity-40 border-2 px-4 py-2 text-sm font-bold transition cursor-pointer active:scale-95 bg-brand-soft hover:opacity-90 border-brand text-brand-strong ${FOCUS_RING}`}
          >
            {tx.saveOutfit}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-surface-2 border-border border-2 p-6 text-center text-sm font-semibold text-muted">
          {tx.emptyWardrobeOutfit}
        </div>
      ) : (
        <div
          key={outfitAnimKey}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 animate-outfit-in"
        >
          {outfitSlots.map((slot) => {
            const isLocked = !!lockedSlots[slot.key];
            return (
              <div
                key={slot.key}
                className={`rounded-xl bg-surface-2 border-border border-2 overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 ${
                  isLocked ? 'border-amber-500 ring-2 ring-amber-400/40' : ''
                }`}
              >
                <div className="px-3 py-2.5 border-b-2 border-border flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-text truncate">
                    {slot.label}
                  </span>
                  {slot.item && (
                    <button
                      type="button"
                      aria-pressed={isLocked}
                      onClick={() => onToggleLockSlot(slot.key)}
                      className={`min-h-[28px] min-w-[44px] text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer active:scale-95 ${FOCUS_RING} ${
                        isLocked
                          ? 'bg-amber-100 text-amber-950 border-2 border-amber-400 dark:bg-amber-400/20 dark:text-amber-200 dark:border-amber-400/50'
                          : 'text-muted hover:text-text hover:bg-surface-muted'
                      }`}
                    >
                      {isLocked ? tx.locked : tx.lock}
                    </button>
                  )}
                </div>

                {slot.item ? (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="relative w-full h-36">
                        <Image
                          src={slot.item.image_url}
                          alt={slot.item.sub_category || slot.label}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-sm font-bold truncate">
                          {slot.item.sub_category || getCategoryLabel(slot.item.category, lang)}
                        </p>
                        <p className="text-xs font-medium text-muted">
                          {slot.item.color ? `${slot.item.color} • ` : ''}
                          {tx.warmthShort} {slot.item.warmth_level}/5
                        </p>
                      </div>
                    </div>

                    {!isLocked && (
                      <div className="px-3 pb-3">
                        <button
                          type="button"
                          onClick={() => onRegenerateSingleSlot(slot.key)}
                          className={`w-full min-h-[38px] rounded-lg bg-surface-solid border-border shadow-sm dark:shadow-none border-2 py-1.5 px-3 text-xs sm:text-sm font-bold text-text transition cursor-pointer active:scale-95 ${FOCUS_RING}`}
                        >
                          {tx.swap}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-4 text-center text-xs font-semibold text-muted min-h-[160px]">
                    {tx.notFoundInSlot}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
