# Startup Projections — konsept, design og plan

## Konseptet i én setning

Et verktøy der en gründer legger inn forretningsantakelsene sine og umiddelbart ser
**om planen henger sammen økonomisk** — ikke bare omsetning, men burn, runway, break-even,
enhetsøkonomi og hva som skjer hvis ting går dårligere enn planlagt.

Appen er en kalkulator, ikke et regnskap. Alt er drevet av noen få forutsetninger
(kunder, churn, pris, lønn, markedsspend, kontanter og funding), og hvert tall i
grensesnittet kan spores tilbake til dem.

**Målgruppe:** tidlig-fase-gründere (pre-seed til seed) som skal forklare planen for
seg selv, en co-founder eller en investor — og som trenger å se konsekvensen av ett valg
(«hva om vi ansetter to til?») uten å bygge et Excel-ark.

## Spørsmålene appen skal svare på

1. **Hvor mye brenner vi, og hvor lenge varer pengene?** Månedlig net burn, runway,
   laveste kontantpunkt og hvor mye ekstra kapital som trengs.
2. **Når går vi i pluss?** Break-even-måned og EBITDA-margin over horisonten.
3. **Er vekstmotoren sunn?** CAC, LTV med bruttomargin-justering, LTV:CAC, CAC payback,
   månedlig churn, gross retention, burn multiple, rule of 40.
4. **Hva om vi tar feil?** Fire scenarier og en sensitivitetsmatrise som viser hvilke
   antakelser planen faktisk tåler.
5. **Hva driver kostnadene?** Payroll vs. marked vs. verktøy/husleie/annet.
6. **Hva skal jeg gjøre nå?** Innsikter i klartekst, milepæler i kalenderrekkefølge, og en
   rapport som kan deles med investor.

## Visuell retning: skandinavisk

Målet er et rolig, presist verktøy — ikke en «AI-demo». Retningslinjene er:

- **To temaer.** `nord` er dyp, nesten svart (#0a0c0e) med varme gråtoner; `vanilje` er
  varm off-white (#f7f4ec) med blek linje og dyp blekksvart tekst. Ingen ren hvit, ingen ren svart.
- **Dempet palett.** Furugrønn som eneste aksent, med støvete blå, sand, leire og mauve i
  grafene. Farger brukes til betydning, ikke dekor.
- **Hårfine linjer, ikke skygger.** 1 px rammer, 8 px radius, ingen glød, ingen gradienter
  utenom en svak fylling under kurvene.
- **Typografi.** Inter for tekst, IBM Plex Mono for alle tall (tabellarisk, så kolonner
  liner opp). Små versaler med luft brukes som seksjonsetiketter.
- **Hierarki.** Siden er bygget som et regneark-dokument: topplinje, sidetittel, så tallene
  først og detaljene under. Faner er understreket, ikke piller.
- **Status er tekst.** «Healthy / Watch / Risk» som små chips, ikke fargede tall.

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

**Kontantstrøm:** `cash(t) = cash(t−1) + innbetalt(t) − COGS(t) − OpEx(t) − skatt(t) + funding(t)`.
Innbetalinger følger en collection lag: 0 dager betyr betalt på forskudd, 30 dager betyr at
månedens omsetning kommer inn måneden etter, og 60 dager fordeler den over de to neste
månedene. Det som er fakturert men ikke betalt, ligger som kundefordringer.

**Skatt:** selskapsskatt på positiv EBITDA med underskudd til fremføring. Satsen er
redigerbar (22 % er norsk selskapsskatt). Skatten betales i samme måned som overskuddet
oppstår — en forenkling som rapporten sier eksplisitt.

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
| Rule of 40 | Årsvekst + EBITDA-margin (utelates når omsetningsbasen er for liten) |
| Runway til cash floor | Første måned under balansen du vil beskytte (ofte 3 mnd lønn) |
| Kundefordringer | Fakturert, ikke innbetalt, ved horisontens slutt |
| Eierandel etter runder | Produkt av `1 − investorandel` per priset runde, der `investorandel = beløp / (pre-money + beløp)` |

**Scenarier** er multiplikatorer på samme plan (Upside 1,35× vekst / 0,7× churn,
Downside 0,65× / 1,5×, Stress 0,4× / 2,2×, med tilsvarende kostnadspåslag).
**Sensitivitetsmatrisen** varierer i stedet de to viktigste driverne direkte
(nye kunder × churn, eller vekst × fade) i et 5×5-rutenett.

**Benchmark-hints** (2025/2026 SaaS-data) brukes til fargekoding, ikke fasit:
bruttomargin ~80 %, månedlig churn under 2,5 %, LTV:CAC ≥ 3×, CAC payback under
12 mnd, runway 18–24 mnd, burn multiple under 1,5×, gross retention ~84 %.

## Funksjoner

- **Input-panel** med kollapsbare seksjoner, slider + eksakt tallfelt, hjelpetekst per
  felt, revenue-modellvelger, funding-editør og fire presets (SaaS, byrå, e-handel, pre-revenue).
- **Ni visninger:** Overview, Revenue, Costs, Cash, Unit economics, Scenarios, Plans,
  Report og Model (årlig/månedlig tabell).
- **Innsiktsmotor** som leser planen og formulerer neste handling, merket Risk / Watch /
  Note / Strength.
- **Scenarier:** fire scenarioer, kontantkurver, sammenligningstabell og sensitivitetsmatrise
  med valgbar metrikk (runway, kontantbeholdning, laveste punkt, exit ARR).
- **Planbibliotek:** lagre navngitte planer lokalt (opptil 20), last dem inn igjen, og
  sammenlign to planer side om side med differanse per nøkkeltall og overlappende kontantkurver.
- **Milepæler:** funding, første omsetning, ARR-nivåer, break-even og laveste kontantpunkt —
  i kalenderrekkefølge.
- **Kontanttiming og buffergrense:** collection lag (0–90 dager), cash floor, og egne tall for
  kundefordringer og skatt. Runway vises både til null og til buffergrensen.
- **Eierskap:** pre-money per fundingrunde, post-money, investorens andel og founder-eierskap
  etter hver runde — også i rapporten og i forutsetningslisten.
- **Rapport:** én ren side med nøkkeltall, scenariotabell, milepæler og full
  forutsetningsliste. Utskrift/skjermbilde til PDF via nettleseren, med egen print-CSS.
- **Deling og eksport:** hele modellen i URL-hash, CSV-eksport, autolagring i nettleseren.
- **Responsivt:** input-panelet blir skuff under 980 px, resultatene kommer først.

## Personvern og avgrensninger

- Alt regnes i nettleseren. Ingen konto, ingen server, ingen data som forlater maskinen.
- Bevisste ikke-mål: skatt, balanse, avskrivninger, CapEx, arbeidskapital, valutakurser
  og faktiske regnskapstall. Rapporten sier dette eksplisitt.

## Versjonering

- **v1** (originalen) ligger på git-branchen `original` og i appen på `#original`.
- **v2** er denne: månedlig modell, scenarier, enhetsøkonomi, innsikter.
- **v2.1** er den skandinaviske omleggingen med planbibliotek, sensitivitet, milepæler
  og rapport.

## Plan videre

**Ferdig**

- [x] Månedlig motor med customers- og growth-modus
- [x] Payroll/headcount, markedsandel av omsetning, funding-runder
- [x] Runway, burn, break-even, funding gap
- [x] Enhetsøkonomi med benchmark-status
- [x] Fire scenarier med sammenligning og sensitivitetsmatrise
- [x] Innsikter, CSV, delbar lenke, localStorage
- [x] Planbibliotek med to-plans sammenligning
- [x] Milepæler og utskriftsvennlig rapport med forutsetningsliste
- [x] Skandinavisk design med `nord` og `vanilje`-tema
- [x] Kontanttiming (collection lag), cash floor og selskapsskatt med underskuddsfremføring
- [x] Eierskap og utvanning per fundingrunde
- [x] 44 tester inkl. fuzz over 2 000 planer

**Neste kandidater**

1. CSV/regneark-eksport med formler, ikke bare verdier.
2. Ansatte per avdeling og ansettelsesplan per kvartal.
3. Flere inntektsstrømmer (abonnement + tjenester + engangs).
4. Norske forhold: arbeidsgiveravgift og MVA som egne forhåndsvalg.
5. Flere valutaer i samme plan (inntekt i EUR, kostnader i NOK).
6. Faktiske tall mot plan: CSV-import av månedlig P&L med avvik per linje.

## Teknisk

```
src/
  App.jsx                 app-skall, faner, verktøylinje, deling/eksport
  lib/finance.js          ren beregningsmotor, scenarier, innsikter, CSV
  lib/inputs.js           feltskjema, defaults, presets, normalisering
  lib/analysis.js         sensitivitet, milepæler, forutsetninger, plansammenligning
  lib/plans.js            planbibliotek i localStorage
  lib/format.js           valuta/tall/dato-formatering
  lib/storage.js          localStorage + delbar lenke
  components/             Field, KpiCard, Charts, DataTable, Sidebar,
                          SensitivityTable, Milestones, PlanLibrary, ReportView, CapTable
  original/OriginalApp.jsx   v1, lastes lazy på #original
  lib/*.test.js           Vitest: invarianter, kanttilfeller, fuzz, analyse,
                          kontanttiming, skatt, cash floor og eierskap
```

Kjør: `npm install && npm run dev` · test: `npm test` · bygg: `npm run build`
