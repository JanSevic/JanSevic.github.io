const BASE = { ...BASEF, e0: Math.round(E_END * 10) / 10, mig: 42000 };
const P = { ...BASE };
let Y = START + HORIZON, R, RB, timer = null;
const N = HORIZON, END = START + N, DEC = Array.from({ length: N / 10 }, (_, i) => (i + 1) * 10);
const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const nf = (x, d = 1) => x.toLocaleString('cs-CZ', { minimumFractionDigits: d, maximumFractionDigits: d });
const mil = (v) => nf(v / 1e6) + ' mil.';
const tis = (v) => Math.round(v / 1000).toLocaleString('cs-CZ') + ' tis.';
const tisS = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(Math.round(x / 1000)) + '\u00a0tis.';
const pct = (x) => nf(x * 100, 0) + ' %';
const roky = (x) => Number.isInteger(x) ? x + ' ' + (x === 1 ? 'rok' : x >= 2 && x <= 4 ? 'roky' : 'let') : nf(x, 1) + ' roku';
const GL = Array.from({ length: 21 }, (_, g) => g === 20 ? '100+' : `${g * 5}–${g * 5 + 4}`);
const COL = { men: '#4f8fe0', women: '#e5585b', acc: 'var(--accent)', base: '#9a9da2', bar: '#5f6369', kid: '#a7aaae', grid: 'var(--line)', ink: 'var(--ink)', muted: 'var(--ink-muted)', bg: 'var(--surface)' };

const SL = [
  { k: 'a1', t: 'Věk ženy při prvním dítěti', min: 20, max: 36, step: 0.1, fmt: roky, h: 'Podle ČSÚ za rok 2025: 29,2 roku.' },
  { k: 'd', t: 'Rozestup mezi dětmi', min: 1, max: 6, step: 0.1, fmt: roky, h: 'Rozdíl průměrného věku matek u prvního a druhého dítěte. Podle ČSÚ přibližně 2,3\u00a0roku.' },
  { k: 'f', t: 'Počet dětí na ženu', min: 0.8, max: 3, step: 0.01, fmt: (x) => nf(x, 2), h: 'Podle ČSÚ za rok 2025: 1,28 (průměr let 2021–2025 byl 1,51). Při 2,1 se populace udrží.' },
  { k: 'mig', t: 'Roční saldo migrace', min: -20000, max: 100000, step: 1000, fmt: tisS, h: 'O kolik víc lidí se ročně přistěhuje, než vystěhuje. V roce 2025 to bylo 42\u00a0tisíc, projekce ČSÚ počítá s 35\u00a0tisíci.' },
];
for (const host of document.querySelectorAll('[data-ctl]')) {
  const p = host.dataset.ctl;
  host.innerHTML = SL.map((s) => `<div class="sim-sl"><label for="${p}-${s.k}"><span>${s.t}</span><output id="${p}-${s.k}-o"></output></label>
    <input type="range" id="${p}-${s.k}" data-k="${s.k}" min="${s.min}" max="${s.max}" step="${s.step}"><small>${s.h}</small></div>`).join('');
}
function syncCtl() {
  for (const s of SL) for (const p of ['b']) {
    const i = $(`${p}-${s.k}`);
    if (+i.value !== P[s.k]) i.value = P[s.k];
    i.style.setProperty('--p', ((P[s.k] - s.min) / (s.max - s.min) * 100) + '%');
    $(`${p}-${s.k}-o`).textContent = s.fmt(P[s.k]);
  }
}
document.addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.k; if (!k) return; P[k] = +e.target.value; recompute(); });

/* ---------- grafy ---------- */
const niceStep = (max, n) => { const raw = max / n, p = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw); };
function svgIn(fig) { let s = fig.querySelector('svg'); if (!s) { s = document.createElementNS(NS, 'svg'); fig.prepend(s); } return s; }
function tipAt(fig, html, x, y) {
  let t = fig.querySelector('.sim-tip'); if (!t) { t = document.createElement('div'); t.className = 'sim-tip'; fig.appendChild(t); }
  t.innerHTML = html; t.style.display = 'block';
  const w = t.offsetWidth, W = fig.clientWidth;
  t.style.left = Math.max(0, Math.min(W - w, x + 16 + w > W ? x - w - 16 : x + 16)) + 'px';
  t.style.top = Math.max(0, y - 20) + 'px';
}
const hideTip = (fig) => { const t = fig.querySelector('.sim-tip'); if (t) t.style.display = 'none'; };

function drawLine(fig, o) {
  const W = fig.clientWidth, H = fig.clientHeight; if (W < 120) return;
  const s = svgIn(fig), small = W < 520;
  const m = { l: 30, r: small ? 8 : 52, t: 26, b: 30 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const ymax = Math.max(12e6, ...o.a, ...o.b), st = niceStep(ymax / 1e6, 4) * 1e6, top = Math.ceil(ymax * 1.02 / st) * st;
  const x = (i) => m.l + iw * i / N, y = (v) => m.t + ih * (1 - v / top);
  const path = (v) => v.map((d, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(d).toFixed(1)).join('');
  let g = `<text class="sim-ax" x="0" y="12">mil. obyvatel</text>`;
  for (let v = 0; v <= top + 1; v += st) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${COL.grid}" stroke-width="${v ? 1 : 1.5}"${v ? '' : ` style="stroke:var(--ink)"`}/><text class="sim-ax" x="${m.l - 8}" y="${y(v) + 5}" text-anchor="end">${v / 1e6}</text>`;
  for (const i of ([0, N / 2, N])) g += `<text class="sim-ax" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === N ? 'end' : 'middle'}">${START + i}</text>`;
  if (o.gap) {
    const pts = o.a.map((d, i) => `${x(i)},${y(d)}`).concat(o.b.map((d, i) => `${x(i)},${y(d)}`).reverse());
    g += `<polygon points="${pts.join(' ')}" fill="${COL.acc}" opacity=".1"/>`;
  }
  const cv = (v) => Array.from({ length: N + 1 }, (_, i) => csuAt(START + i, v));
  const lo = cv('low'), mi = cv('mid'), hi = cv('high');
  g += `<polygon points="${hi.map((d, i) => `${x(i)},${y(d)}`).concat(lo.map((d, i) => `${x(i)},${y(d)}`).reverse()).join(' ')}" fill="var(--ink)" opacity=".07"/>`;
  for (const s of [lo, hi]) g += `<path d="${path(s)}" fill="none" stroke="var(--ink-muted)" stroke-width="1" stroke-dasharray="2 4"/>`;
  g += `<path d="${path(mi)}" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="6 5"/>`;
  if (!small) for (const [s, t] of [[hi, 'vysoká'], [lo, 'nízká']]) g += `<text class="sim-ax" x="${x(N) - 4}" y="${y(s[N]) + (t === 'nízká' ? 16 : -7)}" text-anchor="end">ČSÚ ${t}</text>`;
  g += `<path d="${path(o.b)}" fill="none" stroke="${COL.base}" stroke-width="2"/>`;
  g += `<path d="${path(o.a)}" fill="none" stroke="${COL.acc}" stroke-width="3" stroke-linejoin="round"/>`;
  if (!small) {
    const ya = y(o.a[N]), yb = y(o.b[N]);
    g += `<text class="sim-ax" x="${W - m.r + 8}" y="${ya + 5}" style="fill:var(--ink);font-weight:600">${nf(o.a[N] / 1e6)}</text>`;
    if (Math.abs(ya - yb) > 18) g += `<text class="sim-ax" x="${W - m.r + 8}" y="${yb + 5}">${nf(o.b[N] / 1e6)}</text>`;
  }
  if (o.sel != null) { const i = o.sel - START; g += `<line x1="${x(i)}" x2="${x(i)}" y1="${m.t}" y2="${y(0)}" stroke="var(--ink)" stroke-width="1"/><rect x="${x(i) - 6}" y="${y(o.a[i]) - 6}" width="12" height="12" fill="${COL.acc}" stroke="${COL.bg}" stroke-width="2.5"/>`; }
  g += `<g class="hov"></g><rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" style="cursor:${o.pick ? 'pointer' : 'crosshair'};touch-action:pan-y"/>`;
  s.innerHTML = g;
  const r = s.querySelector('.hit'), hov = s.querySelector('.hov');
  const at = (ev) => { const b = s.getBoundingClientRect(); return Math.max(0, Math.min(N, Math.round((ev.clientX - b.left - m.l) / iw * N))); };
  r.onpointermove = (ev) => {
    const i = at(ev);
    hov.innerHTML = `<line x1="${x(i)}" x2="${x(i)}" y1="${m.t}" y2="${y(0)}" stroke="var(--ink-muted)" stroke-width="1"/><rect x="${x(i) - 4}" y="${y(o.b[i]) - 4}" width="8" height="8" fill="${COL.base}" stroke="${COL.bg}" stroke-width="2"/><rect x="${x(i) - 5}" y="${y(o.a[i]) - 5}" width="10" height="10" fill="${COL.acc}" stroke="${COL.bg}" stroke-width="2"/>`;
    tipAt(fig, `<div class="lbl">${START + i} · za ${i} let</div><b>${mil(o.a[i])}</b><div class="muted">${mil(o.b[i])} při výchozích hodnotách</div><div class="muted">ČSÚ: ${nf(csuAt(START + i, 'low') / 1e6)} / ${nf(csuAt(START + i) / 1e6)} / ${nf(csuAt(START + i, 'high') / 1e6)} mil. (nízká / střední / vysoká)</div>`, x(i), y(o.a[i]));
  };
  r.onpointerleave = () => { hov.innerHTML = ''; hideTip(fig); };
  r.onclick = (ev) => { if (o.pick) o.pick(START + at(ev)); };
}

function drawPyr(fig, o) {
  const W = fig.clientWidth, H = fig.clientHeight; if (W < 120) return;
  const s = svgIn(fig), cw = 44, tp = 2, bt = 28;
  const half = (W - cw) / 2, rh = (H - tp - bt) / 21, bh = Math.max(2, rh - 2);
  const mx = Math.max(...o.m, ...o.f, ...o.rm, ...o.rf) * 1.04, st = niceStep(mx / 1000, 3) * 1000;
  const sc = (v) => half * v / mx, cl = half, cr = half + cw, rowY = (k) => tp + (20 - k) * rh;

  let g = '';
  for (let v = st; v < mx; v += st) for (const xx of [cl - sc(v), cr + sc(v)]) g += `<line x1="${xx}" x2="${xx}" y1="${tp}" y2="${H - bt}" stroke="${COL.grid}"/>`;
  for (let k = 0; k < 21; k++) {
    const yy = rowY(k) + 1, wm = sc(o.m[k]), wf = sc(o.f[k]);
    g += `<rect x="${cl - wm}" y="${yy}" width="${wm}" height="${bh}" fill="${COL.men}"/><rect x="${cr}" y="${yy}" width="${wf}" height="${bh}" fill="${COL.women}"/>`;
    if (k % 2 === 0) g += `<text class="sim-ax" x="${W / 2}" y="${rowY(k) + rh / 2 + 5}" text-anchor="middle">${k === 20 ? '100+' : k * 5}</text>`;
  }
  let pl = '', pr = '';
  for (let k = 20; k >= 0; k--) { const y0 = rowY(k), y1 = y0 + rh, a = cl - sc(o.rm[k]), b = cr + sc(o.rf[k]); pl += `${k === 20 ? 'M' : 'L'}${a},${y0}L${a},${y1}`; pr += `${k === 20 ? 'M' : 'L'}${b},${y0}L${b},${y1}`; }
  for (const [c, w] of [[COL.bg, 5], [COL.ink, 2]]) g += `<path d="${pl}" fill="none" stroke="${c}" stroke-width="${w}"/><path d="${pr}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
  g += `<line x1="0" x2="${W}" y1="${H - bt}" y2="${H - bt}" stroke="var(--ink)" stroke-width="1.5"/>`;
  for (const [k, t] of [[2, '15 let'], [12, '65 let']]) g += `<line x1="0" x2="${W}" y1="${rowY(k)}" y2="${rowY(k)}" stroke="var(--ink-muted)" stroke-width="1" stroke-dasharray="1 0"/><text class="sim-ax" x="0" y="${rowY(k) - 5}">${t}</text>`;
  for (let v = 0; v < mx; v += st) {
    const lab = Math.round(v / 1000);
    g += `<text class="sim-ax" x="${cl - sc(v)}" y="${H - 6}" text-anchor="${v ? 'middle' : 'end'}">${lab}</text><text class="sim-ax" x="${cr + sc(v)}" y="${H - 6}" text-anchor="${v ? 'middle' : 'start'}">${lab}</text>`;
  }
  if (W >= 420) g += `<text class="sim-ax" x="${W}" y="${H - 6}" text-anchor="end">tis.</text>`;
  for (let k = 0; k < 21; k++) g += `<rect data-g="${k}" x="0" y="${rowY(k)}" width="${W}" height="${rh}" fill="transparent"/>`;
  s.innerHTML = g;
  for (const r of s.querySelectorAll('rect[data-g]')) {
    r.onpointerenter = () => { const k = +r.dataset.g; tipAt(fig, `<div class="lbl">Věk ${GL[k]} · ${o.year}</div><div>muži <b>${tis(o.m[k])}</b> &nbsp;ženy <b>${tis(o.f[k])}</b></div><div class="muted">${o.refName}: ${tis(o.rm[k] + o.rf[k])} celkem</div>`, W / 2 - 80, rowY(k) - 84); };
    r.onpointerleave = () => hideTip(fig);
  }
}

/* ---------- varianty ---------- */
const idx = () => Y - START;
const key = (v, t) => `<div class="keynum"><span class="keynum__value">${v}</span><p class="muted">${t}</p></div>`;
const sign = (d) => (d > 0 ? '+' : d < 0 ? '−' : '');
function yearChips(host) {
  host.innerHTML = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((k) => `<button class="chip" type="button" data-y="${START + k}" aria-pressed="${START + k === Y}">${k ? '+' + k + ' let' : 'Dnes'}</button>`).join('');
  const on = host.querySelector('[aria-pressed=true]'); if (on && on.offsetLeft + on.offsetWidth > host.clientWidth) host.scrollLeft = on.offsetLeft - 16;
}
document.addEventListener('click', (e) => {
  const y = e.target.closest('[data-y]'); if (y) setYear(+y.dataset.y);
  const p = e.target.closest('[data-preset]'); if (p) { Object.assign(P, PRESETS[+p.dataset.preset].p); recompute(); }
});
function setYear(y) { Y = y; render(); }

function renderB() {
  const same = (q) => Object.keys(BASE).every((k) => Math.abs(q[k] - P[k]) < 1e-9);
  $('b-presets').innerHTML = PRESETS.map((s, n) => `<button class="chip" type="button" data-preset="${n}" aria-pressed="${same(s.p)}">${s.t}</button>`).join('');
  const i = idx();
  $('b-head').innerHTML = i ? `V roce ${Y} by v Česku žilo <em>${mil(R.total[i])}</em> lidí. Dnes je nás ${nf(R.total[0] / 1e6)} milionu.` : `Dnes v Česku žije <em>${mil(R.total[0])}</em> lidí.`;
  const mx = Math.max(...R.total) * 1.02;
  $('b-list').innerHTML = DEC.map((n) => `<div><span>za ${n} let</span><span class="bar2"><i style="width:${R.total[n] / mx * 100}%"></i><u style="left:${R.total[0] / mx * 100}%"></u></span><b>${nf(R.total[n] / 1e6)} mil.</b></div>`).join('');
  drawLine($('b-line'), { a: R.total, b: RB.total, sel: Y, pick: setYear });
  $('b-year').value = Y;
  $('b-pyr-t').textContent = `Věková struktura v roce ${Y}`;
  const st = R.st[i];
  drawPyr($('b-pyr'), { m: R.m[i], f: R.f[i], rm: R.m[0], rf: R.f[0], bands: true, year: Y, refName: 'Dnes' });
  $('b-shares').innerHTML = `<div><b>${pct(st.c)}</b>děti 0–14</div><div><b>${pct(st.w)}</b>věk 15–64</div><div><b>${pct(st.o)}</b>65 a více</div>`;
}
const PRESETS = [
  { t: 'Výchozí (2025)', p: { ...BASE } },
  { t: 'Bez migrace', p: { ...BASE, mig: 0 } },
  { t: 'Dřívější rodičovství', p: { ...BASE, a1: 26 } },
  { t: '2,1 dítěte', p: { ...BASE, f: 2.1 } },
];

$('b-year').addEventListener('input', (e) => setYear(+e.target.value));
$('b-play').addEventListener('click', () => {
  const b = $('b-play');
  if (timer) { clearInterval(timer); timer = null; b.textContent = 'Přehrát'; b.setAttribute('aria-pressed', 'false'); return; }
  if (Y >= END) Y = START;
  b.textContent = 'Zastavit'; b.setAttribute('aria-pressed', 'true');
  timer = setInterval(() => { if (Y >= END) { b.click(); return; } setYear(Y + 1); }, 120);
});

for (const el of document.querySelectorAll('.sim-start')) el.textContent = START;
$('b-year').min = START; $('b-year').max = END;
function render() { renderB(); }
function recompute() { syncCtl(); R = project(P); render(); }
RB = project(BASE);
const ro = new ResizeObserver(() => render());
for (const id of ['b-line', 'b-pyr']) ro.observe($(id));
recompute();
