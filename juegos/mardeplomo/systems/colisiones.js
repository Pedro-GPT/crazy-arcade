// Colisiones 2D con cajas alineadas a los ejes. Sin Three.js: se puede probar en Node.
export class Colisiones {
  constructor(celda = 20) { this.celda = celda; this.cajas = []; this.rejilla = new Map(); }
  // Caja con centro (x,z), ancho a (x), fondo f (z) y altura h desde el suelo
  caja(x, z, a, f, h = 10) {
    const c = { x0: x - a / 2, x1: x + a / 2, z0: z - f / 2, z1: z + f / 2, h };
    this.cajas.push(c);
    const k = this.celda;
    for (let i = Math.floor((c.x0 - 2) / k); i <= Math.floor((c.x1 + 2) / k); i++)
      for (let j = Math.floor((c.z0 - 2) / k); j <= Math.floor((c.z1 + 2) / k); j++) {
        const id = i + ',' + j; if (!this.rejilla.has(id)) this.rejilla.set(id, []); this.rejilla.get(id).push(c);
      }
    return c;
  }
  cerca(x, z) { return this.rejilla.get(Math.floor(x / this.celda) + ',' + Math.floor(z / this.celda)) || []; }
  // Saca un círculo (p.x,p.z) de las cajas. Devuelve la normal del último choque o null.
  resolver(p, r) {
    let n = null;
    for (const c of this.cerca(p.x, p.z)) {
      const qx = Math.max(c.x0, Math.min(c.x1, p.x)), qz = Math.max(c.z0, Math.min(c.z1, p.z));
      const dx = p.x - qx, dz = p.z - qz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) { const d = Math.sqrt(d2); n = { x: dx / d, z: dz / d }; p.x = qx + n.x * r; p.z = qz + n.z * r; }
      else { // centro dentro de la caja: salir por el lado más próximo
        const s = [p.x - c.x0, c.x1 - p.x, p.z - c.z0, c.z1 - p.z], m = Math.min(...s), i = s.indexOf(m);
        n = [{ x: -1, z: 0 }, { x: 1, z: 0 }, { x: 0, z: -1 }, { x: 0, z: 1 }][i];
        p.x += n.x * (m + r); p.z += n.z * (m + r);
      }
    }
    return n;
  }
  // Distancia al primer impacto del rayo, o max
  rayo(o, d, max) {
    let mejor = max;
    for (const c of this.cajas) {
      let t0 = 0, t1 = mejor, u, w; // sin crear objetos: se llama muchas veces por fotograma
      if (d.x > 1e-8 || d.x < -1e-8) { u = (c.x0 - o.x) / d.x; w = (c.x1 - o.x) / d.x; if (u > w) { const q = u; u = w; w = q; } if (u > t0) t0 = u; if (w < t1) t1 = w; if (t0 > t1) continue; } else if (o.x < c.x0 || o.x > c.x1) continue;
      if (d.z > 1e-8 || d.z < -1e-8) { u = (c.z0 - o.z) / d.z; w = (c.z1 - o.z) / d.z; if (u > w) { const q = u; u = w; w = q; } if (u > t0) t0 = u; if (w < t1) t1 = w; if (t0 > t1) continue; } else if (o.z < c.z0 || o.z > c.z1) continue;
      if (d.y > 1e-8 || d.y < -1e-8) { u = (-1 - o.y) / d.y; w = (c.h - o.y) / d.y; if (u > w) { const q = u; u = w; w = q; } if (u > t0) t0 = u; if (w < t1) t1 = w; } else if (o.y > c.h) continue;
      if (t0 <= t1 && t0 < mejor) mejor = t0;
    }
    return mejor;
  }
}
