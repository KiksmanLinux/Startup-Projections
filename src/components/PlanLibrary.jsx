import { useEffect, useMemo, useState } from "react";
import { comparePlans, formatCompareValue } from "../lib/analysis.js";
import { formatSavedAt } from "../lib/plans.js";
import { money } from "../lib/format.js";
import { CompareChart } from "./Charts.jsx";

const CURRENT = "current";

function deltaText(row, a, b, currency) {
  const diff = b - a;
  if (Math.abs(diff) < 1e-9) return "±0";
  const sign = diff > 0 ? "+" : "−";
  if (row.format === "percent") return `${sign}${(Math.abs(diff) * 100).toFixed(1)} pp`;
  if (row.format === "months") return `${sign}${Math.round(Math.abs(diff))} mo`;
  if (row.format === "count") return `${sign}${Math.round(Math.abs(diff))}`;
  return `${sign}${money(Math.abs(diff), currency, { compact: true })}`;
}

function deltaClass(row, a, b) {
  const diff = b - a;
  if (Math.abs(diff) < 1e-9) return "delta--flat";
  const good = row.higherIsBetter ? diff > 0 : diff < 0;
  return good ? "delta--up" : "delta--down";
}

export function PlanLibrary({ plans, currentInputs, currency, theme, onSave, onLoad, onDelete }) {
  const [name, setName] = useState("");
  const [aId, setAId] = useState(CURRENT);
  const [bId, setBId] = useState("");

  useEffect(() => {
    if (plans.length && !plans.some((plan) => plan.id === bId)) setBId(plans[0].id);
  }, [plans, bId]);

  const options = useMemo(
    () => [{ id: CURRENT, name: "Current draft" }, ...plans],
    [plans]
  );

  const planA = useMemo(() => {
    if (aId === CURRENT) return { id: CURRENT, name: "Current draft", inputs: currentInputs };
    return plans.find((plan) => plan.id === aId) || null;
  }, [aId, plans, currentInputs]);

  const planB = useMemo(() => {
    if (bId === CURRENT) return { id: CURRENT, name: "Current draft", inputs: currentInputs };
    return plans.find((plan) => plan.id === bId) || null;
  }, [bId, plans, currentInputs]);

  const comparison = useMemo(() => {
    if (!planA || !planB || planA.id === planB.id) return null;
    return comparePlans(planA, planB);
  }, [planA, planB]);

  return (
    <div className="stack">
      <div className="plans-grid">
        <section className="card card--pad">
          <h3 className="card__title">Save this plan</h3>
          <p className="card__subtitle">
            Plans live in this browser only. Save a named version before testing a different hiring or pricing
            assumption, then compare the two.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <input
              className="text-input"
              style={{ flex: "1 1 180px" }}
              type="text"
              placeholder={`${currentInputs.companyName} — base case`}
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) {
                  onSave(name.trim());
                  setName("");
                }
              }}
              aria-label="Plan name"
            />
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onSave(name.trim());
                setName("");
              }}
            >
              Save plan
            </button>
          </div>
        </section>

        <section className="card card--pad">
          <h3 className="card__title">Saved plans</h3>
          <p className="card__subtitle">{plans.length} of 20 slots used on this device.</p>
          {plans.length === 0 ? (
            <p className="hint" style={{ marginTop: 14 }}>
              Nothing saved yet. Save the current draft to start a library.
            </p>
          ) : (
            <div className="plan-list">
              {plans.map((plan) => (
                <div key={plan.id} className="plan-row">
                  <div>
                    <div className="plan-row__name">{plan.name}</div>
                    <div className="plan-row__meta">
                      {formatSavedAt(plan.savedAt)} · {plan.inputs.companyName} ·{" "}
                      {money(plan.inputs.startingCash, plan.inputs.currency, { compact: true })} starting cash
                    </div>
                  </div>
                  <div className="plan-row__actions">
                    <button type="button" className="btn btn--quiet btn--small" onClick={() => onLoad(plan)}>
                      Load
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--small"
                      onClick={() => onDelete(plan)}
                      aria-label={`Delete ${plan.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card card--pad">
        <header className="chart-card__head">
          <div>
            <h3 className="chart-card__title">Compare</h3>
            <p className="chart-card__subtitle">
              Pick two plans — or the current draft — and read the difference line by line.
            </p>
          </div>
          <div className="sensitivity__controls">
            <label className="select" htmlFor="compare-a">
              <span className="select__label">Plan A</span>
              <select
                id="compare-a"
                className="select__control"
                value={aId}
                onChange={(event) => setAId(event.target.value)}
              >
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="select" htmlFor="compare-b">
              <span className="select__label">Plan B</span>
              <select
                id="compare-b"
                className="select__control"
                value={bId}
                onChange={(event) => setBId(event.target.value)}
              >
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {!comparison ? (
          <p className="hint">
            {plans.length === 0
              ? "Save a plan first — then you can compare it with the current draft."
              : "Choose two different plans to compare."}
          </p>
        ) : (
          <>
            <div className="compare-grid">
              {comparison.rows.map((row) => (
                <div key={row.id} className="compare-cell">
                  <div className="compare-cell__label">{row.label}</div>
                  <div className="compare-cell__values">
                    <span className="compare-cell__a">{formatCompareValue(row, row.a, currency)}</span>
                    <span aria-hidden="true">→</span>
                    <span className="compare-cell__b">{formatCompareValue(row, row.b, currency)}</span>
                    <span className={`compare-cell__delta ${deltaClass(row, row.a, row.b)}`}>
                      {deltaText(row, row.a, row.b, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18 }}>
              <CompareChart
                series={[
                  { name: planA.name.slice(0, 22), months: comparison.a.months },
                  { name: planB.name.slice(0, 22), months: comparison.b.months },
                ]}
                currency={currency}
                theme={theme}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
