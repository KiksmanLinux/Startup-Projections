import { useMemo } from "react";
import { buildMilestones } from "../lib/analysis.js";

export function Milestones({ projection, title = "Milestones", subtitle, compact = false }) {
  const items = useMemo(() => buildMilestones(projection), [projection]);

  if (compact) {
    return (
      <div>
        {items.map((item) => (
          <div key={item.id} className="report__ledger-row">
            <span>
              {item.when} · {item.title}
            </span>
            <span>{item.detail}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="card card--pad">
      <header className="chart-card__head">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          <p className="chart-card__subtitle">
            {subtitle || "Funding, revenue thresholds, break-even and the tightest cash point, in calendar order."}
          </p>
        </div>
      </header>
      <div className="timeline">
        {items.map((item) => (
          <div key={item.id} className={`milestone milestone--${item.tone}`}>
            <div className="milestone__when">{item.when}</div>
            <div className="milestone__rail">
              <span className="milestone__dot" />
            </div>
            <div>
              <div className="milestone__title">{item.title}</div>
              <div className="milestone__detail">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
