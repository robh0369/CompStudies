"""Extract wage-and-salary workers living in assigned PUMAs; adjust wages to 2024 dollars; code dimensions."""
import numpy as np, pandas as pd
from config import *

pc = pd.read_csv(GEO/'puma_cbsa_shares.csv', dtype={'STATEFP': str, 'PUMA5CE': str, 'CBSA Code': str})
a = pc[pc.assigned][['STATEFP', 'PUMA5CE', 'CBSA Code']]; a.columns = ['ST', 'PUMA', 'CBSA']

dic = pd.read_csv(RAW/'PUMS_Data_Dictionary_2020-2024.csv', header=None, names=list('abcdefg'), dtype=str)
ind = dic[(dic.a == 'VAL') & (dic.b == 'INDP')]
ind_prefix = dict(zip(ind.e, ind.g.str[:3]))

cols = ['STATE', 'PUMA', 'ADJINC', 'PWGTP', 'WAGP', 'SOCP', 'INDP', 'AGEP', 'SEX', 'SCHL',
        'RAC1P', 'HISP', 'WKHP', 'WKWN', 'COW'] + REPS
out = []
for s in STATES:
    for ch in pd.read_csv(RAW/f'psam_p{s}.csv', usecols=cols, chunksize=300_000,
                          dtype={'STATE': str, 'PUMA': str, 'SOCP': str, 'INDP': str}):
        ch['ST'] = ch.STATE.str.zfill(2); ch['PUMA'] = ch.PUMA.str.zfill(5)
        ch = ch[(ch.WAGP > 0) & ch.COW.isin([1, 2, 3, 4, 5]) & (ch.AGEP >= 16)]   # wage & salary workers
        out.append(ch.merge(a, on=['ST', 'PUMA']))
d = pd.concat(out, ignore_index=True)

d['wage'] = (d.WAGP * d.ADJINC / 1e6).round().astype('int32')      # 2024 dollars
d['ftyr'] = (d.WKHP >= 35) & (d.WKWN >= 50)
d['soc2'] = d.SOCP.str[:2]
fam_of = {c: f for f, _, codes, _ in FAMILIES for c in codes}
d['fam'] = d.SOCP.map(fam_of)
d['age'] = pd.cut(d.AGEP, [15, 24, 34, 44, 54, 200], labels=False)
d['sex'] = d.SEX - 1
d['educ'] = np.select([d.SCHL <= 15, d.SCHL <= 17, d.SCHL <= 20, d.SCHL == 21], [0, 1, 2, 3], 4)
d['race'] = np.select([d.HISP != 1, d.RAC1P == 1, d.RAC1P == 2, d.RAC1P == 6], [2, 0, 1, 3], 4)
d['ind'] = d.INDP.map(ind_prefix).map(INDUSTRY).map({v: i for i, v in enumerate(DIMS['ind'])})
for c in ['PWGTP'] + REPS:
    d[c] = d[c].astype('int16')
keep = ['CBSA', 'wage', 'ftyr', 'SOCP', 'soc2', 'fam', 'age', 'sex', 'educ', 'race', 'ind', 'PWGTP'] + REPS
d[keep].to_pickle(INTERIM/'workers.pkl')
print(f'{len(d):,} wage earners, {d.ftyr.sum():,} full-time year-round; unmapped industry: {d.ind.isna().sum()}')
