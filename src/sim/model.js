// Kohortní projekce obyvatel bez migrace (roční kroky, věk 0–100+)
// STAV = skutečné věkové složení z ČSÚ (src/sim/data/stav.json, aktualizuje se jednou týdně)
const DATA = typeof STAV !== 'undefined' && STAV ? STAV : null;
const START = DATA ? DATA.start : 2025, HORIZON = 50;
// Projekce ČSÚ 2023 (výchozí stav 1. 1. 2023): počet obyvatel k 1. 1. podle variant
const CSU = {
  low: [[2025, 10854564], [2026, 10778029], [2030, 10573836], [2035, 10446453], [2040, 10295866], [2045, 10138045], [2050, 9969969], [2055, 9772749], [2060, 9529474], [2065, 9243703], [2070, 8943336], [2075, 8658868], [2080, 8404642]],
  mid: [[2025, 10914878], [2026, 10861738], [2030, 10748352], [2035, 10735415], [2040, 10714384], [2045, 10701076], [2050, 10691467], [2055, 10664369], [2060, 10593389], [2065, 10478636], [2070, 10346296], [2075, 10227748], [2080, 10141649]],
  high: [[2025, 10959284], [2026, 10925052], [2030, 10884421], [2035, 10962585], [2040, 11044935], [2045, 11150017], [2050, 11274197], [2055, 11394407], [2060, 11478522], [2065, 11523227], [2070, 11554098], [2075, 11605157], [2080, 11698605]],
};
function csuAt(y, v = 'mid') {
  const t = CSU[v];
  for (let i = 1; i < t.length; i++) if (y <= t[i][0]) { const [y0, a] = t[i - 1], [y1, b] = t[i]; return a + (b - a) * (y - y0) / (y1 - y0); }
  return t[t.length - 1][1];
}
// Věkový profil migrantů: hlavně mladí dospělí (vrchol kolem 27 let), část dětí, málo starších; 55 % mužů
const MIG = (() => {
  const w = new Float64Array(101); let s = 0;
  for (let a = 0; a <= 100; a++) { w[a] = 0.25 * Math.exp(-a / 8) + Math.exp(-0.5 * ((a - 27) / 7) ** 2) + 0.04 * Math.exp(-0.5 * ((a - 60) / 10) ** 2); s += w[a]; }
  return w.map((v) => v / s);
})();
// Orientační věková struktura Česka, 5leté skupiny 0–4 … 85+ (tisíce), podíl žen
const AG = [470, 560, 580, 550, 500, 530, 630, 730, 860, 890, 720, 660, 640, 640, 680, 520, 300, 220];
const FSH = [.487, .487, .487, .487, .487, .487, .487, .487, .487, .49, .5, .5, .51, .53, .55, .59, .63, .69];

function initPop() {
  if (DATA) return { M: Float64Array.from(DATA.muzi), F: Float64Array.from(DATA.zeny) };
  const tot = AG.reduce((s, v) => s + v, 0), k = 10909.5 / tot;
  const M = new Float64Array(101), F = new Float64Array(101);
  for (let g = 0; g < 17; g++) for (let i = 0; i < 5; i++) {
    const a = g * 5 + i, v = AG[g] * k * 1000 / 5;
    F[a] = v * FSH[g]; M[a] = v - F[a];
  }
  // 85+ rozložit klesající řadou do věku 85…100+
  const w = []; let s = 0;
  for (let a = 85; a <= 100; a++) { const x = Math.pow(0.8, a - 85); w.push(x); s += x; }
  for (let a = 85; a <= 100; a++) {
    const v = AG[17] * k * 1000 * w[a - 85] / s, fs = Math.min(.85, .62 + (a - 85) * .015);
    F[a] = v * fs; M[a] = v - F[a];
  }
  // Doladění na velké věkové skupiny k 1. 1. 2025 (ČSÚ: 0–14, 15–64, 65+), součet 10 909 500
  const T = [[0, 14, 1699103], [15, 64, 6956564], [65, 100, 2259211]], K = 10909500 / 10914878;
  for (const [a0, a1, t] of T) {
    let s = 0; for (let a = a0; a <= a1; a++) s += M[a] + F[a];
    const q = t * K / s; for (let a = a0; a <= a1; a++) { M[a] *= q; F[a] *= q; }
  }
  return { M, F };
}

// Gompertz–Makeham: riziko úmrtí c + A·e^(b·x), A dopočítané tak, aby vyšla zvolená naděje dožití
// Sklon B roste s nadějí dožití (úmrtí se soustřeďují do vyššího věku); od 92 let
// má riziko úmrtí spodní mez, která roste k 0,45 ve 100 letech.
const C = 0.0003, INF = 0.0022;
const slope = (e0) => 0.12 + 0.001 * (e0 - 77);
const floorMu = (x) => x < 92 ? 0 : Math.min(0.45, 0.2 + 0.03 * (x - 92));
const mu = (A, B, x) => Math.max(C + A * Math.exp(B * x), floorMu(x));
function e0Of(A, B) {
  let l = 1, e = 0;
  for (let x = 0; x < 130; x++) {
    const n = l * Math.exp(-(mu(A, B, x + .5) + (x === 0 ? INF : 0)));
    e += (l + n) / 2; l = n;
  }
  return e;
}
function survival(e0) {
  const B = slope(e0);
  let lo = Math.log(1e-12), hi = Math.log(1e-1);
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; e0Of(Math.exp(m), B) > e0 ? lo = m : hi = m; }
  const A = Math.exp((lo + hi) / 2), s = new Float64Array(101);
  for (let a = 0; a <= 100; a++) s[a] = Math.exp(-(mu(A, B, a + .5) + (a === 0 ? INF : 0)));
  return { s, s0: Math.exp(-INF / 2 - mu(A, B, .25) / 2) };
}

// Výchozí hodnoty plodnosti (ČSÚ): věk při prvním dítěti, rozestup, počet dětí na ženu
const BASEF = { a1: 29.2, d: 2.3, f: 1.28 };
// Dnešní chování (rok 2025), podle kterého pokračují ženy, které už rodí
const NOWF = { a1: 29.2, d: 2.3, f: 1.28 };

// Plodnost podle věku: první děti kolem věku a1, druhé o d později, každé další o 0,7·d
// (podle ČSÚ 2025: 29,2 / 31,5 / 33,1 roku)
function fertility(a1, d, tfr) {
  // Rozdělení podle pořadí: při 1,5 dítěte odpovídá předpokladu ČSÚ (0,72 / 0,56 / 0,21)
  const parts = []; let rest = tfr, prev = 0;
  for (let k = 1; k <= 10 && rest > 1e-6; k++) {
    const cap = k === 1 ? Math.min(0.92, 0.48 * tfr) : prev * (k === 2 ? 0.78 : 0.6);
    const fk = k === 10 ? rest : Math.min(rest, cap);
    parts.push(fk); rest -= fk; prev = fk;
  }
  const f = new Float64Array(101);
  parts.forEach((fk, i) => {
    const m = a1 + (i === 0 ? 0 : d + (i - 1) * 0.7 * d), sd = i === 0 ? 4.5 : 4;
    const w = []; let s = 0;
    for (let a = 15; a <= 49; a++) { const x = Math.exp(-(((a + .5 - m) / sd) ** 2) / 2); w.push(x); s += x; }
    if (s > 0) for (let a = 15; a <= 49; a++) f[a] += fk * w[a - 15] / s;
  });
  return f;
}

// Naděje dožití: projekce ČSÚ 2023, střední varianta (muži, ženy)
const EPROJ = [[2023, 77.0, 83.0], [2030, 78.5, 84.1], [2040, 80.4, 85.7], [2050, 82.2, 87.1], [2060, 83.9, 88.4], [2070, 85.4, 89.6], [2080, 86.9, 90.7]];
function eAt(y, s) {
  for (let i = 1; i < EPROJ.length; i++) if (y <= EPROJ[i][0]) { const [y0, ...a] = EPROJ[i - 1], [y1, ...b] = EPROJ[i]; return a[s] + (b[s] - a[s]) * (y - y0) / (y1 - y0); }
  return EPROJ[EPROJ.length - 1][s + 1];
}
const E_END = (eAt(START + HORIZON, 0) + eAt(START + HORIZON, 1)) / 2, E_NOW = (eAt(START, 0) + eAt(START, 1)) / 2;
const survCache = new Map();
const survAt = (e) => { const k = Math.round(e * 20) / 20; if (!survCache.has(k)) survCache.set(k, survival(k)); return survCache.get(k); };

function project(p) {
  const { M, F } = initPop();
  const delta = p.e0 - E_END;
  // Plodnost po generacích: zvolené hodnoty platí plně pro ženy, které v roce 2025 ještě nezačaly
  // rodit (do 15 let). Ženy od 30 let pokračují podle dnešního stavu (2025), mezi tím se přechází
  // postupně. Každá žena dorovná jen zbytek celoživotního počtu dětí, takže se žádné dítě
  // nenarodí dvakrát ani nezmizí.
  const fo = fertility(NOWF.a1, NOWF.d, NOWF.f), fn = fertility(p.a1, p.d, p.f);
  const rate = [];
  for (let x0 = 0; x0 < 50; x0++) {
    const w = Math.min(1, Math.max(0, (30 - x0) / 15));
    let done = 0; for (let a = 0; a < x0; a++) done += fo[a];
    const R = Math.max(0, NOWF.f + (p.f - NOWF.f) * w - done);
    const h = new Float64Array(101); let S = 0;
    for (let a = x0; a < 50; a++) { h[a] = (1 - w) * fo[a] + w * fn[a] * NOWF.f / p.f; S += h[a]; }
    rate.push(h.map((v) => S > 1e-9 ? R * v / S : 0));
  }
  const fe = (a, y) => { const x0 = a - (y - 1); return x0 <= 15 ? fn[a] : rate[x0][a]; };
  const out = { total: [], m: [], f: [], st: [], births: [], deaths: [] };
  const snap = () => {
    const gm = new Float64Array(21), gf = new Float64Array(21);
    let t = 0, c = 0, w = 0, o = 0;
    for (let a = 0; a <= 100; a++) {
      const g = Math.min(20, Math.floor(a / 5)), v = M[a] + F[a];
      gm[g] += M[a]; gf[g] += F[a]; t += v;
      if (a < 15) c += v; else if (a < 65) w += v; else o += v;
    }
    out.total.push(t); out.m.push(gm); out.f.push(gf); out.st.push({ c: c / t, w: w / t, o: o / t, r: o / w * 100 });
  };
  snap();
  for (let y = 1; y <= HORIZON; y++) {
    const yr = START + y - 0.5, sh = delta * (y - 0.5) / HORIZON;
    const sm = survAt(eAt(yr, 0) + sh), sf = survAt(eAt(yr, 1) + sh);
    let births = 0;
    for (let a = 15; a <= 49; a++) births += F[a] * fe(a, y);
    let deaths = 0;
    for (let a = 0; a <= 100; a++) deaths += M[a] * (1 - sm.s[a]) + F[a] * (1 - sf.s[a]);
    out.deaths.push(deaths + births * (1 - 0.5122 * sm.s0 - 0.4878 * sf.s0));
    for (const [P, S] of [[M, sm.s], [F, sf.s]]) {
      const open = P[99] * S[99] + P[100] * S[100];
      for (let a = 99; a >= 1; a--) P[a] = P[a - 1] * S[a - 1];
      P[100] = open;
    }
    out.births.push(births);
    M[0] = births * 0.5122 * sm.s0; F[0] = births * 0.4878 * sf.s0;
    // Migrace: roční saldo rozložené podle věkového profilu (při záporném saldu nikdy pod nulu)
    const mig = p.mig || 0;
    for (let a = 0; a <= 100; a++) { M[a] = Math.max(0, M[a] + mig * MIG[a] * 0.55); F[a] = Math.max(0, F[a] + mig * MIG[a] * 0.45); }
    snap();
  }
  return out;
}
