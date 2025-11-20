# Enemy Counter

Displays a live table of enemies sourced from a published Google Sheet CSV. Styles and scripts are split into `style.css` and `script.js`.

## Setup
- Download or clone this folder.
- Serve the files over HTTP (CSV fetches are blocked on `file://`):
  - Python 3: `python -m http.server 8000`
  - Node: `npx serve .`

## Run
- Open `http://localhost:8000` (or the port you used) in your browser.
- The table auto-refreshes every 60 seconds.

## Features
- Search by name or reason, filter by threat level.
- Click column headers to sort; default sort is High → Low, newest date first.
- Manual refresh button plus auto-refresh.
- Export the current view to CSV or JSON.
- Light/dark theme toggle (remembers your choice).
- Status bar with live loading/error messages and last updated timestamp.
