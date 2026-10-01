"""Rebuild docs/index.html from web/template.html, reusing the data already inlined in the current page.

For design-only changes on a fresh clone: no data/interim/ or raw downloads needed. Runs verify_page.py afterwards.
Usage: python3 pipeline/apply_template.py   (or: make template)
"""
import re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
page = ROOT/'docs/index.html'
m = re.search(r'<script id="data" type="application/json">(.*?)</script>', page.read_text(), re.S)
if not m:
    sys.exit('no inlined data found in docs/index.html: run make page after a full build instead')
tpl = (ROOT/'web/template.html').read_text()
if tpl.count('__DATA__') != 1:
    sys.exit('web/template.html must contain exactly one __DATA__ placeholder')
geo = (ROOT/'data/web/geo.json').read_text().replace('</', '<\\/')
page.write_text(tpl.replace('__GEO__', geo).replace('__DATA__', m.group(1)))
print('docs/index.html rebuilt from template')
subprocess.run([sys.executable, str(ROOT/'pipeline/verify_page.py')], check=True)
