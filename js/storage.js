/** localStorage model for water entries. */
(function (global) {
  const { dayKey, uid, clamp } = global.WaterUtils;

  const STORAGE_KEY = 'water-tracker:v1';
  const DEFAULT_GOAL_ML = 2000;

  function defaultStore() {
    return {
      version: 1,
      goalMl: DEFAULT_GOAL_ML,
      unit: 'oz',
      entries: [],
      /** @type {Record<string, number>} achievementId → unlockedAt ms */
      achievements: {},
      /** Show Dew the water-drop mascot (default on). */
      mascotEnabled: true,
    };
  }

  function normalizeEntry(e) {
    if (!e || typeof e.ml !== 'number' || e.ml <= 0 || !e.ts) return null;
    const entry = {
      id: String(e.id || uid()),
      /** Effective water toward goal (always what totals use). */
      ml: Number(e.ml),
      ts: Number(e.ts),
    };
    if (typeof e.label === 'string' && e.label.trim()) {
      entry.label = e.label.trim().slice(0, 40);
    }
    // Optional: actual poured volume when different from effective water
    if (typeof e.volumeMl === 'number' && e.volumeMl > 0) {
      entry.volumeMl = Math.round(e.volumeMl);
    }
    if (typeof e.hydration === 'number' && e.hydration > 0 && e.hydration < 1) {
      entry.hydration = clamp(e.hydration, 0, 1);
    }
    // Electrolyte stick packs (1–4) — tag only; does not change ml
    // Accept legacy `liquidIv` key from earlier builds
    const sticksRaw =
      typeof e.electrolytes === 'number'
        ? e.electrolytes
        : typeof e.liquidIv === 'number'
          ? e.liquidIv
          : null;
    if (sticksRaw != null && sticksRaw >= 1) {
      entry.electrolytes = clamp(Math.round(sticksRaw), 1, 4);
    }
    return entry;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultStore();
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Array.isArray(data.entries)) {
        return defaultStore();
      }
      const achievements =
        data.achievements && typeof data.achievements === 'object' && !Array.isArray(data.achievements)
          ? Object.fromEntries(
              Object.entries(data.achievements).filter(
                ([id, ts]) => typeof id === 'string' && Number(ts) > 0
              )
            )
          : {};
      return {
        version: 1,
        goalMl: Number(data.goalMl) > 0 ? Number(data.goalMl) : DEFAULT_GOAL_ML,
        unit: data.unit === 'ml' ? 'ml' : 'oz',
        entries: data.entries.map(normalizeEntry).filter(Boolean),
        achievements,
        mascotEnabled: data.mascotEnabled === false ? false : true,
      };
    } catch {
      return defaultStore();
    }
  }

  function save(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  /**
   * @param {number} ml Effective water ml (counts toward goal)
   * @param {{ label?: string, volumeMl?: number, hydration?: number, electrolytes?: number }} opts
   */
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
    // Stick packs mixed in — cosmetic / log metadata only
    if (typeof opts.electrolytes === 'number' && opts.electrolytes >= 1) {
      entry.electrolytes = clamp(Math.round(opts.electrolytes), 1, 4);
    }
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

  function entriesForDay(store, key = dayKey()) {
    return store.entries
      .filter((e) => dayKey(new Date(e.ts)) === key)
      .sort((a, b) => b.ts - a.ts);
  }

  function totalForDay(store, key = dayKey()) {
    return entriesForDay(store, key).reduce((sum, e) => sum + e.ml, 0);
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
    // Keep achievements — history wipe shouldn't erase hard-earned badges.
    // Callers can clear achievements separately if desired.
    save(store);
  }

  /** Persist achievement map after unlocks (achievements.js mutates store.achievements). */
  function saveAchievements(store) {
    if (!store.achievements || typeof store.achievements !== 'object') {
      store.achievements = {};
    }
    save(store);
  }

  function setGoal(store, goalMl) {
    store.goalMl = Math.max(100, Math.round(goalMl));
    save(store);
  }

  function setUnit(store, unit) {
    store.unit = unit === 'oz' ? 'oz' : 'ml';
    save(store);
  }

  function setMascotEnabled(store, enabled) {
    store.mascotEnabled = !!enabled;
    save(store);
  }

  function weekTotals(store, days = 7) {
    const out = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      out.push({
        key,
        date: d,
        total: totalForDay(store, key),
      });
    }
    return out;
  }

  /** All day keys that have at least one entry, sorted ascending. */
  function daysWithEntries(store) {
    const set = new Set();
    for (const e of store.entries) {
      set.add(dayKey(new Date(e.ts)));
    }
    return [...set].sort();
  }

  /**
   * Calendar month cells: leading blanks + days of month.
   * Each day cell: { key, date, day, total, inMonth: true }
   */
  function monthTotals(store, year, monthIndex) {
    const first = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    // 0=Sun … 6=Sat — match typical US calendar start
    const startWeekday = first.getDay();
    const cells = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ empty: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const key = dayKey(date);
      cells.push({
        empty: false,
        key,
        date,
        day,
        total: totalForDay(store, key),
      });
    }

    return { year, monthIndex, first, daysInMonth, cells };
  }

  function exportJson(store) {
    return JSON.stringify(store, null, 2);
  }

  /**
   * Map of dayKey → total ml for every day that has entries.
   * @returns {Map<string, number>}
   */
  function totalsByDay(store) {
    const map = new Map();
    for (const e of store.entries) {
      const key = dayKey(new Date(e.ts));
      map.set(key, (map.get(key) || 0) + e.ml);
    }
    return map;
  }

  /**
   * Consecutive days meeting the goal, counting backward from `fromKey` (default: today).
   * If today is not yet met, still counts a streak ending yesterday (active chain).
   * When `requireToday` is true, returns 0 unless `fromKey` itself met the goal
   * (used for celebration at the moment the goal is hit).
   * @param {object} store
   * @param {{ fromKey?: string, requireToday?: boolean }} [opts]
   */
  function currentStreak(store, opts = {}) {
    const goal = store.goalMl > 0 ? store.goalMl : DEFAULT_GOAL_ML;
    const fromKey = opts.fromKey || dayKey();
    const totals = totalsByDay(store);
    const requireToday = !!opts.requireToday;

    const start = fromKey.split('-').map(Number);
    let y = start[0];
    let m = start[1];
    let d = start[2];

    const met = (key) => (totals.get(key) || 0) >= goal && (totals.get(key) || 0) > 0;

    // Walk calendar days backward
    let streak = 0;
    let cursor = new Date(y, m - 1, d);
    const todayMet = met(dayKey(cursor));

    if (requireToday && !todayMet) return 0;

    // If today isn't done yet and we aren't requiring today, start from yesterday
    if (!requireToday && !todayMet) {
      cursor.setDate(cursor.getDate() - 1);
    }

    for (let i = 0; i < 800; i++) {
      const key = dayKey(cursor);
      if (!met(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  /** Longest consecutive goal-met stretch in history. */
  function longestStreak(store) {
    const goal = store.goalMl > 0 ? store.goalMl : DEFAULT_GOAL_ML;
    const totals = totalsByDay(store);
    const keys = [...totals.keys()].filter((k) => (totals.get(k) || 0) >= goal).sort();
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

  global.WaterStorage = {
    STORAGE_KEY,
    DEFAULT_GOAL_ML,
    load,
    save,
    addEntry,
    removeEntry,
    restoreEntry,
    entriesForDay,
    totalForDay,
    clearToday,
    clearAll,
    setGoal,
    setUnit,
    setMascotEnabled,
    weekTotals,
    monthTotals,
    daysWithEntries,
    totalsByDay,
    currentStreak,
    longestStreak,
    exportJson,
    saveAchievements,
  };
})(typeof window !== 'undefined' ? window : globalThis);
