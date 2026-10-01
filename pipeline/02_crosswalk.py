"""PUMA (2020) -> CBSA (2023 delineation) crosswalk via tract population, and metro selection by distance."""
import numpy as np, pandas as pd
from config import *

tp = pd.read_csv(RAW/'2020_Census_Tract_to_2020_PUMA.txt', dtype=str, encoding='utf-8-sig')
cp = pd.concat([pd.read_csv(RAW/f'CenPop2020_Mean_TR{s}.txt', encoding='utf-8-sig',
                            dtype={'STATEFP': str, 'COUNTYFP': str, 'TRACTCE': str}) for s in STATES])
t = cp.merge(tp, on=['STATEFP', 'COUNTYFP', 'TRACTCE'])
d = pd.read_excel(RAW/'list1_2023.xlsx', header=2).dropna(subset=['FIPS State Code'])
d = d[d['Metropolitan/Micropolitan Statistical Area'].str.startswith('Metro')]
d['STATEFP'] = d['FIPS State Code'].astype(int).astype(str).str.zfill(2)
d['COUNTYFP'] = d['FIPS County Code'].astype(int).astype(str).str.zfill(3)
t = t.merge(d[['STATEFP', 'COUNTYFP', 'CBSA Code', 'CBSA Title']].astype(str), how='left', on=['STATEFP', 'COUNTYFP'])

def hav(a, b, c, e):
    a, b, c, e = map(np.radians, [a, b, c, e])
    return 3958.8 * 2 * np.arcsin(np.sqrt(np.sin((c-a)/2)**2 + np.cos(a)*np.cos(c)*np.sin((e-b)/2)**2))

inm = t.dropna(subset=['CBSA Code'])
m = inm.groupby(['CBSA Code', 'CBSA Title']).apply(lambda g: pd.Series({
    'pop2020': g.POPULATION.sum(),
    'lat': np.average(g.LATITUDE, weights=g.POPULATION),
    'lon': np.average(g.LONGITUDE, weights=g.POPULATION)}), include_groups=False).reset_index()
m['miles'] = hav(*CINCY, m.lat, m.lon).round(1)
m = m[m.miles <= RADIUS_MI].sort_values('miles')

pp = t.groupby(['STATEFP', 'PUMA5CE']).POPULATION.sum().rename('puma_pop')
pc = (inm.groupby(['STATEFP', 'PUMA5CE', 'CBSA Code']).POPULATION.sum().rename('pop_in_cbsa')
      .reset_index().merge(pp, on=['STATEFP', 'PUMA5CE']))
pc['share'] = (pc.pop_in_cbsa / pc.puma_pop).round(4)
pc = pc[pc['CBSA Code'].isin(m['CBSA Code'])]
pc['assigned'] = pc.share >= PUMA_ASSIGN_SHARE
pc.to_csv(GEO/'puma_cbsa_shares.csv', index=False)

fit = []
for _, r in m.iterrows():
    g = pc[pc['CBSA Code'] == r['CBSA Code']]; a = g[g.assigned]
    cov = a.pop_in_cbsa.sum() / g.pop_in_cbsa.sum(); pur = a.pop_in_cbsa.sum() / a.puma_pop.sum()
    fit.append({'cbsa': r['CBSA Code'], 'name': r['CBSA Title'], 'miles': r.miles, 'pop2020': int(r.pop2020),
                'pumas_touching': len(g), 'pumas_assigned': len(a),
                'coverage': round(cov, 3), 'purity': round(pur, 3),
                'fit_flag': bool(cov < FIT_FLAG or pur < FIT_FLAG)})
pd.DataFrame(fit).to_csv(GEO/'metros.csv', index=False)
print(pd.DataFrame(fit).to_string(index=False))
