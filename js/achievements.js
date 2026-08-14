/**
 * Fun achievements for Water Tracker 2.0.
 * Unlocks are stored on the main store under `achievements: { [id]: unlockedAtMs }`.
 */
(function (global) {
  const { dayKey, parseDayKey } = global.WaterUtils;

  /** @typedef {{ id: string, title: string, desc: string, icon: string, category: string, secret?: boolean }} AchievementDef */

  /** @type {AchievementDef[]} */
  const CATALOG = Object.freeze([
    // —— Firsts ——
    {
      id: 'first-sip',
      title: 'First Sip',
      desc: 'Log your very first drink.',
      icon: '💧',
      category: 'Firsts',
    },
    {
      id: 'half-full',
      title: 'Glass Half Full',
      desc: 'Reach 50% of your daily goal.',
      icon: '🫧',
      category: 'Daily',
    },
    {
      id: 'goal-met',
      title: 'Hydration Hero',
      desc: 'Hit your daily water goal once.',
      icon: '🏆',
      category: 'Daily',
    },
    {
      id: 'overachiever',
      title: 'Overachiever',
      desc: 'Go 10% past your daily goal.',
      icon: '🚀',
      category: 'Daily',
    },
    {
      id: 'double-down',
      title: 'Double Down',
      desc: 'Hit 200% of your goal in one day.',
      icon: '🐳',
      category: 'Daily',
    },
    {
      id: 'gallon-club',
      title: 'Gallon Club',
      desc: 'Drink a full gallon (~128 oz) in one day.',
      icon: '🫗',
      category: 'Daily',
    },

    // —— Owala ——
    {
      id: 'owala-initiate',
      title: 'Owala Initiate',
      desc: 'Log your first full Owala bottle.',
      icon: '🍼',
      category: 'Owala',
    },
    {
      id: 'owala-triple',
      title: 'Triple Threat',
      desc: 'Log 3 Owalas in a single day.',
      icon: '3️⃣',
      category: 'Owala',
    },
    {
      id: 'owala-ten',
      title: 'Bottle Loyalty',
      desc: 'Log 10 Owalas total (lifetime).',
      icon: '💙',
      category: 'Owala',
    },
    {
      id: 'owala-fifty',
      title: 'Owala Superfan',
      desc: 'Log 50 Owalas lifetime. Dedication.',
      icon: '👑',
      category: 'Owala',
    },

    // —— Electrolytes ——
    {
      id: 'ely-first',
      title: 'Fully Charged',
      desc: 'Log your first ELECTROLYTES mix.',
      icon: '⚡',
      category: 'Electrolytes',
    },
    {
      id: 'ely-storm',
      title: 'Storm Chaser',
      desc: 'Mix 2 or more sticks in one pour.',
      icon: '🌩️',
      category: 'Electrolytes',
    },
    {
      id: 'ely-ten',
      title: 'Lightning Rod',
      desc: 'Log ELECTROLYTES 10 times.',
      icon: '🔋',
      category: 'Electrolytes',
    },
    {
      id: 'ely-goal',
      title: 'Charged & Complete',
      desc: 'Meet your goal on a day you logged electrolytes.',
      icon: '✨',
      category: 'Electrolytes',
    },

    // —— Drink variety ——
    {
      id: 'coffee-run',
      title: 'Coffee Run',
      desc: 'Log a coffee.',
      icon: '☕',
      category: 'Drinks',
    },
    {
      id: 'tea-time',
      title: 'Tea Time',
      desc: 'Log a tea.',
      icon: '🍵',
      category: 'Drinks',
    },
    {
      id: 'latte-love',
      title: 'Latte Love',
      desc: 'Log an iced latte.',
      icon: '🧊',
      category: 'Drinks',
    },
    {
      id: 'soda-pop',
      title: 'Soda Pop',
      desc: 'Log a soda (counts less — still counts!).',
      icon: '🥤',
      category: 'Drinks',
    },
    {
      id: 'smoothie-op',
      title: 'Smoothie Operator',
      desc: 'Log a fruit smoothie.',
      icon: '🫐',
      category: 'Drinks',
    },
    {
      id: 'juice-box',
      title: 'Juice Box',
      desc: 'Log juice.',
      icon: '🧃',
      category: 'Drinks',
    },
    {
      id: 'sports-mode',
      title: 'Sports Mode',
      desc: 'Log a sports drink.',
      icon: '🏃',
      category: 'Drinks',
    },
    {
      id: 'variety-pack',
      title: 'Variety Pack',
      desc: 'Log 4 different drink types in one day.',
      icon: '🌈',
      category: 'Drinks',
    },
    {
      id: 'pure-day',
      title: 'Pure Day',
      desc: 'Meet your goal with only water, Owala, or electrolytes (no coffee/soda/etc.).',
      icon: '💎',
      category: 'Drinks',
    },

    // —— Streaks ——
    {
      id: 'streak-3',
      title: 'Threepeat',
      desc: 'Hit your goal 3 days in a row.',
      icon: '🔥',
      category: 'Streaks',
    },
    {
      id: 'streak-7',
      title: 'Week Warrior',
      desc: '7-day goal streak.',
      icon: '🗓️',
      category: 'Streaks',
    },
    {
      id: 'streak-14',
      title: 'Fortnight Fluid',
      desc: '14-day goal streak.',
      icon: '💪',
      category: 'Streaks',
    },
    {
      id: 'streak-30',
      title: 'Monthly Mariner',
      desc: '30-day goal streak. Unstoppable.',
      icon: '🌊',
      category: 'Streaks',
    },
    {
      id: 'streak-100',
      title: 'Century Club',
      desc: '100-day goal streak. Absolute legend.',
      icon: '🏅',
      category: 'Streaks',
    },
    {
      id: 'streak-365',
      title: 'Solar Cycle',
      desc: '365-day goal streak.',
      icon: '☀️',
      category: 'Streaks',
    },

    // —— Lifetime volume ——
    {
      id: 'life-1l',
      title: 'Drop in the Bucket',
      desc: 'Log 1 liter total lifetime water.',
      icon: '💧',
      category: 'Lifetime',
    },
    {
      id: 'life-10l',
      title: 'Puddle Hopper',
      desc: 'Log 10 liters lifetime.',
      icon: '🐸',
      category: 'Lifetime',
    },
    {
      id: 'life-50l',
      title: 'Creek Explorer',
      desc: 'Log 50 liters lifetime.',
      icon: '🏞️',
      category: 'Lifetime',
    },
    {
      id: 'life-100l',
      title: 'River Runner',
      desc: 'Log 100 liters lifetime.',
      icon: '🛶',
      category: 'Lifetime',
    },
    {
      id: 'life-500l',
      title: 'Lake Legend',
      desc: 'Log 500 liters lifetime. You absolute unit.',
      icon: '🧜',
      category: 'Lifetime',
    },
    {
      id: 'life-1000l',
      title: 'Inland Sea',
      desc: 'Log 1,000 liters lifetime.',
      icon: '🐋',
      category: 'Lifetime',
    },

    // —— Habits & timing ——
    {
      id: 'early-bird',
      title: 'Early Bird',
      desc: 'Log a drink before 9:00 AM.',
      icon: '🐦',
      category: 'Habits',
    },
    {
      id: 'night-owl',
      title: 'Night Owl',
      desc: 'Log a drink after 9:00 PM.',
      icon: '🦉',
      category: 'Habits',
    },
    {
      id: 'sip-sip',
      title: 'Sip Sip Hooray',
      desc: 'Log 5 drinks in one day.',
      icon: '🥳',
      category: 'Habits',
    },
    {
      id: 'hydra',
      title: 'Hydra Hydration',
      desc: 'Log 8 or more drinks in one day.',
      icon: '🐙',
      category: 'Habits',
    },
    {
      id: 'monday-mojo',
      title: 'Monday Mojo',
      desc: 'Meet your goal on a Monday.',
      icon: '📅',
      category: 'Habits',
    },
    {
      id: 'weekend-warrior',
      title: 'Weekend Warrior',
      desc: 'Meet your goal on both Saturday and Sunday of the same weekend.',
      icon: '🎉',
      category: 'Habits',
    },
    {
      id: 'comeback',
      title: 'Comeback Kid',
      desc: 'Meet today’s goal after missing yesterday’s.',
      icon: '↩️',
      category: 'Habits',
    },
    {
      id: 'perfect-week',
      title: 'Perfect Week',
      desc: 'Meet your goal every day for the last 7 days.',
      icon: '🌟',
      category: 'Habits',
    },
    {
      id: 'week-five',
      title: 'Almost Perfect',
      desc: 'Meet your goal 5 of the last 7 days.',
      icon: '⭐',
      category: 'Habits',
    },

    // —— Meta / app / 2.0 explorer ——
    {
      id: 'photo-finish',
      title: 'Photo Finish',
      desc: 'Set a custom background photo.',
      icon: '📸',
      category: 'Explorer',
    },
    {
      id: 'goal-setter',
      title: 'Goal Setter',
      desc: 'Change your daily goal.',
      icon: '🎯',
      category: 'Explorer',
    },
    {
      id: 'unit-flip',
      title: 'Unit Flipper',
      desc: 'Switch between oz and ml.',
      icon: '🔀',
      category: 'Explorer',
    },
    {
      id: 'calendar-peek',
      title: 'Calendar Curious',
      desc: 'Open the full calendar view.',
      icon: '📆',
      category: 'Explorer',
    },
    {
      id: 'achievements-tourist',
      title: 'Trophy Tourist',
      desc: 'Open the achievements page.',
      icon: '👀',
      category: 'Explorer',
    },
    {
      id: 'onboarded',
      title: 'Welcome Aboard',
      desc: 'Finish first-run setup.',
      icon: '🚢',
      category: 'Explorer',
    },
    {
      id: 'insights-peek',
      title: 'By the Numbers',
      desc: 'Open Insights.',
      icon: '📊',
      category: 'Explorer',
    },
    {
      id: 'theme-flip',
      title: 'Mood Lighting',
      desc: 'Change the app theme.',
      icon: '🌗',
      category: 'Explorer',
    },
    {
      id: 'imported',
      title: 'Memory Lane',
      desc: 'Import a backup.',
      icon: '🧳',
      category: 'Explorer',
    },
    {
      id: 'bottle-maker',
      title: 'Bottle Service',
      desc: 'Add a custom bottle.',
      icon: '🧴',
      category: 'Explorer',
    },
    {
      id: 'drink-maker',
      title: 'Mixologist',
      desc: 'Add a custom drink.',
      icon: '🍸',
      category: 'Explorer',
    },
    {
      id: 'editor',
      title: 'Revision History',
      desc: 'Edit an existing log.',
      icon: '✏️',
      category: 'Explorer',
    },
    {
      id: 'reminder-set',
      title: 'Nudge Me',
      desc: 'Turn on reminders.',
      icon: '🔔',
      category: 'Explorer',
    },
    {
      id: 'goal-lab',
      title: 'Hydration Scientist',
      desc: 'Use the goal calculator.',
      icon: '🧪',
      category: 'Explorer',
    },
    {
      id: 'pace-ace',
      title: 'Right on Time',
      desc: 'Finish 3 days on-track or ahead of pace.',
      icon: '⏰',
      category: 'Explorer',
    },

    // —— Dew ——
    {
      id: 'dew-hello',
      title: 'Boop',
      desc: 'Pet Dew for the first time.',
      icon: '💧',
      category: 'Dew',
    },
    {
      id: 'dew-squish',
      title: 'Stress Drop',
      desc: 'Give Dew a long squeeze.',
      icon: '🤗',
      category: 'Dew',
    },
    {
      id: 'dew-yeet',
      title: 'Yeet the Droplet',
      desc: 'Fling Dew across the screen.',
      icon: '🌪️',
      category: 'Dew',
    },
    {
      id: 'dew-bestie',
      title: 'Soul Pals',
      desc: 'Reach Bestie rank with Dew.',
      icon: '🎀',
      category: 'Dew',
    },
    {
      id: 'dew-popular',
      title: 'Popular Puddle',
      desc: 'Pet Dew 20 times.',
      icon: '🫶',
      category: 'Dew',
    },
    {
      id: 'dew-legend',
      title: 'Emotional Support Water',
      desc: 'Reach Legend friendship with Dew.',
      icon: '🛟',
      category: 'Dew',
    },
    {
      id: 'collector',
      title: 'Collector',
      desc: 'Unlock 10 achievements.',
      icon: '🧰',
      category: 'Meta',
    },
    {
      id: 'hoarder',
      title: 'Badge Hoarder',
      desc: 'Unlock 25 achievements.',
      icon: '🏛️',
      category: 'Meta',
    },
    {
      id: 'completionist',
      title: 'Completionist',
      desc: 'Unlock every non-meta achievement. Respect.',
      icon: '💯',
      category: 'Meta',
      secret: true,
    },
  ]);

  const BY_ID = Object.freeze(Object.fromEntries(CATALOG.map((a) => [a.id, a])));

  const GALLON_ML = Math.round(128 * 29.5735); // ~3785

  const UI_CATEGORY_ORDER = Object.freeze([
    'Firsts',
    'Daily',
    'Owala',
    'Electrolytes',
    'Drinks',
    'Streaks',
    'Lifetime',
    'Habits',
    'Explorer',
    'Dew',
    'Meta',
  ]);

  /**
   * Owala-only entries. Custom bottles never count here unless they are
   * explicitly labeled "owala" or tagged bottleId === 'owala'.
   * @param {object} entry
   */
  function isOwala(entry) {
    if (!entry) return false;
    if (entry.bottleId === 'owala') return true;
    return String(entry.label || '').toLowerCase() === 'owala';
  }

  function normalizeMap(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [id, ts] of Object.entries(raw)) {
      if (BY_ID[id] && Number(ts) > 0) out[id] = Number(ts);
    }
    return out;
  }

  function ensureMap(store) {
    if (!store.achievements || typeof store.achievements !== 'object') {
      store.achievements = {};
    }
    return store.achievements;
  }

  function ensureSeenMap(store) {
    if (!store.achievementsSeen || typeof store.achievementsSeen !== 'object' || Array.isArray(store.achievementsSeen)) {
      store.achievementsSeen = {};
    }
    return store.achievementsSeen;
  }

  function isUnlocked(store, id) {
    return Boolean(ensureMap(store)[id]);
  }

  function unlockedCount(store) {
    return Object.keys(ensureMap(store)).length;
  }

  function unseenCount(store) {
    const unlocked = ensureMap(store);
    const seen = ensureSeenMap(store);
    let n = 0;
    for (const id of Object.keys(unlocked)) {
      if (!seen[id]) n += 1;
    }
    return n;
  }

  /** Mark every currently unlocked achievement as seen. Returns true if anything changed. */
  function markSeen(store) {
    const unlocked = ensureMap(store);
    const seen = ensureSeenMap(store);
    const now = Date.now();
    let changed = false;
    for (const id of Object.keys(unlocked)) {
      if (!seen[id]) {
        seen[id] = now;
        changed = true;
      }
    }
    return changed;
  }

  function totalCount() {
    return CATALOG.length;
  }

  function goalDaysInWindow(store, storage, totals, endDate, span) {
    let n = 0;
    const d = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    for (let i = 0; i < span; i++) {
      const k = dayKey(d);
      if (storage.dayMetGoal(store, k, totals.get(k) || 0)) n += 1;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  /**
   * Snapshot stats derived from entries for achievement checks.
   * @param {object} store
   * @param {object} storage WaterStorage API
   */
  function buildStats(store, storage) {
    const goal = store.goalMl > 0 ? store.goalMl : 2000;
    const today = dayKey();
    const entries = store.entries || [];
    const todayEntries = storage.entriesForDay(store, today);
    const todayTotal = storage.totalForDay(store, today);
    const streak = storage.currentStreak(store, { requireToday: false });
    const streakToday = storage.currentStreak(store, { requireToday: true });
    const longest = storage.longestStreak(store);
    const totals = storage.totalsByDay(store);

    let lifetimeMl = 0;
    let owalaCount = 0;
    let elyCount = 0;
    const labelsSeen = new Set();

    for (const e of entries) {
      lifetimeMl += e.ml || 0;
      if (isOwala(e)) owalaCount += 1;
      if (typeof e.electrolytes === 'number' && e.electrolytes >= 1) elyCount += 1;
      if (e.label) labelsSeen.add(String(e.label).toLowerCase());
    }

    let todayOwala = 0;
    let todayEly = false;
    let todayMaxSticks = 0;

    function isPureWaterEntry(e) {
      if (typeof e.electrolytes === 'number' && e.electrolytes >= 1) return true;
      if (typeof e.hydration === 'number' && e.hydration < 1) return false;
      const label = (e.label || '').toLowerCase();
      if (!label || label === 'owala' || label === 'water' || e.bottleId === 'owala') return true;
      // Labeled full-water drinks (if any) still count as pure
      return !(typeof e.hydration === 'number' && e.hydration < 1);
    }

    let pureOnlyToday = todayEntries.length > 0 && todayEntries.every(isPureWaterEntry);

    for (const e of todayEntries) {
      if (isOwala(e)) todayOwala += 1;
      if (typeof e.electrolytes === 'number' && e.electrolytes >= 1) {
        todayEly = true;
        todayMaxSticks = Math.max(todayMaxSticks, e.electrolytes);
      }
    }

    // Distinct drink "types" for variety (normalize)
    const typeKeys = new Set();
    for (const e of todayEntries) {
      if (typeof e.electrolytes === 'number' && e.electrolytes >= 1) typeKeys.add('electrolytes');
      else if (e.label) typeKeys.add(String(e.label).toLowerCase());
      else typeKeys.add('water');
    }

    // Yesterday met?
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterdayKey = dayKey(y);
    const yesterdayMet = storage.dayMetGoal(store, yesterdayKey, totals.get(yesterdayKey) || 0);
    const todayMet = todayTotal >= goal && todayTotal > 0;

    // Weekend warrior: Sat+Sun of current or most recent weekend
    let weekendWarrior = false;
    const now = new Date();
    for (let back = 0; back < 14; back++) {
      const d = new Date(now);
      d.setDate(d.getDate() - back);
      if (d.getDay() !== 0) continue; // Sunday
      const sunKey = dayKey(d);
      const sat = new Date(d);
      sat.setDate(sat.getDate() - 1);
      const satKey = dayKey(sat);
      if (
        storage.dayMetGoal(store, satKey, totals.get(satKey) || 0) &&
        storage.dayMetGoal(store, sunKey, totals.get(sunKey) || 0)
      ) {
        weekendWarrior = true;
        break;
      }
    }

    // Perfect week: last 7 calendar days including today all met
    let perfectWeek = true;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      if (!storage.dayMetGoal(store, k, totals.get(k) || 0)) {
        perfectWeek = false;
        break;
      }
    }

    // 5 of last 7 days — plus any historical 7-day window (silent backfill)
    let weekFive = goalDaysInWindow(store, storage, totals, new Date(), 7) >= 5;
    if (!weekFive) {
      for (const k of totals.keys()) {
        const end = parseDayKey(k);
        if (end && goalDaysInWindow(store, storage, totals, end, 7) >= 5) {
          weekFive = true;
          break;
        }
      }
    }

    // Any Monday met goal historically
    let mondayMet = false;
    for (const [k, total] of totals) {
      if (!storage.dayMetGoal(store, k, total)) continue;
      const d = parseDayKey(k);
      if (d.getDay() === 1) {
        mondayMet = true;
        break;
      }
    }

    // Timing flags from any entry
    let earlyBird = false;
    let nightOwl = false;
    for (const e of entries) {
      const h = new Date(e.ts).getHours();
      if (h < 9) earlyBird = true;
      if (h >= 21) nightOwl = true;
    }

    // Any day with 3+ owalas
    let tripleOwalaDay = todayOwala >= 3;
    if (!tripleOwalaDay) {
      const byDay = new Map();
      for (const e of entries) {
        if (!isOwala(e)) continue;
        const k = dayKey(new Date(e.ts));
        byDay.set(k, (byDay.get(k) || 0) + 1);
        if (byDay.get(k) >= 3) {
          tripleOwalaDay = true;
          break;
        }
      }
    }

    // Max entries in a day
    let maxDayEntries = todayEntries.length;
    const entryCounts = new Map();
    for (const e of entries) {
      const k = dayKey(new Date(e.ts));
      entryCounts.set(k, (entryCounts.get(k) || 0) + 1);
    }
    for (const n of entryCounts.values()) {
      if (n > maxDayEntries) maxDayEntries = n;
    }

    // Max day total
    let maxDayTotal = todayTotal;
    for (const t of totals.values()) {
      if (t > maxDayTotal) maxDayTotal = t;
    }

    // Best single-day pct
    let bestPct = goal > 0 ? todayTotal / goal : 0;
    for (const [k, t] of totals) {
      const dayGoal = storage.goalForDay(store, k);
      const p = dayGoal > 0 ? t / dayGoal : 0;
      if (p > bestPct) bestPct = p;
    }

    // Labels ever logged
    const hasLabel = (name) => labelsSeen.has(name.toLowerCase());

    // Pure day ever: a goal-met day with only pure water / Owala / electrolytes
    let pureDayEver = todayMet && pureOnlyToday;
    if (!pureDayEver) {
      const byDayEntries = new Map();
      for (const e of entries) {
        const k = dayKey(new Date(e.ts));
        if (!byDayEntries.has(k)) byDayEntries.set(k, []);
        byDayEntries.get(k).push(e);
      }
      for (const [k, list] of byDayEntries) {
        if (!storage.dayMetGoal(store, k, totals.get(k) || 0)) continue;
        if (list.length > 0 && list.every(isPureWaterEntry)) {
          pureDayEver = true;
          break;
        }
      }
    }

    // Ely + goal same day ever
    let elyGoalDay = todayMet && todayEly;
    if (!elyGoalDay) {
      const elyDays = new Set();
      for (const e of entries) {
        if (typeof e.electrolytes === 'number' && e.electrolytes >= 1) {
          elyDays.add(dayKey(new Date(e.ts)));
        }
      }
      for (const k of elyDays) {
        if (storage.dayMetGoal(store, k, totals.get(k) || 0)) {
          elyGoalDay = true;
          break;
        }
      }
    }

    // Max sticks ever
    let maxSticks = todayMaxSticks;
    for (const e of entries) {
      if (typeof e.electrolytes === 'number') {
        maxSticks = Math.max(maxSticks, e.electrolytes);
      }
    }

    return {
      goal,
      today,
      todayTotal,
      todayMet,
      todayEntries: todayEntries.length,
      typeKeys,
      lifetimeMl,
      owalaCount,
      elyCount,
      streak: Math.max(streak, streakToday, longest),
      streakActive: Math.max(streak, streakToday),
      earlyBird,
      nightOwl,
      tripleOwalaDay,
      maxDayEntries,
      maxDayTotal,
      bestPct,
      hasLabel,
      pureDayEver,
      elyGoalDay,
      maxSticks,
      yesterdayMet,
      weekendWarrior,
      perfectWeek,
      weekFive,
      mondayMet,
      halfFull: todayTotal >= goal * 0.5 || bestPct >= 0.5,
    };
  }

  /**
   * Evaluate which achievements should unlock given current store + optional context flags.
   * Mutates store.achievements and returns newly unlocked ids.
   * @param {object} store
   * @param {object} storage
   * @param {{
   *   photoSet?: boolean,
   *   goalChanged?: boolean,
   *   unitFlipped?: boolean,
   *   calendarOpened?: boolean,
   *   achievementsOpened?: boolean,
   *   onboarded?: boolean,
   *   insightsOpened?: boolean,
   *   themeChanged?: boolean,
   *   imported?: boolean,
   *   bottleAdded?: boolean,
   *   drinkAdded?: boolean,
   *   entryEdited?: boolean,
   *   remindersEnabled?: boolean,
   *   goalCalculated?: boolean,
   *   paceWin?: boolean
   * }} [ctx]
   * @returns {string[]} newly unlocked ids
   */
  function evaluate(store, storage, ctx = {}) {
    const map = ensureMap(store);
    const stats = buildStats(store, storage);
    const want = new Set();

    const mark = (id, cond) => {
      if (cond && BY_ID[id] && !map[id]) want.add(id);
    };

    mark('first-sip', (store.entries || []).length >= 1);
    mark('half-full', stats.halfFull);
    mark(
      'goal-met',
      stats.todayMet || [...storage.totalsByDay(store).keys()].some((k) => storage.dayMetGoal(store, k))
    );
    mark('overachiever', stats.bestPct >= 1.1);
    mark('double-down', stats.bestPct >= 2);
    mark('gallon-club', stats.maxDayTotal >= GALLON_ML);

    mark('owala-initiate', stats.owalaCount >= 1 || stats.hasLabel('owala'));
    mark('owala-triple', stats.tripleOwalaDay);
    mark('owala-ten', stats.owalaCount >= 10);
    mark('owala-fifty', stats.owalaCount >= 50);

    mark('ely-first', stats.elyCount >= 1);
    mark('ely-storm', stats.maxSticks >= 2);
    mark('ely-ten', stats.elyCount >= 10);
    mark('ely-goal', stats.elyGoalDay);

    mark('coffee-run', stats.hasLabel('coffee'));
    mark('tea-time', stats.hasLabel('tea'));
    mark('latte-love', stats.hasLabel('iced latte'));
    mark('soda-pop', stats.hasLabel('soda'));
    mark('smoothie-op', stats.hasLabel('fruit smoothie'));
    mark('juice-box', stats.hasLabel('juice'));
    mark('sports-mode', stats.hasLabel('sports drink'));
    mark('variety-pack', stats.typeKeys.size >= 4);
    // Also check historical variety days
    if (!want.has('variety-pack') && !map['variety-pack']) {
      const byDay = new Map();
      for (const e of store.entries || []) {
        const k = dayKey(new Date(e.ts));
        if (!byDay.has(k)) byDay.set(k, new Set());
        const set = byDay.get(k);
        if (typeof e.electrolytes === 'number' && e.electrolytes >= 1) set.add('electrolytes');
        else if (e.label) set.add(String(e.label).toLowerCase());
        else set.add('water');
      }
      for (const set of byDay.values()) {
        if (set.size >= 4) {
          want.add('variety-pack');
          break;
        }
      }
    }
    mark('pure-day', stats.pureDayEver);

    mark('streak-3', stats.streakActive >= 3 || stats.streak >= 3);
    mark('streak-7', stats.streakActive >= 7 || stats.streak >= 7);
    mark('streak-14', stats.streakActive >= 14 || stats.streak >= 14);
    mark('streak-30', stats.streakActive >= 30 || stats.streak >= 30);
    mark('streak-100', stats.streakActive >= 100 || stats.streak >= 100);
    mark('streak-365', stats.streakActive >= 365 || stats.streak >= 365);

    mark('life-1l', stats.lifetimeMl >= 1000);
    mark('life-10l', stats.lifetimeMl >= 10000);
    mark('life-50l', stats.lifetimeMl >= 50000);
    mark('life-100l', stats.lifetimeMl >= 100000);
    mark('life-500l', stats.lifetimeMl >= 500000);
    mark('life-1000l', stats.lifetimeMl >= 1000000);

    mark('early-bird', stats.earlyBird);
    mark('night-owl', stats.nightOwl);
    mark('sip-sip', stats.maxDayEntries >= 5);
    mark('hydra', stats.maxDayEntries >= 8);
    mark('monday-mojo', stats.mondayMet);
    mark('weekend-warrior', stats.weekendWarrior);
    // Comeback: met today after a prior day existed that did not meet goal (not first-ever goal)
    {
      const totals = storage.totalsByDay(store);
      let hadPriorDay = false;
      for (const k of totals.keys()) {
        if (k < stats.today) {
          hadPriorDay = true;
          break;
        }
      }
      mark('comeback', stats.todayMet && !stats.yesterdayMet && hadPriorDay);
    }
    mark('perfect-week', stats.perfectWeek);
    mark('week-five', stats.weekFive);

    // Explorer flags: only unlock when the action happens (or photo already set via ctx)
    if (ctx.photoSet) want.add('photo-finish');
    if (ctx.goalChanged) want.add('goal-setter');
    if (ctx.unitFlipped) want.add('unit-flip');
    if (ctx.calendarOpened) want.add('calendar-peek');
    if (ctx.achievementsOpened) want.add('achievements-tourist');
    if (ctx.onboarded) want.add('onboarded');
    if (ctx.insightsOpened) want.add('insights-peek');
    if (ctx.themeChanged) want.add('theme-flip');
    if (ctx.imported) want.add('imported');
    if (ctx.entryEdited) want.add('editor');
    if (ctx.goalCalculated) want.add('goal-lab');

    const bottles = store.bottles;
    if (ctx.bottleAdded || (Array.isArray(bottles) && bottles.length > 1)) {
      want.add('bottle-maker');
    }
    if (ctx.drinkAdded || (store.customDrinks || []).length >= 1) {
      want.add('drink-maker');
    }
    if (ctx.remindersEnabled || (store.reminders && store.reminders.enabled)) {
      want.add('reminder-set');
    }
    const paceWins = Number(store.paceWins) || 0;
    if (paceWins >= 3 || (ctx.paceWin && paceWins >= 3)) {
      want.add('pace-ace');
    }

    const dew = store.dew || {};
    mark('dew-hello', (dew.pets || 0) >= 1);
    mark('dew-squish', (dew.squeezes || 0) >= 1);
    mark('dew-yeet', (dew.flings || 0) >= 1);
    mark('dew-bestie', (dew.friendship || 0) >= 40);
    mark('dew-popular', (dew.pets || 0) >= 20);
    mark('dew-legend', (dew.friendship || 0) >= 160);

    const now = Date.now();
    const newly = [];
    for (const id of want) {
      if (!BY_ID[id] || map[id]) continue;
      map[id] = now;
      newly.push(id);
    }

    // Meta collectors after base unlocks land
    if (!map.collector && Object.keys(map).length >= 10) {
      map.collector = now;
      newly.push('collector');
    }
    if (!map.hoarder && Object.keys(map).length >= 25) {
      map.hoarder = now;
      newly.push('hoarder');
    }
    if (!map.completionist) {
      const nonMetaIds = CATALOG.filter((a) => a.category !== 'Meta').map((a) => a.id);
      if (nonMetaIds.every((id) => map[id])) {
        map.completionist = now;
        newly.push('completionist');
      }
    }

    if (newly.length) {
      store.achievements = map;
    }
    return newly;
  }

  /**
   * Group catalog for the achievements page.
   * @param {object} store
   */
  function listForUi(store) {
    const map = ensureMap(store);
    const groups = [];
    const byCat = new Map();
    for (const a of CATALOG) {
      if (!byCat.has(a.category)) byCat.set(a.category, []);
      byCat.get(a.category).push({
        ...a,
        unlocked: Boolean(map[a.id]),
        unlockedAt: map[a.id] || null,
      });
    }
    for (const cat of UI_CATEGORY_ORDER) {
      if (!byCat.has(cat)) continue;
      groups.push({ category: cat, items: byCat.get(cat) });
    }
    for (const [cat, items] of byCat) {
      if (!UI_CATEGORY_ORDER.includes(cat)) groups.push({ category: cat, items });
    }
    return groups;
  }

  function defById(id) {
    return BY_ID[id] || null;
  }

  global.WaterAchievements = {
    CATALOG,
    totalCount,
    unlockedCount,
    unseenCount,
    markSeen,
    isUnlocked,
    ensureMap,
    ensureSeenMap,
    normalizeMap,
    evaluate,
    listForUi,
    defById,
  };
})(typeof window !== 'undefined' ? window : globalThis);
