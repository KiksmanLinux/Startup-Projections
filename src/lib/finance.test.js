import { describe, expect, it } from "vitest";
import {
  SCENARIO_ORDER,
  benchmarkStatus,
  buildInsights,
  buildProjection,
  buildScenarioSet,
  projectionToCsv,
} from "./finance.js";
import { DEFAULT_INPUTS, PRESETS, applyPreset, normalizeInputs, sanitizeFundingEvents } from "./inputs.js";

const base = (patch = {}) => normalizeInputs({ ...DEFAULT_INPUTS, ...patch });

const randomInputs = (seed) => {
  let state = seed;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const pick = (min, max) => min + rnd() * (max - min);
  return base({
    revenueModel: rnd() > 0.5 ? "customers" : "growth",
    horizonMonths: [24, 36, 48, 60][Math.floor(rnd() * 4)],
    startingMrr: pick(0, 400000),
    monthlyGrowth: pick(-0.2, 0.35),
    growthDecayPerYear: pick(0, 0.6),
    startingCustomers: pick(0, 3000),
    newCustomersPerMonth: pick(0, 500),
    churnMonthly: pick(0, 0.18),
    arpu: pick(0, 3000),
    priceGrowthPerYear: pick(-0.2, 0.2),
    cogsRate: pick(0, 0.9),
    headcount: Math.round(pick(0, 120)),
    hiresPerYear: Math.round(pick(0, 30)),
    avgAnnualSalary: pick(0, 300000),
    salaryGrowthPerYear: pick(0, 0.2),
    employerCostRate: pick(0, 0.4),
    marketingMonthly: pick(0, 300000),
    marketingGrowthPerYear: pick(0, 1),
    marketingRateOfRevenue: pick(0, 0.3),
    softwareMonthly: pick(0, 50000),
    softwareGrowthPerYear: pick(0, 0.8),
    officeMonthly: pick(0, 50000),
    officeGrowthPerYear: pick(0, 0.8),
    otherMonthly: pick(0, 50000),
    otherGrowthPerYear: pick(0, 0.8),
    startingCash: pick(0, 5000000),
    fundingEvents: [
      { id: "a", label: "A", amount: pick(0, 2000000), month: Math.round(pick(0, 23)) },
    ],
  });
};

describe("projection engine", () => {
  it("produces the requested horizon and yearly roll-ups", () => {
    for (const horizonMonths of [24, 36, 48, 60]) {
      const projection = buildProjection(base({ horizonMonths }));
      expect(projection.months).toHaveLength(horizonMonths);
      expect(projection.years).toHaveLength(Math.ceil(horizonMonths / 12));
      expect(projection.months[0].yearIndex).toBe(0);
      expect(projection.months[horizonMonths - 1].yearIndex).toBe(Math.floor((horizonMonths - 1) / 12));
    }
  });

  it("keeps the cash identity: receipts − costs − tax + funding", () => {
    const projection = buildProjection(base());
    let running = projection.inputs.startingCash;
    for (const month of projection.months) {
      running += month.collected - month.cogs - month.opex - month.tax + month.funding;
      expect(month.cash).toBeCloseTo(running, 6);
    }
    expect(projection.months[projection.months.length - 1].cash).toBeCloseTo(projection.kpis.cashEnd, 6);
  });

  it("sums yearly revenue to the sum of monthly revenue", () => {
    const projection = buildProjection(base());
    const monthly = projection.months.reduce((total, month) => total + month.revenue, 0);
    const yearly = projection.years.reduce((total, year) => total + year.revenue, 0);
    expect(yearly).toBeCloseTo(monthly, 4);
  });

  it("grows customers monotonically when churn is zero", () => {
    const projection = buildProjection(
      base({ revenueModel: "customers", startingCustomers: 50, newCustomersPerMonth: 10, churnMonthly: 0 })
    );
    for (let i = 1; i < projection.months.length; i += 1) {
      expect(projection.months[i].customers).toBeGreaterThan(projection.months[i - 1].customers);
    }
    expect(projection.months[0].customers).toBeCloseTo(50, 6);
  });

  it("applies funding in the correct month", () => {
    const projection = buildProjection(
      base({ startingCash: 0, fundingEvents: [{ id: "x", label: "X", amount: 500000, month: 3 }] })
    );
    expect(projection.months[2].funding).toBe(0);
    expect(projection.months[3].funding).toBe(500000);
    expect(projection.months[4].funding).toBe(0);
  });

  it("computes runway from the first negative cash month", () => {
    const projection = buildProjection(
      base({
        revenueModel: "customers",
        startingCustomers: 0,
        newCustomersPerMonth: 0,
        startingCash: 100000,
        headcount: 1,
        hiresPerYear: 0,
        avgAnnualSalary: 60000,
        salaryGrowthPerYear: 0,
        employerCostRate: 0,
        marketingMonthly: 0,
        softwareMonthly: 0,
        officeMonthly: 0,
        otherMonthly: 0,
        cogsRate: 0,
        fundingEvents: [],
      })
    );
    // 5,000 of flat monthly cost against 100,000 of cash: month 20 lands on
    // exactly zero, the first negative month is index 20, so runway is 20.
    expect(projection.months[19].cash).toBeCloseTo(0, 6);
    expect(projection.months[20].cash).toBeLessThan(0);
    expect(projection.kpis.runwayMonths).toBe(20);
    expect(projection.kpis.runwayMonths).toBe(
      projection.months.findIndex((month) => month.cash < 0)
    );
  });

  it("finds break-even when EBITDA turns positive", () => {
    const projection = buildProjection(base());
    const firstPositive = projection.months.findIndex((month) => month.ebitda >= 0);
    expect(projection.kpis.breakEvenMonth).toBe(firstPositive === -1 ? null : firstPositive);
  });

  it("keeps gross margin consistent with the COGS rate", () => {
    const projection = buildProjection(base({ cogsRate: 0.31 }));
    for (const month of projection.months.filter((row) => row.revenue > 0)) {
      expect(month.grossMargin).toBeCloseTo(0.69, 8);
    }
  });

  it("orders scenarios from upside to stress", () => {
    const [upside, baseline, downside, stress] = buildScenarioSet(base());
    expect(upside.kpis.trailingRevenue).toBeGreaterThanOrEqual(baseline.kpis.trailingRevenue);
    expect(baseline.kpis.trailingRevenue).toBeGreaterThanOrEqual(downside.kpis.trailingRevenue);
    expect(downside.kpis.trailingRevenue).toBeGreaterThanOrEqual(stress.kpis.trailingRevenue);
    expect(SCENARIO_ORDER).toHaveLength(4);
  });

  it("is deterministic", () => {
    const a = buildProjection(base());
    const b = buildProjection(base());
    expect(JSON.stringify(a.months)).toBe(JSON.stringify(b.months));
  });

  it("handles a completely empty business without NaN", () => {
    const projection = buildProjection(
      base({
        startingCash: 0,
        startingCustomers: 0,
        startingMrr: 0,
        newCustomersPerMonth: 0,
        arpu: 0,
        headcount: 0,
        hiresPerYear: 0,
        marketingMonthly: 0,
        softwareMonthly: 0,
        officeMonthly: 0,
        otherMonthly: 0,
        cogsRate: 0,
        fundingEvents: [],
      })
    );
    for (const month of projection.months) {
      expect(Number.isFinite(month.cash)).toBe(true);
      expect(Number.isFinite(month.revenue)).toBe(true);
      expect(month.revenue).toBe(0);
    }
    expect(projection.kpis.runwayMonths).not.toBeNaN();
    expect(Number.isFinite(projection.kpis.cashEnd)).toBe(true);
    // Rule of 40 is meaningless without a revenue base.
    expect(projection.kpis.ruleOf40).toBeNull();
  });

  it("survives 2,000 randomised plans with finite numbers", () => {
    for (let seed = 1; seed <= 2000; seed += 1) {
      const inputs = randomInputs(seed);
      for (const scenarioId of SCENARIO_ORDER) {
        const projection = buildProjection(inputs, scenarioId);
        expect(projection.months).toHaveLength(inputs.horizonMonths);
        for (const month of projection.months) {
          for (const key of [
            "revenue",
            "cogs",
            "grossProfit",
            "people",
            "marketing",
            "software",
            "office",
            "other",
            "opex",
            "ebitda",
            "cash",
            "customers",
            "collected",
            "receivables",
            "tax",
            "cashBurn",
          ]) {
            if (!Number.isFinite(month[key])) {
              throw new Error(`seed ${seed} (${scenarioId}) produced ${key}=${month[key]}`);
            }
          }
          expect(month.customers).toBeGreaterThanOrEqual(0);
          expect(month.revenue).toBeGreaterThanOrEqual(0);
        }
        expect(buildInsights(projection).length).toBeGreaterThan(0);
      }
    }
  });

  it("reports a funding gap when the plan goes negative", () => {
    const projection = buildProjection(
      base({
        startingCash: 0,
        startingCustomers: 0,
        newCustomersPerMonth: 0,
        startingMrr: 0,
        headcount: 4,
        fundingEvents: [],
      })
    );
    expect(projection.kpis.minCash).toBeLessThan(0);
    expect(projection.kpis.fundingGap).toBeGreaterThan(0);
    const insights = buildInsights(projection);
    expect(insights.some((insight) => insight.id === "funding-gap")).toBe(true);
    expect(insights.some((insight) => insight.severity === "critical")).toBe(true);
  });
});

describe("input normalisation", () => {
  it("falls back to defaults for garbage", () => {
    const normalized = normalizeInputs(null);
    expect(normalized.companyName).toBe(DEFAULT_INPUTS.companyName);
    expect(normalized.currency).toBe("USD");
    expect(normalized.horizonMonths).toBe(60);

    const weird = normalizeInputs({
      companyName: "   ",
      currency: "XYZ",
      horizonMonths: 999,
      revenueModel: "nonsense",
      scenario: "apocalypse",
      churnMonthly: "abc",
      headcount: -40,
      cogsRate: 5,
    });
    expect(weird.companyName).toBe(DEFAULT_INPUTS.companyName);
    expect(weird.currency).toBe("USD");
    expect(weird.horizonMonths).toBe(60);
    expect(weird.revenueModel).toBe(DEFAULT_INPUTS.revenueModel);
    expect(weird.scenario).toBe("base");
    expect(weird.churnMonthly).toBe(DEFAULT_INPUTS.churnMonthly);
    expect(weird.headcount).toBe(0);
    expect(weird.cogsRate).toBe(0.9);
  });

  it("clamps funding events into the horizon", () => {
    const events = sanitizeFundingEvents(
      [
        { id: "a", label: "Seed", amount: 1e12, month: -5 },
        { id: "b", label: "A", amount: "lots", month: 999 },
        { id: "c", label: "B", amount: 1000, month: 3 },
      ],
      24
    );
    expect(events).toHaveLength(3);
    expect(events[0].amount).toBeLessThanOrEqual(50_000_000);
    expect(events[0].month).toBe(0);
    expect(events[1].month).toBe(23);
    expect(events[1].amount).toBe(0);
  });

  it("limits the number of funding rounds", () => {
    const events = sanitizeFundingEvents(
      Array.from({ length: 20 }, (_, index) => ({ id: `${index}`, label: `R${index}`, amount: 1000, month: 1 })),
      60
    );
    expect(events).toHaveLength(8);
  });

  it("normalises every preset to a working model", () => {
    for (const preset of PRESETS) {
      const inputs = applyPreset(DEFAULT_INPUTS, preset.id);
      const projection = buildProjection(inputs);
      expect(projection.months).toHaveLength(inputs.horizonMonths);
      expect(Number.isFinite(projection.kpis.cashEnd)).toBe(true);
      expect(projection.kpis.trailingRevenue).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("outputs", () => {
  it("exports one CSV row per month plus a header", () => {
    const projection = buildProjection(base());
    const csv = projectionToCsv(projection);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(projection.months.length + 1);
    expect(lines[0]).toContain("Month,Revenue,MRR");
    expect(csv).not.toContain("NaN");
    expect(csv).not.toContain("undefined");
  });

  it("computes rule of 40 for a plan with revenue", () => {
    const projection = buildProjection(base());
    expect(Number.isFinite(projection.kpis.ruleOf40)).toBe(true);
    expect(projection.kpis.ruleOf40).toBeGreaterThan(-2);
  });

  it("caps the burn multiple insight at 99+", () => {
    const projection = buildProjection(
      base({ startingCustomers: 1, newCustomersPerMonth: 0, startingCash: 5_000_000, marketingMonthly: 200000 })
    );
    const insight = buildInsights(projection).find((item) => item.id === "burn-multiple");
    if (insight) expect(insight.title).not.toMatch(/is \d{3,}/);
  });

  it("grades benchmarks", () => {
    expect(benchmarkStatus("grossMargin", 0.82)).toBe("good");
    expect(benchmarkStatus("grossMargin", 0.65)).toBe("warn");
    expect(benchmarkStatus("grossMargin", 0.3)).toBe("bad");
    expect(benchmarkStatus("churnMonthly", 0.01)).toBe("good");
    expect(benchmarkStatus("churnMonthly", 0.03)).toBe("warn");
    expect(benchmarkStatus("churnMonthly", 0.09)).toBe("bad");
    expect(benchmarkStatus("ltvCac", null)).toBe("neutral");
    expect(benchmarkStatus("unknown", 5)).toBe("neutral");
  });
});
