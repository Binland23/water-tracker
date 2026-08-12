#!/bin/bash
# Double-click to open Water Tracker 2.0 in your browser.
cd "$(dirname "$0")"
PORT=8765

if ! lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  python3 -m http.server $PORT >/tmp/water-tracker-server.log 2>&1 &
  sleep 0.4
fi

open "http://127.0.0.1:${PORT}/"
