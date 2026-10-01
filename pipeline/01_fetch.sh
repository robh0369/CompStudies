#!/usr/bin/env bash
# Download raw inputs into data/raw/. ~170 MB of PUMS zips; OEWS is streamed and filtered.
set -euo pipefail
cd "$(dirname "$0")/../data/raw"
# BLS rejects anonymous agents; identify yourself per https://www.bls.gov/bls/pss.htm
UA="${BLS_USER_AGENT:-salary-explorer (set BLS_USER_AGENT to your email)}"
PUMS=https://www2.census.gov/programs-surveys/acs/data/pums/2024/5-Year
for s in oh ky in wv; do curl -sfO "$PUMS/csv_p$s.zip"; unzip -oq "csv_p$s.zip" 'psam_p*.csv'; done
curl -sfo PUMS_Data_Dictionary_2020-2024.csv \
  https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2020-2024.csv
curl -sfO https://www2.census.gov/geo/docs/maps-data/data/rel2020/2020_Census_Tract_to_2020_PUMA.txt
for st in 39 21 18 54; do
  curl -sfO https://www2.census.gov/geo/docs/reference/cenpop2020/tract/CenPop2020_Mean_TR$st.txt
done
curl -sfO https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx
OE=https://download.bls.gov/pub/time.series/oe
for f in oe.release oe.area oe.occupation oe.datatype; do curl -sf -A "$UA" -o $f "$OE/$f"; done
# Keep only metro (areatype M), cross-industry series for OH/KY/IN/WV-area metros (filtered again in 04)
curl -sf -A "$UA" "$OE/oe.data.0.Current" | grep -E '^OEUM00[0-9]{5}000000' > oe_metro_all.txt
# OEWS May releases 2019-2024, metro files (May 2025 comes from the time-series files above). Trend view only.
for yy in 19 20 21 22 23 24; do curl -sf -A "$UA" -o oesm${yy}ma.zip "https://www.bls.gov/oes/special-requests/oesm${yy}ma.zip"; done
echo "fetched: $(ls | wc -l) files"
