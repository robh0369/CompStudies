// Salary Explorer explainer: every frame is a pure function of time t (seconds), so render.mjs can seek to any t
// and screenshot. The real page (docs/index.html) runs in the iframe; this script sets its state, scroll, picker
// panels, tooltips and toasts per frame, and draws captions, a cursor and zooms on top.
// Two layouts share the captions and timing: 16:9 (desktop page in a browser window) and 9:16 (?layout=vertical,
// the page's phone layout in a phone frame, with taps instead of a pointer).
// Scene cuts reuse the TaskList promo's beat-matched cuts for the same music track (~116 BPM, 8-beat phrases).
// The trend scene (14.41-17.5) was made room for by moving the Explore, Benchmark and Compare cuts to nearby onsets
// (9.75, 14.41, 17.5); scene timings below are written on the original cuts and remapped by retime().
const CUTS = [0, 4.06, 9.75, 14.41, 17.5, 23.72, 28.37, 32.0, 36.65, 40.53, 45], END = CUTS[CUTS.length - 2];
const REMAP = [[4.06, 10.81, 4.06, 9.75], [10.81, 16.35, 9.75, 14.41], [16.35, 23.72, 17.5, 23.72]];   // old scene -> new
const R = t => { for (const [a, b, c, d] of REMAP) if (t >= a && t < b) return +(c + (t - a) * (d - c) / (b - a)).toFixed(3); return t; };
const V = new URLSearchParams(location.search).get('layout') === 'vertical';
if (V) document.body.classList.add('vertical');

// ---------------------------------------------------------------------------
// Helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const E = {out: t => 1 - Math.pow(1 - t, 3), inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)};
const prog = (t, a, b, e = E.inOut) => e(clamp((t - a) / (b - a)));
const win01 = (t, a, b, fi = 0.35, fo = 0.35) => Math.min(prog(t, a, a + fi, E.out), 1 - prog(t, b - fo, b, E.inOut));
const $ = s => document.querySelector(s);
// Viewport of the page inside the frame, in stage px, and the page width it renders at.
const VP = V ? {w: 860, h: 1200, page: 430} : {w: 1200, h: 852, page: 1280};
const IF = $('#app'), BASE = VP.w / VP.page;
IF.width = VP.page; IF.height = Math.ceil(VP.h / BASE);

// ---------------------------------------------------------------------------
// Story (exploratory framing: understand the market, not fill one req)
const CAPS = [
  // [from, to, eyebrow, title, sub]
  [CUTS[1], CUTS[2], '01 · Explore', 'Look up <em>any role</em>', 'Type a title in plain words. The explorer suggests the closest match.'],
  [CUTS[2], CUTS[3], '02 · Benchmark', 'See the <em>full range</em> of pay', 'Median, margin of error and percentiles. Senior roles sit near the 75th.'],
  [CUTS[3], CUTS[4], '03 · Trend', 'See how pay <em>has moved</em>', 'Each survey year in today’s dollars, beside BLS figures by year.'],
  [CUTS[4], CUTS[5], '04 · Compare', 'Compare <em>markets</em> on the map', '24 metros shaded by median pay. Tap a city to explore it.'],
  [CUTS[5], CUTS[6], '05 · Validate', 'Check against <em>employer</em> data', 'BLS May 2025 rates sit alongside the survey, in gold.'],
  [CUTS[6], CUTS[7], '06 · Combine', 'Pool <em>markets</em> and roles', 'Select several metros or role families for one combined view.'],
  [CUTS[7], CUTS[8], '07 · Segment', 'Slice by <em>experience</em> and more', 'Age, education, industry, gender, race and ethnicity.'],
  [CUTS[8], CUTS[9], '08 · Share', 'Save, share or <em>export</em>', 'A link reopens your exact view. Every chart exports to CSV.'],
];
const Q = 'Senior software engineer';
const S0 = {metro: ['17140'], disc: ['tech'], split: 'fam'};
const SW = {disc: ['fam:swdev'], q: Q};
const POOL = ['18140', '17140', '19430'];

const H = {   // 16:9
  STATES: [[0, S0], [8.35, {...S0, ...SW, metro: ['17140']}], [21.05, {...S0, ...SW, metro: ['18140']}],
    [29.75, {...S0, ...SW, metro: POOL.slice(0, 2)}], [30.35, {...S0, ...SW, metro: POOL}], [33.65, {...S0, ...SW, metro: POOL, split: 'age'}]],
  FILTERS: [], ROLE: [5.25, 8.35], TYPE: [5.6, 7.3], METRO: [29.05, 30.85],
  SCROLLS: [[8.45, 9.55, '#hero'], [16.45, 17.3, '#sec-region'], [21.35, 22.35, '#hero'], [23.8, 24.75, '#sec-ref'],
    [28.4, 28.95, '#hero'], [32.05, 32.95, '#sec-split'], [36.7, 37.35, 0]],
  ZOOM: {inA: 10.95, inB: 11.75, panA: 13.15, panB: 13.95, outA: 15.2, outB: 15.9, scale: 1.32, from: '#hero .big', to: '#hero .levels'},
  TIPS: [[17.85, 19.05, '.mk[data-pick="26900"]'], [19.6, 20.95, '.mk[data-pick="18140"]'], [25.35, 27.9, '#ref-body .rows li:first-child']],
  TOASTS: [[38.05, 39.35, 'Link copied — it opens this exact view'], [39.5, 40.5, 'CSV downloaded']],
  CURSOR: [
    [4.3, [1500, 1000]], [5.0, '#ms-disc .ms-btn', true], [5.6, '#role-q'], [7.4, '#role-q'], [8.0, '#role-res .rs-hit.top', true],
    [9.6, [1650, 760]], [17.4, [1500, 700]], [17.85, '.mk[data-pick="26900"]'], [19.1, '.mk[data-pick="26900"]'],
    [19.6, '.mk[data-pick="18140"]'], [20.95, '.mk[data-pick="18140"]', true], [22.4, [1700, 820]], [25.1, [1500, 560]],
    [25.35, '#ref-body .rows li:first-child .bar'], [27.9, '#ref-body .rows li:first-child .bar'], [28.6, [1100, 300]],
    [29.0, '#ms-metro .ms-btn', true], [29.7, '#ms-metro-p input[value="17140"]', true], [30.3, '#ms-metro-p input[value="19430"]', true],
    [30.8, [1500, 380], true], [31.9, [1520, 420]], [33.0, [1520, 420]], [33.6, '#pills [data-split="age"]', true], [36.6, [1400, 700]],
    [37.95, '#copylink', true], [39.0, '#copylink'], [39.45, '#sec-region [data-csv="metros"]', true], [40.6, '#sec-region [data-csv="metros"]'],
  ],
};
const VT = {   // 9:16, phone layout: filters live in a collapsible card, so taps open it first
  STATES: [[0, S0], [8.35, {...S0, ...SW, metro: ['17140']}], [20.75, {...S0, ...SW, metro: ['18140']}],
    [30.05, {...S0, ...SW, metro: POOL.slice(0, 2)}], [30.55, {...S0, ...SW, metro: POOL}], [33.65, {...S0, ...SW, metro: POOL, split: 'age'}]],
  FILTERS: [[4.85, 8.35], [29.0, 31.05]], ROLE: [5.35, 8.35], TYPE: [5.75, 7.35], METRO: [29.45, 31.05],
  SCROLLS: [[4.95, 5.3, '#filters'], [8.5, 9.5, '#hero'], [12.9, 13.8, '#hero .levels'], [16.45, 17.3, '#sec-region'], [21.1, 22.1, '#hero'],
    [23.8, 24.7, '#sec-ref'], [28.4, 28.9, '#filters'], [31.15, 31.9, '#hero'], [32.05, 32.9, '#sec-split'], [36.7, 37.3, 0]],
  ZOOM: null,
  TIPS: [],
  TOASTS: [[38.05, 39.35, 'Link copied — it opens this exact view'], [39.5, 40.5, 'CSV downloaded']],
  CURSOR: [
    [4.3, [700, 1500]], [4.8, '#ftoggle', true], [5.3, '#ms-disc .ms-btn', true], [5.75, '#role-q'], [7.4, '#role-q'],
    [8.0, '#role-res .rs-hit.top', true], [9.4, [760, 1500]], [17.6, [700, 1300]], [18.6, '.mk[data-pick="26900"]'], [19.4, '.mk[data-pick="26900"]'],
    [20.6, '.mk[data-pick="18140"]', true], [22.2, [760, 1500]], [28.9, '#ftoggle', true], [29.4, '#ms-metro .ms-btn', true],
    [30.0, '#ms-metro-p input[value="17140"]', true], [30.5, '#ms-metro-p input[value="19430"]', true], [31.0, '#ftoggle', true],
    [32.9, [700, 1400]], [33.6, '#pills [data-split="age"]', true], [36.6, [760, 1300]], [37.95, '#copylink', true],
    [39.0, [760, 1000]], [39.45, '#sec-region [data-csv="metros"]', true], [40.6, '#sec-region [data-csv="metros"]'],
  ],
};
// Old-cut times -> new timeline, then the trend scene (written on the new timeline): open the trend from the detail card.
function retime(T){
  const pair = ([a, b, ...x]) => [R(a), R(b), ...x];
  T.STATES = T.STATES.map(([a, x]) => [R(a), x]); T.FILTERS = T.FILTERS.map(pair); T.ROLE = T.ROLE.map(R); T.TYPE = T.TYPE.map(R);
  T.METRO = T.METRO.map(R); T.SCROLLS = T.SCROLLS.map(pair); T.TIPS = T.TIPS.map(pair); T.TOASTS = T.TOASTS.map(pair);
  T.CURSOR = T.CURSOR.map(([a, ...x]) => [R(a), ...x]);
  if (T.ZOOM) for (const k of ['inA', 'inB', 'panA', 'panB', 'outA', 'outB']) T.ZOOM[k] = R(T.ZOOM[k]);
  return T;
}
const TB = '#hero .tools [data-trend]';
retime(H); H.TREND = [15.0, CUTS[4]];
H.CURSOR.push([13.95, [1650, 760]], [14.6, TB], [14.9, TB, true], [15.7, [1330, 590]], [17.2, [1350, 600]]);
retime(VT); VT.TREND = [15.05, CUTS[4]];
VT.SCROLLS.push([14.45, 14.8, '#hero']);
VT.CURSOR.push([14.2, [760, 1500]], [14.7, TB], [14.95, TB, true], [15.6, [780, 1640]], [17.2, [780, 1640]]);
for (const T of [H, VT]){ T.SCROLLS.sort((a, b) => a[0] - b[0]); T.CURSOR.sort((a, b) => a[0] - b[0]); }
const ST = V ? VT : H;

// ---------------------------------------------------------------------------
// Static elements
$('#title').innerHTML = `<p class="eb">Cincinnati region · 24 metros</p><h1>Explore what the <em>region pays</em></h1>
  <p>Salary benchmarks to compare roles, markets and segments.</p>`;
$('#end').innerHTML = `<p class="eb">Cincinnati Region Salary Explorer</p><h1>Explore the market with <em>data</em>,${V ? ' ' : '<br>'}not anecdotes.</h1>
  <div class="pill">robh0369.github.io/CompStudies</div>
  <div class="src">Free · Census ACS 2020–24 + BLS OEWS May 2025${V ? '<br>' : ' · '}24 metros · 7 tech role families</div>`;
const capEls = CAPS.map(([, , eb, title, sub]) => {
  const d = document.createElement('div'); d.className = 'cap';
  d.innerHTML = `<p class="eb">${eb}</p><h2>${title}</h2><p>${sub}</p>`;
  return $('#caption').appendChild(d);
});
const stepEls = CAPS.map(() => $('#steps').appendChild(document.createElement('i')));
if (V) $('#cursor').classList.add('tap');

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
      filters(open){ const f = document.getElementById('filters'); f.classList.toggle('open', open); document.getElementById('ftoggle').setAttribute('aria-expanded', String(open)); },
      query(text){ const i = document.getElementById('role-q'); if (i.value !== text){ i.value = text; renderRoleResults(); } },
      tip(sel){ const el = sel && document.querySelector(sel); el ? showTip(el) : hideTip(); },
      trend(open){ const d = document.getElementById('trend');
        if (open){ const b = document.querySelector('${TB}'); if (b && !d.open){ openTrend(b.dataset.trend); document.activeElement.blur(); } } else if (d.open) d.close(); },
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
let lastKey = '', lastPanels = '', lastQuery = null, lastTip = '', lastToast = '', lastTrend = false;
const at = (list, t) => { let v = list[0][1]; for (const [s, x] of list) if (t >= s) v = x; return v; };
const inAny = (list, t) => list.some(([a, b]) => t >= a && t < b);
function appTop(sel){ const el = AW.document.querySelector(sel); return el ? el.getBoundingClientRect().top + AW.scrollY - 14 : 0; }
function scrollAt(t){
  let y = 0;
  for (const [a, b, target] of ST.SCROLLS){
    const to = typeof target === 'number' ? target : appTop(target);
    if (t >= b) y = to; else if (t > a) { y = lerp(y, to, prog(t, a, b)); break; } else break;
  }
  return Math.max(0, Math.min(y, AW.document.documentElement.scrollHeight - AW.innerHeight));
}
// Point of an app element (center) in stage px, accounting for scroll and zoom (getBoundingClientRect includes transforms).
function stagePoint(target){
  if (Array.isArray(target)) return target;
  const el = AW.document.querySelector(target); if (!el) return V ? [540, 1300] : [960, 540];
  const r = el.getBoundingClientRect(), f = IF.getBoundingClientRect(), s = f.width / IF.width;
  return [f.left + (r.left + Math.min(r.width / 2, 60)) * s, f.top + (r.top + r.height / 2) * s];
}
function applyZoom(t){
  const Z = ST.ZOOM;
  if (!Z || t < Z.inA || t > Z.outB){ IF.style.transform = `scale(${BASE})`; return; }
  const k = prog(t, Z.inA, Z.inB) * (1 - prog(t, Z.outA, Z.outB)), s = lerp(1, Z.scale, k), sc = BASE * s;
  const c = sel => { const r = AW.document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const a = c(Z.from), b = c(Z.to), m = prog(t, Z.panA, Z.panB), fx = lerp(a[0], b[0], m), fy = lerp(a[1], b[1], m);
  let dx = lerp(fx * BASE, VP.w / 2, k) - fx * sc, dy = lerp(fy * BASE, VP.h / 2, k) - fy * sc;
  dx = Math.min(0, Math.max(VP.w - IF.width * sc, dx)); dy = Math.min(0, Math.max(VP.h - IF.height * sc, dy));
  IF.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
}
function applyApp(t){
  const st = at(ST.STATES, t), key = JSON.stringify(st);
  if (key !== lastKey){ A.set(st); lastKey = key; lastTip = ''; lastPanels = ''; }
  const fil = inAny(ST.FILTERS, t), role = t >= ST.ROLE[0] && t < ST.ROLE[1], metro = t >= ST.METRO[0] && t < ST.METRO[1], pk = `${fil}|${role}|${metro}`;
  if (pk !== lastPanels){ A.filters(fil); A.panel('disc', role); A.panel('metro', metro); lastPanels = pk; }
  const q = t < ST.TYPE[0] ? '' : Q.slice(0, Math.round(Q.length * prog(t, ST.TYPE[0], ST.TYPE[1], x => x)));
  if (role && q !== lastQuery){ A.query(q); lastQuery = q; }
  AW.scrollTo(0, scrollAt(t));
  applyZoom(t);
  const tip = (ST.TIPS.find(([a, b]) => t >= a && t < b) || [])[2] || '';
  if (tip !== lastTip || tip){ A.tip(tip); lastTip = tip; }
  const toast = (ST.TOASTS.find(([a, b]) => t >= a && t < b) || [])[2] || '';
  if (toast !== lastToast){ A.toast(toast); lastToast = toast; }
  const tr = t >= ST.TREND[0] && t < ST.TREND[1];
  if (tr !== lastTrend){ A.trend(tr); lastTrend = tr; }
}
function applyCursor(t){
  const c = $('#cursor'), C = ST.CURSOR;
  let i = C.findIndex(w => w[0] > t);
  if (i === -1) i = C.length;
  const prev = C[Math.max(0, i - 1)], next = C[Math.min(i, C.length - 1)];
  const p0 = stagePoint(prev[1]), p1 = stagePoint(next[1]);
  const p = i === 0 || i === C.length ? 0 : prog(t, prev[0], next[0]);
  const vis = win01(t, CUTS[1] + 0.2, END, 0.4, 0.4);
  c.style.transform = `translate(${lerp(p0[0], p1[0], p)}px, ${lerp(p0[1], p1[1], p)}px)`;
  c.style.opacity = vis;
  const click = C.filter(w => w[2] && t >= w[0] && t < w[0] + 0.45).pop();
  const rp = click ? (t - click[0]) / 0.45 : 1, rip = c.querySelector('.ripple');
  rip.style.opacity = click ? 1 - rp : 0; rip.style.transform = `scale(${0.4 + rp})`;
  c.querySelector('svg').style.transform = click && rp < 0.3 ? 'scale(.88)' : '';
  c.classList.toggle('down', !!click && rp < 0.35);
}

window.renderAt = function(t){
  // title card
  const ti = win01(t, 0, CUTS[1] + 0.1, 0.6, 0.55);
  $('#title').style.opacity = ti; $('#title').style.transform = `translateY(${(1 - prog(t, 0, 0.9, E.out)) * 30}px)`;
  // window / phone in and out
  const wIn = prog(t, CUTS[1] - 0.35, CUTS[1] + 0.55, E.out), wOut = prog(t, END, END + 0.7);
  const win = $('#win');
  win.style.opacity = wIn * (1 - wOut);
  win.style.transform = V ? `translateY(${(1 - wIn) * 160 + wOut * 80}px) scale(${1 - wOut * 0.06})`
    : `translateX(${(1 - wIn) * 140}px) translateY(${wOut * 60}px) scale(${1 - wOut * 0.06})`;
  // captions
  CAPS.forEach(([a, b], i) => {
    const o = win01(t, a + 0.05, b + 0.05, 0.45, 0.3), el = capEls[i];
    el.style.opacity = o; el.style.transform = `translateY(${(1 - prog(t, a + 0.05, a + 0.6, E.out)) * 26}px)`;
    stepEls[i].className = t >= a && t < b ? 'on' : t >= b ? 'done' : '';
  });
  const chromeVis = win01(t, CUTS[1] - 0.2, END + 0.2, 0.4, 0.4);
  $('#steps').style.opacity = chromeVis; $('.brand').style.opacity = chromeVis;
  // end card
  const en = prog(t, END + 0.35, END + 1.2, E.out);
  $('#end').style.opacity = en; $('#end').style.transform = `translateY(${(1 - en) * 30}px)`;
  // app
  if (A && t > CUTS[1] - 0.5 && t < END + 0.8) applyApp(t);
  applyCursor(t);
};
window.CUTS = CUTS;
