import { describe, expect, it } from "vitest";
import {
  SENSITIVITY_STEPS,
  applySensitivity,
  buildAssumptionLedger,
  buildMilestones,
  buildSensitivity,
  comparePlans,
  formatCompareValue,
  sensitivityAxes,
} from "./analysis.js";
import { buildProjection } from "./finance.js";
import { DEFAULT_INPUTS, normalizeInputs } from "./inputs.js";

const base = (patch = {}) => normalizeInputs({ ...DEFAULT_INPUTS, ...patch });

describe("sensitivity matrix", () => {
  it("builds a 5×5 grid with the baseline in the middle", () => {
    const inputs = base();
    const grid = buildSensitivity(inputs, "runway");
    expect(grid.rows).toHaveLength(SENSITIVITY_STEPS.length);
    for (const row of grid.rows) expect(row.cells).toHaveLength(SENSITIVITY_STEPS.length);
    expect(grid.baseline.isBaseline).toBe(true);
    expect(grid.baseline.value).toBe(
      buildProjection(inputs).kpis.runwayMonths ?? inputs.horizonMonths
    );
  });

  it("keeps every cell finite in both revenue models", () => {
    for (const revenueModel of ["customers", "growth"]) {
      for (const metric of ["runway", "cashEnd", "minCash", "exitArr"]) {
        const grid = buildSensitivity(base({ revenueModel }), metric);
        for (const row of grid.rows) {
          for (const cell of row.cells) {
            if (!Number.isFinite(cell.value)) {
              throw new Error(`${revenueModel}/${metric} produced ${cell.value}`);
            }
            expect(cell.value).not.toBeNaN();
          }
        }
      }
    }
  });

  it("never improves when acquisition shrinks or churn grows", () => {
    const inputs = base({ revenueModel: "customers" });
    const grid = buildSensitivity(inputs, "cashEnd");
    // More acquisition per month (left → right) can only help or tie.
    for (const row of grid.rows) {
      for (let i = 1; i < row.cells.length; i += 1) {
        expect(row.cells[i].value).toBeGreaterThanOrEqual(row.cells[i - 1].value - 1e-6);
      }
    }
    // More churn (top → bottom) can only hurt or tie.
    for (let column = 0; column < grid.rows[0].cells.length; column += 1) {
      for (let r = 1; r < grid.rows.length; r += 1) {
        expect(grid.rows[r].cells[column].value).toBeLessThanOrEqual(
          grid.rows[r - 1].cells[column].value + 1e-6
        );
      }
    }
  });

  it("describes the axes for each revenue model", () => {
    expect(sensitivityAxes(base({ revenueModel: "customers" })).columnLabel).toMatch(/customers/i);
    expect(sensitivityAxes(base({ revenueModel: "growth" })).rowLabel).toMatch(/fade/i);
  });

  it("applies factors without mutating the source inputs", () => {
    const inputs = base();
    const patched = applySensitivity(inputs, 1.2, 1.4);
    expect(inputs.newCustomersPerMonth).toBe(DEFAULT_INPUTS.newCustomersPerMonth);
    expect(patched.newCustomersPerMonth).toBeCloseTo(DEFAULT_INPUTS.newCustomersPerMonth * 1.2, 6);
    expect(patched.churnMonthly).toBeCloseTo(DEFAULT_INPUTS.churnMonthly * 1.4, 6);
  });
});

describe("milestones", () => {
  it("returns calendar-ordered events", () => {
    const projection = buildProjection(base());
    const milestones = buildMilestones(projection);
    expect(milestones.length).toBeGreaterThan(2);
    for (let i = 1; i < milestones.length; i += 1) {
      expect(milestones[i].monthIndex).toBeGreaterThanOrEqual(milestones[i - 1].monthIndex);
    }
    expect(milestones.some((item) => item.id === "funding-seed-3")).toBe(true);
    expect(milestones.some((item) => item.id === "break-even")).toBe(true);
    expect(milestones.some((item) => item.id === "lowest-cash")).toBe(true);
  });

  it("works for a plan that never earns anything", () => {
    const projection = buildProjection(
      base({ startingMrr: 0, startingCustomers: 0, newCustomersPerMonth: 0, fundingEvents: [] })
    );
    const milestones = buildMilestones(projection);
    expect(milestones.some((item) => item.id === "lowest-cash")).toBe(true);
    expect(milestones.some((item) => item.id === "break-even")).toBe(false);
  });
});

describe("assumption ledger", () => {
  it("lists every field that applies to the active revenue model", () => {
    for (const revenueModel of ["customers", "growth"]) {
      const inputs = base({ revenueModel });
      const ledger = buildAssumptionLedger(inputs);
      const labels = ledger.flatMap((group) => group.items.map((item) => item.label));
      expect(labels).toContain(revenueModel === "customers" ? "Monthly churn" : "Monthly growth");
      expect(labels).toContain("Starting cash");
      expect(labels).toContain("Horizon");
      const values = ledger.flatMap((group) => group.items.map((item) => item.value));
      expect(values.every((value) => typeof value === "string" && value.length > 0)).toBe(true);
      expect(values.some((value) => value.includes("NaN"))).toBe(false);
    }
  });

  it("notes when no funding is planned", () => {
    const ledger = buildAssumptionLedger(base({ fundingEvents: [] }));
    const cash = ledger.find((group) => group.id === "cash");
    expect(cash.items.some((item) => item.value === "None planned")).toBe(true);
  });
});

describe("plan comparison", () => {
  it("compares two plans and formats every row", () => {
    const planA = { id: "a", name: "A", inputs: base() };
    const planB = { id: "b", name: "B", inputs: base({ newCustomersPerMonth: 40, churnMonthly: 0.01 }) };
    const { rows } = comparePlans(planA, planB);
    expect(rows.length).toBeGreaterThan(5);
    for (const row of rows) {
      expect(Number.isFinite(row.a)).toBe(true);
      expect(Number.isFinite(row.b)).toBe(true);
      expect(formatCompareValue(row, row.a, "USD").length).toBeGreaterThan(0);
    }
    const arr = rows.find((row) => row.id === "arr");
    expect(arr.b).toBeGreaterThan(arr.a);
  });
});
