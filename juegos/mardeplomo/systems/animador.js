// Reproduce animaciones (del GLB si existen; si no, del catálogo) con mezcla suave.
// Al cambiar, guarda una "foto" de la pose actual y funde desde ella: así nunca hay saltos.
import * as THREE from 'three';
import { CATALOGO } from '../animations/catalogo.js';
const DEL_GLB = { idle: 'quieto', walk: 'andar', run: 'correr', walking: 'andar', running: 'correr' };

export class Animador {
  constructor(esq, clips = []) {
    this.esq = esq; this.clips = {};
    for (const c of clips) { const n = DEL_GLB[c.name.toLowerCase()] || c.name; if (CATALOGO[n]) this.ponClip(n, c); }
    this.cuerpo = 'quieto'; this.torso = null; this.t = 0; this.tt = 0; this.fase = 0; this.mezcla = 1; this.durMezcla = .2; this.estado = { fase: 0, cab: 0, dir: 0 };
    this.sal = esq.pose(); this.foto = esq.pose(); this.base = esq.pose(); this.capa = esq.pose();
  }
  ponClip(nombre, clip) {
    const num = new Map(this.esq.huesos.map((h, i) => [h.name, i])), ih = this.esq.idx.Hips, pistas = [];
    for (const tr of clip.tracks) {
      const { nodeName, propertyName } = THREE.PropertyBinding.parseTrackName(tr.name), i = num.get(nodeName);
      if (i == null) continue;
      if (propertyName === 'quaternion') pistas.push([i, tr.createInterpolant()]);
      else if (propertyName === 'position' && i === ih) pistas.push([-1, tr.createInterpolant()]);
    }
    this.clips[nombre] = { pistas, dur: clip.duration };
  }
  _corte(d) { for (let i = 0; i < this.sal.q.length; i++) this.foto.q[i].copy(this.sal.q[i]); this.foto.p.copy(this.sal.p); this.mezcla = 0; this.durMezcla = d; }
  pon(n, d = .22) { if (n === this.cuerpo) return; this._corte(d); this.cuerpo = n; this.t = 0; }
  ponTorso(n, d = .15, repetir = false) { if (n === this.torso && !repetir) return; if (n !== this.torso) this._corte(d); this.torso = n; this.tt = 0; }
  get terminado() { const d = CATALOGO[this.cuerpo].dur; return d != null && this.t >= d; }
  get torsoTerminado() { const d = this.torso && CATALOGO[this.torso].dur; return d ? this.tt >= d : true; }
  _evalua(n, t, sal) {
    const c = this.clips[n], def = CATALOGO[n];
    if (c) {
      const u = def.dur ? Math.min(t, c.dur) : def.paso ? this.fase * c.dur : t % c.dur;
      for (const [i, it] of c.pistas) { const v = it.evaluate(u); if (i < 0) sal.p.set(this.esq.cadLocal.x, this.esq.cadLocal.y, this.esq.cadLocal.z).copy(this._sinAvance(v)); else sal.q[i].fromArray(v); }
    } else { this.estado.fase = this.fase; this.esq.resolver(def.f(def.dur ? Math.min(t, def.dur) : t, this.estado), sal); }
  }
  // Quita el avance horizontal de la cadera (el desplazamiento lo lleva el juego)
  _sinAvance(v) {
    const p = new THREE.Vector3(v[0], v[1], v[2]), m = this._inv ||= this.esq.padreCad.clone().invert(), r = this.esq.repP[this.esq.idx.Hips];
    p.applyMatrix4(m); p.x = r.x; p.z = r.z; return p.applyMatrix4(this.esq.padreCad);
  }
  // ritmo = ciclos de paso por segundo
  paso(dt, ritmo = 1) {
    const E = this.esq; this.t += dt; this.tt += dt; this.fase = (((this.fase + dt * ritmo) % 1) + 1) % 1;
    this._evalua(this.cuerpo, this.t, this.base);
    if (this.torso) { this._evalua(this.torso, this.tt, this.capa); for (let i = 0; i < E.huesos.length; i++) if (E.esTorso[i]) this.base.q[i].copy(this.capa.q[i]);
      // Si la animación de las piernas gira la cadera, se compensa en la columna: el pecho sigue mirando al frente
      const ih = E.idx.Hips, c0 = E.columna.find(i => E.padre[i] === ih);
      if (c0 != null) this.base.q[c0].copy(this.base.q[ih]).invert().multiply(this.capa.q[ih]).multiply(this.capa.q[c0]); }
    this.mezcla = Math.min(1, this.mezcla + dt / this.durMezcla);
    const k = this.mezcla * this.mezcla * (3 - 2 * this.mezcla);
    for (let i = 0; i < E.huesos.length; i++) { this.sal.q[i].copy(this.foto.q[i]).slerp(this.base.q[i], k); E.huesos[i].quaternion.copy(this.sal.q[i]); }
    this.sal.p.copy(this.foto.p).lerp(this.base.p, k); E.huesos[E.idx.Hips].position.copy(this.sal.p);
  }
}
