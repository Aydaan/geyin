'use client';

import TopControls from './TopControls';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface-solid';

export default function AuthForm({
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
    <main className="auth-shell min-h-screen text-text flex items-center justify-center p-6 transition-colors duration-300">
      <div className="auth-card w-full max-w-lg rounded-2xl bg-surface-solid border-border border-2 p-7 space-y-6 animate-outfit-in">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text">Geyin</h1>
            <p className="text-base font-medium text-muted mt-1.5">
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

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-bold text-text mb-2">
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
              className={`w-full rounded-xl bg-surface-2 border-border text-text border-2 px-4 py-3 text-base font-medium ${FOCUS_RING}`}
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-bold text-text mb-2">
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
              className={`w-full rounded-xl bg-surface-2 border-border text-text border-2 px-4 py-3 text-base font-medium ${FOCUS_RING}`}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border-2 p-3.5 text-sm font-semibold flex items-center justify-between gap-2 bg-red-50 border-red-400 text-red-900 dark:bg-red-500/15 dark:border-red-500/50 dark:text-red-200"
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
              className="rounded-xl border-2 p-3.5 text-sm font-semibold flex items-center justify-between gap-2 bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/50 dark:text-emerald-200"
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
            className={`w-full min-h-[48px] rounded-xl bg-brand hover:bg-brand-strong text-brand-fg disabled:opacity-50 font-bold py-3 text-base transition cursor-pointer active:scale-[0.98] ${FOCUS_RING}`}
          >
            {submitting ? tx.pleaseWait : isRegister ? tx.signUp : tx.signIn}
          </button>
        </form>

        <div className="pt-3 border-t-2 border-border text-center">
          <button
            type="button"
            onClick={onToggleRegister}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-sm font-semibold text-text hover:text-brand-strong hover:underline transition cursor-pointer ${FOCUS_RING}`}
          >
            {isRegister ? tx.haveAccount : tx.noAccount}
          </button>
        </div>
      </div>
    </main>
  );
}
