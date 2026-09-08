/** A self-contained preview studio. It never logs water or advances saved rotations. */
(function () {
  const dialog = document.getElementById('celebration-studio');
  const fx = document.getElementById('celebration-fx');
  const api = window.WaterCelebrations;
  if (!dialog || !fx || !api) return;

  const catalog = api.catalog();
  const stage = dialog.querySelector('.cele-preview-stage');
  const list = dialog.querySelector('.cele-preview-list');
  const search = dialog.querySelector('[type="search"]');
  const auto = dialog.querySelector('[name="cele-auto"]');
  const status = dialog.querySelector('[role="status"]');
  const title = dialog.querySelector('#cele-preview-name');
  const counter = dialog.querySelector('#cele-preview-count');
  const next = dialog.querySelector('[data-cele="next"]');
  const previous = dialog.querySelector('[data-cele="previous"]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const home = document.createComment('celebration stage home');
  fx.before(home);
  let index = 0;
  let filtered = catalog;
  let timer = null;
  let returnFocus = null;

  function cancelTimer() {
    clearTimeout(timer);
    timer = null;
  }

  function updateSelection() {
    const selected = catalog[index];
    title.textContent = selected.name;
    counter.textContent = `${index + 1} / ${catalog.length}`;
    stage.style.setProperty('--scene-hue', selected.hue);
    for (const button of list.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.scene === selected.id));
    }
    const active = list.querySelector('[aria-pressed="true"]');
    if (active) {
      const item = active.getBoundingClientRect();
      const viewport = list.getBoundingClientRect();
      if (item.top < viewport.top) list.scrollTop -= viewport.top - item.top;
      else if (item.bottom > viewport.bottom) list.scrollTop += item.bottom - viewport.bottom;
    }
    next.disabled = previous.disabled = !filtered.length;
  }

  function play() {
    cancelTimer();
    if (!dialog.open) return;
    updateSelection();
    api.play(catalog[index].id, {
      title: 'Goal met', subtitle: 'A little moment for a daily win',
      short: '✓', stamp: 'GOAL', preview: true,
    });
    status.textContent = motion.matches ? 'Reduced motion · quiet preview' : 'Playing · 6 seconds';
    timer = setTimeout(() => {
      status.textContent = 'Finished · replay or choose another';
      if (auto.checked && !document.hidden && filtered.length) {
        timer = setTimeout(() => { if (auto.checked) step(1); }, 600);
      }
    }, motion.matches ? 1900 : 6200);
  }

  function step(direction) {
    if (!filtered.length) return;
    const position = filtered.findIndex(scene => scene.id === catalog[index].id);
    const target = position < 0 ? (direction > 0 ? 0 : filtered.length - 1) :
      (position + direction + filtered.length) % filtered.length;
    index = catalog.indexOf(filtered[target]);
    play();
  }

  function renderList() {
    const query = search.value.trim().toLowerCase();
    filtered = catalog.filter(scene => scene.name.toLowerCase().includes(query));
    list.replaceChildren();
    for (const scene of filtered) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.scene = scene.id;
      button.style.setProperty('--scene-hue', scene.hue);
      const orb = document.createElement('span');
      orb.className = 'cele-preview-orb';
      orb.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.textContent = scene.name;
      button.append(orb, name);
      button.addEventListener('click', () => {
        index = catalog.indexOf(scene);
        play();
      });
      list.appendChild(button);
    }
    dialog.querySelector('.cele-preview-empty').hidden = !!filtered.length;
    dialog.querySelector('#cele-results').textContent = `${filtered.length} scene${filtered.length === 1 ? '' : 's'}`;
    updateSelection();
  }

  function stop() {
    cancelTimer();
    api.clear();
    auto.checked = false;
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('close', () => {
    stop();
    home.after(fx);
    document.body.classList.remove('cele-preview-open');
    if (returnFocus?.isConnected) returnFocus.focus();
  });
  dialog.querySelector('[data-cele="close"]').addEventListener('click', close);
  next.addEventListener('click', () => step(1));
  previous.addEventListener('click', () => step(-1));
  dialog.querySelector('[data-cele="replay"]').addEventListener('click', play);
  auto.addEventListener('change', () => {
    if (auto.checked) play();
    // The current preview can finish when auto-play is turned off.
  });
  search.addEventListener('input', renderList);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.target.matches('input, select, textarea')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      step(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dialog.open) {
      stop();
      status.textContent = 'Paused while away · replay to continue';
    }
  });
  motion.addEventListener('change', () => { if (dialog.open) play(); });

  window.WaterCelebrationPreview = {
    open(kindOrId = 'random') {
      if (!dialog.open) {
        const launcher = document.getElementById('btn-preview-cele');
        returnFocus = launcher?.getClientRects().length ? launcher : document.querySelector('[aria-label="Settings"]');
        search.value = '';
        auto.checked = false;
        document.body.classList.add('cele-preview-open');
        stage.appendChild(fx);
        dialog.showModal();
      }
      const forced = catalog.findIndex(scene => scene.id === kindOrId);
      if (forced >= 0) index = forced;
      else if (api.banks[kindOrId]) index = catalog.findIndex(scene => scene.id === api.banks[kindOrId][0]);
      renderList();
      play();
    },
    close,
  };
})();
