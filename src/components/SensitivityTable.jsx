import { useState } from "react";
import {
  SENSITIVITY_METRICS,
  buildSensitivity,
  formatSensitivityValue,
  sensitivityCellClass,
} from "../lib/analysis.js";
import { useMemo } from "react";

const factorLabel = (factor) => (factor === 1 ? "as planned" : `${factor.toFixed(1)}×`);

export function SensitivityTable({ inputs, currency }) {
  const [metric, setMetric] = useState("runway");
  const grid = useMemo(() => buildSensitivity(inputs, metric), [inputs, metric]);
  const activeMetric = SENSITIVITY_METRICS.find((item) => item.id === metric) || SENSITIVITY_METRICS[0];

  return (
    <section className="card sensitivity">
      <header className="chart-card__head">
        <div>
          <h3 className="chart-card__title">Sensitivity</h3>
          <p className="chart-card__subtitle">
            {grid.axes.rowLabel} on the left, {grid.axes.columnLabel.toLowerCase()} along the top. The outlined
            cell is the plan as entered.
          </p>
        </div>
        <div className="sensitivity__controls">
          <div className="seg seg--small" role="radiogroup" aria-label="Sensitivity metric">
            {SENSITIVITY_METRICS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={metric === item.id}
                className={`seg__item ${metric === item.id ? "is-active" : ""}`}
                onClick={() => setMetric(item.id)}
                title={item.hint}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="table-wrap" style={{ maxHeight: "none" }}>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>{grid.axes.rowLabel} \ {activeMetric.label}</th>
              {grid.steps.map((step) => (
                <th key={step}>{factorLabel(step)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={row.factor}>
                <td className="axis-label">{factorLabel(row.factor)}</td>
                {row.cells.map((cell) => (
                  <td
                    key={cell.columnFactor}
                    className={`value ${sensitivityCellClass(metric, cell)} ${cell.isBaseline ? "is-baseline" : ""}`}
                  >
                    {formatSensitivityValue(metric, cell, currency)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sensitivity__foot">
        {activeMetric.hint}. Coloured cells are graded against typical startup targets (runway 18 months, positive
        cash).
      </p>
    </section>
  );
}
