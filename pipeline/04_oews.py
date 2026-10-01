"""OEWS May 2025 metro estimates (cross-industry) for the selected metros."""
import pandas as pd
from config import *

rel = open(RAW/'oe.release').read()
assert 'May 2025' in rel, rel
m = pd.read_csv(GEO/'metros.csv', dtype={'cbsa': str})
o = pd.read_csv(RAW/'oe_metro_all.txt', sep='\t', header=None, names=['sid', 'yr', 'per', 'val', 'fn'], dtype=str)
o['sid'] = o.sid.str.strip()
o['cbsa'] = o.sid.str[6:11]; o['occ'] = o.sid.str[17:23]; o['dt'] = o.sid.str[23:25]
o = o[o.cbsa.isin(m.cbsa) & o.dt.isin(['01', '11', '12', '13', '14', '15'])]
o['val'] = pd.to_numeric(o.val.str.strip(), errors='coerce')
w = o.pivot_table(index=['cbsa', 'occ'], columns='dt', values='val').reset_index()
w = w.rename(columns={'01': 'employment', '11': 'p10', '12': 'p25', '13': 'p50', '14': 'p75', '15': 'p90'})
names = pd.read_csv(RAW/'oe.occupation', sep='\t', dtype=str, usecols=[0, 1])
names.columns = ['occ', 'occupation']
w = w.merge(names, on='occ', how='left')
w.to_csv(DATA/'oews_may2025_metros.csv', index=False)
print(len(w), 'metro x occupation rows;', w.cbsa.nunique(), 'metros')
