# Startup Projections

A startup financial cockpit: enter your assumptions once and see the monthly plan —
revenue, costs, burn, runway, break-even, unit economics and four scenarios — update
live in the browser.

The idea, the model and the roadmap are described in [CONCEPT.md](CONCEPT.md) (Norwegian).

## What it does

- **Monthly model** over 24–60 months, rolled up to years.
- **Two revenue modes**: customer funnel (customers × ARPU, churn) or a compounding
  growth rate that fades over time.
- **Costs that scale with the business**: headcount plan with employer cost, marketing
  budget plus an optional share of revenue, tools, office and other OpEx.
- **Cash**: starting cash, funding rounds by month, runway, lowest cash point and the
  extra funding needed to stay solvent.
- **Unit economics**: CAC, LTV with the gross-margin haircut, LTV:CAC, CAC payback,
  churn, gross retention, burn multiple, rule of 40 — each graded against a benchmark.
- **Scenarios**: Upside / Base / Downside / Stress from the same cost base, with cash
  curves and a comparison table.
- **Insights** written in plain language: what is about to break and what to do next.
- **Share, export, persist**: the whole model travels in a URL hash, downloads as CSV,
  and is saved to localStorage on the device.

Nothing leaves the browser: no account, no backend, no tracking.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # model invariants, edge cases and a 2,000-plan fuzz run
npm run build    # production bundle in dist/
```

Vite + React 18 + Recharts. The sources are `.jsx`; there is no TypeScript.

## Versions

- **v2** is the current app.
- **v1** (the original single-screen yearly model) is kept on the `original` branch and
  is also reachable in the running app at `#original`.
