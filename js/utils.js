/** Units, dates, drinks, pace. Internal storage is always millilitres. */
(function (global) {
  const ML_PER_OZ = 29.5735;
  const DEFAULT_GOAL_ML = 2000;
  const QUICK_ADDS_ML = [250, 500, 750];
  const OWALA_OZ = 24;
  const OWALA_ML = Math.round(OWALA_OZ * ML_PER_OZ);

  function mlToOz(ml) {
    return ml / ML_PER_OZ;
  }

  function ozToMl(oz) {
    return oz * ML_PER_OZ;
  }

  function toMl(amount, unit) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    return unit === 'oz' ? ozToMl(n) : n;
  }

  function round(n, decimals = 0) {
    const f = 10 ** decimals;
    return Math.round(n * f) / f;
  }

  function formatAmount(ml, unit, { decimals } = {}) {
    if (unit === 'oz') {
      const oz = mlToOz(ml);
      const d = decimals ?? (oz < 10 ? 1 : 0);
      return round(oz, d).toString();
    }
    const d = decimals ?? 0;
    return round(ml, d).toString();
  }

  function formatAmountWithUnit(ml, unit) {
    return `${formatAmount(ml, unit)} ${unit === 'oz' ? 'oz' : 'ml'}`;
  }

  function formatLiters(ml) {
    const l = ml / 1000;
    if (l < 10) return `${round(l, 1)} L`;
    return `${round(l, 0)} L`;
  }

  function dayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDayKey(key) {
    const [y, m, d] = String(key).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(date, delta) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    return d;
  }

  function formatDayLabel(date, { short = false } = {}) {
    const opts = short
      ? { weekday: 'short' }
      : { weekday: 'long', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, opts);
  }

  function formatMonthYear(date) {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatHour(hour) {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: 'numeric' });
  }

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /**
   * Drink presets. hydration = fraction of poured volume that counts as water.
   * Iced latte (Vertuo Melozio + milk, 21 oz): 7.77 oz coffee @80% + ~6.5 oz ice
   * @100% + ~6.73 oz milk @90% → ~18.78 oz water / 21 oz ≈ 0.89
   */
  const DRINK_PRESETS = Object.freeze([
    { id: 'owala', label: 'Owala', oz: OWALA_OZ, hydration: 1, kind: 'bottle' },
    { id: 'iced-latte', label: 'Iced latte', oz: 21, hydration: 0.89, kind: 'drink' },
    { id: 'tea', label: 'Tea', oz: 8, hydration: 0.9, kind: 'drink' },
    { id: 'coffee', label: 'Coffee', oz: 8, hydration: 0.8, kind: 'drink' },
    { id: 'soda', label: 'Soda', oz: 12, hydration: 0.75, kind: 'drink' },
    { id: 'juice', label: 'Juice', oz: 8, hydration: 0.85, kind: 'drink' },
    { id: 'smoothie', label: 'Fruit smoothie', oz: 12, hydration: 0.85, kind: 'drink' },
    { id: 'sports', label: 'Sports drink', oz: 20, hydration: 0.9, kind: 'drink' },
  ]);

  function drinkById(id) {
    return DRINK_PRESETS.find((d) => d.id === id) || null;
  }

  function drinkVolumeMl(preset) {
    return Math.round(ozToMl(preset.oz));
  }

  function waterFromVolume(volumeMl, hydration) {
    const factor = Number.isFinite(hydration) ? clamp(hydration, 0, 1) : 1;
    return Math.round(Number(volumeMl) * factor);
  }

  function drinkWaterMl(preset) {
    return waterFromVolume(drinkVolumeMl(preset), preset.hydration);
  }

  function drinkMl(preset) {
    return drinkWaterMl(preset);
  }

  function hydrationPercent(factor) {
    const f = Number.isFinite(factor) ? clamp(factor, 0, 1) : 1;
    return Math.round(f * 100);
  }

  function formatDrinkChip(preset) {
    const pct = hydrationPercent(preset.hydration);
    return pct >= 100 ? '100% water · tap for amount' : `${pct}% water · tap for amount`;
  }

  const ELECTROLYTES = Object.freeze({
    id: 'electrolytes',
    label: 'ELECTROLYTES',
    defaultOz: 16,
    defaultSticks: 1,
    minSticks: 1,
    maxSticks: 4,
  });

  function electrolytesSticksClamp(sticks) {
    return clamp(Math.round(Number(sticks) || 1), ELECTROLYTES.minSticks, ELECTROLYTES.maxSticks);
  }

  function electrolytesWaterMl(volumeMl) {
    const vol = Math.max(0, Number(volumeMl) || 0);
    return vol <= 0 ? 0 : Math.round(vol);
  }

  /**
   * Daily goal from body + lifestyle.
   * Base: 0.5 fl oz per pound of body weight (common clinical rule of thumb).
   */
  function goalFromProfile({ weight, weightUnit = 'lb', activity = 'light', climate = 'mild' } = {}) {
    let lb = Number(weight);
    if (!Number.isFinite(lb) || lb <= 0) return null;
    if (weightUnit === 'kg') lb = lb * 2.20462;
    const activityMul = { sedentary: 1, light: 1.1, moderate: 1.2, active: 1.35 }[activity] || 1.1;
    const climateMul = { cool: 1, mild: 1, warm: 1.1, hot: 1.2 }[climate] || 1;
    const oz = lb * 0.5 * activityMul * climateMul;
    return Math.max(800, Math.round(ozToMl(oz)));
  }

  /**
   * Expected water by now, linear from wakeHour → sleepHour.
   * @returns {{ expected: number, ratio: number, state: 'ahead'|'on-track'|'behind'|'done'|'early'|'rest', pctOfDay: number }}
   */
  function paceFor(total, goal, { wakeHour = 7, sleepHour = 22, now = new Date() } = {}) {
    const g = goal > 0 ? goal : DEFAULT_GOAL_ML;
    const wake = clamp(Number(wakeHour) || 7, 0, 23);
    let sleep = clamp(Number(sleepHour) || 22, 1, 24);
    if (sleep <= wake) sleep = wake + 1;
    const minutes = now.getHours() * 60 + now.getMinutes();
    const wakeM = wake * 60;
    const sleepM = sleep * 60;
    const span = Math.max(60, sleepM - wakeM);
    let pctOfDay = 0;
    if (minutes <= wakeM) pctOfDay = 0;
    else if (minutes >= sleepM) pctOfDay = 1;
    else pctOfDay = (minutes - wakeM) / span;
    const expected = Math.round(g * pctOfDay);
    const reached = total >= g && g > 0 && total > 0;
    if (reached) return { expected, ratio: g ? total / g : 0, state: 'done', pctOfDay };
    if (minutes < wakeM) return { expected: 0, ratio: 0, state: 'early', pctOfDay: 0 };
    if (minutes >= sleepM) {
      const state = total >= g * 0.9 ? 'on-track' : 'behind';
      return { expected: g, ratio: g ? total / g : 0, state, pctOfDay: 1 };
    }
    const slack = g * 0.12;
    let state = 'on-track';
    if (total >= expected + slack) state = 'ahead';
    else if (total < expected - slack) state = 'behind';
    return { expected, ratio: expected > 0 ? total / expected : 1, state, pctOfDay };
  }

  function paceCopy(state, leftMl, unit) {
    if (state === 'done') return 'Goal met — keep a gentle sip if you like';
    if (state === 'early') return 'Day hasn’t started yet. First sip whenever you’re ready.';
    if (state === 'ahead') return 'Ahead of pace. Nice and steady.';
    if (state === 'behind') {
      return leftMl > 0
        ? `${formatAmountWithUnit(leftMl, unit)} behind where the day usually is`
        : 'A little behind pace';
    }
    return 'On track for today';
  }

  function hourFromTs(ts) {
    return new Date(ts).getHours();
  }

  function sameLocalDay(a, b) {
    return dayKey(a) === dayKey(b);
  }

  function prefersReducedMotion() {
    try {
      return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  global.WaterUtils = {
    ML_PER_OZ,
    DEFAULT_GOAL_ML,
    mlToOz,
    ozToMl,
    toMl,
    formatAmount,
    formatAmountWithUnit,
    formatLiters,
    round,
    dayKey,
    parseDayKey,
    addDays,
    formatDayLabel,
    formatMonthYear,
    formatTime,
    formatHour,
    uid,
    clamp,
    QUICK_ADDS_ML,
    OWALA_OZ,
    OWALA_ML,
    DRINK_PRESETS,
    drinkById,
    drinkMl,
    drinkVolumeMl,
    drinkWaterMl,
    waterFromVolume,
    hydrationPercent,
    formatDrinkChip,
    ELECTROLYTES,
    electrolytesSticksClamp,
    electrolytesWaterMl,
    goalFromProfile,
    paceFor,
    paceCopy,
    hourFromTs,
    sameLocalDay,
    prefersReducedMotion,
  };
})(typeof window !== 'undefined' ? window : globalThis);
