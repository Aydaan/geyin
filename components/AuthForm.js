'use client';

import TopControls from './TopControls';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-emerald-300 dark:focus-visible:ring-offset-zinc-900';

export default function AuthForm({
  isDark,
  tx,
  lang,
  themeMode,
  onSelectLang,
  onSelectTheme,
  isRegister,
  onToggleRegister,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  error,
  message,
  onDismissError,
  onDismissMessage,
  submitting,
  onSubmit,
}) {
  return (
    <main
      data-theme={isDark ? 'dark' : 'light'}
      className="auth-shell min-h-screen bg-stone-100 text-zinc-900 dark:bg-zinc-950 dark:text-white flex items-center justify-center p-6 transition-colors duration-300"
    >
      <div className="auth-card w-full max-w-md rounded-2xl bg-white border-stone-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none border p-6 space-y-6 animate-outfit-in">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Geyin</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {isRegister ? tx.registerSubtitle : tx.loginSubtitle}
            </p>
          </div>
          <TopControls
            lang={lang}
            onSelectLang={onSelectLang}
            themeMode={themeMode}
            onSelectTheme={onSelectTheme}
            tx={tx}
          />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-sm text-zinc-700 dark:text-zinc-300 mb-1.5">
              {tx.email}
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="name@example.com"
              className={`w-full rounded-xl bg-stone-50 border-stone-200 dark:bg-zinc-950 dark:border-zinc-800 border px-3.5 py-2.5 text-sm ${FOCUS_RING}`}
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm text-zinc-700 dark:text-zinc-300 mb-1.5">
              {tx.password}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder={tx.passwordHint}
              className={`w-full rounded-xl bg-stone-50 border-stone-200 dark:bg-zinc-950 dark:border-zinc-800 border px-3.5 py-2.5 text-sm ${FOCUS_RING}`}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border p-3 text-xs flex items-center justify-between gap-2 bg-red-50 border-red-300 text-red-800 dark:bg-red-500/15 dark:border-red-500/40 dark:text-red-300"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={onDismissError}
                aria-label={tx.closeNotification}
                className={`shrink-0 min-h-[28px] min-w-[28px] px-1.5 py-0.5 rounded hover:bg-red-500/20 cursor-pointer ${FOCUS_RING}`}
              >
                ✕
              </button>
            </div>
          )}

          {message && (
            <div
              role="status"
              className="rounded-xl border p-3 text-xs flex items-center justify-between gap-2 bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300"
            >
              <span>{message}</span>
              <button
                type="button"
                onClick={onDismissMessage}
                aria-label={tx.closeNotification}
                className={`shrink-0 min-h-[28px] min-w-[28px] px-1.5 py-0.5 rounded hover:bg-emerald-500/20 cursor-pointer ${FOCUS_RING}`}
              >
                ✕
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full min-h-[44px] rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 disabled:opacity-50 font-semibold py-2.5 text-sm transition cursor-pointer active:scale-[0.98] ${FOCUS_RING}`}
          >
            {submitting ? tx.pleaseWait : isRegister ? tx.signUp : tx.signIn}
          </button>
        </form>

        <div className="pt-2 border-t border-stone-200 dark:border-zinc-800 text-center">
          <button
            type="button"
            onClick={onToggleRegister}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 transition cursor-pointer ${FOCUS_RING}`}
          >
            {isRegister ? tx.haveAccount : tx.noAccount}
          </button>
        </div>
      </div>
    </main>
  );
}
