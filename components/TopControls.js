'use client';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

export default function TopControls({ lang, onSelectLang, themeMode, onSelectTheme, tx }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div
        role="group"
        aria-label={tx.languageGroupLabel}
        className="inline-flex items-center rounded-xl p-1 border-2 text-sm bg-surface-muted border-border"
      >
        {[
          { id: 'az', label: 'AZ' },
          { id: 'en', label: 'EN' },
          { id: 'ru', label: 'RU' },
        ].map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={lang === l.id}
            onClick={() => onSelectLang(l.id)}
            className={`min-h-[34px] min-w-[40px] px-3 py-1 rounded-lg font-bold transition cursor-pointer active:scale-95 ${FOCUS_RING} ${
              lang === l.id
                ? 'bg-brand text-brand-fg shadow-xs'
                : 'text-text/80 hover:text-text'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label={tx.themeGroupLabel}
        className="inline-flex items-center rounded-xl p-1 border-2 text-sm bg-surface-muted border-border"
      >
        {[
          { id: 'auto', label: tx.auto },
          { id: 'light', label: tx.light },
          { id: 'dark', label: tx.dark },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={themeMode === m.id}
            onClick={() => onSelectTheme(m.id)}
            className={`min-h-[34px] px-3 py-1 rounded-lg font-bold transition cursor-pointer active:scale-95 ${FOCUS_RING} ${
              themeMode === m.id
                ? 'bg-brand text-brand-fg shadow-xs'
                : 'text-text/80 hover:text-text'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
