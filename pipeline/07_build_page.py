"""Assemble docs/index.html (served by GitHub Pages): template + metadata + cube + tech microdata + OEWS reference, then verify the
page's JavaScript estimator reproduces the Python estimates (requires Node.js; skipped if absent)."""
import json, math, re, shutil, subprocess, pandas as pd
from config import *

metros = pd.read_csv(GEO/'metros.csv', dtype={'cbsa': str})
d = pd.read_pickle(INTERIM/'workers.pkl')
oe = pd.read_csv(DATA/'oews_may2025_metros.csv', dtype={'cbsa': str, 'occ': str})
need = {'000000'} | {k + '0000' for k in SOC_GROUPS} | {c for *_, o in FAMILIES for c in o}
oe = oe[oe.occ.isin(need)]
clean = lambda v: None if (v is None or (isinstance(v, float) and math.isnan(v))) else round(float(v))
oews = {}
for r in oe.itertuples():
    oews.setdefault(r.cbsa, {})[r.occ] = [clean(r.employment), clean(r.p10), clean(r.p25), clean(r.p50), clean(r.p75), clean(r.p90)]
occnames = dict(zip(oe.occ, oe.occupation))
occnames.update({c: n for c, n in pd.read_csv(RAW/'oe.occupation', sep='\t', dtype=str, usecols=[0, 1]).values if c in need})

meta = {
    'metros': [{'id': r.cbsa, 'name': r.name, 'miles': r.miles, 'fit_flag': bool(r.fit_flag), 'coverage': r.coverage,
                'purity': r.purity, 'pumas_assigned': int(r.pumas_assigned)} for r in metros.itertuples()],
    'big4': BIG4,
    'families': [{'id': f, 'label': l, 'acs': a, 'oews': o} for f, l, a, o in FAMILIES],
    'soc': [{'id': k, 'label': v} for k, v in SOC_GROUPS.items()],
    'dims': DIMS, 'occnames': occnames,
    'years': ACS_YEARS,
    'rules': {'min_n': MIN_N, 'caution_n': CAUTION_N, 'caution_rel': CAUTION_REL},
    'counts': {'records': len(d), 'ftyr': int(d.ftyr.sum()), 'tech': int(d.fam.notna().sum())},
}
payload = {'meta': meta, 'cube': json.load(open(DATA/'web/cube.json')),
           'micro': json.load(open(DATA/'web/tech_micro.json')), 'oews': oews}
hist = DATA/'oews_history_metros.csv'   # from 04b_oews_history.py; the trend view's BLS line
if hist.exists():
    h = pd.read_csv(hist, dtype={'cbsa': str, 'occ': str}).sort_values('year')
    h = h[h.occ.isin(need)]
    payload['oewsHist'] = {}
    for r in h.itertuples():
        payload['oewsHist'].setdefault(r.cbsa, {}).setdefault(r.occ, []).append(
            [int(r.year), clean(r.employment), clean(r.p10), clean(r.p25), clean(r.p50), clean(r.p75), clean(r.p90)])
blob = json.dumps(payload, separators=(',', ':'), ensure_ascii=False).replace('</', '<\\/')
geo = (DATA/'web/geo.json').read_text().replace('</', '<\\/')   # map outlines + pins, from pipeline/make_geo.mjs
html = (ROOT/'web/template.html').read_text().replace('__GEO__', geo).replace('__DATA__', blob)

(ROOT/'docs').mkdir(exist_ok=True)
(ROOT/'docs/index.html').write_text(html)            # GitHub Pages serves /docs on main
shutil.copy(INTERIM/'js_check.json', DATA/'web/js_check.json')
print('docs/index.html written')
subprocess.run(['python3', str(ROOT/'pipeline/verify_page.py')], check=True)
