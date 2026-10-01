// Salary Explorer explainer: every frame is a pure function of time t (seconds), so render.mjs can seek to any t
// and screenshot. The real page (docs/index.html) runs in the iframe; this script sets its state, scroll, picker
// panels, tooltips and toasts per frame, and draws captions, a cursor and zooms on top.
// Scene cuts reuse the TaskList promo's beat-matched cuts for the same music track (~116 BPM, 8-beat phrases).
const CUTS = [0, 4.06, 10.81, 16.35, 23.72, 28.37, 32.0, 36.65, 40.53, 45];

// ---------------------------------------------------------------------------
// Helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const E = {out: t => 1 - Math.pow(1 - t, 3), inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)};
const prog = (t, a, b, e = E.inOut) => e(clamp((t - a) / (b - a)));
const win01 = (t, a, b, fi = 0.35, fo = 0.35) => Math.min(prog(t, a, a + fi, E.out), 1 - prog(t, b - fo, b, E.inOut));
const $ = s => document.querySelector(s);
const IF = $('#app'), BASE = 1200 / 1280, VPW = 1200, VPH = 852;
IF.height = Math.ceil(VPH / BASE);

// ---------------------------------------------------------------------------
// Story
const CAPS = [
  // [from, to, eyebrow, title, sub]
  [CUTS[1], CUTS[2], '01 · Search', 'Start with the <em>role</em> you’re hiring', 'Type any job title. The explorer finds the closest match, even without an exact one.'],
  [CUTS[2], CUTS[3], '02 · Baseline', 'Get a <em>defensible</em> number', 'Median pay with its margin of error, plus a level guide: senior ≈ the 75th percentile.'],
  [CUTS[3], CUTS[4], '03 · Compare', 'See the whole <em>region</em> at a glance', '24 metros on one map, shaded by median. Tap a city to drill in.'],
  [CUTS[4], CUTS[5], '04 · Validate', 'Cross-check <em>employer</em> rates', 'BLS May 2025 market data sits alongside, in gold.'],
  [CUTS[5], CUTS[6], '05 · Pool', 'Blend markets for <em>hybrid</em> teams', 'Select several metros or roles for one combined figure.'],
  [CUTS[6], CUTS[7], '06 · Segment', 'Cut by <em>experience</em>', 'Break pay down by age, education, industry and more.'],
  [CUTS[7], CUTS[8], '07 · Share', 'Share the view or <em>export</em> it', 'One link reopens the exact view. Every chart downloads as CSV.'],
];
const Q = 'Senior software engineer';
const BASE_STATE = {metro: ['17140'], disc: ['tech'], split: 'fam'};
const STATES = [   // [from time, state]  (applied through the page's own state + render path)
  [0, BASE_STATE],
  [8.35, {metro: ['17140'], disc: ['fam:swdev'], split: 'fam', q: Q}],
  [21.05, {metro: ['18140'], disc: ['fam:swdev'], split: 'fam', q: Q}],
  [29.75, {metro: ['18140', '17140'], disc: ['fam:swdev'], split: 'fam', q: Q}],
  [30.35, {metro: ['18140', '17140', '19430'], disc: ['fam:swdev'], split: 'fam', q: Q}],
  [33.65, {metro: ['18140', '17140', '19430'], disc: ['fam:swdev'], split: 'age', q: Q}],
];
// Picker panels and typed text
const ROLE_OPEN = [5.25, 8.35], TYPE = [5.6, 7.3];
const METRO_OPEN = [29.05, 30.85];
// Scroll targets: [from, to, target]  target = selector in the app (scrolled to its top) or a number
const SCROLLS = [
  [8.45, 9.55, '#hero'],
  [16.45, 17.3, '#sec-region'],
  [21.35, 22.35, '#hero'],
  [23.8, 24.75, '#sec-ref'],
  [28.4, 28.95, '#hero'],
  [32.05, 32.95, '#sec-split'],
  [36.7, 37.35, 0],
];
// Zoom on the detail card: in on the median, pan to the level guide, back out.
const ZOOM = {inA: 10.95, inB: 11.75, panA: 13.15, panB: 13.95, outA: 15.2, outB: 15.9, scale: 1.32, from: '#hero .big', to: '#hero .levels'};
// Tooltips: [from, to, selector]
const TIPS = [
  [17.85, 19.05, '.mk[data-pick="26900"]'],
  [19.6, 20.95, '.mk[data-pick="18140"]'],
  [25.35, 27.9, '#ref-body .rows li:first-child'],
];
const TOASTS = [[38.05, 39.35, 'Link copied — it opens this exact view'], [39.5, 40.5, 'CSV downloaded']];
// Cursor waypoints: [time, selector | [x, y] in stage px, click?]
const CURSOR = [
  [4.3, [1500, 1000]],
  [5.0, '#ms-disc .ms-btn', true],
  [5.6, '#role-q'],
  [7.4, '#role-q'],
  [8.0, '#role-res .rs-hit.top', true],
  [9.6, [1650, 760]],
  [17.4, [1500, 700]],
  [17.85, '.mk[data-pick="26900"]'],
  [19.1, '.mk[data-pick="26900"]'],
  [19.6, '.mk[data-pick="18140"]'],
  [20.95, '.mk[data-pick="18140"]', true],
  [22.4, [1700, 820]],
  [25.1, [1500, 560]],
  [25.35, '#ref-body .rows li:first-child .bar'],
  [27.9, '#ref-body .rows li:first-child .bar'],
  [28.6, [1100, 300]],
  [29.0, '#ms-metro .ms-btn', true],
  [29.7, '#ms-metro-p input[value="17140"]', true],
  [30.3, '#ms-metro-p input[value="19430"]', true],
  [30.8, [1500, 380], true],
  [31.9, [1520, 420]],
  [33.0, [1520, 420]],
  [33.6, '#pills [data-split="age"]', true],
  [36.6, [1400, 700]],
  [37.95, '#copylink', true],
  [39.0, '#copylink'],
  [39.45, '#sec-region [data-csv="metros"]', true],
  [40.6, '#sec-region [data-csv="metros"]'],
];

// ---------------------------------------------------------------------------
// Static elements
$('#title').innerHTML = `<p class="eb">For engineering &amp; technology leaders</p><h1>Baseline pay for <em>any new role</em></h1>
  <p>Market salary data for 24 metros around Cincinnati, in under a minute.</p>`;
$('#end').innerHTML = `<p class="eb">Cincinnati Region Salary Explorer</p><h1>Set a salary baseline<br><em>in minutes</em>, not weeks.</h1>
  <div class="pill">robh0369.github.io/CompStudies</div>
  <div class="src">Free · Census ACS 2020–24 + BLS OEWS May 2025 · 24 metros · 7 tech role families</div>`;
const capEls = CAPS.map(([, , eb, title, sub]) => {
  const d = document.createElement('div'); d.className = 'cap';
  d.innerHTML = `<p class="eb">${eb}</p><h2>${title}</h2><p>${sub}</p>`;
  return $('#caption').appendChild(d);
});
const stepEls = CAPS.map(() => $('#steps').appendChild(document.createElement('i')));

// ---------------------------------------------------------------------------
// App bridge: a script injected into the page can reach its top-level let/const bindings (S, DEFAULT, …).
let A = null, AW = null;
window.ready = new Promise(res => {
  const boot = () => {
    AW = IF.contentWindow; const d = IF.contentDocument;
    const st = d.createElement('style');
    st.textContent = '*{transition:none!important;animation:none!important;scroll-behavior:auto!important;caret-color:transparent!important}html{overflow:hidden}';
    d.head.appendChild(st);
    const fl = d.createElement('link'); fl.rel = 'stylesheet'; fl.href = new URL('fonts.css', location.href).href; d.head.appendChild(fl);
    const sc = d.createElement('script');
    sc.textContent = `window.removeEventListener('scroll', hideTip);   // the stage scrolls every frame
    window.__demo = {
      set(o){ S = normalize(Object.assign(DEFAULT(), JSON.parse(JSON.stringify(o)))); writeHash(); render(); },
      panel(key, open){ const p = PICKERS[key]; p.panel.hidden = !open; p.btn.setAttribute('aria-expanded', String(open)); },
      query(text){ const i = document.getElementById('role-q'); if (i.value !== text){ i.value = text; renderRoleResults(); } },
      tip(sel){ const el = sel && document.querySelector(sel); el ? showTip(el) : hideTip(); },
      toast(text){ const el = document.getElementById('toast'); el.textContent = text || ''; el.classList.toggle('show', !!text); },
    };`;
    d.body.appendChild(sc);
    A = AW.__demo;
    Promise.all([document.fonts.ready, d.fonts.ready, d.fonts.load('800 20px "Plus Jakarta Sans"'), d.fonts.load('600 20px "Inter"')]).then(res);
  };
  if (IF.contentDocument && IF.contentDocument.readyState === 'complete' && IF.contentWindow.render) boot(); else IF.addEventListener('load', boot);
});

// ---------------------------------------------------------------------------
// Per-frame application
let lastKey = '', lastPanels = '', lastQuery = null, lastTip = '', lastToast = '';
const at = (list, t) => { let v = list[0][1]; for (const [s, x] of list) if (t >= s) v = x; return v; };
function appTop(sel){ const el = AW.document.querySelector(sel); return el ? el.getBoundingClientRect().top + AW.scrollY - 14 : 0; }
function scrollAt(t){
  let y = 0;
  for (const [a, b, target] of SCROLLS){
    const to = typeof target === 'number' ? target : appTop(target);
    if (t >= b) y = to; else if (t > a) { y = lerp(y, to, prog(t, a, b)); break; } else break;
  }
  return Math.max(0, Math.min(y, AW.document.documentElement.scrollHeight - AW.innerHeight));
}
// Point of an app element (center) in stage px, accounting for scroll and zoom (getBoundingClientRect includes transforms).
function stagePoint(target){
  if (Array.isArray(target)) return target;
  const el = AW.document.querySelector(target); if (!el) return [960, 540];
  const r = el.getBoundingClientRect(), f = IF.getBoundingClientRect(), s = f.width / IF.width;
  return [f.left + (r.left + Math.min(r.width / 2, 60)) * s, f.top + (r.top + r.height / 2) * s];
}
function applyZoom(t){
  const Z = ZOOM;
  if (t < Z.inA || t > Z.outB){ IF.style.transform = `scale(${BASE})`; return; }
  const k = prog(t, Z.inA, Z.inB) * (1 - prog(t, Z.outA, Z.outB)), s = lerp(1, Z.scale, k), sc = BASE * s;
  const c = sel => { const r = AW.document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const a = c(Z.from), b = c(Z.to), m = prog(t, Z.panA, Z.panB), fx = lerp(a[0], b[0], m), fy = lerp(a[1], b[1], m);
  let dx = lerp(fx * BASE, VPW / 2, k) - fx * sc, dy = lerp(fy * BASE, VPH / 2, k) - fy * sc;
  dx = Math.min(0, Math.max(VPW - IF.width * sc, dx)); dy = Math.min(0, Math.max(VPH - IF.height * sc, dy));
  IF.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
}
function applyApp(t){
  const st = at(STATES, t), key = JSON.stringify(st);
  if (key !== lastKey){ A.set(st); lastKey = key; lastTip = ''; }
  const role = t >= ROLE_OPEN[0] && t < ROLE_OPEN[1], metro = t >= METRO_OPEN[0] && t < METRO_OPEN[1], pk = `${role}|${metro}`;
  if (pk !== lastPanels){ A.panel('disc', role); A.panel('metro', metro); lastPanels = pk; }
  const q = t < TYPE[0] ? '' : Q.slice(0, Math.round(Q.length * prog(t, TYPE[0], TYPE[1], x => x)));
  if (role && q !== lastQuery){ A.query(q); lastQuery = q; }
  AW.scrollTo(0, scrollAt(t));
  applyZoom(t);
  const tip = (TIPS.find(([a, b]) => t >= a && t < b) || [])[2] || '';
  if (tip !== lastTip || tip){ A.tip(tip); lastTip = tip; }
  const toast = (TOASTS.find(([a, b]) => t >= a && t < b) || [])[2] || '';
  if (toast !== lastToast){ A.toast(toast); lastToast = toast; }
}
function applyCursor(t){
  const c = $('#cursor');
  let i = CURSOR.findIndex(w => w[0] > t);
  if (i === -1) i = CURSOR.length;
  const prev = CURSOR[Math.max(0, i - 1)], next = CURSOR[Math.min(i, CURSOR.length - 1)];
  const p0 = stagePoint(prev[1]), p1 = stagePoint(next[1]);
  const p = i === 0 || i === CURSOR.length ? 0 : prog(t, prev[0], next[0]);
  const vis = win01(t, CUTS[1] + 0.2, CUTS[8], 0.4, 0.4);
  c.style.transform = `translate(${lerp(p0[0], p1[0], p)}px, ${lerp(p0[1], p1[1], p)}px)`;
  c.style.opacity = vis;
  const click = CURSOR.filter(w => w[2] && t >= w[0] && t < w[0] + 0.45).pop();
  const rp = click ? (t - click[0]) / 0.45 : 1, rip = c.querySelector('.ripple');
  rip.style.opacity = click ? 1 - rp : 0; rip.style.transform = `scale(${0.4 + rp})`;
  c.querySelector('svg').style.transform = click && rp < 0.3 ? 'scale(.88)' : '';
}

window.renderAt = function(t){
  // title card
  const ti = win01(t, 0, CUTS[1] + 0.1, 0.6, 0.55);
  $('#title').style.opacity = ti; $('#title').style.transform = `translateY(${(1 - prog(t, 0, 0.9, E.out)) * 30}px)`;
  // window in/out
  const wIn = prog(t, CUTS[1] - 0.35, CUTS[1] + 0.55, E.out), wOut = prog(t, CUTS[8], CUTS[8] + 0.7);
  const win = $('#win');
  win.style.opacity = wIn * (1 - wOut);
  win.style.transform = `translateX(${(1 - wIn) * 140}px) translateY(${wOut * 60}px) scale(${1 - wOut * 0.06})`;
  // captions
  CAPS.forEach(([a, b], i) => {
    const o = win01(t, a + 0.05, b + 0.05, 0.45, 0.3), el = capEls[i];
    el.style.opacity = o; el.style.transform = `translateY(${(1 - prog(t, a + 0.05, a + 0.6, E.out)) * 26}px)`;
    stepEls[i].className = t >= a && t < b ? 'on' : t >= b ? 'done' : '';
  });
  const chromeVis = win01(t, CUTS[1] - 0.2, CUTS[8] + 0.2, 0.4, 0.4);
  $('#steps').style.opacity = chromeVis; $('.brand').style.opacity = chromeVis;
  // end card
  const en = prog(t, CUTS[8] + 0.35, CUTS[8] + 1.2, E.out);
  $('#end').style.opacity = en; $('#end').style.transform = `translateY(${(1 - en) * 30}px)`;
  // app
  if (A && t > CUTS[1] - 0.5 && t < CUTS[8] + 0.8) applyApp(t);
  applyCursor(t);
};
window.CUTS = CUTS;
