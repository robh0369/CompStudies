// Build data/web/geo.json for the page's map: state outlines (projected SVG paths) and a marker point per metro.
// Inputs come from npm (census.gov / CDNs may be blocked):  npm pack us-atlas@3 cities.json topojson-client@3, untar each.
// Usage: node pipeline/make_geo.mjs <dir containing the unpacked packages>
// Marker = the metro's first-named principal city (GeoNames via cities.json); outlines = Census cartographic boundaries (us-atlas).
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const dir = process.argv[2], root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const find = n => path.join(dir, fs.readdirSync(dir).find(d => d.startsWith(n) && !d.endsWith('.tgz')), 'package');
const topo = createRequire(import.meta.url)(path.join(find('topojson-client'), 'dist/topojson-client.js'));
const us = JSON.parse(fs.readFileSync(path.join(find('us-atlas'), 'states-10m.json')));
const cities = JSON.parse(fs.readFileSync(path.join(find('cities.json'), 'cities.json'))).filter(c => c.country === 'US');
// Equirectangular projection scaled by cos(latitude) at the region's middle; plenty accurate for ~600 miles.
const LON0 = -84.3, LAT0 = 39.3, K = Math.cos(LAT0 * Math.PI / 180), S = 100;
const proj = ([lon, lat]) => [+((lon - LON0) * K * S).toFixed(1), +((LAT0 - lat) * S).toFixed(1)];
const BOX = {lon: [-89.6, -79.2], lat: [36.0, 42.6]};
const NAMES = {39: 'Ohio', 21: 'Kentucky', 18: 'Indiana', 54: 'West Virginia'};
const NEAR = ['17', '26', '42', '47', '51', '24', '29', '36', '37', '13', '01', '28', '05', '19', '55', '11', '10', '34'];
const ring = r => { let d = '', prev = null; r.map(proj).forEach((p, i) => { if (prev && p[0] === prev[0] && p[1] === prev[1]) return; d += (i ? 'L' : 'M') + p[0] + ' ' + p[1]; prev = p; }); return d + 'Z'; };
const states = [];
for (const f of topo.feature(us, us.objects.states).features){
  if (!(f.id in NAMES) && !NEAR.includes(f.id)) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const keep = polys.filter(p => p[0].some(([lon, lat]) => lon > BOX.lon[0] && lon < BOX.lon[1] && lat > BOX.lat[0] && lat < BOX.lat[1]));
  if (keep.length) states.push({id: f.id, name: NAMES[f.id] || f.properties.name, core: f.id in NAMES, d: keep.map(p => p.map(ring).join('')).join('')});
}
const metros = fs.readFileSync(path.join(root, 'data/geo/metros.csv'), 'utf8').trim().split('\n').slice(1).map(l => {
  const [cbsa, name] = l.match(/^(\d+),"([^"]+)"/).slice(1);
  const city = name.split(/[-/,]/)[0].trim(), st = name.split(', ')[1].slice(0, 2);
  const hit = cities.filter(c => c.name === city && c.admin1 === st);
  if (hit.length !== 1) throw new Error(`${name}: ${hit.length} matches`);
  const [x, y] = proj([+hit[0].lng, +hit[0].lat]);
  return {id: cbsa, city: `${city}, ${st}`, x, y};
});
const [x0, y1] = proj([BOX.lon[0], BOX.lat[0]]), [x1, y0] = proj([BOX.lon[1], BOX.lat[1]]);
const labels = [['OHIO', -82.55, 40.55], ['INDIANA', -86.45, 40.25], ['KENTUCKY', -84.9, 37.45], ['WEST VIRGINIA', -80.75, 38.55],
  ['MICHIGAN', -85.3, 42.35], ['ILLINOIS', -88.85, 39.1], ['TENNESSEE', -86.0, 36.2], ['PENNSYLVANIA', -79.75, 41.2], ['VIRGINIA', -80.4, 37.0]]
  .map(([t, lon, lat]) => { const [x, y] = proj([lon, lat]); return {t, x, y, core: !['MICHIGAN', 'ILLINOIS', 'TENNESSEE', 'PENNSYLVANIA', 'VIRGINIA'].includes(t)}; });
// 180-mile radius around downtown Cincinnati, in projected units (1 degree latitude = 69.0 miles)
const out = {view: [x0, y0, +(x1 - x0).toFixed(1), +(y1 - y0).toFixed(1)], states, metros, labels, cincy: proj([-84.512, 39.1031]), r180: +(180 / 69.0 * S).toFixed(1)};
fs.writeFileSync(path.join(root, 'data/web/geo.json'), JSON.stringify(out));
console.log(`geo.json: ${states.length} states, ${metros.length} metros, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
