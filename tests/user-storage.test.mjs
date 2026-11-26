import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
} from '../lib/user-storage.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    keys: () => [...data.keys()],
  };
}

describe('storage keys', () => {
  it('keeps the pre-refactor key names', () => {
    assert.equal(getSavedOutfitsKey('u1'), 'geyin_saved_u1');
    assert.equal(getTravelCitiesKey('u1'), 'geyin_travel_cities_u1');
    assert.equal(getManualLocationKey('u1'), 'geyin_manual_location_u1');
  });
});

describe('migrateLegacyUserKeys', () => {
  it('moves refactor-era keys to the current names', () => {
    const s = memoryStorage({ geyin_travel_u1: '[1]', geyin_manual_u1: '{"lat":1,"lon":2}' });
    migrateLegacyUserKeys(s, 'u1');
    assert.equal(s.getItem('geyin_travel_cities_u1'), '[1]');
    assert.equal(s.getItem('geyin_manual_location_u1'), '{"lat":1,"lon":2}');
    assert.equal(s.getItem('geyin_travel_u1'), null);
    assert.equal(s.getItem('geyin_manual_u1'), null);
  });

  it('moves global (pre-user) keys when nothing newer exists', () => {
    const s = memoryStorage({ geyin_travel_cities: '[2]', geyin_manual_location: '{}' });
    migrateLegacyUserKeys(s, 'u1');
    assert.equal(s.getItem('geyin_travel_cities_u1'), '[2]');
    assert.equal(s.getItem('geyin_manual_location_u1'), '{}');
    assert.equal(s.getItem('geyin_travel_cities'), null);
  });

  it('never overwrites existing current data', () => {
    const s = memoryStorage({ geyin_travel_cities_u1: '[new]', geyin_travel_u1: '[old]' });
    migrateLegacyUserKeys(s, 'u1');
    assert.equal(s.getItem('geyin_travel_cities_u1'), '[new]');
    assert.equal(s.getItem('geyin_travel_u1'), null);
  });

  it('does nothing without a user id', () => {
    const s = memoryStorage({ geyin_travel_cities: '[2]' });
    migrateLegacyUserKeys(s, null);
    assert.deepEqual(s.keys(), ['geyin_travel_cities']);
  });
});

describe('readJson', () => {
  it('returns fallback for missing or broken JSON', () => {
    const s = memoryStorage({ bad: '{nope' });
    assert.deepEqual(readJson(s, 'missing', []), []);
    assert.deepEqual(readJson(s, 'bad', []), []);
  });
});

describe('saved outfit images', () => {
  const expired =
    'https://x.supabase.co/storage/v1/object/sign/clothes/u1/a.jpg?token=old';
  const saved = [
    {
      id: 's1',
      pieces: [{ id: 1, image_url: expired }, { id: 2, image_path: 'u1/b.png', image_url: 'old-b' }],
      outfitData: { top: { id: 1, image_url: expired }, bottom: null },
    },
  ];

  it('collects pieces and outfit slots', () => {
    assert.equal(collectSavedOutfitImages(saved).length, 3);
  });

  it('replaces expired URLs by storage path', () => {
    const urls = new Map([
      ['u1/a.jpg', 'fresh-a'],
      ['u1/b.png', 'fresh-b'],
    ]);
    const [out] = applyImageUrls(saved, urls);
    assert.equal(out.pieces[0].image_url, 'fresh-a');
    assert.equal(out.pieces[0].image_path, 'u1/a.jpg');
    assert.equal(out.pieces[1].image_url, 'fresh-b');
    assert.equal(out.outfitData.top.image_url, 'fresh-a');
    assert.equal(out.outfitData.bottom, null);
    assert.equal(saved[0].pieces[0].image_url, expired, 'input is not mutated');
  });
});

describe('travel and manual location', () => {
  it('picks the first travel city as active', () => {
    assert.equal(pickInitialTravelPlan([{ id: 'a' }, { id: 'b' }]).id, 'a');
    assert.equal(pickInitialTravelPlan([]), null);
    assert.equal(pickInitialTravelPlan(null), null);
  });

  it('validates saved manual location', () => {
    assert.equal(isValidManualLocation({ lat: 40.4, lon: 49.8 }), true);
    assert.equal(isValidManualLocation({ lat: '40', lon: 49 }), false);
    assert.equal(isValidManualLocation(null), false);
  });
});
