import { amount, formatFieldValue, money, percent } from "./format.js";
import { FIELD_GROUPS } from "./inputs.js";
import { buildProjection } from "./finance.js";

/** Axes of the risk grid: how much of the plan we can actually get wrong. */
export const SENSITIVITY_STEPS = [0.6, 0.8, 1, 1.2, 1.4];

/**
 * The two levers differ per revenue model: a customer funnel is driven by
 * acquisition and churn, a growth-rate model by growth and how fast it fades.
 */
export function sensitivityAxes(inputs) {
  if (inputs.revenueModel === "customers") {
    return {
      columnLabel: "New customers per month",
      rowLabel: "Monthly churn",
      lowerRowIsBetter: true,
    };
  }
  return {
    columnLabel: "Monthly growth rate",
    rowLabel: "Growth fade per year",
    lowerRowIsBetter: true,
  };
}

export function applySensitivity(inputs, columnFactor, rowFactor) {
  if (inputs.revenueModel === "customers") {
    return {
      ...inputs,
      newCustomersPerMonth: inputs.newCustomersPerMonth * columnFactor,
      churnMonthly: Math.min(0.2, inputs.churnMonthly * rowFactor),
    };
  }
  return {
    ...inputs,
    monthlyGrowth: Math.min(0.3, inputs.monthlyGrowth * columnFactor),
    growthDecayPerYear: Math.min(0.6, inputs.growthDecayPerYear * rowFactor),
  };
}

export const SENSITIVITY_METRICS = [
  { id: "runway", label: "Runway", hint: "Months until cash runs out (H = beyond the horizon)" },
  { id: "cashEnd", label: "Cash at end", hint: "Cash balance in the final month" },
  { id: "minCash", label: "Lowest cash", hint: "The tightest point of the plan" },
  { id: "exitArr", label: "Exit ARR", hint: "Annual run-rate in the final month" },
];

/**
 * 5×5 grid of the plan under different growth/retention assumptions.
 * Cells are plain numbers so the table can render any metric.
 */
export function buildSensitivity(inputs, metric = "runway") {
  const horizon = inputs.horizonMonths;
  const rows = SENSITIVITY_STEPS.map((rowFactor) => ({
    factor: rowFactor,
    cells: SENSITIVITY_STEPS.map((columnFactor) => {
      const projection = buildProjection(applySensitivity(inputs, columnFactor, rowFactor));
      const kpis = projection.kpis;
      const value =
        metric === "runway"
          ? kpis.runwayMonths === null
            ? horizon
            : kpis.runwayMonths
          : metric === "cashEnd"
          ? kpis.cashEnd
          : metric === "minCash"
          ? kpis.minCash
          : kpis.arrEnd;
      return {
        columnFactor,
        rowFactor,
        value,
        capped: metric === "runway" && kpis.runwayMonths === null,
        isBaseline: columnFactor === 1 && rowFactor === 1,
      };
    }),
  }));

  return {
    metric,
    steps: SENSITIVITY_STEPS,
    axes: sensitivityAxes(inputs),
    rows,
    baseline: rows[2].cells[2],
  };
}

export function sensitivityCellClass(metric, cell) {
  if (metric === "runway") {
    if (cell.capped || cell.value >= 18) return "is-ok";
    return cell.value >= 12 ? "is-watch" : "is-risk";
  }
  if (metric === "cashEnd" || metric === "minCash") {
    if (cell.value <= 0) return "is-risk";
    return cell.value < 100000 ? "is-watch" : "is-ok";
  }
  if (cell.value <= 0) return "is-risk";
  return "is-ok";
}

export function formatSensitivityValue(metric, cell, currency) {
  if (metric === "runway") return cell.capped ? `${Math.round(cell.value)}+` : String(Math.round(cell.value));
  return money(cell.value, currency, { compact: true });
}

/** Events a founder actually plans around, in calendar order. */
export function buildMilestones(projection) {
  const { months, inputs } = projection;
  const currency = inputs.currency;
  const items = [];

  for (const event of inputs.fundingEvents || []) {
    const month = months[event.month];
    if (!month || !event.amount) continue;
    items.push({
      id: `funding-${event.id}-${event.month}`,
      monthIndex: event.month,
      when: month.longLabel,
      title: event.label,
      detail: `${money(event.amount, currency, { compact: true })} into the bank`,
      tone: "accent",
    });
  }

  const firstRevenue = months.find((month) => month.revenue > 0);
  if (firstRevenue) {
    items.push({
      id: "first-revenue",
      monthIndex: firstRevenue.index,
      when: firstRevenue.longLabel,
      title: "First revenue",
      detail: `${money(firstRevenue.revenue, currency, { compact: true })} MRR`,
      tone: "neutral",
    });
  }

  for (const threshold of [100000, 500000, 1000000, 5000000]) {
    const hit = months.find((month) => month.revenue * 12 >= threshold);
    if (!hit) continue;
    items.push({
      id: `arr-${threshold}`,
      monthIndex: hit.index,
      when: hit.longLabel,
      title: `${money(threshold, currency, { compact: true })} ARR`,
      detail: `Reached at ${money(hit.revenue, currency, { compact: true })} MRR`,
      tone: "neutral",
    });
  }

  const breakEven = months.find((month) => month.ebitda >= 0);
  if (breakEven) {
    items.push({
      id: "break-even",
      monthIndex: breakEven.index,
      when: breakEven.longLabel,
      title: "Break-even",
      detail: `EBITDA turns positive at ${money(breakEven.ebitda, currency, { compact: true })} that month`,
      tone: "accent",
    });
  }

  const lowest = months.reduce((low, month) => (month.cash < low.cash ? month : low), months[0]);
  items.push({
    id: "lowest-cash",
    monthIndex: lowest.index,
    when: lowest.longLabel,
    title: lowest.cash < 0 ? "Cash below zero" : "Tightest cash point",
    detail: `${money(lowest.cash, currency, { compact: true })} on hand`,
    tone: lowest.cash < 0 ? "bad" : lowest.cash < 50000 ? "warn" : "neutral",
  });

  return items.sort((a, b) => a.monthIndex - b.monthIndex || a.title.localeCompare(b.title));
}

/** Every assumption in the model, grouped — the ledger a report needs. */
export function buildAssumptionLedger(inputs) {
  const groups = FIELD_GROUPS.map((group) => {
    const items = group.fields
      .filter((field) => field.models.includes(inputs.revenueModel))
      .map((field) => ({
        label: field.label,
        value: formatFieldValue(inputs[field.key], field.unit, inputs.currency),
      }));
    return { id: group.id, title: group.title, items };
  }).filter((group) => group.items.length > 0);

  const funding = (inputs.fundingEvents || []).map((event) => ({
    label: `${event.label} · month ${Math.round(event.month) + 1}`,
    value: amount(event.amount, inputs.currency),
  }));

  groups.push({
    id: "cash",
    title: "Cash & funding",
    items: [
      { label: "Starting cash", value: amount(inputs.startingCash, inputs.currency) },
      ...(funding.length ? funding : [{ label: "Funding rounds", value: "None planned" }]),
    ],
  });

  const cap = buildCapTable(inputs);
  if (cap.hasPriced) {
    groups.push({
      id: "ownership",
      title: "Ownership",
      items: [
        { label: "Founder ownership after all rounds", value: percent(cap.founderFinal) },
        { label: "Total dilution", value: percent(cap.totalDilution) },
        ...cap.rows
          .filter((row) => row.priced)
          .map((row) => ({ label: `${row.label} — investor share`, value: percent(row.investorPct) })),
        ...(cap.unpricedRounds > 0
          ? [{ label: "Unpriced rounds", value: `${cap.unpricedRounds} (not in dilution)` }]
          : []),
      ],
    });
  }

  groups.push({
    id: "plan",
    title: "Plan",
    items: [
      { label: "Revenue model", value: inputs.revenueModel === "customers" ? "Customers × ARPU" : "Compounded growth" },
      { label: "Horizon", value: `${inputs.horizonMonths} months` },
      { label: "Start", value: inputs.startDate },
      { label: "Currency", value: inputs.currency },
      { label: "Scenario", value: inputs.scenario },
    ],
  });

  return groups;
}

/** Side-by-side comparison of two plans, with the delta on the metrics that matter. */
export function comparePlans(planA, planB) {
  const a = buildProjection(planA.inputs, planA.inputs.scenario);
  const b = buildProjection(planB.inputs, planB.inputs.scenario);

  const rows = [
    { id: "arr", label: "Exit ARR", a: a.kpis.arrEnd, b: b.kpis.arrEnd, format: "money", higherIsBetter: true },
    { id: "revenue", label: "Revenue, last 12 months", a: a.kpis.trailingRevenue, b: b.kpis.trailingRevenue, format: "money", higherIsBetter: true },
    { id: "cash", label: "Cash at horizon end", a: a.kpis.cashEnd, b: b.kpis.cashEnd, format: "money", higherIsBetter: true },
    { id: "minCash", label: "Lowest cash point", a: a.kpis.minCash, b: b.kpis.minCash, format: "money", higherIsBetter: true },
    {
      id: "runway",
      label: "Runway",
      a: a.kpis.runwayMonths === null ? a.horizonMonths : a.kpis.runwayMonths,
      b: b.kpis.runwayMonths === null ? b.horizonMonths : b.kpis.runwayMonths,
      format: "months",
      higherIsBetter: true,
      aCapped: a.kpis.runwayMonths === null,
      bCapped: b.kpis.runwayMonths === null,
    },
    { id: "grossMargin", label: "Gross margin", a: a.kpis.grossMargin, b: b.kpis.grossMargin, format: "percent", higherIsBetter: true },
    { id: "ebitdaMargin", label: "EBITDA margin", a: a.kpis.ebitdaMargin, b: b.kpis.ebitdaMargin, format: "percent", higherIsBetter: true },
    { id: "headcount", label: "Headcount at end", a: a.kpis.headcountEnd, b: b.kpis.headcountEnd, format: "count", higherIsBetter: false },
    { id: "funding", label: "Funding raised", a: a.kpis.fundingRaised, b: b.kpis.fundingRaised, format: "money", higherIsBetter: false },
  ];

  return { a, b, rows };
}

/**
 * Founder ownership across priced rounds. A round only dilutes when both the
 * raise and a pre-money valuation are set; SAFEs and notes stay unpriced.
 * The option pool is assumed to sit inside the pre-money valuation.
 */
export function buildCapTable(inputs) {
  const events = [...(inputs?.fundingEvents || [])].sort(
    (a, b) => Number(a.month) - Number(b.month) || String(a.label).localeCompare(String(b.label))
  );

  let founder = 1;
  let totalRaised = 0;
  let pricedRounds = 0;

  const rows = events.map((event) => {
    const amount = Math.max(0, Number(event.amount) || 0);
    const preMoney = Math.max(0, Number(event.preMoney) || 0);
    const priced = amount > 0 && preMoney > 0;
    const postMoney = priced ? preMoney + amount : null;
    const investorPct = priced ? amount / postMoney : null;
    if (priced) {
      founder *= 1 - investorPct;
      pricedRounds += 1;
    }
    totalRaised += amount;
    return {
      id: event.id,
      label: event.label,
      month: event.month,
      amount,
      preMoney,
      postMoney,
      investorPct,
      priced,
      founderAfter: founder,
    };
  });

  return {
    rows,
    hasPriced: pricedRounds > 0,
    founderFinal: founder,
    totalDilution: 1 - founder,
    totalRaised,
    pricedRounds,
    unpricedRounds: rows.length - pricedRounds,
  };
}

export function formatCompareValue(row, value, currency) {
  if (row.format === "percent") return percent(value);
  if (row.format === "months") return `${Math.round(value)} mo`;
  if (row.format === "count") return String(Math.round(value));
  return money(value, currency, { compact: true });
}
