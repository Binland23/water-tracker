/** Best-effort haptics: Vibration API + iOS 18+ switch Taptic. */
(function (global) {
  let iosHapticHost = null;

  function ensureIosHapticHost() {
    if (iosHapticHost && document.body.contains(iosHapticHost)) return iosHapticHost;
    const host = document.createElement('div');
    host.id = 'ios-haptic-host';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;';
    host.innerHTML =
      '<input type="checkbox" id="ios-haptic-switch" switch tabindex="-1" /><label for="ios-haptic-switch"></label>';
    document.body.appendChild(host);
    iosHapticHost = host;
    return host;
  }

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
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

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
      if (isIosLike()) {
        iosSwitchHaptic(iosTimes);
        return;
      }
      if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }

  global.WaterHaptics = { haptic, isIosLike };
})(typeof window !== 'undefined' ? window : globalThis);
