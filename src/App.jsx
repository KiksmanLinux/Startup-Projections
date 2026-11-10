import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { KpiCard, Stat } from "./components/KpiCard.jsx";
import {
  BurnChart,
  CashChart,
  CostChart,
  MarginChart,
  OverviewChart,
  RevenueChart,
  ScenarioChart,
} from "./components/Charts.jsx";
import { DataTable } from "./components/DataTable.jsx";
import { Segmented, Select } from "./components/Field.jsx";
import {
  SCENARIOS,
  SCENARIO_ORDER,
  benchmarkStatus,
  buildInsights,
  buildProjection,
  buildScenarioSet,
  projectionToCsv,
} from "./lib/finance.js";
import {
  DEFAULT_INPUTS,
  HORIZONS,
  PRESETS,
  applyPreset,
  normalizeInputs,
  presetIdFor,
} from "./lib/inputs.js";
import { CURRENCIES, money, months, percent, signedPercent } from "./lib/format.js";
import {
  copyText,
  loadStoredInputs,
  readShareFromLocation,
  shareUrlFor,
  storeInputs,
  writeShareToLocation,
} from "./lib/storage.js";

const OriginalApp = lazy(() => import("./original/OriginalApp.jsx"));

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "revenue", label: "Revenue" },
  { id: "costs", label: "Costs" },
  { id: "cash", label: "Cash & runway" },
  { id: "unit", label: "Unit economics" },
  { id: "scenarios", label: "Scenarios" },
  { id: "table", label: "Full model" },
];

const STORAGE_THEME = "startup-projections/theme";

const readTheme = () => {
  try {
    return window.localStorage.getItem(STORAGE_THEME) || "dark";
  } catch {
    return "dark";
  }
};

const initialInputs = () => {
  const shared = readShareFromLocation();
  if (shared) return normalizeInputs(shared);
  const stored = loadStoredInputs();
  if (stored) return normalizeInputs(stored);
  return normalizeInputs(DEFAULT_INPUTS);
};

const slugify = (value) =>
  (value || "startup")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "startup";

function InsightList({ insights }) {
  return (
    <div className="insights">
      {insights.map((insight) => (
        <article key={insight.id} className={`insight insight--${insight.severity}`}>
          <div className="insight__head">
            <span className="insight__dot" aria-hidden="true" />
            <h4 className="insight__title">{insight.title}</h4>
          </div>
          <p className="insight__detail">{insight.detail}</p>
        </article>
      ))}
    </div>
  );
}

function ScenarioComparison({ scenarios, currency, activeScenario, onSelect }) {
  const rows = [
    {
      label: "Revenue, last 12 months",
      value: (item) => money(item.kpis.trailingRevenue, currency, { compact: true }),
    },
    { label: "Exit ARR", value: (item) => money(item.kpis.arrEnd, currency, { compact: true }) },
    {
      label: "Gross margin",
      value: (item) => percent(item.kpis.grossMargin),
    },
    {
      label: "EBITDA margin",
      value: (item) => percent(item.kpis.ebitdaMargin),
    },
    {
      label: "Break-even",
      value: (item) => item.kpis.breakEvenLabel || "Beyond horizon",
    },
    {
      label: "Runway",
      value: (item) =>
        item.kpis.runwayMonths === null ? `${item.horizonMonths}+ months` : `${item.kpis.runwayMonths} months`,
    },
    {
      label: "Cash at horizon end",
      value: (item) => money(item.kpis.cashEnd, currency, { compact: true }),
    },
    {
      label: "Extra funding needed",
      value: (item) => (item.kpis.fundingGap > 0 ? money(item.kpis.fundingGap, currency, { compact: true }) : "—"),
    },
  ];

  return (
    <section className="card">
      <header className="chart-card__head">
        <div>
          <h3 className="chart-card__title">Scenario comparison</h3>
          <p className="chart-card__subtitle">The same plan under four assumptions. Click a column to explore it.</p>
        </div>
      </header>
      <div className="table-wrap">
        <table className="data-table data-table--scenarios">
          <thead>
            <tr>
              <th className="is-sticky">Metric</th>
              {scenarios.map((item) => (
                <th key={item.scenario.id}>
                  <button
                    type="button"
                    className={`scenario-head ${activeScenario === item.scenario.id ? "is-active" : ""}`}
                    onClick={() => onSelect(item.scenario.id)}
                  >
                    {SCENARIOS[item.scenario.id].label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="is-sticky">{row.label}</td>
                {scenarios.map((item) => (
                  <td key={item.scenario.id} className="is-number">
                    {row.value(item)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="data-table__note">
              <td className="is-sticky">Assumption</td>
              {scenarios.map((item) => (
                <td key={item.scenario.id}>{SCENARIOS[item.scenario.id].note}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UnitEconomics({ projection, currency }) {
  const { kpis, months: monthRows, inputs } = projection;
  const arpuStart = monthRows[0]?.arpu || 0;
  const status = (key, value) => benchmarkStatus(key, value);

  return (
    <div className="stack">
      <div className="kpi-grid kpi-grid--four">
        <KpiCard
          label="CAC"
          value={kpis.cac === null ? "n/a" : money(kpis.cac, currency, { compact: true })}
          sub="Marketing spend per new customer"
          hint="Trailing 12 months of marketing spend divided by gross new customers in the same period."
        />
        <KpiCard
          label="LTV"
          value={kpis.ltv === null || !Number.isFinite(kpis.ltv) ? "n/a" : money(kpis.ltv, currency, { compact: true })}
          sub={`ARPU × gross margin ÷ churn`}
          hint="Lifetime value with the gross-margin haircut: monthly gross profit per customer divided by monthly churn."
        />
        <KpiCard
          label="LTV : CAC"
          value={kpis.ltvCac === null ? "n/a" : `${kpis.ltvCac.toFixed(1)}×`}
          sub="Target ≥ 3×"
          status={status("ltvCac", kpis.ltvCac)}
        />
        <KpiCard
          label="CAC payback"
          value={kpis.paybackMonths === null ? "n/a" : `${kpis.paybackMonths.toFixed(1)} mo`}
          sub="Target < 12 months"
          status={status("paybackMonths", kpis.paybackMonths)}
        />
      </div>

      <div className="stack-row">
        <section className="card card--pad">
          <h3 className="chart-card__title">Customer economics</h3>
          <div className="stat-list">
            <Stat label="Monthly churn" value={percent(kpis.churnMonthly)} status={status("churnMonthly", kpis.churnMonthly)} />
            <Stat label="Annual gross retention" value={percent(kpis.grrAnnual)} />
            <Stat label="Average lifetime" value={kpis.lifetimeMonths === null ? "—" : `${kpis.lifetimeMonths.toFixed(0)} months`} />
            <Stat label="ARPU at start" value={money(arpuStart, currency)} />
            <Stat label="ARPU in last 12 months" value={money(kpis.arpu, currency)} />
            <Stat label="Customers at horizon end" value={Math.round(kpis.customersEnd).toLocaleString("en-US")} />
          </div>
        </section>
        <section className="card card--pad">
          <h3 className="chart-card__title">Efficiency</h3>
          <div className="stat-list">
            <Stat
              label="Burn multiple"
              value={kpis.burnMultiple === null ? "n/a" : `${kpis.burnMultiple.toFixed(1)}×`}
              status={status("burnMultiple", kpis.burnMultiple)}
            />
            <Stat label="Net burn / month (12m avg)" value={money(kpis.netBurn, currency, { compact: true })} />
            <Stat label="Rule of 40" value={kpis.ruleOf40 === null ? "n/a" : String(Math.round(kpis.ruleOf40 * 100))} />
            <Stat
              label="Year-over-year growth"
              value={kpis.yoyGrowth === null ? "n/a" : signedPercent(kpis.yoyGrowth)}
            />
            <Stat label="Funding raised" value={money(kpis.fundingRaised, currency, { compact: true })} />
            <Stat label="Revenue model" value={inputs.revenueModel === "customers" ? "Customers × ARPU" : "Compounded growth"} />
          </div>
        </section>
      </div>

      <section className="card card--pad card--muted">
        <h3 className="chart-card__title">How to read this</h3>
        <p className="prose">
          CAC counts only marketing spend, so it understates the true cost if sales salaries are not in the marketing
          budget — move part of payroll into marketing if you have a sales team. LTV assumes churn stays constant and
          includes the gross-margin haircut. A healthy plan usually sits above 3× LTV:CAC with payback under a year;
          below 2× growth is being bought with cash rather than earned.
        </p>
      </section>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => (window.location.hash === "#original" ? "original" : "app"));
  const [theme, setTheme] = useState(readTheme);
  const [inputs, setInputs] = useState(initialInputs);
  const [tab, setTab] = useState("overview");
  const [costView, setCostView] = useState("yearly");
  const [inputsOpen, setInputsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(STORAGE_THEME, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => storeInputs(inputs), 250);
    return () => window.clearTimeout(timer);
  }, [inputs]);

  useEffect(() => {
    document.title = `${inputs.companyName} · projections`;
  }, [inputs.companyName]);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash === "#original" ? "original" : "app");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const projection = useMemo(() => buildProjection(inputs, inputs.scenario), [inputs]);
  const scenarios = useMemo(() => buildScenarioSet(inputs), [inputs]);
  const insights = useMemo(() => buildInsights(projection), [projection]);
  const currency = inputs.currency;
  const kpis = projection.kpis;

  const setInput = useCallback((key, value) => {
    setInputs((current) => ({ ...current, [key]: value }));
  }, []);

  const handleSidebarChange = useCallback(
    (key, value) => {
      if (key === "reset") {
        const id = presetIdFor(inputs);
        setInputs(applyPreset(DEFAULT_INPUTS, id === "custom" ? "saas" : id));
        notify("Inputs reset to the preset defaults");
        return;
      }
      setInput(key, value);
    },
    [inputs, notify, setInput]
  );

  const handlePreset = (id) => {
    if (id === "custom") return;
    setInputs(applyPreset(inputs, id));
    notify(`${PRESETS.find((preset) => preset.id === id)?.name || "Preset"} loaded`);
  };

  const handleShare = async () => {
    const normalized = normalizeInputs(inputs);
    const url = writeShareToLocation(normalized) || shareUrlFor(normalized);
    const copied = await copyText(url);
    notify(copied ? "Share link copied — it carries the whole model" : "Share link is in the address bar");
  };

  const handleExport = () => {
    const csv = projectionToCsv(projection);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(inputs.companyName)}-${inputs.scenario}-projections.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify("CSV downloaded");
  };

  const runwayStatus =
    kpis.runwayMonths === null ? "good" : kpis.runwayMonths <= 12 ? "bad" : kpis.runwayMonths <= 18 ? "warn" : "good";
  const runwayMeter = kpis.runwayMonths === null ? 1 : Math.min(1, kpis.runwayMonths / 24);
  const presetId = presetIdFor(inputs);

  if (route === "original") {
    return (
      <div className="legacy">
        <div className="legacy__bar">
          <span>
            <strong>Version 1</strong> — the original single-screen model, kept for reference.
          </span>
          <a className="btn btn--quiet" href="#" onClick={() => setRoute("app")}>
            ← Back to the new cockpit
          </a>
        </div>
        <Suspense fallback={<div className="legacy__loading">Loading version 1…</div>}>
          <OriginalApp />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Startup Projections home">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l5-6 4 3 5-8 4 5" />
              <path d="M3 21h18" opacity="0.45" />
            </svg>
          </span>
          <span className="brand__text">
            <span className="brand__name">Startup Projections</span>
            <span className="brand__tag">Monthly model · burn · runway · scenarios</span>
          </span>
        </a>

        <div className="toolbar">
          <Select
            id="preset"
            label="Preset"
            value={presetId === "custom" ? "custom" : presetId}
            onChange={handlePreset}
            options={[
              ...PRESETS.map((preset) => ({ value: preset.id, label: preset.name })),
              { value: "custom", label: "Custom" },
            ]}
          />
          <Select
            id="currency"
            label="Currency"
            value={currency}
            onChange={(value) => setInput("currency", value)}
            options={CURRENCIES.map((item) => ({ value: item.code, label: item.code }))}
          />
          <Select
            id="horizon"
            label="Horizon"
            value={String(inputs.horizonMonths)}
            onChange={(value) => setInput("horizonMonths", Number(value))}
            options={HORIZONS.map((value) => ({ value: String(value), label: `${value} months` }))}
          />
          <div className="toolbar__actions">
            <button
              type="button"
              className="btn btn--quiet mobile-only"
              onClick={() => setInputsOpen((open) => !open)}
              aria-expanded={inputsOpen}
              aria-controls="model-inputs"
            >
              Inputs
            </button>
            <button type="button" className="btn btn--quiet" onClick={handleShare} title="Copy a link that contains this model">
              Share
            </button>
            <button type="button" className="btn btn--quiet" onClick={handleExport} title="Download the model as CSV">
              CSV
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </div>
        </div>
      </header>

      <div className="subbar">
        <div className="subbar__identity">
          <h1 className="subbar__title">{inputs.companyName}</h1>
          <p className="subbar__meta">
            {inputs.horizonMonths}-month plan · starting {money(kpis.cashStart, currency, { compact: true })} ·
            running {inputs.revenueModel === "customers" ? "customer-funnel" : "growth-rate"} model
          </p>
        </div>
        <div className="subbar__scenario">
          <span className="subbar__scenario-label">Scenario</span>
          <Segmented
            label="Scenario"
            options={SCENARIO_ORDER.map((id) => ({
              id,
              label: SCENARIOS[id].label,
              hint: SCENARIOS[id].note,
            }))}
            value={inputs.scenario}
            onChange={(value) => setInput("scenario", value)}
          />
        </div>
      </div>

      <div className={`layout ${inputsOpen ? "is-inputs-open" : ""}`}>
        <Sidebar inputs={inputs} setInput={setInput} onChange={handleSidebarChange} projection={projection} />

        <main className="main">
          <div className="kpi-grid">
            <KpiCard
              label="Exit ARR"
              value={money(kpis.arrEnd, currency, { compact: true })}
              sub={`${money(kpis.mrrEnd, currency, { compact: true })} MRR at the end`}
              hint="Annual run-rate based on the last month of the horizon."
            />
            <KpiCard
              label="Revenue growth"
              value={kpis.yoyGrowth === null ? signedPercent(kpis.mrrGrowth) : signedPercent(kpis.yoyGrowth)}
              sub={kpis.yoyGrowth === null ? "First month to last month" : "Last 12 months vs previous 12"}
            />
            <KpiCard
              label="Gross margin"
              value={percent(kpis.grossMargin)}
              sub="Trailing 12 months"
              status={benchmarkStatus("grossMargin", kpis.grossMargin)}
              hint="Revenue minus cost of delivery, divided by revenue. Software businesses usually sit near 80%."
            />
            <KpiCard
              label="EBITDA margin"
              value={percent(kpis.ebitdaMargin)}
              sub={`${money(kpis.trailingEbitda, currency, { compact: true })} last 12 months`}
              status={benchmarkStatus("ebitdaMargin", kpis.ebitdaMargin)}
              hint="Operating profit after payroll and all operating costs, before tax and financing."
            />
            <KpiCard
              label="Cash at horizon end"
              value={money(kpis.cashEnd, currency, { compact: true })}
              sub={`Lowest point ${money(kpis.minCash, currency, { compact: true })}`}
              status={kpis.cashEnd > 0 ? "good" : "bad"}
            />
            <KpiCard
              label="Runway"
              value={kpis.runwayMonths === null ? `${inputs.horizonMonths}+ mo` : `${kpis.runwayMonths} mo`}
              sub={
                kpis.runwayMonths === null
                  ? "Cash never runs out in this plan"
                  : `Cash hits zero around ${kpis.runwayMonthLabel}`
              }
              status={runwayStatus}
              meter={runwayMeter}
              hint="Months until the cash balance goes negative. Investors usually want 18–24 months after a round."
            />
          </div>

          <nav className="tabs" aria-label="Views">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tab ${tab === item.id ? "is-active" : ""}`}
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {tab === "overview" && (
            <div className="stack">
              <OverviewChart projection={projection} currency={currency} theme={theme} />
              <InsightList insights={insights} />
              <div className="stack-row stack-row--stats">
                <section className="card card--pad">
                  <h3 className="chart-card__title">Plan at a glance</h3>
                  <div className="stat-list stat-list--two">
                    <Stat label="Revenue, year 1" value={money(projection.years[0]?.revenue || 0, currency, { compact: true })} />
                    <Stat
                      label={`Revenue, year ${projection.years.length}`}
                      value={money(projection.years[projection.years.length - 1]?.revenue || 0, currency, { compact: true })}
                    />
                    <Stat label="Funding raised" value={money(kpis.fundingRaised, currency, { compact: true })} />
                    <Stat label="Headcount at end" value={Math.round(kpis.headcountEnd).toString()} />
                    <Stat label="Customers at end" value={Math.round(kpis.customersEnd).toLocaleString("en-US")} />
                    <Stat label="Peak burn" value={money(Math.max(...projection.months.map((month) => month.netBurn)), currency, { compact: true })} />
                  </div>
                </section>
                <MarginChart projection={projection} theme={theme} currency={currency} />
              </div>
            </div>
          )}

          {tab === "revenue" && (
            <div className="stack">
              <RevenueChart projection={projection} currency={currency} theme={theme} />
              <div className="stack-row stack-row--stats">
                <section className="card card--pad">
                  <h3 className="chart-card__title">Revenue detail</h3>
                  <div className="stat-list stat-list--two">
                    <Stat label="MRR in month 1" value={money(kpis.mrrStart, currency, { compact: true })} />
                    <Stat label="MRR at the end" value={money(kpis.mrrEnd, currency, { compact: true })} />
                    <Stat label="Exit ARR" value={money(kpis.arrEnd, currency, { compact: true })} />
                    <Stat label="Customers at end" value={Math.round(kpis.customersEnd).toLocaleString("en-US")} />
                    <Stat label="ARPU (trailing)" value={money(kpis.arpu, currency)} />
                    <Stat label="Growth per month (avg)" value={percent(Math.pow(kpis.mrrEnd / Math.max(1, kpis.mrrStart), 1 / Math.max(1, inputs.horizonMonths - 1)) - 1)} />
                  </div>
                </section>
                <MarginChart projection={projection} theme={theme} currency={currency} />
              </div>
            </div>
          )}

          {tab === "costs" && (
            <div className="stack">
              <CostChart projection={projection} currency={currency} theme={theme} yearly={costView === "yearly"} />
              <div className="stack-row stack-row--stats">
                <section className="card card--pad">
                  <h3 className="chart-card__title">Cost structure</h3>
                  <div className="stat-list stat-list--two">
                    <Stat label="Operating costs, year 1" value={money(projection.years[0]?.opex || 0, currency, { compact: true })} />
                    <Stat
                      label={`Operating costs, year ${projection.years.length}`}
                      value={money(projection.years[projection.years.length - 1]?.opex || 0, currency, { compact: true })}
                    />
                    <Stat label="Payroll share of OpEx" value={percent(
                      projection.months[projection.months.length - 1].opex > 0
                        ? projection.months[projection.months.length - 1].people / projection.months[projection.months.length - 1].opex
                        : 0
                    )} />
                    <Stat label="Marketing share of OpEx" value={percent(
                      projection.months[projection.months.length - 1].opex > 0
                        ? projection.months[projection.months.length - 1].marketing / projection.months[projection.months.length - 1].opex
                        : 0
                    )} />
                    <Stat label="Headcount at end" value={Math.round(kpis.headcountEnd).toString()} />
                    <Stat label="Cost per head / month" value={money(
                      projection.months[projection.months.length - 1].headcount > 0
                        ? projection.months[projection.months.length - 1].people / projection.months[projection.months.length - 1].headcount
                        : 0,
                      currency
                    )} />
                  </div>
                </section>
                <section className="card card--pad">
                  <div className="card__head-inline">
                    <h3 className="chart-card__title">Monthly view</h3>
                    <div className="seg seg--small" role="radiogroup" aria-label="Cost granularity">
                      <button type="button" role="radio" aria-checked={costView === "yearly"} className={`seg__item ${costView === "yearly" ? "is-active" : ""}`} onClick={() => setCostView("yearly")}>
                        Yearly
                      </button>
                      <button type="button" role="radio" aria-checked={costView === "monthly"} className={`seg__item ${costView === "monthly" ? "is-active" : ""}`} onClick={() => setCostView("monthly")}>
                        Monthly
                      </button>
                    </div>
                  </div>
                  <BurnChart projection={projection} currency={currency} theme={theme} />
                </section>
              </div>
            </div>
          )}

          {tab === "cash" && (
            <div className="stack">
              <CashChart projection={projection} currency={currency} theme={theme} />
              <div className="kpi-grid kpi-grid--four">
                <KpiCard
                  label="Runway"
                  value={kpis.runwayMonths === null ? `${inputs.horizonMonths}+ mo` : `${kpis.runwayMonths} mo`}
                  status={runwayStatus}
                  meter={runwayMeter}
                  sub={kpis.runwayMonths === null ? "Solvent through the horizon" : `Zero around ${kpis.runwayMonthLabel}`}
                />
                <KpiCard label="Gross burn" value={money(kpis.grossBurn, currency, { compact: true })} sub="Monthly costs before revenue" />
                <KpiCard label="Net burn" value={money(kpis.netBurn, currency, { compact: true })} sub="Trailing 12-month average" status={kpis.netBurn > 0 ? "warn" : "good"} />
                <KpiCard
                  label="Extra funding needed"
                  value={kpis.fundingGap > 0 ? money(kpis.fundingGap, currency, { compact: true }) : "None"}
                  sub={kpis.fundingGap > 0 ? `Lowest point ${money(kpis.minCash, currency, { compact: true })}` : "Plan stays solvent"}
                  status={kpis.fundingGap > 0 ? "bad" : "good"}
                />
              </div>
              <div className="stack-row stack-row--stats">
                <section className="card card--pad">
                  <h3 className="chart-card__title">Cash detail</h3>
                  <div className="stat-list stat-list--two">
                    <Stat label="Starting cash" value={money(kpis.cashStart, currency, { compact: true })} />
                    <Stat label="Funding raised" value={money(kpis.fundingRaised, currency, { compact: true })} />
                    <Stat label="Cash at horizon end" value={money(kpis.cashEnd, currency, { compact: true })} status={kpis.cashEnd > 0 ? "good" : "bad"} />
                    <Stat label="Lowest cash point" value={money(kpis.minCash, currency, { compact: true })} status={kpis.minCash >= 0 ? "good" : "bad"} />
                    <Stat label="Break-even" value={kpis.breakEvenLabel || "Beyond horizon"} />
                    <Stat label="Months to break-even" value={kpis.breakEvenMonth === null ? "—" : months(kpis.breakEvenMonth)} />
                  </div>
                </section>
                <BurnChart projection={projection} currency={currency} theme={theme} />
              </div>
            </div>
          )}

          {tab === "unit" && <UnitEconomics projection={projection} currency={currency} />}

          {tab === "scenarios" && (
            <div className="stack">
              <ScenarioChart scenarios={scenarios} currency={currency} theme={theme} />
              <ScenarioComparison
                scenarios={scenarios}
                currency={currency}
                activeScenario={inputs.scenario}
                onSelect={(value) => setInput("scenario", value)}
              />
            </div>
          )}

          {tab === "table" && <DataTable projection={projection} currency={currency} />}

          <footer className="footer">
            <span>
              Everything runs in your browser — no account, no upload. Saved automatically on this device.
            </span>
            <span className="footer__links">
              <button type="button" className="link-btn" onClick={handleShare}>
                Copy share link
              </button>
              <span aria-hidden="true">·</span>
              <a className="link-btn" href="#original">
                View the original v1
              </a>
            </span>
          </footer>
        </main>
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
