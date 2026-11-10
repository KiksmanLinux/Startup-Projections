# Startup Projections — konsept og plan

## Konseptet i én setning

Et verktøy der en gründer legger inn forretningsantakelsene sine og umiddelbart ser
**om planen henger sammen økonomisk** — ikke bare omsetning, men brennrategrad, runway,
break-even, enhetsøkonomi og hva som skjer hvis ting går dårligere enn planlagt.

Appen er en kalkulator, ikke et regnskap. Alt er drevet av noen få forutsetninger
(kunder, churn, pris, lønn, markedsspend, kontanter og funding), og hvert tall i
grensesnittet kan spores tilbake til dem.

**Målgruppe:** tidlig-fase-gründere (pre-seed til seed) som skal forklare planen for
seg selv, co-founder eller investor — og som trenger å se konsekvensen av ett valg
(«hva om vi ansetter to til?») uten å bygge et Excel-ark.

## Spørsmålene appen skal svare på

1. **Hvor mye brenner vi, og hvor lenge varer pengene?** Månedlig net burn, runway i måneder,
   laveste kontantpunkt og hvor mye ekstra kapital som trengs.
2. **Når går vi i pluss?** Break-even-måned, EBITDA-margin over horisonten.
3. **Er vekstmotoren sunn?** CAC, LTV med bruttomargin-justering, LTV:CAC, CAC payback,
   månedlig churn, årlig gross retention, burn multiple, rule of 40.
4. **Hva om vi tar feil?** Fire scenarier (Upside, Base, Downside, Stress) på samme
   kostnadsbase, med kontantkurver side om side.
5. **Hva driver kostnadene?** Payroll vs. marked vs. verktøy/husleie/annet, og hvordan
   headcount-planen spiser opp marginene.

## Modellen (beregningene)

Alt regnes **månedlig** og rulles opp til år. Horisont: 24/36/48/60 måneder.

**Omsetning** — to moduser:

- *Customers:* `kunder(t) = kunder(t-1) × (1 − churn) + nye kunder per måned`,
  `omsetning = kunder × ARPU`, der ARPU inflateres med prisvekst per år.
- *Growth rate:* `MRR(t) = MRR(t-1) × (1 + g)`, der `g` er månedlig vekst som fader
  med `growthDecayPerYear` for hvert år. Kunder utledes som `MRR / ARPU` for enhetsøkonomien.

**Kostnader:**

- `COGS = omsetning × cogsRate` → `bruttofortjeneste = omsetning − COGS`
- Payroll = `headcount × (årslønn / 12) × (1 + lønnsvekst)^år × (1 + arbeidsgiverkostnad)`,
  med `headcount = start + ansettelser per år × år`.
- Marked = fast månedsbudget eskalert per år **+ andel av omsetning** (valgfritt).
- Verktøy, husleie og annet eskaleres hver for seg per år.
- Alle driftskostnader (ikke COGS) skaleres med scenariofaktoren.

**Kontanter:** `cash(t) = cash(t-1) + EBITDA(t) + funding(t)`, med startkapital som
åpningsbalanse. Funding er en liste av runder med beløp og startmåned.

**Nøkkeltall:**

| Tall | Definisjon |
| --- | --- |
| Runway | Indeksen til første måned med negativ saldo (null = aldri innen horisonten) |
| Funding gap | `−min(cash)` når minimum er negativt |
| Gross margin | Sum bruttofortjeneste / sum omsetning, siste 12 mnd |
| EBITDA margin | Sum EBITDA / sum omsetning, siste 12 mnd |
| CAC | Markedsspend siste 12 mnd / nye kunder siste 12 mnd |
| LTV | `ARPU × bruttomargin / månedlig churn` |
| CAC payback | `CAC / (ARPU × bruttomargin)` |
| Burn multiple | Netto burn / netto ny ARR (siste 12 mnd) |
| Rule of 40 | Årsvekst + EBITDA-margin |

**Scenarier** er multiplikatorer på samme plan, slik at bare historien endres — ikke
kostnadsstrukturen:

| Scenario | Nye kunder / vekst | Churn | Kostnader |
| --- | --- | --- | --- |
| Upside | ×1,35 | ×0,7 | ×0,97 |
| Base | ×1 | ×1 | ×1 |
| Downside | ×0,65 | ×1,5 | ×1,05 |
| Stress | ×0,4 | ×2,2 | ×1,20 |

**Benchmark-hints** (fra 2025/2026 SaaS-data) brukes til fargekoding, ikke fasit:
bruttomargin ~80 % (median), månedlig churn under 2,5 %, LTV:CAC ≥ 3×, CAC payback
under 12 mnd, runway 18–24 mnd, burn multiple under 1,5×, gross retention ~84 %.

## Hva appen inneholder

- **Input-panel** med kollapsbare seksjoner, slider + eksakt tallfelt, hjelpetekst per
  felt, revenue-modellvelger, funding-editør og seks presets (SaaS, byrå, e-handel, pre-revenue).
- **Seks visninger:** Overview (KPI-er, inntekt/kostnad/EBITDA, innsikter, marginutvikling),
  Revenue, Costs, Cash & runway, Unit economics, Scenarios og Full model (årlig/månedlig tabell).
- **Innsiktsmotor** som leser planen og formulerer neste handling: «cash runs out in
  X months», «funding gap», «tightest cash point», «churn er høy», «LTV:CAC under 3×» osv.
- **Scenariosammenligning** som tabell + kontantkurver.
- **Deling og eksport:** hele modellen kan deles som lenke (URL-hash), lastes ned som CSV,
  og lagres automatisk i nettleseren.
- **Lys/mørk modus**, responsivt layout (sidebar blir stablede seksjoner på mobil), tastatur
  og skjermleser-vennlige kontroller.

## Personvern og avgrensninger

- Alt regnes i nettleseren. Ingen konto, ingen server, ingen data som forlater maskinen.
- Bevisste ikke-mål: skatt, balanse, avskrivninger, CapEx, arbeidskapital, valutakurser,
  covenant-oppfølging og faktiske regnskapstall. Modellen er en plan, ikke et regnskap —
  appen sier det også i teksten.

## Versjonering

- **v1** (originalen) ligger på git-branchen `original`, og kan ses i appen på `#original`
  (lenke nederst på siden). v1 er den opprinnelige enkeltfil-modellen med årlige tall.
- **v2** (denne) er månedlig modell med scenarier, enhetsøkonomi og innsikter.

## Plan videre

**Ferdig i v2**

- [x] Månedlig motor med customers- og growth-modus
- [x] Payroll/headcount, markedsandel av omsetning, funding-runder
- [x] Runway, burn, break-even, funding gap
- [x] Enhetsøkonomi med benchmark-status
- [x] Fire scenarier med sammenligning
- [x] Innsikter, CSV, delbar lenke, localStorage, mørk/lys modus
- [x] Enhetstester + fuzz (2 000 tilfeldige planer) og produksjonsbygg

**Neste kandidater**

1. Sammenligne to planer side om side (lagrede varianter, ikke bare scenarier).
2. Månedlig kvartalsvis «hiring plan» per avdeling i stedet for én gjennomsnittslønn.
3. CapEx/avskrivninger og skatt for senere faser.
4. Eksport til PDF/regneark med formler, ikke bare CSV.
5. Flere inntektsstrømmer (abonnement + tjenester + engangs).
6. Norske forhold: arbeidsgiveravgift og MVA-håndtering som egne forhåndsvalg.

## Teknisk

```
src/
  App.jsx                app-skall, faner, verktøylinje, deling/eksport
  lib/finance.js         ren beregningsmotor, scenarier, innsikter, CSV
  lib/inputs.js          feltskjema, defaults, presets, normalisering
  lib/format.js          valuta/tall/dato-formatering
  lib/storage.js         localStorage + delbar lenke
  components/            Field, KpiCard, Charts, DataTable, Sidebar
  original/OriginalApp.jsx   v1, lastes lazy på #original
  lib/finance.test.js    Vitest: invarianter, kanttilfeller, fuzz
```

Kjør: `npm install && npm run dev` · test: `npm test` · bygg: `npm run build`
