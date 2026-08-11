/**
 * Dew — friendly water-drop mascot with contextual tips.
 */
(function (global) {
  const NAME = 'Dew';

  const GREETINGS = {
    morning: [
      'Morning! Let’s fill the tank ☀️',
      'Rise and hydrate — I’m ready when you are.',
      'Good morning! First sip of the day?',
      'Early drops make mighty puddles.',
    ],
    afternoon: [
      'Afternoon check-in — how’s the water looking?',
      'Midday sip window is open 👋',
      'Hey! Your cells called. They want water.',
      'Keep the waves rolling this afternoon.',
    ],
    evening: [
      'Evening sip? I’m still here for you.',
      'Night shift hydration duty reporting in.',
      'Wind down with a cool glass 🌙',
      'One more log before the day closes?',
    ],
    late: [
      'You’re up late — hydrate gently.',
      'Night owl mode. Sip soft, sleep well.',
      'Even moonbeams need moisture… kinda.',
      'Quiet sips welcome. I’m whispering.',
    ],
  };

  const EMPTY = [
    'Blank slate! Tap a glass to get started.',
    'The well is empty — shall we fix that?',
    'Zero logs. Maximum potential.',
    'I believe in you. Also in water.',
    'First drop of the day is the bravest.',
  ];

  const LOW = [
    'Nice start — keep the flow going.',
    'Every sip counts. You’re rolling.',
    'A little more and we’re halfway!',
    'Bubble by bubble… look at you go.',
    'Solid splash. What’s next?',
  ];

  const MID = [
    'Halfway there! I’m doing a happy wobble.',
    'Crossing the midpoint — proud of you.',
    'You’re past the hard part. Finish strong.',
    'Glass is half full. Literally. Nice.',
    'Momentum looks good from down here.',
  ];

  const HIGH = [
    'So close I can taste the goal… wait, I am water.',
    'Almost there! One more solid pour?',
    'The finish line is dripping with possibility.',
    'Don’t leave me hanging at 90%!',
    'Final stretch — you’ve got this.',
  ];

  const GOAL = [
    'Goal met! I’m a very proud puddle 💧',
    'You did it! Victory splash!',
    'Hydration secured. High-five? …high-wave?',
    'Mission complete. I’m doing a little spin.',
    'Goal crushed. Time for a tiny celebration.',
  ];

  const OVER = [
    'Over goal? Absolute legend energy.',
    'Bonus water! I’ll allow it. Enthusiastically.',
    'You overflowed the cup. Respect.',
    'Extra credit hydration. Teacher’s pet drop.',
  ];

  const ELY = [
    'ZZZAP! Electrolytes make me sparkly ⚡',
    'Charged up! Don’t mind the static.',
    'Lightning in a bottle — stylish.',
    'Bzzzt. Fully ionized and fabulous.',
  ];

  const OWALA = [
    'Full bottle energy. Owala salute!',
    'That’s a proper gulp. Respect the bottle.',
    'One Owala closer to greatness.',
    'Big bottle, big vibes.',
  ];

  const STREAK = [
    'Streak on fire 🔥 Keep the chain alive!',
    'Consistency looks good on you.',
    'Day after day — you’re building a river.',
    'Streak mode: engaged. I’m impressed.',
  ];

  const AFTER_SIP = [
    'Glug glug — logged!',
    'Mmm, refreshing. For science.',
    'Another drop in the ocean of progress.',
    'Noted! Your future self says thanks.',
    'Splash recorded. Carry on, captain.',
    'Delicious data. Keep pouring.',
  ];

  const TIPS = [
    'Tip: coffee only counts partway as water.',
    'Siri can log for you — see the README.',
    'Tap me anytime for a pep talk.',
    'Electrolytes count 1:1 as water. Neat!',
    'Check the calendar for past wins.',
    'Set a background photo — make it yours.',
    'Streaks count days you hit the goal.',
    'Export your data anytime in Settings.',
    'Custom amount is perfect for odd glasses.',
    'I’m Dew. I root for your cells.',
  ];

  const IDLE = [
    'Still here. Still watery. Still supportive.',
    'Thinking about… water. Classic.',
    'If you need a nudge, I’m your drop.',
    'Bloop.',
    'Hydration is a love language.',
    'Just floating. Mentally. With you.',
    'Psst — your Owala misses you.',
    'No pressure. Only gentle droplet peer pressure.',
  ];

  const ACHIEVEMENT = [
    'New badge unlocked! Check trophies 🏆',
    'Achievement splash! You’re collecting lore.',
    'Badge get! I’m framing this memory.',
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function timeBucket(date = new Date()) {
    const h = date.getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 22) return 'evening';
    return 'late';
  }

  /**
   * @param {{
   *   total: number,
   *   goal: number,
   *   reached: boolean,
   *   streak?: number,
   *   elyToday?: boolean,
   *   event?: 'sip' | 'goal' | 'ely' | 'owala' | 'achievement' | 'idle' | 'open' | null,
   *   preferTip?: boolean,
   * }} ctx
   */
  function messageFor(ctx) {
    const event = ctx.event || null;
    const goal = ctx.goal > 0 ? ctx.goal : 2000;
    const pct = goal > 0 ? ctx.total / goal : 0;

    if (event === 'achievement') return pick(ACHIEVEMENT);
    if (event === 'ely') return pick(ELY);
    if (event === 'owala') return pick(OWALA);
    if (event === 'goal') return pick(GOAL);
    if (event === 'sip') return pick(AFTER_SIP);

    if (event === 'open' || event === 'idle') {
      if (ctx.preferTip && Math.random() < 0.45) return pick(TIPS);
      if (ctx.streak >= 3 && Math.random() < 0.35) return pick(STREAK);
    }

    if (ctx.reached) {
      if (pct >= 1.1) return pick(OVER);
      if (ctx.elyToday && Math.random() < 0.4) return pick(ELY);
      if (ctx.streak >= 3 && Math.random() < 0.4) return pick(STREAK);
      return pick(GOAL);
    }

    if (ctx.total <= 0) {
      if (event === 'open') return pick(GREETINGS[timeBucket()]);
      return Math.random() < 0.5 ? pick(GREETINGS[timeBucket()]) : pick(EMPTY);
    }

    if (pct < 0.35) return pick(LOW);
    if (pct < 0.65) return pick(MID);
    if (pct < 1) return pick(HIGH);
    return pick(GOAL);
  }

  /** Mood class for face / animation */
  function moodFor(ctx) {
    if (ctx.event === 'ely') return 'zap';
    if (ctx.event === 'goal' || ctx.reached) return 'cheer';
    if (ctx.event === 'achievement') return 'cheer';
    if (ctx.event === 'owala' || ctx.event === 'sip') return 'happy';
    if (ctx.total <= 0) {
      const b = timeBucket();
      return b === 'late' ? 'sleepy' : 'wave';
    }
    const pct = ctx.goal > 0 ? ctx.total / ctx.goal : 0;
    if (pct >= 0.85) return 'happy';
    if (pct >= 0.4) return 'wave';
    return 'wave';
  }

  global.WaterMascot = {
    NAME,
    messageFor,
    moodFor,
    timeBucket,
    pick,
  };
})(typeof window !== 'undefined' ? window : globalThis);
