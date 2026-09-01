# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
Water Tracker is a **fully static, offline-first PWA** — vanilla HTML/CSS/JS with **no build step, no package manager, and no dependencies** to install. See `README.md` for the feature overview and `## Project layout` for the file map. All data lives on-device (`localStorage` + IndexedDB); there is no backend.

### Running it (dev)
Serve the repo root over HTTP from a static server, then open the served URL:

```bash
python3 -m http.server 8080
```

- Opening `index.html` via `file://` works for basic water logging, but the **service worker, PWA install, and offline caching require `localhost` or HTTPS**, so use the HTTP server for full-fidelity testing.
- The app is **mobile/portrait-first**. On a wide desktop viewport the layout stretches full-width (no `max-width`); this is expected — test in a narrow / mobile-sized viewport to see the intended design.

### Lint / test / build
There is **no lint config, no automated test suite, and no build/bundle step** in this repo. "Build and run" == serve the static files. Do not add or expect `npm`/CI tooling unless a task explicitly introduces it.

### Always browser-test before shipping
Always verify changes in the browser before shipping, unless the user **explicitly** says to skip (for example `/no-test`). Serve the app over HTTP, open the served URL, and exercise the affected flow end to end the way a real user would — not a single screenshot of the first render.

- Opening `index.html` via `file://` is not enough for this check: use the HTTP server so the service worker, PWA install, and offline cache behave as they do on a phone.
- The app is **mobile/portrait-first**. On a wide desktop viewport the layout stretches full-width (no `max-width`); this is expected — use a narrow / mobile-sized viewport for the intended design.
- If you changed how state is written or derived, open the other tabs that read it (Today, Insights, Calendar, Trophies) and confirm they stay consistent.
- Check empty / error / already-complete states the change can hit, not only the happy path.
- GUI / computer-use agents are expected for this verification. HTTP requests and code inspection can supplement it; they do not replace it.

### Service worker gotcha
`sw.js` caches assets under a `CACHE_VERSION`. When changing JS/CSS/HTML, bump `CACHE_VERSION` in `sw.js` so a previously-loaded page picks up changes; otherwise a stale cached copy may be served. During local testing, a hard reload / disabling the SW cache avoids confusion.
