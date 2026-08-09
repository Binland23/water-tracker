/** Unit conversion and small helpers. Internal storage is always millilitres. */
(function (global) {
  const ML_PER_OZ = 29.5735;

  function mlToOz(ml) {
    return ml / ML_PER_OZ;
  }

  function ozToMl(oz) {
    return oz * ML_PER_OZ;
  }

  /** Convert a display amount in the given unit to ml. */
  function toMl(amount, unit) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    return unit === 'oz' ? ozToMl(n) : n;
  }

  function round(n, decimals = 0) {
    const f = 10 ** decimals;
    return Math.round(n * f) / f;
  }

  /** Format ml for display in the given unit (no unit label). */
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

  /** Local calendar day key YYYY-MM-DD */
  function dayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDayKey(key) {
    const [y, m, d] = key.split('-').map(Number);
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

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  const QUICK_ADDS_ML = [250, 500, 750];
  const OWALA_OZ = 24;
  const OWALA_ML = Math.round(ozToMl(OWALA_OZ));

  /**
   * Drink presets with hydration factors (0–1).
   * hydration = fraction of volume that counts toward the water goal.
   * Pure water = 1.0; caffeinated & sugary drinks count less.
   *
   * Iced latte (Vertuo Melozio + milk, 21 oz glass) — ingredient math:
   *   Melozio Vertuo mug brew: 7.77 fl oz (~230 ml) @ coffee 80%
   *   Ice (typical iced fill): ~6.5 oz @ 100% (melts to water)
   *   Milk (fills remainder):  21 − 7.77 − 6.5 ≈ 6.73 oz @ 90%
   *   Water credit: 7.77×0.8 + 6.5×1.0 + 6.73×0.9 ≈ 18.78 oz
   *   Effective hydration: 18.78 / 21 ≈ 0.89
   */
  const DRINK_PRESETS = Object.freeze([
    { id: 'owala', label: 'Owala', oz: OWALA_OZ, hydration: 1 },
    { id: 'iced-latte', label: 'Iced latte', oz: 21, hydration: 0.89 },
    { id: 'tea', label: 'Tea', oz: 8, hydration: 0.9 },
    { id: 'coffee', label: 'Coffee', oz: 8, hydration: 0.8 },
    { id: 'soda', label: 'Soda', oz: 12, hydration: 0.75 },
    { id: 'juice', label: 'Juice', oz: 8, hydration: 0.85 },
    { id: 'smoothie', label: 'Fruit smoothie', oz: 12, hydration: 0.85 },
    { id: 'sports', label: 'Sports drink', oz: 20, hydration: 0.9 },
  ]);

  function drinkById(id) {
    return DRINK_PRESETS.find((d) => d.id === id) || null;
  }

  /** Default quick size when logging a drink from the sheet (fl oz). */
  const DRINK_QUICK_OZ = 8;

  /** Full drink volume in ml (legacy preset size). */
  function drinkVolumeMl(preset) {
    return Math.round(ozToMl(preset.oz));
  }

  /** Effective water for a poured volume + drink hydration factor. */
  function waterFromVolume(volumeMl, hydration) {
    const factor = Number.isFinite(hydration) ? clamp(hydration, 0, 1) : 1;
    return Math.round(Number(volumeMl) * factor);
  }

  /** Effective water ml for the preset’s default size. */
  function drinkWaterMl(preset) {
    return waterFromVolume(drinkVolumeMl(preset), preset.hydration);
  }

  /** @deprecated use drinkVolumeMl — kept for any external callers */
  function drinkMl(preset) {
    return drinkWaterMl(preset);
  }

  function hydrationPercent(factor) {
    const f = Number.isFinite(factor) ? clamp(factor, 0, 1) : 1;
    return Math.round(f * 100);
  }

  /**
   * Chip subtitle: hydration note + prompt to choose amount.
   */
  function formatDrinkChip(preset, unit) {
    const pct = hydrationPercent(preset.hydration);
    if (pct >= 100) {
      return `100% water · tap for amount`;
    }
    return `${pct}% water · tap for amount`;
  }

  /**
   * Electrolytes mixed into water (e.g. stick packs).
   *
   * The poured drink still counts as plain water volume toward the goal —
   * electrolytes are not extra fluid. We only tag the entry (sticks + FX)
   * so the log can show you charged electrolytes, without inventing ounces.
   */
  const ELECTROLYTES = Object.freeze({
    id: 'electrolytes',
    label: 'ELECTROLYTES',
    /** Recommended mix size (fl oz) for one stick. */
    defaultOz: 16,
    /** Default stick packs when opening the sheet. */
    defaultSticks: 1,
    minSticks: 1,
    maxSticks: 4,
  });

  /** Clamp stick packs to the allowed range. */
  function electrolytesSticksClamp(sticks) {
    return clamp(
      Math.round(Number(sticks) || 1),
      ELECTROLYTES.minSticks,
      ELECTROLYTES.maxSticks
    );
  }

  /**
   * Water credit for an electrolytes mix = poured volume only (100% water).
   * Sticks are recorded for the log / animation, not multiplied into ml.
   * @param {number} volumeMl Poured drink volume
   */
  function electrolytesWaterMl(volumeMl) {
    const vol = Math.max(0, Number(volumeMl) || 0);
    if (vol <= 0) return 0;
    return Math.round(vol);
  }

  global.WaterUtils = {
    ML_PER_OZ,
    mlToOz,
    ozToMl,
    toMl,
    formatAmount,
    formatAmountWithUnit,
    round,
    dayKey,
    parseDayKey,
    addDays,
    formatDayLabel,
    formatMonthYear,
    formatTime,
    uid,
    clamp,
    QUICK_ADDS_ML,
    OWALA_OZ,
    OWALA_ML,
    DRINK_QUICK_OZ,
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
  };
})(typeof window !== 'undefined' ? window : globalThis);
