"""Shared definitions for the Cincinnati-region salary explorer pipeline."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW, INTERIM, DATA, GEO = ROOT / 'data/raw', ROOT / 'data/interim', ROOT / 'data', ROOT / 'data/geo'

STATES = ['39', '21', '18', '54']            # OH, KY, IN, WV
CINCY = (39.1031, -84.5120)                   # downtown Cincinnati
RADIUS_MI = 181                               # 180 mi; Bowling Green / Evansville sit at 179.9
PUMA_ASSIGN_SHARE = 0.5                       # PUMA joins a metro if >=50% of its 2020 pop is inside
FIT_FLAG = 0.85                               # flag metros whose PUMA coverage or purity is below this
BIG4 = ['17140', '18140', '26900', '31140']   # Cincinnati, Columbus, Indianapolis, Louisville
SMALL_ID, REGION_ID = 'SMALL', 'REGION'

REPS = [f'PWGTP{i}' for i in range(1, 81)]
QS = [0.10, 0.25, 0.50, 0.75, 0.90]
MIN_N = 30                                    # suppress below this
CAUTION_N, CAUTION_REL = 100, 30              # caution if n<100 or median MOE >30% of median

# Tech families: (id, label, ACS PUMS SOCP codes, OEWS occupations used as market reference)
FAMILIES = [
    ('swdev',   'Software development', ['151252', '151251', '151253', '151221'],
                ['151252', '151253', '151251', '151221']),
    ('data',    'Data & analytics',     ['1520XX', '152031', '15124X'],
                ['152051', '152041', '152031', '151242', '151243']),
    ('cyber',   'Cybersecurity',        ['151212'], ['151212']),
    ('netsys',  'Network & systems',    ['151241', '151244', '151211', '151299'],
                ['151211', '151244', '151241', '151299']),
    ('support', 'IT support',           ['151230'], ['151232', '151231']),
    ('itmgmt',  'IT management',        ['113021'], ['113021']),
    ('webux',   'Web & UX',             ['151254', '151255'], ['151255', '151254']),
]

SOC_GROUPS = {  # SOC 2-digit major group -> label (matches OEWS XX0000)
    '11': 'Management', '13': 'Business & financial', '15': 'Computer & mathematical',
    '17': 'Architecture & engineering', '19': 'Life, physical & social science',
    '21': 'Community & social service', '23': 'Legal', '25': 'Education & library',
    '27': 'Arts, design, entertainment & media', '29': 'Healthcare practitioners',
    '31': 'Healthcare support', '33': 'Protective service', '35': 'Food preparation & serving',
    '37': 'Building & grounds maintenance', '39': 'Personal care & service', '41': 'Sales',
    '43': 'Office & administrative support', '45': 'Farming, fishing & forestry',
    '47': 'Construction & extraction', '49': 'Installation, maintenance & repair',
    '51': 'Production', '53': 'Transportation & material moving'}

INDUSTRY = {  # PUMS INDP label prefix -> display group
    'AGR': 'Agriculture & mining', 'EXT': 'Agriculture & mining', 'UTL': 'Utilities',
    'CON': 'Construction', 'MFG': 'Manufacturing', 'WHL': 'Wholesale trade', 'RET': 'Retail trade',
    'TRN': 'Transportation & warehousing', 'INF': 'Information',
    'FIN': 'Finance, insurance & real estate', 'PRF': 'Professional, scientific & technical',
    'ADM': 'Administrative & support services', 'EDU': 'Educational services',
    'MED': 'Health care & social assistance', 'SCA': 'Health care & social assistance',
    'ENT': 'Arts, recreation, lodging & food', 'SRV': 'Other services',
    'MIL': 'Public administration & military'}

DIMS = {  # dimension -> ordered category labels
    'age':  ['16–24', '25–34', '35–44', '45–54', '55+'],
    'sex':  ['Men', 'Women'],
    'educ': ['Less than high school', 'High school or GED', 'Some college or associate',
             'Bachelor’s', 'Graduate degree'],
    'race': ['White', 'Black', 'Hispanic (any race)', 'Asian', 'Other or multiracial'],
    'ind':  list(dict.fromkeys(INDUSTRY.values())),
}
