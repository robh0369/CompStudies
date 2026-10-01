# Cincinnati-region salary explorer

An interactive page for exploring annual wages across the 24 metro areas within 180 miles of Cincinnati,
with an emphasis on seven tech-role families. Every chart has a data table and CSV export, every estimate
shows its sample size and margin of error, and every view has a shareable link.

**Live page:** https://robh0369.github.io/CompStudies/ (GitHub Pages serves `docs/index.html` from `main`).

**Explainer video (45 s):** [16:9](docs/demo/salary-explorer-demo.mp4) and [9:16](docs/demo/salary-explorer-demo-vertical.mp4), also
linked from the page header ("45-second tour"). Rebuild with `node promo/render.mjs [--vertical]` (Playwright + ffmpeg;
see the header of `promo/render.mjs`). Music is the TaskList promo track.

## Data
| Source | Use |
|---|---|
| ACS 2020–2024 5-year PUMS, person files for OH, KY, IN, WV (Census) | Wages, demographics, replicate weights |
| BLS OEWS May 2025, metro, cross-industry (`download.bls.gov/pub/time.series/oe`) | Market-rate reference |
| BLS OEWS May 2019–2024 metro files (`www.bls.gov/oes/special-requests/oesm{yy}ma.zip`) | Trend view, employer side |
| 2020 tract→PUMA relationship file + 2020 tract populations (Census) | PUMA→metro crosswalk |
| OMB 2023 CBSA delineation (Census `list1_2023.xlsx`) | Metro definitions |

## Method in brief
- **Universe:** wage-and-salary workers 16+ with wages > 0 (class of worker 1–5). Default view is full-time,
  year-round (35+ hrs/week, 50+ weeks); toggle for all wage earners. Wages × `ADJINC` → 2024 dollars.
- **Geography:** metros whose 2020 population center is ≤180 mi from downtown Cincinnati. A 2020 PUMA is
  assigned to a metro if ≥50% of its population is inside. Metros below 85% coverage or purity are flagged (†).
- **Statistics:** weighted P10/P25/P50/P75/P90; 90% MOE from the 80 SDR replicate weights
  (1.645·√(4/80·Σ(rᵢ−r)²)). Replicate weights can be negative, so percentiles scan the cumulative sum.
  Suppress n<30; flag n<100 or median MOE >30% of median.
- **Tech families** (`pipeline/config.py`): software development, data & analytics, cybersecurity,
  network & systems, IT support, IT management, web & UX.
- **Delivery:** tech roles ship as microdata with replicate weights and are computed in the browser (any filter
  combination). Other disciplines use a precomputed cube (metro × SOC major group × at most one demographic).
  `pipeline/verify_page.py` checks the page's JavaScript estimator against Python reference values (Node.js).

## Repository layout
```
pipeline/   01_fetch.sh … 07_build_page.py, config.py, stats.py
data/geo/   puma_cbsa_shares.csv, metros.csv (fit diagnostics)
data/       oews_may2025_metros.csv, estimates_disciplines.csv (every precomputed cell, long format)
data/web/   cube.json, tech_micro.json (page payloads)
web/        template.html (source; edit this)
docs/       index.html (built page, served by GitHub Pages)
```

## Rebuild
```
pip install -r requirements.txt
BLS_USER_AGENT="you@example.com" make all
```
Design-only changes to `web/template.html`: `make template` rebuilds the page from the data already inlined in it.
The map data (`data/web/geo.json`) comes from `node pipeline/make_geo.mjs <dir>` using the npm packages us-atlas,
cities.json and topojson-client; map pins sit on each metro’s first-named city.
BLS blocks anonymous downloads; set `BLS_USER_AGENT` to a contact email. The Census API now requires a key,
so the pipeline uses bulk files only.

## Trend view
Every chart row (and the detail card) opens a year-by-year view:
- **ACS survey years 2020–2024**, recovered from `ADJINC` (one value per data year), all in 2024 dollars. Tech roles compute
  live with any filters; other occupations use per-year cube cells (no demographic filter).
- **BLS OEWS May 2019–2025** for the matching occupation in the selected metro, as published (nominal).
The page hides the drill-down unless `META.years`, the microdata `yr` column and `oewsHist` exist (they come from `make all`).

What to expect from the data:
- A single survey year has about a fifth of the pooled sample (2020 a little less: ACS response fell that year), so
  year-to-year moves are noisy. Cincinnati software development has 100–155 full-time responses a year and median
  MOEs of ±$4k–$22k; the page says when a start-to-end change is inside the margin of error.
- Software development has every year shown only in Cincinnati, Dayton, Louisville and Indianapolis; in the other
  metros each year is under n=30, so the trend shows the BLS line alone. All-occupation series have no gaps.
- OEWS May 2019 and 2020 used combined SOC codes for software developers + QA testers (15-1256), web developers +
  digital designers (15-1257), database administrators + architects (15-1245) and data scientists (15-2098), so those
  detailed lines start in May 2021. They are not back-filled from the combined categories. The page notes this.
- BLS doesn't publish some occupation × metro × year cells; the chart leaves a gap rather than drawing through it.
  Parkersburg has no Software Developers figure in any year. All 24 metros are present in every release
  (Dayton's pre-2023 code 19380 is mapped to 19430).

## Data roadmap
Public sources worth adding, in priority order (host the build needs in brackets):
| # | Dataset | What it adds |
|---|---|---|
| 1 | ACS survey year from `ADJINC` (done) [www2.census.gov] | Trend view, survey side |
| 2 | BLS OEWS May 2019–2024 metro files (done) [www.bls.gov] | Trend view, employer side |
| 3 | DOL OFLC prevailing wage levels I–IV by occupation × metro [flag.dol.gov] | Data-based seniority bands to replace the level rule of thumb |
| 4 | BEA Regional Price Parities for metros [apps.bea.gov] | Cost-of-living-adjusted pay, so metros compare on purchasing power |
| 5 | BLS Employment Cost Index, wages and salaries [download.bls.gov] | Ages the 2020–24 survey pay to today's market |
| 6 | PUMS fields already in the raw files: work from home (`JWTRNS`), employer type (`COW`) [www2.census.gov] | Remote-share stat and a private / nonprofit / government filter |
| 7 | BLS Employment Projections (10-year) [www.bls.gov] | Growth and annual openings per occupation (national) |
| 8 | DOL H-1B LCA disclosure data [flag.dol.gov] | Employer-offered wages by specific job title in these metros |
Source files for 3–5, confirmed downloadable on 2026-10-01 (BLS needs a User-Agent with a contact email):
- **3, OFLC:** `https://flag.dol.gov/sites/default/files/wages/OFLC_Wages_2026-27.zip` (12.7 MB; July 2026–June 2027
  wage year; earlier years swap the suffix, back to `2021-22`). `ALC_Export.csv` has hourly Level1–Level4 by `Area`
  (CBSA) × `SocCode`, e.g. Cincinnati 15-1252 $40.24 / $49.57 / $58.90 / $68.23; `Geography.csv` maps areas.
- **4, BEA RPP:** `https://apps.bea.gov/regional/zip/MARPP.zip` (MSA RPPs 2008–2024, `MARPP_MSA_2008_2024.csv`, keyed
  by CBSA; line 1 = all items, Cincinnati 2024 ≈ 94).
- **5, ECI:** `https://download.bls.gov/pub/time.series/ci/ci.data.1.AllData` with `ci.series`; series
  `CIU2020000000000I` (private wages and salaries index) and `CIU2020000000000A` (12-month % change), through 2026 Q2.

Equity grants, bonus targets and benefits are not in any public source (they live in licensed surveys such as Radford or
Mercer, or crowd-sourced sites).

## Caveats
ACS wages are self-reported for the prior 12 months and pooled over 2020–2024; OEWS is employer-reported for
May 2025, so OEWS medians typically run higher. ACS wages are top-coded by state. Estimates are the project's
own calculations, not official Census or BLS figures.
