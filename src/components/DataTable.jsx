import { useState } from "react";
import { money, percent } from "../lib/format.js";

const COLUMNS = [
  { key: "label", label: "Month", sticky: true },
  { key: "revenue", label: "Revenue", type: "money" },
  { key: "cogs", label: "COGS", type: "money", muted: true },
  { key: "grossProfit", label: "Gross profit", type: "money" },
  { key: "people", label: "Payroll", type: "money", muted: true },
  { key: "marketing", label: "Marketing", type: "money", muted: true },
  { key: "software", label: "Tools", type: "money", muted: true },
  { key: "office", label: "Office", type: "money", muted: true },
  { key: "other", label: "Other", type: "money", muted: true },
  { key: "opex", label: "OpEx", type: "money" },
  { key: "ebitda", label: "EBITDA", type: "money", signed: true },
  { key: "funding", label: "Funding", type: "money" },
  { key: "cash", label: "Cash", type: "money", signed: true },
];

const YEAR_COLUMNS = [
  { key: "label", label: "Year", sticky: true },
  { key: "revenue", label: "Revenue", type: "money" },
  { key: "grossProfit", label: "Gross profit", type: "money" },
  { key: "opex", label: "OpEx", type: "money" },
  { key: "ebitda", label: "EBITDA", type: "money", signed: true },
  { key: "grossMargin", label: "Gross margin", type: "percent" },
  { key: "ebitdaMargin", label: "EBITDA margin", type: "percent" },
  { key: "arrEnd", label: "Exit ARR", type: "money" },
  { key: "cashEnd", label: "Cash", type: "money", signed: true },
];

const cellValue = (row, column, currency) => {
  const value = row[column.key];
  if (column.type === "percent") return percent(value);
  if (column.type === "money") return money(value, currency, { compact: true });
  return value;
};

export function DataTable({ projection, currency }) {
  const [mode, setMode] = useState("yearly");
  const columns = mode === "yearly" ? YEAR_COLUMNS : COLUMNS;
  const rows = mode === "yearly" ? projection.years : projection.months;

  return (
    <section className="card table-card">
      <header className="chart-card__head">
        <div>
          <h3 className="chart-card__title">Full model</h3>
          <p className="chart-card__subtitle">
            {mode === "yearly" ? "Annual roll-up of every line in the plan." : "Every month in the horizon."}
          </p>
        </div>
        <div className="seg seg--small" role="radiogroup" aria-label="Table granularity">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "yearly"}
            className={`seg__item ${mode === "yearly" ? "is-active" : ""}`}
            onClick={() => setMode("yearly")}
          >
            Yearly
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "monthly"}
            className={`seg__item ${mode === "monthly" ? "is-active" : ""}`}
            onClick={() => setMode("monthly")}
          >
            Monthly
          </button>
        </div>
      </header>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.sticky ? "is-sticky" : ""}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                {columns.map((column) => {
                  const value = column.type === "money" ? row[column.key] : null;
                  const negative = column.signed && typeof value === "number" && value < 0;
                  return (
                    <td
                      key={column.key}
                      className={[
                        column.sticky ? "is-sticky" : "",
                        column.muted ? "is-muted" : "",
                        negative ? "is-negative" : "",
                        column.type === "money" ? "is-number" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {cellValue(row, column, currency)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
