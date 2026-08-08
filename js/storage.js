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
      return {
        version: 1,
        goalMl: Number(data.goalMl) > 0 ? Number(data.goalMl) : DEFAULT_GOAL_ML,
        unit: data.unit === 'ml' ? 'ml' : 'oz',
        entries: data.entries.map(normalizeEntry).filter(Boolean),
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
   * @param {{ label?: string, volumeMl?: number, hydration?: number }} opts
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
    weekTotals,
    monthTotals,
    daysWithEntries,
    exportJson,
  };
})(typeof window !== 'undefined' ? window : globalThis);
