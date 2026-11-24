// Tráfico: coches que circulan por el carril derecho, giran en los cruces y frenan ante obstáculos
import { Coche } from './coche.js';
import { nodoCerca, vecinos, carril, difAng, pos } from './rutas.js';
const COLORES = [0x8d8f91, 0xd5d3cc, 0x2b2f33, 0x7a2b26, 0x2f4f73, 0x4c5f49, 0xb08d4a];
export class Trafico {
  constructor(escena, ciudad, coches, n = 9) { Object.assign(this, { escena, ciudad, coches, n, l: [], cambio: 0 }); }
  _nace(j) {
    for (let q = 0; q < 10; q++) {
      const a = [Math.floor(Math.random() * 8), Math.floor(Math.random() * 7)], b = this._elige(vecinos(a)), p = carril(a, b, -(12 + Math.random() * 50)), d = Math.hypot(p.x - j.x, p.z - j.z);
      if (d < 60 || d > 190 || this.coches.some(c => Math.hypot(c.x - p.x, c.z - p.z) < 9)) continue;
      const A = pos(a), B = pos(b), c = new Coche(this.escena, p.x, p.z, Math.atan2(B.x - A.x, B.z - A.z), this._elige(COLORES), false);
      Object.assign(c, { trafico: { a, b, fase: 0, parado: 0, vmax: 8 + Math.random() * 3 } }); this.coches.push(c); this.l.push(c); return;
    }
  }
  _elige(l) { return l[Math.floor(Math.random() * l.length)]; }
  // El coche deja de ser tráfico (robado, chocado o dueño huido)
  suelta(c) { this.l = this.l.filter(o => o !== c); c.trafico = null; }
  paso(dt, j, personas) {
    this.cambio += dt; if (this.l.length < this.n && this.cambio > .5) { this.cambio = 0; this._nace(j); }
    for (const c of [...this.l]) {
      if (Math.hypot(c.x - j.x, c.z - j.z) > 230) { this.l.splice(this.l.indexOf(c), 1); this.coches.splice(this.coches.indexOf(c), 1); c.quita(); continue; }
      const T = c.trafico;
      if (c.tocado) { c.tocado = null; this.suelta(c); this.alChocar?.(c); continue; } // golpeado: se queda donde está
      // fase 0: hasta el final de la calle; fase 1: cruzar hacia la nueva calle
      const t = T.fase === 0 ? carril(T.a, T.b, 9) : carril(T.a, T.b, -9), dx = t.x - c.x, dz = t.z - c.z;
      if (Math.hypot(dx, dz) < 2.2) {
        if (T.fase === 0) { const v = vecinos(T.b).filter(n => n[0] !== T.a[0] || n[1] !== T.a[1]), n = this._elige(v); T.a = T.b; T.b = n; T.fase = 1; }
        else T.fase = 0;
        continue;
      }
      // Obstáculos delante
      const s = Math.sin(c.th), k = Math.cos(c.th); let libre = 99;
      const mira = (x, z, r) => { const ax = x - c.x, az = z - c.z, ad = ax * s + az * k, la = Math.abs(ax * k - az * s); if (ad > 1 && ad < 16 && la < r) libre = Math.min(libre, ad); };
      if (T.parado < 7) for (const o of this.coches) if (o !== c && Math.abs(o.x - c.x) < 20 && Math.abs(o.z - c.z) < 20) for (const p of o.circulos()) mira(p.x, p.z, 1.75);
      for (const p of personas) if (p.viva) mira(p.x, p.z, 1.5);
      if (j.modo === 'pie' || j.modo === 'detenido') mira(j.x, j.z, 1.6);
      const vm = libre < 5.5 ? 0 : Math.min(T.fase ? 5 : T.vmax, libre < 16 ? (libre - 5) * .9 : 99);
      T.parado = vm < .5 ? T.parado + dt : T.parado > 7 ? T.parado + dt : 0; if (T.parado > 11) T.parado = 0;
      c.v += Math.max(-9 * dt, Math.min(3 * dt, vm - c.v));
      const g = difAng(Math.atan2(dx, dz), c.th), w = Math.max(-1, Math.min(1, g * 2)) * c.v * .24;
      c.th += w * dt; c.giro = c.v > .5 ? Math.max(-.5, Math.min(.5, w / c.v * 2.6)) : c.giro;
      c.vx = Math.sin(c.th) * c.v; c.vz = Math.cos(c.th) * c.v; c.x += c.vx * dt; c.z += c.vz * dt;
      c.y += (this.ciudad.suelo(c.x, c.z) - c.y) * Math.min(1, dt * 14); c.pinta(dt);
    }
  }
}
