# Full rebuild: make all   (needs ~2 GB disk for raw PUMS, Python 3.11+, Node for the parity check)
all: fetch build
fetch:
	pipeline/01_fetch.sh
build:
	cd pipeline && python3 02_crosswalk.py && python3 03_extract_pums.py && python3 04_oews.py && \
	python3 05_estimates.py && python3 06_tech_microdata.py && python3 07_build_page.py
page:
	cd pipeline && python3 07_build_page.py
template:
	python3 pipeline/apply_template.py
verify:
	python3 pipeline/verify_page.py
.PHONY: all fetch build page template verify
