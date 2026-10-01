"""Precompute estimates for SOC major groups: worker type x metro x discipline x (no filter | one dimension).

Writes data/estimates_disciplines.csv (long, human-readable) and data/web/cube.json (compact, for the page).
Tech families are not here: the page computes them live from data/web/tech_micro.json.
"""
import json, time, numpy as np, pandas as pd
from config import *
from stats import estimate

d = pd.read_pickle(INTERIM/'workers.pkl')
metros = pd.read_csv(GEO/'metros.csv', dtype={'cbsa': str})
wage = d.wage.to_numpy(); W = d[['PWGTP'] + REPS].to_numpy()
dimcols = {k: d[k].to_numpy() for k in DIMS}
yr = d.yr.to_numpy()
metro_sets = {r.cbsa: d.CBSA.eq(r.cbsa).to_numpy() for r in metros.itertuples()}
metro_sets[SMALL_ID] = ~d.CBSA.isin(BIG4).to_numpy()
metro_sets[REGION_ID] = np.ones(len(d), bool)
discs = {'ALL': np.ones(len(d), bool)} | {k: d.soc2.eq(k).to_numpy() for k in SOC_GROUPS}
wtypes = {'ftyr': d.ftyr.to_numpy(), 'all': np.ones(len(d), bool)}

rows, cube, t0 = [], {}, time.time()
def put(wt, mt, dc, dim, val, mask):
    e = estimate(wage[mask], W[mask])
    key = f'{wt}|{mt}|{dc}|{dim}|{val}'
    if e['suppressed']:
        cube[key] = [e['n']]
        rows.append(dict(worker=wt, metro=mt, discipline=dc, dim=dim, value=val, n=e['n'], suppressed=True))
        return
    q = (e['q'] / 100).round().astype(int).tolist(); mo = (e['moe'] / 100).round().astype(int).tolist()
    cube[key] = [e['n'], e['pop']] + q + mo + [int(e['caution'])]
    rows.append(dict(worker=wt, metro=mt, discipline=dc, dim=dim, value=val, n=e['n'], weighted=e['pop'],
                     **{f'p{int(x*100)}': v for x, v in zip(QS, e['q'])},
                     **{f'moe_p{int(x*100)}': round(v) for x, v in zip(QS, e['moe'])},
                     caution=e['caution'], suppressed=False))

for wt, wm in wtypes.items():
    for mt, mm in metro_sets.items():
        for dc, dm in discs.items():
            base = wm & mm & dm
            if base.sum() < MIN_N:
                cube[f'{wt}|{mt}|{dc}|-|-'] = [int(base.sum())]; continue
            put(wt, mt, dc, '-', '-', base)
            for dim, col in dimcols.items():
                for v in range(len(DIMS[dim])):
                    put(wt, mt, dc, dim, v, base & (col == v))
            for y in range(len(ACS_YEARS)):                       # trend view: one cell per survey year
                put(wt, mt, dc, 'yr', y, base & (yr == y))
    print(wt, 'done', round(time.time() - t0), 's')

df = pd.DataFrame(rows)
for dim, labels in DIMS.items():
    sel = df.dim == dim
    df.loc[sel, 'value'] = df.loc[sel, 'value'].map(lambda v: labels[int(v)])
sel = df.dim == 'yr'
df.loc[sel, 'value'] = df.loc[sel, 'value'].map(lambda v: ACS_YEARS[int(v)])
df.to_csv(DATA/'estimates_disciplines.csv', index=False)
(DATA/'web').mkdir(exist_ok=True)
json.dump(cube, open(DATA/'web/cube.json', 'w'), separators=(',', ':'))
print(len(cube), 'cells;', (df.suppressed).mean().round(3), 'suppressed share')
