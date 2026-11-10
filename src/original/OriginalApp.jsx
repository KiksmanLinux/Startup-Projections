import { useState, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

const fmt = (n) =>
  Math.abs(n) >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : Math.abs(n) >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n.toFixed(0)}`;

const pct = (n) => `${(n * 100).toFixed(0)}%`;

const MONTHS = ["Y1", "Y2", "Y3", "Y4", "Y5"];

const defaultInputs = {
  // Revenue
  startingRevenue: 50000,
  revenueGrowthRates: [1.2, 0.8, 0.6, 0.4, 0.3],
  // COGS
  cogsPercent: 0.35,
  // Operating Expenses
  salaries: 120000,
  salariesGrowth: 0.3,
  marketing: 24000,
  marketingGrowth: 0.4,
  rent: 18000,
  rentGrowth: 0.05,
  software: 6000,
  softwareGrowth: 0.2,
  other: 12000,
  otherGrowth: 0.15,
  // Starting
  initialCash: 250000,
};

const COLORS = {
  revenue: "#00d4aa",
  gross: "#4fc3f7",
  ebitda: "#ff6b6b",
  cashflow: "#ffd166",
  bar: ["#00d4aa", "#4fc3f7", "#ff6b6b", "#ffd166", "#c77dff"],
};

const Slider = ({ label, value, min, max, step = 1000, onChange, format = fmt }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace" }}>{format(value)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: "#00d4aa", cursor: "pointer" }}
    />
  </div>
);

const MetricCard = ({ label, value, sub, positive }) => (
  <div style={{
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "16px 20px",
    flex: 1,
    minWidth: 140,
  }}>
    <div style={{ fontSize: 10, color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: positive === undefined ? "#e2e8f0" : positive ? "#00d4aa" : "#ff6b6b", fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#8892a4", marginTop: 4 }}>{sub}</div>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a2035", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 16px" }}>
      <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 8, fontSize: 13 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, marginBottom: 3 }}>
          {p.name}: <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

export default function StartupProjections() {
  const [inputs, setInputs] = useState(defaultInputs);
  const [activeTab, setActiveTab] = useState("overview");

  const set = (key) => (val) => setInputs((p) => ({ ...p, [key]: val }));

  const projections = useMemo(() => {
    const years = [];
    let cumCash = inputs.initialCash;
    let revenue = inputs.startingRevenue;

    for (let i = 0; i < 5; i++) {
      if (i > 0) revenue = revenue * (1 + inputs.revenueGrowthRates[i]);
      const cogs = revenue * inputs.cogsPercent;
      const grossProfit = revenue - cogs;
      const grossMargin = grossProfit / revenue;

      const salaries = inputs.salaries * Math.pow(1 + inputs.salariesGrowth, i);
      const marketing = inputs.marketing * Math.pow(1 + inputs.marketingGrowth, i);
      const rent = inputs.rent * Math.pow(1 + inputs.rentGrowth, i);
      const software = inputs.software * Math.pow(1 + inputs.softwareGrowth, i);
      const other = inputs.other * Math.pow(1 + inputs.otherGrowth, i);
      const opex = salaries + marketing + rent + software + other;

      const ebitda = grossProfit - opex;
      cumCash += ebitda;

      years.push({
        year: MONTHS[i],
        revenue: Math.round(revenue),
        grossProfit: Math.round(grossProfit),
        grossMargin,
        cogs: Math.round(cogs),
        salaries: Math.round(salaries),
        marketing: Math.round(marketing),
        rent: Math.round(rent),
        software: Math.round(software),
        other: Math.round(other),
        opex: Math.round(opex),
        ebitda: Math.round(ebitda),
        cumCash: Math.round(cumCash),
      });
    }
    return years;
  }, [inputs]);

  const y5 = projections[4];
  const y1 = projections[0];
  const breakEvenYear = projections.find((y) => y.ebitda >= 0);

  const tabs = ["overview", "revenue", "expenses", "cashflow"];

  return (
    <div style={{
      background: "#0d1117",
      minHeight: "100vh",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: "0",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0d1117 0%, #131c2e 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "28px 32px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4aa", boxShadow: "0 0 12px #00d4aa" }} />
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: "#00d4aa" }}>Startup Financial Model</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>5-Year Projections</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#8892a4" }}>Adjust inputs on the left — charts update instantly</p>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 100px)" }}>

        {/* Sidebar */}
        <div style={{
          width: 280,
          flexShrink: 0,
          background: "rgba(255,255,255,0.02)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "24px 20px",
          overflowY: "auto",
        }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#00d4aa", marginBottom: 16, fontWeight: 700 }}>Revenue Inputs</div>

          <Slider label="Year 1 Revenue" value={inputs.startingRevenue} min={10000} max={2000000} step={5000} onChange={set("startingRevenue")} />
          {[0,1,2,3,4].map(i => (
            <Slider key={i} label={`Y${i+1}→Y${i+2} Growth`} value={inputs.revenueGrowthRates[i]} min={0} max={3} step={0.05}
              onChange={(v) => setInputs(p => {
                const r = [...p.revenueGrowthRates]; r[i] = v; return { ...p, revenueGrowthRates: r };
              })}
              format={pct}
            />
          ))}

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "20px 0", paddingTop: 20 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4fc3f7", marginBottom: 16, fontWeight: 700 }}>Cost of Goods Sold</div>
            <Slider label="COGS %" value={inputs.cogsPercent} min={0.05} max={0.8} step={0.01} onChange={set("cogsPercent")} format={pct} />
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "20px 0", paddingTop: 20 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#ff6b6b", marginBottom: 16, fontWeight: 700 }}>Operating Expenses (Y1)</div>
            <Slider label="Salaries" value={inputs.salaries} min={0} max={1000000} step={5000} onChange={set("salaries")} />
            <Slider label="Marketing" value={inputs.marketing} min={0} max={500000} step={1000} onChange={set("marketing")} />
            <Slider label="Rent / Office" value={inputs.rent} min={0} max={200000} step={1000} onChange={set("rent")} />
            <Slider label="Software / Tools" value={inputs.software} min={0} max={100000} step={500} onChange={set("software")} />
            <Slider label="Other" value={inputs.other} min={0} max={200000} step={1000} onChange={set("other")} />
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "20px 0", paddingTop: 20 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#ffd166", marginBottom: 16, fontWeight: 700 }}>Starting Cash</div>
            <Slider label="Initial Capital" value={inputs.initialCash} min={0} max={5000000} step={10000} onChange={set("initialCash")} />
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>

          {/* KPI Cards */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <MetricCard label="Y5 Revenue" value={fmt(y5.revenue)} sub={`vs ${fmt(y1.revenue)} in Y1`} />
            <MetricCard label="Y5 Gross Margin" value={pct(y5.grossMargin)} sub="Gross profit / Revenue" positive={y5.grossMargin > 0.4} />
            <MetricCard label="Y5 EBITDA" value={fmt(y5.ebitda)} sub="Operating profit" positive={y5.ebitda > 0} />
            <MetricCard label="Break-Even" value={breakEvenYear ? breakEvenYear.year : "Not Y1-5"} sub="First profitable year" positive={!!breakEvenYear} />
            <MetricCard label="Y5 Cash" value={fmt(y5.cumCash)} sub="Cumulative from ops" positive={y5.cumCash > 0} />
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{
                  padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: activeTab === t ? "#00d4aa" : "rgba(255,255,255,0.05)",
                  color: activeTab === t ? "#0d1117" : "#8892a4",
                  textTransform: "capitalize", transition: "all 0.15s",
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* Charts */}
          {activeTab === "overview" && (
            <div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#8892a4", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Revenue · Gross Profit · EBITDA</div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={projections}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="year" tick={{ fill: "#8892a4", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmt} tick={{ fill: "#8892a4", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#8892a4" }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="revenue" stroke={COLORS.revenue} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.revenue }} name="Revenue" />
                    <Line type="monotone" dataKey="grossProfit" stroke={COLORS.gross} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.gross }} name="Gross Profit" />
                    <Line type="monotone" dataKey="ebitda" stroke={COLORS.ebitda} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.ebitda }} name="EBITDA" strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Table */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 16px" }}>
                <div style={{ fontSize: 12, color: "#8892a4", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>P&L Summary</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Metric", ...MONTHS].map(h => (
                          <th key={h} style={{ textAlign: "right", padding: "8px 12px", color: "#8892a4", fontWeight: 600, fontSize: 11, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Revenue", key: "revenue", color: COLORS.revenue },
                        { label: "Gross Profit", key: "grossProfit", color: COLORS.gross },
                        { label: "OpEx", key: "opex", color: "#ff6b6b" },
                        { label: "EBITDA", key: "ebitda", color: COLORS.ebitda },
                      ].map(row => (
                        <tr key={row.label}>
                          <td style={{ padding: "8px 12px", color: row.color, fontWeight: 600 }}>{row.label}</td>
                          {projections.map((y, i) => (
                            <td key={i} style={{ textAlign: "right", padding: "8px 12px", color: row.key === "ebitda" ? (y[row.key] >= 0 ? "#00d4aa" : "#ff6b6b") : "#e2e8f0" }}>
                              {fmt(y[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "revenue" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 16px" }}>
              <div style={{ fontSize: 12, color: "#8892a4", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Revenue & Gross Profit by Year</div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={projections} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="year" tick={{ fill: "#8892a4", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmt} tick={{ fill: "#8892a4", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#8892a4" }} />
                  <Bar dataKey="revenue" fill={COLORS.revenue} radius={[6,6,0,0]} name="Revenue" />
                  <Bar dataKey="grossProfit" fill={COLORS.gross} radius={[6,6,0,0]} name="Gross Profit" />
                  <Bar dataKey="cogs" fill="#4a5568" radius={[6,6,0,0]} name="COGS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === "expenses" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 16px" }}>
              <div style={{ fontSize: 12, color: "#8892a4", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>OpEx Breakdown by Category</div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="year" tick={{ fill: "#8892a4", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmt} tick={{ fill: "#8892a4", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#8892a4" }} />
                  <Bar dataKey="salaries" stackId="a" fill={COLORS.bar[0]} name="Salaries" />
                  <Bar dataKey="marketing" stackId="a" fill={COLORS.bar[1]} name="Marketing" />
                  <Bar dataKey="rent" stackId="a" fill={COLORS.bar[2]} name="Rent" />
                  <Bar dataKey="software" stackId="a" fill={COLORS.bar[3]} name="Software" />
                  <Bar dataKey="other" stackId="a" fill={COLORS.bar[4]} radius={[6,6,0,0]} name="Other" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === "cashflow" && (
            <div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#8892a4", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Cumulative Cash Position</div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={projections}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="year" tick={{ fill: "#8892a4", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmt} tick={{ fill: "#8892a4", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#ff6b6b" strokeDasharray="4 4" label={{ value: "Zero", fill: "#ff6b6b", fontSize: 10 }} />
                    <Line type="monotone" dataKey="cumCash" stroke={COLORS.cashflow} strokeWidth={3} dot={{ r: 5, fill: COLORS.cashflow }} name="Cum. Cash" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: "rgba(255,166,22,0.06)", border: "1px solid rgba(255,209,102,0.2)", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: "#ffd166" }}>
                💡 This models cash from operations only. Add CapEx, fundraising rounds, and debt to refine your runway estimate.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}