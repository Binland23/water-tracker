/**
 * In-app hydration nudges.
 * Full background push needs a server; this fires while the PWA is open
 * (and on Android after Notification permission). Siri Shortcuts still
 * cover true iPhone background logging.
 */
(function (global) {
  const { dayKey } = global.WaterUtils;

  function nowHm(date = new Date()) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function canNotify() {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  }

  async function requestPermission() {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  function showNudge(title, body) {
    if (canNotify() && document.hidden) {
      try {
        const n = new Notification(title, { body, tag: 'water-nudge', silent: false });
        n.onclick = () => {
          try {
            window.focus();
          } catch {
            /* ignore */
          }
          n.close();
        };
        return 'notification';
      } catch {
        /* fall through */
      }
    }
    return 'toast';
  }

  /**
   * @returns {null | { time: string, channel: string }}
   */
  function tick(store, storage) {
    if (!store?.reminders?.enabled) return null;
    const times = store.reminders.times || [];
    const hm = nowHm();
    if (!times.includes(hm)) return null;
    const stamp = `${dayKey()}@${hm}`;
    if (store.reminders.lastFired === stamp) return null;
    store.reminders.lastFired = stamp;
    storage.save(store);

    const goal = store.goalMl || 2000;
    const total = storage.totalForDay(store);
    const left = Math.max(0, goal - total);
    const unit = store.unit;
    const { formatAmountWithUnit } = global.WaterUtils;
    const title = total >= goal ? 'Still sipping?' : 'Time for water';
    const body =
      total >= goal
        ? 'Goal already met. A small extra sip is optional.'
        : `${formatAmountWithUnit(left, unit)} left today.`;
    const channel = showNudge(title, body);
    return { time: hm, channel, title, body };
  }

  function start(store, storage, onToast) {
    const run = () => {
      const hit = tick(store, storage);
      if (hit && hit.channel === 'toast' && typeof onToast === 'function') {
        onToast(hit.body);
      }
    };
    run();
    const id = setInterval(run, 20_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') run();
    });
    return () => clearInterval(id);
  }

  global.WaterReminders = { requestPermission, canNotify, tick, start };
})(typeof window !== 'undefined' ? window : globalThis);
