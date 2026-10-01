"""OEWS May 2019-2024 metro estimates (cross-industry), plus May 2025 from 04_oews.py, for the trend view's BLS line.

Reads data/raw/oesm{yy}ma.zip (BLS "special requests" annual metro files). Column names vary in case across years and
some values are flagged ('*' not published, '#' at or above the top-code), which become blank. Writes
data/oews_history_metros.csv: year, cbsa, occ, employment, p10, p25, p50, p75, p90 (nominal dollars).
"""
import io, zipfile, pandas as pd
from config import *

m = pd.read_csv(GEO/'metros.csv', dtype={'cbsa': str})
need = {'000000'} | {k + '0000' for k in SOC_GROUPS} | {c for *_, o in FAMILIES for c in o}
COLS = {'AREA': 'cbsa', 'OCC_CODE': 'occ', 'TOT_EMP': 'employment', 'A_PCT10': 'p10', 'A_PCT25': 'p25',
        'A_MEDIAN': 'p50', 'A_PCT75': 'p75', 'A_PCT90': 'p90'}
frames = []
for year in OEWS_YEARS[:-1]:
    z = zipfile.ZipFile(RAW/f'oesm{str(year)[2:]}ma.zip')
    name = next(n for n in z.namelist() if n.lower().endswith(('.xlsx', '.xls')) and 'msa' in n.lower() and 'nonmsa' not in n.lower())
    x = pd.read_excel(io.BytesIO(z.read(name)), dtype=str)
    x.columns = [c.upper() for c in x.columns]
    x = x[list(COLS)].rename(columns=COLS)
    x['cbsa'] = x.cbsa.str.strip().str[-5:].replace(OEWS_AREA_ALIAS)
    x['occ'] = x.occ.str.replace('-', '', regex=False)
    x = x[x.cbsa.isin(m.cbsa) & x.occ.isin(need)].copy()
    for c in ['employment', 'p10', 'p25', 'p50', 'p75', 'p90']:
        x[c] = pd.to_numeric(x[c].str.replace(',', ''), errors='coerce')
    x['year'] = year
    frames.append(x)
    print(year, name, len(x), 'rows;', x.cbsa.nunique(), 'of', len(m), 'metros')
cur = pd.read_csv(DATA/'oews_may2025_metros.csv', dtype={'cbsa': str, 'occ': str})
cur = cur[cur.occ.isin(need)].drop(columns='occupation').assign(year=OEWS_YEARS[-1])
h = pd.concat(frames + [cur], ignore_index=True)[['year', 'cbsa', 'occ', 'employment', 'p10', 'p25', 'p50', 'p75', 'p90']]
h.to_csv(DATA/'oews_history_metros.csv', index=False)
print(len(h), 'rows written; metros missing in some year:', sorted(set(m.cbsa) - set.intersection(*[set(f.cbsa) for f in frames])))
