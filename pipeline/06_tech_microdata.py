"""Tech-family microdata for in-browser estimation (any filter combination, true replicate MOEs).

Records: wage-and-salary workers in the 7 tech families. Weights (PWGTP + 80 replicates) as little-endian
int16, base64; wages as int32 (2024 $). No IDs or geography below metro are included.
"""
import base64, json, numpy as np, pandas as pd
from config import *
from stats import estimate

d = pd.read_pickle(INTERIM/'workers.pkl')
t = d[d.fam.notna()].reset_index(drop=True)
metros = pd.read_csv(GEO/'metros.csv', dtype={'cbsa': str})
midx = {c: i for i, c in enumerate(metros.cbsa)}
fidx = {f: i for i, (f, *_) in enumerate(FAMILIES)}
W = t[['PWGTP'] + REPS].to_numpy(np.int16)
assert W.min() >= -32768 and W.max() <= 32767
out = {
    'n': len(t),
    'wage': base64.b64encode(t.wage.to_numpy('<i4').tobytes()).decode(),
    'w': base64.b64encode(W.astype('<i2').tobytes()).decode(),
    'cols': {'metro': t.CBSA.map(midx).tolist(), 'fam': t.fam.map(fidx).tolist(),
             'ftyr': t.ftyr.astype(int).tolist(), **{k: t[k].astype(int).tolist() for k in DIMS}},
}
json.dump(out, open(DATA/'web/tech_micro.json', 'w'), separators=(',', ':'))
# Reference values the page's JS must reproduce (checked in 07_build_page.py's test)
ft = t[t.ftyr]
chk = {}
for f, i in fidx.items():
    s = ft[(ft.fam == f) & (ft.CBSA == '17140')]
    e = estimate(s.wage.to_numpy(), s[['PWGTP'] + REPS].to_numpy())
    chk[f] = {'n': e['n'], 'p50': float(e['q'][2]), 'moe50': round(float(e['moe'][2]), 2)}
json.dump(chk, open(INTERIM/'js_check.json', 'w'), indent=1)
print(len(t), 'tech records'); print(json.dumps(chk))
