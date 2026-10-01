# Cincinnati-region salary explorer

An interactive page for exploring annual wages across the 24 metro areas within 180 miles of Cincinnati,
with an emphasis on seven tech-role families. Every chart has a data table and CSV export, every estimate
shows its sample size and margin of error, and every view has a shareable link.

**Live page:** https://robh0369.github.io/CompStudies/ (GitHub Pages serves `docs/index.html` from `main`).

## Data
| Source | Use |
|---|---|
| ACS 2020–2024 5-year PUMS, person files for OH, KY, IN, WV (Census) | Wages, demographics, replicate weights |
| BLS OEWS May 2025, metro, cross-industry (`download.bls.gov/pub/time.series/oe`) | Market-rate reference |
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

## Caveats
ACS wages are self-reported for the prior 12 months and pooled over 2020–2024; OEWS is employer-reported for
May 2025, so OEWS medians typically run higher. ACS wages are top-coded by state. Estimates are the project's
own calculations, not official Census or BLS figures.
