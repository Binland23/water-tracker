/** localStorage model for water entries. */
(function (global) {
  const { dayKey, uid } = global.WaterUtils;

  const STORAGE_KEY = 'water-tracker:v1';
  const DEFAULT_GOAL_ML = 2000;

  function defaultStore() {
    return {
      version: 1,
      goalMl: DEFAULT_GOAL_ML,
      unit: 'ml',
      entries: [],
    };
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
        unit: data.unit === 'oz' ? 'oz' : 'ml',
        entries: data.entries
          .filter((e) => e && typeof e.ml === 'number' && e.ml > 0 && e.ts)
          .map((e) => {
            const entry = {
              id: String(e.id || uid()),
              ml: Number(e.ml),
              ts: Number(e.ts),
            };
            if (typeof e.label === 'string' && e.label.trim()) {
              entry.label = e.label.trim().slice(0, 40);
            }
            return entry;
          }),
      };
    } catch {
      return defaultStore();
    }
  }

  function save(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function addEntry(store, ml, opts = {}) {
    const entry = { id: uid(), ml: Math.round(ml), ts: Date.now() };
    if (opts.label && String(opts.label).trim()) {
      entry.label = String(opts.label).trim().slice(0, 40);
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
    exportJson,
  };
})(typeof window !== 'undefined' ? window : globalThis);
