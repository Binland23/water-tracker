/** localStorage model — v2 with automatic v1 migration. */
(function (global) {
  const { dayKey, uid, clamp, DEFAULT_GOAL_ML } = global.WaterUtils;

  const V1_KEY = 'water-tracker:v1';
  const STORAGE_KEY = 'water-tracker:v2';

  function defaultDew() {
    return {
      friendship: 0,
      pets: 0,
      squeezes: 0,
      flings: 0,
      lastPlayAt: 0,
      lastPlayDay: '',
      x: null,
      y: null,
    };
  }

  function defaultBottles() {
    return [{ id: 'owala', label: 'Owala', oz: 24, featured: true }];
  }

  function defaultReminders() {
    return { enabled: false, times: ['09:00', '13:00', '17:00'], lastFired: '' };
  }

  function defaultStore() {
    return {
      version: 2,
      onboarded: false,
      name: '',
      goalMl: DEFAULT_GOAL_ML,
      goalHistory: [],
      unit: 'oz',
      theme: 'system',
      wakeHour: 7,
      sleepHour: 22,
      bottles: defaultBottles(),
      customDrinks: [],
      reminders: defaultReminders(),
      soundEnabled: false,
      paceWins: 0,
      lastPaceDay: '',
      entries: [],
      achievements: {},
      achievementsSeen: {},
      achievementsSeenMigrated: true,
      achievementsResetPending: false,
      mascotEnabled: true,
      dew: defaultDew(),
    };
  }

  function normalizeDew(raw) {
    const d = defaultDew();
    if (!raw || typeof raw !== 'object') return d;
    const n = (v) => {
      const x = Number(v);
      return Number.isFinite(x) ? x : 0;
    };
    d.friendship = clamp(Math.round(n(raw.friendship)), 0, 250);
    d.pets = Math.max(0, Math.round(n(raw.pets)));
    d.squeezes = Math.max(0, Math.round(n(raw.squeezes)));
    d.flings = Math.max(0, Math.round(n(raw.flings)));
    d.lastPlayAt = Math.max(0, Math.round(n(raw.lastPlayAt)));
    if (typeof raw.lastPlayDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastPlayDay)) {
      d.lastPlayDay = raw.lastPlayDay;
    }
    if (typeof raw.x === 'number' && Number.isFinite(raw.x)) d.x = raw.x;
    if (typeof raw.y === 'number' && Number.isFinite(raw.y)) d.y = raw.y;
    return d;
  }

  function normalizeBottle(b) {
    if (!b || typeof b !== 'object') return null;
    const oz = Number(b.oz);
    if (!Number.isFinite(oz) || oz <= 0) return null;
    const id = String(b.id || uid()).slice(0, 40);
    const label = String(b.label || 'Bottle').trim().slice(0, 28) || 'Bottle';
    return { id, label, oz: clamp(oz, 1, 200), featured: b.featured !== false };
  }

  function isOwalaBottle(b) {
    if (!b) return false;
    if (b.id === 'owala') return true;
    return String(b.label || '').trim().toLowerCase() === 'owala';
  }

  function normalizeBottles(raw) {
    const list = Array.isArray(raw) ? raw.map(normalizeBottle).filter(Boolean) : [];
    const source = list.find((b) => b.id === 'owala') || list.find(isOwalaBottle) || defaultBottles()[0];
    const owala = { id: 'owala', label: 'Owala', oz: source.oz || 24, featured: true };
    const extras = [];
    const seen = new Set();
    for (const b of list) {
      if (isOwalaBottle(b)) continue;
      const key = `${String(b.label).trim().toLowerCase()}|${b.oz}`;
      if (seen.has(key)) continue;
      seen.add(key);
      extras.push(b);
    }
    return [owala, ...extras];
  }

  function normalizeCustomDrink(d) {
    if (!d || typeof d !== 'object') return null;
    const oz = Number(d.oz);
    const hydration = Number(d.hydration);
    if (!Number.isFinite(oz) || oz <= 0) return null;
    return {
      id: String(d.id || uid()).slice(0, 40),
      label: String(d.label || 'Drink').trim().slice(0, 28) || 'Drink',
      oz: clamp(oz, 1, 200),
      hydration: clamp(Number.isFinite(hydration) ? hydration : 1, 0.2, 1),
    };
  }

  function normalizeEntry(e) {
    if (!e || typeof e.ml !== 'number' || e.ml <= 0 || !e.ts) return null;
    const entry = {
      id: String(e.id || uid()),
      ml: Number(e.ml),
      ts: Number(e.ts),
    };
    if (typeof e.label === 'string' && e.label.trim()) {
      entry.label = e.label.trim().slice(0, 40);
    }
    if (typeof e.volumeMl === 'number' && e.volumeMl > 0) {
      entry.volumeMl = Math.round(e.volumeMl);
    }
    if (typeof e.hydration === 'number' && e.hydration > 0 && e.hydration < 1) {
      entry.hydration = clamp(e.hydration, 0, 1);
    }
    const sticksRaw =
      typeof e.electrolytes === 'number'
        ? e.electrolytes
        : typeof e.liquidIv === 'number'
          ? e.liquidIv
          : null;
    if (sticksRaw != null && sticksRaw >= 1) {
      entry.electrolytes = clamp(Math.round(sticksRaw), 1, 4);
    }
    if (typeof e.bottleId === 'string' && e.bottleId.trim()) {
      entry.bottleId = e.bottleId.trim().slice(0, 40);
    }
    if (typeof e.drinkId === 'string' && e.drinkId.trim()) {
      entry.drinkId = e.drinkId.trim().slice(0, 40);
    }
    return entry;
  }

  function normalizeReminders(raw) {
    const d = defaultReminders();
    if (!raw || typeof raw !== 'object') return d;
    d.enabled = !!raw.enabled;
    if (Array.isArray(raw.times)) {
      const times = raw.times
        .map((t) => String(t))
        .filter((t) => /^\d{2}:\d{2}$/.test(t))
        .slice(0, 6);
      if (times.length) d.times = times;
    }
    if (typeof raw.lastFired === 'string') d.lastFired = raw.lastFired;
    return d;
  }

  function normalizeGoalHistory(raw) {
    if (!Array.isArray(raw)) return [];
    const rows = [];
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue;
      const from = String(row.from || '');
      const goalMl = Math.round(Number(row.goalMl));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) continue;
      if (!Number.isFinite(goalMl) || goalMl < 100) continue;
      rows.push({ from, goalMl });
    }
    rows.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
    const out = [];
    for (const row of rows) {
      const last = out[out.length - 1];
      if (last && last.from === row.from) {
        last.goalMl = row.goalMl;
        continue;
      }
      if (last && last.goalMl === row.goalMl) continue;
      out.push(row);
    }
    return out;
  }

  function shiftDayKey(key, days) {
    const parts = String(key || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return key;
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    dt.setDate(dt.getDate() + days);
    return dayKey(dt);
  }

  /** Goal that applied on a given day. Past days keep the goal they were chasing. */
  function goalForDay(store, key) {
    const fallback = store.goalMl > 0 ? store.goalMl : DEFAULT_GOAL_ML;
    const hist = store.goalHistory || [];
    if (!hist.length) return fallback;
    let goal = hist[0].goalMl;
    for (const row of hist) {
      if (row.from <= key) goal = row.goalMl;
      else break;
    }
    return goal;
  }

  function dayMetGoal(store, key, total) {
    const amount = Number.isFinite(total) ? total : totalForDay(store, key);
    const goal = goalForDay(store, key);
    return amount > 0 && goal > 0 && amount >= goal;
  }

  function normalizeAchievements(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw).filter(([id, ts]) => typeof id === 'string' && Number(ts) > 0)
    );
  }

  function normalize(data) {
    const base = defaultStore();
    if (!data || typeof data !== 'object') return base;
    const theme = data.theme === 'dark' || data.theme === 'light' ? data.theme : 'system';
    const bottles = normalizeBottles(data.bottles);
    const achievements = normalizeAchievements(data.achievements);
    let achievementsSeen = normalizeAchievements(data.achievementsSeen);
    // First launch of unseen-tracking: existing unlocks are not "new".
    // Without this, the trophies badge shows the lifetime total (e.g. 31).
    const seenMigrated = data.achievementsSeenMigrated === true;
    if (!seenMigrated && Object.keys(achievementsSeen).length === 0) {
      achievementsSeen = { ...achievements };
    }
    return {
      version: 2,
      onboarded: data.onboarded === true || (Array.isArray(data.entries) && data.entries.length > 0),
      name: typeof data.name === 'string' ? data.name.trim().slice(0, 24) : '',
      goalMl: Number(data.goalMl) > 0 ? Number(data.goalMl) : DEFAULT_GOAL_ML,
      goalHistory: normalizeGoalHistory(data.goalHistory),
      unit: data.unit === 'ml' ? 'ml' : 'oz',
      theme,
      wakeHour: clamp(Math.round(Number(data.wakeHour) || 7), 0, 23),
      sleepHour: clamp(Math.round(Number(data.sleepHour) || 22), 1, 24),
      bottles,
      customDrinks: Array.isArray(data.customDrinks)
        ? data.customDrinks.map(normalizeCustomDrink).filter(Boolean).slice(0, 24)
        : [],
      reminders: normalizeReminders(data.reminders),
      soundEnabled: !!data.soundEnabled,
      paceWins: Math.max(0, Math.round(Number(data.paceWins) || 0)),
      lastPaceDay: typeof data.lastPaceDay === 'string' ? data.lastPaceDay : '',
      entries: Array.isArray(data.entries) ? data.entries.map(normalizeEntry).filter(Boolean) : [],
      achievements,
      achievementsSeen,
      achievementsSeenMigrated: true,
      achievementsResetPending: data.achievementsResetPending === true,
      mascotEnabled: data.mascotEnabled === false ? false : true,
      dew: normalizeDew(data.dew),
    };
  }

  function migrateFromV1(raw) {
    if (!raw || raw.version !== 1) return null;
    return normalize({
      ...raw,
      version: 2,
      onboarded: true,
    });
  }

  function load() {
    try {
      const raw2 = localStorage.getItem(STORAGE_KEY);
      if (raw2) {
        const parsed = JSON.parse(raw2);
        const store = normalize(parsed);
        const owalaCount = Array.isArray(parsed.bottles)
          ? parsed.bottles.filter((b) => b && (b.id === 'owala' || String(b.label || '').trim().toLowerCase() === 'owala')).length
          : 0;
        if (parsed.achievementsSeenMigrated !== true || owalaCount !== 1) save(store);
        return store;
      }
      const raw1 = localStorage.getItem(V1_KEY);
      if (raw1) {
        const migrated = migrateFromV1(JSON.parse(raw1));
        if (migrated) {
          save(migrated);
          return migrated;
        }
      }
    } catch {
      /* ignore */
    }
    return defaultStore();
  }

  function save(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function addEntry(store, ml, opts = {}) {
    const entry = { id: uid(), ml: Math.round(ml), ts: Date.now() };
    if (opts.label && String(opts.label).trim()) {
      entry.label = String(opts.label).trim().slice(0, 40);
    }
    if (typeof opts.volumeMl === 'number' && opts.volumeMl > 0) {
      entry.volumeMl = Math.round(opts.volumeMl);
    }
    if (typeof opts.hydration === 'number' && opts.hydration > 0 && opts.hydration < 1) {
      entry.hydration = clamp(opts.hydration, 0, 1);
    }
    if (typeof opts.electrolytes === 'number' && opts.electrolytes >= 1) {
      entry.electrolytes = clamp(Math.round(opts.electrolytes), 1, 4);
    }
    if (opts.bottleId) entry.bottleId = String(opts.bottleId).slice(0, 40);
    if (opts.drinkId) entry.drinkId = String(opts.drinkId).slice(0, 40);
    if (opts.ts && Number(opts.ts) > 0) entry.ts = Number(opts.ts);
    store.entries.push(entry);
    save(store);
    return entry;
  }

  function removeEntry(store, id) {
    const idx = store.entries.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const [removed] = store.entries.splice(idx, 1);
    save(store);
    return removed;
  }

  function restoreEntry(store, entry) {
    store.entries.push(entry);
    store.entries.sort((a, b) => a.ts - b.ts);
    save(store);
    return entry;
  }

  function updateEntry(store, id, patch = {}) {
    const entry = store.entries.find((e) => e.id === id);
    if (!entry) return null;
    if (typeof patch.ml === 'number' && patch.ml > 0) entry.ml = Math.round(patch.ml);
    if (typeof patch.volumeMl === 'number' && patch.volumeMl > 0) {
      entry.volumeMl = Math.round(patch.volumeMl);
    }
    if (typeof patch.hydration === 'number') {
      if (patch.hydration > 0 && patch.hydration < 1) entry.hydration = clamp(patch.hydration, 0, 1);
      else delete entry.hydration;
    }
    if (typeof patch.ts === 'number' && patch.ts > 0) entry.ts = patch.ts;
    if (typeof patch.label === 'string') {
      const t = patch.label.trim().slice(0, 40);
      if (t) entry.label = t;
      else delete entry.label;
    }
    save(store);
    return entry;
  }

  function entriesForDay(store, key = dayKey()) {
    return store.entries
      .filter((e) => dayKey(new Date(e.ts)) === key)
      .sort((a, b) => b.ts - a.ts);
  }

  function totalForDay(store, key = dayKey()) {
    return entriesForDay(store, key).reduce((sum, e) => sum + e.ml, 0);
  }

  function hourlyTotals(store, key = dayKey()) {
    const hours = Array.from({ length: 24 }, () => 0);
    for (const e of entriesForDay(store, key)) {
      hours[new Date(e.ts).getHours()] += e.ml;
    }
    return hours;
  }

  function clearToday(store) {
    const today = dayKey();
    const kept = store.entries.filter((e) => dayKey(new Date(e.ts)) !== today);
    const removed = store.entries.length - kept.length;
    store.entries = kept;
    save(store);
    return removed;
  }

  function clearAll(store) {
    store.entries = [];
    save(store);
  }

  function saveAchievements(store) {
    if (!store.achievements || typeof store.achievements !== 'object') {
      store.achievements = {};
    }
    save(store);
  }

  function resetAchievements(store) {
    store.achievements = {};
    store.achievementsSeen = {};
    store.achievementsSeenMigrated = true;
    store.achievementsResetPending = true;
    save(store);
  }

  function setGoal(store, goalMl) {
    const next = Math.max(100, Math.round(goalMl));
    const prev = store.goalMl > 0 ? store.goalMl : DEFAULT_GOAL_ML;
    if (next !== prev) {
      const today = dayKey();
      const hist = normalizeGoalHistory(store.goalHistory);
      if (!hist.length) {
        const keys = [...totalsByDay(store).keys()].sort();
        const first = keys[0] && keys[0] < today ? keys[0] : today;
        hist.push({ from: first, goalMl: prev });
      }
      const todayTotal = totalForDay(store, today);
      const keepToday = todayTotal > 0 && todayTotal >= prev;
      const from = keepToday ? shiftDayKey(today, 1) : today;
      const last = hist[hist.length - 1];
      if (last && last.from === from) last.goalMl = next;
      else if (!last || last.goalMl !== next) hist.push({ from, goalMl: next });
      store.goalHistory = normalizeGoalHistory(hist);
    }
    store.goalMl = next;
    save(store);
  }

  function setUnit(store, unit) {
    store.unit = unit === 'oz' ? 'oz' : 'ml';
    save(store);
  }

  function setTheme(store, theme) {
    store.theme = theme === 'dark' || theme === 'light' ? theme : 'system';
    save(store);
  }

  function setMascotEnabled(store, enabled) {
    store.mascotEnabled = !!enabled;
    save(store);
  }

  function saveDew(store, dew) {
    store.dew = normalizeDew(dew);
    save(store);
    return store.dew;
  }

  function setOnboarded(store, profile = {}) {
    store.onboarded = true;
    if (typeof profile.name === 'string') store.name = profile.name.trim().slice(0, 24);
    if (profile.unit === 'ml' || profile.unit === 'oz') store.unit = profile.unit;
    if (Number(profile.goalMl) > 0) store.goalMl = Math.round(profile.goalMl);
    if (Number.isFinite(Number(profile.wakeHour))) {
      store.wakeHour = clamp(Math.round(profile.wakeHour), 0, 23);
    }
    if (Number.isFinite(Number(profile.sleepHour))) {
      store.sleepHour = clamp(Math.round(profile.sleepHour), 1, 24);
    }
    save(store);
  }

  function setSchedule(store, wakeHour, sleepHour) {
    store.wakeHour = clamp(Math.round(wakeHour), 0, 23);
    store.sleepHour = clamp(Math.round(sleepHour), 1, 24);
    save(store);
  }

  function setReminders(store, reminders) {
    store.reminders = normalizeReminders({ ...store.reminders, ...reminders });
    save(store);
  }

  function setSoundEnabled(store, enabled) {
    store.soundEnabled = !!enabled;
    save(store);
  }

  function recordPaceWin(store) {
    const today = dayKey();
    if (store.lastPaceDay === today) return false;
    store.lastPaceDay = today;
    store.paceWins = (store.paceWins || 0) + 1;
    save(store);
    return true;
  }

  function addBottle(store, { label, oz }) {
    const bottle = normalizeBottle({ id: uid(), label, oz, featured: true });
    if (!bottle) return null;
    if (isOwalaBottle(bottle)) {
      const existing = (store.bottles || []).find((b) => b.id === 'owala') || defaultBottles()[0];
      existing.id = 'owala';
      existing.label = 'Owala';
      existing.oz = bottle.oz;
      existing.featured = true;
      store.bottles = normalizeBottles([existing, ...(store.bottles || [])]);
      save(store);
      return existing;
    }
    store.bottles.push(bottle);
    save(store);
    return bottle;
  }

  function removeBottle(store, id) {
    if (id === 'owala') return false;
    const before = store.bottles.length;
    store.bottles = store.bottles.filter((b) => b.id !== id);
    if (store.bottles.length === before) return false;
    save(store);
    return true;
  }

  function addCustomDrink(store, { label, oz, hydration }) {
    const drink = normalizeCustomDrink({ id: uid(), label, oz, hydration });
    if (!drink) return null;
    store.customDrinks.push(drink);
    save(store);
    return drink;
  }

  function removeCustomDrink(store, id) {
    const before = store.customDrinks.length;
    store.customDrinks = store.customDrinks.filter((d) => d.id !== id);
    if (store.customDrinks.length === before) return false;
    save(store);
    return true;
  }

  function allDrinkPresets(store) {
    const builtIn = (global.WaterUtils.DRINK_PRESETS || []).filter((d) => d.kind !== 'bottle' && d.id !== 'owala');
    return [...builtIn, ...(store.customDrinks || [])];
  }

  function resolveDrink(store, id) {
    if (!id) return null;
    const bottles = store.bottles || [];
    const bottle = bottles.find((b) => b.id === id);
    if (bottle) return { ...bottle, hydration: 1, kind: 'bottle' };
    const custom = (store.customDrinks || []).find((d) => d.id === id);
    if (custom) return { ...custom, kind: 'drink' };
    return global.WaterUtils.drinkById(id);
  }

  function weekTotals(store, days = 7) {
    const out = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      out.push({ key, date: d, total: totalForDay(store, key) });
    }
    return out;
  }

  function monthTotals(store, year, monthIndex) {
    const first = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const startWeekday = first.getDay();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ empty: true });
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const key = dayKey(date);
      cells.push({ empty: false, key, date, day, total: totalForDay(store, key) });
    }
    return { year, monthIndex, first, daysInMonth, cells };
  }

  function daysWithEntries(store) {
    const set = new Set();
    for (const e of store.entries) set.add(dayKey(new Date(e.ts)));
    return [...set].sort();
  }

  function totalsByDay(store) {
    const map = new Map();
    for (const e of store.entries) {
      const key = dayKey(new Date(e.ts));
      map.set(key, (map.get(key) || 0) + e.ml);
    }
    return map;
  }

  function drinkMix(store, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);
    const sinceTs = since.getTime();
    const buckets = new Map();
    for (const e of store.entries) {
      if (e.ts < sinceTs) continue;
      let key = 'Water';
      if (typeof e.electrolytes === 'number' && e.electrolytes >= 1) key = 'ELECTROLYTES';
      else if (e.label) key = e.label;
      const row = buckets.get(key) || { label: key, ml: 0, count: 0 };
      row.ml += e.ml;
      row.count += 1;
      buckets.set(key, row);
    }
    return [...buckets.values()].sort((a, b) => b.ml - a.ml);
  }

  function lifetimeMl(store) {
    return store.entries.reduce((s, e) => s + (e.ml || 0), 0);
  }

  function daysMet(store, days = 7) {
    return weekTotals(store, days).filter((d) => dayMetGoal(store, d.key, d.total)).length;
  }

  function currentStreak(store, opts = {}) {
    const fromKey = opts.fromKey || dayKey();
    const totals = totalsByDay(store);
    const requireToday = !!opts.requireToday;
    const met = (key) => dayMetGoal(store, key, totals.get(key) || 0);

    const start = fromKey.split('-').map(Number);
    const cursor = new Date(start[0], start[1] - 1, start[2]);
    const todayMet = met(dayKey(cursor));
    if (requireToday && !todayMet) return 0;
    if (!requireToday && !todayMet) cursor.setDate(cursor.getDate() - 1);

    let streak = 0;
    for (let i = 0; i < 800; i++) {
      const key = dayKey(cursor);
      if (!met(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function longestStreak(store) {
    const totals = totalsByDay(store);
    const keys = [...totals.keys()].filter((k) => dayMetGoal(store, k, totals.get(k) || 0)).sort();
    if (!keys.length) return 0;
    let best = 1;
    let run = 1;
    for (let i = 1; i < keys.length; i++) {
      const prev = keys[i - 1].split('-').map(Number);
      const cur = keys[i].split('-').map(Number);
      const prevDate = new Date(prev[0], prev[1] - 1, prev[2]);
      const curDate = new Date(cur[0], cur[1] - 1, cur[2]);
      const diff = (curDate - prevDate) / 86400000;
      if (diff === 1) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 1;
      }
    }
    return best;
  }

  function exportJson(store) {
    return JSON.stringify(store, null, 2);
  }

  function importJson(store, raw) {
    let data = raw;
    if (typeof raw === 'string') data = JSON.parse(raw);
    if (!data || typeof data !== 'object') throw new Error('Not a Water Tracker backup.');
    const incoming = data.version === 1 ? migrateFromV1(data) : normalize(data);
    if (!incoming) throw new Error('Could not read that backup.');
    const keepAchievements = { ...store.achievements, ...incoming.achievements };
    const keepSeen = { ...store.achievementsSeen, ...incoming.achievementsSeen };
    const merged = normalize({
      ...incoming,
      achievements: keepAchievements,
      achievementsSeen: keepSeen,
      achievementsSeenMigrated:
        incoming.achievementsSeenMigrated === true || Object.keys(keepSeen).length > 0,
      onboarded: true,
    });
    Object.keys(store).forEach((k) => {
      delete store[k];
    });
    Object.assign(store, merged);
    save(store);
    return store;
  }

  function insights(store) {
    const unit = store.unit;
    const goal = store.goalMl;
    const week = weekTotals(store, 7);
    const weekMl = week.reduce((s, d) => s + d.total, 0);
    const met = week.filter((d) => dayMetGoal(store, d.key, d.total)).length;
    const best = week.reduce((a, d) => (d.total > a.total ? d : a), week[0] || { total: 0 });
    const life = lifetimeMl(store);
    return {
      unit,
      goal,
      week,
      weekMl,
      weekGoal: goal * 7,
      daysMet: met,
      best,
      streak: currentStreak(store),
      longest: longestStreak(store),
      lifetimeMl: life,
      mix: drinkMix(store, 7),
      hours: hourlyTotals(store),
    };
  }

  global.WaterStorage = {
    STORAGE_KEY,
    V1_KEY,
    DEFAULT_GOAL_ML,
    load,
    save,
    addEntry,
    removeEntry,
    restoreEntry,
    updateEntry,
    entriesForDay,
    totalForDay,
    hourlyTotals,
    clearToday,
    clearAll,
    setGoal,
    setUnit,
    setTheme,
    setMascotEnabled,
    setOnboarded,
    setSchedule,
    setReminders,
    setSoundEnabled,
    recordPaceWin,
    addBottle,
    removeBottle,
    addCustomDrink,
    removeCustomDrink,
    allDrinkPresets,
    resolveDrink,
    defaultDew,
    normalizeDew,
    saveDew,
    weekTotals,
    monthTotals,
    daysWithEntries,
    totalsByDay,
    drinkMix,
    lifetimeMl,
    daysMet,
    currentStreak,
    longestStreak,
    goalForDay,
    dayMetGoal,
    insights,
    exportJson,
    importJson,
    saveAchievements,
    resetAchievements,
    defaultBottles,
    isOwalaBottle,
  };
})(typeof window !== 'undefined' ? window : globalThis);
