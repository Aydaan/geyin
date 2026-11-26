import { CATEGORIES, getText } from './i18n.js';

export const NEUTRAL_KEYWORDS = [
  'qara', 'ağ', 'ag', 'bej', 'boz', 'krem', 'qəhvəyi', 'qehveyi',
  'tünd göy', 'göy', 'goy', 'cins', 'xaki', 'black', 'white',
  'beige', 'gray', 'grey', 'navy', 'brown', 'черный', 'чёрный',
  'белый', 'бежевый', 'серый', 'синий', 'коричневый',
];

export function isNeutralColor(colorStr) {
  if (!colorStr) return true;
  const lower = colorStr.toLowerCase().trim();
  return NEUTRAL_KEYWORDS.some((kw) => lower.includes(kw));
}

export function getColorHarmonyBonus(colorA, colorB) {
  if (!colorA || !colorB) return 10;
  const a = colorA.toLowerCase().trim();
  const b = colorB.toLowerCase().trim();
  if (isNeutralColor(a) || isNeutralColor(b)) return 22;
  if (a === b) return 16;
  return 4;
}

export function buildOutfitExplanation(outfit, weatherInfo, lang = 'az') {
  if (!outfit || !weatherInfo) return '';
  const selected = [
    outfit.top,
    outfit.bottom,
    outfit.outerwear,
    outfit.shoes,
    outfit.accessory,
  ].filter(Boolean);
  if (selected.length === 0) return '';

  const hasWaterproof = selected.some((i) => i.waterproof);
  const hasWindproof = selected.some((i) => i.windproof);
  const colors = selected.map((i) => i.color).filter(Boolean);
  const r = getText(lang).outfitReasons;

  const reasons = [
    r.targetedWarmth
      .replace('{warmth}', String(weatherInfo.idealWarmth))
      .replace('{temp}', String(weatherInfo.temp)),
  ];
  if (weatherInfo.isRainy && hasWaterproof) reasons.push(r.waterproof);
  if (weatherInfo.isWindy && hasWindproof) reasons.push(r.windproof);
  if (colors.length >= 2) {
    reasons.push(r.colorHarmony.replace('{colors}', colors.slice(0, 3).join(' + ')));
  }
  return reasons.join(', ') + '.';
}

export function buildSmartOutfit(
  items,
  weatherInfo,
  preferredStyle = 'all',
  lockedSlots = {},
  currentOutfit = null,
  excludeIdsBySlot = {},
  lang = 'az',
  randomFn = Math.random
) {
  if (!items || items.length === 0 || !weatherInfo) return null;

  const pickBestForCategory = (slotKey, catName, anchorColor = null) => {
    if (lockedSlots[slotKey] && currentOutfit?.[slotKey]) {
      return currentOutfit[slotKey];
    }

    let candidates = items.filter((item) => item.category === catName);
    if (candidates.length === 0) return null;

    const excludeId = excludeIdsBySlot[slotKey];
    if (excludeId && candidates.length > 1) {
      candidates = candidates.filter((c) => c.id !== excludeId);
    }

    const scored = candidates.map((item) => {
      let score = 0;
      const diff = Math.abs((item.warmth_level || 3) - weatherInfo.idealWarmth);
      score += Math.max(0, 50 - diff * 15);
      if (weatherInfo.isRainy && item.waterproof) score += 25;
      if (weatherInfo.isWindy && item.windproof) score += 20;
      if (preferredStyle !== 'all' && item.style === preferredStyle) score += 20;
      if (anchorColor) score += getColorHarmonyBonus(anchorColor, item.color);
      score += randomFn() * 18;
      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].item;
  };

  const top = pickBestForCategory('top', 'Üst geyim');
  const anchorColor = top?.color || null;
  const bottom = pickBestForCategory('bottom', 'Alt geyim', anchorColor);
  const outerwear =
    weatherInfo.needOuterwear || (lockedSlots.outerwear && currentOutfit?.outerwear)
      ? pickBestForCategory('outerwear', 'Üst örtük (Gödəkçə/Palto)', anchorColor)
      : null;
  const shoes = pickBestForCategory('shoes', 'Ayaqqabı', bottom?.color || anchorColor);
  const accessory = pickBestForCategory('accessory', 'Aksesuar', anchorColor);

  const nextOutfit = { top, bottom, outerwear, shoes, accessory };
  nextOutfit.explanation = buildOutfitExplanation(nextOutfit, weatherInfo, lang);
  return nextOutfit;
}

export function buildSuitcasePlan(items, weeklyDays, tripDays, lang = 'az') {
  if (!items || items.length === 0) {
    return { suggestedItems: [], note: '' };
  }

  const daysToUse = weeklyDays && weeklyDays.length > 0 ? weeklyDays : [];
  const avgMax =
    daysToUse.length > 0
      ? daysToUse.reduce((s, d) => s + d.maxTemp, 0) / daysToUse.length
      : 18;
  const avgMin =
    daysToUse.length > 0
      ? daysToUse.reduce((s, d) => s + d.minTemp, 0) / daysToUse.length
      : 10;
  const maxRainProb =
    daysToUse.length > 0 ? Math.max(...daysToUse.map((d) => d.rainProb || 0)) : 0;

  const isRainyWeek = maxRainProb >= 50;
  const isColdWeek = avgMin <= 10 || avgMax <= 14;

  let idealWarmth = 3;
  if (avgMax <= 6) idealWarmth = 5;
  else if (avgMax <= 13) idealWarmth = 4;
  else if (avgMax <= 20) idealWarmth = 3;
  else if (avgMax <= 26) idealWarmth = 2;
  else idealWarmth = 1;

  const clampedDays = Math.max(1, Math.min(14, Number(tripDays) || 3));
  const topCount = Math.min(
    items.filter((i) => i.category === 'Üst geyim').length,
    Math.max(1, Math.min(7, clampedDays))
  );
  const bottomCount = Math.min(
    items.filter((i) => i.category === 'Alt geyim').length,
    Math.max(1, Math.min(4, Math.ceil(clampedDays / 2)))
  );
  const outerwearCount = Math.min(
    items.filter((i) => i.category === 'Üst örtük (Gödəkçə/Palto)').length,
    isColdWeek || isRainyWeek ? 2 : 1
  );
  const shoesCount = Math.min(
    items.filter((i) => i.category === 'Ayaqqabı').length,
    clampedDays >= 4 ? 2 : 1
  );
  const accessoryCount = Math.min(items.filter((i) => i.category === 'Aksesuar').length, 1);

  const scoreAndPick = (catName, count) => {
    const pool = items.filter((i) => i.category === catName);
    const ranked = [...pool].sort((a, b) => {
      const scoreA =
        -Math.abs((a.warmth_level || 3) - idealWarmth) * 10 +
        (isRainyWeek && a.waterproof ? 18 : 0) +
        (isColdWeek && a.windproof ? 10 : 0);
      const scoreB =
        -Math.abs((b.warmth_level || 3) - idealWarmth) * 10 +
        (isRainyWeek && b.waterproof ? 18 : 0) +
        (isColdWeek && b.windproof ? 10 : 0);
      return scoreB - scoreA;
    });
    return ranked.slice(0, count);
  };

  const suggestedItems = [
    ...scoreAndPick('Üst geyim', topCount),
    ...scoreAndPick('Alt geyim', bottomCount),
    ...scoreAndPick('Üst örtük (Gödəkçə/Palto)', outerwearCount),
    ...scoreAndPick('Ayaqqabı', shoesCount),
    ...scoreAndPick('Aksesuar', accessoryCount),
  ];

  const t = getText(lang);
  const note = isRainyWeek ? t.rainyWeekNote : isColdWeek ? t.coldWeekNote : t.warmWeekNote;

  return { suggestedItems, note };
}

export function computeWardrobeInsights(items, lang = 'az') {
  if (!items || items.length === 0) return null;
  const avgWarmth = (
    items.reduce((acc, i) => acc + (Number(i.warmth_level) || 3), 0) / items.length
  ).toFixed(1);

  const hasWaterproof = items.some((i) => i.waterproof);
  const missingCategories = CATEGORIES.filter(
    (cat) => cat.value !== 'Aksesuar' && !items.some((i) => i.category === cat.value)
  ).map((cat) => cat.label[lang] || cat.label.az);

  const t = getText(lang);
  let suggestion = t.wardrobeBalanced;

  if (missingCategories.length > 0) {
    suggestion = `${t.wardrobeMissingPrefix}: ${missingCategories.join(', ')}.`;
  } else if (!hasWaterproof) {
    suggestion = t.wardrobeWaterproofTip;
  }

  return {
    total: items.length,
    avgWarmth,
    waterproofCount: items.filter((i) => i.waterproof).length,
    suggestion,
  };
}
