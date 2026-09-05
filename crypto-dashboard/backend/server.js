/**
 * Crypto Dashboard — backend
 * ---------------------------------------------------------------
 * Reads the Kaggle "Cryptocurrency Historical Prices" dataset
 * (https://www.kaggle.com/datasets/sudalairajkumar/cryptocurrency-historical-prices)
 * from ./data/*.csv and serves aggregated JSON to the frontend.
 *
 * Expected file naming from that dataset: coin_Bitcoin.csv, coin_Ethereum.csv, ...
 * Expected columns: SNo,Name,Symbol,Date,High,Low,Open,Close,Volume,Marketcap
 *
 * If your CSV has different column names, adjust COLUMN_MAP below.
 * ---------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const DATA_DIR = path.join(__dirname, "data");
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());

// -------------------------------------------------------------------------
// CSV parsing without an external dependency. Supports quoted fields,
// escaped quotes, and commas/newlines inside quoted fields.
// -------------------------------------------------------------------------

function parseCsv(text) {
  const records = [];
  let record = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    const next = text[i + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      record.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") i += 1;
      record.push(cell.trim());
      if (record.some((value) => value !== "")) records.push(record);
      record = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  record.push(cell.trim());
  if (record.some((value) => value !== "")) records.push(record);
  if (!records.length) return [];

  const headers = records[0].map((header, index) => {
    const normalized = header.replace(/^\uFEFF/, "").trim();
    return normalized || `column_${index + 1}`;
  });

  return records.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

// Map Kaggle's column names -> the field names the API returns.
// Edit these if your downloaded file uses different headers/casing.
const COLUMN_MAP = {
  date: ["Date"],
  open: ["Open"],
  high: ["High"],
  low: ["Low"],
  close: ["Close"],
  volume: ["Volume"],
  marketCap: ["Marketcap", "Market Cap", "MarketCap"],
  symbol: ["Symbol"],
  name: ["Name"],
};

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined) return row[k];
  }
  return undefined;
}

function loadAllCoins() {
  if (!fs.existsSync(DATA_DIR)) return {};

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith(".csv"));
  const coins = {};

  files.forEach((file) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
    const rows = parseCsv(raw);
    if (!rows.length) return;

    const symbol = String(pick(rows[0], COLUMN_MAP.symbol) || file.replace(/coin_|\.csv/gi, "")).trim().toUpperCase();
    const name = String(pick(rows[0], COLUMN_MAP.name) || symbol).trim();

    const history = rows
      .map((r) => ({
        date: (pick(r, COLUMN_MAP.date) || "").slice(0, 10),
        open: parseFloat(pick(r, COLUMN_MAP.open)) || 0,
        high: parseFloat(pick(r, COLUMN_MAP.high)) || 0,
        low: parseFloat(pick(r, COLUMN_MAP.low)) || 0,
        close: parseFloat(pick(r, COLUMN_MAP.close)) || 0,
        volume: parseFloat(pick(r, COLUMN_MAP.volume)) || 0,
        marketCap: parseFloat(pick(r, COLUMN_MAP.marketCap)) || 0,
      }))
      .filter((r) => r.date && r.close)
      .sort((a, b) => a.date.localeCompare(b.date));

    coins[symbol] = { symbol, name, history };
  });

  return coins;
}

// Load once at boot. Restart the server after adding/changing CSV files.
let COINS = loadAllCoins();
console.log(`Loaded ${Object.keys(COINS).length} coin(s) from ${DATA_DIR}`);

// -------------------------------------------------------------------------
// Routes
// -------------------------------------------------------------------------

// GET /api/coins  -> [{ symbol, name, points }]
app.get("/api/coins", (req, res) => {
  const list = Object.values(COINS).map((c) => ({
    symbol: c.symbol,
    name: c.name,
    points: c.history.length,
  }));
  res.json(list);
});

// GET /api/history?symbol=BTC&days=30 -> [{date, open, high, low, close, volume, marketCap}]
app.get("/api/history", (req, res) => {
  const { symbol, days } = req.query;
  const coin = COINS[String(symbol || "").toUpperCase()];
  if (!coin) return res.status(404).json({ error: `Unknown symbol: ${symbol}` });

  const requestedDays = parseInt(days, 10);
  const n = Number.isFinite(requestedDays) && requestedDays > 0 ? requestedDays : coin.history.length;
  const slice = coin.history.slice(-n);
  res.json(slice);
});

// GET /api/summary?days=30
// -> per-coin latest close/marketCap, % change over the window, and volume summed over the window
app.get("/api/summary", (req, res) => {
  const requestedDays = parseInt(req.query.days, 10);
  const n = Number.isFinite(requestedDays) && requestedDays > 0 ? requestedDays : null;

  const summary = Object.values(COINS).map((c) => {
    const slice = n ? c.history.slice(-n) : c.history;
    const first = slice[0];
    const last = slice[slice.length - 1];
    const changePct = first && last && first.close ? ((last.close - first.close) / first.close) * 100 : 0;
    const totalVolume = slice.reduce((s, r) => s + r.volume, 0);

    return {
      symbol: c.symbol,
      name: c.name,
      latestClose: last ? last.close : null,
      latestMarketCap: last ? last.marketCap : null,
      changePct,
      totalVolume,
      series: slice.map((r) => ({ date: r.date, close: r.close })),
    };
  });

  res.json(summary);
});

app.get("/api/health", (req, res) => res.json({ ok: true, coins: Object.keys(COINS).length }));

app.listen(PORT, () => {
  console.log(`Crypto dashboard API running on http://localhost:${PORT}`);
});
