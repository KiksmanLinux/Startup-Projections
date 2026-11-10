const STATUS_TEXT = {
  good: "Healthy",
  warn: "Watch",
  bad: "Risk",
  neutral: null,
};

export function KpiCard({ label, value, sub, status = "neutral", hint, meter, statusText }) {
  // Only flag what needs attention; a healthy plan should read as quiet.
  const chip = statusText === undefined ? (status === "good" ? null : STATUS_TEXT[status]) : statusText;
  return (
    <div className={`kpi kpi--${status}`}>
      <div className="kpi__top">
        <span className="kpi__label">
          {label}
          {hint && (
            <span className="tip" tabIndex={0} role="note" aria-label={hint}>
              <span aria-hidden="true">i</span>
              <span className="tip__bubble">{hint}</span>
            </span>
          )}
        </span>
        {chip && <span className={`chip chip--${status}`}>{chip}</span>}
      </div>
      <div className="kpi__value">{value}</div>
      {sub && <div className="kpi__sub">{sub}</div>}
      {typeof meter === "number" && (
        <div className="kpi__meter" aria-hidden="true">
          <span style={{ width: `${Math.max(2, Math.min(100, meter * 100))}%` }} />
        </div>
      )}
    </div>
  );
}

export function Stat({ label, value, status = "neutral" }) {
  return (
    <div className={`stat stat--${status}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}
