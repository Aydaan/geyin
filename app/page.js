'use client';

import { useEffect, useState, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, STYLES, UI_TEXT, getText } from '@/lib/i18n';
import {
  WORLD_CITIES,
  findNearestCity,
  findWorldCityMatch,
} from '@/lib/cities';
import {
  DEMO_PRESETS,
  fetchCurrentWeather,
  fetchDailyForecast,
  searchGeocodingCity,
  isAbortError,
  resolveActiveWeather,
  interpretWeather,
} from '@/lib/weather';
import {
  buildSmartOutfit,
  buildSuitcasePlan,
  computeWardrobeInsights,
} from '@/lib/outfit';
import {
  CLOTHES_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  extractClothesStoragePath,
  generateSafeStoragePath,
  resolveWardrobeItemUrls,
  validateImageFile,
} from '@/lib/storage';
import {
  getSavedOutfitsKey,
  getTravelCitiesKey,
  getManualLocationKey,
  migrateLegacyUserKeys,
  readJson,
  collectSavedOutfitImages,
  applyImageUrls,
  pickInitialTravelPlan,
  isValidManualLocation,
} from '@/lib/user-storage';

import TopControls from '@/components/TopControls';
import AuthForm from '@/components/AuthForm';
import WeatherPanel from '@/components/WeatherPanel';
import TravelPanel from '@/components/TravelPanel';
import WardrobeInsights from '@/components/WardrobeInsights';
import SavedOutfits from '@/components/SavedOutfits';
import WardrobeForm from '@/components/WardrobeForm';
import WardrobeList from '@/components/WardrobeList';

const PREFS_EVENT = 'geyin-prefs-change';
const MAX_OPEN_METEO_DAYS = 16;
const MAX_TRAVEL_DAYS = 14;

function subscribePrefs(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(PREFS_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(PREFS_EVENT, callback);
  };
}

function getThemeSnapshot() {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = localStorage.getItem('geyin_theme_mode');
    if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
  } catch {
    // ignore
  }
  return 'auto';
}

function getLangSnapshot() {
  if (typeof window === 'undefined') return 'az';
  try {
    const saved = localStorage.getItem('geyin_lang');
    if (saved === 'az' || saved === 'en' || saved === 'ru') return saved;
  } catch {
    // ignore
  }
  return 'az';
}

function emitPrefsChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PREFS_EVENT));
  }
}

function subscribeSystemTheme(callback) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSystemDarkSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getLocalIsoDate(offsetDays = 0) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays));
  return d.toISOString().slice(0, 10);
}

function addIsoDays(isoDate, deltaDays) {
  if (!isoDate || typeof isoDate !== 'string') return getLocalIsoDate(deltaDays);
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return getLocalIsoDate(deltaDays);
  return new Date(Date.UTC(y, m - 1, d + deltaDays)).toISOString().slice(0, 10);
}

function clampTravelDays(val) {
  const parsed = Number.parseInt(val, 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.max(1, Math.min(MAX_TRAVEL_DAYS, parsed));
}

export default function Home() {
  const themeMode = useSyncExternalStore(subscribePrefs, getThemeSnapshot, () => 'auto');
  const lang = useSyncExternalStore(subscribePrefs, getLangSnapshot, () => 'az');
  const systemPrefersDark = useSyncExternalStore(subscribeSystemTheme, getSystemDarkSnapshot, () => false);

  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemPrefersDark);
  const tx = useMemo(() => getText(lang), [lang]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const nextTheme = isDark ? 'dark' : 'light';
      document.documentElement.lang = lang;
      document.documentElement.setAttribute('data-theme', nextTheme);
      document.documentElement.style.colorScheme = nextTheme;
    }
  }, [lang, isDark]);

  // Auth state
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tab & Weather state
  const [activeTab, setActiveTab] = useState('today');
  const [locationMode, setLocationMode] = useState('gps');
  const [selectedCity, setSelectedCity] = useState('Bakı');
  const [customCityOption, setCustomCityOption] = useState(null);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [searchingCity, setSearchingCity] = useState(false);
  const [locationSourceState, setLocationSourceState] = useState({ key: 'gpsFinding', detail: '' });
  const locationSource = locationSourceState.detail
    ? `${tx[locationSourceState.key] || ''}: ${locationSourceState.detail}`
    : tx[locationSourceState.key] || '';

  const [liveRawWeather, setLiveRawWeather] = useState(null);
  const [demoPresetId, setDemoPresetId] = useState('live');
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Wardrobe & Outfit state
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Hamısı');
  const [outfitStyleFilter, setOutfitStyleFilter] = useState('all');
  const [recommendedOutfit, setRecommendedOutfit] = useState(null);
  const [outfitAnimKey, setOutfitAnimKey] = useState(0);
  const [lockedSlots, setLockedSlots] = useState({});
  const [savedOutfits, setSavedOutfits] = useState([]);

  // Wardrobe Form state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [subCategory, setSubCategory] = useState('');
  const [color, setColor] = useState('');
  const [warmthLevel, setWarmthLevel] = useState(3);
  const [waterproof, setWaterproof] = useState(false);
  const [windproof, setWindproof] = useState(false);
  const [style, setStyle] = useState('gundelik');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Delete modal state
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);

  // Travel state
  const [travelCityInput, setTravelCityInput] = useState('');
  const [travelStartDateInput, setTravelStartDateInput] = useState(() => getLocalIsoDate(0));
  const [travelDaysInput, setTravelDaysInput] = useState(4);
  const [travelNoteInput, setTravelNoteInput] = useState('');
  const [travelCities, setTravelCities] = useState([]);
  const [activeTravelPlan, setActiveTravelPlan] = useState(null);
  const [weeklyForecast, setWeeklyForecast] = useState([]);
  const [weeklyForecastError, setWeeklyForecastError] = useState('');
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [savingTravelCity, setSavingTravelCity] = useState(false);

  const userIdRef = useRef(null);
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  const weatherAbortRef = useRef(null);
  const weeklyAbortRef = useRef(null);
  const geoSearchAbortRef = useRef(null);
  const travelGeoAbortRef = useRef(null);

  useEffect(() => {
    return () => {
      weatherAbortRef.current?.abort();
      weeklyAbortRef.current?.abort();
      geoSearchAbortRef.current?.abort();
      travelGeoAbortRef.current?.abort();
    };
  }, []);

  // Escape key for delete modal
  useEffect(() => {
    if (!pendingDeleteItem) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !deletingItemId) {
        setPendingDeleteItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingDeleteItem, deletingItemId]);

  // Image preview cleanup
  useEffect(() => {
    if (!imageFile) {
      queueMicrotask(() => setImagePreviewUrl(''));
      return;
    }
    const url = URL.createObjectURL(imageFile);
    queueMicrotask(() => setImagePreviewUrl(url));
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Auto-dismiss notification
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSelectLang = (newLang) => {
    try {
      localStorage.setItem('geyin_lang', newLang);
      emitPrefsChange();
    } catch {
      // ignore
    }
  };

  const handleSelectTheme = (mode) => {
    try {
      localStorage.setItem('geyin_theme_mode', mode);
      emitPrefsChange();
    } catch {
      // ignore
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      if (isRegister) {
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        setMessage(tx.signUpSuccess);
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
      }
    } catch (err) {
      setError(err?.message || tx.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setItems([]);
    setSavedOutfits([]);
    setTravelCities([]);
    setActiveTravelPlan(null);
    setWeeklyForecast([]);
    setRecommendedOutfit(null);
    setLockedSlots({});
  };

  // Weather fetching
  const fetchWeatherForCoords = useCallback(
    async (lat, lon, label, mode, detail = '') => {
      weatherAbortRef.current?.abort();
      const controller = new AbortController();
      weatherAbortRef.current = controller;

      setLoadingWeather(true);
      setError('');
      try {
        const currentData = await fetchCurrentWeather(lat, lon, { signal: controller.signal });
        if (weatherAbortRef.current !== controller) return;

        let hourlyForecast = null;
        try {
          const dailyData = await fetchDailyForecast(lat, lon, { days: 2, signal: controller.signal });
          if (dailyData?.length > 0) {
            hourlyForecast = {
              minTemp: dailyData[0].minTemp,
              maxTemp: dailyData[0].maxTemp,
              rainProb: dailyData[0].rainProb,
            };
          }
        } catch {
          // non-critical
        }

        setLiveRawWeather({
          locationName: label,
          temp: currentData.temp,
          apparent: currentData.apparent,
          code: currentData.code,
          wind: currentData.wind,
          hourlyForecast,
        });
        setLocationMode(mode);
        setLocationSourceState({
          key: mode === 'gps' ? 'gpsFound' : mode === 'search' ? 'citySearched' : 'citySelected',
          detail: detail || label,
        });
      } catch (err) {
        if (isAbortError(err) || weatherAbortRef.current !== controller) return;
        setError(tx.weatherFetchError);
      } finally {
        if (weatherAbortRef.current === controller) {
          setLoadingWeather(false);
        }
      }
    },
    [tx]
  );

  const detectGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const city = WORLD_CITIES[0];
      fetchWeatherForCoords(city.lat, city.lon, city.name, 'manual');
      return;
    }
    setLocationSourceState({ key: 'gpsFinding', detail: '' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearestName = findNearestCity(latitude, longitude, lang);
        fetchWeatherForCoords(latitude, longitude, nearestName, 'gps');
      },
      () => {
        const city = WORLD_CITIES[0];
        fetchWeatherForCoords(city.lat, city.lon, city.name, 'manual');
      },
      { timeout: 10000 }
    );
  }, [fetchWeatherForCoords, lang]);

  const handleCitySelect = (cityName) => {
    setSelectedCity(cityName);
    const matched =
      (customCityOption && customCityOption.value === cityName ? customCityOption.city : null) ||
      WORLD_CITIES.find((c) => c.name === cityName);
    if (!matched) return;
    const label = matched.nameByLang ? matched.nameByLang[lang] || matched.name : matched.name;
    fetchWeatherForCoords(matched.lat, matched.lon, label, 'manual');
    saveManualLocation({ name: matched.name, lat: matched.lat, lon: matched.lon, label, mode: 'manual' });
  };

  // Persist a manually chosen location so it wins over GPS on the next login.
  const saveManualLocation = (entry) => {
    if (!user) return;
    try {
      localStorage.setItem(getManualLocationKey(user.id), JSON.stringify(entry));
    } catch {
      // ignore
    }
  };

  // GPS button: forget the manual choice, then locate.
  const handleDetectGps = () => {
    if (user) {
      try {
        localStorage.removeItem(getManualLocationKey(user.id));
      } catch {
        // ignore
      }
    }
    detectGpsLocation();
  };

  const handleWorldCitySearch = async (e) => {
    e.preventDefault();
    const query = citySearchQuery.trim();
    if (!query) return;

    geoSearchAbortRef.current?.abort();
    const controller = new AbortController();
    geoSearchAbortRef.current = controller;

    setSearchingCity(true);
    setError('');
    try {
      const localMatch = findWorldCityMatch(query, lang);
      if (localMatch) {
        setCustomCityOption({
          value: localMatch.name,
          label: `${localMatch.nameByLang ? localMatch.nameByLang[lang] || localMatch.name : localMatch.name} (${localMatch.code})`,
          city: localMatch,
        });
        setSelectedCity(localMatch.name);
        fetchWeatherForCoords(localMatch.lat, localMatch.lon, localMatch.name, 'search', query);
        saveManualLocation({
          name: localMatch.name,
          lat: localMatch.lat,
          lon: localMatch.lon,
          label: localMatch.name,
          mode: 'search',
        });
        setCitySearchQuery('');
        return;
      }

      const results = await searchGeocodingCity(query, lang, { count: 1, signal: controller.signal });
      if (geoSearchAbortRef.current !== controller) return;
      if (!results || results.length === 0) {
        setError(tx.cityNotFound);
        return;
      }
      const top = results[0];
      const opt = {
        value: top.name,
        label: `${top.name} (${top.country})`,
        city: {
          name: top.name,
          code: top.countryCode,
          lat: top.latitude,
          lon: top.longitude,
          nameByLang: { [lang]: top.name },
        },
      };
      setCustomCityOption(opt);
      setSelectedCity(top.name);
      fetchWeatherForCoords(top.latitude, top.longitude, top.name, 'search', query);
      saveManualLocation({
        name: top.name,
        lat: top.latitude,
        lon: top.longitude,
        label: top.name,
        mode: 'search',
      });
      setCitySearchQuery('');
    } catch (err) {
      if (isAbortError(err) || geoSearchAbortRef.current !== controller) return;
      setError(tx.geocodingError);
    } finally {
      if (geoSearchAbortRef.current === controller) {
        setSearchingCity(false);
      }
    }
  };

  // Weekly travel forecast
  const fetchWeeklyForecast = useCallback(
    async (lat, lon, startDate, daysCount) => {
      weeklyAbortRef.current?.abort();
      const controller = new AbortController();
      weeklyAbortRef.current = controller;

      setLoadingWeekly(true);
      setWeeklyForecastError('');
      setWeeklyForecast([]);
      try {
        const allDays = await fetchDailyForecast(lat, lon, {
          days: MAX_OPEN_METEO_DAYS,
          signal: controller.signal,
        });
        if (weeklyAbortRef.current !== controller) return;

        const effectiveStart = startDate || getLocalIsoDate(0);
        const tripDays = clampTravelDays(daysCount);
        const effectiveEnd = addIsoDays(effectiveStart, tripDays - 1);
        const filtered = allDays.filter(
          (day) => day.date >= effectiveStart && day.date <= effectiveEnd
        );
        setWeeklyForecast(filtered);
      } catch (err) {
        if (isAbortError(err) || weeklyAbortRef.current !== controller) return;
        setWeeklyForecastError(tx.weeklyForecastError);
      } finally {
        if (weeklyAbortRef.current === controller) {
          setLoadingWeekly(false);
        }
      }
    },
    [tx]
  );

  useEffect(() => {
    if (activeTravelPlan?.lat && activeTravelPlan?.lon) {
      queueMicrotask(() => {
        fetchWeeklyForecast(
          activeTravelPlan.lat,
          activeTravelPlan.lon,
          activeTravelPlan.startDate,
          activeTravelPlan.days
        );
      });
    }
  }, [activeTravelPlan, fetchWeeklyForecast]);

  const activeWeather = useMemo(
    () => resolveActiveWeather(demoPresetId, liveRawWeather, selectedCity, lang),
    [demoPresetId, liveRawWeather, selectedCity, lang]
  );

  // Initial location load: saved manual/search location wins over GPS.
  // Refs keep this from re-running when language (and so these callbacks) change.
  const detectGpsRef = useRef(detectGpsLocation);
  const fetchWeatherRef = useRef(fetchWeatherForCoords);
  useEffect(() => {
    detectGpsRef.current = detectGpsLocation;
    fetchWeatherRef.current = fetchWeatherForCoords;
  });

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!authChecked) return;
    let saved = null;
    if (userId) {
      migrateLegacyUserKeys(localStorage, userId);
      saved = readJson(localStorage, getManualLocationKey(userId), null);
    }
    queueMicrotask(() => {
      if (!isValidManualLocation(saved)) {
        detectGpsRef.current();
        return;
      }
      const name = saved.name || saved.city || saved.label || '';
      const label = saved.label || name;
      if (name && !WORLD_CITIES.some((c) => c.name === name)) {
        setCustomCityOption({
          value: name,
          label,
          city: { name, code: '', lat: saved.lat, lon: saved.lon, nameByLang: {} },
        });
      }
      if (name) setSelectedCity(name);
      fetchWeatherRef.current(saved.lat, saved.lon, label, saved.mode === 'search' ? 'search' : 'manual');
    });
  }, [authChecked, userId]);

  // Load wardrobe items
  const loadWardrobeItems = useCallback(async () => {
    if (!user) return;
    setLoadingItems(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (fetchErr) throw fetchErr;
      const resolved = await resolveWardrobeItemUrls(supabase, data || []);
      setItems(resolved);
    } catch {
      // non-critical error display
    } finally {
      setLoadingItems(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => loadWardrobeItems());
  }, [user, loadWardrobeItems]);

  // Periodic signed URL refresh
  useEffect(() => {
    if (!user || items.length === 0) return;
    const interval = setInterval(async () => {
      const refreshed = await resolveWardrobeItemUrls(supabase, items);
      setItems(refreshed);
    }, (SIGNED_URL_TTL_SECONDS - 60) * 1000);
    return () => clearInterval(interval);
  }, [user, items]);

  // Re-sign saved outfit photos by storage path (stored URLs expire after 1h).
  const refreshSavedOutfitImages = useCallback(async (list) => {
    const pieces = collectSavedOutfitImages(list);
    if (pieces.length === 0) return list;
    const resolved = await resolveWardrobeItemUrls(supabase, pieces);
    const urlByPath = new Map(
      resolved.filter((p) => p?.image_path && p?.image_url).map((p) => [p.image_path, p.image_url])
    );
    return applyImageUrls(list, urlByPath);
  }, []);

  // Load user saved outfits & travel cities
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    migrateLegacyUserKeys(localStorage, userId);

    const savedRaw = readJson(localStorage, getSavedOutfitsKey(userId), []);
    const savedList = Array.isArray(savedRaw) ? savedRaw : [];
    const travelRaw = readJson(localStorage, getTravelCitiesKey(userId), []);
    const travelList = Array.isArray(travelRaw) ? travelRaw : [];

    queueMicrotask(() => {
      if (cancelled) return;
      setSavedOutfits(savedList);
      setTravelCities(travelList);
      setActiveTravelPlan(pickInitialTravelPlan(travelList));
    });

    if (savedList.length > 0) {
      refreshSavedOutfitImages(savedList).then((fresh) => {
        if (!cancelled) setSavedOutfits(fresh);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [userId, refreshSavedOutfitImages]);

  // Keep saved outfit photos signed while the page stays open.
  useEffect(() => {
    if (!userId || savedOutfits.length === 0) return;
    const interval = setInterval(async () => {
      const fresh = await refreshSavedOutfitImages(savedOutfits);
      setSavedOutfits(fresh);
    }, (SIGNED_URL_TTL_SECONDS - 60) * 1000);
    return () => clearInterval(interval);
  }, [userId, savedOutfits, refreshSavedOutfitImages]);

  // Generate outfit when weather or style changes
  useEffect(() => {
    if (!activeWeather || items.length === 0) {
      queueMicrotask(() => setRecommendedOutfit(null));
      return;
    }
    const outfit = buildSmartOutfit(
      items,
      activeWeather,
      outfitStyleFilter,
      lockedSlots,
      recommendedOutfit,
      {},
      lang
    );
    queueMicrotask(() => {
      setRecommendedOutfit(outfit);
      setOutfitAnimKey((prev) => prev + 1);
    });
  }, [activeWeather, items, outfitStyleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegenerateOutfit = () => {
    if (!activeWeather || items.length === 0) return;
    const outfit = buildSmartOutfit(
      items,
      activeWeather,
      outfitStyleFilter,
      lockedSlots,
      recommendedOutfit,
      {},
      lang
    );
    setRecommendedOutfit(outfit);
    setOutfitAnimKey((prev) => prev + 1);
  };

  const handleToggleLockSlot = (slotKey) => {
    setLockedSlots((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

  const handleRegenerateSingleSlot = (slotKey) => {
    if (!activeWeather || !recommendedOutfit || !recommendedOutfit[slotKey]) return;
    const currentId = recommendedOutfit[slotKey]?.id;
    const updated = buildSmartOutfit(
      items,
      activeWeather,
      outfitStyleFilter,
      { ...lockedSlots, [slotKey]: false },
      recommendedOutfit,
      { [slotKey]: currentId },
      lang
    );
    if (updated) {
      setRecommendedOutfit(updated);
      setOutfitAnimKey((prev) => prev + 1);
    }
  };

  const handleSaveCurrentOutfit = () => {
    if (!recommendedOutfit || !user) return;
    const pieces = [
      recommendedOutfit.top,
      recommendedOutfit.bottom,
      recommendedOutfit.outerwear,
      recommendedOutfit.shoes,
      recommendedOutfit.accessory,
    ].filter(Boolean);

    const newSaved = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      city: activeWeather?.locationName || selectedCity,
      temp: activeWeather?.temp ?? 20,
      condition: activeWeather?.conditionText || '',
      createdAt: new Date().toISOString(),
      outfitData: recommendedOutfit,
      pieces,
    };

    const next = [newSaved, ...savedOutfits];
    setSavedOutfits(next);
    try {
      localStorage.setItem(getSavedOutfitsKey(user.id), JSON.stringify(next));
      setMessage(tx.savedToast);
    } catch {
      // ignore
    }
  };

  const handleLoadSavedOutfit = (saved) => {
    if (!saved?.outfitData) return;
    setRecommendedOutfit(saved.outfitData);
    setOutfitAnimKey((prev) => prev + 1);
    setMessage(tx.loadedToast);
  };

  const handleDeleteSavedOutfit = (savedId) => {
    const next = savedOutfits.filter((s) => s.id !== savedId);
    setSavedOutfits(next);
    if (user) {
      try {
        localStorage.setItem(getSavedOutfitsKey(user.id), JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  };

  // Add Item
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!imageFile) {
      setError(tx.photoRequired);
      return;
    }

    const validation = await validateImageFile(imageFile);
    if (!validation.valid) {
      if (validation.error === 'photoTooLarge') setError(tx.photoTooLarge);
      else if (validation.error === 'photoInvalidType') setError(tx.photoInvalidType);
      else setError(tx.photoRequired);
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');
    try {
      const storagePath = generateSafeStoragePath(user.id, validation.ext);
      const { error: uploadErr } = await supabase.storage
        .from(CLOTHES_BUCKET)
        .upload(storagePath, imageFile, { contentType: imageFile.type });
      if (uploadErr) throw uploadErr;

      const { data: inserted, error: insertErr } = await supabase
        .from('wardrobe_items')
        .insert({
          user_id: user.id,
          category,
          sub_category: subCategory.trim() || null,
          color: color.trim() || null,
          warmth_level: Number(warmthLevel),
          waterproof: Boolean(waterproof),
          windproof: Boolean(windproof),
          style,
          image_path: storagePath,
          image_url: storagePath,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      const resolved = await resolveWardrobeItemUrls(supabase, [inserted]);
      setItems((prev) => [resolved[0], ...prev]);
      setImageFile(null);
      setSubCategory('');
      setColor('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage(tx.addedToast);
    } catch (err) {
      setError(err?.message || tx.genericError);
    } finally {
      setUploading(false);
    }
  };

  // Delete Item modal handlers
  const handleRequestDeleteItem = (item) => {
    setPendingDeleteItem(item);
  };

  const handleCancelDeleteItem = () => {
    if (!deletingItemId) {
      setPendingDeleteItem(null);
    }
  };

  const handleConfirmDeleteItem = async (item) => {
    if (!user || !item) return;
    setDeletingItemId(item.id);
    try {
      const { error: deleteDbErr } = await supabase
        .from('wardrobe_items')
        .delete()
        .eq('id', item.id)
        .eq('user_id', user.id);
      if (deleteDbErr) throw deleteDbErr;

      const storagePath = item.image_path || extractClothesStoragePath(item.image_url);
      if (storagePath) {
        await supabase.storage.from(CLOTHES_BUCKET).remove([storagePath]);
      }

      setItems((prev) => prev.filter((i) => i.id !== item.id));

      // Cleanup saved outfits
      setSavedOutfits((prev) => {
        const cleaned = prev
          .map((s) => ({
            ...s,
            pieces: s.pieces.filter((p) => p.id !== item.id),
          }))
          .filter((s) => s.pieces.length > 0);
        try {
          localStorage.setItem(getSavedOutfitsKey(user.id), JSON.stringify(cleaned));
        } catch {
          // ignore
        }
        return cleaned;
      });

      // Cleanup recommended outfit & locked slots
      if (recommendedOutfit) {
        const next = { ...recommendedOutfit };
        let modified = false;
        for (const slotKey of ['top', 'bottom', 'outerwear', 'shoes', 'accessory']) {
          if (next[slotKey]?.id === item.id) {
            next[slotKey] = null;
            modified = true;
            if (lockedSlots[slotKey]) {
              setLockedSlots((l) => ({ ...l, [slotKey]: false }));
            }
          }
        }
        if (modified) setRecommendedOutfit(next);
      }

      setPendingDeleteItem(null);
      setMessage(tx.itemDeletedToast);
    } catch (err) {
      setError(err?.message || tx.genericError);
    } finally {
      setDeletingItemId(null);
    }
  };

  // Travel handlers
  const handleAddTravelCity = async (e) => {
    e.preventDefault();
    const query = travelCityInput.trim();
    if (!query) return;

    travelGeoAbortRef.current?.abort();
    const controller = new AbortController();
    travelGeoAbortRef.current = controller;

    setSavingTravelCity(true);
    setError('');
    try {
      const results = await searchGeocodingCity(query, lang, { count: 1, signal: controller.signal });
      if (travelGeoAbortRef.current !== controller) return;
      if (!results || results.length === 0) {
        setError(tx.cityNotFound);
        return;
      }
      const top = results[0];
      const plan = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: top.name,
        country: top.country,
        label: `${top.name} (${top.country})`,
        lat: top.latitude,
        lon: top.longitude,
        startDate: travelStartDateInput || getLocalIsoDate(0),
        days: clampTravelDays(travelDaysInput),
        note: travelNoteInput.trim(),
      };

      const nextCities = [plan, ...travelCities.filter((c) => c.name !== plan.name)];
      setTravelCities(nextCities);
      setActiveTravelPlan(plan);
      setTravelCityInput('');
      setTravelNoteInput('');
      if (user) {
        try {
          localStorage.setItem(getTravelCitiesKey(user.id), JSON.stringify(nextCities));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      if (isAbortError(err) || travelGeoAbortRef.current !== controller) return;
      setError(tx.geocodingError);
    } finally {
      if (travelGeoAbortRef.current === controller) {
        setSavingTravelCity(false);
      }
    }
  };

  const handleSelectSavedTravelCity = (plan) => {
    setActiveTravelPlan(plan);
  };

  const handleRemoveTravelCity = (planId) => {
    const next = travelCities.filter((c) => c.id !== planId);
    setTravelCities(next);
    if (activeTravelPlan?.id === planId) {
      setActiveTravelPlan(null);
      setWeeklyForecast([]);
    }
    if (user) {
      try {
        localStorage.setItem(getTravelCitiesKey(user.id), JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  };

  const filteredItems = useMemo(() => {
    if (selectedCategoryFilter === 'Hamısı') return items;
    return items.filter((item) => item.category === selectedCategoryFilter);
  }, [items, selectedCategoryFilter]);

  const wardrobeInsights = useMemo(() => computeWardrobeInsights(items, lang), [items, lang]);
  const suitcasePlan = useMemo(
    () => buildSuitcasePlan(items, weeklyForecast, activeTravelPlan?.days || travelDaysInput, lang),
    [items, weeklyForecast, activeTravelPlan, travelDaysInput, lang]
  );

  const todayIso = useMemo(() => getLocalIsoDate(0), []);
  const maxForecastIso = useMemo(() => getLocalIsoDate(MAX_OPEN_METEO_DAYS - 1), []);
  const activeTravelDays = activeTravelPlan ? clampTravelDays(activeTravelPlan.days) : 0;
  const activeTravelStart = activeTravelPlan?.startDate || todayIso;
  const activeTravelEnd = activeTravelPlan ? addIsoDays(activeTravelStart, activeTravelDays - 1) : todayIso;
  const coveredStartDate = weeklyForecast[0]?.date || null;
  const coveredEndDate = weeklyForecast[weeklyForecast.length - 1]?.date || null;

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-muted">
        <p className="text-sm font-medium animate-pulse">{tx.loading}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthForm
        tx={tx}
        lang={lang}
        themeMode={themeMode}
        onSelectLang={handleSelectLang}
        onSelectTheme={handleSelectTheme}
        isRegister={isRegister}
        onToggleRegister={() => {
          setIsRegister((prev) => !prev);
          setError('');
          setMessage('');
        }}
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        error={error}
        message={message}
        onDismissError={() => setError('')}
        onDismissMessage={() => setMessage('')}
        submitting={submitting}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        {/* Header with App Title, Language/Theme Toggles, and Logout */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-brand-strong to-brand bg-clip-text text-transparent">
              Geyin
            </h1>
            <p className="text-xs text-muted mt-0.5">{user.email}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TopControls
              lang={lang}
              onSelectLang={handleSelectLang}
              themeMode={themeMode}
              onSelectTheme={handleSelectTheme}
              tx={tx}
            />

            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[36px] rounded-xl bg-surface-solid border-border text-text shadow-sm dark:shadow-none hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 border px-3.5 py-1.5 text-xs font-medium transition cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              {tx.logout}
            </button>
          </div>
        </header>

        {/* Global Notifications */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 animate-outfit-in"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-xs font-bold text-red-700 dark:text-red-400 hover:underline cursor-pointer ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 animate-outfit-in"
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage('')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs (role="tablist" / "tab" / aria-selected) */}
        <nav
          role="tablist"
          aria-label="App Navigation"
          className="flex space-x-2 border-b border-border pb-2"
        >
          <button
            type="button"
            role="tab"
            id="tab-today"
            aria-selected={activeTab === 'today'}
            aria-controls="panel-today"
            onClick={() => setActiveTab('today')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong ${
              activeTab === 'today'
                ? 'bg-brand text-brand-fg shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            {tx.tabToday}
          </button>
          <button
            type="button"
            role="tab"
            id="tab-travel"
            aria-selected={activeTab === 'travel'}
            aria-controls="panel-travel"
            onClick={() => setActiveTab('travel')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong ${
              activeTab === 'travel'
                ? 'bg-brand text-brand-fg shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            {tx.tabTravel}
          </button>
        </nav>

        {/* Tab Panels */}
        <main className="space-y-8">
          {activeTab === 'today' ? (
            <div id="panel-today" role="tabpanel" aria-labelledby="tab-today" className="space-y-8">
              <WeatherPanel
                tx={tx}
                lang={lang}
                locationSource={locationSource}
                locationMode={locationMode}
                loadingWeather={loadingWeather}
                demoPresetId={demoPresetId}
                activeWeather={activeWeather}
                selectedCity={selectedCity}
                customCityOption={customCityOption}
                citySearchQuery={citySearchQuery}
                searchingCity={searchingCity}
                onDetectGpsLocation={handleDetectGps}
                onCitySelect={handleCitySelect}
                onCitySearchQueryChange={setCitySearchQuery}
                onWorldCitySearch={handleWorldCitySearch}
                onSelectDemoPreset={setDemoPresetId}
                items={items}
                recommendedOutfit={recommendedOutfit}
                displayedOutfitExplanation={recommendedOutfit?.explanation || ''}
                outfitAnimKey={outfitAnimKey}
                lockedSlots={lockedSlots}
                outfitStyleFilter={outfitStyleFilter}
                onStyleFilterChange={setOutfitStyleFilter}
                onRegenerateOutfit={handleRegenerateOutfit}
                onSaveCurrentOutfit={handleSaveCurrentOutfit}
                onToggleLockSlot={handleToggleLockSlot}
                onRegenerateSingleSlot={handleRegenerateSingleSlot}
              />

              {wardrobeInsights && <WardrobeInsights tx={tx} insights={wardrobeInsights} />}
              <SavedOutfits
                tx={tx}
                lang={lang}
                savedOutfits={savedOutfits}
                onLoadSavedOutfit={handleLoadSavedOutfit}
                onDeleteSavedOutfit={handleDeleteSavedOutfit}
              />
            </div>
          ) : (
            <div id="panel-travel" role="tabpanel" aria-labelledby="tab-travel" className="space-y-8">
              <TravelPanel
                tx={tx}
                lang={lang}
                travelCityInput={travelCityInput}
                travelStartDateInput={travelStartDateInput}
                todayIso={todayIso}
                maxForecastIso={maxForecastIso}
                travelDaysInput={travelDaysInput}
                travelNoteInput={travelNoteInput}
                savingTravelCity={savingTravelCity}
                activeTravelPlan={activeTravelPlan}
                activeTravelDays={activeTravelDays}
                activeTravelStart={activeTravelStart}
                activeTravelEnd={activeTravelEnd}
                coveredStartDate={coveredStartDate}
                coveredEndDate={coveredEndDate}
                loadingWeekly={loadingWeekly}
                weeklyForecastError={weeklyForecastError}
                weeklyForecast={weeklyForecast}
                suitcasePlan={suitcasePlan}
                travelCities={travelCities}
                onTravelCityInputChange={setTravelCityInput}
                onTravelStartDateInputChange={setTravelStartDateInput}
                onTravelDaysInputChange={setTravelDaysInput}
                onTravelNoteInputChange={setTravelNoteInput}
                onAddTravelCity={handleAddTravelCity}
                onSelectSavedTravelCity={handleSelectSavedTravelCity}
                onRemoveTravelCity={handleRemoveTravelCity}
              />
            </div>
          )}

          {/* Wardrobe Management Form & Item List */}
          <div className="space-y-8 pt-4 border-t border-border">
            <WardrobeForm
              tx={tx}
              lang={lang}
              imageFile={imageFile}
              imagePreviewUrl={imagePreviewUrl}
              category={category}
              subCategory={subCategory}
              color={color}
              style={style}
              warmthLevel={warmthLevel}
              waterproof={waterproof}
              windproof={windproof}
              uploading={uploading}
              fileInputRef={fileInputRef}
              onImageFileChange={setImageFile}
              onCategoryChange={setCategory}
              onSubCategoryChange={setSubCategory}
              onColorChange={setColor}
              onStyleChange={setStyle}
              onWarmthLevelChange={setWarmthLevel}
              onWaterproofChange={setWaterproof}
              onWindproofChange={setWindproof}
              onSubmit={handleAddItem}
            />

            <WardrobeList
              tx={tx}
              lang={lang}
              filteredItems={filteredItems}
              loadingItems={loadingItems}
              selectedCategoryFilter={selectedCategoryFilter}
              onSelectCategoryFilter={setSelectedCategoryFilter}
              pendingDeleteItem={pendingDeleteItem}
              deletingItemId={deletingItemId}
              onRequestDeleteItem={handleRequestDeleteItem}
              onConfirmDeleteItem={handleConfirmDeleteItem}
              onCancelDeleteItem={handleCancelDeleteItem}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
