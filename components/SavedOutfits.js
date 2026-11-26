'use client';

import Image from 'next/image';
import { getCategoryLabel } from '@/lib/i18n';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface-solid';

const SAVED_DATE_LOCALES = {
  az: 'az-AZ',
  en: 'en-US',
  ru: 'ru-RU',
};

function formatSavedOutfitDate(value, lang = 'az') {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  try {
    const locale = SAVED_DATE_LOCALES[lang] || 'az-AZ';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(parsed);
  } catch {
    return String(value);
  }
}

export default function SavedOutfits({
  tx,
  lang,
  savedOutfits,
  onLoadSavedOutfit,
  onDeleteSavedOutfit,
}) {
  if (!savedOutfits || savedOutfits.length === 0) return null;

  return (
    <section className="app-panel rounded-2xl border p-6 space-y-4 animate-outfit-in">
      <h2 className="text-lg font-semibold">
        {tx.savedOutfitsTitle} ({savedOutfits.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {savedOutfits.map((saved) => (
          <div
            key={saved.id}
            className="rounded-xl bg-surface-2 border-border border p-4 space-y-3 transition hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-text font-medium">
                {saved.city} • {saved.temp}°C ({saved.condition}) —{' '}
                {formatSavedOutfitDate(saved.createdAt, lang)}
              </p>
              <div className="flex items-center gap-2">
                {saved.outfitData && (
                  <button
                    type="button"
                    onClick={() => onLoadSavedOutfit(saved)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs text-brand-strong hover:underline font-medium transition cursor-pointer ${FOCUS_RING}`}
                  >
                    {tx.loadBtn}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteSavedOutfit(saved.id)}
                  className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs text-muted hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer ${FOCUS_RING}`}
                >
                  {tx.deleteBtn}
                </button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {saved.pieces.map((p, idx) => (
                <div
                  key={`${saved.id}-${idx}`}
                  className="relative w-16 h-20 rounded-lg overflow-hidden border border-border shrink-0"
                >
                  <Image
                    src={p.image_url}
                    alt={p.sub_category || getCategoryLabel(p.category, lang)}
                    fill
                    unoptimized
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
