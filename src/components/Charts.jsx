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
    grid: "rgba(255,255,255,0.055)",
    axis: "#868d94",
    mint: "#7dab97",
    blue: "#85a7c6",
    amber: "#cba463",
    red: "#c4827a",
    violet: "#a49bc4",
    slate: "#78818b",
    text: "#e9e7e2",
    tipBg: "#171c21",
    tipBorder: "#313a43",
  },
  light: {
    grid: "rgba(22,25,23,0.07)",
    axis: "#6c7269",
    mint: "#2f6b5a",
    blue: "#2f5c86",
    amber: "#8a6320",
    red: "#a4483c",
    violet: "#5b4f86",
    slate: "#6c7269",
    text: "#161917",
    tipBg: "#fffdf7",
    tipBorder: "#cec6b3",
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

const axis = (palette) => ({
  tick: { fill: palette.axis, fontSize: 11 },
  axisLine: false,
  tickLine: false,
  tickMargin: 6,
});

const moneyAxis = (palette, currency) => ({
  ...axis(palette),
  width: 62,
  tickFormatter: (value) => money(value, currency, { compact: true }),
});

const legendStyle = (palette) => ({ fontSize: 11.5, color: palette.axis, paddingTop: 6 });

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
      subtitle="Monthly. The gap between revenue and total costs is EBITDA."
      height={306}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.mint} stopOpacity={0.16} />
            <stop offset="100%" stopColor={palette.mint} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" {...axis(palette)} />
        <YAxis {...moneyAxis(palette, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <Legend wrapperStyle={legendStyle(palette)} iconType="plainline" />
        <ReferenceLine y={0} stroke={palette.grid} />
        <Area type="monotone" dataKey="Revenue" stroke={palette.mint} strokeWidth={1.8} fill="url(#revenueFill)" />
        <Line type="monotone" dataKey="Total costs" stroke={palette.red} strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="EBITDA" stroke={palette.violet} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
      </ComposedChart>
    </ChartCard>
  );
}

export function CashChart({ projection, currency, theme }) {
  const palette = paletteFor(theme);
  const data = projection.months.map((month) => ({ label: month.label, Cash: month.cash }));
  const fundingRounds = projection.months.filter((month) => month.funding > 0);

  return (
    <ChartCard
      title="Cash balance"
      subtitle="Cash on hand each month, including funding. Below zero means insolvent."
      height={326}
    >
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.blue} stopOpacity={0.18} />
            <stop offset="100%" stopColor={palette.blue} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" {...axis(palette)} />
        <YAxis {...moneyAxis(palette, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <ReferenceLine y={0} stroke={palette.red} strokeDasharray="4 3" />
        {fundingRounds.map((month) => (
          <ReferenceLine
            key={month.index}
            x={month.label}
            stroke={palette.amber}
            strokeDasharray="2 4"
            label={{ value: "funding", fill: palette.amber, fontSize: 10, position: "insideTopRight" }}
          />
        ))}
        <Area type="monotone" dataKey="Cash" stroke={palette.blue} strokeWidth={1.9} fill="url(#cashFill)" />
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
      height={306}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" {...axis(palette)} />
        <YAxis yAxisId="money" {...moneyAxis(palette, currency)} />
        <YAxis
          yAxisId="customers"
          orientation="right"
          tick={{ fill: palette.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickMargin={6}
          width={46}
        />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <Legend wrapperStyle={legendStyle(palette)} iconType="plainline" />
        <Bar yAxisId="customers" dataKey="Customers" fill={palette.slate} opacity={0.35} radius={[2, 2, 0, 0]} />
        <Line yAxisId="money" type="monotone" dataKey="Revenue" stroke={palette.mint} strokeWidth={1.9} dot={false} />
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
      height={326}
    >
      <BarChart data={source} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" {...axis(palette)} />
        <YAxis {...moneyAxis(palette, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <Legend wrapperStyle={legendStyle(palette)} iconType="square" />
        {Object.keys(colors).map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="cost"
            fill={colors[key]}
            radius={key === "Other" ? [2, 2, 0, 0] : 0}
          />
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
      subtitle="Cash consumed per month. Months below zero generated cash."
      height={248}
    >
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" {...axis(palette)} />
        <YAxis {...moneyAxis(palette, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <ReferenceLine y={0} stroke={palette.grid} />
        <Bar dataKey="Net burn" fill={palette.red} opacity={0.75} radius={[2, 2, 0, 0]} />
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
      subtitle="The same plan under four assumptions. The line that reaches zero first is the risk case."
      height={326}
    >
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" {...axis(palette)} />
        <YAxis {...moneyAxis(palette, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <Legend wrapperStyle={legendStyle(palette)} iconType="plainline" />
        <ReferenceLine y={0} stroke={palette.red} strokeDasharray="4 3" />
        {SCENARIO_ORDER.map((id) => (
          <Line
            key={id}
            type="monotone"
            dataKey={SCENARIOS[id].label}
            stroke={colors[SCENARIOS[id].label]}
            strokeWidth={id === "base" ? 2.1 : 1.4}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartCard>
  );
}

export function MarginChart({ projection, theme }) {
  const palette = paletteFor(theme);
  const data = projection.years.map((year) => ({
    label: year.label,
    "Gross margin": Number((year.grossMargin * 100).toFixed(1)),
    "EBITDA margin": Number((year.ebitdaMargin * 100).toFixed(1)),
  }));

  return (
    <ChartCard
      title="Margins over time"
      subtitle="Share of revenue kept after delivery costs, and after all operating costs."
      height={248}
      aside={<span className="legend-note">%</span>}
    >
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" {...axis(palette)} />
        <YAxis
          tick={{ fill: palette.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickMargin={6}
          width={48}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div
                className="chart-tip"
                style={{ background: palette.tipBg, borderColor: palette.tipBorder, color: palette.text }}
              >
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
        <Legend wrapperStyle={legendStyle(palette)} iconType="plainline" />
        <ReferenceLine y={0} stroke={palette.grid} />
        <Line type="monotone" dataKey="Gross margin" stroke={palette.mint} strokeWidth={1.8} dot={{ r: 2.5 }} />
        <Line type="monotone" dataKey="EBITDA margin" stroke={palette.violet} strokeWidth={1.6} dot={{ r: 2.5 }} />
      </LineChart>
    </ChartCard>
  );
}

/** Two saved plans overlaid, so a difference is visible in one glance. */
export function CompareChart({ series, currency, theme }) {
  const palette = paletteFor(theme);
  if (!series.length) return null;
  const colors = [palette.mint, palette.blue, palette.violet];

  const data = series[0].months.map((month, index) => {
    const row = { label: month.label };
    for (const item of series) row[item.name] = item.months[index]?.cash ?? 0;
    return row;
  });

  return (
    <ChartCard title="Cash curves" subtitle="Cash on hand per month for each plan." height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" {...axis(palette)} />
        <YAxis {...moneyAxis(palette, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} palette={palette} />} />
        <Legend wrapperStyle={legendStyle(palette)} iconType="plainline" />
        <ReferenceLine y={0} stroke={palette.red} strokeDasharray="4 3" />
        {series.map((item, index) => (
          <Line
            key={item.name}
            type="monotone"
            dataKey={item.name}
            stroke={colors[index % colors.length]}
            strokeWidth={1.8}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartCard>
  );
}
