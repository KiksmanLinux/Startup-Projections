import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, percent } from "../lib/format.js";
import { SCENARIOS, SCENARIO_ORDER } from "../lib/finance.js";

const PALETTES = {
  dark: {
    grid: "rgba(255,255,255,0.07)",
    axis: "#8b98ab",
    mint: "#3ddc97",
    blue: "#5aa9ff",
    amber: "#ffc266",
    red: "#ff7b7b",
    violet: "#b48bff",
    slate: "#6b7a90",
    text: "#e6edf6",
    tipBg: "#131c29",
    tipBorder: "rgba(255,255,255,0.12)",
  },
  light: {
    grid: "rgba(15,23,42,0.08)",
    axis: "#5b6b80",
    mint: "#0e9f6e",
    blue: "#2563eb",
    amber: "#b45309",
    red: "#dc2626",
    violet: "#7c3aed",
    slate: "#64748b",
    text: "#0f172a",
    tipBg: "#ffffff",
    tipBorder: "rgba(15,23,42,0.12)",
  },
};

export const paletteFor = (theme) => PALETTES[theme] || PALETTES.dark;

function ChartTooltip({ active, payload, label, currency, palette }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="chart-tip"
      style={{ background: palette.tipBg, borderColor: palette.tipBorder, color: palette.text }}
    >
      <div className="chart-tip__label">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="chart-tip__row">
          <span className="chart-tip__dot" style={{ background: entry.color || entry.fill }} />
          <span>{entry.name}</span>
          <strong>{money(entry.value, currency, { compact: true })}</strong>
        </div>
      ))}
    </div>
  );
}

function axisProps(palette, currency, { count = false } = {}) {
  return {
    tick: { fill: palette.axis, fontSize: 11 },
    axisLine: false,
    tickLine: false,
    tickFormatter: count ? (value) => money(value, currency, { compact: true }) : (value) => money(value, currency, { compact: true }),
  };
}

export function ChartCard({ title, subtitle, aside, children, height = 280 }) {
  return (
    <section className="card chart-card">
      <header className="chart-card__head">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
        </div>
        {aside && <div className="chart-card__aside">{aside}</div>}
      </header>
      <div style={{ height }} className="chart-card__body">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function OverviewChart({ projection, currency, theme }) {
  const palette = paletteFor(theme);
  const data = projection.months.map((month) => ({
    label: month.label,
    Revenue: month.revenue,
    "Total costs": month.cogs + month.opex,
    EBITDA: month.ebitda,
  }));

  return (
    <ChartCard
      title="Revenue, costs and profit"
      subtitle="Monthly. The gap between revenue and total costs is your EBITDA."
      height={300}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.mint} stopOpacity={0.35} />
            <stop offset="100%" stopColor={palette.mint} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" tick={{ fill: palette.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis {...axisProps(palette, currency)} width={60} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <Legend wrapperStyle={{ fontSize: 12, color: palette.axis }} />
        <ReferenceLine y={0} stroke={palette.grid} />
        <Area type="monotone" dataKey="Revenue" stroke={palette.mint} strokeWidth={2.4} fill="url(#revenueFill)" />
        <Line type="monotone" dataKey="Total costs" stroke={palette.red} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="EBITDA" stroke={palette.violet} strokeWidth={2} dot={false} strokeDasharray="5 3" />
      </ComposedChart>
    </ChartCard>
  );
}

export function CashChart({ projection, currency, theme }) {
  const palette = paletteFor(theme);
  const data = projection.months.map((month) => ({
    label: month.label,
    Cash: month.cash,
    Funding: month.funding,
  }));
  const fundingRounds = projection.months.filter((month) => month.funding > 0);

  return (
    <ChartCard
      title="Cash balance"
      subtitle="Cash on hand each month, including funding. Below zero means insolvent."
      height={320}
    >
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.blue} stopOpacity={0.4} />
            <stop offset="100%" stopColor={palette.blue} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" tick={{ fill: palette.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis {...axisProps(palette, currency)} width={60} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <ReferenceLine y={0} stroke={palette.red} strokeDasharray="4 4" />
        {fundingRounds.map((month) => (
          <ReferenceLine
            key={month.index}
            x={month.label}
            stroke={palette.amber}
            strokeDasharray="2 4"
            label={{ value: "funding", fill: palette.amber, fontSize: 10, position: "insideTopRight" }}
          />
        ))}
        <Area type="monotone" dataKey="Cash" stroke={palette.blue} strokeWidth={2.6} fill="url(#cashFill)" />
      </AreaChart>
    </ChartCard>
  );
}

export function RevenueChart({ projection, currency, theme }) {
  const palette = paletteFor(theme);
  const data = projection.months.map((month) => ({
    label: month.label,
    Revenue: month.revenue,
    Customers: Math.round(month.customers),
  }));

  return (
    <ChartCard
      title="Revenue and customers"
      subtitle="Recurring revenue per month with the paying customer base behind it."
      height={300}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" tick={{ fill: palette.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="money" {...axisProps(palette, currency)} width={60} />
        <YAxis
          yAxisId="customers"
          orientation="right"
          tick={{ fill: palette.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <Legend wrapperStyle={{ fontSize: 12, color: palette.axis }} />
        <Bar yAxisId="customers" dataKey="Customers" fill={palette.slate} opacity={0.5} radius={[3, 3, 0, 0]} />
        <Line yAxisId="money" type="monotone" dataKey="Revenue" stroke={palette.mint} strokeWidth={2.6} dot={false} />
      </ComposedChart>
    </ChartCard>
  );
}

export function CostChart({ projection, currency, theme, yearly = true }) {
  const palette = paletteFor(theme);
  const source = yearly
    ? projection.years.map((year) => ({
        label: year.label,
        Payroll: year.people,
        Marketing: year.marketing,
        Software: year.software,
        Office: year.office,
        Other: year.other,
      }))
    : projection.months.map((month) => ({
        label: month.label,
        Payroll: month.people,
        Marketing: month.marketing,
        Software: month.software,
        Office: month.office,
        Other: month.other,
      }));

  const colors = {
    Payroll: palette.violet,
    Marketing: palette.amber,
    Software: palette.blue,
    Office: palette.mint,
    Other: palette.slate,
  };

  return (
    <ChartCard
      title="Where the money goes"
      subtitle={yearly ? "Operating costs per year, stacked by category." : "Operating costs per month."}
      height={320}
    >
      <BarChart data={source} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: palette.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis {...axisProps(palette, currency)} width={60} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <Legend wrapperStyle={{ fontSize: 12, color: palette.axis }} />
        {Object.keys(colors).map((key) => (
          <Bar key={key} dataKey={key} stackId="cost" fill={colors[key]} radius={key === "Other" ? [4, 4, 0, 0] : 0} />
        ))}
      </BarChart>
    </ChartCard>
  );
}

export function BurnChart({ projection, currency, theme }) {
  const palette = paletteFor(theme);
  const data = projection.months.map((month) => ({
    label: month.label,
    "Net burn": Math.round(month.netBurn),
  }));

  return (
    <ChartCard
      title="Net burn"
      subtitle="Cash consumed per month. Negative bars are months where operations generated cash."
      height={240}
    >
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" tick={{ fill: palette.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis {...axisProps(palette, currency)} width={60} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <ReferenceLine y={0} stroke={palette.grid} />
        <Bar dataKey="Net burn" fill={palette.red} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function ScenarioChart({ scenarios, currency, theme }) {
  const palette = paletteFor(theme);
  const base = scenarios.find((item) => item.scenario.id === "base") || scenarios[0];
  const data = base.months.map((month, index) => {
    const row = { label: month.label };
    for (const item of scenarios) {
      row[SCENARIOS[item.scenario.id]?.label || item.scenario.id] = item.months[index]?.cash ?? 0;
    }
    return row;
  });

  const colors = {
    Upside: palette.mint,
    Base: palette.blue,
    Downside: palette.amber,
    Stress: palette.red,
  };

  return (
    <ChartCard
      title="Cash across scenarios"
      subtitle="Same plan, four different worlds. The line that hits zero first is your risk case."
      height={320}
    >
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" tick={{ fill: palette.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis {...axisProps(palette, currency)} width={60} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <Legend wrapperStyle={{ fontSize: 12, color: palette.axis }} />
        <ReferenceLine y={0} stroke={palette.red} strokeDasharray="4 4" />
        {SCENARIO_ORDER.map((id) => (
          <Line
            key={id}
            type="monotone"
            dataKey={SCENARIOS[id].label}
            stroke={colors[SCENARIOS[id].label]}
            strokeWidth={id === "base" ? 2.8 : 1.8}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartCard>
  );
}

export function MarginChart({ projection, theme, currency }) {
  const palette = paletteFor(theme);
  const data = projection.years.map((year) => ({
    label: year.label,
    "Gross margin": Number((year.grossMargin * 100).toFixed(1)),
    "EBITDA margin": Number((year.ebitdaMargin * 100).toFixed(1)),
  }));

  return (
    <ChartCard
      title="Margins over time"
      subtitle="Percentage of revenue kept after delivery costs, and after all operating costs."
      height={240}
      aside={<span className="legend-note">%</span>}
    >
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: palette.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: palette.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={(value) => `${value}%`} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="chart-tip" style={{ background: palette.tipBg, borderColor: palette.tipBorder, color: palette.text }}>
                <div className="chart-tip__label">{label}</div>
                {payload.map((entry) => (
                  <div key={entry.dataKey} className="chart-tip__row">
                    <span className="chart-tip__dot" style={{ background: entry.color }} />
                    <span>{entry.name}</span>
                    <strong>{percent(entry.value / 100)}</strong>
                  </div>
                ))}
              </div>
            ) : null
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, color: palette.axis }} />
        <ReferenceLine y={0} stroke={palette.grid} />
        <Line type="monotone" dataKey="Gross margin" stroke={palette.mint} strokeWidth={2.4} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="EBITDA margin" stroke={palette.violet} strokeWidth={2.2} dot={{ r: 3 }} />
      </LineChart>
    </ChartCard>
  );
}
