// Nivel de búsqueda (0-5). Sin Three.js.
export const UMBRAL = [0, 1, 25, 60, 110, 180];
export const DELITOS = { armaVista: 10, robo: 14, disparo: 14, herir: 28, matar: 50, agredirPolicia: 40, matarPolicia: 70, atropello: 28, choquePolicia: 12, venta: 14, sospechoso: 8 };
export class Busqueda {
  constructor() { this.calor = 0; this.tSin = 0; this.visto = false; this.desc = { ropa: 0, coche: null }; this.ultima = null; this.historial = {}; }
  get estrellas() { let n = 0; for (let i = 1; i <= 5; i++) if (this.calor >= UMBRAL[i]) n = i; return n; }
  delito(tipo, pos) { this.calor = Math.min(230, this.calor + DELITOS[tipo]); this.historial[tipo] = (this.historial[tipo] || 0) + 1; this.tSin = 0; if (pos) this.ultima = { x: pos.x, z: pos.z }; }
  // ¿Lo que llevas ahora coincide con la descripción que tiene la policía?
  disfrazado(ropa, coche) { return this.estrellas > 0 && (coche ? coche !== this.desc.coche : ropa !== this.desc.ropa); }
  get espera() { return 5 + 2.5 * this.estrellas; } // segundos sin ser visto para perder una estrella
  // e: {visto, oculto, ropa, coche, pos, huye}
  paso(dt, e) {
    const s = this.estrellas; this.visto = e.visto && s > 0;
    if (!s) { this.calor = 0; this.tSin = 0; return; }
    if (e.visto) {
      this.tSin = 0; this.ultima = { x: e.pos.x, z: e.pos.z }; this.desc = { ropa: e.ropa, coche: e.coche };
      // Huir a la vista va calentando, pero solo con eso no se pasa de 4 estrellas
      if (e.huye && s >= 2 && this.calor < UMBRAL[5] - 10) this.calor += .12 * dt;
    } else {
      this.tSin += dt * (e.oculto ? 2 : 1) * (this.disfrazado(e.ropa, e.coche) ? 1.8 : 1);
      if (this.tSin > this.espera) { this.calor = s > 1 ? UMBRAL[s - 1] : 0; this.tSin = 0; }
    }
  }
}
