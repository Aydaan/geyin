import { getText } from '@/lib/i18n';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export class WeatherApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'WeatherApiError';
    this.status = status;
  }
}

export function isAbortError(err) {
  return err?.name === 'AbortError';
}

async function fetchJson(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new WeatherApiError(`Open-Meteo request failed with status ${res.status}`, res.status);
  }
  return res.json();
}

export const DEMO_PRESETS = [
  { id: 'live', label: { az: 'Canlı Hava', en: 'Live Weather', ru: 'Живая погода' } },
  {
    id: 'sunny',
    label: { az: 'Günəşli 25°C', en: 'Sunny 25°C', ru: 'Солнечно 25°C' },
    temp: 25,
    apparent: 26,
    wind: 10,
    code: 0,
    minTemp: 19,
    maxTemp: 26,
    rainProb: 5,
  },
  {
    id: 'rainy',
    label: { az: 'Yağışlı 10°C', en: 'Rainy 10°C', ru: 'Дождь 10°C' },
    temp: 10,
    apparent: 8,
    wind: 22,
    code: 63,
    minTemp: 7,
    maxTemp: 12,
    rainProb: 85,
  },
  {
    id: 'snowy',
    label: { az: 'Qarlı 0°C', en: 'Snowy 0°C', ru: 'Снег 0°C' },
    temp: 0,
    apparent: -4,
    wind: 30,
    code: 73,
    minTemp: -3,
    maxTemp: 2,
    rainProb: 90,
  },
];

const DATE_LOCALE_MAP = {
  az: 'az-AZ',
  en: 'en-US',
  ru: 'ru-RU',
};

export function formatForecastDate(dateStr, lang = 'az') {
  if (!dateStr || typeof dateStr !== 'string') return dateStr || '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const [year, month, day] = parts;
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dateObj.getTime())) return dateStr;
  try {
    const locale = DATE_LOCALE_MAP[lang] || 'az-AZ';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(dateObj);
  } catch {
    return dateStr;
  }
}

export function interpretWeather(code, temp, windSpeed, hourlyForecast = null, lang = 'az') {
  const isRainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
  const isSnowy = [71, 73, 75, 77, 85, 86].includes(code);
  const isWindy = windSpeed >= 25;

  const t = getText(lang);
  const condMap = t.weatherConditions;
  const wTips = t.weatherTips;

  let conditionText = condMap.default;
  if (isSnowy) conditionText = condMap.snow;
  else if (isRainy) conditionText = condMap.rain;
  else if (code === 45 || code === 48) conditionText = condMap.fog;
  else if (code === 0) conditionText = condMap.clear;
  else if ([1, 2, 3].includes(code)) conditionText = condMap.clouds;

  let idealWarmth = 3;
  if (temp <= 4) idealWarmth = 5;
  else if (temp <= 11) idealWarmth = 4;
  else if (temp <= 18) idealWarmth = 3;
  else if (temp <= 25) idealWarmth = 2;
  else idealWarmth = 1;

  const tips = [];
  if (temp <= 5) tips.push(wTips.veryCold);
  else if (temp <= 12) tips.push(wTips.chilly);
  else if (temp <= 19) tips.push(wTips.mild);
  else if (temp <= 26) tips.push(wTips.warm);
  else tips.push(wTips.hot);

  if (isRainy || isSnowy) tips.push(wTips.precipitation);
  if (isWindy) tips.push(wTips.strongWind.replace('{wind}', String(Math.round(windSpeed))));

  let eveningAlert = null;
  let eveningCoolDrop = false;
  if (hourlyForecast) {
    const { minTemp, rainProb } = hourlyForecast;
    if (temp - minTemp >= 6 && minTemp <= 14) {
      eveningCoolDrop = true;
      eveningAlert = wTips.eveningDrop.replace('{minTemp}', String(minTemp));
    } else if (!isRainy && rainProb >= 55) {
      eveningAlert = wTips.rainChance.replace('{rainProb}', String(rainProb));
    }
  }

  return {
    conditionText,
    isRainy: isRainy || isSnowy || hourlyForecast?.rainProb >= 65,
    isWindy,
    idealWarmth,
    needOuterwear: temp <= 17 || isRainy || isSnowy || isWindy || eveningCoolDrop,
    generalAdvice: tips.join(' '),
    eveningAlert,
    minTemp: hourlyForecast?.minTemp ?? temp,
    maxTemp: hourlyForecast?.maxTemp ?? temp,
  };
}

export async function fetchCurrentWeather(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,precipitation_probability',
    forecast_days: '1',
    timezone: 'auto',
  });

  const data = await fetchJson(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`, { signal });
  if (!data?.current) {
    throw new WeatherApiError('Missing current weather data in response');
  }

  let hourlyForecast = null;
  if (Array.isArray(data?.hourly?.temperature_2m) && data.hourly.temperature_2m.length > 0) {
    const temps = data.hourly.temperature_2m;
    const probs = Array.isArray(data.hourly.precipitation_probability)
      ? data.hourly.precipitation_probability
      : [];
    hourlyForecast = {
      minTemp: Math.round(Math.min(...temps)),
      maxTemp: Math.round(Math.max(...temps)),
      rainProb: probs.length > 0 ? Math.max(...probs) : 0,
    };
  }

  return {
    temp: Math.round(data.current.temperature_2m),
    apparent: Math.round(data.current.apparent_temperature),
    wind: data.current.wind_speed_10m,
    code: data.current.weather_code,
    hourlyForecast,
  };
}

export async function fetchDailyForecast(lat, lon, { days = 7, signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: String(days),
    timezone: 'auto',
  });

  const data = await fetchJson(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`, { signal });
  if (!Array.isArray(data?.daily?.time) || data.daily.time.length === 0) {
    throw new WeatherApiError('Missing daily forecast data in response');
  }

  return data.daily.time.map((dateStr, idx) => ({
    date: dateStr,
    maxTemp: Math.round(data.daily.temperature_2m_max?.[idx] ?? 0),
    minTemp: Math.round(data.daily.temperature_2m_min?.[idx] ?? 0),
    rainProb: data.daily.precipitation_probability_max?.[idx] ?? 0,
  }));
}

export async function searchGeocodingCity(query, lang = 'az', { signal } = {}) {
  const params = new URLSearchParams({
    name: query,
    count: '1',
    language: lang === 'ru' ? 'ru' : lang === 'az' ? 'az' : 'en',
    format: 'json',
  });

  const data = await fetchJson(`${OPEN_METEO_GEOCODING_URL}?${params.toString()}`, { signal });
  return data?.results?.[0] || null;
}

export function resolveActiveWeather(demoPresetId, liveRawWeather, selectedCity, lang = 'az') {
  if (demoPresetId === 'live') {
    if (!liveRawWeather) return null;
    const info = interpretWeather(
      liveRawWeather.code,
      liveRawWeather.temp,
      liveRawWeather.wind,
      liveRawWeather.hourlyForecast,
      lang
    );
    return {
      locationName: liveRawWeather.locationName,
      temp: liveRawWeather.temp,
      apparent: liveRawWeather.apparent,
      wind: liveRawWeather.wind,
      ...info,
    };
  }

  const preset = DEMO_PRESETS.find((p) => p.id === demoPresetId);
  if (!preset) return null;
  const info = interpretWeather(
    preset.code,
    preset.temp,
    preset.wind,
    {
      minTemp: preset.minTemp,
      maxTemp: preset.maxTemp,
      rainProb: preset.rainProb,
    },
    lang
  );
  const suffix = getText(lang).demoSuffix || '(Demo)';
  return {
    locationName: `${selectedCity} ${suffix}`,
    temp: preset.temp,
    apparent: preset.apparent,
    wind: preset.wind,
    ...info,
  };
}
