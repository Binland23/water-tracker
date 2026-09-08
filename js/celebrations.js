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
  let frameId = null;
  let sceneCleanup = null;
  const rotations = new Map();
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
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    if (sceneCleanup) sceneCleanup();
    sceneCleanup = null;
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
    const heading = document.createElement('p');
    heading.className = 'cele-banner-title';
    heading.textContent = title || 'Goal met';
    b.appendChild(heading);
    if (subtitle) {
      const sub = document.createElement('p');
      sub.className = 'cele-banner-sub';
      sub.textContent = subtitle;
      b.appendChild(sub);
    }
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

  // Twelve authored scenes share a bounded canvas, not hundreds of DOM particles.
  const SCENES = [
    ['pearl-supernova', 'Pearl supernova', 190, 'burst'],
    ['lantern-lagoon', 'Lantern lagoon', 38, 'lantern'],
    ['jellyfish-ballet', 'Jellyfish ballet', 280, 'jelly'],
    ['lotus-awakening', 'Lotus awakening', 325, 'lotus'],
    ['moonlit-tide', 'Moonlit tide', 215, 'tide'],
    ['coral-symphony', 'Coral symphony', 15, 'coral'],
    ['celestial-compass', 'Celestial compass', 45, 'compass'],
    ['rainbow-regatta', 'Rainbow regatta', 180, 'regatta'],
    ['wish-constellation', 'Wish constellation', 235, 'stars'],
    ['liquid-fireworks', 'Liquid fireworks', 165, 'fireworks'],
    ['vortex-bloom', 'Vortex bloom', 265, 'vortex'],
    ['diamond-rain', 'Diamond rain', 195, 'diamond'],
  ];

  function cinematic(host, ctx, scene) {
    const [, name, hue, mode] = scene;
    host.classList.add('cele-cinema');
    host.style.setProperty('--scene-hue', hue);
    const canvas = document.createElement('canvas');
    canvas.className = 'cele-canvas';
    host.appendChild(canvas);
    const g = canvas.getContext('2d');
    if (!g) { reducedFallback(host, ctx); return; }
    const label = document.createElement('p');
    label.className = 'cele-scene-label';
    label.textContent = name;
    host.appendChild(label);
    const card = banner(ctx.title, ctx.subtitle || 'A little moment for a daily win');
    const seal = document.createElement('div');
    seal.className = 'cele-seal';
    seal.textContent = ctx.short || '✓';
    card.prepend(seal);
    host.appendChild(card);
    let w, h, radius;
    function resize() {
      w = host.clientWidth; h = host.clientHeight;
      radius = Math.min(w * .38, h * .24, 235);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    sceneCleanup = () => window.removeEventListener('resize', resize);
    const seeds = Array.from({length: 100}, () => ({x: Math.random(), y: Math.random(), r: rand(.5, 1.5)}));
    const tau = Math.PI * 2;
    const clamp = v => Math.max(0, Math.min(1, v));
    function dot(x, y, r, color) {
      g.fillStyle = color; g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, tau); g.fill();
    }
    function line(points, color, width = 1) {
      g.strokeStyle = color; g.lineWidth = width; g.beginPath();
      points.forEach(([x,y], i) => i ? g.lineTo(x,y) : g.moveTo(x,y)); g.stroke();
    }
    const start = performance.now();
    function draw(now) {
      const t = (now - start) / 1000;
      if (t >= 6) { clearFx(); return; }
      g.clearRect(0, 0, w, h);
      g.globalAlpha = clamp(t * 2) * clamp((6 - t) / .8);
      const cx = w / 2, cy = h * .49;
      const reveal = 1 - Math.pow(1 - clamp((t - .25) / 1.8), 3);
      const color = (shift = 0, alpha = 1) => `hsla(${hue + shift},85%,75%,${alpha})`;
      // Distant dust and slow expanding water rings provide depth in every scene.
      seeds.slice(0, 35).forEach((s,i) => dot(s.x*w, (s.y*h-t*8+h)%h, s.r, color(i, .2+.2*Math.sin(t+i)**2)));
      for (let j=0;j<3;j++) {
        g.strokeStyle=color(0,.15); g.lineWidth=1;
        g.beginPath(); g.ellipse(cx,cy+radius*.7, radius*(.4+((t*.22+j*.3)%1)),radius*.16,0,0,tau);g.stroke();
      }
      g.save(); g.translate(cx, cy);
      if (mode === 'burst' || mode === 'vortex' || mode === 'fireworks') {
        for(let i=0;i<96;i++) {
          const s=seeds[i], group=i%3;
          const age=mode==='fireworks' ? clamp((t-.4-group*.65)/2.4) : clamp((t-.5)/3.6);
          const a=i*2.39996+(mode==='vortex'?t*1.5:0);
          const r=radius*(mode==='vortex' ? (.15+s.x*.85)*reveal : Math.sin(age*Math.PI*.7)*( .3+s.x));
          const ox=mode==='fireworks'?(group-1)*radius*.62:0, oy=mode==='fireworks'?-group*radius*.32:0;
          const x=Math.cos(a)*r+ox, y=Math.sin(a)*r+oy+age*age*radius*.4;
          line([[x-Math.cos(a)*12,y-Math.sin(a)*12],[x,y]],color(group*45,.45),1.5);
          dot(x,y,2+s.r,color(group*45));
        }
      } else if(mode==='lotus') {
        for(let layer=2;layer>=0;layer--) for(let i=0;i<10;i++) {
          g.save();g.rotate(i*tau/10+layer*.3+t*.06);
          g.scale(reveal,reveal);g.fillStyle=color(layer*22,.38);g.strokeStyle=color(layer*22,.8);
          g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-radius*.48,-radius*.5, -radius*.3,-radius*(1-layer*.22),0,-radius*(1.15-layer*.23));
          g.bezierCurveTo(radius*.3,-radius*(1-layer*.22),radius*.48,-radius*.5,0,0);g.fill();g.stroke();g.restore();
        }
        dot(0,0,14*reveal,'#fff5c5');
      } else if(mode==='jelly' || mode==='lantern') {
        for(let i=0;i<7;i++) {
          const s=seeds[i], x=(s.x-.5)*w*.85, y=radius*1.8-((t*.23+s.y)%1)*radius*3;
          const size=(18+s.r*12)*reveal;
          g.save();g.translate(x,y);
          if(mode==='jelly') {
            for(let k=0;k<5;k++) line(Array.from({length:22},(_,n)=>[(k-2)*size*.3+Math.sin(n*.3+t*2+i)*n*.45,n*size*.09]),color(i*12,.55));
            g.fillStyle=color(i*12,.4);g.beginPath();g.ellipse(0,0,size,size*.7,0,Math.PI,tau);g.closePath();g.fill();
            line([[-size,0],[size,0]],color(i*12),2);
          } else {
            g.fillStyle=color(i*5,.4);g.strokeStyle=color();g.lineWidth=1;
            g.beginPath();g.roundRect(-size*.6,-size,size*1.2,size*1.5,8);g.fill();g.stroke();
            dot(0,0,5,'#fff4c2');line([[-size*.5,size*.5],[size*.5,size*.5]],color(),2);
          }g.restore();
        }
      } else if(mode==='tide' || mode==='regatta') {
        if(mode==='tide') {dot(radius*.45,-radius*.55,32*reveal,'#edf5ff');dot(radius*.58,-radius*.65,29*reveal,'#10213c');}
        for(let j=0;j<5;j++) {
          const points=Array.from({length:61},(_,i)=>{const x=-w/2+i*w/60;return [x,radius*.25+j*22+Math.sin(i*.19+t*1.5+j)*18*reveal];});
          line(points,color(j*14,.65-j*.08),2);
          if(mode==='regatta' && j<3) {
            const x=((t*.15+j*.32)%1)*w-w/2, y=radius*.25+j*22;
            g.fillStyle=color(j*65);g.beginPath();g.moveTo(x,y-65*reveal);g.lineTo(x-28,y-7);g.lineTo(x,y-7);g.fill();
            line([[x-35,y],[x-22,y+12],[x+19,y+12],[x+32,y]],color(j*65),3);
          }
        }
      } else if(mode==='coral') {
        function branch(x,y,len,a,depth) {
          if(!depth)return;
          const nx=x+Math.sin(a)*len*reveal, ny=y-Math.cos(a)*len*reveal;
          line([[x,y],[nx,ny]],color(depth*12,.8),depth*1.5);
          if(depth===1)dot(nx,ny,3,color(55));
          branch(nx,ny,len*.7,a-.5,depth-1);branch(nx,ny,len*.7,a+.5,depth-1);
        }
        for(let j=-1;j<=1;j++)branch(j*radius*.65,radius*.8,radius*.45,j*.2+Math.sin(t)*.04,5);
      } else if(mode==='compass' || mode==='stars') {
        const n=mode==='stars'?12:32;
        const points=Array.from({length:n},(_,i)=>{const a=i*tau/n-Math.PI/2+t*.07;const r=radius*reveal*(mode==='stars'?(i%2?.48:1):1);return [Math.cos(a)*r,Math.sin(a)*r];});
        line([...points,points[0]],color(0,.6),1);
        points.forEach(([x,y],i)=>{dot(x,y,i%4?2:4,color(i*3));if(mode==='compass')line([[x*.8,y*.8],[x,y]],color());else if(i%2===0)line([[x,y],points[(i+4)%n]],color(25,.2));});
        if(mode==='compass') {g.rotate(t*.3);g.fillStyle=color();g.beginPath();g.moveTo(0,-radius*.7*reveal);g.lineTo(13,15);g.lineTo(0,0);g.lineTo(-13,15);g.closePath();g.fill();}
      } else if(mode==='diamond') {
        for(let i=0;i<38;i++) {
          const s=seeds[i], x=(s.x-.5)*w, y=((s.y+t*.2)%1)*h-h/2, size=(4+s.r*5)*reveal;
          g.save();g.translate(x,y);g.rotate(t*.5+i);g.fillStyle=color(i*3,.6);
          g.beginPath();g.moveTo(0,-size*1.6);g.lineTo(size,0);g.lineTo(0,size*1.6);g.lineTo(-size,0);g.closePath();g.fill();
          line([[0,-size*1.6],[0,size*1.6]],'#e6fbff');g.restore();
        }
      }
      g.restore();
      frameId = requestAnimationFrame(draw);
    }
    frameId = requestAnimationFrame(draw);
    finish(6100); // Also cleans up if the browser pauses animation frames.
  }

  /* ─── Banks ─────────────────────────────────────────────────────── */

  const CINEMA_BANK = SCENES.map(scene => ({id: scene[0], play: (host, ctx) => cinematic(host, ctx, scene)}));

  const GOAL_BANK = [
    ...CINEMA_BANK,
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
    ...CINEMA_BANK,
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
    ...CINEMA_BANK,
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
    const key = 'water-celebration-rotation-' + (bank === GOAL_BANK ? 'goal' : bank === STREAK_BANK ? 'streak' : 'milestone');
    let remaining = rotations.get(bank);
    if (!remaining) {
      try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(saved)) {
          remaining = [...new Set(saved)].map(id => bank.find(item => item.id === id)).filter(Boolean);
        }
      } catch { /* Storage is optional; celebrations still work without it. */ }
    }
    if (!remaining || !remaining.length) remaining = shuffle(bank);
    if (remaining.length > 1 && remaining[remaining.length - 1].id === lastPlayedId) {
      [remaining[0], remaining[remaining.length - 1]] = [remaining[remaining.length - 1], remaining[0]];
    }
    const item = remaining.pop();
    rotations.set(bank, remaining);
    try { localStorage.setItem(key, JSON.stringify(remaining.map(entry => entry.id))); } catch { /* optional */ }
    return item;
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
    reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
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

    const ctx = { title: title || 'Goal met', subtitle, streak, stamp, short };

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

  document.addEventListener('visibilitychange', () => { if (document.hidden) clearFx(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && root && !root.hidden) clearFx(); });

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
