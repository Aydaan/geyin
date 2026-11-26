import { extractClothesStoragePath } from './storage.js';

// Per-user localStorage keys. Names match the pre-refactor keys so existing
// user data keeps loading.
export const getSavedOutfitsKey = (userId) => `geyin_saved_${userId}`;
export const getTravelCitiesKey = (userId) => `geyin_travel_cities_${userId}`;
export const getManualLocationKey = (userId) => `geyin_manual_location_${userId}`;

// Older key names, newest first. The first one that has a value is copied to
// the current key (only if the current key is empty), then all are removed.
const legacyKeys = (userId) => ({
  [getTravelCitiesKey(userId)]: [`geyin_travel_${userId}`, 'geyin_travel_cities'],
  [getManualLocationKey(userId)]: [`geyin_manual_${userId}`, 'geyin_manual_location'],
});

export function migrateLegacyUserKeys(storage, userId) {
  if (!storage || !userId) return;
  for (const [currentKey, oldKeys] of Object.entries(legacyKeys(userId))) {
    try {
      if (storage.getItem(currentKey) === null) {
        const found = oldKeys.map((k) => storage.getItem(k)).find((v) => v !== null);
        if (found !== undefined) storage.setItem(currentKey, found);
      }
      for (const k of oldKeys) storage.removeItem(k);
    } catch {
      // storage unavailable or full: keep going
    }
  }
}

export function readJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

const OUTFIT_SLOTS = ['top', 'bottom', 'outerwear', 'shoes', 'accessory'];

// Every clothing piece referenced by saved outfits (pieces + outfitData slots).
export function collectSavedOutfitImages(savedOutfits) {
  if (!Array.isArray(savedOutfits)) return [];
  const list = [];
  for (const saved of savedOutfits) {
    for (const piece of saved?.pieces || []) if (piece) list.push(piece);
    for (const slot of OUTFIT_SLOTS) {
      const piece = saved?.outfitData?.[slot];
      if (piece) list.push(piece);
    }
  }
  return list;
}

// Replace each piece's image_url with a fresh URL looked up by storage path.
export function applyImageUrls(savedOutfits, urlByPath) {
  if (!Array.isArray(savedOutfits)) return [];
  const fix = (piece) => {
    if (!piece) return piece;
    const path = piece.image_path || extractClothesStoragePath(piece.image_url);
    const url = path ? urlByPath.get(path) : null;
    return url ? { ...piece, image_path: path, image_url: url } : piece;
  };
  return savedOutfits.map((saved) => {
    const outfitData = saved?.outfitData ? { ...saved.outfitData } : saved?.outfitData;
    if (outfitData) {
      for (const slot of OUTFIT_SLOTS) outfitData[slot] = fix(outfitData[slot]);
    }
    return { ...saved, pieces: (saved?.pieces || []).map(fix), outfitData };
  });
}

// Most recently added travel city is first in the list.
export function pickInitialTravelPlan(travelCities) {
  return Array.isArray(travelCities) && travelCities.length > 0 ? travelCities[0] : null;
}

export function isValidManualLocation(value) {
  return (
    !!value &&
    typeof value.lat === 'number' &&
    typeof value.lon === 'number' &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lon)
  );
}
