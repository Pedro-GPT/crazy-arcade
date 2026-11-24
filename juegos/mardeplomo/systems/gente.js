// Personas controladas por IA: peatones, policías de uniforme, de paisano y unidad especial
import * as THREE from 'three';
import { creaPersona } from './cargaPersonaje.js';
import { ponUniforme, arreglaCuerpo } from './uniforme.js';
import { creaArma } from './arma.js';
import { difAng, XS, ZS } from './rutas.js';
import { CATALOGO } from '../animations/catalogo.js';
// Conjuntos de ropa (se multiplican por el color del modelo). El 0 es la ropa original.
export const ROPA = [{}, { outfit_top: '#7a3030', outfit_bottom: '#404048', vanguard: '#8a5048' }, { outfit_top: '#35507a', outfit_bottom: '#8a7a60', vanguard: '#55709a' }, { outfit_top: '#3c5a3c', outfit_bottom: '#303030', vanguard: '#587050' }];
const TOPS = ['#ffffff', '#b05a48', '#5878a0', '#d0b060', '#607850', '#8a5a80', '#404448', '#c8c0b0'], BOT = ['#ffffff', '#404858', '#8a7860', '#303030'];
const e = (l, k) => l[k % l.length];
export class Persona {
  constructor(escena, mod, tipo, k) {
    const opc = tipo === 'policia' ? { tintes: mod.policia.url.startsWith('http') ? { outfit_top: '#1e2b4c', outfit_bottom: '#1a2133', footwear: '#151515', hair: e(['#ffffff', '#4a3a30', '#151515'], k) } : {}, alto: 1.76 + (k % 4) * .03 } : { tintes: { outfit_top: e(TOPS, k), outfit_bottom: e(BOT, k * 3 + 1), wolf3d_hair: e(['#ffffff', '#4a3a30', '#151515'], k) }, alto: 1.68 + (k * 37 % 16) / 100 };
    const p = creaPersona(tipo === 'policia' ? mod.policia : mod.civil, opc);
    Object.assign(this, { tipo, esq: p.esq, anim: p.anim, g: p.esq.raiz, tinte: p.tinte, x: 0, y: .15, z: 0, th: 0, vel: 0, activa: false, estado: 'ruta', vida: 100, sospecha: 0, t: 0, k, desvio: 0, quieta: 0, cad: 0, ritmo: 1 });
    // Si hay models/policia.glb se usa tal cual; si no, uniforme sobre el cuerpo provisional
    const m = tipo === 'policia' ? mod.policia : mod.civil; if (m.url.startsWith('http')) arreglaCuerpo(p.esq, k, tipo === 'policia');
    if (tipo === 'policia' && mod.policia.url.startsWith('http')) ponUniforme(p.esq, k);
    if (tipo !== 'civil') { this.arma = creaArma(p.esq); this.arma.visible = false; }
    this.g.visible = false; escena.add(this.g);
  }
  pon(x, z, estado = 'ruta') { Object.assign(this, { x, z, y: .15, activa: true, estado, vida: this.especial ? 160 : 100, sospecha: 0, t: 0, vel: 0, levanta: 0, cubre: null, agachada: false, apunta: false, llama: 0, desvio: 0, quieta: 0 }); this.g.visible = true; this.anim.ponTorso(null); this.anim.pon('quieto', .01); }
  quita() { this.activa = false; this.g.visible = false; }
  get viva() { return this.activa && this.estado !== 'caida'; }
  // Avanza hacia (tx,tz). Si se atasca contra un muro, rodea unos instantes
  ve_(tx, tz, v, dt, ciudad) {
    let a = Math.atan2(tx - this.x, tz - this.z); const d = Math.hypot(tx - this.x, tz - this.z);
    if (this.desvio) { a += this.ladoDesvio * 1.35; this.desvio = Math.max(0, this.desvio - dt); }
    this.th += difAng(a, this.th) * Math.min(1, dt * 7); this.vel += (Math.min(v, d * 3) - this.vel) * Math.min(1, dt * 6);
    const x0 = this.x, z0 = this.z; this.x += Math.sin(this.th) * this.vel * dt; this.z += Math.cos(this.th) * this.vel * dt;
    if (ciudad.col.resolver(this, .3)) { const av = Math.hypot(this.x - x0, this.z - z0); this.quieta = av < this.vel * dt * .45 ? this.quieta + dt : 0; if (this.quieta > .5 && !this.desvio) { this.desvio = 1.4; this.ladoDesvio = Math.random() < .5 ? 1 : -1; this.quieta = 0; } }
    return d;
  }
  para(dt) { this.vel *= Math.exp(-dt * 9); if (this.vel < .05) this.vel = 0; }
  mira(x, z, dt) { this.th += difAng(Math.atan2(x - this.x, z - this.z), this.th) * Math.min(1, dt * 8); }
  // Cae pero se levanta a los s segundos
  derriba(s) { if (!this.viva) return; this.estado = 'caida'; this.levanta = s; this.t = 0; this.vel = 0; this.anim.ponTorso(null); this.anim.pon('caer_herido', .1); }
  alza(estado) { this.estado = estado; this.levanta = 0; this.t = 0; this.anim.pon('quieto', .9); }
  herir(n) { if (!this.viva) return false; this.vida -= n; if (this.vida <= 0) { this.estado = 'caida'; this.t = 0; this.vel = 0; this.anim.ponTorso(null); this.anim.pon('caer_herido'); return true; } this.anim.ponTorso('impacto', .06, true); return false; }
  dibuja(dt, ciudad, cam, n) {
    const d = Math.hypot(this.x - cam.x, this.z - cam.z); // tampoco se pinta si tapa la cámara
    this.g.visible = d < 120 && d > .9; if (!this.g.visible) return;
    this.y += ((this.x > 1000 ? 0 : ciudad.suelo(this.x, this.z)) - this.y) * .2; this.g.position.set(this.x, this.y, this.z); this.g.rotation.y = this.th;
    const a = this.anim;
    if (this.enCoche) { const c = this.enCoche; this.g.position.set(this.x, c.y, this.z); this.g.rotation.y = c.th; this.y = c.y; a.ponTorso(null); a.pon('quieto_sentado'); if (this.arma) this.arma.visible = false; }
    else if (this.modo === 'rehen') a.pon(this.fija);
    else if (this.agachada && this.estado !== 'caida') { a.ponTorso(null); a.pon('agacharse'); if (this.arma) this.arma.visible = true; }
    else if (this.estado !== 'caida') {
      if (this.vel > 3) { a.pon('correr'); this.ritmo = this.vel / 3.6; } else if (this.vel > .2) { a.pon('andar'); this.ritmo = this.vel / 1.65; } else a.pon(this.llama > 0 ? 'hablar' : 'quieto');
      if (a.torso !== 'impacto' || a.torsoTerminado) { if (this.apunta) { if (a.torso !== 'disparar' || a.torsoTerminado) a.ponTorso('apuntar'); } else a.ponTorso(null); }
      if (this.arma) this.arma.visible = !!this.apunta;
    }
    // De lejos se anima uno de cada tres fotogramas
    this.ac = (this.ac || 0) + dt; if (d < 35 || (n + this.k) % 3 === 0) { a.paso(this.ac, this.ritmo); this.ac = 0; }
  }
}
export class Peatones {
  constructor(escena, mod, ciudad, n = 12) { this.ciudad = ciudad; this.l = Array.from({ length: n }, (_, k) => new Persona(escena, mod, 'civil', k)); }
  // Da la vuelta a la manzana por la acera
  _ruta(p) { const { x, z } = p.manz, r = 32.4; p.esquina = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => ({ x: x + a * r, z: z + b * r })); }
  _nace(p, j) {
    for (let q = 0; q < 12; q++) {
      const i = Math.floor(Math.random() * 7), k = 1 + Math.floor(Math.random() * 5), x = XS[i] + 40, z = ZS[k] + 40; if (Math.abs(x - j.x) > 130 || Math.abs(z - j.z) > 130) continue;
      p.manz = { x, z }; this._ruta(p); p.sg = Math.random() < .5 ? 1 : 3; p.ie = Math.floor(Math.random() * 4); const a = p.esquina[p.ie], b = p.esquina[(p.ie + p.sg) % 4], u = Math.random(), px = a.x + (b.x - a.x) * u, pz = a.z + (b.z - a.z) * u;
      if (Math.hypot(px - j.x, pz - j.z) < 25) continue; p.pon(px, pz); p.ie = (p.ie + p.sg) % 4; p.v = 1.2 + Math.random() * .6; return;
    }
  }
  asusta(x, z, r) { for (const p of this.l) if (p.viva && p.estado !== 'huye' && Math.hypot(p.x - x, p.z - z) < r) { p.estado = 'huye'; p.t = 0; p.de = { x, z }; } }
  paso(dt, j, ley) {
    for (const p of this.l) {
      if (!p.activa || Math.hypot(p.x - j.x, p.z - j.z) > 150) { if (Math.random() < dt * 2) this._nace(p, j); else if (p.activa) p.quita(); continue; }
      p.t += dt;
      if (p.estado === 'caida') { if (p.levanta && p.t > p.levanta) { p.alza('huye'); p.de = { x: j.x, z: j.z }; } else if (p.t > 25) p.quita(); continue; }
      if (p.llama > 0) { p.llama -= dt; p.para(dt); if (p.llama <= 0) { ley.llamada(p); p.estado = 'huye'; p.t = 0; p.de = { x: j.x, z: j.z }; } continue; }
      if (p.estado === 'huye') { const a = Math.atan2(p.x - p.de.x, p.z - p.de.z) + Math.sin(p.k) * .4; p.ve_(p.x + Math.sin(a) * 10, p.z + Math.cos(a) * 10, 4.3, dt, this.ciudad); if (p.t > 9) { p.estado = 'ruta'; p.manz = { x: Math.max(-240, Math.min(240, Math.floor((p.x + 280) / 80) * 80 - 240)), z: Math.max(-160, Math.min(160, Math.floor((p.z + 280) / 80) * 80 - 240)) }; this._ruta(p); } continue; }
      const t = p.esquina[p.ie]; if (p.ve_(t.x, t.z, p.v, dt, this.ciudad) < 1) p.ie = (p.ie + p.sg) % 4;
    }
  }
}
