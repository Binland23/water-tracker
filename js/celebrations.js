/**
 * Celebration animation bank for goal-met + streak/milestone moments.
 * Each effect is intentionally distinct — pick randomly so repeats feel fresh.
 */
(function (global) {
  /** @type {HTMLElement | null} */
  let root = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let clearTimer = null;
  let lastPlayedId = null;
  let reducedMotion = false;

  try {
    reducedMotion =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    /* ignore */
  }

  function ensureRoot() {
    if (root && document.body.contains(root)) return root;
    root = document.getElementById('celebration-fx');
    if (!root) {
      root = document.createElement('div');
      root.id = 'celebration-fx';
      root.className = 'celebration-fx';
      root.setAttribute('aria-hidden', 'true');
      root.hidden = true;
      document.body.appendChild(root);
    }
    return root;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function clearFx() {
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
    const el = ensureRoot();
    el.className = 'celebration-fx';
    el.innerHTML = '';
    el.hidden = true;
    document.body.classList.remove('is-celebrating');
  }

  function finish(durationMs) {
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = setTimeout(clearFx, durationMs);
  }

  function banner(title, subtitle) {
    const b = document.createElement('div');
    b.className = 'cele-banner';
    b.innerHTML = `
      <p class="cele-banner-title">${title}</p>
      ${subtitle ? `<p class="cele-banner-sub">${subtitle}</p>` : ''}
    `;
    return b;
  }

  /* ─── Individual animations ─────────────────────────────────────── */

  /** Soft teal/cyan northern-lights ribbons sweep the sky. */
  function aquaAurora(host, ctx) {
    host.classList.add('cele-aurora');
    const sky = document.createElement('div');
    sky.className = 'cele-aurora-sky';
    for (let i = 0; i < 5; i++) {
      const ribbon = document.createElement('div');
      ribbon.className = `cele-aurora-ribbon r${i}`;
      ribbon.style.setProperty('--hue', String(165 + i * 18 + rand(-8, 8)));
      ribbon.style.setProperty('--delay', `${i * 0.12}s`);
      ribbon.style.setProperty('--dur', `${2.4 + i * 0.25}s`);
      ribbon.style.setProperty('--y', `${12 + i * 14 + rand(-4, 4)}%`);
      sky.appendChild(ribbon);
    }
    const stars = document.createElement('div');
    stars.className = 'cele-aurora-stars';
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('span');
      s.style.left = `${rand(2, 98)}%`;
      s.style.top = `${rand(4, 55)}%`;
      s.style.setProperty('--sd', `${rand(0, 1.2)}s`);
      s.style.setProperty('--ss', `${rand(0.4, 1.2)}`);
      stars.appendChild(s);
    }
    host.appendChild(sky);
    host.appendChild(stars);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3200);
  }

  /** Giant iridescent soap bubbles rise and pop. */
  function bubbleCascade(host, ctx) {
    host.classList.add('cele-bubbles');
    const field = document.createElement('div');
    field.className = 'cele-bubble-field';
    for (let i = 0; i < 18; i++) {
      const b = document.createElement('div');
      b.className = 'cele-bubble';
      const size = rand(28, 96);
      b.style.width = `${size}px`;
      b.style.height = `${size}px`;
      b.style.left = `${rand(2, 92)}%`;
      b.style.setProperty('--rise', `${rand(2.2, 3.8)}s`);
      b.style.setProperty('--delay', `${rand(0, 0.9)}s`);
      b.style.setProperty('--drift', `${rand(-40, 40)}px`);
      b.style.setProperty('--hue', String(rand(170, 220)));
      field.appendChild(b);
    }
    host.appendChild(field);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3800);
  }

  /** Rain falls, then gravity flips — drops fly upward. */
  function rainReversal(host, ctx) {
    host.classList.add('cele-rain');
    const field = document.createElement('div');
    field.className = 'cele-rain-field';
    for (let i = 0; i < 42; i++) {
      const d = document.createElement('span');
      d.className = 'cele-drop';
      d.style.left = `${rand(1, 99)}%`;
      d.style.setProperty('--fall', `${rand(0.55, 1.1)}s`);
      d.style.setProperty('--delay', `${rand(0, 0.55)}s`);
      d.style.setProperty('--len', `${rand(10, 22)}px`);
      d.style.setProperty('--thick', `${rand(1.5, 3)}px`);
      field.appendChild(d);
    }
    host.appendChild(field);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3400);
  }

  /** Concentric ripples expand; a crown of droplets arcs outward. */
  function rippleCrown(host, ctx) {
    host.classList.add('cele-ripples');
    const stage = document.createElement('div');
    stage.className = 'cele-ripple-stage';
    for (let i = 0; i < 5; i++) {
      const ring = document.createElement('div');
      ring.className = 'cele-ring';
      ring.style.setProperty('--i', String(i));
      stage.appendChild(ring);
    }
    for (let i = 0; i < 16; i++) {
      const drop = document.createElement('span');
      drop.className = 'cele-crown-drop';
      const angle = (i / 16) * Math.PI * 2;
      drop.style.setProperty('--a', `${angle}rad`);
      drop.style.setProperty('--delay', `${0.15 + i * 0.03}s`);
      stage.appendChild(drop);
    }
    host.appendChild(stage);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3000);
  }

  /** Droplets orbit the center then fling into a starburst. */
  function splashOrbit(host, ctx) {
    host.classList.add('cele-orbit');
    const stage = document.createElement('div');
    stage.className = 'cele-orbit-stage';
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('span');
      p.className = 'cele-orbit-particle';
      const angle = (i / 24) * 360;
      p.style.setProperty('--a', `${angle}deg`);
      p.style.setProperty('--r', `${rand(48, 72)}px`);
      p.style.setProperty('--delay', `${i * 0.02}s`);
      p.style.setProperty('--hue', String(175 + (i % 8) * 12));
      stage.appendChild(p);
    }
    const core = document.createElement('div');
    core.className = 'cele-orbit-core';
    stage.appendChild(core);
    host.appendChild(stage);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3200);
  }

  /** A full-width tidal wave sweeps across, then recedes with foam. */
  function tideWave(host, ctx) {
    host.classList.add('cele-tide');
    const wave = document.createElement('div');
    wave.className = 'cele-tide-wave';
    wave.innerHTML = `
      <svg class="cele-tide-svg" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
        <path class="cele-tide-body" d="M0 220 C120 160 200 280 340 200 C480 120 560 260 720 180 C880 100 980 240 1200 160 L1200 400 L0 400 Z"/>
        <path class="cele-tide-foam" d="M0 220 C120 160 200 280 340 200 C480 120 560 260 720 180 C880 100 980 240 1200 160"
          fill="none" stroke="rgba(230,250,255,0.75)" stroke-width="6"/>
      </svg>
    `;
    const spray = document.createElement('div');
    spray.className = 'cele-tide-spray';
    for (let i = 0; i < 20; i++) {
      const s = document.createElement('span');
      s.style.left = `${rand(10, 90)}%`;
      s.style.setProperty('--d', `${rand(0.4, 1.2)}s`);
      s.style.setProperty('--x', `${rand(-30, 30)}px`);
      spray.appendChild(s);
    }
    host.appendChild(wave);
    host.appendChild(spray);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3400);
  }

  /** Prismatic light beam refracts rainbow shards across the screen. */
  function hydroPrism(host, ctx) {
    host.classList.add('cele-prism');
    const beam = document.createElement('div');
    beam.className = 'cele-prism-beam';
    host.appendChild(beam);
    const shards = document.createElement('div');
    shards.className = 'cele-prism-shards';
    const hues = [0, 30, 55, 120, 180, 210, 270, 300];
    for (let i = 0; i < 8; i++) {
      const sh = document.createElement('div');
      sh.className = 'cele-shard';
      sh.style.setProperty('--h', String(hues[i]));
      sh.style.setProperty('--a', `${-28 + i * 8}deg`);
      sh.style.setProperty('--delay', `${0.1 + i * 0.06}s`);
      shards.appendChild(sh);
    }
    host.appendChild(shards);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3000);
  }

  /** Soft bioluminescent fireflies rise from the bottom. */
  function fireflyFountain(host, ctx) {
    host.classList.add('cele-fireflies');
    const field = document.createElement('div');
    field.className = 'cele-firefly-field';
    for (let i = 0; i < 36; i++) {
      const f = document.createElement('span');
      f.className = 'cele-firefly';
      f.style.left = `${rand(5, 95)}%`;
      f.style.setProperty('--rise', `${rand(2.0, 3.6)}s`);
      f.style.setProperty('--delay', `${rand(0, 0.8)}s`);
      f.style.setProperty('--drift', `${rand(-50, 50)}px`);
      f.style.setProperty('--size', `${rand(4, 10)}px`);
      f.style.setProperty('--hue', String(pick([165, 185, 200, 45, 280])));
      field.appendChild(f);
    }
    host.appendChild(field);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3600);
  }

  /** Ice crystal lattice forms a badge, then shatters into sparkles. */
  function crystalShatter(host, ctx) {
    host.classList.add('cele-crystal');
    const stage = document.createElement('div');
    stage.className = 'cele-crystal-stage';
    const badge = document.createElement('div');
    badge.className = 'cele-crystal-badge';
    badge.innerHTML = `<span>${ctx.short || '✓'}</span>`;
    stage.appendChild(badge);
    for (let i = 0; i < 14; i++) {
      const shard = document.createElement('span');
      shard.className = 'cele-ice-shard';
      const angle = (i / 14) * 360 + rand(-8, 8);
      shard.style.setProperty('--a', `${angle}deg`);
      shard.style.setProperty('--dist', `${rand(80, 180)}px`);
      shard.style.setProperty('--delay', `${0.85 + rand(0, 0.25)}s`);
      shard.style.setProperty('--rot', `${rand(-120, 120)}deg`);
      stage.appendChild(shard);
    }
    host.appendChild(stage);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3400);
  }

  /** Double helix of droplets spirals upward (DNA of hydration). */
  function hydroHelix(host, ctx) {
    host.classList.add('cele-helix');
    const stage = document.createElement('div');
    stage.className = 'cele-helix-stage';
    for (let strand = 0; strand < 2; strand++) {
      for (let i = 0; i < 16; i++) {
        const d = document.createElement('span');
        d.className = `cele-helix-bead strand-${strand}`;
        // Precompute spiral x so we don't rely on CSS sin()
        const phase = i * 0.55 + strand * Math.PI;
        const x = Math.sin(phase) * 44;
        d.style.setProperty('--x', `${x}px`);
        d.style.setProperty('--y', `${-18 * i - 40}px`);
        d.style.setProperty('--delay', `${i * 0.05 + strand * 0.08}s`);
        stage.appendChild(d);
      }
    }
    for (let i = 0; i < 8; i++) {
      const bar = document.createElement('span');
      bar.className = 'cele-helix-bar';
      bar.style.setProperty('--i', String(i));
      bar.style.setProperty('--delay', `${i * 0.1}s`);
      bar.style.setProperty('--y', `${-36 * i - 20}px`);
      stage.appendChild(bar);
    }
    host.appendChild(stage);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3600);
  }

  /** Chain of flame links for streak energy (water + fire paradox). */
  function streakInferno(host, ctx) {
    host.classList.add('cele-inferno');
    const chain = document.createElement('div');
    chain.className = 'cele-flame-chain';
    const n = Math.min(12, Math.max(3, ctx.streak || 5));
    for (let i = 0; i < n; i++) {
      const link = document.createElement('div');
      link.className = 'cele-flame-link';
      link.style.setProperty('--i', String(i));
      link.style.setProperty('--delay', `${i * 0.08}s`);
      link.innerHTML = '<span class="cele-flame"></span>';
      chain.appendChild(link);
    }
    const embers = document.createElement('div');
    embers.className = 'cele-embers';
    for (let i = 0; i < 24; i++) {
      const e = document.createElement('span');
      e.style.left = `${rand(10, 90)}%`;
      e.style.setProperty('--d', `${rand(0, 0.6)}s`);
      e.style.setProperty('--rise', `${rand(1.4, 2.4)}s`);
      embers.appendChild(e);
    }
    host.appendChild(chain);
    host.appendChild(embers);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3400);
  }

  /** Meteor-shower of water comets with long trails. */
  function dropletMeteors(host, ctx) {
    host.classList.add('cele-meteors');
    const field = document.createElement('div');
    field.className = 'cele-meteor-field';
    for (let i = 0; i < 14; i++) {
      const m = document.createElement('div');
      m.className = 'cele-meteor';
      m.style.left = `${rand(-5, 80)}%`;
      m.style.top = `${rand(-10, 40)}%`;
      m.style.setProperty('--delay', `${rand(0, 1.1)}s`);
      m.style.setProperty('--dur', `${rand(0.7, 1.3)}s`);
      m.style.setProperty('--len', `${rand(60, 140)}px`);
      m.style.setProperty('--angle', `${rand(28, 48)}deg`);
      field.appendChild(m);
    }
    host.appendChild(field);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3200);
  }

  /** Abstract koi silhouettes swim through a pond splash. */
  function koiSplash(host, ctx) {
    host.classList.add('cele-koi');
    const pond = document.createElement('div');
    pond.className = 'cele-koi-pond';
    for (let i = 0; i < 3; i++) {
      const fish = document.createElement('div');
      fish.className = `cele-koi-fish f${i}`;
      fish.style.setProperty('--delay', `${i * 0.25}s`);
      fish.innerHTML = `
        <svg viewBox="0 0 80 32" aria-hidden="true">
          <ellipse cx="38" cy="16" rx="28" ry="11" fill="currentColor"/>
          <path d="M12 16 L0 6 L4 16 L0 26 Z" fill="currentColor"/>
          <circle cx="54" cy="13" r="2" fill="rgba(10,30,40,0.55)"/>
          <path d="M30 6 Q38 0 46 6" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
        </svg>
      `;
      pond.appendChild(fish);
    }
    for (let i = 0; i < 12; i++) {
      const ring = document.createElement('span');
      ring.className = 'cele-koi-ripple';
      ring.style.left = `${rand(15, 85)}%`;
      ring.style.top = `${rand(35, 70)}%`;
      ring.style.setProperty('--delay', `${rand(0.2, 1.4)}s`);
      pond.appendChild(ring);
    }
    host.appendChild(pond);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3600);
  }

  /** Rubber-stamp slam: GOAL MET / STREAK with ink splash. */
  function stampSlam(host, ctx) {
    host.classList.add('cele-stamp');
    const stage = document.createElement('div');
    stage.className = 'cele-stamp-stage';
    const stamp = document.createElement('div');
    stamp.className = 'cele-stamp-mark';
    stamp.innerHTML = `
      <span class="cele-stamp-text">${ctx.stamp || 'GOAL'}</span>
      <span class="cele-stamp-edge"></span>
    `;
    stage.appendChild(stamp);
    const ink = document.createElement('div');
    ink.className = 'cele-ink-splash';
    for (let i = 0; i < 10; i++) {
      const blot = document.createElement('span');
      blot.style.setProperty('--a', `${(i / 10) * 360}deg`);
      blot.style.setProperty('--d', `${rand(20, 70)}px`);
      blot.style.setProperty('--s', `${rand(6, 18)}px`);
      ink.appendChild(blot);
    }
    stage.appendChild(ink);
    host.appendChild(stage);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(2800);
  }

  /** Champagne fountain of water particles from the bottom center. */
  function champagneFountain(host, ctx) {
    host.classList.add('cele-fountain');
    const field = document.createElement('div');
    field.className = 'cele-fountain-field';
    for (let i = 0; i < 48; i++) {
      const p = document.createElement('span');
      p.className = 'cele-fountain-drop';
      const angle = rand(-70, 70);
      p.style.setProperty('--a', `${angle}deg`);
      p.style.setProperty('--v', `${rand(40, 95)}vh`);
      p.style.setProperty('--delay', `${rand(0, 0.7)}s`);
      p.style.setProperty('--dur', `${rand(1.1, 1.9)}s`);
      p.style.setProperty('--size', `${rand(3, 8)}px`);
      field.appendChild(p);
    }
    host.appendChild(field);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3200);
  }

  /** Spiral galaxy of droplets collapses into a bright core then bursts. */
  function galaxySwirl(host, ctx) {
    host.classList.add('cele-galaxy');
    const stage = document.createElement('div');
    stage.className = 'cele-galaxy-stage';
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('span');
      p.className = 'cele-galaxy-star';
      const arm = i % 3;
      const t = i / 40;
      p.style.setProperty('--arm', String(arm));
      p.style.setProperty('--t', String(t));
      p.style.setProperty('--delay', `${t * 0.4}s`);
      p.style.setProperty('--hue', String(180 + arm * 40 + rand(-10, 10)));
      stage.appendChild(p);
    }
    const core = document.createElement('div');
    core.className = 'cele-galaxy-core';
    stage.appendChild(core);
    host.appendChild(stage);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3600);
  }

  /** Paper-plane origami droplets glide in formation. */
  function origamiFleet(host, ctx) {
    host.classList.add('cele-origami');
    const field = document.createElement('div');
    field.className = 'cele-origami-field';
    for (let i = 0; i < 7; i++) {
      const plane = document.createElement('div');
      plane.className = 'cele-plane';
      plane.style.setProperty('--i', String(i));
      plane.style.setProperty('--delay', `${i * 0.12}s`);
      plane.style.setProperty('--y', `${18 + i * 9 + rand(-3, 3)}%`);
      plane.innerHTML = `
        <svg viewBox="0 0 48 24" aria-hidden="true">
          <path d="M2 12 L46 2 L28 12 L46 22 Z" fill="currentColor"/>
          <path d="M28 12 L18 14 L22 12 L18 10 Z" fill="rgba(10,40,50,0.25)"/>
        </svg>
      `;
      field.appendChild(plane);
    }
    host.appendChild(field);
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(3200);
  }

  /* ─── Banks ─────────────────────────────────────────────────────── */

  const GOAL_BANK = [
    { id: 'aqua-aurora', play: aquaAurora },
    { id: 'bubble-cascade', play: bubbleCascade },
    { id: 'rain-reversal', play: rainReversal },
    { id: 'ripple-crown', play: rippleCrown },
    { id: 'splash-orbit', play: splashOrbit },
    { id: 'tide-wave', play: tideWave },
    { id: 'hydro-prism', play: hydroPrism },
    { id: 'firefly-fountain', play: fireflyFountain },
    { id: 'hydro-helix', play: hydroHelix },
    { id: 'droplet-meteors', play: dropletMeteors },
    { id: 'koi-splash', play: koiSplash },
    { id: 'champagne-fountain', play: champagneFountain },
    { id: 'galaxy-swirl', play: galaxySwirl },
    { id: 'origami-fleet', play: origamiFleet },
    { id: 'crystal-shatter', play: crystalShatter },
    { id: 'stamp-slam', play: stampSlam },
  ];

  const STREAK_BANK = [
    { id: 'streak-inferno', play: streakInferno },
    { id: 'droplet-meteors', play: dropletMeteors },
    { id: 'firefly-fountain', play: fireflyFountain },
    { id: 'galaxy-swirl', play: galaxySwirl },
    { id: 'stamp-slam', play: stampSlam },
    { id: 'crystal-shatter', play: crystalShatter },
    { id: 'champagne-fountain', play: champagneFountain },
    { id: 'hydro-helix', play: hydroHelix },
  ];

  const MILESTONE_BANK = [
    { id: 'streak-inferno', play: streakInferno },
    { id: 'galaxy-swirl', play: galaxySwirl },
    { id: 'crystal-shatter', play: crystalShatter },
    { id: 'tide-wave', play: tideWave },
    { id: 'hydro-prism', play: hydroPrism },
    { id: 'stamp-slam', play: stampSlam },
    { id: 'aqua-aurora', play: aquaAurora },
  ];

  const ALL_BY_ID = {};
  for (const item of [...GOAL_BANK, ...STREAK_BANK, ...MILESTONE_BANK]) {
    ALL_BY_ID[item.id] = item;
  }

  /** Streak lengths that get the big milestone treatment. */
  const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

  function isStreakMilestone(n) {
    return STREAK_MILESTONES.includes(n);
  }

  function pickFromBank(bank) {
    if (!bank.length) return null;
    // Avoid immediate repeat when possible
    let pool = bank;
    if (lastPlayedId && bank.length > 1) {
      const filtered = bank.filter((b) => b.id !== lastPlayedId);
      if (filtered.length) pool = filtered;
    }
    return pick(pool);
  }

  function reducedFallback(host, ctx) {
    host.classList.add('cele-reduced');
    host.appendChild(banner(ctx.title, ctx.subtitle));
    finish(1800);
  }

  /**
   * @param {'goal' | 'streak' | 'milestone' | string} kind
   * @param {{ title?: string, subtitle?: string, streak?: number, stamp?: string, short?: string, id?: string }} [opts]
   */
  function play(kind, opts = {}) {
    const host = ensureRoot();
    clearFx();
    host.hidden = false;
    void host.offsetWidth;
    document.body.classList.add('is-celebrating');

    const streak = opts.streak || 0;
    let bank = GOAL_BANK;
    let title = opts.title;
    let subtitle = opts.subtitle;
    let stamp = opts.stamp;
    let short = opts.short;

    if (kind === 'milestone' || (kind === 'auto' && isStreakMilestone(streak))) {
      bank = MILESTONE_BANK;
      title =
        title ||
        (streak >= 365
          ? 'A full year hydrated'
          : streak >= 100
            ? `${streak}-day legend`
            : streak >= 30
              ? `${streak}-day milestone`
              : `${streak}-day streak`);
      subtitle = subtitle || 'Consistency looks good on you';
      stamp = stamp || `${streak}★`;
      short = short || String(streak);
    } else if (kind === 'streak') {
      bank = STREAK_BANK;
      title = title || `${streak}-day streak`;
      subtitle = subtitle || 'Keep the chain alive';
      stamp = stamp || `${streak}🔥`;
      short = short || String(streak);
    } else if (kind === 'goal') {
      bank = GOAL_BANK;
      title = title || 'Goal met';
      subtitle = subtitle || pick([
        'Hydration secured',
        'Well poured',
        'Body says thanks',
        'Daily dunk complete',
        'You filled the well',
      ]);
      stamp = stamp || 'GOAL';
      short = short || '✓';
    } else if (ALL_BY_ID[kind]) {
      // Play a specific animation by id
      const item = ALL_BY_ID[kind];
      lastPlayedId = item.id;
      const ctx = {
        title: title || 'Goal met',
        subtitle: subtitle || '',
        streak,
        stamp: stamp || 'GOAL',
        short: short || '✓',
      };
      if (reducedMotion) {
        reducedFallback(host, ctx);
        return item.id;
      }
      item.play(host, ctx);
      return item.id;
    }

    const ctx = { title, subtitle, streak, stamp, short };

    if (reducedMotion) {
      reducedFallback(host, ctx);
      return 'reduced';
    }

    // Optional forced id within bank
    let item = opts.id && ALL_BY_ID[opts.id] ? ALL_BY_ID[opts.id] : pickFromBank(bank);
    if (!item) {
      reducedFallback(host, ctx);
      return 'none';
    }
    lastPlayedId = item.id;
    item.play(host, ctx);
    return item.id;
  }

  /**
   * Choose the right celebration tier for a just-met goal + current streak.
   * @param {{ streak: number, title?: string, subtitle?: string }} opts
   */
  function playForGoalMet(opts) {
    const streak = opts.streak || 1;
    if (isStreakMilestone(streak)) {
      return play('milestone', opts);
    }
    if (streak >= 2) {
      // Mix streak-flavored FX with general goal bank so multi-day feels special
      return play(Math.random() < 0.55 ? 'streak' : 'goal', opts);
    }
    return play('goal', opts);
  }

  function listAnimations() {
    return shuffle(Object.keys(ALL_BY_ID));
  }

  global.WaterCelebrations = {
    play,
    playForGoalMet,
    isStreakMilestone,
    STREAK_MILESTONES,
    listAnimations,
    clear: clearFx,
    /** ids in each bank (for debugging / preview UI) */
    banks: {
      goal: GOAL_BANK.map((b) => b.id),
      streak: STREAK_BANK.map((b) => b.id),
      milestone: MILESTONE_BANK.map((b) => b.id),
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
