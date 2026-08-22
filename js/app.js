/** Water Tracker 2.0 — UI, logging, insights, deep links. */
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
    formatHour,
    formatLiters,
    formatMonthYear,
    formatTime,
    goalFromProfile,
    hydrationPercent,
    electrolytesSticksClamp,
    electrolytesWaterMl,
    mlToOz,
    ozToMl,
    paceCopy,
    paceFor,
    parseDayKey,
    toMl,
    waterFromVolume,
  } = window.WaterUtils;
  const storage = window.WaterStorage;
  const bgPhoto = window.WaterBgPhoto;
  const achievements = window.WaterAchievements;
  const mascotApi = window.WaterMascot;
  const celebrations = window.WaterCelebrations;
  const haptic = window.WaterHaptics ? window.WaterHaptics.haptic : () => {};

  let store = storage.load();
  let undoState = null;
  let lastGoalReached = false;
  let currentBgPhoto = null;
  let activeDrinkId = null;
  let electrolytesSticks = ELECTROLYTES.defaultSticks;
  let achievementToastQueue = [];
  let achievementToastBusy = false;
  /** Unseen unlocks highlighted on the Trophies tab for this visit. */
  let highlightedAchievementIds = new Set();
  let currentView = 'today';
  let onboardStep = 0;
  let editingId = null;
  const TAB_PILL_INSET = 3;
  const tabNav = {
    dragging: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startView: 'today',
    lastX: 0,
    lastT: 0,
    vx: 0,
    left: 0,
    width: 0,
    targetLeft: 0,
    targetWidth: 0,
    raf: 0,
    lastCrossed: -1,
  };

  const calState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    selectedKey: dayKey(),
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function playSound(kind) {
    if (!store.soundEnabled || !window.WaterSound) return;
    window.WaterSound.play(kind);
  }

  function applyTheme(theme) {
    const t = theme === 'dark' || theme === 'light' ? theme : 'system';
    document.documentElement.setAttribute('data-theme', t);
    const light =
      t === 'light' ||
      (t !== 'dark' && window.matchMedia('(prefers-color-scheme: light)').matches);
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute('content', light ? '#f2f7f9' : '#07161d');
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
    undoState = { entry, timer: window.setTimeout(() => dismissUndo(), 5000) };
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
    if (!sheet || !backdrop) return;
    sheet.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      sheet.classList.add('is-open');
      backdrop.classList.add('is-open');
    });
    document.body.classList.add('sheet-open');
    if (mascotApi && typeof mascotApi.hide === 'function') mascotApi.hide();
    haptic('light');
  }

  function closeSheets() {
    $$('.sheet').forEach((s) => {
      s.classList.remove('is-open', 'is-dragging');
      s.style.transform = '';
      setTimeout(() => {
        if (!s.classList.contains('is-open')) s.hidden = true;
      }, 280);
    });
    const backdrop = $('#sheet-backdrop');
    backdrop.classList.remove('is-open');
    backdrop.style.opacity = '';
    setTimeout(() => {
      if (!backdrop.classList.contains('is-open')) backdrop.hidden = true;
    }, 280);
    document.body.classList.remove('sheet-open');
    activeDrinkId = null;
    editingId = null;
  }

  function bindSheetDismiss() {
    const backdrop = $('#sheet-backdrop');
    const DISMISS_PX = 96;
    const DISMISS_VEL = 0.85;
    const IGNORE = 'input, select, textarea, button, label, [contenteditable="true"]';

    $$('.sheet').forEach((sheet) => {
      let startY = 0;
      let startX = 0;
      let lastY = 0;
      let lastT = 0;
      let vy = 0;
      let tracking = false;
      let dragging = false;
      let pointerId = null;

      const resetVisual = () => {
        sheet.classList.remove('is-dragging');
        sheet.style.transform = '';
        if (backdrop) backdrop.style.opacity = '';
      };

      const canStart = (e) => {
        if (!sheet.classList.contains('is-open')) return false;
        if (e.button != null && e.button !== 0) return false;
        const t = e.target;
        if (t.closest(IGNORE)) return false;
        if (t.closest('.sheet-handle, .sheet-header')) return true;
        return sheet.scrollTop <= 0;
      };

      sheet.addEventListener('pointerdown', (e) => {
        if (!canStart(e)) return;
        tracking = true;
        dragging = false;
        pointerId = e.pointerId;
        startY = e.clientY;
        startX = e.clientX;
        lastY = e.clientY;
        lastT = performance.now();
        vy = 0;
      });

      sheet.addEventListener('pointermove', (e) => {
        if (!tracking || e.pointerId !== pointerId) return;
        const now = performance.now();
        const dy = e.clientY - startY;
        const dx = e.clientX - startX;
        vy = (e.clientY - lastY) / Math.max(8, now - lastT);
        lastY = e.clientY;
        lastT = now;

        if (!dragging) {
          if (dy < 10) {
            if (Math.abs(dx) > 14 || dy < -12) tracking = false;
            return;
          }
          if (Math.abs(dx) > dy) {
            tracking = false;
            return;
          }
          dragging = true;
          sheet.classList.add('is-dragging');
          try {
            sheet.setPointerCapture(pointerId);
          } catch {
            /* ignore */
          }
        }

        const y = Math.max(0, dy);
        sheet.style.transform = `translate(-50%, ${y}px)`;
        if (backdrop) {
          const fade = Math.max(0.12, 1 - y / Math.max(280, sheet.offsetHeight * 0.7));
          backdrop.style.opacity = String(fade);
        }
        if (sheet.scrollTop > 0) sheet.scrollTop = 0;
      });

      const end = (e) => {
        if (!tracking || (e.pointerId != null && e.pointerId !== pointerId)) return;
        const dragged = dragging;
        const dy = Math.max(0, (e.clientY != null ? e.clientY : lastY) - startY);
        tracking = false;
        dragging = false;
        pointerId = null;
        if (!dragged) return;
        if (dy > DISMISS_PX || (vy > DISMISS_VEL && dy > 36)) {
          haptic('light');
          closeSheets();
          return;
        }
        resetVisual();
      };

      sheet.addEventListener('pointerup', end);
      sheet.addEventListener('pointercancel', end);
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function tabButtons() {
    return $$('.tab-btn');
  }

  function tabNavMetrics() {
    return tabButtons().map((btn) => ({
      name: btn.dataset.nav,
      btn,
      left: btn.offsetLeft + TAB_PILL_INSET,
      width: Math.max(0, btn.offsetWidth - TAB_PILL_INSET * 2),
      center: btn.offsetLeft + btn.offsetWidth / 2,
    }));
  }

  function tabNavPositionAt(xInGlass, metrics) {
    if (!metrics.length) return { left: 0, width: 0, t: 0, f: 0 };
    const first = metrics[0];
    const last = metrics[metrics.length - 1];
    const span = last.center - first.center;
    let t = span ? (xInGlass - first.center) / span : 0;
    if (t < 0) t *= 0.22;
    else if (t > 1) t = 1 + (t - 1) * 0.22;
    t = clamp(t, -0.07, 1.07);
    return {
      left: first.left + t * (last.left - first.left),
      width: first.width + t * (last.width - first.width),
      t,
      f: t * Math.max(metrics.length - 1, 0),
    };
  }

  function tabIndexFromLeft(left, metrics) {
    if (!metrics.length) return 0;
    const span = metrics[metrics.length - 1].left - metrics[0].left;
    if (!span) return 0;
    return ((left - metrics[0].left) / span) * (metrics.length - 1);
  }

  function readIndicatorPose() {
    const indicator = $('.tab-indicator');
    if (!indicator) return { left: tabNav.left, width: tabNav.width };
    const computed = getComputedStyle(indicator);
    const width = parseFloat(computed.width);
    let left = tabNav.left;
    const t = computed.transform;
    if (t && t !== 'none') {
      const parts = t.replace(/^matrix3d\(|^matrix\(|\)$/g, '').split(',').map(Number);
      const tx = parts.length === 16 ? parts[12] : parts[4];
      if (Number.isFinite(tx)) left = tx;
    }
    return {
      left,
      width: Number.isFinite(width) && width > 0 ? width : tabNav.width,
    };
  }

  function paintTabIndicator(left, width, { stretch = 1, shine } = {}) {
    const indicator = $('.tab-indicator');
    if (!indicator) return;
    const extra = Math.max(0, width * (stretch - 1));
    indicator.style.width = `${Math.max(0, width + extra)}px`;
    indicator.style.transform = `translate3d(${left - extra / 2}px, 0, 0)`;
    indicator.style.setProperty('--blob-stretch', String(stretch));
    if (typeof shine === 'number') indicator.style.setProperty('--blob-shine', `${shine}%`);
    const trail = clamp(-((stretch - 1) * 30) * Math.sign(tabNav.vx || 0), -24, 24);
    indicator.style.setProperty('--blob-trail', `${trail}px`);
  }

  function applyTabHeat(f) {
    tabButtons().forEach((btn, i) => {
      btn.style.setProperty('--tab-heat', clamp(1 - Math.abs(f - i) * 0.92, 0, 1).toFixed(3));
    });
  }

  function clearTabHeat() {
    tabButtons().forEach((btn) => btn.style.removeProperty('--tab-heat'));
  }

  function updateTabIndicator({ animate = true } = {}) {
    if (tabNav.dragging) return;
    const indicator = $('.tab-indicator');
    const active = $('.tab-btn.is-active');
    if (!indicator || !active) return;

    const left = active.offsetLeft + TAB_PILL_INSET;
    const width = Math.max(0, active.offsetWidth - TAB_PILL_INSET * 2);
    tabNav.left = left;
    tabNav.width = width;
    tabNav.targetLeft = left;
    tabNav.targetWidth = width;
    const shouldAnimate = animate && indicator.classList.contains('is-ready') && !prefersReducedMotion();

    if (!shouldAnimate) indicator.classList.add('is-snapping');
    else indicator.classList.remove('is-snapping');

    paintTabIndicator(left, width, { stretch: 1, shine: 30 });

    if (!indicator.classList.contains('is-ready')) {
      void indicator.offsetWidth;
      indicator.classList.add('is-ready');
      indicator.classList.remove('is-snapping');
      return;
    }

    if (!shouldAnimate) {
      void indicator.offsetWidth;
      indicator.classList.remove('is-snapping');
    }
  }

  function bindTabNav() {
    const glass = $('.tab-nav-glass');
    const indicator = $('.tab-indicator');
    if (!glass || !indicator) return;

    const DRAG_PX = 14;
    const FLICK_VX = 0.85;

    const xInGlass = (clientX) => clientX - glass.getBoundingClientRect().left;

    const stopLoop = () => {
      if (!tabNav.raf) return;
      cancelAnimationFrame(tabNav.raf);
      tabNav.raf = 0;
    };

    const tick = () => {
      tabNav.raf = 0;
      if (!tabNav.dragging) return;
      const follow = prefersReducedMotion() ? 1 : 0.4;
      tabNav.left += (tabNav.targetLeft - tabNav.left) * follow;
      tabNav.width += (tabNav.targetWidth - tabNav.width) * follow;
      const stretch = prefersReducedMotion() ? 1 : 1 + Math.min(0.48, Math.abs(tabNav.vx) * 16 * 0.016);
      paintTabIndicator(tabNav.left, tabNav.width, {
        stretch,
        shine: clamp(30 + tabNav.vx * 140, 12, 88),
      });
      const metrics = tabNavMetrics();
      const f = tabIndexFromLeft(tabNav.left, metrics);
      applyTabHeat(f);
      const crossed = Math.round(clamp(f, 0, Math.max(metrics.length - 1, 0)));
      if (metrics.length && crossed !== tabNav.lastCrossed) {
        tabNav.lastCrossed = crossed;
        haptic('light');
      }
      tabNav.vx *= 0.9;
      tabNav.raf = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (!tabNav.raf) tabNav.raf = requestAnimationFrame(tick);
    };

    glass.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (tabNav.pointerId != null) return;
      const metrics = tabNavMetrics();
      if (!metrics.length) return;
      tabNav.pointerId = e.pointerId;
      tabNav.startX = e.clientX;
      tabNav.lastX = e.clientX;
      tabNav.lastT = performance.now();
      tabNav.vx = 0;
      tabNav.moved = false;
      tabNav.startView = currentView;
      tabNav.lastCrossed = metrics.findIndex((m) => m.name === currentView);
    });

    glass.addEventListener('pointermove', (e) => {
      if (tabNav.pointerId !== e.pointerId) return;
      const now = performance.now();
      const dt = Math.max(8, now - tabNav.lastT);
      tabNav.vx = tabNav.vx * 0.5 + ((e.clientX - tabNav.lastX) / dt) * 0.5;
      tabNav.lastX = e.clientX;
      tabNav.lastT = now;

      if (!tabNav.moved && Math.abs(e.clientX - tabNav.startX) < DRAG_PX) return;

      if (!tabNav.moved) {
        tabNav.moved = true;
        tabNav.dragging = true;
        const pose = readIndicatorPose();
        tabNav.left = pose.left;
        tabNav.width = pose.width;
        glass.classList.add('is-dragging-tabs');
        indicator.classList.add('is-dragging');
        indicator.classList.remove('is-settling', 'is-snapping');
        try {
          glass.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }

      const pos = tabNavPositionAt(xInGlass(e.clientX), tabNavMetrics());
      tabNav.targetLeft = pos.left;
      tabNav.targetWidth = pos.width;
      startLoop();
    });

    const finish = (e) => {
      if (tabNav.pointerId !== e.pointerId) return;
      const didDrag = tabNav.moved;
      const vx = tabNav.vx;
      tabNav.pointerId = null;
      tabNav.moved = false;
      stopLoop();
      try {
        if (glass.hasPointerCapture(e.pointerId)) glass.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const swallowClick = () => {
        const swallow = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        glass.addEventListener('click', swallow, true);
        setTimeout(() => glass.removeEventListener('click', swallow, true), 320);
      };

      if (!didDrag) {
        tabNav.dragging = false;
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const btn = hit && hit.closest ? hit.closest('.tab-btn') : null;
        if (btn && btn.dataset.nav) {
          swallowClick();
          haptic('light');
          setView(btn.dataset.nav);
          render();
        }
        return;
      }

      swallowClick();

      const metrics = tabNavMetrics();
      const n = Math.max(metrics.length - 1, 0);
      let idx = Math.round(clamp(tabIndexFromLeft(tabNav.targetLeft, metrics), 0, n));
      const startIdx = Math.max(
        0,
        metrics.findIndex((m) => m.name === (tabNav.startView || currentView))
      );
      if (Math.abs(vx) > FLICK_VX && idx === startIdx) {
        idx = clamp(startIdx + Math.sign(vx), 0, n);
      }
      const next = (metrics[idx] && metrics[idx].name) || currentView;

      paintTabIndicator(tabNav.left, tabNav.width, { stretch: 1, shine: 30 });
      void indicator.offsetWidth;
      tabNav.dragging = false;
      glass.classList.remove('is-dragging-tabs');
      indicator.classList.remove('is-dragging');
      indicator.classList.add('is-settling');
      clearTabHeat();
      haptic('light');
      if (next !== currentView) {
        setView(next);
        render();
      } else {
        updateTabIndicator();
      }
    };

    glass.addEventListener('pointerup', finish);
    glass.addEventListener('pointercancel', finish);
    glass.addEventListener('lostpointercapture', (e) => {
      if (tabNav.pointerId === e.pointerId) finish(e);
    });
    indicator.addEventListener('transitionend', (e) => {
      if (e.target !== indicator) return;
      if (e.propertyName === 'transform' || e.propertyName === 'width') {
        indicator.classList.remove('is-settling');
      }
    });
  }

  function setView(name, { persist = true } = {}) {
    const allowed = ['today', 'insights', 'calendar', 'trophies'];
    const view = allowed.includes(name) ? name : 'today';
    const leavingTrophies = currentView === 'trophies' && view !== 'trophies';
    currentView = view;
    if (leavingTrophies) highlightedAchievementIds.clear();
    $$('.app-view').forEach((el) => {
      const on = el.dataset.view === view;
      el.hidden = !on;
    });
    $$('.tab-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.nav === view);
    });
    updateTabIndicator();
    const titles = {
      today: 'Today',
      insights: 'Insights',
      calendar: 'Calendar',
      trophies: 'Trophies',
    };
    const kicker = $('#view-kicker');
    if (kicker) kicker.textContent = titles[view];
    if (view === 'insights') {
      renderInsights();
      processAchievements({ insightsOpened: true });
    }
    if (view === 'calendar') {
      renderCalendar();
      processAchievements({ calendarOpened: true });
    }
    if (view === 'trophies') {
      processAchievements({ achievementsOpened: true });
      rememberUnseenAchievements();
      markAchievementsSeen();
      renderAchievementsPage();
    }
    if (persist) {
      try {
        history.replaceState({ view }, '', location.pathname + (location.hash || ''));
      } catch {
        /* file:// */
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

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
      pill.setAttribute('aria-label', `${streak} day goal streak`);
    } else {
      pill.hidden = true;
    }
  }

  function processAchievements(ctx = {}) {
    if (!achievements?.evaluate) return [];
    const pending = store.achievementsResetPending === true;
    const heldCount = Object.keys(store.achievementsHeld || {}).length;
    const newly = achievements.evaluate(store, storage, ctx);
    if (
      newly.length ||
      pending !== (store.achievementsResetPending === true) ||
      heldCount !== Object.keys(store.achievementsHeld || {}).length
    ) {
      storage.saveAchievements(store);
      if (!ctx.silent && newly.length) {
        if (newly.length <= 2) {
          for (const id of newly) achievementToastQueue.push(id);
          drainAchievementToasts();
        } else {
          haptic('success');
          showToast(`${newly.length} trophies unlocked`, { duration: 2600 });
        }
        setTimeout(() => {
          if (!document.body.classList.contains('sheet-open')) {
            speakMascot({ event: 'achievement' });
          }
        }, 800);
      }
      if (currentView === 'trophies') {
        rememberUnseenAchievements(newly);
        markAchievementsSeen();
        renderAchievementsPage({ scrollToNew: true });
      } else {
        updateAchievementsBadge();
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
    return { total, goal, reached, streak, elyToday, ...extra };
  }

  function isMascotEnabled() {
    return store.mascotEnabled !== false;
  }

  function updateMascotVisibility() {
    const show = isMascotEnabled();
    const toggle = $('#setting-mascot');
    if (toggle && document.activeElement !== toggle) toggle.checked = show;
    if (mascotApi && typeof mascotApi.sync === 'function') mascotApi.sync();
    else {
      const root = $('#mascot');
      if (root) {
        root.hidden = !show;
        root.setAttribute('aria-hidden', show ? 'false' : 'true');
      }
    }
    updateDewSettingsUi();
  }

  function speakMascot(opts = {}) {
    if (!isMascotEnabled() || !mascotApi) return '';
    if (typeof mascotApi.speak === 'function') return mascotApi.speak(opts);
    return '';
  }

  function updateDewSettingsUi() {
    const block = $('#dew-friendship');
    if (!block) return;
    const show = isMascotEnabled();
    block.hidden = !show;
    if (!show) return;
    const dew = store.dew || {};
    const rank =
      mascotApi && typeof mascotApi.rankFor === 'function'
        ? mascotApi.rankFor(dew.friendship || 0)
        : { label: 'New drop', xp: dew.friendship || 0, pct: 0, hint: '', next: null };
    const label = $('#dew-rank-label');
    const xp = $('#dew-rank-xp');
    const fill = $('#dew-rank-fill');
    const hint = $('#dew-rank-hint');
    if (label) label.textContent = rank.label;
    if (xp) xp.textContent = rank.next ? `${rank.xp} / ${rank.next.min}` : `${rank.xp}`;
    if (fill) fill.style.width = `${Math.round((rank.pct || 0) * 100)}%`;
    if (hint) {
      const extras = [];
      if (dew.pets) extras.push(`${dew.pets} pet${dew.pets === 1 ? '' : 's'}`);
      if (dew.squeezes) extras.push(`${dew.squeezes} squeeze${dew.squeezes === 1 ? '' : 's'}`);
      hint.textContent = extras.length ? `${rank.hint} · ${extras.join(' · ')}` : rank.hint;
    }
  }

  function setMascotEnabled(enabled) {
    storage.setMascotEnabled(store, enabled);
    if (mascotApi && typeof mascotApi.setEnabled === 'function') {
      if (enabled) mascotApi.setEnabled(true);
      else mascotApi.sync();
    }
    updateMascotVisibility();
    showToast(enabled ? 'Dew is back 💧' : 'Dew is hiding. Re-enable anytime in Settings.');
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

  function resetTrophies() {
    if (!confirm('Reset all trophies? You can earn them again. Your drinks stay.')) return;
    if (storage.resetAchievements) storage.resetAchievements(store);
    else {
      store.achievements = {};
      store.achievementsSeen = {};
      store.achievementsHeld = {};
      store.achievementsResetPending = true;
    }
    highlightedAchievementIds.clear();
    haptic('warning');
    updateAchievementsBadge();
    if (currentView === 'trophies') renderAchievementsPage();
    showToast('Trophies reset — log a drink to earn them again');
  }

  function resetTrophy(id) {
    if (!id) return;
    const def = achievements.defById?.(id);
    const label = def?.title || 'this trophy';
    if (!confirm(`Reset “${label}”? You can earn it again.`)) return;
    const ok = storage.resetAchievement ? storage.resetAchievement(store, id) : false;
    if (!ok) return;
    highlightedAchievementIds.delete(id);
    haptic('warning');
    updateAchievementsBadge();
    if (currentView === 'trophies') renderAchievementsPage();
    showToast(`${label} reset`);
  }

  function rememberUnseenAchievements(ids = []) {
    for (const id of ids) {
      if (id) highlightedAchievementIds.add(id);
    }
    if (achievements?.unseenIds) {
      for (const id of achievements.unseenIds(store)) highlightedAchievementIds.add(id);
    }
  }

  function markAchievementsSeen() {
    if (!achievements?.markSeen) return;
    if (achievements.markSeen(store)) storage.saveAchievements(store);
    updateAchievementsBadge();
  }

  function updateAchievementsBadge() {
    const badge = $('#achievements-badge');
    if (!badge || !achievements) return;
    const unseen = achievements.unseenCount ? achievements.unseenCount(store) : 0;
    const n = achievements.unlockedCount(store);
    const total = achievements.totalCount();
    if (unseen > 0) {
      badge.hidden = false;
      badge.removeAttribute('aria-hidden');
      badge.textContent = String(unseen);
    } else {
      badge.hidden = true;
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = '';
    }
    const tab = document.querySelector('.tab-btn[data-nav="trophies"]');
    if (tab) {
      tab.setAttribute(
        'aria-label',
        unseen > 0
          ? `Trophies, ${unseen} new, ${n} of ${total} unlocked`
          : `Trophies, ${n} of ${total} unlocked`
      );
    }
  }

  function achievementCardHtml(a, { isNew = false } = {}) {
    const locked = !a.unlocked;
    const secretLocked = locked && a.secret;
    const title = secretLocked ? '???' : escapeHtml(a.title);
    const desc = secretLocked ? 'Keep hydrating to discover this one.' : escapeHtml(a.desc);
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
    const newPill = isNew ? '<span class="ach-card-new">New</span>' : '';
    const classes = `ach-card${a.unlocked ? ' is-unlocked' : ' is-locked'}${isNew ? ' is-new' : ''}`;
    const resetBtn = a.unlocked
      ? `<button type="button" class="ach-card-reset" data-reset-ach="${escapeHtml(a.id)}" aria-label="Reset ${title}">Reset</button>`
      : '';
    return `
      <article class="${classes}" data-ach-id="${escapeHtml(a.id)}" role="listitem">
        <span class="ach-card-icon" aria-hidden="true">${icon}</span>
        <div class="ach-card-text">
          <h3 class="ach-card-title">${title}${newPill}</h3>
          <p class="ach-card-desc">${desc}</p>
          ${when}
        </div>
        <div class="ach-card-side">
          <span class="ach-card-status" aria-hidden="true">${a.unlocked ? '✓' : ''}</span>
          ${resetBtn}
        </div>
      </article>`;
  }

  function renderAchievementsPage({ scrollToNew = false } = {}) {
    const list = $('#achievements-list');
    const progress = $('#achievements-progress');
    const fill = $('#achievements-progress-fill');
    if (!list || !achievements) return;
    const unlocked = achievements.unlockedCount(store);
    const total = achievements.totalCount();
    const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    if (progress) progress.textContent = `${unlocked} / ${total} unlocked`;
    if (fill) fill.style.width = `${pct}%`;
    const groups = achievements.listForUi(store);
    const newItems = [];
    for (const g of groups) {
      for (const a of g.items) {
        if (a.unlocked && highlightedAchievementIds.has(a.id)) newItems.push(a);
      }
    }
    newItems.sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));
    const justUnlocked =
      newItems.length > 0
        ? `<section id="ach-just-unlocked" class="ach-group ach-group-new">
            <h3 class="ach-group-title">Just unlocked</h3>
            <div class="ach-group-grid">${newItems.map((a) => achievementCardHtml(a, { isNew: true })).join('')}</div>
          </section>`
        : '';
    const catalog = groups
      .map((g) => {
        const items = g.items
          .map((a) => achievementCardHtml(a, { isNew: Boolean(a.unlocked && highlightedAchievementIds.has(a.id)) }))
          .join('');
        return `<section class="ach-group"><h3 class="ach-group-title">${escapeHtml(g.category)}</h3><div class="ach-group-grid">${items}</div></section>`;
      })
      .join('');
    list.innerHTML = justUnlocked + catalog;
    if (scrollToNew && newItems.length) {
      const spotlight = $('#ach-just-unlocked');
      if (spotlight && typeof spotlight.scrollIntoView === 'function') {
        spotlight.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    }
  }

  function lockPortraitOrientation() {
    try {
      const orient = screen.orientation || screen.mozOrientation || screen.msOrientation;
      if (orient && typeof orient.lock === 'function') {
        const p = orient.lock('portrait');
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch {
      /* iOS often rejects */
    }
  }

  function updateRotateLock() {
    const el = $('#rotate-lock');
    if (!el) return;
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
        n >= 100 ? `${n}-day legend — unreal` : n >= 30 ? `${n}-day milestone — locked in` : `${n}-day streak — beautiful`;
      title = n >= 365 ? 'A full year hydrated' : n >= 100 ? `${n}-day legend` : `${n}-day streak`;
      subtitle = n >= 30 ? 'Consistency looks good on you' : 'Chain reaction';
    } else if (n >= 2) {
      toastMsg = `Goal met · ${n}-day streak 🔥`;
      subtitle = `${n}-day streak and counting`;
    }
    showToast(toastMsg, { duration: n >= 7 ? 3200 : 2600 });
    playSound('goal');
    if (celebrations?.playForGoalMet) {
      celebrations.playForGoalMet({ streak: n, title, subtitle });
      setTimeout(() => pulseWave(), 180);
    }
  }

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
      celebrations.play(id, { title: 'Preview', subtitle: id.replace(/-/g, ' '), streak, stamp: 'WOW', short: '★' });
    } else if (raw === 'goal' || raw === 'streak' || raw === 'milestone') {
      id = celebrations.play(raw, {
        title: raw === 'goal' ? 'Goal met' : `${streak}-day streak`,
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

  function playElectrolytesFx() {
    const fx = $('#electrolytes-fx');
    const wrap = $('.gauge-wrap');
    const sparks = $('#ely-sparks');
    if (!fx) return;
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
    void fx.offsetWidth;
    fx.classList.add('is-active');
    if (wrap) {
      wrap.classList.remove('is-charged');
      void wrap.offsetWidth;
      wrap.classList.add('is-charged');
    }
    document.body.classList.add('electrolytes-charged');
    playSound('ely');
    clearTimeout(playElectrolytesFx._t);
    playElectrolytesFx._t = setTimeout(() => {
      fx.classList.remove('is-active');
      document.body.classList.remove('electrolytes-charged');
      setTimeout(() => {
        if (!fx.classList.contains('is-active')) fx.hidden = true;
      }, 320);
      if (wrap) setTimeout(() => wrap.classList.remove('is-charged'), 900);
    }, 1100);
  }

  function renderGauge(total, goal) {
    const pct = goal > 0 ? total / goal : 0;
    const pctDisplay = Math.round(pct * 100);
    const reached = total >= goal;
    const visualPct = clamp(pct, 0, 1);
    const ring = $('#progress-ring');
    if (ring) {
      const circumference = 2 * Math.PI * 88;
      ring.style.strokeDasharray = `${circumference}`;
      ring.style.strokeDashoffset = `${circumference * (1 - visualPct)}`;
      ring.classList.toggle('is-complete', reached);
    }
    const wave = $('#wave-fill');
    if (wave) {
      const SURFACE_Y = 100;
      const WELL_TOP = 28;
      const WELL_BOTTOM = 172;
      const emptyLift = WELL_BOTTOM - SURFACE_Y + 8;
      const fullLift = WELL_TOP - SURFACE_Y - 10;
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
    const totalEl = $('#total-value');
    const unitEl = $('#total-unit');
    const goalCap = $('#goal-caption');
    const pctEl = $('#pct-label');
    if (totalEl) totalEl.textContent = formatAmount(total, unit);
    if (unitEl) unitEl.textContent = unit;
    if (goalCap) goalCap.textContent = `of ${formatAmountWithUnit(goal, unit)} goal`;
    if (pctEl) pctEl.textContent = `${pctDisplay}%`;
    return { pct, pctDisplay, reached };
  }

  function renderPace(total, goal) {
    const pace = paceFor(total, goal, { wakeHour: store.wakeHour, sleepHour: store.sleepHour });
    const label = $('#pace-label');
    const meta = $('#pace-meta');
    const fill = $('#pace-fill');
    const expected = $('#pace-expected');
    const card = $('#pace-card');
    if (!card) return pace;
    card.dataset.state = pace.state;
    const leftVsPace = Math.max(0, pace.expected - total);
    if (label) {
      const titles = {
        done: 'Goal met',
        ahead: 'Ahead of pace',
        behind: 'Behind pace',
        early: 'Day warming up',
        'on-track': 'On track',
        rest: 'Evening rest',
      };
      label.textContent = titles[pace.state] || 'On track';
    }
    if (meta) meta.textContent = paceCopy(pace.state, leftVsPace, store.unit);
    if (fill) fill.style.width = `${Math.round(clamp(goal > 0 ? total / goal : 0, 0, 1) * 100)}%`;
    if (expected) expected.style.left = `${Math.round(pace.pctOfDay * 100)}%`;
    return pace;
  }

  function renderLogList(listEl, emptyEl, entries, { actionable = true } = {}) {
    if (!listEl) return;
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
      const actions = actionable
        ? `<div class="log-actions">
            <button type="button" class="log-edit" aria-label="Edit entry" data-edit="${e.id}">Edit</button>
            <button type="button" class="log-delete" aria-label="Delete entry" data-delete="${e.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
            </button>
          </div>`
        : '';
      li.innerHTML = entryLogHtml(e, unit) + actions;
      listEl.appendChild(li);
    }
  }

  function renderWeek(target, { openCalendarOnClick = true } = {}) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const unit = store.unit;
    const goal = store.goalMl;
    const today = dayKey();
    const week = storage.weekTotals(store, 7);
    const maxBar = Math.max(goal, ...week.map((d) => d.total), 1);
    el.innerHTML = '';
    for (const day of week) {
      const h = (day.total / maxBar) * 100;
      const isToday = day.key === today;
      const done = storage.dayMetGoal(store, day.key, day.total);
      const col = document.createElement('button');
      col.type = 'button';
      col.className = 'week-col' + (isToday ? ' is-today' : '') + (done ? ' is-done' : '');
      col.setAttribute('aria-label', `${formatDayLabel(day.date)}: ${formatAmountWithUnit(day.total, unit)}`);
      col.dataset.dayKey = day.key;
      col.innerHTML = `
        <div class="week-bar-track" title="${formatAmountWithUnit(day.total, unit)}">
          <div class="week-bar" style="height:${clamp(h, day.total > 0 ? 6 : 0, 100)}%"></div>
        </div>
        <span class="week-label">${formatDayLabel(day.date, { short: true }).slice(0, 2)}</span>`;
      if (openCalendarOnClick) {
        col.addEventListener('click', () => {
          calState.selectedKey = day.key;
          const d = parseDayKey(day.key);
          calState.year = d.getFullYear();
          calState.month = d.getMonth();
          setView('calendar');
        });
      }
      el.appendChild(col);
    }
  }

  function renderHourTimeline(el, hours, { tall = false } = {}) {
    if (!el) return;
    const max = Math.max(1, ...hours);
    el.innerHTML = hours
      .map((ml, h) => {
        const pct = Math.round((ml / max) * 100);
        return `<span class="hour-col${ml > 0 ? ' has' : ''}${tall ? ' tall' : ''}" title="${formatHour(h)} · ${formatAmountWithUnit(ml, store.unit)}" style="--h:${pct}"><i></i></span>`;
      })
      .join('');
  }

  function getOwalaBottle() {
    const bottles = store.bottles && store.bottles.length ? store.bottles : storage.defaultBottles();
    const match = storage.isOwalaBottle
      ? bottles.find((b) => storage.isOwalaBottle(b))
      : bottles.find((b) => b.id === 'owala');
    return match || storage.defaultBottles()[0];
  }

  function logBottle(bottle) {
    if (!bottle) return;
    addDrinkVolume({ ...bottle, hydration: 1 }, Math.round(ozToMl(bottle.oz)), { bottleId: bottle.id });
  }

  function renderBottles() {
    const bottles = store.bottles && store.bottles.length ? store.bottles : storage.defaultBottles();
    const owala = getOwalaBottle();
    const owalaBtn = $('#btn-owala');
    if (owalaBtn && owala) {
      const amt = formatAmountWithUnit(Math.round(ozToMl(owala.oz)), store.unit);
      const amtEl = owalaBtn.querySelector('[data-drink-amount]');
      if (amtEl) amtEl.textContent = `${amt} water`;
      owalaBtn.setAttribute('aria-label', `Add full ${owala.label}, ${amt} water`);
    }

    const row = $('#bottles-row');
    if (!row) return;
    const extras = bottles.filter((b) => (storage.isOwalaBottle ? !storage.isOwalaBottle(b) : b.id !== 'owala'));
    row.innerHTML = extras
      .map((b) => {
        const ml = Math.round(ozToMl(b.oz));
        const amt = formatAmountWithUnit(ml, store.unit);
        return `
        <button type="button" class="bottle-btn" data-bottle="${escapeHtml(b.id)}" aria-label="Add full ${escapeHtml(b.label)}, ${amt} water">
          <span class="owala-btn-mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M12 4h8l1 3v2c3 1 5 4 5 8v7a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-7c0-4 2-7 5-8V7l1-3z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
              <path d="M11 14h10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="owala-btn-text">
            <span class="owala-btn-title">${escapeHtml(b.label)}</span>
            <span class="owala-btn-sub">Full bottle · <span data-drink-amount>${amt} water</span></span>
          </span>
          <span class="owala-btn-plus" aria-hidden="true">+</span>
        </button>`;
      })
      .join('');
  }

  function renderDrinksGrid() {
    const grid = $('#drinks-grid');
    if (!grid) return;
    const drinks = storage.allDrinkPresets(store);
    grid.innerHTML = drinks
      .map((d) => {
        const pct = hydrationPercent(d.hydration);
        const custom = !(DRINK_PRESETS || []).some((p) => p.id === d.id);
        return `
      <button type="button" class="drink-chip${custom ? ' is-custom' : ''}" data-drink="${escapeHtml(d.id)}">
        <span class="drink-chip-top">
          <span class="drink-chip-name">${escapeHtml(d.label)}</span>
          <span class="drink-chip-pct" data-drink-pct>${pct}% water</span>
        </span>
        <span class="drink-chip-amt" data-drink-amount>${formatDrinkChip(d)}</span>
      </button>`;
      })
      .join('');
  }

  function renderSettingsBottles() {
    const host = $('#settings-bottles');
    if (!host) return;
    const bottles = store.bottles || [];
    host.innerHTML = bottles
      .map((b) => {
        const removable = b.id !== 'owala';
        return `<div class="mini-row">
          <span>${escapeHtml(b.label)} · ${b.oz} oz</span>
          ${
            removable
              ? `<button type="button" class="link-btn" data-remove-bottle="${escapeHtml(b.id)}">Remove</button>`
              : `<span class="mini-tag">Default</span>`
          }
        </div>`;
      })
      .join('');
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
    const today = dayKey();
    const { cells } = storage.monthTotals(store, year, month);
    label.textContent = formatMonthYear(new Date(year, month, 1));
    const now = new Date();
    const nextBtn = $('#cal-next');
    if (nextBtn) {
      const isCurrentOrFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());
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
      const dayGoal = storage.goalForDay(store, cell.key);
      btn.className = `cal-cell ${dayFillClass(cell.total, dayGoal)}`;
      if (cell.key === today) btn.classList.add('is-today');
      if (cell.key === selectedKey) btn.classList.add('is-selected');
      if (cell.key > today) {
        btn.classList.add('is-future');
        btn.disabled = true;
      }
      btn.dataset.dayKey = cell.key;
      const pct = dayGoal > 0 ? Math.min(100, Math.round((cell.total / dayGoal) * 100)) : 0;
      btn.setAttribute(
        'aria-label',
        `${formatDayLabel(cell.date)}: ${formatAmountWithUnit(cell.total, store.unit)}${cell.total > 0 ? ` (${pct}% of goal)` : ''}`
      );
      btn.innerHTML = `<span class="cal-day-num">${cell.day}</span><span class="cal-fill" style="--day-pct:${clamp(pct, 0, 100)}"></span>`;
      grid.appendChild(btn);
    }
    renderCalDayPanel();
  }

  function renderCalDayPanel() {
    const panel = $('#cal-day-panel');
    if (!panel) return;
    if (!calState.selectedKey) calState.selectedKey = dayKey();
    const selected = calState.selectedKey;
    const date = parseDayKey(selected);
    const entries = storage.entriesForDay(store, selected);
    const total = storage.totalForDay(store, selected);
    const goal = storage.goalForDay(store, selected);
    const unit = store.unit;
    const pct = goal > 0 ? Math.round((total / goal) * 100) : 0;
    $('#cal-day-title').textContent = formatDayLabel(date);
    const summary = $('#cal-day-summary');
    if (total === 0) summary.textContent = `0 ${unit} · 0% of ${formatAmountWithUnit(goal, unit)} goal`;
    else if (total >= goal) summary.textContent = `${formatAmountWithUnit(total, unit)} · Goal met (${pct}%)`;
    else summary.textContent = `${formatAmountWithUnit(total, unit)} · ${pct}% of goal`;
    renderLogList($('#cal-day-list'), $('#cal-day-empty'), entries, { actionable: selected === dayKey() });
  }

  function renderInsights() {
    const data = storage.insights(store);
    const set = (id, text) => {
      const el = $(id);
      if (el) el.textContent = text;
    };
    set('#stat-streak', String(data.streak));
    set('#stat-longest', String(data.longest));
    set('#stat-week', `${data.daysMet}/7`);
    set('#stat-life', formatLiters(data.lifetimeMl));
    const weekMeta = $('#week-volume-meta');
    if (weekMeta) {
      weekMeta.textContent = `${formatAmountWithUnit(data.weekMl, store.unit)} of ${formatAmountWithUnit(data.weekGoal, store.unit)}`;
    }
    renderWeek('#insight-week-bars', { openCalendarOnClick: true });
    const mix = $('#mix-list');
    const mixEmpty = $('#mix-empty');
    if (mix) {
      if (!data.mix.length) {
        mix.innerHTML = '';
        if (mixEmpty) mixEmpty.hidden = false;
      } else {
        if (mixEmpty) mixEmpty.hidden = true;
        const max = data.mix[0].ml || 1;
        const colors = ['#3ec9e0', '#c084fc', '#5dcca8', '#e0b15a', '#7ee0ff', '#e07a7a', '#8fb4c4'];
        mix.innerHTML = data.mix
          .map((row, i) => {
            const w = Math.round((row.ml / max) * 100);
            return `<div class="mix-row">
              <span class="mix-swatch" style="background:${colors[i % colors.length]}"></span>
              <span class="mix-name">${escapeHtml(row.label)}</span>
              <span class="mix-amt">${formatAmountWithUnit(row.ml, store.unit)}</span>
              <span class="mix-bar"><i style="width:${w}%"></i></span>
            </div>`;
          })
          .join('');
      }
    }
    renderHourTimeline($('#insight-hours'), data.hours, { tall: true });
  }

  function maybeRecordPaceWin() {
    const total = storage.totalForDay(store);
    const pace = paceFor(total, store.goalMl, { wakeHour: store.wakeHour, sleepHour: store.sleepHour });
    if (pace.state === 'ahead' || pace.state === 'on-track' || pace.state === 'done') {
      if (storage.recordPaceWin(store)) processAchievements({ paceWin: true });
    }
  }

  function render() {
    const unit = store.unit;
    const goal = store.goalMl;
    const today = dayKey();
    const total = storage.totalForDay(store, today);
    const entries = storage.entriesForDay(store, today);
    const greetName = store.name ? `, ${store.name}` : '';
    const dateEl = $('#date-label');
    if (dateEl) {
      dateEl.textContent = currentView === 'today' ? formatDayLabel(new Date()) : formatDayLabel(new Date());
    }
    if (currentView === 'today' && store.name && $('#view-kicker')) {
      $('#view-kicker').textContent = `Today${greetName}`;
    }

    const { pct, reached } = renderGauge(total, goal);
    renderPace(total, goal);

    const status = $('#status-chip');
    const elyToday = entries.some((e) => typeof e.electrolytes === 'number' && e.electrolytes >= 1);
    if (status) {
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
    }

    if (reached && !lastGoalReached && total > 0 && render._fromUndo) {
      haptic('success');
      celebrateGoalMet(storage.currentStreak(store, { requireToday: true }));
    }
    lastGoalReached = reached;

    renderStreakPill();
    $$('[data-quick]').forEach((btn) => {
      const ml = Number(btn.dataset.quick);
      const amountEl = btn.querySelector('.quick-amount');
      const unitEl = btn.querySelector('.quick-unit');
      if (amountEl) amountEl.textContent = `+${formatAmount(ml, unit)}`;
      if (unitEl) unitEl.textContent = `${unit} water`;
    });

    renderBottles();
    renderDrinksGrid();
    renderLogList($('#log-list'), $('#log-empty'), entries, { actionable: true });
    renderWeek('#week-bars');
    renderHourTimeline($('#hour-timeline'), storage.hourlyTotals(store));

    if (currentView === 'calendar') renderCalendar();
    if (currentView === 'insights') renderInsights();
    if (currentView === 'trophies') renderAchievementsPage();

    const goalInput = $('#setting-goal');
    if (goalInput && document.activeElement !== goalInput) {
      goalInput.value = unit === 'oz' ? String(Math.round(mlToOz(goal) * 10) / 10) : String(goal);
    }
    const goalUnit = $('#setting-goal-unit');
    if (goalUnit) goalUnit.textContent = unit;
    $$('input[name="unit"]').forEach((r) => {
      r.checked = r.value === unit;
    });
    $$('input[name="theme"]').forEach((r) => {
      r.checked = r.value === (store.theme || 'system');
    });
    const wake = $('#setting-wake');
    const sleep = $('#setting-sleep');
    if (wake && document.activeElement !== wake) wake.value = String(store.wakeHour ?? 7);
    if (sleep && document.activeElement !== sleep) sleep.value = String(store.sleepHour ?? 22);
    const rem = $('#setting-reminders');
    if (rem && document.activeElement !== rem) rem.checked = !!store.reminders?.enabled;
    const remField = $('#reminder-times-field');
    if (remField) remField.hidden = !store.reminders?.enabled;
    const remTimes = $('#setting-reminder-times');
    if (remTimes && document.activeElement !== remTimes) {
      remTimes.value = (store.reminders?.times || []).join(', ');
    }
    const sound = $('#setting-sound');
    if (sound && document.activeElement !== sound) sound.checked = !!store.soundEnabled;

    updateBgPhotoUi();
    updateAchievementsBadge();
    updateMascotVisibility();
    renderSettingsBottles();
    applyTheme(store.theme);
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
    if (dimRange && bgPhoto) dimRange.value = String(Math.round(bgPhoto.getDim() * 100));
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
      showToast(err && err.message ? err.message : 'Could not use that photo.', { duration: 3200 });
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
      if (!justMetGoal) haptic('success');
      pulseWave();
      playElectrolytesFx();
    } else if (!justMetGoal) {
      haptic('medium');
      pulseWave();
      playSound('sip');
    } else {
      pulseWave();
    }
    render();

    const water = formatAmountWithUnit(entry.ml, store.unit);
    if (justMetGoal) {
      haptic('success');
      const streak = storage.currentStreak(store, { requireToday: true });
      const delay = isEly || opts.charged ? 700 : 120;
      setTimeout(() => celebrateGoalMet(streak), delay);
      maybeRecordPaceWin();
    } else if (isEly) {
      const sticks = entry.electrolytes;
      showToast(`⚡ +${water} water · ${sticks === 1 ? '1 stick' : `${sticks} sticks`}`, { duration: 2800 });
    } else if (entry.label && entry.volumeMl && entry.hydration && entry.hydration < 1) {
      const vol = formatAmountWithUnit(entry.volumeMl, store.unit);
      const pctH = hydrationPercent(entry.hydration);
      showToast(`+${water} water · ${entry.label} (${vol}, ${pctH}%)`);
    } else if (entry.label) {
      showToast(`+${water} · ${entry.label}`);
    } else {
      showToast(`+${water} water`);
    }

    const bottleLike = entry.bottleId === 'owala' || (entry.label && String(entry.label).toLowerCase() === 'owala');
    const mascotEvent = justMetGoal ? 'goal' : isEly ? 'ely' : bottleLike ? 'owala' : 'sip';
    setTimeout(() => speakMascot({ event: mascotEvent }), justMetGoal ? 900 : isEly ? 700 : 350);
    const achDelay = justMetGoal ? 3200 : isEly ? 2900 : 1600;
    setTimeout(() => processAchievements(), achDelay);
    return entry;
  }

  function addElectrolytes(volumeMl, sticks) {
    const n = electrolytesSticksClamp(sticks);
    const vol = electrolytesWaterMl(volumeMl);
    if (vol <= 0) return null;
    return addWater(vol, { label: ELECTROLYTES.label, volumeMl: vol, electrolytes: n, charged: true });
  }

  function addDrinkVolume(preset, volumeMl, extra = {}) {
    if (!preset || !volumeMl || volumeMl <= 0) return;
    const hydration = Number.isFinite(preset.hydration) ? preset.hydration : 1;
    const waterMl = waterFromVolume(volumeMl, hydration);
    return addWater(waterMl, {
      label: preset.label,
      volumeMl: Math.round(volumeMl),
      hydration: hydration < 1 ? hydration : undefined,
      ...extra,
    });
  }

  function openElectrolytesSheet() {
    electrolytesSticks = ELECTROLYTES.defaultSticks;
    const unit = store.unit;
    const amount = $('#electrolytes-amount');
    const unitLabel = $('#electrolytes-unit');
    if (unitLabel) unitLabel.textContent = unit;
    if (amount) {
      amount.value = unit === 'oz' ? String(ELECTROLYTES.defaultOz) : String(Math.round(ozToMl(ELECTROLYTES.defaultOz)));
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

  function openDrinkSheet(drinkId) {
    const preset = storage.resolveDrink(store, drinkId);
    if (!preset) return;
    if (preset.kind === 'bottle' || drinkId === 'owala') {
      addDrinkVolume(preset, Math.round(ozToMl(preset.oz)), { bottleId: preset.id });
      return;
    }
    activeDrinkId = drinkId;
    refreshDrinkSheetUi();
    const input = $('#drink-custom-amount');
    if (input) input.value = '';
    openSheet('#drink-sheet');
  }

  function refreshDrinkSheetUi() {
    const preset = storage.resolveDrink(store, activeDrinkId);
    if (!preset) return;
    const unit = store.unit;
    const pct = hydrationPercent(preset.hydration);
    const title = $('#drink-sheet-title');
    const hint = $('#drink-sheet-hint');
    const quickMain = $('#drink-quick-main');
    const quickWater = $('#drink-quick-water');
    const unitLabel = $('#drink-custom-unit');
    if (title) title.textContent = preset.label;
    if (hint) {
      hint.textContent =
        pct >= 100 ? 'Counts fully as water toward your goal.' : `Only ${pct}% of what you pour counts as water toward your goal.`;
    }
    const quickVolMl = Math.round(ozToMl(preset.oz));
    const quickWaterMl = waterFromVolume(quickVolMl, preset.hydration);
    if (quickMain) quickMain.textContent = `Add ${formatAmountWithUnit(quickVolMl, unit)}`;
    if (quickWater) {
      quickWater.textContent =
        pct >= 100
          ? `${formatAmountWithUnit(quickWaterMl, unit)} water`
          : `~${formatAmountWithUnit(quickWaterMl, unit)} water · ${pct}%`;
    }
    if (unitLabel) unitLabel.textContent = unit;
    updateDrinkCustomPreview();
  }

  function updateDrinkCustomPreview() {
    const preset = storage.resolveDrink(store, activeDrinkId);
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
    preview.textContent =
      pct >= 100
        ? `Adds ${formatAmountWithUnit(waterMl, store.unit)} water.`
        : `Adds ~${formatAmountWithUnit(waterMl, store.unit)} water (${pct}% of ${formatAmountWithUnit(volumeMl, store.unit)}).`;
  }

  function deleteEntry(id) {
    const removed = storage.removeEntry(store, id);
    if (!removed) return;
    haptic('warning');
    playSound('undo');
    render();
    setUndo(removed);
  }

  function openEditSheet(id) {
    const entry = store.entries.find((e) => e.id === id);
    if (!entry) return;
    editingId = id;
    $('#edit-id').value = id;
    $('#edit-unit').textContent = store.unit;
    $('#edit-amount').value =
      store.unit === 'oz' ? String(Math.round(mlToOz(entry.ml) * 10) / 10) : String(entry.ml);
    const d = new Date(entry.ts);
    $('#edit-time').value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    $('#edit-meta').textContent = entry.label ? entry.label : 'Plain water';
    openSheet('#edit-sheet');
  }

  function saveEdit(ev) {
    ev.preventDefault();
    const id = $('#edit-id').value;
    const ml = toMl($('#edit-amount').value, store.unit);
    if (!ml) {
      showToast('Enter a valid amount');
      return;
    }
    const entry = store.entries.find((e) => e.id === id);
    if (!entry) return;
    const time = $('#edit-time').value;
    let ts = entry.ts;
    if (time && /^\d{2}:\d{2}$/.test(time)) {
      const [hh, mm] = time.split(':').map(Number);
      const d = new Date(entry.ts);
      d.setHours(hh, mm, 0, 0);
      ts = d.getTime();
    }
    storage.updateEntry(store, id, { ml, ts });
    closeSheets();
    haptic('medium');
    render();
    showToast('Entry updated');
    processAchievements({ entryEdited: true });
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
    if (params.get('theme') === 'dark' || params.get('theme') === 'light' || params.get('theme') === 'system') {
      storage.setTheme(store, params.get('theme'));
      applyTheme(store.theme);
      changed = true;
    }

    const goalRaw = params.get('goal');
    if (goalRaw) {
      const u = params.get('unit') === 'oz' ? 'oz' : params.get('unit') === 'ml' ? 'ml' : store.unit;
      const ml = toMl(goalRaw, u);
      if (ml) {
        storage.setGoal(store, ml);
        showToast(`Goal set to ${formatAmountWithUnit(store.goalMl, store.unit)}`);
        changed = true;
      }
    }

    if (params.has('celebrate') || params.has('fx')) {
      const celeRaw = params.get('celebrate') || params.get('fx') || 'random';
      setTimeout(() => previewCelebration(celeRaw || 'random'), 400);
      changed = true;
    }

    const drinkId = params.get('drink');
    if (drinkId === 'electrolytes' || params.has('electrolytes')) {
      const u = params.get('unit') === 'oz' ? 'oz' : params.get('unit') === 'ml' ? 'ml' : store.unit;
      const sticks = electrolytesSticksClamp(params.get('electrolytes') || params.get('sticks') || '1');
      let volumeMl = params.get('add') ? toMl(params.get('add'), u) : null;
      if (!volumeMl) volumeMl = Math.round(ozToMl(ELECTROLYTES.defaultOz));
      addElectrolytes(volumeMl, sticks);
      changed = true;
    } else if (drinkId) {
      const preset = storage.resolveDrink(store, drinkId) || drinkById(drinkId);
      if (preset) {
        addDrinkVolume(preset, Math.round(ozToMl(preset.oz)), preset.kind === 'bottle' ? { bottleId: preset.id } : { drinkId: preset.id });
        changed = true;
      }
    }

    const addRaw = params.get('add');
    if (addRaw && !drinkId && !params.has('electrolytes')) {
      const u = params.get('unit') === 'oz' ? 'oz' : 'ml';
      const ml = toMl(addRaw, u);
      if (ml) {
        addWater(ml, { label: params.get('label') || undefined });
        changed = true;
      }
    }

    const open = params.get('open');
    if (open === 'calendar') setView('calendar');
    else if (open === 'achievements' || open === 'trophies') setView('trophies');
    else if (open === 'insights') setView('insights');
    else if (open === 'settings') {
      render();
      openSheet('#settings-sheet');
    } else if (open === 'today') setView('today');

    if (changed || params.has('open') || params.has('add') || params.has('goal') || params.has('unit') || params.has('drink') || params.has('electrolytes')) {
      try {
        const url = new URL(window.location.href);
        url.search = '';
        history.replaceState({}, '', url.pathname + (url.hash || ''));
      } catch {
        /* ignore */
      }
    }
  }

  function showOnboarding() {
    const overlay = $('#onboard');
    if (!overlay) return;
    overlay.hidden = false;
    document.body.classList.add('is-onboarding');
    onboardStep = 0;
    paintOnboard();
  }

  function paintOnboard() {
    $$('.onboard-step').forEach((el) => {
      el.hidden = Number(el.dataset.step) !== onboardStep;
    });
    $$('.onboard-dots i').forEach((dot, i) => dot.classList.toggle('is-on', i === onboardStep));
    const back = $('#onboard-back');
    const next = $('#onboard-next');
    if (back) back.hidden = onboardStep === 0;
    if (next) next.textContent = onboardStep === 3 ? 'Let’s go' : 'Continue';
    const unit = document.querySelector('input[name="onboard-unit"]:checked')?.value || 'oz';
    const unitLabel = $('#onboard-goal-unit');
    if (unitLabel) unitLabel.textContent = unit;
    const goal = $('#onboard-goal');
    if (goal && !goal.dataset.touched) {
      goal.value = unit === 'oz' ? '68' : '2000';
    }
  }

  function finishOnboarding() {
    const name = ($('#onboard-name')?.value || '').trim();
    const unit = document.querySelector('input[name="onboard-unit"]:checked')?.value || 'oz';
    const goalMl = toMl($('#onboard-goal')?.value, unit) || (unit === 'oz' ? ozToMl(68) : 2000);
    storage.setOnboarded(store, { name, unit, goalMl });
    $('#onboard').hidden = true;
    document.body.classList.remove('is-onboarding');
    updateTabIndicator({ animate: false });
    haptic('success');
    render();
    processAchievements({ onboarded: true });
    if (isMascotEnabled()) setTimeout(() => speakMascot({ event: 'open' }), 400);
    showToast(name ? `Welcome, ${name}` : 'Welcome to Water 2.0');
  }

  function updateLabPreview() {
    const preview = $('#lab-preview');
    if (!preview) return;
    const ml = goalFromProfile({
      weight: $('#lab-weight')?.value,
      weightUnit: $('#lab-weight-unit')?.value || 'lb',
      activity: $('#lab-activity')?.value || 'light',
      climate: $('#lab-climate')?.value || 'mild',
    });
    if (!ml) {
      preview.textContent = 'Enter a weight to see a suggested goal.';
      preview.dataset.ml = '';
      return;
    }
    preview.textContent = `Suggested: ${formatAmountWithUnit(ml, store.unit)} a day`;
    preview.dataset.ml = String(ml);
  }

  function bind() {
    $$('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        haptic('light');
        setView(btn.dataset.nav);
        render();
      });
    });
    bindTabNav();
    $('#btn-open-insights')?.addEventListener('click', () => {
      setView('insights');
      render();
    });

    $$('[data-quick]').forEach((btn) => {
      btn.addEventListener('click', () => addWater(Number(btn.dataset.quick)));
    });

    $('#btn-owala')?.addEventListener('click', () => logBottle(getOwalaBottle()));

    $('#bottles-row')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bottle]');
      if (!btn) return;
      const bottle = (store.bottles || []).find((b) => b.id === btn.dataset.bottle);
      if (!bottle) return;
      logBottle(bottle);
    });

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

    $('#drinks-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-drink]');
      if (!btn) return;
      openDrinkSheet(btn.dataset.drink);
    });
    $('#drink-quick-default')?.addEventListener('click', () => {
      const preset = storage.resolveDrink(store, activeDrinkId);
      if (!preset) return;
      closeSheets();
      addDrinkVolume(preset, Math.round(ozToMl(preset.oz)), { drinkId: preset.id });
    });
    $('#drink-custom-amount')?.addEventListener('input', updateDrinkCustomPreview);
    $('#drink-custom-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const preset = storage.resolveDrink(store, activeDrinkId);
      if (!preset) return;
      const volumeMl = toMl($('#drink-custom-amount').value, store.unit);
      if (!volumeMl) {
        showToast('Enter a valid amount');
        return;
      }
      closeSheets();
      addDrinkVolume(preset, volumeMl, { drinkId: preset.id });
    });

    $('#btn-custom')?.addEventListener('click', () => {
      const input = $('#custom-amount');
      input.value = '';
      $('#custom-unit-label').textContent = store.unit;
      openSheet('#custom-sheet');
      setTimeout(() => input.focus(), 320);
    });
    $('#custom-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const ml = toMl($('#custom-amount').value, store.unit);
      if (!ml) {
        showToast('Enter a valid amount');
        return;
      }
      closeSheets();
      addWater(ml);
    });

    $('#btn-add-drink')?.addEventListener('click', () => openSheet('#new-drink-sheet'));
    $('#new-drink-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const label = $('#new-drink-name').value;
      const oz = Number($('#new-drink-oz').value);
      const pct = Number($('#new-drink-pct').value);
      const drink = storage.addCustomDrink(store, { label, oz, hydration: pct / 100 });
      if (!drink) {
        showToast('Check the drink details');
        return;
      }
      closeSheets();
      render();
      showToast(`${drink.label} added`);
      processAchievements({ drinkAdded: true });
    });

    $('#btn-add-bottle')?.addEventListener('click', () => openSheet('#bottle-sheet'));
    $('#bottle-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const bottle = storage.addBottle(store, { label: $('#bottle-name').value, oz: Number($('#bottle-oz').value) });
      if (!bottle) {
        showToast('Check the bottle details');
        return;
      }
      closeSheets();
      render();
      showToast(`${bottle.label} ready`);
      processAchievements({ bottleAdded: true });
    });
    $('#settings-bottles')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-bottle]');
      if (!btn) return;
      storage.removeBottle(store, btn.dataset.removeBottle);
      render();
    });

    $('#btn-settings')?.addEventListener('click', () => {
      render();
      openSheet('#settings-sheet');
    });
    $('#setting-mascot')?.addEventListener('change', (e) => {
      setMascotEnabled(!!e.target.checked);
      haptic('light');
    });
    $('#btn-dew-home')?.addEventListener('click', () => {
      if (mascotApi && typeof mascotApi.goHome === 'function') mascotApi.goHome();
      haptic('light');
    });

    const bgInput = $('#bg-photo-input');
    const bgChoose = $('#btn-bg-photo');
    if (bgChoose && bgInput) {
      bgChoose.addEventListener('click', () => {
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
      calState.selectedKey = cell.dataset.dayKey;
      haptic('light');
      renderCalendar();
    });

    const onLogClick = (e) => {
      const del = e.target.closest('[data-delete]');
      if (del) {
        deleteEntry(del.dataset.delete);
        return;
      }
      const edit = e.target.closest('[data-edit]');
      if (edit) openEditSheet(edit.dataset.edit);
    };
    $('#log-list')?.addEventListener('click', onLogClick);
    $('#cal-day-list')?.addEventListener('click', onLogClick);
    $('#edit-form')?.addEventListener('submit', saveEdit);
    $('#edit-delete')?.addEventListener('click', () => {
      if (!editingId) return;
      const id = editingId;
      closeSheets();
      deleteEntry(id);
    });

    $('#sheet-backdrop')?.addEventListener('click', closeSheets);
    $$('[data-close-sheet]').forEach((b) => b.addEventListener('click', closeSheets));
    bindSheetDismiss();

    $('#undo-btn')?.addEventListener('click', () => {
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
      if (!(nowReached && !wasReached)) showToast('Entry restored');
    });

    $$('input[name="unit"]').forEach((r) => {
      r.addEventListener('change', () => {
        if (!r.checked) return;
        storage.setUnit(store, r.value);
        haptic('light');
        render();
        processAchievements({ unitFlipped: true });
      });
    });
    $$('input[name="theme"]').forEach((r) => {
      r.addEventListener('change', () => {
        if (!r.checked) return;
        storage.setTheme(store, r.value);
        applyTheme(store.theme);
        haptic('light');
        processAchievements({ themeChanged: true });
      });
    });
    $('#setting-goal-form')?.addEventListener('submit', (e) => {
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
      if (prev !== store.goalMl) processAchievements({ goalChanged: true });
    });
    $('#setting-wake')?.addEventListener('change', () => {
      storage.setSchedule(store, $('#setting-wake').value, store.sleepHour);
      render();
    });
    $('#setting-sleep')?.addEventListener('change', () => {
      storage.setSchedule(store, store.wakeHour, $('#setting-sleep').value);
      render();
    });
    $('#setting-reminders')?.addEventListener('change', async (e) => {
      const on = !!e.target.checked;
      if (on && window.WaterReminders) {
        const perm = await window.WaterReminders.requestPermission();
        if (perm === 'denied') showToast('Notifications blocked — in-app nudges still work');
      }
      storage.setReminders(store, { enabled: on });
      render();
      if (on) processAchievements({ remindersEnabled: true });
    });
    $('#setting-reminder-times')?.addEventListener('change', () => {
      const times = ($('#setting-reminder-times').value || '')
        .split(',')
        .map((t) => t.trim())
        .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
        .map((t) => {
          const [h, m] = t.split(':');
          return `${String(h).padStart(2, '0')}:${m}`;
        });
      if (times.length) storage.setReminders(store, { times });
    });
    $('#setting-sound')?.addEventListener('change', (e) => {
      storage.setSoundEnabled(store, !!e.target.checked);
      if (e.target.checked && window.WaterSound) window.WaterSound.resume();
      haptic('light');
    });

    $('#btn-goal-lab')?.addEventListener('click', () => {
      const lab = $('#goal-lab');
      if (lab) lab.hidden = !lab.hidden;
    });
    ['lab-weight', 'lab-weight-unit', 'lab-activity', 'lab-climate'].forEach((id) => {
      $(`#${id}`)?.addEventListener('input', updateLabPreview);
      $(`#${id}`)?.addEventListener('change', updateLabPreview);
    });
    $('#lab-apply')?.addEventListener('click', () => {
      const ml = Number($('#lab-preview')?.dataset.ml);
      if (!ml) {
        showToast('Enter a weight first');
        return;
      }
      storage.setGoal(store, ml);
      haptic('medium');
      render();
      showToast(`Goal set to ${formatAmountWithUnit(ml, store.unit)}`);
      processAchievements({ goalChanged: true, goalCalculated: true });
    });

    $('#btn-preview-cele')?.addEventListener('click', () => previewCelebration('random'));
    $('#btn-clear-today')?.addEventListener('click', () => {
      if (!confirm('Clear all entries for today?')) return;
      storage.clearToday(store);
      lastGoalReached = false;
      haptic('warning');
      render();
      showToast('Today cleared');
    });
    $('#btn-export')?.addEventListener('click', async () => {
      const json = storage.exportJson(store);
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(json);
          showToast('Data copied to clipboard');
        } else throw new Error('no clipboard');
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
    $('#btn-import')?.addEventListener('click', () => $('#import-input').click());
    $('#import-input')?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        storage.importJson(store, text);
        lastGoalReached = storage.totalForDay(store) >= store.goalMl;
        render();
        showToast('Backup imported');
        processAchievements({ imported: true, silent: false });
      } catch (err) {
        showToast(err.message || 'Could not import that file', { duration: 3000 });
      }
    });
    $('#btn-clear-all')?.addEventListener('click', () => {
      if (!confirm('Delete ALL water history? This cannot be undone.')) return;
      storage.clearAll(store);
      lastGoalReached = false;
      haptic('warning');
      render();
      showToast('All data cleared');
    });
    $('#btn-reset-trophies')?.addEventListener('click', resetTrophies);
    $('#btn-reset-trophies-settings')?.addEventListener('click', resetTrophies);
    $('#achievements-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-reset-ach]');
      if (!btn) return;
      e.preventDefault();
      resetTrophy(btn.getAttribute('data-reset-ach'));
    });

    $('#onboard-next')?.addEventListener('click', () => {
      if (onboardStep < 3) {
        onboardStep += 1;
        paintOnboard();
      } else finishOnboarding();
    });
    $('#onboard-back')?.addEventListener('click', () => {
      if (onboardStep > 0) {
        onboardStep -= 1;
        paintOnboard();
      }
    });
    $$('input[name="onboard-unit"]').forEach((r) => r.addEventListener('change', paintOnboard));
    $('#onboard-goal')?.addEventListener('input', () => {
      $('#onboard-goal').dataset.touched = '1';
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSheets();
    });

    lockPortraitOrientation();
    updateRotateLock();
    window.addEventListener('orientationchange', () => {
      lockPortraitOrientation();
      updateRotateLock();
    });
    window.addEventListener('resize', updateRotateLock);
    window.addEventListener('resize', () => updateTabIndicator({ animate: false }));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        lockPortraitOrientation();
        store = storage.load();
        render();
      }
    });
    setInterval(() => {
      const label = $('#date-label');
      if (label && currentView === 'today' && label.textContent !== formatDayLabel(new Date())) {
        lastGoalReached = false;
        render();
      }
    }, 60_000);
  }

  async function init() {
    if (!window.WaterUtils || !window.WaterStorage) {
      console.error('Water Tracker: scripts failed to load.');
      return;
    }
    applyTheme(store.theme);
    bind();
    updateTabIndicator({ animate: false });
    requestAnimationFrame(() => updateTabIndicator({ animate: false }));
    lastGoalReached = storage.totalForDay(store) >= store.goalMl && store.goalMl > 0;
    if (bgPhoto) {
      try {
        currentBgPhoto = await bgPhoto.initFromStorage();
      } catch {
        currentBgPhoto = null;
      }
    }
    render();
    processAchievements({ silent: true, photoSet: Boolean(currentBgPhoto) });
    if (store.achievements && Object.keys(store.achievements).length) storage.saveAchievements(store);
    updateAchievementsBadge();
    if (mascotApi && typeof mascotApi.mount === 'function') {
      mascotApi.mount({
        getContext: () => mascotContext(),
        isEnabled: isMascotEnabled,
        getState: () => store.dew,
        saveState: (dew) => {
          storage.saveDew(store, dew);
          updateDewSettingsUi();
        },
        haptic,
        onPlay: () => processAchievements(),
      });
    }
    updateMascotVisibility();
    if (!store.onboarded) showOnboarding();
    else if (isMascotEnabled()) setTimeout(() => speakMascot({ event: 'open' }), 480);
    handleDeepLink();
    if (window.WaterReminders) {
      window.WaterReminders.start(store, storage, (msg) => showToast(msg, { duration: 3600 }));
    }
    window.addEventListener('pageshow', async (e) => {
      if (!e.persisted) return;
      store = storage.load();
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
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
