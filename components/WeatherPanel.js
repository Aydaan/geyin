'use client';

import { WORLD_CITIES, getCityDisplayName } from '@/lib/cities';
import { DEMO_PRESETS } from '@/lib/weather';
import OutfitGrid from './OutfitGrid';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface-solid';

export default function WeatherPanel({
  tx,
  lang,
  locationSource,
  locationMode,
  loadingWeather,
  demoPresetId,
  activeWeather,
  selectedCity,
  customCityOption,
  citySearchQuery,
  searchingCity,
  onDetectGpsLocation,
  onCitySelect,
  onCitySearchQueryChange,
  onWorldCitySearch,
  onSelectDemoPreset,
  items,
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
  return (
    <section className="app-panel rounded-2xl border p-6 space-y-6 transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-muted">
            {tx.liveWeatherTitle} • {locationSource} (
            {tx.locationModeLabels?.[locationMode] || tx.locationModeLabels?.manual})
          </span>
          <h2 className="text-xl font-bold mt-1">
            {loadingWeather && demoPresetId === 'live'
              ? tx.checkingWeather
              : activeWeather
              ? `${activeWeather.locationName}: ${activeWeather.temp}°C (${activeWeather.conditionText})`
              : tx.chooseLocation}
          </h2>
          {activeWeather && (
            <p className="text-xs text-muted mt-1">
              {tx.feelsLike}: {activeWeather.apparent}°C • {tx.dailyRange}:{' '}
              {activeWeather.minTemp}°C / {activeWeather.maxTemp}°C • {tx.wind}:{' '}
              {Math.round(activeWeather.wind)} {tx.kmh}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDetectGpsLocation}
            className={`min-h-[38px] rounded-xl bg-brand hover:bg-brand-strong text-brand-fg px-3.5 py-2 text-xs font-semibold transition cursor-pointer active:scale-95 ${FOCUS_RING}`}
          >
            {tx.gpsBtn}
          </button>

          <label htmlFor="city-select" className="sr-only">
            {tx.chooseLocation}
          </label>
          <select
            id="city-select"
            value={selectedCity}
            onChange={(e) => onCitySelect(e.target.value)}
            className={`rounded-xl bg-surface-2 border-border text-text border px-3 py-2 text-xs ${FOCUS_RING}`}
          >
            {customCityOption && (
              <option value={customCityOption.value}>{customCityOption.label}</option>
            )}
            {WORLD_CITIES.map((city) => (
              <option key={`${city.name}-${city.code}`} value={city.name}>
                {getCityDisplayName(city, lang)} ({city.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={onWorldCitySearch} className="flex flex-wrap gap-2">
        <label htmlFor="city-search-input" className="sr-only">
          {tx.searchCityPlaceholder}
        </label>
        <input
          id="city-search-input"
          type="text"
          value={citySearchQuery}
          onChange={(e) => onCitySearchQueryChange(e.target.value)}
          placeholder={tx.searchCityPlaceholder}
          className={`flex-1 min-w-[210px] rounded-xl bg-surface-2 border-border text-text border px-3.5 py-2 text-xs ${FOCUS_RING}`}
        />
        <button
          type="submit"
          disabled={searchingCity}
          className={`min-h-[38px] rounded-xl bg-surface-solid border-border text-text shadow-sm dark:shadow-none border px-4 py-2 text-xs font-medium transition cursor-pointer active:scale-95 ${FOCUS_RING}`}
        >
          {searchingCity ? tx.searching : tx.searchBtn}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] text-muted mr-1">{tx.demoMode}</span>
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={demoPresetId === preset.id}
            onClick={() => onSelectDemoPreset(preset.id)}
            className={`min-h-[32px] rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer active:scale-95 border ${FOCUS_RING} ${
              demoPresetId === preset.id
                ? 'bg-brand-soft text-brand-strong border-brand/40'
                : 'bg-surface-solid text-muted hover:text-text border-border'
            }`}
          >
            {preset.label[lang] || preset.label.az}
          </button>
        ))}
      </div>

      {activeWeather && (
        <div className="space-y-2.5">
          <div className="rounded-xl bg-surface-2 border-border border p-4">
            <p className="text-xs font-semibold text-muted mb-1">
              {tx.generalAdviceTitle}
            </p>
            <p className="text-sm leading-relaxed">{activeWeather.generalAdvice}</p>
          </div>

          {activeWeather.eveningAlert && (
            <div className="rounded-xl border px-4 py-3 text-xs font-medium bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/35 dark:text-amber-300">
              {activeWeather.eveningAlert}
            </div>
          )}
        </div>
      )}

      <OutfitGrid
        tx={tx}
        lang={lang}
        items={items}
        activeWeather={activeWeather}
        recommendedOutfit={recommendedOutfit}
        displayedOutfitExplanation={displayedOutfitExplanation}
        outfitAnimKey={outfitAnimKey}
        lockedSlots={lockedSlots}
        outfitStyleFilter={outfitStyleFilter}
        onStyleFilterChange={onStyleFilterChange}
        onRegenerateOutfit={onRegenerateOutfit}
        onSaveCurrentOutfit={onSaveCurrentOutfit}
        onToggleLockSlot={onToggleLockSlot}
        onRegenerateSingleSlot={onRegenerateSingleSlot}
      />
    </section>
  );
}
