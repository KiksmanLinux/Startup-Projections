import { useMemo } from "react";
import { buildAssumptionLedger, buildCapTable } from "../lib/analysis.js";
import { SCENARIOS, SCENARIO_ORDER } from "../lib/finance.js";
import { money, percent } from "../lib/format.js";
import { Milestones } from "./Milestones.jsx";

const today = () =>
  new Date().toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });

export function ReportView({ inputs, projection, scenarios, currency, onPrint }) {
  const ledger = useMemo(() => buildAssumptionLedger(inputs), [inputs]);
  const cap = useMemo(() => buildCapTable(inputs), [inputs]);
  const kpis = projection.kpis;

  const metrics = [
    { label: "Exit ARR", value: money(kpis.arrEnd, currency, { compact: true }) },
    { label: "MRR, final month", value: money(kpis.mrrEnd, currency, { compact: true }) },
    { label: "Revenue, last 12 months", value: money(kpis.trailingRevenue, currency, { compact: true }) },
    { label: "Gross margin", value: percent(kpis.grossMargin) },
    { label: "EBITDA margin", value: percent(kpis.ebitdaMargin) },
    { label: "Cash at horizon end", value: money(kpis.cashEnd, currency, { compact: true }) },
    {
      label: "Runway",
      value: kpis.runwayMonths === null ? `${inputs.horizonMonths}+ months` : `${kpis.runwayMonths} months`,
    },
    { label: "Break-even", value: kpis.breakEvenLabel || "Beyond horizon" },
    { label: "Customers at end", value: Math.round(kpis.customersEnd).toLocaleString("en-US") },
    { label: "Headcount at end", value: String(Math.round(kpis.headcountEnd)) },
    { label: "Funding raised", value: money(kpis.fundingRaised, currency, { compact: true }) },
    { label: "Corporate tax paid", value: money(kpis.taxPaid, currency, { compact: true }) },
    { label: "Receivables at end", value: money(kpis.receivables, currency, { compact: true }) },
    {
      label: "Extra funding needed",
      value: kpis.fundingGap > 0 ? money(kpis.fundingGap, currency, { compact: true }) : "None",
    },
  ];

  return (
    <article className="report">
      <header className="report__head">
        <div>
          <div className="eyebrow">Financial plan</div>
          <h2 className="report__company">{inputs.companyName}</h2>
          <p className="report__meta">
            {inputs.horizonMonths}-month projection · {SCENARIOS[inputs.scenario]?.label || "Base"} scenario ·{" "}
            {currency} · generated {today()}
          </p>
        </div>
        <button type="button" className="btn no-print" onClick={onPrint}>
          Print / save as PDF
        </button>
      </header>

      <section className="report__section">
        <h3 className="report__section-title">Key figures</h3>
        <div className="report__metrics">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="report__metric-label">{metric.label}</div>
              <div className="report__metric-value">{metric.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="report__section">
        <h3 className="report__section-title">Scenarios</h3>
        <table className="report__table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Exit ARR</th>
              <th>EBITDA margin</th>
              <th>Runway</th>
              <th>Cash at end</th>
              <th>Break-even</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((item) => (
              <tr key={item.scenario.id}>
                <td>{SCENARIOS[item.scenario.id].label}</td>
                <td>{money(item.kpis.arrEnd, currency, { compact: true })}</td>
                <td>{percent(item.kpis.ebitdaMargin)}</td>
                <td>
                  {item.kpis.runwayMonths === null
                    ? `${item.horizonMonths}+ mo`
                    : `${item.kpis.runwayMonths} mo`}
                </td>
                <td>{money(item.kpis.cashEnd, currency, { compact: true })}</td>
                <td>{item.kpis.breakEvenLabel || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report__section">
        <h3 className="report__section-title">Milestones</h3>
        <Milestones projection={projection} compact />
      </section>

      {cap.hasPriced && (
        <section className="report__section">
          <h3 className="report__section-title">Ownership</h3>
          <table className="report__table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Raise</th>
                <th>Pre-money</th>
                <th>Post-money</th>
                <th>Investor</th>
                <th>Founder after</th>
              </tr>
            </thead>
            <tbody>
              {cap.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td>{money(row.amount, currency, { compact: true })}</td>
                  <td>{row.priced ? money(row.preMoney, currency, { compact: true }) : "—"}</td>
                  <td>{row.priced ? money(row.postMoney, currency, { compact: true }) : "—"}</td>
                  <td>{row.priced ? percent(row.investorPct) : "unpriced"}</td>
                  <td>{percent(row.founderAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="report__note" style={{ marginTop: 10 }}>
            Unpriced rounds (SAFEs and notes) are excluded from the dilution.
          </p>
        </section>
      )}

      <section className="report__section">
        <h3 className="report__section-title">Assumptions</h3>
        <div className="report__ledger">
          {ledger.map((group) => (
            <div key={group.id} className="report__ledger-group">
              <div className="report__ledger-title">{group.title}</div>
              {group.items.map((item) => (
                <div key={`${group.id}-${item.label}`} className="report__ledger-row">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <p className="report__note">
        All figures are a plan, not a forecast: they follow directly from the assumptions above and are calculated
        month by month in the browser. Corporate tax is charged at {percent(inputs.taxRate)} on positive profit with
        earlier losses carried forward, and revenue is collected with a {inputs.collectionLagDays}-day lag.
        Depreciation, capital expenditure, VAT and one-off investments are excluded. Scenario multipliers:{" "}
        {SCENARIO_ORDER.map((id) => `${SCENARIOS[id].label} ${SCENARIOS[id].growthMultiplier}× growth`).join(", ")}.
      </p>
    </article>
  );
}
