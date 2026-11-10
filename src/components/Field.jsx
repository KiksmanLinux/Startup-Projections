import { useEffect, useState } from "react";
import { formatFieldValue } from "../lib/format.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * A labelled slider paired with an exact numeric field. The slider is good for
 * exploring, the input is good for entering a real number from a spreadsheet.
 */
export function NumberField({ field, value, currency, onChange }) {
  const isPercent = field.unit === "percent";
  const scale = isPercent ? 100 : 1;
  const decimals = isPercent ? 2 : 0;

  const toDisplay = (raw) => {
    const scaled = (Number(raw) || 0) * scale;
    return String(Number(scaled.toFixed(decimals)));
  };

  const [draft, setDraft] = useState(null);
  const shown = draft ?? toDisplay(value);

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commit = (raw) => {
    if (raw === "" || raw === "-") return;
    const parsed = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    onChange(clamp(parsed / scale, field.min, field.max));
  };

  const min = field.min * scale;
  const max = field.max * scale;
  const step = field.step * scale;
  const id = `input-${field.key}`;

  return (
    <div className="field">
      <div className="field__head">
        <label className="field__label" htmlFor={id}>
          {field.label}
          {field.help && (
            <span className="tip" tabIndex={0} role="note" aria-label={field.help}>
              <span aria-hidden="true">?</span>
              <span className="tip__bubble">{field.help}</span>
            </span>
          )}
        </label>
        <div className="field__value">
          <input
            id={id}
            className="field__input"
            type="text"
            inputMode="decimal"
            value={shown}
            aria-label={`${field.label} value`}
            onFocus={(event) => {
              setDraft(toDisplay(value));
              event.target.select();
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              commit(event.target.value);
            }}
            onBlur={() => setDraft(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                const direction = event.key === "ArrowUp" ? 1 : -1;
                onChange(clamp(value + direction * field.step, field.min, field.max));
              }
            }}
          />
          <span className="field__unit">{isPercent ? "%" : field.unit === "money" ? currency : ""}</span>
        </div>
      </div>
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value * scale}
        aria-label={field.label}
        aria-valuetext={formatFieldValue(value, field.unit, currency)}
        onChange={(event) => onChange(Number(event.target.value) / scale)}
      />
      <div className="field__scale">
        <span>{formatFieldValue(field.min, field.unit, currency)}</span>
        <span>{formatFieldValue(field.max, field.unit, currency)}</span>
      </div>
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, maxLength = 60 }) {
  return (
    <div className="field field--text">
      <div className="field__head">
        <label className="field__label" htmlFor="company-name">
          {label}
        </label>
      </div>
      <input
        id="company-name"
        className="text-input"
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          className={`seg__item ${value === option.id ? "is-active" : ""}`}
          onClick={() => onChange(option.id)}
          title={option.hint || option.note}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Select({ label, value, onChange, options, id }) {
  return (
    <label className="select" htmlFor={id}>
      <span className="select__label">{label}</span>
      <select id={id} className="select__control" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
