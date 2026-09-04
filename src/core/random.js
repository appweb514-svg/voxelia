// RNG déterministe (mulberry32 + hash de graine texte)
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  const s = String(str ?? Math.floor(Math.random() * 1e9));
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Bruit de valeur 2D avec interpolation douce + fBm
export function makeNoise2D(rand) {
  const P = new Uint8Array(512);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = (rand() * (i + 1)) | 0;[p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const fade = t => t * t * (3 - 2 * t);
  function n2(x, y) {
    const X = Math.floor(x), Y = Math.floor(y);
    const xf = x - X, yf = y - Y;
    const h = (i, j) => P[(P[(X + i) & 255] + Y + j) & 255] / 255;
    const u = fade(xf), v = fade(yf);
    return (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v;
  }
  return n2;
}
export function fbm(n2, x, y, oct = 4, lac = 2, gain = 0.5) {
  let a = 0.5, f = 1, s = 0, norm = 0;
  for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f); norm += a; a *= gain; f *= lac; }
  return s / norm;
}
