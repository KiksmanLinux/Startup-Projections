import { money, monthLabel, monthLongLabel, percent, yearLabel } from "./format.js";

/**
 * Scenario knobs. Each one is a multiplier on the base plan, so every scenario
 * shares the same cost structure and only the growth/retention story changes.
 */
export const SCENARIOS = {
  upside: {
    id: "upside",
    label: "Upside",
    note: "Win rate improves, churn drops, costs stay flat",
    growthMultiplier: 1.35,
    churnMultiplier: 0.7,
    costMultiplier: 0.97,
  },
  base: {
    id: "base",
    label: "Base",
    note: "The plan as entered",
    growthMultiplier: 1,
    churnMultiplier: 1,
    costMultiplier: 1,
  },
  downside: {
    id: "downside",
    label: "Downside",
    note: "Slower sales, higher churn, some cost creep",
    growthMultiplier: 0.65,
    churnMultiplier: 1.5,
    costMultiplier: 1.05,
  },
  stress: {
    id: "stress",
    label: "Stress",
    note: "No traction and cost overruns at the same time",
    growthMultiplier: 0.4,
    churnMultiplier: 2.2,
    costMultiplier: 1.2,
  },
};

export const SCENARIO_ORDER = ["upside", "base", "downside", "stress"];

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const sum = (items, key) => items.reduce((total, item) => total + num(item[key]), 0);

const safeDiv = (a, b) => (b > 0 ? a / b : null);

/**
 * Pure projection engine: no React, no DOM, no formatting.
 * Returns monthly rows, yearly roll-ups and the derived KPIs.
 */
export function buildProjection(inputs, scenarioId = inputs?.scenario) {
  const scenario = SCENARIOS[scenarioId] || SCENARIOS.base;
  const horizon = Math.round(clamp(num(inputs?.horizonMonths, 60), 1, 120));
  const startDate = inputs?.startDate || "2026-01-01";
  const customersMode = inputs?.revenueModel === "customers";

  const monthlyGrowth = clamp(num(inputs?.monthlyGrowth), -0.95, 1);
  const growthDecay = clamp(num(inputs?.growthDecayPerYear), 0, 0.9);
  const churn = clamp(clamp(num(inputs?.churnMonthly), 0, 0.99) * scenario.churnMultiplier, 0, 0.99);
  const arpuBase = Math.max(0, num(inputs?.arpu));
  const priceGrowth = clamp(num(inputs?.priceGrowthPerYear), -0.9, 1);
  const cogsRate = clamp(num(inputs?.cogsRate), 0, 1);

  const baseHeadcount = Math.max(0, num(inputs?.headcount));
  const hiresPerYear = Math.max(0, num(inputs?.hiresPerYear));
  const monthlySalary = Math.max(0, num(inputs?.avgAnnualSalary)) / 12;
  const salaryGrowth = clamp(num(inputs?.salaryGrowthPerYear), 0, 1);
  const employerCost = Math.max(0, num(inputs?.employerCostRate));

  const marketingGrowth = clamp(num(inputs?.marketingGrowthPerYear), 0, 3);
  const marketingRate = clamp(num(inputs?.marketingRateOfRevenue), 0, 1);
  const softwareGrowth = clamp(num(inputs?.softwareGrowthPerYear), 0, 3);
  const officeGrowth = clamp(num(inputs?.officeGrowthPerYear), 0, 3);
  const otherGrowth = clamp(num(inputs?.otherGrowthPerYear), 0, 3);

  const fundingEvents = Array.isArray(inputs?.fundingEvents) ? inputs.fundingEvents : [];

  // Cash timing: revenue is recognised when invoiced, cash arrives later.
  const collectionLagDays = clamp(num(inputs?.collectionLagDays), 0, 90);
  const lag = collectionLagDays / 30;
  const lagNext = clamp(lag, 0, 1);
  const lagSecond = clamp(lag - 1, 0, 1);
  const taxRate = clamp(num(inputs?.taxRate), 0, 0.6);
  const cashFloor = Math.max(0, num(inputs?.cashFloor));

  let customers = Math.max(0, num(inputs?.startingCustomers));
  let mrr = Math.max(0, num(inputs?.startingMrr));
  let cash = num(inputs?.startingCash);
  let previousRevenue = 0;
  let twoMonthsAgoRevenue = 0;
  let receivables = 0;
  let taxLossCarry = 0;

  const months = [];

  for (let index = 0; index < horizon; index += 1) {
    const yearIndex = Math.floor(index / 12);
    const arpu = arpuBase * Math.pow(1 + priceGrowth, yearIndex);
    const previousCustomers = customers;
    let acquired = 0;

    if (customersMode) {
      if (index > 0) {
        acquired = Math.max(0, num(inputs?.newCustomersPerMonth)) * scenario.growthMultiplier;
        customers = Math.max(0, previousCustomers * (1 - churn) + acquired);
      }
      mrr = customers * arpu;
    } else {
      if (index > 0) {
        const growth =
          monthlyGrowth * scenario.growthMultiplier * Math.pow(1 - growthDecay, yearIndex);
        mrr = Math.max(0, mrr * (1 + growth));
      }
      customers = arpu > 0 ? mrr / arpu : 0;
      acquired = Math.max(0, customers - previousCustomers + previousCustomers * churn);
    }

    const revenue = mrr;
    const churned = customersMode ? Math.max(0, previousCustomers * churn) : previousCustomers * churn;
    const cogs = revenue * cogsRate;
    const grossProfit = revenue - cogs;

    const headcount = baseHeadcount + hiresPerYear * yearIndex;
    const people =
      headcount * monthlySalary * Math.pow(1 + salaryGrowth, yearIndex) * (1 + employerCost);

    const marketing =
      (Math.max(0, num(inputs?.marketingMonthly)) * Math.pow(1 + marketingGrowth, yearIndex) +
        revenue * marketingRate) *
      scenario.costMultiplier;

    const software =
      Math.max(0, num(inputs?.softwareMonthly)) * Math.pow(1 + softwareGrowth, yearIndex) * scenario.costMultiplier;
    const office =
      Math.max(0, num(inputs?.officeMonthly)) * Math.pow(1 + officeGrowth, yearIndex) * scenario.costMultiplier;
    const other =
      Math.max(0, num(inputs?.otherMonthly)) * Math.pow(1 + otherGrowth, yearIndex) * scenario.costMultiplier;

    const opex = people + marketing + software + office + other;
    const ebitda = grossProfit - opex;
    const funding = fundingEvents
      .filter((event) => Math.round(num(event.month)) === index)
      .reduce((total, event) => total + Math.max(0, num(event.amount)), 0);

    // Receipts follow the collection lag; the unpaid remainder sits in receivables.
    const collected =
      revenue * (1 - lagNext) +
      previousRevenue * Math.max(0, lagNext - lagSecond) +
      twoMonthsAgoRevenue * lagSecond;
    receivables += revenue - collected;

    // Corporate tax on positive profit, with earlier losses carried forward.
    let taxableProfit = 0;
    if (ebitda > 0) {
      const usedLoss = Math.min(taxLossCarry, ebitda);
      taxLossCarry -= usedLoss;
      taxableProfit = ebitda - usedLoss;
    } else {
      taxLossCarry += -ebitda;
    }
    const tax = taxableProfit * taxRate;

    const openingCash = cash;
    cash = openingCash + collected - cogs - opex - tax + funding;

    months.push({
      index,
      label: monthLabel(startDate, index),
      longLabel: monthLongLabel(startDate, index),
      yearIndex,
      revenue,
      mrr,
      arpu,
      customers,
      acquired,
      churned,
      cogs,
      grossProfit,
      grossMargin: safeDiv(grossProfit, revenue) ?? 0,
      collected,
      receivables,
      tax,
      taxableProfit,
      headcount,
      people,
      marketing,
      software,
      office,
      other,
      opex,
      ebitda,
      ebitdaMargin: safeDiv(ebitda, revenue) ?? 0,
      grossBurn: cogs + opex,
      netBurn: cogs + opex - revenue,
      cashBurn: cogs + opex + tax - collected,
      funding,
      openingCash,
      cash,
    });

    twoMonthsAgoRevenue = previousRevenue;
    previousRevenue = revenue;
  }

  const years = [];
  for (let start = 0; start < horizon; start += 12) {
    const slice = months.slice(start, start + 12);
    const revenue = sum(slice, "revenue");
    const grossProfit = sum(slice, "grossProfit");
    const ebitda = sum(slice, "ebitda");
    const last = slice[slice.length - 1];
    years.push({
      index: years.length,
      label: yearLabel(startDate, years.length),
      revenue,
      cogs: sum(slice, "cogs"),
      grossProfit,
      grossMargin: safeDiv(grossProfit, revenue) ?? 0,
      people: sum(slice, "people"),
      marketing: sum(slice, "marketing"),
      software: sum(slice, "software"),
      office: sum(slice, "office"),
      other: sum(slice, "other"),
      opex: sum(slice, "opex"),
      ebitda,
      ebitdaMargin: safeDiv(ebitda, revenue) ?? 0,
      tax: sum(slice, "tax"),
      netIncome: ebitda - sum(slice, "tax"),
      collected: sum(slice, "collected"),
      funding: sum(slice, "funding"),
      cashEnd: last.cash,
      arrEnd: last.revenue * 12,
      customersEnd: last.customers,
      headcountEnd: last.headcount,
    });
  }

  const last = months[months.length - 1];
  const trailing = months.slice(-12);
  const previousTrailing = months.slice(-24, -12);

  const trailingRevenue = sum(trailing, "revenue");
  const previousTrailingRevenue = sum(previousTrailing, "revenue");
  const trailingGrossProfit = sum(trailing, "grossProfit");
  const trailingEbitda = sum(trailing, "ebitda");
  const trailingMarketing = sum(trailing, "marketing");
  const trailingCogs = sum(trailing, "cogs");
  const trailingOpex = sum(trailing, "opex");
  const trailingAcquired = sum(trailing, "acquired");
  const trailingCustomers = sum(trailing, "customers");

  const grossMargin = safeDiv(trailingGrossProfit, trailingRevenue) ?? 0;
  const ebitdaMargin = safeDiv(trailingEbitda, trailingRevenue) ?? 0;
  const depletion = months.find((month) => month.cash < 0) || null;
  const breakEven = months.find((month) => month.ebitda >= 0) || null;
  const minCash = Math.min(num(inputs?.startingCash), ...months.map((month) => month.cash));
  const fundingGap = minCash < 0 ? -minCash : 0;
  const fundingRaised = sum(months, "funding");
  const floorBreach = cashFloor > 0 ? months.find((month) => month.cash < cashFloor) || null : null;

  const trailingArpu = safeDiv(trailingRevenue, trailingCustomers) ?? 0;
  const trailingNetBurn = (trailingCogs + trailingOpex - trailingRevenue) / Math.max(1, trailing.length);
  const cac = trailingAcquired > 0 ? trailingMarketing / trailingAcquired : null;
  const ltv =
    churn > 0 ? (trailingArpu * grossMargin) / churn : trailingArpu * grossMargin > 0 ? Infinity : null;
  const paybackMonths =
    cac !== null && trailingArpu * grossMargin > 0 ? cac / (trailingArpu * grossMargin) : null;
  const netNewArr =
    previousTrailing.length > 0 ? (last.revenue - months[months.length - 13].revenue) * 12 : null;
  const burnMultiple =
    netNewArr !== null && netNewArr > 0 && trailingNetBurn > 0 ? trailingNetBurn / (netNewArr / 12) : null;

  const kpis = {
    arrEnd: last.revenue * 12,
    mrrStart: months[0].revenue,
    mrrEnd: last.revenue,
    mrrGrowth: safeDiv(last.revenue, months[0].revenue) === null ? 0 : safeDiv(last.revenue, months[0].revenue) - 1,
    customersEnd: last.customers,
    customersStart: months[0].customers,
    headcountEnd: last.headcount,
    grossMargin,
    ebitdaMargin,
    trailingRevenue,
    trailingEbitda,
    cashEnd: last.cash,
    cashStart: num(inputs?.startingCash),
    minCash,
    fundingGap,
    fundingRaised,
    taxPaid: sum(months, "tax"),
    receivables: last.receivables,
    cashBurn: (trailingCogs + trailingOpex + sum(trailing, "tax") - sum(trailing, "collected")) / Math.max(1, trailing.length),
    cashFloor,
    runwayToFloorMonths: floorBreach ? floorBreach.index : null,
    runwayToFloorLabel: floorBreach ? floorBreach.longLabel : null,
    collectionLagDays,
    taxRate,
    runwayMonths: depletion ? depletion.index : null,
    runwayMonthLabel: depletion ? depletion.longLabel : null,
    breakEvenMonth: breakEven ? breakEven.index : null,
    breakEvenLabel: breakEven ? breakEven.longLabel : null,
    grossBurn: (trailingCogs + trailingOpex) / Math.max(1, trailing.length),
    netBurn: trailingNetBurn,
    runwayMonthsAtCurrentBurn: trailingNetBurn > 0 ? Math.max(0, last.cash) / trailingNetBurn : null,
    yoyGrowth:
      previousTrailing.length === 12 && sum(previousTrailing, "revenue") > 0
        ? trailingRevenue / sum(previousTrailing, "revenue") - 1
        : null,
    burnMultiple,
    cac,
    ltv,
    ltvCac: ltv !== null && cac !== null && cac > 0 ? ltv / cac : null,
    paybackMonths,
    grrAnnual: Math.pow(1 - churn, 12),
    churnMonthly: churn,
    arpu: trailingArpu,
    lifetimeMonths: churn > 0 ? 1 / churn : null,
    // Meaningless when the revenue base is tiny or margins are below −100%.
    ruleOf40:
      previousTrailing.length === 12 && previousTrailingRevenue > 0 && ebitdaMargin > -1
        ? Math.max(-1, Math.min(3, trailingRevenue / previousTrailingRevenue - 1)) + ebitdaMargin
        : null,
  };

  return {
    months,
    years,
    kpis,
    inputs,
    scenario,
    horizonMonths: horizon,
  };
}

/** All four scenarios, computed from the same inputs. */
export function buildScenarioSet(inputs) {
  return SCENARIO_ORDER.map((id) => buildProjection(inputs, id));
}

export const BENCHMARKS = {
  grossMargin: { label: "SaaS median ≈ 80%", good: 0.75, warn: 0.6, higherIsBetter: true },
  churnMonthly: { label: "Healthy < 2.5% /mo", good: 0.025, warn: 0.04, higherIsBetter: false },
  ltvCac: { label: "Target ≥ 3×", good: 3, warn: 2, higherIsBetter: true },
  paybackMonths: { label: "Target < 12 months", good: 12, warn: 18, higherIsBetter: false },
  runwayMonths: { label: "Target 18–24 months", good: 18, warn: 12, higherIsBetter: true },
  burnMultiple: { label: "Target < 1.5", good: 1.5, warn: 2.5, higherIsBetter: false },
  ebitdaMargin: { label: "Profitable above 0%", good: 0, warn: -0.25, higherIsBetter: true },
};

export function benchmarkStatus(key, value) {
  const benchmark = BENCHMARKS[key];
  if (!benchmark || value === null || value === undefined || !Number.isFinite(value)) return "neutral";
  if (benchmark.higherIsBetter) {
    if (value >= benchmark.good) return "good";
    return value >= benchmark.warn ? "warn" : "bad";
  }
  if (value <= benchmark.good) return "good";
  return value <= benchmark.warn ? "warn" : "bad";
}

/** Plain-language read of the plan, with the next action to consider. */
export function buildInsights(projection) {
  const { kpis, inputs } = projection;
  const currency = inputs?.currency || "USD";
  const money$ = (value) => money(value, currency, { compact: true });
  const insights = [];

  if (kpis.runwayMonths === null) {
    insights.push({
      id: "runway-ok",
      severity: "good",
      title: "Cash lasts past the horizon",
      detail: `You never dip below zero and end with ${money$(kpis.cashEnd)} after raising ${money$(
        kpis.fundingRaised
      )}.`,
    });
  } else if (kpis.runwayMonths <= 12) {
    insights.push({
      id: "runway-critical",
      severity: "critical",
      title: `Cash runs out in ${kpis.runwayMonths} months`,
      detail: `Zero balance around ${kpis.runwayMonthLabel}. Start the next round now, or cut burn by about ${money$(
        Math.abs(kpis.netBurn)
      )} a month.`,
    });
  } else {
    insights.push({
      id: "runway-warn",
      severity: "warning",
      title: `${kpis.runwayMonths} months of runway`,
      detail: `Cash bottoms out around ${kpis.runwayMonthLabel}. Fundraising usually takes 4–6 months, so the round should be underway before you are 9 months out.`,
    });
  }

  if (kpis.runwayToFloorMonths !== null && kpis.runwayToFloorMonths <= 18) {
    insights.push({
      id: "cash-floor",
      severity: kpis.runwayToFloorMonths <= 9 ? "critical" : "warning",
      title:
        kpis.runwayToFloorMonths === 0
          ? "Starting cash is already below your floor"
          : `Cash floor reached in ${kpis.runwayToFloorMonths} ${
              kpis.runwayToFloorMonths === 1 ? "month" : "months"
            }`,
      detail: `Your ${money$(kpis.cashFloor)} floor is breached around ${kpis.runwayToFloorLabel}. The balance itself lasts ${
        kpis.runwayMonths === null ? "past the horizon" : `until ${kpis.runwayMonthLabel}`
      }, but the floor is the number you planned to protect.`,
    });
  }

  if (kpis.collectionLagDays >= 15 && kpis.receivables > 0) {
    insights.push({
      id: "receivables",
      severity: "info",
      title: `Receivables tie up ${money$(kpis.receivables)}`,
      detail: `${kpis.collectionLagDays}-day collection terms mean the bank balance runs behind revenue. Billing up front or shortening terms releases that cash.`,
    });
  }

  if (kpis.taxPaid > 0) {
    insights.push({
      id: "tax",
      severity: "info",
      title: `Corporate tax: ${money$(kpis.taxPaid)} over the horizon`,
      detail: `Modelled at ${percent(kpis.taxRate)} on positive profit with earlier losses carried forward. It leaves the bank account as the plan turns profitable.`,
    });
  }

  const peakBurn = Math.max(0, ...projection.months.map((month) => month.netBurn));
  if (kpis.runwayMonths !== null && kpis.runwayMonths > 0 && kpis.minCash >= 0 && kpis.minCash < peakBurn) {
    const tightest = projection.months.reduce((lowest, month) => (month.cash < lowest.cash ? month : lowest));
    insights.push({
      id: "thin-buffer",
      severity: "warning",
      title: `Tightest cash point: ${money$(kpis.minCash)}`,
      detail: `Around ${tightest.longLabel} you are down to less than one month of peak burn (${money$(
        peakBurn
      )}). One late invoice or a missed month of sales would put payroll at risk.`,
    });
  }

  if (kpis.fundingGap > 0) {
    insights.push({
      id: "funding-gap",
      severity: "critical",
      title: `Funding gap of ${money$(kpis.fundingGap)}`,
      detail: `Your lowest cash position is ${money$(kpis.minCash)}. Add roughly ${money$(
        kpis.fundingGap * 1.5
      )} of funding (or equivalent cost cuts) to keep a safety buffer.`,
    });
  }

  if (kpis.breakEvenMonth === null) {
    insights.push({
      id: "no-break-even",
      severity: "warning",
      title: "No break-even inside the horizon",
      detail: `EBITDA margin is still ${percent(kpis.ebitdaMargin)} at the end. Either the growth curve needs to steepen or the cost base needs to shrink.`,
    });
  } else {
    insights.push({
      id: "break-even",
      severity: "good",
      title: `Break-even around ${kpis.breakEvenLabel}`,
      detail: `From then on operations fund themselves; ${money$(kpis.trailingEbitda)} of EBITDA in the last 12 months.`,
    });
  }

  if (inputs?.revenueModel === "customers" && kpis.churnMonthly > 0.04) {
    insights.push({
      id: "churn",
      severity: "warning",
      title: `Churn is ${percent(kpis.churnMonthly)} per month`,
      detail: `That is ${percent(1 - kpis.grrAnnual)} of revenue lost per year. Every point of churn removed is worth more than a point of new sales.`,
    });
  }

  if (kpis.grossMargin < 0.6) {
    insights.push({
      id: "margin",
      severity: "warning",
      title: `Gross margin is ${percent(kpis.grossMargin)}`,
      detail: `Software businesses usually land near 80%. Check delivery costs — at ${percent(
        kpis.grossMargin
      )} every new sale adds less than you think.`,
    });
  }

  if (kpis.ltvCac !== null && kpis.ltvCac < 3) {
    insights.push({
      id: "ltv-cac",
      severity: kpis.ltvCac < 1.5 ? "critical" : "warning",
      title: `LTV:CAC is ${kpis.ltvCac.toFixed(1)}×`,
      detail: `Below 3× means acquisition is eating the value of a customer. CAC is ${money$(
        kpis.cac
      )} and LTV is ${money$(kpis.ltv)}.`,
    });
  }

  if (kpis.paybackMonths !== null && kpis.paybackMonths > 18) {
    insights.push({
      id: "payback",
      severity: "warning",
      title: `CAC payback takes ${Math.round(kpis.paybackMonths)} months`,
      detail: "Under 12 months is comfortable for a self-funding growth engine; above 18 months you fund growth with cash.",
    });
  }

  if (kpis.burnMultiple !== null && kpis.burnMultiple > 2) {
    insights.push({
      id: "burn-multiple",
      severity: "warning",
      title: `Burn multiple is ${kpis.burnMultiple > 99 ? "99+" : kpis.burnMultiple.toFixed(1)}×`,
      detail: "You are spending more than $2 of net burn for every $1 of new ARR. The usual rule of thumb is below 1.5×.",
    });
  }

  const lastMonth = projection.months[projection.months.length - 1];
  const peopleShare = lastMonth.opex > 0 ? lastMonth.people / lastMonth.opex : 0;
  if (peopleShare > 0.7) {
    insights.push({
      id: "payroll-share",
      severity: "info",
      title: `Payroll is ${percent(peopleShare)} of spend`,
      detail: "Team cost dominates the model, so hiring pace is your main lever on runway.",
    });
  }

  if (kpis.ruleOf40 !== null && kpis.ruleOf40 < 0.4) {
    insights.push({
      id: "rule-of-40",
      severity: "info",
      title: `Rule of 40 score: ${Math.round(kpis.ruleOf40 * 100)}`,
      detail: "Growth plus EBITDA margin below 40 means the mix of growth and profitability is below what investors usually want to see.",
    });
  }

  return insights;
}

const CSV_COLUMNS = [
  ["month", "Month"],
  ["revenue", "Revenue"],
  ["mrr", "MRR"],
  ["collected", "Cash collected"],
  ["receivables", "Receivables"],
  ["customers", "Customers"],
  ["cogs", "COGS"],
  ["grossProfit", "Gross profit"],
  ["headcount", "Headcount"],
  ["people", "Payroll"],
  ["marketing", "Marketing"],
  ["software", "Software"],
  ["office", "Office"],
  ["other", "Other"],
  ["opex", "Operating expenses"],
  ["ebitda", "EBITDA"],
  ["tax", "Corporate tax"],
  ["funding", "Funding"],
  ["cash", "Cash"],
];

const csvCell = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? String(Math.round(value)) : "0";
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function projectionToCsv(projection) {
  const header = CSV_COLUMNS.map(([, label]) => label).join(",");
  const rows = projection.months.map((month) =>
    CSV_COLUMNS.map(([key]) => csvCell(key === "month" ? month.longLabel : month[key])).join(",")
  );
  return [header, ...rows].join("\n");
}
