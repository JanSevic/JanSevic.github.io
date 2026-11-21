// Stáhne z otevřených dat ČSÚ počet obyvatel Česka podle pohlaví a jednotek věku
// (datová sada OBY02B) a uloží nejnovější stav do src/sim/data/stav.json.
// Spouští se jednou týdně z GitHub Actions. Když se data nepodaří přečíst,
// skončí chybou a soubor nechá beze změny, takže web dál běží se starými daty.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';

const SRC = 'https://data.csu.gov.cz/opendata/sady/OBY02B/distribuce/csv';
const OUT = new URL('../src/sim/data/stav.json', import.meta.url);

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Soubor má stovky MB (všechna území a roky), čteme ho proto po řádcích
// a necháváme jen řádky za celé Česko.
const res = await fetch(SRC);
if (!res.ok) throw new Error(`ČSÚ vrátil ${res.status}`);
let head = null; const rows = []; let n = 0;
for await (const line of createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity })) {
  if (!head) { head = parseCsv(line.replace(/^\uFEFF/, ''))[0]; continue; }
  n++;
  if (n <= 3) console.log('Řádek:', line);
  if (line.includes('Česk') || line.includes('ČR')) rows.push(parseCsv(line)[0]);
}
console.log('Řádků celkem:', n, 'z toho s Českem:', rows.length);
const col = (name) => { const i = head.indexOf(name); if (i < 0) throw new Error(`Chybí sloupec ${name}; hlavička: ${head.join(' | ')}`); return i; };
const cU = col('Ukazatel'), cP = col('Pohlaví'), cV = col('Věk (roky)'), cR = col('Rok'), cT = col('CasRB'), cH = col('Hodnota');
const CESKO = /^(Česko|Česká republika|ČR)$/;

console.log('Hlavička:', head.join(' | '));

// Řádky za celý stát: některá z územních buněk je „Česko“; stejný údaj může být v souboru
// víckrát (v různých územních členěních), proto každou kombinaci bereme jen jednou.
const seen = new Set();
const stat = rows.filter((r) => {
  if (r.length !== head.length || !r.some((c, i) => i !== cH && CESKO.test(c.trim()))) return false;
  const k = [r[cU], r[cP], r[cV], r[cR], r[cT]].join('|'); if (seen.has(k)) return false; seen.add(k); return true;
});
console.log('Řádků za stát:', stat.length);
const casy = [...new Set(stat.map((r) => `${r[cU]} | ${r[cR]} | ${r[cT]}`))].sort();
console.log('Ukazatele a období (posledních 8):', casy.slice(-8));

// Nejnovější období: podle roku, při shodě dáme přednost stavu k 31. 12.
const klic = (r) => { const y = +(String(r[cR]).match(/\d{4}/) || [0])[0]; const kd = /31\.\s*12|12-31/.test(r[cU] + r[cT]) ? 2 : /1\.\s*7|07-01/.test(r[cU] + r[cT]) ? 0 : 1; return y * 10 + kd; };
const best = Math.max(...stat.map(klic));
const vyb = stat.filter((r) => klic(r) === best);
const M = new Array(101).fill(0), F = new Array(101).fill(0);
for (const r of vyb) {
  const m = String(r[cV]).match(/^\s*(\d+)/); if (!m) continue; // přeskočí „celkem“ apod.
  if (/[-–]/.test(r[cV]) && !/a více|\+/.test(r[cV])) continue; // věkové skupiny
  const a = Math.min(100, +m[1]), v = +String(r[cH]).replace(/\s/g, '').replace(',', '.');
  const p = r[cP].toLowerCase();
  if (p.startsWith('m')) M[a] += v; else if (p.startsWith('ž') || p.startsWith('z')) F[a] += v;
}
const total = M.reduce((s, v) => s + v, 0) + F.reduce((s, v) => s + v, 0);
const rok = Math.floor(best / 10), kd = best % 10;
console.log('Vybráno:', vyb[0] && `${vyb[0][cU]} | ${vyb[0][cR]} | ${vyb[0][cT]}`, 'celkem', total);
if (!(total > 9.5e6 && total < 12.5e6) || M.some((v) => !(v >= 0)) || F.some((v) => !(v >= 0)) || M[30] < 1e4 || F[30] < 1e4)
  throw new Error('Data nevypadají věrohodně, soubor neměním.');

// Simulace začíná k 1. 1.: stav k 31. 12. roku R = začátek roku R + 1
const start = kd === 2 ? rok + 1 : rok;
const data = { zdroj: 'ČSÚ, OBY02B', obdobi: vyb[0][cT] || String(rok), start, muzi: M.map(Math.round), zeny: F.map(Math.round) };
const nove = JSON.stringify(data);
if (existsSync(OUT) && readFileSync(OUT, 'utf8').trim() === nove) console.log('Beze změny.');
else { writeFileSync(OUT, nove + '\n'); console.log('Uloženo, začátek simulace', start); }
