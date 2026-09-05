import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Talks to the backend in ./backend/server.js, which reads the Kaggle
// "Cryptocurrency Historical Prices" CSVs from ./backend/data/*.csv.
// Set REACT_APP_API_BASE if the backend isn't on localhost:4000.
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

const RAMP = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9", "#E8B04B", "#4FA8A0"];
const rampFor = (i) => RAMP[i % RAMP.length];

const fmtCompact = (n) => "$" + Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n || 0);
const fmtUSD = (n, digits = 2) => "$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const fmtPct = (n) => (n > 0 ? "+" : "") + (n || 0).toFixed(2) + "%";

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "All", days: 0 },
];

export default function CryptoDashboard() {
  const [coins, setCoins] = useState([]);
  const [summary, setSummary] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load the coin list once.
  useEffect(() => {
    fetch(`${API_BASE}/api/coins`)
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((list) => {
        setCoins(list);
        if (list.length) setSelectedCoin(list[0].symbol);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Reload summary (all coins) whenever the range filter changes.
  useEffect(() => {
    if (!coins.length) return;
    setLoading(true);
    fetch(`${API_BASE}/api/summary?days=${rangeDays}`)
      .then((r) => r.json())
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [coins, rangeDays]);

  // Reload the selected coin's full history whenever coin or range changes.
  useEffect(() => {
    if (!selectedCoin) return;
    fetch(`${API_BASE}/api/history?symbol=${selectedCoin}&days=${rangeDays}`)
      .then((r) => r.json())
      .then((rows) => setHistory(rows.map((r) => ({ date: r.date.slice(5), close: r.close }))))
      .catch((e) => setError(e.message));
  }, [selectedCoin, rangeDays]);

  const volumeByCoin = useMemo(
    () => summary.map((s, i) => ({ symbol: s.symbol, volume: s.totalVolume, ramp: rampFor(i) })),
    [summary]
  );

  const marketShare = useMemo(
    () => summary.filter((s) => s.latestMarketCap).map((s, i) => ({ symbol: s.symbol, value: s.latestMarketCap, ramp: rampFor(i) })),
    [summary]
  );

  const stats = useMemo(() => {
    if (!summary.length) return null;
    const totalMarketCap = summary.reduce((s, r) => s + (r.latestMarketCap || 0), 0);
    const totalVolume = summary.reduce((s, r) => s + (r.totalVolume || 0), 0);
    const topPerformer = summary.reduce((a, b) => (b.changePct > a.changePct ? b : a), summary[0]);
    const selected = summary.find((s) => s.symbol === selectedCoin) || { changePct: 0 };
    return { totalMarketCap, totalVolume, topPerformer, selectedChange: selected.changePct };
  }, [summary, selectedCoin]);

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorBox}>
          <p style={{ margin: 0, fontWeight: 600, color: "#EDEFF4" }}>Couldn't reach the backend.</p>
          <p style={{ margin: "8px 0 0", color: "#8991A6", fontSize: 13 }}>
            Make sure <code>backend/server.js</code> is running on {API_BASE} (<code>cd backend && npm install && npm start</code>).
            <br />
            Error: {error}
          </p>
        </div>
      </div>
    );
  }

  if (loading || !stats || !selectedCoin) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Fetching market data…</p>
        </div>
      </div>
    );
  }

  const coinRamp = rampFor(coins.findIndex((c) => c.symbol === selectedCoin));

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Ledger Pulse</h1>
            <p style={styles.subtitle}>Crypto market dashboard · live from backend API, sourced from Kaggle historical data</p>
          </div>
        </header>

        <div style={styles.filterBar}>
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Coin</span>
            <div style={styles.pillRow}>
              {coins.map((c) => (
                <button
                  key={c.symbol}
                  onClick={() => setSelectedCoin(c.symbol)}
                  style={{
                    ...styles.pill,
                    ...(selectedCoin === c.symbol ? { background: coinRamp, color: "#0B0F17", borderColor: coinRamp } : {}),
                  }}
                >
                  {c.symbol}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Range</span>
            <div style={styles.pillRow}>
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRangeDays(r.days)}
                  style={{
                    ...styles.pill,
                    ...(rangeDays === r.days ? { background: "#E8B04B", color: "#0B0F17", borderColor: "#E8B04B" } : {}),
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.statGrid}>
          <StatCard label="Total market cap" value={fmtCompact(stats.totalMarketCap)} accent="#8991A6" />
          <StatCard
            label={`${selectedCoin} change (window)`}
            value={fmtPct(stats.selectedChange)}
            accent={stats.selectedChange >= 0 ? "#4FA8A0" : "#D66B6B"}
          />
          <StatCard label="Volume traded (window)" value={fmtCompact(stats.totalVolume)} accent="#8991A6" />
          <StatCard label="Top performer" value={`${stats.topPerformer.symbol} ${fmtPct(stats.topPerformer.changePct)}`} accent="#4FA8A0" />
        </div>

        <div className="charts-row-mobile" style={styles.chartsRow}>
          <div style={{ ...styles.card, ...styles.cardWide }}>
            <div style={styles.cardHeadRow}>
              <h2 style={styles.cardTitle}>{selectedCoin} price trend</h2>
              <span style={styles.cardMeta}>Close, USD</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={history} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#26304A" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#8991A6", fontSize: 11 }} axisLine={{ stroke: "#26304A" }} tickLine={false} minTickGap={28} />
                <YAxis
                  tick={{ fill: "#8991A6", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => (v >= 1000 ? fmtCompact(v) : "$" + v.toFixed(2))}
                  width={64}
                />
                <Tooltip
                  contentStyle={{ background: "#171E2E", border: "1px solid #2A3350", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#8991A6" }}
                  formatter={(v) => [fmtUSD(v, v < 5 ? 4 : 2), "Close"]}
                />
                <Line type="monotone" dataKey="close" stroke={coinRamp} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ ...styles.card, ...styles.cardNarrow }}>
            <div style={styles.cardHeadRow}>
              <h2 style={styles.cardTitle}>Market share</h2>
              <span style={styles.cardMeta}>By market cap</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={marketShare} dataKey="value" nameKey="symbol" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="#0F1420" strokeWidth={2}>
                  {marketShare.map((entry) => (
                    <Cell key={entry.symbol} fill={entry.ramp} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#171E2E", border: "1px solid #2A3350", borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [fmtCompact(v), n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={styles.legendWrap}>
              {marketShare.map((d) => (
                <span key={d.symbol} style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: d.ramp }} />
                  {d.symbol}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeadRow}>
            <h2 style={styles.cardTitle}>Trading volume by coin</h2>
            <span style={styles.cardMeta}>Summed over selected window</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={volumeByCoin} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#26304A" vertical={false} />
              <XAxis dataKey="symbol" tick={{ fill: "#8991A6", fontSize: 12 }} axisLine={{ stroke: "#26304A" }} tickLine={false} />
              <YAxis tick={{ fill: "#8991A6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={56} />
              <Tooltip
                contentStyle={{ background: "#171E2E", border: "1px solid #2A3350", borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                formatter={(v) => [fmtCompact(v), "Volume"]}
              />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {volumeByCoin.map((entry) => (
                  <Cell key={entry.symbol} fill={entry.symbol === selectedCoin ? "#E8B04B" : entry.ramp} opacity={entry.symbol === selectedCoin ? 1 : 0.55} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <footer style={styles.footer}>
          Live data served by the local Express API from CSVs in <code>backend/data/</code> — see that folder's README to drop in the full Kaggle dataset.
        </footer>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      <span style={{ ...styles.statValue, color: accent }}>{value}</span>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0F1420", fontFamily: "'Inter', system-ui, sans-serif", padding: "clamp(16px, 4vw, 40px)", boxSizing: "border-box" },
  container: { maxWidth: 1180, margin: "0 auto" },
  loadingWrap: { minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 },
  spinner: { width: 32, height: 32, borderRadius: "50%", border: "3px solid #26304A", borderTopColor: "#E8B04B", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "#8991A6", fontSize: 14 },
  errorBox: { maxWidth: 480, margin: "80px auto", background: "#171E2E", borderRadius: 12, padding: 24, borderLeft: "3px solid #D66B6B" },
  header: { marginBottom: 28 },
  title: { fontFamily: "'Space Grotesk', 'Inter', sans-serif", fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 600, color: "#EDEFF4", margin: 0 },
  subtitle: { color: "#8991A6", fontSize: 13, margin: "6px 0 0" },
  filterBar: { display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #1E2536" },
  filterGroup: { display: "flex", flexDirection: "column", gap: 8 },
  filterLabel: { fontSize: 12, color: "#5C6478" },
  pillRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  pill: { padding: "6px 14px", fontSize: 13, fontWeight: 500, borderRadius: 20, border: "1px solid #26304A", background: "transparent", color: "#C7CCDA", cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 },
  statCard: { background: "#171E2E", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8, borderLeft: "3px solid #E8B04B" },
  statLabel: { fontSize: 12, color: "#8991A6" },
  statValue: { fontSize: 22, fontWeight: 600, fontFamily: "'Space Grotesk', 'Inter', sans-serif" },
  chartsRow: { display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 14, marginBottom: 14 },
  card: { background: "#171E2E", borderRadius: 12, padding: "18px 20px 8px", marginBottom: 14 },
  cardWide: {},
  cardNarrow: {},
  cardHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#EDEFF4", margin: 0 },
  cardMeta: { fontSize: 11, color: "#5C6478" },
  legendWrap: { display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", padding: "0 0 12px" },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8991A6" },
  legendDot: { width: 8, height: 8, borderRadius: "50%" },
  footer: { color: "#4A5064", fontSize: 11, textAlign: "center", marginTop: 20, lineHeight: 1.6 },
};

if (typeof document !== "undefined" && !document.getElementById("ledger-pulse-styles")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "ledger-pulse-styles";
  styleSheet.textContent = `
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 760px) { .charts-row-mobile { grid-template-columns: 1fr !important; } }
`;
  document.head.appendChild(styleSheet);
}
