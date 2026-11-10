# Startup Projections

A calm, Scandinavian financial cockpit for early-stage founders: enter your assumptions
once and watch the monthly plan — revenue, costs, burn, runway, break-even, unit
economics and four scenarios — update live in the browser.

Two themes: **nord** (deep, near-black) and **vanilje** (warm off-white). Numbers are set in
a tabular mono so columns line up; colour is used for meaning, not decoration.

The concept, the model and the roadmap are described in [CONCEPT.md](CONCEPT.md) (Norwegian).

## What it does

- **Monthly model** over 24–60 months, rolled up to years.
- **Two revenue modes**: customer funnel (customers × ARPU, churn) or a compounding
  growth rate that fades over time.
- **Costs that scale with the business**: headcount plan with employer cost, marketing
  budget plus an optional share of revenue, tools, office and other OpEx.
- **Cash**: starting cash, funding rounds by month, runway, lowest cash point and the
  extra funding needed to stay solvent.
- **Cash timing**: collection terms of 0–90 days separate revenue from cash in the bank,
  receivables are tracked month by month, and a cash floor gives runway to the balance you
  refuse to go below.
- **Corporate tax**: one editable rate on positive profit, with earlier losses carried
  forward.
- **Unit economics**: CAC, LTV with the gross-margin haircut, LTV:CAC, CAC payback,
  churn, gross retention, burn multiple, rule of 40 — each graded against a benchmark.
- **Scenarios and risk**: Upside / Base / Downside / Stress from the same cost base, a
  comparison table, and a 5×5 sensitivity grid over growth and churn.
- **Plan library**: save named plans locally, load them back, and compare two plans side
  by side with deltas and overlaid cash curves.
- **Milestones**: funding, first revenue, ARR thresholds, break-even and the tightest cash
  point, in calendar order.
- **Ownership**: a pre-money valuation per round yields post-money, investor share and
  founder dilution, shown in the Cash tab and in the report. Unpriced SAFEs are excluded.
- **Report**: a clean one-page summary with key figures, scenarios, milestones and the full
  assumption ledger. Prints to PDF with a purpose-built print stylesheet.
- **Insights** written in plain language, tagged Risk / Watch / Note / Strength.
- **Share, export, persist**: the whole model travels in a URL hash, downloads as CSV,
  and is saved to localStorage on the device.

Nothing leaves the browser: no account, no backend, no tracking.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # model invariants, analysis, edge cases, 2,000-plan fuzz
npm run build    # production bundle in dist/
```

Vite + React 18 + Recharts. Sources are `.jsx`; there is no TypeScript.

## Versions

- **v2.1** is the current app (Scandinavian interface, plans, sensitivity, milestones, report).
- **v2** introduced the monthly engine, scenarios and unit economics.
- **v1** (the original single-screen yearly model) is kept on the `original` branch and is
  also reachable in the running app at `#original`.
