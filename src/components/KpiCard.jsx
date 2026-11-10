export function KpiCard({ label, value, sub, status = "neutral", hint, meter }) {
  return (
    <div className={`kpi kpi--${status}`}>
      <div className="kpi__label">
        {label}
        {hint && (
          <span className="tip" tabIndex={0} role="note" aria-label={hint}>
            <span aria-hidden="true">?</span>
            <span className="tip__bubble">{hint}</span>
          </span>
        )}
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
