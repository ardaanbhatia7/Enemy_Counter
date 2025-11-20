const SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDbMcn0_WRDDmZghKMYfN26XNJC3oVVtpEWbMVJU6XG4Q_kwxsBAzv4YfsIIgp9eIVCsPhfB-VdMvp/pub?output=csv";

const tbody = document.querySelector("#enemyTable tbody");
const searchInput = document.querySelector("#searchInput");
const levelFilter = document.querySelector("#levelFilter");
const refreshBtn = document.querySelector("#refreshBtn");
const exportCsvBtn = document.querySelector("#exportCsvBtn");
const exportJsonBtn = document.querySelector("#exportJsonBtn");
const statusEl = document.querySelector("[data-status]");
const spinner = document.querySelector("[data-spinner]");
const lastUpdatedEl = document.querySelector("#lastUpdated");
const themeToggle = document.querySelector("#themeToggle");
const sortHeaders = document.querySelectorAll("th[data-sort]");

const state = {
  rows: [],
  view: [],
  sortKey: "threat",
  sortDir: "asc", // threat asc => High first
  lastUpdated: null,
};

function statusRow(msg) {
  tbody.innerHTML = `<tr><td colspan="4">${msg}</td></tr>`;
}

// Simple CSV parser (handles quotes and commas)
function parseCSV(text) {
  const out = [];
  let row = [],
    cell = "",
    inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i],
      nx = text[i + 1];
    if (ch === '"') {
      if (inQuotes && nx === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && nx === "\n") i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

function threatBadge(level) {
  const t = (level || "").trim().toLowerCase();
  if (t === "high") return `<span class="badge high">HIGH</span>`;
  if (t === "medium") return `<span class="badge medium">MEDIUM</span>`;
  if (t === "low") return `<span class="badge low">LOW</span>`;
  return level || "—";
}

function threatRank(level) {
  const t = (level || "").trim().toLowerCase();
  if (t === "high") return 0;
  if (t === "medium") return 1;
  if (t === "low") return 2;
  return 3;
}

function parseMaybeDate(s) {
  const d = Date.parse((s || "").trim());
  return isNaN(d) ? null : d;
}

function setStatus(msg, type = "info") {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", type === "error");
}

function setLoading(isLoading) {
  spinner.hidden = !isLoading;
  refreshBtn.disabled = isLoading;
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
}

function updateLastUpdated() {
  if (!state.lastUpdated) {
    lastUpdatedEl.textContent = "Last update: —";
    return;
  }
  const formatted = state.lastUpdated.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  lastUpdatedEl.textContent = `Last update: ${formatted}`;
}

function normalizeRows(rows) {
  return rows.map((r) => ({
    name: (r[0] || "").trim(),
    threat: (r[1] || "").trim(),
    reason: (r[2] || "").trim(),
    date: (r[3] || "").trim(),
    dateValue: parseMaybeDate(r[3]),
  }));
}

function filterData(rows) {
  const term = (searchInput.value || "").trim().toLowerCase();
  const level = (levelFilter.value || "").trim().toLowerCase();
  return rows.filter((row) => {
    const matchesTerm =
      !term ||
      row.name.toLowerCase().includes(term) ||
      row.reason.toLowerCase().includes(term);
    const matchesLevel = !level || row.threat.toLowerCase() === level;
    return matchesTerm && matchesLevel;
  });
}

function sortData(rows) {
  const { sortKey, sortDir } = state;
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "threat") cmp = threatRank(a.threat) - threatRank(b.threat);
    else if (sortKey === "reason") cmp = a.reason.localeCompare(b.reason);
    else if (sortKey === "date") {
      const da = a.dateValue ?? -Infinity;
      const db = b.dateValue ?? -Infinity;
      cmp = da - db;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

function updateSortIndicators() {
  document.querySelectorAll("[data-sort-indicator]").forEach((el) => {
    const key = el.dataset.sortIndicator;
    el.classList.toggle("active", key === state.sortKey);
    if (key === state.sortKey) {
      el.textContent = state.sortDir === "asc" ? "▲" : "▼";
    } else {
      el.textContent = "⇅";
    }
  });
}

function renderTable(rows) {
  if (!rows.length) {
    statusRow("No rows yet — add some in the sheet.");
    return;
  }

  tbody.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = row.name || "—";

    const tdLevel = document.createElement("td");
    tdLevel.innerHTML = threatBadge(row.threat);

    const tdReason = document.createElement("td");
    tdReason.textContent = row.reason || "—";

    const tdDate = document.createElement("td");
    tdDate.textContent = row.date || "—";

    tr.append(tdName, tdLevel, tdReason, tdDate);
    tbody.appendChild(tr);
  }
}

function applyView() {
  const filtered = filterData(state.rows);
  const sorted = sortData(filtered);
  state.view = sorted;
  renderTable(sorted);
  updateSortIndicators();
  setStatus(`Showing ${sorted.length} of ${state.rows.length} rows`);
}

async function loadEnemies() {
  try {
    setLoading(true);
    setStatus("Loading…");
    statusRow("Loading…");

    const res = await fetch(`${SHEET_CSV}&cb=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    const rows = parseCSV(csv);

    if (!rows.length) {
      setStatus("No data found", "error");
      statusRow("No data found.");
      return;
    }

    const data = rows
      .slice(1)
      .filter((r) => r.some((c) => c && c.trim() !== ""));

    state.rows = normalizeRows(data);
    applyView();
    state.lastUpdated = new Date();
    updateLastUpdated();
  } catch (err) {
    console.error(err);
    setStatus("Couldn’t load data. Serve over http(s), not file://", "error");
    statusRow("Couldn’t load data. Serve over http(s), not file://");
  } finally {
    setLoading(false);
  }
}

function setSort(key) {
  if (state.sortKey === key) {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  } else {
    state.sortKey = key;
    state.sortDir = key === "date" ? "desc" : "asc";
  }
  applyView();
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const rows = state.view.length ? state.view : state.rows;
  if (!rows.length) return;
  const header = ["Name", "Threat Level", "Reason", "Date Added"];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [header.map(escape).join(",")].concat(
    rows.map((r) => [r.name, r.threat, r.reason, r.date].map(escape).join(","))
  );
  downloadFile("enemies.csv", csv.join("\n"), "text/csv");
}

function exportJSON() {
  const rows = state.view.length ? state.view : state.rows;
  if (!rows.length) return;
  const json = JSON.stringify(
    rows.map((r) => ({
      name: r.name,
      threat: r.threat,
      reason: r.reason,
      date: r.date,
    })),
    null,
    2
  );
  downloadFile("enemies.json", json, "application/json");
}

// Event bindings
searchInput.addEventListener("input", applyView);
levelFilter.addEventListener("change", applyView);
refreshBtn.addEventListener("click", () => loadEnemies());
exportCsvBtn.addEventListener("click", exportCSV);
exportJsonBtn.addEventListener("click", exportJSON);
sortHeaders.forEach((th) => {
  th.addEventListener("click", () => setSort(th.dataset.sort));
});

themeToggle.addEventListener("click", () => {
  const next = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
});

// Initialize theme, load data, run refresh loop
applyTheme(localStorage.getItem("theme") || "dark");
loadEnemies();
setInterval(loadEnemies, 60000);
