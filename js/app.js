/** Water Tracker UI — works with file:// and http(s):// */
(function () {
  const {
    DRINK_PRESETS,
    ELECTROLYTES,
    clamp,
    dayKey,
    drinkById,
    drinkWaterMl,
    formatAmount,
    formatAmountWithUnit,
    formatDayLabel,
    formatDrinkChip,
    formatMonthYear,
    formatTime,
    hydrationPercent,
    electrolytesSticksClamp,
    electrolytesWaterMl,
    mlToOz,
    ozToMl,
    parseDayKey,
    toMl,
    waterFromVolume,
  } = window.WaterUtils;
  const storage = window.WaterStorage;
  const bgPhoto = window.WaterBgPhoto;
  const achievements = window.WaterAchievements;
  const mascotApi = window.WaterMascot;

  let store = storage.load();
  if (!store.achievements) store.achievements = {};
  if (typeof store.mascotEnabled !== 'boolean') store.mascotEnabled = true;
  /** @type {{ entry: object, timer: number } | null} */
  let undoState = null;
  let lastGoalReached = false;
  /** @type {string | null} */
  let currentBgPhoto = null;
  const celebrations = window.WaterCelebrations;
  /** Drink currently open in the amount sheet */
  let activeDrinkId = null;
  /** Stick packs selected in the Electrolytes sheet */
  let electrolytesSticks = ELECTROLYTES.defaultSticks;
  /** Queue of newly unlocked achievement ids to toast (one at a time) */
  /** @type {string[]} */
  let achievementToastQueue = [];
  let achievementToastBusy = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let mascotIdleTimer = null;
  /** Auto-dismiss timer for Dew's speech bubble */
  /** @type {ReturnType<typeof setTimeout> | null} */
  let mascotHideTimer = null;
  /** Last mascot message text (avoid immediate repeats) */
  let lastMascotMessage = '';

  /** Calendar view state */
  const calState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    selectedKey: null,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /**
   * Haptic feedback for taps and milestones.
   *
   * - Android / Chromium: Vibration API (`navigator.vibrate`)
   * - iPhone Safari / home-screen PWA (iOS 18+): light Taptic via an
   *   invisible `<input type="checkbox" switch>` — WebKit plays the
   *   system switch haptic when its label is activated. There is no
   *   public Web API for custom Taptic patterns on iOS.
   *
   * Styles: 'light' | 'medium' | 'success' | 'warning'
   * (numbers still accepted as a short vibration duration in ms)
   */
  /** @type {HTMLElement | null} */
  let iosHapticHost = null;

  function ensureIosHapticHost() {
    if (iosHapticHost && document.body.contains(iosHapticHost)) return iosHapticHost;
    const host = document.createElement('div');
    host.id = 'ios-haptic-host';
    host.setAttribute('aria-hidden', 'true');
    // Off-screen (not display:none) so WebKit still fires the switch haptic.
    host.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;';
    const id = 'ios-haptic-switch';
    host.innerHTML = `<input type="checkbox" id="${id}" switch tabindex="-1" /><label for="${id}"></label>`;
    document.body.appendChild(host);
    iosHapticHost = host;
    return host;
  }

  /** @param {number} times */
  function iosSwitchHaptic(times = 1) {
    const host = ensureIosHapticHost();
    const label = host.querySelector('label');
    if (!label) return;
    let n = 0;
    const fire = () => {
      try {
        label.click();
      } catch {
        /* ignore */
      }
      n += 1;
      if (n < times) setTimeout(fire, 70);
    };
    fire();
  }

  function isIosLike() {
    // iPhone / iPad / iPod, plus iPadOS desktop UA with touch
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  /**
   * @param {'light' | 'medium' | 'success' | 'warning' | number} [style='light']
   */
  function haptic(style = 'light') {
    try {
      const patterns = {
        light: 10,
        medium: 16,
        success: [12, 45, 20],
        warning: 28,
      };
      const isNamed = typeof style === 'string' && style in patterns;
      const pattern = isNamed ? patterns[style] : Number(style) || 10;
      const iosTimes = style === 'success' ? 2 : 1;

      // iPhone / iPad: Vibration API is not available; use system switch Taptic (iOS 18+)
      if (isIosLike()) {
        iosSwitchHaptic(iosTimes);
        return;
      }

      // Android / other mobile browsers
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      /* ignore — haptics are best-effort */
    }
  }

  function showToast(message, { duration = 2200 } = {}) {
    if (undoState) dismissUndo();
    const el = $('#toast');
    el.textContent = message;
    el.hidden = false;
    el.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => {
        if (!el.classList.contains('is-visible')) el.hidden = true;
      }, 280);
    }, duration);
  }

  function setUndo(entry) {
    if (undoState?.timer) clearTimeout(undoState.timer);
    const toast = $('#toast');
    toast.classList.remove('is-visible');
    toast.hidden = true;
    const bar = $('#undo-bar');
    bar.hidden = false;
    bar.classList.add('is-visible');
    undoState = {
      entry,
      timer: window.setTimeout(() => dismissUndo(), 5000),
    };
  }

  function dismissUndo() {
    if (undoState?.timer) clearTimeout(undoState.timer);
    undoState = null;
    const bar = $('#undo-bar');
    bar.classList.remove('is-visible');
    setTimeout(() => {
      if (!bar.classList.contains('is-visible')) bar.hidden = true;
    }, 280);
  }

  function openSheet(id) {
    const sheet = $(id);
    const backdrop = $('#sheet-backdrop');
    sheet.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      sheet.classList.add('is-open');
      backdrop.classList.add('is-open');
    });
    document.body.classList.add('sheet-open');
    hideMascotBubble();
    haptic('light');
  }

  function closeSheets() {
    $$('.sheet').forEach((s) => {
      s.classList.remove('is-open');
      setTimeout(() => {
        if (!s.classList.contains('is-open')) s.hidden = true;
      }, 280);
    });
    const backdrop = $('#sheet-backdrop');
    backdrop.classList.remove('is-open');
    setTimeout(() => {
      if (!backdrop.classList.contains('is-open')) backdrop.hidden = true;
    }, 280);
    document.body.classList.remove('sheet-open');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Log row HTML for an entry (today list or calendar day detail). */
  function entryLogHtml(e, unit) {
    const waterLine = formatAmountWithUnit(e.ml, unit);
    const isElectrolytes = typeof e.electrolytes === 'number' && e.electrolytes >= 1;
    const hasPartial =
      !isElectrolytes &&
      typeof e.volumeMl === 'number' &&
      e.volumeMl > e.ml &&
      typeof e.hydration === 'number' &&
      e.hydration < 1;

    let amountHtml;
    if (isElectrolytes) {
      const sticks = e.electrolytes;
      const stickLabel = sticks === 1 ? '1 stick' : `${sticks} sticks`;
      amountHtml = `
          <span class="log-label log-label-ely">
            <span class="log-ely-bolt" aria-hidden="true">⚡</span>
            ${escapeHtml(e.label || ELECTROLYTES.label)}
          </span>
          <span class="log-amount log-amount-ely">+${waterLine}</span>
          <span class="log-meta log-meta-ely">${stickLabel} · ELECTROLYTES</span>`;
    } else if (e.label) {
      if (hasPartial) {
        const vol = formatAmountWithUnit(e.volumeMl, unit);
        const pct = hydrationPercent(e.hydration);
        amountHtml = `
          <span class="log-label">${escapeHtml(e.label)}</span>
          <span class="log-amount">+${waterLine} water</span>
          <span class="log-meta">${vol} poured · ${pct}% hydrates</span>`;
      } else {
        amountHtml = `
          <span class="log-label">${escapeHtml(e.label)}</span>
          <span class="log-amount">+${waterLine}</span>`;
      }
    } else {
      amountHtml = `<span class="log-amount">+${waterLine}</span>`;
    }

    return `
      <div class="log-main">
        ${amountHtml}
        <span class="log-time">${formatTime(e.ts)}</span>
      </div>`;
  }

  function pulseWave() {
    const wrap = $('.gauge-wrap');
    if (!wrap) return;
    wrap.classList.remove('is-splashing');
    // reflow to restart animation
    void wrap.offsetWidth;
    wrap.classList.add('is-splashing');
    setTimeout(() => wrap.classList.remove('is-splashing'), 700);
  }

  function renderStreakPill() {
    const pill = $('#streak-pill');
    const valueEl = $('#streak-value');
    if (!pill || !valueEl) return;
    const streak = storage.currentStreak(store);
    if (streak >= 2) {
      pill.hidden = false;
      valueEl.textContent = String(streak);
      pill.setAttribute(
        'aria-label',
        `${streak} day goal streak${streak === 1 ? '' : 's'}`
      );
    } else {
      pill.hidden = true;
    }
  }

  /**
   * Fire a random celebration from the animation bank when the daily goal is met.
   * Milestones (3, 7, 14, 30…) use a bigger tier; multi-day streaks mix in streak FX.
   * @param {number} streak
   */
  /**
   * Evaluate achievements, persist unlocks, toast new badges.
   * @param {{ photoSet?: boolean, goalChanged?: boolean, unitFlipped?: boolean, calendarOpened?: boolean, achievementsOpened?: boolean, silent?: boolean }} [ctx]
   */
  function processAchievements(ctx = {}) {
    if (!achievements?.evaluate) return [];
    const newly = achievements.evaluate(store, storage, ctx);
    if (newly.length) {
      storage.saveAchievements(store);
      if (!ctx.silent) {
        for (const id of newly) achievementToastQueue.push(id);
        drainAchievementToasts();
        // Dew celebrates badges after a beat (avoid fighting toast queue)
        setTimeout(() => speakMascot({ event: 'achievement' }), 800);
      }
      updateAchievementsBadge();
      if ($('#achievements-sheet')?.classList.contains('is-open')) {
        renderAchievementsPage();
      }
    } else {
      updateAchievementsBadge();
    }
    return newly;
  }

  function mascotContext(extra = {}) {
    const goal = store.goalMl;
    const total = storage.totalForDay(store);
    const entries = storage.entriesForDay(store);
    const reached = total >= goal && goal > 0 && total > 0;
    const elyToday = entries.some((e) => typeof e.electrolytes === 'number' && e.electrolytes >= 1);
    const streak = storage.currentStreak(store);
    return {
      total,
      goal,
      reached,
      streak,
      elyToday,
      ...extra,
    };
  }

  function isMascotEnabled() {
    return store.mascotEnabled !== false;
  }

  function updateMascotVisibility() {
    const root = $('#mascot');
    if (!root) return;
    const show = isMascotEnabled();
    root.hidden = !show;
    root.setAttribute('aria-hidden', show ? 'false' : 'true');
    document.body.classList.toggle('has-mascot', show);
    const toggle = $('#setting-mascot');
    if (toggle && document.activeElement !== toggle) {
      toggle.checked = show;
    }
    if (!show) {
      hideMascotBubble();
      if (mascotIdleTimer) {
        clearTimeout(mascotIdleTimer);
        mascotIdleTimer = null;
      }
    }
  }

  function hideMascotBubble() {
    if (mascotHideTimer) {
      clearTimeout(mascotHideTimer);
      mascotHideTimer = null;
    }
    const root = $('#mascot');
    const bubble = $('#mascot-bubble');
    if (bubble) {
      bubble.classList.remove('is-visible');
      bubble.setAttribute('aria-hidden', 'true');
    }
    if (root) root.classList.remove('is-speaking');
  }

  /**
   * Show a mascot line + mood. Returns the message used.
   * @param {{ event?: string, preferTip?: boolean, force?: boolean }} [opts]
   */
  function speakMascot(opts = {}) {
    if (!isMascotEnabled() || !mascotApi) return '';
    const root = $('#mascot');
    const msgEl = $('#mascot-message');
    const bubble = $('#mascot-bubble');
    if (!root || !msgEl || root.hidden) return '';

    const ctx = mascotContext(opts);
    let text = mascotApi.messageFor(ctx);
    // Avoid immediate identical repeats when user taps
    if (opts.force && text === lastMascotMessage) {
      text = mascotApi.messageFor({ ...ctx, preferTip: true, event: 'idle' });
    }
    lastMascotMessage = text;
    msgEl.textContent = text;

    const mood = mascotApi.moodFor(ctx);
    root.dataset.mood = mood;
    root.classList.remove('is-speaking', 'is-bounce');
    void root.offsetWidth;
    root.classList.add('is-speaking', 'is-bounce');
    if (bubble) {
      bubble.classList.add('is-visible');
      bubble.setAttribute('aria-hidden', 'false');
    }

    // Clear bounce class after anim
    clearTimeout(speakMascot._bounceT);
    speakMascot._bounceT = setTimeout(() => root.classList.remove('is-bounce'), 520);

    if (mascotHideTimer) clearTimeout(mascotHideTimer);
    const hold =
      opts.event === 'goal' || opts.event === 'achievement' || opts.event === 'ely' ? 6500 : 4500;
    mascotHideTimer = setTimeout(hideMascotBubble, hold);

    scheduleMascotIdle();
    return text;
  }

  function scheduleMascotIdle() {
    if (!isMascotEnabled()) return;
    if (mascotIdleTimer) clearTimeout(mascotIdleTimer);
    // Occasional idle chatter every ~45–75s while app is open
    const delay = 45000 + Math.random() * 30000;
    mascotIdleTimer = setTimeout(() => {
      if (!isMascotEnabled()) return;
      if (document.hidden) {
        scheduleMascotIdle();
        return;
      }
      // Don't chatter over open sheets
      if (document.body.classList.contains('sheet-open')) {
        scheduleMascotIdle();
        return;
      }
      speakMascot({ event: 'idle', preferTip: Math.random() < 0.5 });
    }, delay);
  }

  function setMascotEnabled(enabled) {
    storage.setMascotEnabled(store, enabled);
    updateMascotVisibility();
    if (enabled) {
      speakMascot({ event: 'open' });
      showToast('Dew is back 💧');
    } else {
      showToast('Dew is hiding. Re-enable anytime in Settings.');
    }
  }

  function drainAchievementToasts() {
    if (achievementToastBusy) return;
    const id = achievementToastQueue.shift();
    if (!id) return;
    const def = achievements.defById?.(id);
    if (!def) {
      drainAchievementToasts();
      return;
    }
    achievementToastBusy = true;
    haptic('success');
    showToast(`${def.icon} ${def.title}`, { duration: 2600 });
    setTimeout(() => {
      achievementToastBusy = false;
      drainAchievementToasts();
    }, 2700);
  }

  function updateAchievementsBadge() {
    const badge = $('#achievements-badge');
    const btn = $('#btn-achievements');
    if (!badge || !achievements) return;
    const n = achievements.unlockedCount(store);
    const total = achievements.totalCount();
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = String(n);
    } else {
      badge.hidden = true;
    }
    if (btn) {
      btn.setAttribute('aria-label', `Achievements, ${n} of ${total} unlocked`);
    }
  }

  function renderAchievementsPage() {
    const list = $('#achievements-list');
    const progress = $('#achievements-progress');
    const fill = $('#achievements-progress-fill');
    if (!list || !achievements) return;

    const unlocked = achievements.unlockedCount(store);
    const total = achievements.totalCount();
    const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    if (progress) {
      progress.textContent = `${unlocked} / ${total} unlocked`;
    }
    if (fill) fill.style.width = `${pct}%`;

    const groups = achievements.listForUi(store);
    list.innerHTML = groups
      .map((g) => {
        const items = g.items
          .map((a) => {
            const locked = !a.unlocked;
            const secretLocked = locked && a.secret;
            const title = secretLocked ? '???' : escapeHtml(a.title);
            const desc = secretLocked
              ? 'Keep hydrating to discover this one.'
              : escapeHtml(a.desc);
            const icon = secretLocked ? '🔒' : a.icon;
            const when =
              a.unlocked && a.unlockedAt
                ? `<span class="ach-card-when">${escapeHtml(
                    new Date(a.unlockedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  )}</span>`
                : '';
            return `
              <article class="ach-card${a.unlocked ? ' is-unlocked' : ' is-locked'}" role="listitem">
                <span class="ach-card-icon" aria-hidden="true">${icon}</span>
                <div class="ach-card-text">
                  <h3 class="ach-card-title">${title}</h3>
                  <p class="ach-card-desc">${desc}</p>
                  ${when}
                </div>
                <span class="ach-card-status" aria-hidden="true">${a.unlocked ? '✓' : ''}</span>
              </article>`;
          })
          .join('');
        return `
          <section class="ach-group">
            <h3 class="ach-group-title">${escapeHtml(g.category)}</h3>
            <div class="ach-group-grid">${items}</div>
          </section>`;
      })
      .join('');
  }

  function openAchievements() {
    openSheet('#achievements-sheet');
    // Unlock "Trophy Tourist" when visiting the page
    processAchievements({ achievementsOpened: true });
    renderAchievementsPage();
  }

  /** Best-effort portrait lock for installed PWA / supported browsers. */
  function lockPortraitOrientation() {
    try {
      const orient = screen.orientation || screen.mozOrientation || screen.msOrientation;
      if (orient && typeof orient.lock === 'function') {
        const p = orient.lock('portrait');
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } else if (typeof screen.lockOrientation === 'function') {
        screen.lockOrientation('portrait');
      } else if (typeof screen.mozLockOrientation === 'function') {
        screen.mozLockOrientation('portrait');
      }
    } catch {
      /* iOS often rejects; CSS rotate-lock is the fallback */
    }
  }

  function updateRotateLock() {
    const el = $('#rotate-lock');
    if (!el) return;
    // Only nudge on phone-sized viewports (not iPad landscape multitasking intentionally)
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    const isPhone = Math.min(window.innerWidth, window.innerHeight) < 500;
    const show = isLandscape && isPhone;
    el.hidden = !show;
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
    document.body.classList.toggle('is-landscape-locked', show);
  }

  function celebrateGoalMet(streak) {
    const n = Math.max(1, streak || 1);
    let toastMsg = 'Goal reached — nice work';
    let title = 'Goal met';
    let subtitle = 'Hydration secured';

    if (celebrations?.isStreakMilestone?.(n)) {
      toastMsg =
        n >= 100
          ? `${n}-day legend — unreal`
          : n >= 30
            ? `${n}-day milestone — locked in`
            : `${n}-day streak — beautiful`;
      title =
        n >= 365 ? 'A full year hydrated' : n >= 100 ? `${n}-day legend` : `${n}-day streak`;
      subtitle = n >= 30 ? 'Consistency looks good on you' : 'Chain reaction';
    } else if (n >= 2) {
      toastMsg = `Goal met · ${n}-day streak 🔥`;
      title = 'Goal met';
      subtitle = `${n}-day streak and counting`;
    }

    showToast(toastMsg, { duration: n >= 7 ? 3200 : 2600 });

    if (celebrations?.playForGoalMet) {
      const id = celebrations.playForGoalMet({ streak: n, title, subtitle });
      // Soft gauge pulse after the banner lands
      setTimeout(() => pulseWave(), 180);
      return id;
    }
    return null;
  }

  /** Settings / deep-link: preview a random (or named) celebration. */
  function previewCelebration(kindOrId) {
    if (!celebrations?.play) {
      showToast('Celebrations unavailable');
      return;
    }
    closeSheets();
    const streak = Math.max(3, storage.currentStreak(store) || 7);
    const raw = (kindOrId || 'random').toLowerCase();
    let id;
    if (raw === 'random' || raw === '1' || raw === 'true') {
      const list = celebrations.listAnimations?.() || celebrations.banks?.goal || [];
      id = list[Math.floor(Math.random() * list.length)] || 'goal';
      celebrations.play(id, {
        title: 'Preview',
        subtitle: id.replace(/-/g, ' '),
        streak,
        stamp: 'WOW',
        short: '★',
      });
    } else if (raw === 'goal' || raw === 'streak' || raw === 'milestone') {
      id = celebrations.play(raw, {
        title: raw === 'milestone' ? `${streak}-day streak` : raw === 'streak' ? `${streak}-day streak` : 'Goal met',
        subtitle: 'Preview mode',
        streak,
        stamp: raw === 'goal' ? 'GOAL' : `${streak}★`,
        short: raw === 'goal' ? '✓' : String(streak),
      });
    } else {
      id = celebrations.play(raw, {
        title: 'Preview',
        subtitle: raw.replace(/-/g, ' '),
        streak,
        stamp: 'FX',
        short: '★',
      });
    }
    showToast(`Celebration: ${id || raw}`, { duration: 1800 });
    haptic('success');
  }

  /** Lightning / electrolyte charge animation for Electrolytes logs. */
  function playElectrolytesFx() {
    const fx = $('#electrolytes-fx');
    const wrap = $('.gauge-wrap');
    const sparks = $('#ely-sparks');
    if (!fx) return;

    // Build a few rising spark nodes once per play
    if (sparks) {
      sparks.innerHTML = '';
      for (let i = 0; i < 10; i++) {
        const s = document.createElement('span');
        s.className = 'ely-spark';
        s.style.setProperty('--sx', `${8 + Math.random() * 84}%`);
        s.style.setProperty('--sd', `${0.05 + Math.random() * 0.45}s`);
        s.style.setProperty('--ss', `${0.55 + Math.random() * 0.7}`);
        sparks.appendChild(s);
      }
    }

    fx.hidden = false;
    // reflow
    void fx.offsetWidth;
    fx.classList.add('is-active');
    if (wrap) {
      wrap.classList.remove('is-charged');
      void wrap.offsetWidth;
      wrap.classList.add('is-charged');
    }
    document.body.classList.add('electrolytes-charged');

    clearTimeout(playElectrolytesFx._t);
    playElectrolytesFx._t = setTimeout(() => {
      fx.classList.remove('is-active');
      document.body.classList.remove('electrolytes-charged');
      setTimeout(() => {
        if (!fx.classList.contains('is-active')) fx.hidden = true;
      }, 320);
      if (wrap) {
        setTimeout(() => wrap.classList.remove('is-charged'), 900);
      }
    }, 1100);
  }

  function renderGauge(total, goal) {
    const pct = goal > 0 ? total / goal : 0;
    const pctDisplay = Math.round(pct * 100);
    const reached = total >= goal;
    const visualPct = clamp(pct, 0, 1);

    const ring = $('#progress-ring');
    const circumference = 2 * Math.PI * 88;
    ring.style.strokeDasharray = `${circumference}`;
    ring.style.strokeDashoffset = `${circumference * (1 - visualPct)}`;
    ring.classList.toggle('is-complete', reached);

    const wave = $('#wave-fill');
    if (wave) {
      // Wave surface is drawn at y=100 in SVG space.
      // Clip circle: center (100,100) r=72 → top 28, bottom 172.
      // Map goal progress 0→1 so the well is empty at 0% and fully full at 100%.
      const SURFACE_Y = 100;
      const WELL_TOP = 28;
      const WELL_BOTTOM = 172;
      const emptyLift = WELL_BOTTOM - SURFACE_Y + 8; // surface just below well
      const fullLift = WELL_TOP - SURFACE_Y - 10; // surface just above well (brim full)
      const lift = emptyLift + (fullLift - emptyLift) * visualPct;
      wave.style.transform = `translateY(${lift}px)`;
      wave.classList.toggle('is-empty', total === 0);
      wave.classList.toggle('is-full', reached);
    }

    const wrap = $('.gauge-wrap');
    if (wrap) {
      wrap.classList.toggle('is-complete', reached);
      wrap.style.setProperty('--fill-pct', String(visualPct));
    }

    const unit = store.unit;
    $('#total-value').textContent = formatAmount(total, unit);
    $('#total-unit').textContent = unit;
    $('#goal-caption').textContent = `of ${formatAmountWithUnit(goal, unit)} goal`;
    $('#pct-label').textContent = `${pctDisplay}%`;

    return { pct, pctDisplay, reached };
  }

  function renderLogList(listEl, emptyEl, entries, { deletable = true } = {}) {
    listEl.innerHTML = '';
    if (entries.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    const unit = store.unit;
    for (const e of entries) {
      const li = document.createElement('li');
      li.className = 'log-item';
      li.dataset.id = e.id;
      li.innerHTML =
        entryLogHtml(e, unit) +
        (deletable
          ? `<button type="button" class="log-delete" aria-label="Delete entry" data-delete="${e.id}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>`
          : '');
      listEl.appendChild(li);
    }
  }

  function renderWeek() {
    const unit = store.unit;
    const goal = store.goalMl;
    const today = dayKey();
    const week = storage.weekTotals(store, 7);
    const maxBar = Math.max(goal, ...week.map((d) => d.total), 1);
    const weekEl = $('#week-bars');
    weekEl.innerHTML = '';
    for (const day of week) {
      const h = (day.total / maxBar) * 100;
      const isToday = day.key === today;
      const done = day.total >= goal && day.total > 0;
      const col = document.createElement('button');
      col.type = 'button';
      col.className =
        'week-col' + (isToday ? ' is-today' : '') + (done ? ' is-done' : '');
      col.setAttribute(
        'aria-label',
        `${formatDayLabel(day.date)}: ${formatAmountWithUnit(day.total, unit)}`
      );
      col.dataset.dayKey = day.key;
      col.innerHTML = `
        <div class="week-bar-track" title="${formatAmountWithUnit(day.total, unit)}">
          <div class="week-bar" style="height:${clamp(h, day.total > 0 ? 6 : 0, 100)}%"></div>
        </div>
        <span class="week-label">${formatDayLabel(day.date, { short: true }).slice(0, 2)}</span>
      `;
      weekEl.appendChild(col);
    }
  }

  function dayFillClass(total, goal) {
    if (total <= 0) return 'is-empty';
    if (total >= goal) return 'is-done';
    if (total >= goal * 0.5) return 'is-half';
    return 'is-some';
  }

  function renderCalendar() {
    const grid = $('#cal-grid');
    const label = $('#cal-month-label');
    if (!grid || !label) return;

    const { year, month, selectedKey } = calState;
    const goal = store.goalMl;
    const today = dayKey();
    const { cells } = storage.monthTotals(store, year, month);

    label.textContent = formatMonthYear(new Date(year, month, 1));

    // Disable next if past current month
    const now = new Date();
    const nextBtn = $('#cal-next');
    if (nextBtn) {
      const isCurrentOrFuture =
        year > now.getFullYear() ||
        (year === now.getFullYear() && month >= now.getMonth());
      nextBtn.disabled = isCurrentOrFuture;
    }

    grid.innerHTML = '';
    for (const cell of cells) {
      if (cell.empty) {
        const blank = document.createElement('div');
        blank.className = 'cal-cell is-blank';
        blank.setAttribute('aria-hidden', 'true');
        grid.appendChild(blank);
        continue;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cal-cell ${dayFillClass(cell.total, goal)}`;
      if (cell.key === today) btn.classList.add('is-today');
      if (cell.key === selectedKey) btn.classList.add('is-selected');
      if (cell.key > today) {
        btn.classList.add('is-future');
        btn.disabled = true;
      }
      btn.dataset.dayKey = cell.key;
      const pct = goal > 0 ? Math.min(100, Math.round((cell.total / goal) * 100)) : 0;
      btn.setAttribute(
        'aria-label',
        `${formatDayLabel(cell.date)}: ${formatAmountWithUnit(cell.total, store.unit)}${
          cell.total > 0 ? ` (${pct}% of goal)` : ''
        }`
      );
      btn.innerHTML = `
        <span class="cal-day-num">${cell.day}</span>
        <span class="cal-fill" style="--day-pct:${clamp(pct, 0, 100)}"></span>
      `;
      grid.appendChild(btn);
    }

    renderCalDayPanel();
  }

  function renderCalDayPanel() {
    const panel = $('#cal-day-panel');
    const empty = $('#cal-day-empty');
    const list = $('#cal-day-list');
    const title = $('#cal-day-title');
    const summary = $('#cal-day-summary');
    if (!panel) return;

    const key = calState.selectedKey;
    if (!key) {
      // Default to today when opening
      const today = dayKey();
      calState.selectedKey = today;
    }
    const selected = calState.selectedKey;
    const date = parseDayKey(selected);
    const entries = storage.entriesForDay(store, selected);
    const total = storage.totalForDay(store, selected);
    const goal = store.goalMl;
    const unit = store.unit;
    const pct = goal > 0 ? Math.round((total / goal) * 100) : 0;

    panel.hidden = false;
    title.textContent = formatDayLabel(date);
    if (total === 0) {
      summary.textContent = `0 ${unit} · 0% of ${formatAmountWithUnit(goal, unit)} goal`;
    } else if (total >= goal) {
      summary.textContent = `${formatAmountWithUnit(total, unit)} · Goal met (${pct}%)`;
    } else {
      summary.textContent = `${formatAmountWithUnit(total, unit)} · ${pct}% of goal`;
    }

    renderLogList(list, empty, entries, { deletable: selected === dayKey() });
  }

  function selectCalDay(key) {
    if (calState.selectedKey === key) return;
    calState.selectedKey = key;
    haptic('light');
    renderCalendar();
  }

  function openCalendar(dayKeyToSelect) {
    const now = new Date();
    if (dayKeyToSelect) {
      const d = parseDayKey(dayKeyToSelect);
      calState.year = d.getFullYear();
      calState.month = d.getMonth();
      calState.selectedKey = dayKeyToSelect;
    } else if (!calState.selectedKey) {
      calState.year = now.getFullYear();
      calState.month = now.getMonth();
      calState.selectedKey = dayKey();
    }
    renderCalendar();
    openSheet('#calendar-sheet');
  }

  function render() {
    const unit = store.unit;
    const goal = store.goalMl;
    const today = dayKey();
    const total = storage.totalForDay(store, today);
    const entries = storage.entriesForDay(store, today);

    $('#date-label').textContent = formatDayLabel(new Date());

    const { pct, reached } = renderGauge(total, goal);

    const status = $('#status-chip');
    const elyToday = entries.some((e) => typeof e.electrolytes === 'number' && e.electrolytes >= 1);
    if (reached) {
      status.textContent = elyToday
        ? pct > 1.05
          ? 'Over goal · ELECTROLYTES charged'
          : 'Goal reached · ELECTROLYTES charged'
        : pct > 1.05
          ? 'Over goal'
          : 'Goal reached';
      status.dataset.state = 'done';
      status.classList.toggle('is-ely-charged', elyToday);
    } else if (total === 0) {
      status.textContent = 'Ready when you are';
      status.dataset.state = 'empty';
      status.classList.remove('is-ely-charged');
    } else {
      const left = goal - total;
      status.textContent = elyToday
        ? `${formatAmountWithUnit(left, unit)} water to go · ⚡ charged`
        : `${formatAmountWithUnit(left, unit)} water to go`;
      status.dataset.state = 'progress';
      status.classList.toggle('is-ely-charged', elyToday);
    }

    // Goal-cross celebration is triggered from addWater (after entry toast),
    // so we only track the edge here for delete / reload paths.
    if (reached && !lastGoalReached && total > 0) {
      // e.g. undo restore that re-crosses the goal
      if (render._fromUndo) {
        haptic('success');
        const streak = storage.currentStreak(store, { requireToday: true });
        celebrateGoalMet(streak);
      }
    }
    lastGoalReached = reached;

    renderStreakPill();

    $$('[data-quick]').forEach((btn) => {
      const ml = Number(btn.dataset.quick);
      const label = formatAmount(ml, unit);
      const amountEl = btn.querySelector('.quick-amount');
      const unitEl = btn.querySelector('.quick-unit');
      if (amountEl) amountEl.textContent = `+${label}`;
      if (unitEl) unitEl.textContent = `${unit} water`;
    });

    const owala = drinkById('owala');
    if (owala) {
      const amt = formatAmountWithUnit(drinkWaterMl(owala), unit);
      const sub = $('#btn-owala [data-drink-amount]');
      if (sub) sub.textContent = `${amt} water`;
      const btn = $('#btn-owala');
      if (btn) {
        btn.setAttribute('aria-label', `Add full Owala bottle, ${amt} water`);
      }
    }

    // Keep Electrolytes sheet unit label in sync if open
    if ($('#electrolytes-sheet')?.classList.contains('is-open')) {
      const unitLabel = $('#electrolytes-unit');
      if (unitLabel) unitLabel.textContent = unit;
    }

    $$('[data-drink]:not(#btn-owala)').forEach((btn) => {
      const preset = drinkById(btn.dataset.drink);
      if (!preset) return;
      const amountEl = btn.querySelector('[data-drink-amount]');
      if (amountEl) amountEl.textContent = formatDrinkChip(preset, unit);
      const pctEl = btn.querySelector('[data-drink-pct]');
      if (pctEl) {
        const pctH = hydrationPercent(preset.hydration);
        pctEl.textContent = pctH >= 100 ? '100% water' : `${pctH}% water`;
        pctEl.hidden = false;
      }
      btn.setAttribute(
        'aria-label',
        `${preset.label}: choose amount (${hydrationPercent(preset.hydration)}% counts as water)`
      );
    });

    // Keep drink sheet labels in sync if open
    if (activeDrinkId && $('#drink-sheet')?.classList.contains('is-open')) {
      refreshDrinkSheetUi();
    }

    renderLogList($('#log-list'), $('#log-empty'), entries, { deletable: true });
    renderWeek();

    // Keep calendar in sync if open
    if ($('#calendar-sheet')?.classList.contains('is-open')) {
      renderCalendar();
    }

    const goalInput = $('#setting-goal');
    if (goalInput && document.activeElement !== goalInput) {
      goalInput.value =
        unit === 'oz' ? String(Math.round(mlToOz(goal) * 10) / 10) : String(goal);
    }
    const goalUnit = $('#setting-goal-unit');
    if (goalUnit) goalUnit.textContent = unit;
    $$('input[name="unit"]').forEach((r) => {
      r.checked = r.value === unit;
    });

    updateBgPhotoUi();
    updateAchievementsBadge();
    updateMascotVisibility();
  }

  function updateBgPhotoUi() {
    const preview = $('#bg-photo-preview');
    const clearBtn = $('#btn-bg-photo-clear');
    const dimField = $('#bg-dim-field');
    const dimRange = $('#bg-dim-range');
    const has = Boolean(currentBgPhoto);

    if (preview) {
      if (has) {
        preview.style.backgroundImage = `url("${currentBgPhoto}")`;
        preview.dataset.empty = '0';
        preview.setAttribute('aria-label', 'Current background photo');
      } else {
        preview.style.backgroundImage = '';
        preview.dataset.empty = '1';
        preview.setAttribute('aria-label', 'No background photo');
      }
    }
    if (clearBtn) clearBtn.hidden = !has;
    if (dimField) dimField.hidden = !has;
    if (dimRange && bgPhoto) {
      dimRange.value = String(Math.round(bgPhoto.getDim() * 100));
    }
  }

  async function handleBgPhotoFile(file) {
    if (!bgPhoto || !file) return;
    try {
      showToast('Preparing photo…', { duration: 1600 });
      const dataUrl = await bgPhoto.compressPhoto(file);
      await bgPhoto.savePhoto(dataUrl);
      currentBgPhoto = dataUrl;
      bgPhoto.applyToDom(dataUrl, bgPhoto.getDim());
      updateBgPhotoUi();
      haptic('medium');
      showToast('Background photo set');
      processAchievements({ photoSet: true });
    } catch (err) {
      console.error(err);
      const msg =
        err && err.message
          ? err.message
          : 'Could not use that photo. Try another from Photos.';
      showToast(msg, { duration: 3200 });
    }
  }

  async function clearBgPhoto() {
    if (!bgPhoto) return;
    await bgPhoto.clearPhoto();
    currentBgPhoto = null;
    bgPhoto.applyToDom(null);
    updateBgPhotoUi();
    haptic('light');
    showToast('Background photo removed');
  }

  /**
   * @param {number} waterMl Effective water toward goal
   * @param {{ label?: string, volumeMl?: number, hydration?: number, electrolytes?: number, charged?: boolean }} opts
   */
  function addWater(waterMl, opts = {}) {
    if (!waterMl || waterMl <= 0) return;
    const beforeTotal = storage.totalForDay(store);
    const wasReached = beforeTotal >= store.goalMl && store.goalMl > 0;

    const entry = storage.addEntry(store, waterMl, opts);
    const isEly = typeof entry.electrolytes === 'number' && entry.electrolytes >= 1;
    const afterTotal = storage.totalForDay(store);
    const nowReached = afterTotal >= store.goalMl && store.goalMl > 0;
    const justMetGoal = nowReached && !wasReached && afterTotal > 0;

    if (isEly || opts.charged) {
      // Goal celebration owns the success haptic when both fire
      if (!justMetGoal) haptic('success');
      pulseWave();
      playElectrolytesFx();
    } else if (!justMetGoal) {
      haptic('medium');
      pulseWave();
    } else {
      pulseWave();
    }
    render();

    const water = formatAmountWithUnit(entry.ml, store.unit);
    if (justMetGoal) {
      // Celebration banner + toast replace the ordinary “+X water” toast
      haptic('success');
      const streak = storage.currentStreak(store, { requireToday: true });
      // Slight delay so electrolyte lightning can start first if both apply
      const delay = isEly || opts.charged ? 700 : 120;
      setTimeout(() => celebrateGoalMet(streak), delay);
    } else if (isEly) {
      const sticks = entry.electrolytes;
      const stickLabel = sticks === 1 ? '1 stick' : `${sticks} sticks`;
      showToast(`⚡ +${water} water · ${stickLabel}`, { duration: 2800 });
    } else if (entry.label && entry.volumeMl && entry.hydration && entry.hydration < 1) {
      const vol = formatAmountWithUnit(entry.volumeMl, store.unit);
      const pct = hydrationPercent(entry.hydration);
      showToast(`+${water} water · ${entry.label} (${vol}, ${pct}%)`);
    } else if (entry.label) {
      showToast(`+${water} · ${entry.label}`);
    } else {
      showToast(`+${water} water`);
    }

    // Dew reacts after the splash (goal / ely get special lines)
    const mascotEvent = justMetGoal
      ? 'goal'
      : isEly
        ? 'ely'
        : entry.label && String(entry.label).toLowerCase() === 'owala'
          ? 'owala'
          : 'sip';
    setTimeout(() => speakMascot({ event: mascotEvent }), justMetGoal ? 900 : isEly ? 700 : 350);

    // Defer so entry toast / goal celebration can finish first
    const achDelay = justMetGoal ? 3200 : isEly ? 2900 : 1600;
    setTimeout(() => processAchievements(), achDelay);
    return entry;
  }

  /**
   * Log an Electrolytes mix: poured volume counts as water (1:1).
   * Stick packs are metadata for the log + lightning charge FX only.
   */
  function addElectrolytes(volumeMl, sticks) {
    const n = electrolytesSticksClamp(sticks);
    const vol = electrolytesWaterMl(volumeMl);
    if (vol <= 0) return null;
    return addWater(vol, {
      label: ELECTROLYTES.label,
      volumeMl: vol,
      electrolytes: n,
      charged: true,
    });
  }

  function openElectrolytesSheet() {
    electrolytesSticks = ELECTROLYTES.defaultSticks;
    const unit = store.unit;
    const amount = $('#electrolytes-amount');
    const unitLabel = $('#electrolytes-unit');
    if (unitLabel) unitLabel.textContent = unit;
    if (amount) {
      // Default recommended mix size in the user's unit
      const def =
        unit === 'oz'
          ? String(ELECTROLYTES.defaultOz)
          : String(Math.round(ozToMl(ELECTROLYTES.defaultOz)));
      amount.value = def;
    }
    refreshElectrolytesSheetUi();
    openSheet('#electrolytes-sheet');
  }

  function refreshElectrolytesSheetUi() {
    const valueEl = $('#electrolytes-sticks-value');
    const minus = $('#electrolytes-sticks-minus');
    const plus = $('#electrolytes-sticks-plus');
    if (valueEl) valueEl.textContent = String(electrolytesSticks);
    if (minus) minus.disabled = electrolytesSticks <= ELECTROLYTES.minSticks;
    if (plus) plus.disabled = electrolytesSticks >= ELECTROLYTES.maxSticks;
  }

  /** Log a drink with an explicit poured volume (hydration applied). */
  function addDrinkVolume(preset, volumeMl) {
    if (!preset || !volumeMl || volumeMl <= 0) return;
    const hydration = Number.isFinite(preset.hydration) ? preset.hydration : 1;
    const waterMl = waterFromVolume(volumeMl, hydration);
    return addWater(waterMl, {
      label: preset.label,
      volumeMl: Math.round(volumeMl),
      hydration: hydration < 1 ? hydration : undefined,
    });
  }

  /** One-tap full Owala (still immediate). */
  function addDrink(drinkId) {
    const preset = drinkById(drinkId);
    if (!preset) return;
    if (drinkId === 'owala') {
      return addDrinkVolume(preset, Math.round(ozToMl(preset.oz)));
    }
    openDrinkSheet(drinkId);
  }

  function openDrinkSheet(drinkId) {
    const preset = drinkById(drinkId);
    if (!preset || preset.id === 'owala') return;
    activeDrinkId = drinkId;
    refreshDrinkSheetUi();
    const input = $('#drink-custom-amount');
    if (input) input.value = '';
    openSheet('#drink-sheet');
    // Don't auto-focus on iOS immediately (avoids keyboard over quick button)
  }

  function refreshDrinkSheetUi() {
    const preset = drinkById(activeDrinkId);
    if (!preset) return;
    const unit = store.unit;
    const pct = hydrationPercent(preset.hydration);
    const title = $('#drink-sheet-title');
    const hint = $('#drink-sheet-hint');
    const quickMain = $('#drink-quick-main');
    const quickWater = $('#drink-quick-water');
    const unitLabel = $('#drink-custom-unit');
    const preview = $('#drink-custom-preview');

    if (title) title.textContent = preset.label;
    if (hint) {
      hint.textContent =
        pct >= 100
          ? 'Counts fully as water toward your goal.'
          : `Only ${pct}% of what you pour counts as water toward your goal.`;
    }

    // Primary quick-add uses the preset’s default size (e.g. iced latte 21 oz)
    const quickVolMl = Math.round(ozToMl(preset.oz));
    const quickWaterMl = waterFromVolume(quickVolMl, preset.hydration);
    if (quickMain) {
      quickMain.textContent = `Add ${formatAmountWithUnit(quickVolMl, unit)}`;
    }
    if (quickWater) {
      quickWater.textContent =
        pct >= 100
          ? `${formatAmountWithUnit(quickWaterMl, unit)} water`
          : `~${formatAmountWithUnit(quickWaterMl, unit)} water · ${pct}%`;
    }

    if (unitLabel) unitLabel.textContent = unit;
    updateDrinkCustomPreview();
    if (preview && !($('#drink-custom-amount')?.value)) {
      preview.textContent = `Enter an amount in ${unit}.`;
    }
  }

  function updateDrinkCustomPreview() {
    const preset = drinkById(activeDrinkId);
    const preview = $('#drink-custom-preview');
    const raw = $('#drink-custom-amount')?.value;
    if (!preset || !preview) return;
    const volumeMl = toMl(raw, store.unit);
    if (!volumeMl) {
      preview.textContent = `Enter an amount in ${store.unit}.`;
      return;
    }
    const pct = hydrationPercent(preset.hydration);
    const waterMl = waterFromVolume(volumeMl, preset.hydration);
    if (pct >= 100) {
      preview.textContent = `Adds ${formatAmountWithUnit(waterMl, store.unit)} water.`;
    } else {
      preview.textContent = `Adds ~${formatAmountWithUnit(waterMl, store.unit)} water (${pct}% of ${formatAmountWithUnit(volumeMl, store.unit)}).`;
    }
  }

  function buildDrinksGrid() {
    const grid = $('#drinks-grid');
    if (!grid || grid.dataset.built === '1') return;
    const drinks = DRINK_PRESETS.filter((d) => d.id !== 'owala');
    grid.innerHTML = drinks
      .map((d) => {
        const pct = hydrationPercent(d.hydration);
        return `
      <button type="button" class="drink-chip" data-drink="${d.id}">
        <span class="drink-chip-top">
          <span class="drink-chip-name">${escapeHtml(d.label)}</span>
          <span class="drink-chip-pct" data-drink-pct>${pct}% water</span>
        </span>
        <span class="drink-chip-amt" data-drink-amount></span>
      </button>`;
      })
      .join('');
    grid.dataset.built = '1';
  }

  function deleteEntry(id) {
    const removed = storage.removeEntry(store, id);
    if (!removed) return;
    haptic('warning');
    render();
    setUndo(removed);
    // Don't revoke unlocks on delete — badges stay earned
  }

  function handleDeepLink() {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    let changed = false;

    if (params.get('unit') === 'ml' || params.get('unit') === 'oz') {
      storage.setUnit(store, params.get('unit'));
      changed = true;
    }

    const goalRaw = params.get('goal');
    if (goalRaw) {
      const u =
        params.get('unit') === 'oz' ? 'oz' : params.get('unit') === 'ml' ? 'ml' : store.unit;
      const ml = toMl(goalRaw, u);
      if (ml) {
        storage.setGoal(store, ml);
        showToast(`Goal set to ${formatAmountWithUnit(store.goalMl, store.unit)}`);
        changed = true;
      }
    }

    // ?celebrate | ?celebrate=1 | ?celebrate=goal|streak|milestone|<animation-id>
    if (params.has('celebrate') || params.has('fx')) {
      const celeRaw = params.get('celebrate') || params.get('fx') || 'random';
      // Defer so first paint / render settle first
      setTimeout(() => previewCelebration(celeRaw || 'random'), 400);
      changed = true;
    }

    const drinkId = params.get('drink');
    if (drinkId === 'electrolytes' || params.has('electrolytes')) {
      // Siri / deep links: Electrolytes mix
      // ?drink=electrolytes | ?electrolytes=1&add=16&unit=oz
      // add uses unit= if present, otherwise saved preference (unlike plain ?add= which is ml)
      const u =
        params.get('unit') === 'oz' ? 'oz' : params.get('unit') === 'ml' ? 'ml' : store.unit;
      // sticks from ?electrolytes=N or ?sticks=N (when using ?drink=electrolytes)
      const sticksParam = params.get('electrolytes') || params.get('sticks') || '1';
      const sticks = electrolytesSticksClamp(sticksParam);
      let volumeMl = null;
      if (params.get('add')) {
        volumeMl = toMl(params.get('add'), u);
      }
      if (!volumeMl) {
        volumeMl = Math.round(ozToMl(ELECTROLYTES.defaultOz));
      }
      addElectrolytes(volumeMl, sticks);
      changed = true;
    } else if (drinkId && drinkById(drinkId)) {
      // Siri / deep links: log the preset’s default size (Owala 24 oz, iced latte 21 oz, etc.)
      const preset = drinkById(drinkId);
      addDrinkVolume(preset, Math.round(ozToMl(preset.oz)));
      changed = true;
    }

    const addRaw = params.get('add');
    if (addRaw && !drinkId && !params.has('electrolytes')) {
      const u = params.get('unit') === 'oz' ? 'oz' : 'ml';
      const ml = toMl(addRaw, u);
      if (ml) {
        const label = params.get('label') || undefined;
        addWater(ml, { label: label || undefined });
        changed = true;
      }
    }

    if (params.get('open') === 'calendar') {
      openCalendar();
      changed = true;
    }

    if (params.get('open') === 'achievements') {
      openAchievements();
      changed = true;
    }

    if (
      changed ||
      params.has('open') ||
      params.has('add') ||
      params.has('goal') ||
      params.has('unit') ||
      params.has('drink') ||
      params.has('electrolytes')
    ) {
      try {
        const url = new URL(window.location.href);
        url.search = '';
        history.replaceState({}, '', url.pathname + (url.hash || ''));
      } catch {
        /* file:// may reject history API in some browsers — ignore */
      }
    }
  }

  function bind() {
    buildDrinksGrid();

    $$('[data-quick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        addWater(Number(btn.dataset.quick));
      });
    });

    const owalaBtn = $('#btn-owala');
    if (owalaBtn) owalaBtn.addEventListener('click', () => addDrink('owala'));

    $('#btn-electrolytes')?.addEventListener('click', () => openElectrolytesSheet());

    $('#electrolytes-sticks-minus')?.addEventListener('click', () => {
      if (electrolytesSticks <= ELECTROLYTES.minSticks) return;
      electrolytesSticks -= 1;
      haptic('light');
      refreshElectrolytesSheetUi();
    });
    $('#electrolytes-sticks-plus')?.addEventListener('click', () => {
      if (electrolytesSticks >= ELECTROLYTES.maxSticks) return;
      electrolytesSticks += 1;
      haptic('light');
      refreshElectrolytesSheetUi();
    });
    $('#electrolytes-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const volumeMl = toMl($('#electrolytes-amount').value, store.unit);
      if (!volumeMl) {
        showToast('Enter a valid amount');
        return;
      }
      closeSheets();
      addElectrolytes(volumeMl, electrolytesSticks);
    });

    const drinksGrid = $('#drinks-grid');
    if (drinksGrid) {
      drinksGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-drink]');
        if (!btn) return;
        openDrinkSheet(btn.dataset.drink);
      });
    }

    $('#drink-quick-default')?.addEventListener('click', () => {
      const preset = drinkById(activeDrinkId);
      if (!preset) return;
      closeSheets();
      activeDrinkId = null;
      addDrinkVolume(preset, Math.round(ozToMl(preset.oz)));
    });

    $('#drink-custom-amount')?.addEventListener('input', updateDrinkCustomPreview);

    $('#drink-custom-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const preset = drinkById(activeDrinkId);
      if (!preset) return;
      const volumeMl = toMl($('#drink-custom-amount').value, store.unit);
      if (!volumeMl) {
        showToast('Enter a valid amount');
        return;
      }
      closeSheets();
      activeDrinkId = null;
      addDrinkVolume(preset, volumeMl);
    });

    $('#btn-custom').addEventListener('click', () => {
      const input = $('#custom-amount');
      input.value = '';
      $('#custom-unit-label').textContent = store.unit;
      openSheet('#custom-sheet');
      setTimeout(() => input.focus(), 320);
    });

    $('#custom-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const ml = toMl($('#custom-amount').value, store.unit);
      if (!ml) {
        showToast('Enter a valid amount');
        return;
      }
      closeSheets();
      addWater(ml);
    });

    $('#btn-settings').addEventListener('click', () => {
      render();
      openSheet('#settings-sheet');
    });

    $('#setting-mascot')?.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      setMascotEnabled(on);
      haptic('light');
    });

    $('#mascot-btn')?.addEventListener('click', () => {
      if (!isMascotEnabled()) return;
      haptic('light');
      speakMascot({ event: 'idle', preferTip: true, force: true });
    });
    $('#mascot-bubble')?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideMascotBubble();
    });
    document.addEventListener(
      'pointerdown',
      (e) => {
        const root = $('#mascot');
        if (!root || root.hidden || root.contains(e.target)) return;
        const bubble = $('#mascot-bubble');
        if (!bubble?.classList.contains('is-visible')) return;
        hideMascotBubble();
      },
      { capture: true }
    );
    window.addEventListener(
      'scroll',
      () => {
        const bubble = $('#mascot-bubble');
        if (bubble?.classList.contains('is-visible')) hideMascotBubble();
      },
      { passive: true }
    );

    // Background photo — iOS requires a direct user gesture to open the picker
    const bgInput = $('#bg-photo-input');
    const bgChoose = $('#btn-bg-photo');
    if (bgChoose && bgInput) {
      bgChoose.addEventListener('click', () => {
        // Reset so re-selecting the same photo still fires change on iOS
        bgInput.value = '';
        bgInput.click();
      });
      bgInput.addEventListener('change', () => {
        const file = bgInput.files && bgInput.files[0];
        if (file) handleBgPhotoFile(file);
      });
    }
    $('#btn-bg-photo-clear')?.addEventListener('click', () => {
      if (!currentBgPhoto) return;
      if (!confirm('Remove your background photo?')) return;
      clearBgPhoto();
    });
    $('#bg-dim-range')?.addEventListener('input', (e) => {
      if (!bgPhoto) return;
      const dim = Number(e.target.value) / 100;
      bgPhoto.setDim(dim);
      bgPhoto.applyToDom(currentBgPhoto, dim);
    });

    const openCal = () => {
      openCalendar();
      processAchievements({ calendarOpened: true });
    };
    $('#btn-calendar')?.addEventListener('click', openCal);
    $('#btn-open-calendar')?.addEventListener('click', openCal);
    $('#btn-achievements')?.addEventListener('click', () => openAchievements());

    $('#cal-prev')?.addEventListener('click', () => {
      calState.month -= 1;
      if (calState.month < 0) {
        calState.month = 11;
        calState.year -= 1;
      }
      renderCalendar();
    });

    $('#cal-next')?.addEventListener('click', () => {
      calState.month += 1;
      if (calState.month > 11) {
        calState.month = 0;
        calState.year += 1;
      }
      renderCalendar();
    });

    $('#cal-grid')?.addEventListener('click', (e) => {
      const cell = e.target.closest('.cal-cell[data-day-key]');
      if (!cell || cell.disabled) return;
      selectCalDay(cell.dataset.dayKey);
    });

    $('#week-bars')?.addEventListener('click', (e) => {
      const col = e.target.closest('[data-day-key]');
      if (!col) return;
      openCalendar(col.dataset.dayKey);
    });

    // Calendar day list: only today entries are deletable
    $('#cal-day-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete]');
      if (!btn) return;
      deleteEntry(btn.dataset.delete);
    });

    $('#sheet-backdrop').addEventListener('click', closeSheets);
    $$('[data-close-sheet]').forEach((b) => b.addEventListener('click', closeSheets));

    $('#log-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete]');
      if (!btn) return;
      deleteEntry(btn.dataset.delete);
    });

    $('#undo-btn').addEventListener('click', () => {
      if (!undoState?.entry) return;
      const before = storage.totalForDay(store);
      const wasReached = before >= store.goalMl && store.goalMl > 0;
      storage.restoreEntry(store, undoState.entry);
      dismissUndo();
      haptic('light');
      render._fromUndo = true;
      render();
      render._fromUndo = false;
      const after = storage.totalForDay(store);
      const nowReached = after >= store.goalMl && store.goalMl > 0;
      // If undo didn't re-cross the goal, keep the restore toast
      if (!(nowReached && !wasReached)) {
        showToast('Entry restored');
      }
    });

    $$('input[name="unit"]').forEach((r) => {
      r.addEventListener('change', () => {
        if (r.checked) {
          storage.setUnit(store, r.value);
          haptic('light');
          render();
          processAchievements({ unitFlipped: true });
        }
      });
    });

    $('#setting-goal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const ml = toMl($('#setting-goal').value, store.unit);
      if (!ml) {
        showToast('Enter a valid goal');
        return;
      }
      const prev = store.goalMl;
      storage.setGoal(store, ml);
      haptic('medium');
      render();
      showToast('Goal updated');
      if (prev !== store.goalMl) {
        processAchievements({ goalChanged: true });
      }
    });

    const previewCeleBtn = $('#btn-preview-cele');
    if (previewCeleBtn) {
      previewCeleBtn.addEventListener('click', () => {
        previewCelebration('random');
      });
    }

    $('#btn-clear-today').addEventListener('click', () => {
      if (!confirm('Clear all entries for today?')) return;
      storage.clearToday(store);
      lastGoalReached = false;
      haptic('warning');
      render();
      showToast('Today cleared');
    });

    $('#btn-export').addEventListener('click', async () => {
      const json = storage.exportJson(store);
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(json);
          showToast('Data copied to clipboard');
        } else {
          throw new Error('no clipboard');
        }
      } catch {
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `water-tracker-${dayKey()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('Data downloaded');
      }
    });

    $('#btn-clear-all').addEventListener('click', () => {
      if (!confirm('Delete ALL water history? This cannot be undone.')) return;
      storage.clearAll(store);
      lastGoalReached = false;
      haptic('warning');
      render();
      showToast('All data cleared');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSheets();
    });

    // Portrait lock + landscape overlay
    lockPortraitOrientation();
    updateRotateLock();
    window.addEventListener('orientationchange', () => {
      lockPortraitOrientation();
      updateRotateLock();
    });
    window.addEventListener('resize', updateRotateLock);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') lockPortraitOrientation();
    });

    setInterval(() => {
      const label = $('#date-label');
      if (label && label.textContent !== formatDayLabel(new Date())) {
        lastGoalReached = false;
        render();
      }
    }, 60_000);
  }

  async function init() {
    if (!window.WaterUtils || !window.WaterStorage) {
      console.error('Water Tracker: scripts failed to load. Open index.html from this folder.');
      return;
    }
    bind();
    lastGoalReached = storage.totalForDay(store) >= store.goalMl && store.goalMl > 0;

    if (bgPhoto) {
      try {
        currentBgPhoto = await bgPhoto.initFromStorage();
      } catch (err) {
        console.warn('Background photo unavailable', err);
        currentBgPhoto = null;
      }
    }

    render();
    // Backfill achievements from existing history (silent — no toast flood on load)
    processAchievements({
      silent: true,
      photoSet: Boolean(currentBgPhoto),
    });
    // Persist any silent backfills
    if (store.achievements && Object.keys(store.achievements).length) {
      storage.saveAchievements(store);
    }
    updateAchievementsBadge();
    updateMascotVisibility();
    if (isMascotEnabled()) {
      // Small delay so first paint settles
      setTimeout(() => speakMascot({ event: 'open' }), 480);
    }
    handleDeepLink();
    window.addEventListener('pageshow', async (e) => {
      if (e.persisted) {
        store = storage.load();
        if (!store.achievements) store.achievements = {};
        if (bgPhoto) {
          try {
            currentBgPhoto = await bgPhoto.initFromStorage();
          } catch {
            /* ignore */
          }
        }
        handleDeepLink();
        render();
        processAchievements({ silent: true, photoSet: Boolean(currentBgPhoto) });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
