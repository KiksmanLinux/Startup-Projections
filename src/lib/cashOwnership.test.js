import { describe, expect, it } from "vitest";
import { buildProjection } from "./finance.js";
import { DEFAULT_INPUTS, normalizeInputs } from "./inputs.js";
import { buildCapTable, buildAssumptionLedger } from "./analysis.js";

const base = (patch = {}) => normalizeInputs({ ...DEFAULT_INPUTS, ...patch });

describe("cash timing", () => {
  it("collects nothing in month one under a 30-day lag", () => {
    const projection = buildProjection(base({ collectionLagDays: 30 }));
    expect(projection.months[0].collected).toBeCloseTo(0, 6);
    expect(projection.months[1].collected).toBeCloseTo(projection.months[0].revenue, 6);
    expect(projection.kpis.receivables).toBeCloseTo(
      projection.months[projection.months.length - 1].revenue,
      4
    );
  });

  it("keeps revenue unchanged but pushes cash later", () => {
    const immediate = buildProjection(base({ collectionLagDays: 0 }));
    const lagged = buildProjection(base({ collectionLagDays: 30 }));
    expect(lagged.kpis.trailingRevenue).toBeCloseTo(immediate.kpis.trailingRevenue, 6);
    expect(lagged.kpis.receivables).toBeGreaterThan(0);
    expect(lagged.kpis.cashEnd).toBeLessThan(immediate.kpis.cashEnd);
  });

  it("spreads a 60-day lag over two months", () => {
    const projection = buildProjection(base({ collectionLagDays: 60 }));
    expect(projection.months[0].collected).toBe(0);
    expect(projection.months[1].collected).toBe(0);
    expect(projection.months[2].collected).toBeCloseTo(projection.months[0].revenue, 6);
  });

  it("keeps the cash identity with lag, tax and funding", () => {
    const projection = buildProjection(base({ collectionLagDays: 45, taxRate: 0.22 }));
    let running = projection.inputs.startingCash;
    for (const month of projection.months) {
      running += month.collected - month.cogs - month.opex - month.tax + month.funding;
      expect(month.cash).toBeCloseTo(running, 6);
      expect(month.receivables).toBeGreaterThanOrEqual(-1e-6);
    }
  });
});

describe("corporate tax", () => {
  it("taxes cumulative profit, never more than the positive EBITDA base", () => {
    const projection = buildProjection(base({ taxRate: 0.22 }));
    const positiveBase = projection.months.reduce((total, month) => total + Math.max(0, month.ebitda), 0);
    expect(projection.kpis.taxPaid).toBeGreaterThan(0);
    expect(projection.kpis.taxPaid).toBeLessThanOrEqual(positiveBase * 0.22 + 1e-6);
    for (const month of projection.months) expect(month.tax).toBeGreaterThanOrEqual(0);
  });

  it("carries early losses forward instead of taxing later profit in full", () => {
    const projection = buildProjection(base({ taxRate: 0.22 }));
    const firstProfitable = projection.months.find((month) => month.ebitda > 0);
    // Losses from the months before the first profit must absorb some of it.
    expect(firstProfitable.taxableProfit).toBeLessThan(firstProfitable.ebitda + 1e-6);
  });

  it("pays no tax when every month loses money", () => {
    const projection = buildProjection(
      base({
        startingCustomers: 0,
        newCustomersPerMonth: 0,
        startingMrr: 0,
        headcount: 2,
        startingCash: 1000000,
        fundingEvents: [],
      })
    );
    expect(projection.kpis.taxPaid).toBe(0);
  });

  it("is a no-op at a zero tax rate", () => {
    const taxed = buildProjection(base({ taxRate: 0.22 }));
    const untaxed = buildProjection(base({ taxRate: 0 }));
    expect(untaxed.kpis.taxPaid).toBe(0);
    expect(untaxed.kpis.cashEnd).toBeGreaterThan(taxed.kpis.cashEnd);
  });
});

describe("cash floor", () => {
  it("reaches the floor before zero", () => {
    const projection = buildProjection(base({ cashFloor: 150000 }));
    expect(projection.kpis.runwayToFloorMonths).not.toBeNull();
    const zero = projection.kpis.runwayMonths ?? projection.horizonMonths;
    expect(projection.kpis.runwayToFloorMonths).toBeLessThanOrEqual(zero);
  });

  it("stays quiet when no floor is set", () => {
    const projection = buildProjection(base({ cashFloor: 0 }));
    expect(projection.kpis.runwayToFloorMonths).toBeNull();
  });
});

describe("cap table", () => {
  it("dilutes the founder by round", () => {
    const table = buildCapTable(
      base({
        fundingEvents: [
          { id: "seed", label: "Seed", amount: 750000, month: 3, preMoney: 4000000 },
          { id: "a", label: "Series A", amount: 3000000, month: 18, preMoney: 12000000 },
        ],
      })
    );

    expect(table.rows[0].investorPct).toBeCloseTo(750000 / 4750000, 8);
    const afterSeed = 1 - 750000 / 4750000;
    const afterA = afterSeed * (1 - 3000000 / 15000000);
    expect(table.founderFinal).toBeCloseTo(afterA, 8);
    expect(table.totalDilution).toBeCloseTo(1 - afterA, 8);
    expect(table.totalRaised).toBe(3750000);
    expect(table.pricedRounds).toBe(2);
  });

  it("leaves unpriced rounds out of the dilution", () => {
    const table = buildCapTable(
      base({ fundingEvents: [{ id: "safe", label: "SAFE", amount: 250000, month: 2 }] })
    );
    expect(table.hasPriced).toBe(false);
    expect(table.founderFinal).toBe(1);
    expect(table.unpricedRounds).toBe(1);
  });

  it("appears in the assumption ledger", () => {
    const ledger = buildAssumptionLedger(
      base({
        fundingEvents: [{ id: "seed", label: "Seed", amount: 750000, month: 3, preMoney: 4000000 }],
      })
    );
    const ownership = ledger.find((group) => group.id === "ownership");
    expect(ownership).toBeTruthy();
    expect(ownership.items.some((item) => item.label.includes("Founder ownership"))).toBe(true);
  });
});
