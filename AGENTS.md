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

### Service worker gotcha
`sw.js` caches assets under a `CACHE_VERSION`. When changing JS/CSS/HTML, bump `CACHE_VERSION` in `sw.js` so a previously-loaded page picks up changes; otherwise a stale cached copy may be served. During local testing, a hard reload / disabling the SW cache avoids confusion.
