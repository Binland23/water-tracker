/**
 * Dew — playful water-drop companion.
 * Tap to talk, hold to squeeze, drag / fling to toss. He blinks, watches
 * your finger, wears tiny hats, and fills up as you hydrate.
 */
(function (global) {
  const NAME = 'Dew';
  const FRIENDSHIP_MAX = 250;

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
    'Hold me to squeeze. I make a squeak. Kind of.',
    'Drag me! I have surprisingly good hang time.',
    'Electrolytes count 1:1 as water. Neat!',
    'Check the calendar for past wins.',
    'Set a background photo — make it yours.',
    'Streaks count days you hit the goal.',
    'I fill up as you do. Look at my tummy.',
    'Double-tap me for a spin. Wheee protocol.',
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

  const PET = [
    'Boop! Noted and cherished.',
    'Hehe. That tickled my meniscus.',
    'I accept this tribute.',
    'More of that, please. For science.',
    'You have excellent tap technique.',
    'Friendship +1. I keep score. Sorry.',
  ];

  const SQUEEZE = [
    'Squish!! I am a stress ball now.',
    'Careful — I might pop into a hug.',
    'Mmm compact. Very hydrating.',
    'That’s my favorite shape. Temporary, but favorite.',
    'Squeee. Okay you can have a little water tax.',
    'I have become one with the thumb.',
  ];

  const DRAG = [
    'Weee I’m a kite!',
    'Unhand me— wait no, this rules.',
    'Is this flying? I think this is flying.',
    'Higher? I believe in us.',
  ];

  const FLING = [
    'I AM THE WEATHER.',
    'Wheee— oof — worth it.',
    'Did you see my hang time?!',
    'Put me in the Olympics. Drop toss.',
    'Gravity and I need to talk.',
    'I have left the atmosphere. Briefly.',
  ];

  const DODGE = [
    'Too ticklish!! Catch me if you can.',
    'Nope nope nope — I’m the wind now.',
    'Personal space! I’m a puddle with standards.',
    'You found my giggle button. I’m relocating.',
  ];

  const PEEK = [
    'Boo. Hydration scare. Gentle one.',
    'Still here. Just doing a little spy.',
    'Peek-a-boo. Drink some water maybe?',
    'I got bored and invented a bit.',
  ];

  const RANKUP = {
    pal: [
      'We’re pals now. Official. I made a certificate (mentally).',
      'Friendship rank up! Pal status unlocked.',
    ],
    bestie: [
      'BESTIE. I would jump in a glass for you.',
      'We did it. Bestie drop. I’m wearing a bow about it.',
    ],
    soul: [
      'Soul puddle. That’s us. Don’t tell the other drops.',
      'I have decided you are my person. Forever sip.',
    ],
    legend: [
      'Legend droplet. They’ll write folk songs. Short ones.',
      'Maximum friendship. I am legally your emotional support water.',
    ],
  };

  const HOME = [
    'Home base. I missed this corner.',
    'Docked. Ready for more chaos later.',
    'Back to my little stage. Hi again.',
  ];

  const RANKS = [
    { id: 'new', min: 0, label: 'New drop', hint: 'Tap, squeeze, or toss him. He likes attention.' },
    { id: 'pal', min: 15, label: 'Pal', hint: 'He’s warming up. Sunglasses incoming this afternoon.' },
    { id: 'bestie', min: 40, label: 'Bestie', hint: 'Official hydration hype-drop. Bow unlocked.' },
    { id: 'soul', min: 80, label: 'Soul puddle', hint: 'He would jump in a glass for you.' },
    { id: 'legend', min: 160, label: 'Legend droplet', hint: 'Maximum friendship. Absolute unit of a drop.' },
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

  function rankFor(xp) {
    const n = Number(xp) || 0;
    let current = RANKS[0];
    let next = RANKS[1];
    for (let i = 0; i < RANKS.length; i++) {
      if (n >= RANKS[i].min) {
        current = RANKS[i];
        next = RANKS[i + 1] || null;
      }
    }
    const span = next ? next.min - current.min : 1;
    const into = next ? n - current.min : span;
    const pct = next ? Math.max(0, Math.min(1, into / span)) : 1;
    return { ...current, next, xp: n, pct, max: FRIENDSHIP_MAX };
  }

  /**
   * @param {{
   *   total: number,
   *   goal: number,
   *   reached: boolean,
   *   streak?: number,
   *   elyToday?: boolean,
   *   event?: string | null,
   *   preferTip?: boolean,
   *   rank?: { id: string },
   * }} ctx
   */
  function messageFor(ctx) {
    const event = ctx.event || null;
    const goal = ctx.goal > 0 ? ctx.goal : 2000;
    const pct = goal > 0 ? ctx.total / goal : 0;

    if (event === 'rank' && ctx.rank && RANKUP[ctx.rank.id]) return pick(RANKUP[ctx.rank.id]);
    if (event === 'peek') return pick(PEEK);
    if (event === 'dodge') return pick(DODGE);
    if (event === 'fling') return pick(FLING);
    if (event === 'drag') return pick(DRAG);
    if (event === 'squeeze') return pick(SQUEEZE);
    if (event === 'pet') return pick(PET);
    if (event === 'home') return pick(HOME);
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

  function moodFor(ctx) {
    if (ctx.event === 'ely') return 'zap';
    if (ctx.event === 'fling' || ctx.event === 'dodge') return 'dizzy';
    if (ctx.event === 'squeeze') return 'o';
    if (ctx.event === 'goal' || ctx.event === 'rank' || ctx.reached) return 'cheer';
    if (ctx.event === 'achievement') return 'cheer';
    if (ctx.event === 'owala' || ctx.event === 'sip' || ctx.event === 'pet') return 'happy';
    if (ctx.total <= 0) {
      const b = timeBucket();
      return b === 'late' ? 'sleepy' : 'wave';
    }
    const pct = ctx.goal > 0 ? ctx.total / ctx.goal : 0;
    if (pct >= 0.85) return 'happy';
    return 'wave';
  }

  function reduceMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function dayKeyNow() {
    if (global.WaterUtils && typeof global.WaterUtils.dayKey === 'function') {
      return global.WaterUtils.dayKey();
    }
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function cloneDew(raw) {
    if (global.WaterStorage && typeof global.WaterStorage.normalizeDew === 'function') {
      return global.WaterStorage.normalizeDew(raw);
    }
    return { ...(raw || {}) };
  }

  /** @type {null | ReturnType<typeof createEngine>} */
  let engine = null;

  function createEngine() {
    /** @type {any} */
    let hooks = null;
    let dew = cloneDew(null);
    let lastMessage = '';
    let mode = 'idle';
    let pointerId = null;
    let pressTimer = null;
    let hideTimer = null;
    let bounceTimer = null;
    let idleTimer = null;
    let lifeTimer = null;
    let blinkTimer = null;
    let peekTimer = null;
    let raf = 0;
    let dragOrigin = { x: 0, y: 0, px: 0, py: 0 };
    let lastMove = { t: 0, x: 0, y: 0 };
    let velocity = { x: 0, y: 0 };
    let tapTimes = [];
    let lastTapAt = 0;
    let dragSpoke = false;
    let lastInteractAt = 0;

    const $ = (id) => document.getElementById(id);

    function root() {
      return $('mascot');
    }
    function btn() {
      return $('mascot-btn');
    }
    function bubble() {
      return $('mascot-bubble');
    }
    function enabled() {
      return !!(hooks && hooks.isEnabled());
    }
    function ctx(extra) {
      const base = hooks && hooks.getContext ? hooks.getContext() : {};
      return { ...base, ...extra };
    }

    function persist() {
      if (hooks && hooks.saveState) hooks.saveState(dew);
    }

    function notifyPlay() {
      if (hooks && hooks.onPlay) hooks.onPlay(dew);
    }

    function haptic(style) {
      if (hooks && hooks.haptic) hooks.haptic(style);
    }

    function clearTimer(t) {
      if (t) clearTimeout(t);
      return null;
    }

    function cancelRaf() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function safePad() {
      const cs = getComputedStyle(document.documentElement);
      const num = (name, fallback) => {
        const v = parseFloat(cs.getPropertyValue(name));
        return Number.isFinite(v) ? v : fallback;
      };
      return {
        top: Math.max(num('--safe-top', 0), 8),
        bottom: Math.max(num('--safe-bottom', 0), 10),
        left: Math.max(num('--safe-left', 0), 8),
        right: Math.max(num('--safe-right', 0), 8),
      };
    }

    function dewSize() {
      const el = root();
      if (!el) return { w: 72, h: 86 };
      return { w: el.offsetWidth || 72, h: el.offsetHeight || 86 };
    }

    function navHeight() {
      const cs = getComputedStyle(document.documentElement);
      const h = parseFloat(cs.getPropertyValue('--nav-h'));
      const float = parseFloat(cs.getPropertyValue('--nav-float'));
      return (Number.isFinite(h) ? h : 56) + (Number.isFinite(float) ? float : 0);
    }

    function bounds() {
      const pad = safePad();
      const { w, h } = dewSize();
      const floor = pad.bottom + navHeight() + 8;
      return {
        minX: pad.left,
        minY: pad.top + 6,
        maxX: Math.max(pad.left, window.innerWidth - w - pad.right),
        maxY: Math.max(pad.top + 6, window.innerHeight - h - floor),
      };
    }

    function clampPos(x, y) {
      const b = bounds();
      return {
        x: Math.min(b.maxX, Math.max(b.minX, x)),
        y: Math.min(b.maxY, Math.max(b.minY, y)),
      };
    }

    function applyFree(x, y, persistNow) {
      const el = root();
      if (!el) return;
      const p = clampPos(x, y);
      el.classList.add('is-free');
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      dew.x = p.x;
      dew.y = p.y;
      updateSide(p.x);
      if (persistNow) persist();
      return p;
    }

    function currentPos() {
      const el = root();
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top };
    }

    function updateSide(x) {
      const el = root();
      if (!el) return;
      const mid = window.innerWidth / 2;
      el.dataset.side = x + dewSize().w / 2 < mid ? 'left' : 'right';
      const y = typeof dew.y === 'number' ? dew.y : currentPos().y;
      el.dataset.flip = y < 108 ? '1' : '';
    }

    function goHome(opts = {}) {
      const el = root();
      if (!el) return;
      cancelRaf();
      mode = 'idle';
      dew.x = null;
      dew.y = null;
      el.classList.remove('is-free', 'is-dragging', 'is-fling');
      el.style.left = '';
      el.style.top = '';
      el.style.right = '';
      el.style.bottom = '';
      el.dataset.side = 'right';
      el.dataset.flip = '';
      persist();
      if (opts.speak !== false) speak({ event: 'home' });
    }

    function restorePos() {
      if (typeof dew.x === 'number' && typeof dew.y === 'number') {
        applyFree(dew.x, dew.y, false);
      } else {
        const el = root();
        if (el) {
          el.classList.remove('is-free');
          el.style.left = '';
          el.style.top = '';
          el.dataset.side = 'right';
        }
      }
    }

    function hideBubble() {
      hideTimer = clearTimer(hideTimer);
      const b = bubble();
      const el = root();
      if (b) {
        b.classList.remove('is-visible');
        b.setAttribute('aria-hidden', 'true');
      }
      if (el) el.classList.remove('is-speaking');
    }

    function speak(opts = {}) {
      if (!enabled()) return '';
      const el = root();
      const msgEl = $('mascot-message');
      const b = bubble();
      if (!el || el.hidden || !msgEl) return '';

      const c = ctx(opts);
      let text = opts.text || messageFor(c);
      if (opts.force && text === lastMessage) {
        text = messageFor({ ...c, preferTip: true, event: 'idle' });
      }
      lastMessage = text;
      msgEl.textContent = text;

      const mood = opts.mood || moodFor(c);
      el.dataset.mood = mood;
      el.classList.remove('is-speaking', 'is-bounce');
      void el.offsetWidth;
      el.classList.add('is-speaking');
      if (!opts.quietBounce && !reduceMotion()) {
        el.classList.add('is-bounce');
        bounceTimer = clearTimer(bounceTimer);
        bounceTimer = setTimeout(() => el.classList.remove('is-bounce'), 520);
      }
      if (b && !opts.silent) {
        b.classList.add('is-visible');
        b.setAttribute('aria-hidden', 'false');
      }

      hideTimer = clearTimer(hideTimer);
      const hold =
        opts.event === 'goal' ||
        opts.event === 'achievement' ||
        opts.event === 'ely' ||
        opts.event === 'rank'
          ? 6500
          : opts.event === 'fling' || opts.event === 'dodge'
            ? 3800
            : 4500;
      hideTimer = setTimeout(hideBubble, hold);
      scheduleIdleChat();
      return text;
    }

    function spawnFx(kind, count) {
      const host = $('dew-fx');
      const el = root();
      if (!host || !el || reduceMotion()) return;
      const n = count || 5;
      const glyphs = {
        heart: ['❤', '💕', '💗'],
        drop: ['💧', '🫧'],
        star: ['✦', '✧', '✨'],
        bolt: ['⚡', '✨'],
      };
      const set = glyphs[kind] || glyphs.drop;
      for (let i = 0; i < n; i++) {
        const bit = document.createElement('span');
        bit.className = `dew-bit dew-bit-${kind}`;
        bit.textContent = set[i % set.length];
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
        const dist = 28 + Math.random() * 36;
        bit.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
        bit.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
        bit.style.setProperty('--rot', `${(Math.random() - 0.5) * 50}deg`);
        bit.style.left = `${36 + (Math.random() - 0.5) * 16}px`;
        bit.style.top = `${28 + (Math.random() - 0.5) * 12}px`;
        host.appendChild(bit);
        setTimeout(() => bit.remove(), 900);
      }
    }

    function pulseClass(name, ms) {
      const el = root();
      if (!el) return;
      el.classList.remove(name);
      void el.offsetWidth;
      el.classList.add(name);
      setTimeout(() => el.classList.remove(name), ms);
    }

    function addXp(n, kind) {
      const before = rankFor(dew.friendship);
      const today = dayKeyNow();
      if (dew.lastPlayDay !== today) {
        dew.lastPlayDay = today;
        dew.friendship = Math.min(FRIENDSHIP_MAX, dew.friendship + 5);
      }
      dew.friendship = Math.min(FRIENDSHIP_MAX, dew.friendship + n);
      dew.lastPlayAt = Date.now();
      lastInteractAt = Date.now();
      if (kind === 'pet') dew.pets += 1;
      if (kind === 'squeeze') dew.squeezes += 1;
      if (kind === 'fling') dew.flings += 1;
      persist();
      notifyPlay();
      const after = rankFor(dew.friendship);
      if (after.id !== before.id) {
        spawnFx('star', 9);
        pulseClass('is-dance', 1600);
        speak({ event: 'rank', rank: after, force: true });
        haptic('success');
        return after;
      }
      return null;
    }

    function syncLook() {
      /* no-op placeholder — look is live via pointer */
    }

    function setLook(nx, ny) {
      const el = root();
      if (!el) return;
      el.style.setProperty('--look-x', `${nx.toFixed(1)}px`);
      el.style.setProperty('--look-y', `${ny.toFixed(1)}px`);
    }

    function lookAt(clientX, clientY) {
      const el = root();
      if (!el || el.hidden || mode === 'drag') return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.55;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const mag = Math.hypot(dx, dy) || 1;
      const max = 2.6;
      setLook((dx / mag) * max, (dy / mag) * max * 0.8);
    }

    function scheduleBlink() {
      blinkTimer = clearTimer(blinkTimer);
      if (!enabled() || reduceMotion()) return;
      const wait = 2400 + Math.random() * 3200;
      blinkTimer = setTimeout(() => {
        const el = root();
        if (el && !el.hidden && mode === 'idle' && el.dataset.mood !== 'sleepy') {
          el.classList.add('is-blink');
          setTimeout(() => el.classList.remove('is-blink'), 130);
        }
        scheduleBlink();
      }, wait);
    }

    function scheduleIdleChat() {
      idleTimer = clearTimer(idleTimer);
      if (!enabled()) return;
      const delay = 48000 + Math.random() * 32000;
      idleTimer = setTimeout(() => {
        if (!enabled()) return;
        if (document.hidden || document.body.classList.contains('sheet-open')) {
          scheduleIdleChat();
          return;
        }
        if (Date.now() - lastInteractAt < 8000) {
          scheduleIdleChat();
          return;
        }
        speak({ event: 'idle', preferTip: Math.random() < 0.5 });
      }, delay);
    }

    function scheduleLife() {
      lifeTimer = clearTimer(lifeTimer);
      if (!enabled() || reduceMotion()) return;
      const delay = 7000 + Math.random() * 6000;
      lifeTimer = setTimeout(() => {
        runLifeBeat();
        scheduleLife();
      }, delay);
    }

    function runLifeBeat() {
      if (!enabled() || mode !== 'idle') return;
      if (document.hidden || document.body.classList.contains('sheet-open')) return;
      const el = root();
      if (!el || el.hidden) return;
      const late = timeBucket() === 'late';
      const roll = Math.random();
      if (late && roll < 0.35) {
        el.dataset.mood = 'sleepy';
        return;
      }
      if (roll < 0.28) {
        el.classList.add(Math.random() < 0.5 ? 'is-glance-left' : 'is-glance-right');
        setTimeout(() => el.classList.remove('is-glance-left', 'is-glance-right'), 900);
      } else if (roll < 0.5) {
        pulseClass('is-hop', 480);
      } else if (roll < 0.62) {
        pulseClass('is-stretch', 700);
      }
    }

    function schedulePeek() {
      peekTimer = clearTimer(peekTimer);
      if (!enabled() || reduceMotion()) return;
      const delay = 110000 + Math.random() * 70000;
      peekTimer = setTimeout(() => {
        if (!enabled() || mode !== 'idle') {
          schedulePeek();
          return;
        }
        if (document.hidden || document.body.classList.contains('sheet-open')) {
          schedulePeek();
          return;
        }
        if (Date.now() - lastInteractAt < 25000) {
          schedulePeek();
          return;
        }
        doPeek();
        schedulePeek();
      }, delay);
    }

    function doPeek() {
      const el = root();
      if (!el) return;
      const saved = { x: dew.x, y: dew.y, free: el.classList.contains('is-free') };
      const from = currentPos();
      const b = bounds();
      const leftSide = from.x > window.innerWidth / 2;
      const peekX = leftSide ? b.minX - 8 : b.maxX + 8;
      const peekY = b.minY + (b.maxY - b.minY) * (0.28 + Math.random() * 0.3);
      el.classList.add('is-peek');
      applyFree(peekX, peekY, false);
      speak({ event: 'peek' });
      setTimeout(() => {
        el.classList.remove('is-peek');
        if (saved.free && typeof saved.x === 'number') applyFree(saved.x, saved.y, true);
        else goHome({ speak: false });
      }, 2600);
    }

    function doDodge() {
      const from = currentPos();
      const b = bounds();
      const toX = from.x < window.innerWidth / 2 ? b.maxX : b.minX;
      const toY = clampPos(toX, from.y - 30 + Math.random() * 80).y;
      pulseClass('is-dodge', 700);
      applyFree(toX, toY, true);
      spawnFx('drop', 6);
      addXp(1, 'pet');
      speak({ event: 'dodge' });
      haptic('medium');
    }

    function syncVisuals() {
      const el = root();
      if (!el) return;
      const c = ctx();
      const goal = c.goal > 0 ? c.goal : 2000;
      const pct = Math.max(0, Math.min(1.05, goal > 0 ? c.total / goal : 0));
      const fill = el.querySelector('.dew-fill-inner');
      if (fill) {
        const y = 56 * (1 - Math.max(0.06, Math.min(1, pct)));
        fill.style.transform = `translate(0, ${y}px)`;
      }
      el.style.setProperty('--dew-pct', String(pct));
      const rank = rankFor(dew.friendship);
      const bucket = timeBucket();
      let hat = 'none';
      if (bucket === 'late') hat = 'cap';
      else if (bucket === 'afternoon' && rank.min >= 15) hat = 'shades';
      else if (bucket === 'morning') hat = 'sun';
      el.dataset.hat = hat;
      el.dataset.streak = c.streak >= 3 ? '1' : '';
      el.dataset.halo = c.reached ? '1' : '';
      el.dataset.bow = rank.min >= 40 ? '1' : '';
      el.dataset.bolt = c.elyToday ? '1' : '';
      el.dataset.rank = rank.id;
      if (mode === 'idle' && !el.classList.contains('is-speaking')) {
        el.dataset.mood = moodFor(c);
      }
    }

    function onPointerDown(e) {
      if (!enabled()) return;
      if (e.button != null && e.button !== 0) return;
      if (document.body.classList.contains('sheet-open')) return;
      const el = root();
      const b = btn();
      if (!el || !b) return;
      pointerId = e.pointerId;
      try {
        b.setPointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      mode = 'press';
      dragSpoke = false;
      const pos = currentPos();
      dragOrigin = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY };
      lastMove = { t: performance.now(), x: e.clientX, y: e.clientY };
      velocity = { x: 0, y: 0 };
      pressTimer = clearTimer(pressTimer);
      pressTimer = setTimeout(() => {
        if (mode === 'press') startSqueeze();
      }, 420);
    }

    function onPointerMove(e) {
      if (pointerId == null || e.pointerId !== pointerId) return;
      const now = performance.now();
      const dt = Math.max(8, now - lastMove.t);
      velocity = {
        x: ((e.clientX - lastMove.x) / dt) * 16.7,
        y: ((e.clientY - lastMove.y) / dt) * 16.7,
      };
      lastMove = { t: now, x: e.clientX, y: e.clientY };

      const dx = e.clientX - dragOrigin.px;
      const dy = e.clientY - dragOrigin.py;
      if (mode === 'press' && Math.hypot(dx, dy) > 10) {
        startDrag();
      }
      if (mode === 'drag') {
        applyFree(dragOrigin.x + dx, dragOrigin.y + dy, false);
        if (!dragSpoke && Math.hypot(dx, dy) > 48) {
          dragSpoke = true;
          speak({ event: 'drag', quietBounce: true });
        }
      }
    }

    function onPointerUp(e) {
      if (pointerId == null || (e.pointerId != null && e.pointerId !== pointerId)) return;
      const b = btn();
      try {
        if (b) b.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      pointerId = null;
      pressTimer = clearTimer(pressTimer);

      if (mode === 'drag') {
        endDrag();
        return;
      }
      if (mode === 'squeeze') {
        endSqueeze();
        return;
      }
      if (mode === 'press') {
        mode = 'idle';
        handleTap();
      }
    }

    function startDrag() {
      pressTimer = clearTimer(pressTimer);
      mode = 'drag';
      hideBubble();
      const el = root();
      if (el) el.classList.add('is-dragging');
      haptic('light');
    }

    function endDrag() {
      const el = root();
      if (el) el.classList.remove('is-dragging');
      const speed = Math.hypot(velocity.x, velocity.y);
      const pos = currentPos();
      applyFree(pos.x, pos.y, true);
      if (speed > 7 && !reduceMotion()) {
        startFling(velocity.x, velocity.y);
      } else {
        mode = 'idle';
        addXp(1, 'pet');
      }
    }

    function startFling(vx, vy) {
      mode = 'fling';
      const el = root();
      if (el) {
        el.classList.add('is-fling');
        el.dataset.mood = 'dizzy';
      }
      addXp(2, 'fling');
      spawnFx('drop', 7);
      speak({ event: 'fling' });
      haptic('medium');
      let x = currentPos().x;
      let y = currentPos().y;
      let last = performance.now();
      const step = (t) => {
        if (mode !== 'fling') return;
        const dt = Math.min(32, t - last) / 16.67;
        last = t;
        vx *= Math.pow(0.935, dt);
        vy *= Math.pow(0.935, dt);
        vy += 0.22 * dt;
        x += vx * dt;
        y += vy * dt;
        const b = bounds();
        if (x < b.minX) {
          x = b.minX;
          vx = Math.abs(vx) * 0.58;
        } else if (x > b.maxX) {
          x = b.maxX;
          vx = -Math.abs(vx) * 0.58;
        }
        if (y < b.minY) {
          y = b.minY;
          vy = Math.abs(vy) * 0.5;
        } else if (y > b.maxY) {
          y = b.maxY;
          vy = -Math.abs(vy) * 0.48;
        }
        applyFree(x, y, false);
        if (Math.hypot(vx, vy) < 0.42 && y >= b.maxY - 3) {
          mode = 'idle';
          if (el) el.classList.remove('is-fling');
          persist();
          return;
        }
        raf = requestAnimationFrame(step);
      };
      cancelRaf();
      raf = requestAnimationFrame(step);
    }

    function startSqueeze() {
      mode = 'squeeze';
      const el = root();
      if (el) {
        el.classList.add('is-squish');
        el.dataset.mood = 'o';
      }
      haptic('medium');
    }

    function endSqueeze() {
      const el = root();
      if (el) el.classList.remove('is-squish');
      mode = 'idle';
      spawnFx('heart', 7);
      const ranked = addXp(3, 'squeeze');
      if (!ranked) speak({ event: 'squeeze' });
    }

    function handleTap() {
      const now = Date.now();
      tapTimes = tapTimes.filter((t) => now - t < 1400);
      tapTimes.push(now);

      if (tapTimes.length >= 5) {
        tapTimes = [];
        doDodge();
        return;
      }

      const dbl = now - lastTapAt < 300;
      lastTapAt = now;
      if (dbl) {
        pulseClass('is-spin', 700);
        spawnFx('star', 6);
        addXp(2, 'pet');
        speak({ event: 'pet', force: true, text: pick(['Spin cycle! Don’t get dizzy.', 'Wheee protocol engaged.', 'I am a very small tornado.']) });
        haptic('light');
        return;
      }

      spawnFx('drop', 4);
      const ranked = addXp(1, 'pet');
      if (!ranked) speak({ event: 'pet', preferTip: true, force: true });
      haptic('light');
    }

    function onDocPointer(e) {
      lookAt(e.clientX, e.clientY);
    }

    function onDocDown(e) {
      const el = root();
      if (!el || el.hidden || el.contains(e.target)) return;
      const b = bubble();
      if (b && b.classList.contains('is-visible')) hideBubble();
    }

    function onScroll() {
      const b = bubble();
      if (b && b.classList.contains('is-visible')) hideBubble();
    }

    function onResize() {
      if (typeof dew.x === 'number' && typeof dew.y === 'number') {
        applyFree(dew.x, dew.y, true);
      }
    }

    function onVisibility() {
      if (document.hidden) return;
      scheduleBlink();
      scheduleLife();
    }

    let bound = false;

    function bind() {
      if (bound) return;
      bound = true;
      const b = btn();
      const bub = bubble();
      if (b) {
        b.addEventListener('pointerdown', onPointerDown);
        b.addEventListener('pointermove', onPointerMove);
        b.addEventListener('pointerup', onPointerUp);
        b.addEventListener('pointercancel', onPointerUp);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
      }
      if (bub) {
        bub.addEventListener('click', (e) => {
          e.stopPropagation();
          hideBubble();
        });
      }
      document.addEventListener('pointermove', onDocPointer, { passive: true });
      document.addEventListener('pointerdown', onDocDown, { capture: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', onVisibility);
    }

    function setVisible(show) {
      const el = root();
      if (!el) return;
      el.hidden = !show;
      el.setAttribute('aria-hidden', show ? 'false' : 'true');
      document.body.classList.toggle('has-mascot', show);
      if (!show) {
        hideBubble();
        cancelRaf();
        idleTimer = clearTimer(idleTimer);
        lifeTimer = clearTimer(lifeTimer);
        blinkTimer = clearTimer(blinkTimer);
        peekTimer = clearTimer(peekTimer);
        mode = 'idle';
      } else {
        restorePos();
        syncVisuals();
        scheduleBlink();
        scheduleIdleChat();
        scheduleLife();
        schedulePeek();
      }
    }

    function mount(options) {
      hooks = options || {};
      dew = cloneDew(hooks.getState ? hooks.getState() : null);
      bind();
      setVisible(enabled());
    }

    function react(opts) {
      const event = opts && opts.event;
      if (event === 'sip' || event === 'owala') pulseClass('is-gulp', 620);
      if (event === 'goal') pulseClass('is-dance', 1800);
      if (event === 'ely') {
        pulseClass('is-zap-pop', 900);
        spawnFx('bolt', 6);
      }
      syncVisuals();
      return speak(opts || {});
    }

    return {
      mount,
      speak: react,
      hide: hideBubble,
      setEnabled(on) {
        setVisible(!!on);
        if (on) {
          restorePos();
          speak({ event: 'open' });
        }
      },
      sync() {
        if (!hooks) return;
        if (hooks.getState) dew = cloneDew(hooks.getState());
        if (enabled()) {
          const el = root();
          if (el && el.hidden) setVisible(true);
          else syncVisuals();
        } else {
          setVisible(false);
        }
      },
      goHome,
      getDew: () => dew,
      rankFor,
    };
  }

  function ensure() {
    if (!engine) engine = createEngine();
    return engine;
  }

  global.WaterMascot = {
    NAME,
    FRIENDSHIP_MAX,
    RANKS,
    messageFor,
    moodFor,
    timeBucket,
    pick,
    rankFor,
    mount(opts) {
      return ensure().mount(opts);
    },
    speak(opts) {
      return ensure().speak(opts);
    },
    hide() {
      return ensure().hide();
    },
    setEnabled(on) {
      return ensure().setEnabled(on);
    },
    sync() {
      return ensure().sync();
    },
    goHome(opts) {
      return ensure().goHome(opts);
    },
    getDew() {
      return ensure().getDew();
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
