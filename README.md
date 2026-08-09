# Water Tracker

A calm, offline-first **water consumption app** for iPhone. It is a Progressive Web App (PWA): install it from Safari to get a home-screen icon and full-screen UI—no App Store required. **Siri Shortcuts** can open deep links to log water by voice.

## Features

- Daily goal progress (ring + animated water simulation)
- **Owala** one-tap full bottle (24 oz, 100% water)
- **ELECTROLYTES** — log pour + stick packs (water counts 1:1; lightning charge FX)
- Standard drinks with **hydration factors** (only part of coffee/soda/etc. counts as water)
- Quick add: 250 / 500 / 750 ml pure water (or oz equivalents)
- Custom amounts, unit toggle (ml ↔ fl oz)
- Today’s log with delete + undo
- 7-day week bars + **full month calendar** (tap a day for details)
- **Custom background photo** from the iPhone Photos library (stored on-device)
- Settings: goal, units, background photo, export JSON, clear data
- Works **offline** after the first visit
- **Siri-ready** URL hooks (`?add=250`, etc.)

### Hydration factors

Goals track **effective water**, not full poured volume:

| Drink | Counts as water |
|-------|-----------------|
| Water / Owala | 100% |
| Iced latte (Vertuo Melozio + milk, 21 oz glass) | 89% |
| Tea, sports drink | 90% |
| Juice | 85% |
| Fruit smoothie | 85% |
| Coffee | 80% |
| Soda | 75% |
| **ELECTROLYTES** mix | **100%** of poured volume (same as water) + stick tag |

**Iced latte math** (default 21 oz glass): 1 **Vertuo Melozio** mug brew (**7.77 fl oz** / ~230 ml @ 80%) + ~6.5 oz ice @ 100% + milk filling the rest (~6.7 oz @ 90%) → **~18.8 oz effective water** (89% of 21 oz).

### ELECTROLYTES

Tap **ELECTROLYTES**, enter how much you poured (default 16 oz), and how many stick packs you mixed in.

- **Water toward goal** = the amount you poured (1:1). Sticks are not extra fluid.
- **Sticks** are logged as metadata (e.g. “1 stick · ELECTROLYTES”).
- Logging plays a short **lightning / charge** animation and marks the day as charged.

All data stays **on your device** (browser `localStorage`). Nothing is uploaded.

---

## Run on your Mac

**Easiest:** double-click `index.html` — the app should work in Safari or Chrome right away.

**Or** double-click **`Open Water Tracker.command`** (first time: right-click → Open if macOS blocks it). That starts a tiny local server and opens the app (needed for offline install / service worker testing).

Manual server (optional):

```bash
cd ~/grokington/water-tracker
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

**Project location on this Mac:** `~/grokington/water-tracker`

> **Note:** Service workers and “Add to Home Screen” as a full offline PWA need `localhost` or **HTTPS** (not `file://`). Logging water works either way.

---

## Install on iPhone (acts like a real app)

1. Deploy this folder to any **HTTPS** host (GitHub Pages, Netlify, Cloudflare Pages, etc.), **or** use a tunnel to your Mac for testing.
2. On your iPhone, open the site in **Safari** (not Chrome or an in-app browser).
3. Tap **Share** → **Add to Home Screen**.
4. Name it **Water** (or whatever you like) → **Add**.
5. Open it from the home screen — it launches full-screen without Safari chrome.

That home-screen icon is your “app.”

---

## Live site (already deployed)

| | |
|--|--|
| **iPhone app URL** | https://binland23.github.io/water-tracker/ |
| **GitHub repo** | https://github.com/Binland23/water-tracker |
| **Local folder** | `~/grokington/water-tracker` |

GitHub Pages deploys from the `main` branch root. After you change files here:

```bash
cd ~/grokington/water-tracker
git add .
git commit -m "Your message"
git push origin main
```

Bump `CACHE_VERSION` in `sw.js` when shipping UI/JS changes so phones pick up the update.

Relative asset paths (`./`) work under the `/water-tracker/` subpath.

---

## Siri Shortcuts

Shortcuts open your live app URL with query parameters. The app logs the water, shows a toast, then clears the query string so reloads don’t double-count.

### Deep link reference

Replace `BASE` with your real URL, e.g.  
`https://you.github.io/water-tracker/`

| Goal | URL |
|------|-----|
| Full Owala (24 oz) | `BASE?drink=owala` |
| ELECTROLYTES (16 oz, 1 stick) | `BASE?drink=electrolytes` |
| ELECTROLYTES custom | `BASE?electrolytes=2&add=20&unit=oz` (2 sticks in 20 oz) |
| Coffee / tea / soda… | `BASE?drink=coffee` (also: `tea`, `soda`, `juice`, `smoothie`, `sports`, `iced-latte`) |
| Add 250 ml (one glass) | `BASE?add=250` |
| Add 500 ml | `BASE?add=500` |
| Add 16 oz | `BASE?add=16&unit=oz` |
| Set goal to 2000 ml | `BASE?goal=2000` |
| Set unit to oz | `BASE?unit=oz` |
| Just open today | `BASE` or `BASE?open=today` |

**Rules**

- `add` amounts are **ml** unless you pass `unit=oz`.
- `goal` uses `unit` if present, otherwise your saved unit preference.

### Shortcut: “Log water” (ask for amount)

1. Open the **Shortcuts** app → **+**.
2. **Add Action** → **Ask for Input**  
   - Input Type: **Number**  
   - Prompt: `How many ml?`  
   - Default: `250`
3. **Add Action** → **URL**  
   - `https://YOUR-SITE/?add=` then tap **Shortcut Input** / **Provided Input** so it becomes something like:  
     `https://YOUR-SITE/?add=[Provided Input]`
4. **Add Action** → **Open URLs**.
5. Rename the shortcut **Log water**.
6. Tap the shortcut name → **Add to Siri** → record *“Log water”* or *“I drank water”*.

### Shortcut: fixed glass (fastest)

1. New shortcut → **URL** → `https://YOUR-SITE/?add=250`
2. **Open URLs**
3. Add to Siri as *“Log a glass”*

### Tips for the “real app” feel

- Install **Add to Home Screen** first, then open Shortcuts that use the **same origin** as that install. iOS often reuses the standalone app window.
- Always build Shortcuts with your **HTTPS** production URL, not `localhost`.
- If a shortcut opens a Safari tab instead of the icon app, open the home-screen app once, then try again.

---

## Privacy

- No accounts, no analytics, no server.
- Clearing Safari / website data for this origin **deletes** your history.
- Use **Settings → Export data** to copy a JSON backup before wiping the phone.

---

## Project layout

```
index.html          App shell
styles.css          UI
js/app.js           UI + deep links
js/storage.js       localStorage model
js/utils.js         Units / dates
manifest.json       PWA manifest (standalone)
sw.js               Offline cache
assets/icons/       App icons
```

When you change JS/CSS/HTML for production, bump `CACHE_VERSION` in `sw.js` so installed phones pick up the new build.

---

## License

Personal use — do what you want with it.
