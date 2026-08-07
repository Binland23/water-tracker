/** Water Tracker UI — works with file:// and http(s):// */
(function () {
  const {
    DRINK_PRESETS,
    clamp,
    dayKey,
    drinkById,
    drinkMl,
    formatAmount,
    formatAmountWithUnit,
    formatDayLabel,
    formatTime,
    mlToOz,
    toMl,
  } = window.WaterUtils;
  const storage = window.WaterStorage;

  let store = storage.load();
  /** @type {{ entry: object, timer: number } | null} */
  let undoState = null;
  let lastGoalReached = false;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function haptic(ms = 10) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch {
      /* ignore */
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

  function render() {
    const unit = store.unit;
    const goal = store.goalMl;
    const today = dayKey();
    const total = storage.totalForDay(store, today);
    const entries = storage.entriesForDay(store, today);
    const pct = goal > 0 ? total / goal : 0;
    const pctDisplay = Math.round(pct * 100);
    const reached = total >= goal;

    $('#date-label').textContent = formatDayLabel(new Date());

    const ring = $('#progress-ring');
    const circumference = 2 * Math.PI * 88;
    const visualPct = clamp(pct, 0, 1);
    ring.style.strokeDasharray = `${circumference}`;
    ring.style.strokeDashoffset = `${circumference * (1 - visualPct)}`;
    ring.classList.toggle('is-complete', reached);

    const wave = $('#wave-fill');
    if (wave) {
      const lift = (1 - visualPct) * 72;
      wave.style.transform = `translateY(${lift}px)`;
    }

    $('#total-value').textContent = formatAmount(total, unit);
    $('#total-unit').textContent = unit;
    $('#goal-caption').textContent = `of ${formatAmountWithUnit(goal, unit)} goal`;
    $('#pct-label').textContent = `${pctDisplay}%`;

    const status = $('#status-chip');
    if (reached) {
      status.textContent = pct > 1.05 ? 'Over goal' : 'Goal reached';
      status.dataset.state = 'done';
    } else if (total === 0) {
      status.textContent = 'Ready when you are';
      status.dataset.state = 'empty';
    } else {
      const left = goal - total;
      status.textContent = `${formatAmountWithUnit(left, unit)} to go`;
      status.dataset.state = 'progress';
    }

    if (reached && !lastGoalReached && total > 0) {
      haptic(20);
      showToast('Goal reached — nice work');
    }
    lastGoalReached = reached;

    $$('[data-quick]').forEach((btn) => {
      const ml = Number(btn.dataset.quick);
      const label = formatAmount(ml, unit);
      const amountEl = btn.querySelector('.quick-amount');
      const unitEl = btn.querySelector('.quick-unit');
      if (amountEl) amountEl.textContent = `+${label}`;
      if (unitEl) unitEl.textContent = unit;
    });

    const owala = drinkById('owala');
    if (owala) {
      const amt = formatAmountWithUnit(drinkMl(owala), unit);
      const sub = $('#btn-owala [data-drink-amount]');
      if (sub) sub.textContent = amt;
      const btn = $('#btn-owala');
      if (btn) btn.setAttribute('aria-label', `Add full Owala bottle, ${amt}`);
    }

    $$('[data-drink]:not(#btn-owala)').forEach((btn) => {
      const preset = drinkById(btn.dataset.drink);
      if (!preset) return;
      const amountEl = btn.querySelector('[data-drink-amount]');
      if (amountEl) amountEl.textContent = formatAmountWithUnit(drinkMl(preset), unit);
    });

    const list = $('#log-list');
    const empty = $('#log-empty');
    list.innerHTML = '';
    if (entries.length === 0) {
      empty.hidden = false;
    } else {
      empty.hidden = true;
      for (const e of entries) {
        const li = document.createElement('li');
        li.className = 'log-item';
        li.dataset.id = e.id;
        const title = e.label
          ? `<span class="log-label">${escapeHtml(e.label)}</span>
             <span class="log-amount">${formatAmountWithUnit(e.ml, unit)}</span>`
          : `<span class="log-amount">${formatAmountWithUnit(e.ml, unit)}</span>`;
        li.innerHTML = `
          <div class="log-main">
            ${title}
            <span class="log-time">${formatTime(e.ts)}</span>
          </div>
          <button type="button" class="log-delete" aria-label="Delete entry" data-delete="${e.id}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        `;
        list.appendChild(li);
      }
    }

    const week = storage.weekTotals(store, 7);
    const maxBar = Math.max(goal, ...week.map((d) => d.total), 1);
    const weekEl = $('#week-bars');
    weekEl.innerHTML = '';
    for (const day of week) {
      const h = (day.total / maxBar) * 100;
      const isToday = day.key === today;
      const done = day.total >= goal && day.total > 0;
      const col = document.createElement('div');
      col.className = 'week-col' + (isToday ? ' is-today' : '') + (done ? ' is-done' : '');
      col.innerHTML = `
        <div class="week-bar-track" title="${formatAmountWithUnit(day.total, unit)}">
          <div class="week-bar" style="height:${clamp(h, day.total > 0 ? 6 : 0, 100)}%"></div>
        </div>
        <span class="week-label">${formatDayLabel(day.date, { short: true }).slice(0, 2)}</span>
      `;
      weekEl.appendChild(col);
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
  }

  function addWater(ml, { label } = {}) {
    if (!ml || ml <= 0) return;
    const entry = storage.addEntry(store, ml, { label });
    haptic(12);
    render();
    const amount = formatAmountWithUnit(entry.ml, store.unit);
    showToast(entry.label ? `+${amount} · ${entry.label}` : `+${amount}`);
    return entry;
  }

  function addDrink(drinkId) {
    const preset = drinkById(drinkId);
    if (!preset) return;
    return addWater(drinkMl(preset), { label: preset.label });
  }

  function buildDrinksGrid() {
    const grid = $('#drinks-grid');
    if (!grid || grid.dataset.built === '1') return;
    const drinks = DRINK_PRESETS.filter((d) => d.id !== 'owala');
    grid.innerHTML = drinks
      .map(
        (d) => `
      <button type="button" class="drink-chip" data-drink="${d.id}">
        <span class="drink-chip-name">${escapeHtml(d.label)}</span>
        <span class="drink-chip-amt" data-drink-amount></span>
      </button>`
      )
      .join('');
    grid.dataset.built = '1';
  }

  function deleteEntry(id) {
    const removed = storage.removeEntry(store, id);
    if (!removed) return;
    haptic(8);
    render();
    setUndo(removed);
  }

  function handleDeepLink() {
    // file:// URLs often lack usable search; still safe to run
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

    const drinkId = params.get('drink');
    if (drinkId && drinkById(drinkId)) {
      addDrink(drinkId);
      changed = true;
    }

    const addRaw = params.get('add');
    if (addRaw && !drinkId) {
      const u = params.get('unit') === 'oz' ? 'oz' : 'ml';
      const ml = toMl(addRaw, u);
      if (ml) {
        const label = params.get('label') || undefined;
        addWater(ml, { label: label || undefined });
        changed = true;
      }
    }

    if (
      changed ||
      params.has('open') ||
      params.has('add') ||
      params.has('goal') ||
      params.has('unit') ||
      params.has('drink')
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

    const drinksGrid = $('#drinks-grid');
    if (drinksGrid) {
      drinksGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-drink]');
        if (!btn) return;
        addDrink(btn.dataset.drink);
      });
    }

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

    $('#sheet-backdrop').addEventListener('click', closeSheets);
    $$('[data-close-sheet]').forEach((b) => b.addEventListener('click', closeSheets));

    $('#log-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete]');
      if (!btn) return;
      deleteEntry(btn.dataset.delete);
    });

    $('#undo-btn').addEventListener('click', () => {
      if (!undoState?.entry) return;
      storage.restoreEntry(store, undoState.entry);
      dismissUndo();
      haptic(10);
      render();
      showToast('Entry restored');
    });

    $$('input[name="unit"]').forEach((r) => {
      r.addEventListener('change', () => {
        if (r.checked) {
          storage.setUnit(store, r.value);
          render();
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
      storage.setGoal(store, ml);
      render();
      showToast('Goal updated');
    });

    $('#btn-clear-today').addEventListener('click', () => {
      if (!confirm('Clear all entries for today?')) return;
      storage.clearToday(store);
      lastGoalReached = false;
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
      render();
      showToast('All data cleared');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSheets();
    });

    setInterval(() => {
      const label = $('#date-label');
      if (label && label.textContent !== formatDayLabel(new Date())) {
        lastGoalReached = false;
        render();
      }
    }, 60_000);
  }

  function init() {
    if (!window.WaterUtils || !window.WaterStorage) {
      console.error('Water Tracker: scripts failed to load. Open index.html from this folder.');
      return;
    }
    bind();
    lastGoalReached = storage.totalForDay(store) >= store.goalMl && store.goalMl > 0;
    render();
    handleDeepLink();
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        store = storage.load();
        handleDeepLink();
        render();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
