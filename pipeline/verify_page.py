"""Check the built page's JavaScript estimator against the Python reference values.

Needs only docs/index.html and data/web/js_check.json (both committed) plus Node.js, so it runs on a fresh clone.
Usage: python3 pipeline/verify_page.py
"""
import json, re, shutil, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
html = (ROOT/'docs/index.html').read_text()
ref = json.load(open(ROOT/'data/web/js_check.json'))
if not shutil.which('node'):
    sys.exit('node not found: install Node.js to run the check')
data = re.search(r'<script id="data" type="application/json">(.*?)</script>', html, re.S).group(1).replace('<\\/', '</')
js = re.search(r'<script>\n(.*?)\n/\* ---------- state', html, re.S).group(1)
js = js.replace("JSON.parse(document.getElementById('data').textContent)", "JSON.parse(require('fs').readFileSync(0,'utf8'))")
js += """
const out = {};
FAM.forEach(f => { out[f.id] = estimateRows(microSelect({w:'ftyr', metro:'17140', disc:'fam:' + f.id, age:-1, sex:-1, educ:-1, race:-1, ind:-1})); });
out._cube = cubeGet('ftyr', '17140', 'ALL', '-', '-');
console.log(JSON.stringify(out));"""
res = json.loads(subprocess.run(['node', '-'], input=js.replace("require('fs').readFileSync(0,'utf8')", json.dumps(data)),
                                capture_output=True, text=True, check=True).stdout)
bad = []
for f, r in ref.items():
    j = res[f]
    ok = j['n'] == r['n'] and abs(j['q'][2] - r['p50']) < 0.5 and abs(j['moe'][2] - r['moe50']) < 0.5
    print(f"{'ok  ' if ok else 'FAIL'} {f:8s} n={j['n']:<5} median=${j['q'][2]:,.0f} ±${j['moe'][2]:,.0f}")
    bad += [] if ok else [f]
c = res['_cube']; print(f"ok   cube     all occupations, Cincinnati FTYR: n={c['n']} median=${c['q'][2]:,.0f}")
size = (ROOT/'docs/index.html').stat().st_size / 1e6
print(f"page size {size:.2f} MB (limit 16 MB for claude.ai; GitHub Pages is fine)")
sys.exit(1 if bad else 0)
