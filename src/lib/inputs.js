import { SCENARIO_ORDER } from "./finance.js";

export const HORIZONS = [24, 36, 48, 60];

export const REVENUE_MODELS = [
  { id: "customers", label: "Customers", hint: "Acquisition and churn drive revenue" },
  { id: "growth", label: "Growth rate", hint: "Compound one monthly growth rate" },
];

/**
 * Every numeric input lives here: the sidebar renders from this table, and
 * normalizeInputs clamps to the same bounds, so stored/shared state can never
 * push the model outside what the UI can express.
 */
export const FIELD_GROUPS = [
  {
    id: "revenue",
    title: "Revenue engine",
    accent: "mint",
    fields: [
      {
        key: "startingMrr",
        models: ["growth"],
        label: "Starting MRR",
        unit: "money",
        min: 0,
        max: 500000,
        step: 500,
        help: "Recurring revenue in month 1.",
      },
      {
        key: "monthlyGrowth",
        models: ["growth"],
        label: "Monthly growth",
        unit: "percent",
        min: 0,
        max: 0.3,
        step: 0.005,
        help: "Compounding MRR growth per month. 6%/mo is roughly 100% a year.",
      },
      {
        key: "growthDecayPerYear",
        models: ["growth"],
        label: "Growth decay per year",
        unit: "percent",
        min: 0,
        max: 0.6,
        step: 0.01,
        help: "How much the monthly growth rate shrinks each year — keeps later years believable.",
      },
      {
        key: "startingCustomers",
        models: ["customers"],
        label: "Starting customers",
        unit: "count",
        min: 0,
        max: 5000,
        step: 5,
        help: "Paying customers in month 1.",
      },
      {
        key: "newCustomersPerMonth",
        models: ["customers"],
        label: "New customers / month",
        unit: "count",
        min: 0,
        max: 1000,
        step: 1,
        help: "Gross new customers won each month, before churn.",
      },
      {
        key: "churnMonthly",
        models: ["customers"],
        label: "Monthly churn",
        unit: "percent",
        min: 0,
        max: 0.2,
        step: 0.001,
        help: "Share of customers lost each month. ~2.5% is typical for SMB SaaS, under 1.5% is top quartile.",
      },
      {
        key: "arpu",
        models: ["customers", "growth"],
        label: "ARPU",
        unit: "money",
        min: 0,
        max: 5000,
        step: 10,
        help: "Average monthly revenue per customer.",
      },
      {
        key: "priceGrowthPerYear",
        models: ["customers", "growth"],
        label: "Price increase per year",
        unit: "percent",
        min: -0.2,
        max: 0.3,
        step: 0.005,
        help: "Annual price uplift applied to ARPU.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Cost of delivery",
    accent: "blue",
    fields: [
      {
        key: "cogsRate",
        models: ["customers", "growth"],
        label: "COGS share of revenue",
        unit: "percent",
        min: 0,
        max: 0.9,
        step: 0.01,
        help: "Hosting, delivery, payment fees, support. Software benchmarks sit near 20% (80% gross margin).",
      },
    ],
  },
  {
    id: "team",
    title: "Team & payroll",
    accent: "violet",
    fields: [
      {
        key: "headcount",
        models: ["customers", "growth"],
        label: "Headcount in month 1",
        unit: "count",
        min: 0,
        max: 200,
        step: 1,
        help: "Full-time people, including founders.",
      },
      {
        key: "hiresPerYear",
        models: ["customers", "growth"],
        label: "Hires per year",
        unit: "count",
        min: 0,
        max: 50,
        step: 1,
        help: "Net new people added at the start of each year.",
      },
      {
        key: "avgAnnualSalary",
        models: ["customers", "growth"],
        label: "Average annual salary",
        unit: "money",
        min: 0,
        max: 400000,
        step: 5000,
        help: "Gross salary per person per year, before employer cost.",
      },
      {
        key: "salaryGrowthPerYear",
        models: ["customers", "growth"],
        label: "Salary growth per year",
        unit: "percent",
        min: 0,
        max: 0.3,
        step: 0.005,
        help: "Annual raise plus promotion drift.",
      },
      {
        key: "employerCostRate",
        models: ["customers", "growth"],
        label: "Employer cost on top",
        unit: "percent",
        min: 0,
        max: 0.6,
        step: 0.01,
        help: "Payroll tax, pension, benefits and equipment on top of salary.",
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    accent: "amber",
    fields: [
      {
        key: "marketingMonthly",
        models: ["customers", "growth"],
        label: "Monthly budget",
        unit: "money",
        min: 0,
        max: 500000,
        step: 500,
        help: "Fixed spend on acquisition: ads, content, events, sales tooling.",
      },
      {
        key: "marketingGrowthPerYear",
        models: ["customers", "growth"],
        label: "Budget growth per year",
        unit: "percent",
        min: 0,
        max: 1.5,
        step: 0.05,
        help: "How fast the acquisition budget scales with the business.",
      },
      {
        key: "marketingRateOfRevenue",
        models: ["customers", "growth"],
        label: "Plus share of revenue",
        unit: "percent",
        min: 0,
        max: 0.5,
        step: 0.01,
        help: "Variable spend that scales with revenue — set 0 for a purely fixed budget.",
      },
    ],
  },
  {
    id: "overhead",
    title: "Tools, office & other",
    accent: "slate",
    fields: [
      {
        key: "softwareMonthly",
        models: ["customers", "growth"],
        label: "Software & tools",
        unit: "money",
        min: 0,
        max: 100000,
        step: 100,
        help: "SaaS subscriptions, infrastructure tooling, accounting systems.",
      },
      {
        key: "softwareGrowthPerYear",
        models: ["customers", "growth"],
        label: "Tools growth per year",
        unit: "percent",
        min: 0,
        max: 1,
        step: 0.01,
        help: "Usually grows with headcount.",
      },
      {
        key: "officeMonthly",
        models: ["customers", "growth"],
        label: "Office & facilities",
        unit: "money",
        min: 0,
        max: 100000,
        step: 100,
        help: "Rent, utilities, insurance.",
      },
      {
        key: "officeGrowthPerYear",
        models: ["customers", "growth"],
        label: "Office growth per year",
        unit: "percent",
        min: 0,
        max: 1,
        step: 0.01,
        help: "Rent indexation or a planned move.",
      },
      {
        key: "otherMonthly",
        models: ["customers", "growth"],
        label: "Other OpEx",
        unit: "money",
        min: 0,
        max: 100000,
        step: 100,
        help: "Legal, travel, recruiting, insurance — anything not listed above.",
      },
      {
        key: "otherGrowthPerYear",
        models: ["customers", "growth"],
        label: "Other growth per year",
        unit: "percent",
        min: 0,
        max: 1,
        step: 0.01,
        help: "Annual escalation for the line above.",
      },
    ],
  },
  {
    id: "tax",
    title: "Tax",
    accent: "slate",
    fields: [
      {
        key: "taxRate",
        models: ["customers", "growth"],
        label: "Corporate tax on profit",
        unit: "percent",
        min: 0,
        max: 0.5,
        step: 0.01,
        help: "Charged on positive EBITDA, with earlier losses carried forward. Norway is 22%. Set 0 for a pre-tax plan.",
      },
    ],
  },
  {
    id: "timing",
    title: "Cash timing",
    accent: "mint",
    fields: [
      {
        key: "collectionLagDays",
        models: ["customers", "growth"],
        label: "Collection lag",
        unit: "days",
        min: 0,
        max: 90,
        step: 5,
        help: "Days between invoicing and cash arriving. 0 = paid up front, 30 = net-30, 60 = enterprise terms.",
      },
      {
        key: "cashFloor",
        models: ["customers", "growth"],
        label: "Cash floor",
        unit: "money",
        min: 0,
        max: 2000000,
        step: 5000,
        help: "The balance you refuse to go below — often three months of payroll. The Cash tab shows runway to this floor.",
      },
    ],
  },
];

export const FUNDING_LIMITS = { maxEvents: 8, maxAmount: 50_000_000, maxLabel: 40, maxPreMoney: 1_000_000_000 };

const findField = (key) => {
  for (const group of FIELD_GROUPS) {
    const field = group.fields.find((f) => f.key === key);
    if (field) return field;
  }
  return null;
};

export const INPUT_FIELDS = FIELD_GROUPS.flatMap((group) => group.fields);

export const DEFAULT_INPUTS = {
  companyName: "Nordlys Labs",
  currency: "USD",
  horizonMonths: 60,
  startDate: "2026-01-01",
  revenueModel: "customers",
  scenario: "base",

  startingMrr: 25000,
  monthlyGrowth: 0.08,
  growthDecayPerYear: 0.25,

  startingCustomers: 45,
  newCustomersPerMonth: 20,
  churnMonthly: 0.03,
  arpu: 450,
  priceGrowthPerYear: 0.02,

  cogsRate: 0.22,

  headcount: 5,
  hiresPerYear: 1,
  avgAnnualSalary: 90000,
  salaryGrowthPerYear: 0.04,
  employerCostRate: 0.18,

  marketingMonthly: 32000,
  marketingGrowthPerYear: 0.12,
  marketingRateOfRevenue: 0,

  softwareMonthly: 1800,
  softwareGrowthPerYear: 0.06,
  officeMonthly: 3500,
  officeGrowthPerYear: 0.03,
  otherMonthly: 2000,
  otherGrowthPerYear: 0.03,

  startingCash: 300000,
  cashFloor: 0,
  collectionLagDays: 0,
  taxRate: 0.22,
  fundingEvents: [{ id: "seed", label: "Seed round", amount: 750000, month: 3, preMoney: 4000000 }],
};

export const PRESETS = [
  {
    id: "saas",
    name: "SaaS subscription",
    description: "Seeded B2B software with ~78% gross margin and 2.5% monthly churn.",
    patch: {},
  },
  {
    id: "agency",
    name: "Productised agency",
    description: "Services business with retainer revenue, thinner margins and heavy payroll.",
    patch: {
      companyName: "Studio Fjord",
      revenueModel: "growth",
      startingMrr: 60000,
      monthlyGrowth: 0.05,
      growthDecayPerYear: 0.3,
      cogsRate: 0.45,
      headcount: 6,
      hiresPerYear: 2,
      avgAnnualSalary: 82000,
      employerCostRate: 0.2,
      marketingMonthly: 6000,
      marketingGrowthPerYear: 0.1,
      startingCash: 150000,
      collectionLagDays: 30,
      fundingEvents: [],
    },
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Online store: lower margin, big marketing budget, inventory-heavy growth.",
    patch: {
      companyName: "Fjell & Form",
      revenueModel: "growth",
      startingMrr: 70000,
      monthlyGrowth: 0.06,
      growthDecayPerYear: 0.35,
      cogsRate: 0.55,
      headcount: 4,
      hiresPerYear: 2,
      avgAnnualSalary: 62000,
      employerCostRate: 0.18,
      marketingMonthly: 22000,
      marketingGrowthPerYear: 0.3,
      marketingRateOfRevenue: 0.06,
      softwareMonthly: 3200,
      officeMonthly: 4000,
      startingCash: 180000,
      collectionLagDays: 7,
      fundingEvents: [{ id: "angel", label: "Angel round", amount: 300000, month: 4, preMoney: 1500000 }],
    },
  },
  {
    id: "preseed",
    name: "Pre-revenue",
    description: "Pre-seed team burning cash before first revenue — watch the runway.",
    patch: {
      companyName: "Nordlys Labs",
      revenueModel: "customers",
      startingCustomers: 0,
      newCustomersPerMonth: 2,
      churnMonthly: 0.02,
      arpu: 350,
      cogsRate: 0.25,
      headcount: 3,
      hiresPerYear: 2,
      avgAnnualSalary: 92000,
      marketingMonthly: 4000,
      marketingGrowthPerYear: 0.2,
      startingCash: 400000,
      fundingEvents: [],
    },
  },
];

export function applyPreset(current, presetId) {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return normalizeInputs(current);
  return normalizeInputs({ ...DEFAULT_INPUTS, ...preset.patch });
}

export function presetIdFor(inputs) {
  const keys = Object.keys(DEFAULT_INPUTS);
  const match = PRESETS.find((preset) =>
    keys.every((key) => {
      if (key === "companyName" || key === "scenario") return true;
      const a = inputs[key];
      const b = (preset.patch[key] ?? DEFAULT_INPUTS[key]);
      if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length;
      return a === b;
    })
  );
  return match ? match.id : "custom";
}

const str = (value, fallback, maxLength = 60) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length ? trimmed : fallback;
};

const number = (value, fallback, field) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(field.max, Math.max(field.min, n));
};

export function sanitizeFundingEvents(events, horizonMonths) {
  if (!Array.isArray(events)) return [];
  return events
    .slice(0, FUNDING_LIMITS.maxEvents)
    .map((event, index) => {
      const amount = Number(event?.amount);
      const month = Number(event?.month);
      return {
        id: str(event?.id, `round-${index + 1}`, 40),
        label: str(event?.label, `Round ${index + 1}`, FUNDING_LIMITS.maxLabel),
        amount: Number.isFinite(amount)
          ? Math.min(FUNDING_LIMITS.maxAmount, Math.max(0, Math.round(amount)))
          : 0,
        month: Number.isFinite(month)
          ? Math.min(Math.max(1, horizonMonths) - 1, Math.max(0, Math.round(month)))
          : 0,
        preMoney: Number.isFinite(Number(event?.preMoney))
          ? Math.min(FUNDING_LIMITS.maxPreMoney, Math.max(0, Math.round(Number(event.preMoney))))
          : 0,
      };
    });
}

/**
 * Merge anything (stored state, a shared link, a preset patch) with the
 * defaults and clamp every value into the range the UI exposes.
 */
export function normalizeInputs(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const horizonMonths = HORIZONS.includes(Number(source.horizonMonths))
    ? Number(source.horizonMonths)
    : DEFAULT_INPUTS.horizonMonths;

  const out = {
    ...DEFAULT_INPUTS,
    companyName: str(source.companyName, DEFAULT_INPUTS.companyName),
    currency: typeof source.currency === "string" ? source.currency.toUpperCase() : DEFAULT_INPUTS.currency,
    horizonMonths,
    startDate: typeof source.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.startDate)
      ? source.startDate
      : DEFAULT_INPUTS.startDate,
    revenueModel: REVENUE_MODELS.some((m) => m.id === source.revenueModel)
      ? source.revenueModel
      : DEFAULT_INPUTS.revenueModel,
    scenario: SCENARIO_ORDER.includes(source.scenario) ? source.scenario : "base",
  };

  if (!["USD", "EUR", "GBP", "NOK", "SEK", "DKK"].includes(out.currency)) out.currency = "USD";

  for (const field of INPUT_FIELDS) {
    out[field.key] = number(source[field.key], DEFAULT_INPUTS[field.key], field);
  }

  out.startingCash = number(source.startingCash, DEFAULT_INPUTS.startingCash, {
    min: 0,
    max: 20_000_000,
  });

  out.fundingEvents = sanitizeFundingEvents(source.fundingEvents, horizonMonths);
  return out;
}

export function fieldsForModel(group, revenueModel) {
  return group.fields.filter((f) => f.models.includes(revenueModel));
}

export function fieldDef(key) {
  return findField(key);
}
