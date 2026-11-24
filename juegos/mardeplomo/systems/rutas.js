// Red de calles y control de coches por IA. Sin Three.js.
export const XS = [-280, -200, -120, -40, 40, 120, 200, 280], ZS = [-280, -200, -120, -40, 40, 120, 200];
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
export const nodoCerca = (x, z) => [lim(Math.round((x + 280) / 80), 0, 7), lim(Math.round((z + 280) / 80), 0, 6)];
export const pos = ([i, j]) => ({ x: XS[i], z: ZS[j] });
export const vecinos = ([i, j]) => [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && a < 8 && b >= 0 && b < 7);
// Siguiente cruce camino de un destino. evita = cruce del que se viene (para no dar media vuelta)
export function siguiente(n, destino, evita) {
  let m = null, d = Infinity; const D = pos(destino);
  for (const v of vecinos(n)) { if (evita && v[0] === evita[0] && v[1] === evita[1]) continue; const p = pos(v), q = Math.abs(p.x - D.x) + Math.abs(p.z - D.z); if (q < d) { d = q; m = v; } }
  return m;
}
// Punto del carril derecho de la calle a->b, a 'k' metros del cruce final (k<0: del inicial)
export function carril(a, b, k, lado = 2.2) {
  const A = pos(a), B = pos(b), l = Math.hypot(B.x - A.x, B.z - A.z), dx = (B.x - A.x) / l, dz = (B.z - A.z) / l, o = k < 0 ? A : B, s = -k;
  return { x: o.x + dx * s - dz * lado, z: o.z + dz * s + dx * lado };
}
export const difAng = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// Mandos para ir hacia un punto. c lleva c.atasco (segundos sin moverse) y c.reversa
export function pilota(c, t, vMax, dt) {
  const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz), a = difAng(Math.atan2(dx, dz), c.th);
  c.atasco = Math.abs(c.v) < 1 && vMax > 2 ? (c.atasco || 0) + dt : 0;
  if (c.atasco > 1.4) { c.reversa = 1.5; c.atasco = 0; }
  if (c.reversa > 0) { c.reversa -= dt; return { gas: -1, dir: a > 0 ? -1 : 1, mano: false }; }
  const v = Math.min(vMax, Math.abs(a) > .35 ? Math.max(6, 20 - Math.abs(a) * 14) : vMax);
  return { gas: c.v < v - 1 ? 1 : c.v > v + 2 ? -1 : 0, dir: lim(a * 2.4, -1, 1), mano: Math.abs(a) > 1.1 && c.v > 10 };
}
