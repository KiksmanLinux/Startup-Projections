import { useState } from "react";
import { NumberField, Segmented, TextField } from "./Field.jsx";
import { FIELD_GROUPS, REVENUE_MODELS, fieldsForModel } from "../lib/inputs.js";
import { amount, percent } from "../lib/format.js";

function Section({ group, open, onToggle, children }) {
  return (
    <section className={`panel panel--${group.accent} ${open ? "is-open" : ""}`}>
      <button type="button" className="panel__head" onClick={onToggle} aria-expanded={open}>
        <span className="panel__dot" aria-hidden="true" />
        <span className="panel__title">{group.title}</span>
        <span className="panel__chevron" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <div className="panel__body">{children}</div>}
    </section>
  );
}

function FundingEditor({ inputs, currency, onChange }) {
  const events = inputs.fundingEvents || [];
  const horizon = inputs.horizonMonths;

  const update = (index, patch) => {
    const next = events.map((event, i) => (i === index ? { ...event, ...patch } : event));
    onChange(next);
  };

  const add = () => {
    const id = `round-${Date.now()}`;
    onChange([...events, { id, label: "New round", amount: 250000, month: Math.min(horizon - 1, 6) }]);
  };

  const remove = (index) => onChange(events.filter((_, i) => i !== index));

  return (
    <div className="funding">
      <div className="funding__head">
        <span className="field__label">Funding rounds</span>
        <button type="button" className="btn btn--quiet" onClick={add} disabled={events.length >= 8}>
          + Add round
        </button>
      </div>
      {events.length === 0 && (
        <p className="hint">No funding planned. The model runs on starting cash alone.</p>
      )}
      {events.map((event, index) => (
        <div className="funding__row" key={event.id || index}>
          <input
            className="text-input text-input--small"
            value={event.label}
            maxLength={40}
            aria-label={`Round ${index + 1} label`}
            onChange={(e) => update(index, { label: e.target.value })}
          />
          <div className="funding__grid">
            <label className="mini-field">
              <span>Amount ({currency})</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={event.amount}
                aria-label={`Round ${index + 1} amount`}
                onChange={(e) => update(index, { amount: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <label className="mini-field">
              <span>Start month</span>
              <input
                type="number"
                min="1"
                max={horizon}
                step="1"
                value={Math.round(event.month) + 1}
                aria-label={`Round ${index + 1} month`}
                onChange={(e) =>
                  update(index, {
                    month: Math.min(horizon - 1, Math.max(0, Math.round(Number(e.target.value) || 1) - 1)),
                  })
                }
              />
            </label>
            <button
              type="button"
              className="btn btn--danger btn--small"
              onClick={() => remove(index)}
              aria-label={`Remove ${event.label || `round ${index + 1}`}`}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <p className="hint hint--quiet">
        Total planned: {amount(events.reduce((total, event) => total + (Number(event.amount) || 0), 0), currency)}
      </p>
    </div>
  );
}

export function Sidebar({ inputs, setInput, onChange, projection }) {
  const currency = inputs.currency;
  const [openSections, setOpenSections] = useState({
    revenue: true,
    delivery: false,
    team: true,
    marketing: false,
    overhead: false,
    cash: true,
  });

  const toggle = (id) =>
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));

  return (
    <aside className="sidebar" aria-label="Model inputs">
      <div className="sidebar__intro">
        <TextField
          label="Company"
          value={inputs.companyName}
          onChange={(value) => setInput("companyName", value)}
          placeholder="Your startup"
        />
        <div className="field">
          <div className="field__head">
            <span className="field__label">Revenue model</span>
          </div>
          <Segmented
            label="Revenue model"
            options={REVENUE_MODELS}
            value={inputs.revenueModel}
            onChange={(value) => setInput("revenueModel", value)}
          />
          <p className="hint">
            {inputs.revenueModel === "customers"
              ? `Customers × ARPU. Churn costs you ${percent(inputs.churnMonthly)} of the base every month.`
              : `Compounding ${percent(inputs.monthlyGrowth)} a month, fading ${percent(
                  inputs.growthDecayPerYear
                )} per year.`}
          </p>
        </div>
      </div>

      {FIELD_GROUPS.map((group) => {
        const fields = fieldsForModel(group, inputs.revenueModel);
        if (fields.length === 0) return null;
        return (
          <Section
            key={group.id}
            group={group}
            open={Boolean(openSections[group.id])}
            onToggle={() => toggle(group.id)}
          >
            {fields.map((field) => (
              <NumberField
                key={field.key}
                field={field}
                value={inputs[field.key]}
                currency={currency}
                onChange={(value) => setInput(field.key, value)}
              />
            ))}
            {group.id === "team" && (
              <p className="hint hint--quiet">
                End of horizon: {Math.round(projection.kpis.headcountEnd)} people.
              </p>
            )}
          </Section>
        );
      })}

      <Section
        group={{ id: "cash", title: "Cash & funding", accent: "mint" }}
        open={Boolean(openSections.cash)}
        onToggle={() => toggle("cash")}
      >
        <NumberField
          field={{
            key: "startingCash",
            label: "Starting cash",
            unit: "money",
            min: 0,
            max: 5000000,
            step: 5000,
            help: "Money in the bank in month 1, before any new funding.",
          }}
          value={inputs.startingCash}
          currency={currency}
          onChange={(value) => setInput("startingCash", value)}
        />
        <FundingEditor
          inputs={inputs}
          currency={currency}
          onChange={(events) => setInput("fundingEvents", events)}
        />
      </Section>

      <div className="sidebar__footer">
        <button type="button" className="btn btn--quiet btn--block" onClick={() => onChange("reset")}>
          Reset to preset defaults
        </button>
      </div>
    </aside>
  );
}
