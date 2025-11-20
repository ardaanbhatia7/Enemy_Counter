# Enemy Counter

An intentionally FBI-vibe “kill list” tracker built for a friend who keeps ragebaiting people and has accumulated too many enemies to remember. I used this as a playground for the HTTP concepts I picked up in my EE250 class at USC (GET/POST/etc.), then leaned into “vibe coding” to polish the styling and interactions.

## Features
- Search by name or reason, filter by threat level.
- Click column headers to sort; default sort is High → Low, newest date first.
- Manual refresh button plus auto-refresh.
- Export the current view to CSV or JSON.
- Light/dark theme toggle (remembers your choice).
- Status bar with live loading/error messages and last updated timestamp.

## Format & Tech
- Format: Static HTML page that fetches a published Google Sheet CSV, renders a sortable/filterable table, and exports to CSV/JSON.
- Tech: Plain HTML/CSS/JS (no build step). Uses `fetch` for CSV, custom CSV parser, DOM rendering, and `localStorage` for theme.

## Live Site
Hosted on GitHub Pages: https://ardaanbhatia7.github.io/Enemy_Counter/

## Setup (to run locally)
- Download or clone this folder.
- Serve the files over HTTP (CSV fetches are blocked on `file://`):
  - Python 3: `python3 -m http.server 8000`

## Run
- Open `http://localhost:8000` (or the port you used) in your browser.
- The table auto-refreshes every 60 seconds.


