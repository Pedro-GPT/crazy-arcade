// Motor de escenas: reproduce scenes/datos/*.json. Formato explicado en scenes/datos/LEEME.md
import * as THREE from 'three';
import { Coche } from '../systems/coche.js';
import { Persona } from '../systems/gente.js';
import { creaDecorados, creaFurgon, creaLancha } from './decorados.js';
import { XS, ZS, difAng } from '../systems/rutas.js';
import { CATALOGO } from '../animations/catalogo.js';
const suave = (k) => k * k * (3 - 2 * k), mez = (a, b, k) => a + (b - a) * k, N = (n) => n.length === 2 ? [n[0], 0, n[1]] : n;

// Punto y rumbo de calle más cercano (origen "calle"), lejos de los cruces
export function calleCerca(x, z) {
  const c = (l, v) => l.reduce((m, q) => Math.abs(q - v) < Math.abs(m - v) ? q : m), X = c(XS, x), Z = c(ZS, z), entre = (l, v) => { v = Math.max(l[0] + 1, Math.min(l.at(-1) - 1, v)); const i = l.findIndex(q => q > v), a = l[i - 1]; return Math.max(a + 24, Math.min(a + 56, v)); };
  return Math.abs(x - X) < Math.abs(z - Z) ? { x: X, z: entre(ZS, z), th: 0 } : { x: entre(XS, x), z: Z, th: Math.PI / 2 };
}
function valida(id, e) {
  if (!e.planos?.length) throw new Error(`Escena ${id}: no tiene planos`);
  e.planos.forEach((p, i) => { if (!(p.dur > 0)) throw new Error(`Escena ${id}, plano ${i + 1}: falta dur`); for (const a of p.actores || []) for (const c of ['anim', 'torso']) if (a[c] && !CATALOGO[a[c]]) throw new Error(`Escena ${id}, plano ${i + 1}: no existe la animación ${a[c]}`); });
  return e;
}
export class Cine {
  constructor(o) { // escena, ren, cam3, luz, sol, ciudad, coches, jug, ley, peatones, trafico, mod, partida, sonido, ui
    Object.assign(this, o); this.D = creaDecorados(this.escena, this.ciudad.col); this.furgon = creaFurgon(this.escena); this.lancha = creaLancha(this.escena); this.cache = {}; this.fondoNoche = new THREE.Color(0x05070b); this.activo = null;
    this.patr = [0, 1].map(() => { const c = new Coche(this.escena, 0, 0, 0, 0xe9ebee, true); c.quita(); return c; });
    this.lider = new Persona(this.escena, this.mod, 'civil', 11); this.lider.tinte({ outfit_top: '#2c2a30', outfit_bottom: '#222226' });
    this.reparto = { prota: this.jug, lider: this.lider }; this.ley.agentes.slice(4).forEach((p, k) => this.reparto['agente' + (k + 1)] = p); this.ley.paisanos.forEach((p, k) => this.reparto['maton' + (k + 1)] = p); this.peatones.l.slice(0, 5).forEach((p, k) => this.reparto['civil' + (k + 1)] = p);
    // Esposas del protagonista
    this.esposas = ['L', 'R'].map(l => { const e = this.jug.esq, h = e.huesos[e.idx[l + 'Mano']], t = new THREE.Mesh(new THREE.TorusGeometry(.042, .009, 8, 20).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd0d4d8, metalness: 1, roughness: .25 })); t.scale.setScalar(1 / h.getWorldScale(new THREE.Vector3()).x); t.quaternion.copy(e.repQ[e.idx[l + 'Mano']]).invert(); t.visible = false; h.add(t); return t; });
  }
  async carga(id) { return this.cache[id] ||= valida(id, await fetch(`scenes/datos/${id}.json`).then(r => { if (!r.ok) throw new Error('No existe la escena ' + id); return r.json(); })); }
  // ctx: {rendido, variables para {llaves} de los subtítulos}. Devuelve una promesa que se cumple al terminar
  async pon(id, ctx = {}) {
    return this._abre(id, await this.carga(id), ctx);
  }
  // Escena construida sobre la marcha (diálogos). Se pueden saltar siempre que ya se hayan visto
  ponDatos(id, e, ctx = {}) { const k = id + ':' + e.planos.map(p => p.sub[0].texto).join('|').length + e.planos[0].sub[0].texto.slice(0, 24); return this._abre(k, valida(k, e), ctx); }
  async _abre(id, e, ctx) {
    if (this.activo) this.corta();
    const j = this.jug; this.g0 = { ropa: j.ropa, exp: this.ren.toneMappingExposure, luz: this.luz.intensity };
    const o = e.origen === 'calle' ? calleCerca(j.x, j.z) : { x: j.x, z: j.z, th: j.th };
    return new Promise(fin => {
      this.activo = { id, e, ctx, o, i: -1, t: 0, fin, vista: this.partida.escenaVista(id) }; this.ui.abre(this.activo.vista);
      this.enCoche = j.modo === 'coche' ? j.coche : null; j.agachado = false; j.rendido = false; this.arma0 = j.arma.visible; this._siguiente();
    });
  }
  saltar() { if (this.activo?.vista) this._termina(); }
  corta() { if (this.activo) this._termina(); }
  _siguiente() {
    const A = this.activo; do A.i++; while (A.i < A.e.planos.length && ((A.e.planos[A.i].si && !A.ctx[A.e.planos[A.i].si]) || (A.e.planos[A.i].sino && A.ctx[A.e.planos[A.i].sino])));
    if (A.i >= A.e.planos.length) { this.partida.marcaVista(A.id); return this._termina(); }
    A.t = 0; A.sub = 0; A.son = 0; const p = A.p = A.e.planos[A.i];
    // Lugar del plano
    const d = p.decorado && this.D[p.decorado]; this.D.enciende(p.decorado, p.luces ?? 14); this.ren.toneMappingExposure = this.g0.exp * (p.exposicion ?? 1); this.luz.intensity = this.g0.luz * (p.sol ?? (d ? .25 : 1));
    A.b = d ? { x: d.x, z: d.z, th: 0 } : p.lugar ? { x: p.lugar[0], z: p.lugar[1], th: (p.lugar[2] || 0) * Math.PI / 180 } : A.o;
    // De noche no hay cielo: fondo oscuro
    this.cielo.visible = !p.noche; this.escena.background = p.noche ? this.fondoNoche : null; this.escena.fog.color.set(p.noche ? 0x05070b : 0xc9cfcb);
    // Quién sale: los demás se esconden (salvo "conservar": la calle tal como está)
    if (!p.conservar) { for (const q of [...this.ley.personas, this.lider]) if (q.activa && !q.guardada) q.g.visible = false; for (const k of this.ley.policias) k.cono.visible = k.ojo.visible = false; for (const c of this.coches) c.g.visible = Math.hypot(c.x - A.b.x, c.z - A.b.z) > 14 && !this.ley.patrullas.includes(c) && Math.hypot(c.x - A.b.x, c.z - A.b.z) < 200 && !(p.vehiculos || []).some(v => [v.de, v.a || v.de].some(q => { const w = this._mundo(q); return Math.hypot(w.x - c.x, w.z - c.z) < 16; })); for (const c of this.ley.camaras) c.cono.visible = c.ojo.visible = false; }
    this.ley.heli.visible = !!p.conservar && this.ley.heli.visible; this.jug.g.visible = false;
    // Vehículos
    for (const c of this.patr) c.quita(); this.furgon.g.visible = this.lancha.g.visible = false; A.v = {};
    for (const v of p.vehiculos || []) { const c = v.id === 'furgon' ? this.furgon : v.id === 'lancha' ? this.lancha : this.patr[v.id === 'patrulla2' ? 1 : 0]; A.v[v.id] = { v, c }; if (c.escena) this.escena.add(c.g); c.g.visible = true; if (c.puertaObj != null) c.puerta = c.puertaObj = v.puerta ? 1 : 0; }
    A.act = (p.actores || []).map(a => { const q = this.reparto[a.id]; if (!q) throw new Error('Actor desconocido: ' + a.id); const an = q.anim; an.ponTorso(a.torso || null, .01, true); an.cuerpo = ''; an.pon(this._anim(a), .01); an.fase = (q.k || 0) * .37 % 1; an.mezcla = 1; if (a.t0) an.t = a.t0; if (a.ropa === 'preso') q.tinte({ '': '#ffb878', vanguard: '#ffa860' }); if (q.arma) q.arma.visible = !!a.arma; q.g.visible = true; return { a, q }; });
    const cu = (p.actores || []).find(a => a.id === 'prota'); this.esposas.forEach(t => t.visible = !!cu?.esposas);
    if (this.D.pasillo.puerta) this.D.pasillo.puerta.position.z = this.D.pasillo.zCelda + (p.celda === 'abierta' || p.celda === 'cierra' ? 1.15 : 0);
    this.ciudad.puertaPrision.position.y = this.ciudad.puertaPrision.userData.y; this.D.despacho.maleta.visible = p.maleta !== false;
  }
  _anim(a) { return a.anim || (a.a ? 'andar' : 'quieto'); }
  _mundo(p, b = this.activo.b) { const [x, y, z] = N(p), s = Math.sin(b.th), k = Math.cos(b.th); return new THREE.Vector3(b.x + x * k + z * s, y + (b.y || 0), b.z - x * s + z * k); }
  _cabeza(id) { const q = this.reparto[id]; return q.esq.huesos[q.esq.idx.Head].getWorldPosition(new THREE.Vector3()); }
  paso(dtReal) {
    const A = this.activo; if (!A) return; const p = A.p, dt = dtReal * (p.lento || 1); A.t += dtReal; const k = Math.min(1, A.t / p.dur);
    // Vehículos
    for (const id in A.v) { const { v, c } = A.v[id], a = this._mundo(v.de), b = this._mundo(v.a || v.de), u = v.frena ? 1 - (1 - k) ** 2 : k, x0 = c.x, z0 = c.z; c.x = mez(a.x, b.x, u); c.z = mez(a.z, b.z, u); c.th = v.a ? Math.atan2(b.x - a.x, b.z - a.z) : A.b.th + (v.th || 0) * Math.PI / 180; const l = A.t > dtReal * 1.5 ? Math.hypot(c.x - x0, c.z - z0) : 0; c.y = a.y || 0; c.vx = c.vz = 0; c.giro = 0;
      if (c.pinta) { c.v = l / (dtReal || .016); c.pinta(dtReal); c.sirena(A.t, v.sirena !== false); } else { c.g.position.set(c.x, c.y, c.z); c.g.rotation.y = c.th; for (const w of c.ruedas) w.rotation.x += l / .4; } }
    // Actores
    for (const { a, q } of A.act) {
      let P, th, v = 0;
      if (a.en) { const c = A.v[a.en].c, s = { conductor: [.38, -.25], copiloto: [-.38, -.25], atras: [-.36, -.86], pie: [0, -.6] }[a.asiento || 'atras'], m = this._mundo([s[0], 0, s[1]], { x: c.x, z: c.z, th: c.th }); P = m; P.y = c.y + (a.asiento === 'pie' ? .86 : 0); th = c.th; }
      else { const d = this._mundo(a.de), e = this._mundo(a.a || a.de), ini = a.espera || 0, u = Math.max(0, Math.min(1, (A.t - ini) / ((a.hasta || p.dur) - ini))); P = d.lerp(e, u); const L = Math.hypot(e.x - this._mundo(a.de).x, e.z - this._mundo(a.de).z); v = u > 0 && u < 1 ? L / ((a.hasta || p.dur) - ini) * (p.lento ? 1 / p.lento : 1) : 0;
        th = a.th != null ? A.b.th + a.th * Math.PI / 180 : a.a ? Math.atan2(e.x - this._mundo(a.de).x, e.z - this._mundo(a.de).z) : A.b.th; if (a.mira && A.t > (a.miraT || 0)) { const h = this.reparto[a.mira]; th = Math.atan2(h.g.position.x - P.x, h.g.position.z - P.z); } if (a.gira) th += a.gira * Math.PI / 180 * suave(Math.max(0, Math.min(1, (A.t - (a.giraT || 0)) / .7)));
        P.y += p.decorado ? 0 : this.ciudad.suelo(P.x, P.z); }
      const an = q.anim; let n = this._anim(a); if (a.a && v === 0 && ['andar', 'correr', 'escoltado'].includes(n)) n = n === 'escoltado' ? 'esposado' : (a.alParar || 'quieto'); if (a.luego && A.t > a.luego[0]) n = a.luego[1]; an.pon(n, .3); if (n === 'esposado' && a.esposas && an.t < 1.5) an.t = 1.6;
      if (a.torsoT && A.t > a.torsoT[0] && an.torso !== a.torsoT[1]) { an.ponTorso(a.torsoT[1], .3); if (q.arma && a.torsoT[1] === 'apuntar') q.arma.visible = true; }
      q.g.position.copy(P); q.g.rotation.set(0, q.thC != null && A.t > dtReal * 1.5 ? q.thC += difAng(th, q.thC) * Math.min(1, dtReal * 9) : q.thC = th, 0); an.estado.cab = 0; an.estado.dir = 0; an.paso(dt, v ? v / (n === 'correr' ? 3.6 : n === 'escoltado' ? 1.35 : 1.65) : 1); q.g.updateMatrixWorld(true);
    }
    // Puertas
    if (p.celda === 'cierra') this.D.pasillo.puerta.position.z = this.D.pasillo.zCelda + 1.15 * (1 - suave(Math.max(0, Math.min(1, (A.t - 1.2) / 1.1))));
    if (p.puertaPrision) this.ciudad.puertaPrision.position.y = this.ciudad.puertaPrision.userData.y + 5 * suave(Math.max(0, Math.min(1, (A.t - .6) / 2.2)));
    // Cámara
    const c = p.camara, u = c.lineal ? k : suave(k); let o, m;
    if (c.en) { const w = A.v[c.en].c, b = { x: w.x, z: w.z, th: w.th, y: w.y }; o = this._mundo(c.de, b).lerp(this._mundo(c.a || c.de, b), u); m = c.mira ? this._mundo(c.mira, b).lerp(this._mundo(c.miraA || c.mira, b), u) : null; }
    else if (!c.cara) { o = this._mundo(c.de).lerp(this._mundo(c.a || c.de), u); m = c.mira ? this._mundo(c.mira).lerp(this._mundo(c.miraA || c.mira), u) : null; }
    if (c.cara) { const h = this._cabeza(c.cara); h.y += .06; const q = this.reparto[c.cara], f = q.thC ?? q.g.rotation.y, D = mez(c.dist?.[0] ?? 3, c.dist?.[1] ?? .6, u), an = (c.angulo || 0) * Math.PI / 180; o = new THREE.Vector3(h.x + Math.sin(f + an) * D, h.y + (c.alto || 0), h.z + Math.cos(f + an) * D); m = h; }
    else if (c.sigue) { m = this._cabeza(c.sigue); if (c.sigueY != null) m.y = c.sigueY; }
    if (c.giro) { const s = this._mundo(c.mira), r = o.clone().sub(s).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.giro * Math.PI / 180 * u); o = s.add(r); }
    const T = A.t * 1.3, vib = c.vibra ?? .006; o.x += Math.sin(T * 1.7) * vib; o.y += Math.sin(T * 2.3) * vib;
    this.cam3.position.copy(o); this.cam3.lookAt(m); const fov = mez(c.fov?.[0] ?? c.fov ?? 45, c.fov?.[1] ?? c.fov ?? 45, u); if (Math.abs(this.cam3.fov - fov) > .01) { this.cam3.fov = fov; this.cam3.updateProjectionMatrix(); }
    this.luz.target.position.set(m.x, 0, m.z); this.luz.position.copy(this.luz.target.position).addScaledVector(this.sol, 160);
    // Subtítulos, sonido y fundidos
    let sub = null; for (const s of p.sub || []) if (A.t >= s.t && A.t < s.t + (s.dur || 2.6)) sub = s; this.ui.sub(sub && { quien: sub.quien.replace(/\{(\w+)\}/g, (_, k) => A.ctx[k] ?? ''), texto: sub.texto.replace(/\{(\w+)\}/g, (_, k) => A.ctx[k] ?? '') });
    while (p.sonidos && A.son < p.sonidos.length && A.t >= p.sonidos[A.son].t) this.sonido.pon(p.sonidos[A.son++].id);
    const fi = p.entra ?? .25, fs = p.sale ?? .25; this.ui.negro(p.corte != null && A.t >= p.corte ? 1 : Math.max(0, 1 - A.t / Math.max(.001, fi), fs ? 1 - (p.dur - A.t) / fs : 0)); this.ui.rotulo(p.rotulo && A.t > .4 && A.t < p.dur - .4 ? p.rotulo : '');
    if (A.t >= p.dur) this._siguiente();
  }
  _termina() {
    const A = this.activo, j2 = this.jug; this.activo = null; this.D.enciende(null); this.ren.toneMappingExposure = this.g0.exp; this.luz.intensity = this.g0.luz; for (const c of this.patr) c.quita(); this.furgon.g.visible = this.lancha.g.visible = false; this.cielo.visible = true; this.escena.background = null; this.escena.fog.color.set(0xc9cfcb);
    for (const k in this.reparto) { const q = this.reparto[k]; q.thC = null; q.anim.ponTorso(null); if (q === this.jug) continue; if (q.activa) q.g.visible = true; else q.g.visible = false; if (q.arma) q.arma.visible = false; }
    if (this.enCoche) { j2.anim.pon('conducir', .01); } else j2.anim.pon('quieto', .01); this.esposas.forEach(t => t.visible = false); this.jug.vistete(this.g0.ropa); this.jug.g.visible = true; this.jug.arma.visible = false; this.ciudad.puertaPrision.position.y = this.ciudad.puertaPrision.userData.y; this.ui.cierra(); this.sonido.calla(); A.fin(A.ctx);
  }
}
