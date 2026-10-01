# CLAUDE.md: CompStudies salary explorer

Context for Claude Code. README.md has the full methodology.

## What this is
A self-contained interactive page (`docs/index.html`, ~4.3 MB, data inlined) for exploring wages in the 24
metros within 180 mi of Cincinnati, built from ACS 2020–2024 5-year PUMS (OH, KY, IN, WV) with BLS OEWS
May 2025 as a market reference. Focus: seven tech-role families. Owner: Rob (robh0369), working from mobile.

## Hand-off tasks
1. If `CompStudies-upload.zip` is in the repo root: `unzip -o CompStudies-upload.zip -d . && git rm -q CompStudies-upload.zip`.
2. Run `python3 pipeline/verify_page.py`. Every line must say `ok`; expected Cincinnati full-time medians are
   software development $110,602 ± $5,544 (n=620) and all occupations $63,000 (n=33,284). Stop and report if anything fails.
3. Commit everything ("Add Cincinnati-region salary explorer") and push. If you can't push to `main`, push a branch
   and open a pull request, then tell Rob to merge it from the GitHub app.
4. Tell Rob to turn on Pages (mobile browser, github.com/robh0369/CompStudies → Settings → Pages →
   Source "Deploy from a branch" → Branch `main`, folder `/docs` → Save). No workflow file is needed.
5. Once merged and enabled, the site is https://robh0369.github.io/CompStudies/ (first deploy takes 1–3 minutes).
   If your network allows it, `curl -sI` it and confirm 200. Then give Rob this checklist to try on his phone:
   tap a metro on the map → detail card updates; pick 2+ metros or tech families in the filters → one pooled figure;
   "Share view" → open the link in a new tab → same view restores; Map/List toggle switches; the table icon opens
   data; the download icon saves a CSV; headings render in Plus Jakarta Sans, body in Inter.

## Layout
```
pipeline/config.py        constants: radius, PUMA threshold, suppression rules, tech families, labels
pipeline/stats.py         weighted percentiles + SDR replicate-weight MOE (reference implementation)
pipeline/01_fetch.sh      downloads raw inputs to data/raw/ (gitignored, ~770 MB unzipped)
pipeline/02..06_*.py      crosswalk → extract → OEWS → discipline cube → tech microdata
pipeline/07_build_page.py inlines data into web/template.html → docs/index.html, then runs verify_page.py
pipeline/verify_page.py   JS-vs-Python parity check; needs only committed files plus Node
pipeline/apply_template.py template → docs/index.html reusing the data already in the page (design-only edits)
pipeline/make_geo.mjs     data/web/geo.json for the map (state outlines + a pin per metro) from npm us-atlas/cities.json
web/template.html         EDIT THIS, never docs/index.html (generated)
data/                     committed outputs: geo diagnostics, OEWS extract, every precomputed estimate, page payloads
```

## Editing the page later
For design/JS changes: edit web/template.html, then `make template` (no downloads needed; runs the parity check).
Palette: navy (#0B2545), sky blue, gold and white. ACS ranges use the sky band tokens, BLS uses gold, the map uses the
--ramp-0..4 sky→navy scale; keep chart colors in the CSS tokens at the top of the template (validated in light and dark).

When the data changes: `make page` rebuilds docs/index.html from the template, but it needs data/interim/ from a full build. On a fresh
clone run `BLS_USER_AGENT="email" make all` first (downloads ~250 MB from census.gov and bls.gov, about 5 min;
the session's network settings must allow those hosts). `pip install -r requirements.txt` for deps.

## Invariants: don't break these
- `estimateRows` in web/template.html must match `pipeline/stats.py`: first wage where cumulative weight ≥ q·total
  (scan, because replicate weights can be negative); MOE = 1.645·√(4/80·Σ(rep−full)²). Keep verify_page.py passing.
- Suppress n<30; flag "thin sample" when n<100 or median MOE >30% of the median.
- Non-tech disciplines use a precomputed cube: one metro, one demographic value (enforced in `normalize()`).
  Tech families compute live from microdata, so every filter is multi-select and selections pool into one estimate.
- 2024 dollars via ADJINC. Universe: COW 1–5, age 16+, WAGP>0. Full-time year-round = WKHP≥35 and WKWN≥50.

## Data-access gotchas
- download.bls.gov returns 403 to anonymous agents; send a User-Agent containing a contact email.
- api.census.gov requires a key; the pipeline uses www2.census.gov bulk files instead.

## Known limits (stated on the page)
- Metros marked † have imperfect PUMA fit (e.g., Columbus IN, Kokomo, Parkersburg, Bowling Green, Huntington).
- ACS groups data scientists with statisticians and mathematicians (1520XX); the OEWS reference separates them.
- 13 of 24 metros have under 100 full-time tech respondents, so most demographic cuts there are suppressed.
