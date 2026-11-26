'use client';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-emerald-300 dark:focus-visible:ring-offset-zinc-900';

export default function TopControls({ lang, onSelectLang, themeMode, onSelectTheme, tx }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label={tx.languageGroupLabel}
        className="inline-flex items-center rounded-xl p-1 border text-xs bg-stone-200/70 border-stone-300 dark:bg-zinc-900 dark:border-zinc-800"
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
            className={`min-h-[32px] min-w-[36px] px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer active:scale-95 ${FOCUS_RING} ${
              lang === l.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label={tx.themeGroupLabel}
        className="inline-flex items-center rounded-xl p-1 border text-xs bg-stone-200/70 border-stone-300 dark:bg-zinc-900 dark:border-zinc-800"
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
            className={`min-h-[32px] px-2.5 py-1 rounded-lg font-medium transition cursor-pointer active:scale-95 ${FOCUS_RING} ${
              themeMode === m.id
                ? 'bg-white text-zinc-900 dark:text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
