import { useMemo } from "react";
import { buildCapTable } from "../lib/analysis.js";
import { money, percent } from "../lib/format.js";
import { Stat } from "./KpiCard.jsx";

export function CapTable({ inputs, currency }) {
  const table = useMemo(() => buildCapTable(inputs), [inputs]);

  return (
    <section className="card card--pad">
      <header className="chart-card__head">
        <div>
          <h3 className="chart-card__title">Ownership</h3>
          <p className="chart-card__subtitle">
            Founder dilution across priced rounds, assuming one founder group owns 100% before the first round and
            the option pool sits inside the pre-money valuation.
          </p>
        </div>
      </header>

      {!table.hasPriced ? (
        <p className="hint">
          No priced rounds yet. Add a pre-money valuation to a funding round in the sidebar to see dilution — rounds
          without a valuation are treated as unpriced (SAFE or note).
        </p>
      ) : (
        <>
          <div className="stat-list stat-list--two">
            <Stat label="Founder ownership after all rounds" value={percent(table.founderFinal)} />
            <Stat label="Total dilution" value={percent(table.totalDilution)} />
            <Stat label="Priced rounds" value={String(table.pricedRounds)} />
            <Stat label="Total raised" value={money(table.totalRaised, currency, { compact: true })} />
          </div>
          <div className="table-wrap" style={{ maxHeight: "none", marginTop: 14 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Month</th>
                  <th>Raise</th>
                  <th>Pre-money</th>
                  <th>Post-money</th>
                  <th>Investor</th>
                  <th>Founder after</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    <td className="is-number">{Math.round(row.month) + 1}</td>
                    <td className="is-number">{money(row.amount, currency, { compact: true })}</td>
                    <td className="is-number">{row.priced ? money(row.preMoney, currency, { compact: true }) : "—"}</td>
                    <td className="is-number">{row.priced ? money(row.postMoney, currency, { compact: true }) : "—"}</td>
                    <td className="is-number">{row.priced ? percent(row.investorPct) : "unpriced"}</td>
                    <td className="is-number">{percent(row.founderAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
