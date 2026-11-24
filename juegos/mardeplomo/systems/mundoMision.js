// Ejecuta en la ciudad los pasos de las misiones: marcadores, diálogos, ventas, combates, compañeros e interiores
import * as THREE from 'three';
import { Persona } from './gente.js';
import { Coche } from './coche.js';
import { ve } from './percepcion.js';
import { Cancelada } from './misiones.js';
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export class MundoMision {
  constructor(o) { // escena, ciudad, coches, jug, ley, cine, decide, en, mod, ui, sonido, partida
    Object.assign(this, o); this.mundo = { jug: this.jug, ley: this.ley }; this.esperas = []; this.objetivo = ''; this.punto = null; this.msg = null; this.progreso = 0; this.companeros = []; this.rivales = []; this.vars = {}; this.int = null;
    this.banda = Array.from({ length: 8 }, (_, k) => new Persona(this.escena, this.mod, 'banda', k * 3 + 2)); this.ley.extra = this.banda; this.ley._pers = null;
    const m = new THREE.MeshBasicMaterial({ color: 0xf0a93b, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false, fog: false }); this.haz = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 30, 24, 1, true).translate(0, 15, 0), m); this.haz.visible = false; this.escena.add(this.haz);
    const de = this.ley.interaccion.bind(this.ley); this.ley.interaccion = (j, en) => this._interaccion(j, en) || (!this.int && de(j, en));
  }
  get dinero() { return this.jug.dinero; } get estrellas() { return this.ley.b.estrellas; }
  // ---- Esperas por fotograma ----
  hasta(f) { return new Promise((r, x) => this.esperas.push({ f, r, x })); }
  corta() { const e = this.esperas; this.esperas = []; for (const q of e) q.x(new Cancelada()); this.punto = null; this.e = null; this.objetivo = ''; this.progreso = 0; this.jug.vendiendo = false; this.msg = null; }
  // Punto cercano desde el que un obstáculo tapa al jugador
  _cobertura(p, j) {
    let m = null, b = 1e9; const o = { x: j.x, y: 1.4, z: j.z };
    for (let k = 0; k < 26; k++) { const a = Math.random() * 6.28, r = 2 + Math.random() * 12, q = { x: p.x + Math.sin(a) * r, z: p.z + Math.cos(a) * r }, d = dist(q, j); if (d < 8 || d > 30) continue; const g = { ...q }; if (this.ciudad.col.resolver(g, .45)) continue; if (this.rivales.some(t => t !== p && t.viva && t.cubre && dist(t.cubre, q) < 1.8)) continue; const v = { x: (q.x - j.x) / d, y: (.7 - 1.4) / d, z: (q.z - j.z) / d }; if (this.ciudad.col.rayo(o, v, d) > d - .2) continue; const c = r + Math.abs(d - 15) * .5; if (c < b) { b = c; m = q; } }
    return m;
  }
  _libre() { const p = this.banda.find(q => !q.activa); if (!p) throw new Error('No quedan personajes de misión'); p.modo = null; return p; }
  despeja() { for (const p of this.banda) p.quita(); this.companeros = []; this.rivales = []; this.gente = []; if (this.int) this._fuera(); }
  paso(dt) {
    this.dt = dt; const j = this.jug;
    if (this.punto) { this.haz.visible = !this.int || this.punto[0] > 1000; this.haz.position.set(this.punto[0], 0, this.punto[1]); const r = Math.max(1.2, Math.min(6, this.radio || 2)); this.haz.scale.set(r, this.int ? .08 : 1, r); this.haz.rotation.y += dt; } else this.haz.visible = false;
    if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
    for (const q of [...this.esperas]) { let v; try { v = q.f(dt); } catch (e) { q.x(e); v = true; } if (v && this.esperas.includes(q)) { this.esperas.splice(this.esperas.indexOf(q), 1); q.r(v); } }
    this._gente(dt);
  }
  _interaccion(j, en) { const e = this.e; if (!e || j.modo !== 'pie' || Math.hypot(e.punto[0] - j.x, e.punto[1] - j.z) > (e.radio || 2)) return false; j.aviso = 'E: ' + e.accion; if (en.pulsada('KeyE')) e.pulsado = true; e.dentro = true; return true; }
  _marca(n) { this.objetivo = n.objetivo; this.punto = n.punto || null; this.radio = n.radio; }
  _fin() { this.objetivo = ''; this.punto = null; this.e = null; this.progreso = 0; }
  // ---- Pasos ----
  async dialogo(n) { await this.cine.ponDatos('dialogo', planosDialogo(n), { ...this.vars }, n.lugar || 'despacho'); }
  async escena(n) { await this.cine.pon(n.escena, { ...this.vars, ...n.vars, rendido: n.rendido }); }
  async llamada(n) { this.sonido.pon('telefono'); for (const [quien, texto] of n.lineas) { const t = 1.6 + texto.length * .05; this.msg = { quien: '📞 ' + quien, texto, t }; let q = 0; await this.hasta(dt => (q += dt) > t); } }
  async mensaje(n) { this.sonido.pon('mensaje'); this.msg = { quien: n.quien || 'Ayuda', texto: n.texto, t: n.dur || 7 }; }
  decision(n) { return this.decide(n); }
  async ir(n) { this._marca(n); await this.hasta(() => Math.hypot(this.jug.x - n.punto[0], this.jug.z - n.punto[1]) < (n.radio || 4) && ['pie', 'coche'].includes(this.jug.modo) && (!n.sinPolicia || !this.estrellas) && (!n.aPie || this.jug.modo === 'pie') && (!n.enCoche || this.jug.modo === 'coche')); this._fin(); }
  async interactuar(n) { this._marca(n); this.radio = n.radio || 1.6; this.e = { punto: n.punto, radio: n.radio || 2, accion: n.accion || 'continuar' }; await this.hasta(() => this.e.pulsado); this._fin(); }
  // Quedarse en un punto unos segundos (caja fuerte…). Si te alejas, baja despacio
  async mantener(n) { this._marca(n); this.radio = n.radio || 1.6; let t = 0; await this.hasta(dt => { const d = Math.hypot(this.jug.x - n.punto[0], this.jug.z - n.punto[1]) < (n.radio || 2); t = Math.max(0, t + (d ? dt : -dt * .5)); this.progreso = t / n.seg; if (d) this.jug.aviso = n.accion || ''; return t >= n.seg; }); this._fin(); }
  async esperar(n) { this.objetivo = n.objetivo || ''; let t = 0; await this.hasta(dt => (t += dt) > n.seg); this._fin(); }
  async perder(n) { this.objetivo = n.objetivo || 'Despista a la policía'; await this.hasta(() => !this.estrellas); this._fin(); }
  // Vender n.n paquetes. Devuelve true si se completa sin que te descubran
  async vender(n) {
    let hechos = 0, cl = null, t = 0, ult = -1;
    const nuevo = () => { let i; do i = Math.floor(Math.random() * n.sitios.length); while (i === ult); ult = i; cl = this._libre(); const [x, z] = n.sitios[i]; cl.pon(x, z); cl.modo = 'cliente'; cl.th = Math.random() * 6; t = 0; };
    nuevo(); let pausa = 0;
    const r = await this.hasta(dt => {
      const j = this.jug; this.objetivo = `${n.objetivo} (${hechos}/${n.n})`; if (this.estrellas) return 'visto';
      if (!cl) { this.punto = null; if ((pausa -= dt) <= 0) nuevo(); return false; }
      if (!cl.viva) return 'visto';
      this.punto = [cl.x, cl.z]; this.radio = 1.2; const cerca = dist(cl, j) < 1.9 && j.modo === 'pie' && !j.mirando; j.vendiendo = cerca && this.en.tiene('KeyE'); cl.llama = j.vendiendo ? 1 : 0;
      if (cerca) { cl.mira(j.x, j.z, dt); j.aviso = 'Mantén E: vender'; } this.e = cerca ? { punto: [cl.x, cl.z], radio: 2.2, accion: 'vender (mantener)' } : null;
      t = j.vendiendo ? t + dt : Math.max(0, t - dt); this.progreso = t / 1.6;
      if (t >= 1.6) { hechos++; j.dinero += n.precio; j.vendiendo = false; cl.llama = 0; cl.modo = 'seVa'; const q = cl; setTimeout(() => q.modo === 'seVa' && q.quita(), 6000); cl = null; pausa = 2.5; this.progreso = 0; this.sonido.pon('mensaje'); if (hechos >= n.n) return 'si'; }
      return false;
    });
    this.jug.vendiendo = false; if (cl) { cl.llama = 0; cl.modo = 'seVa'; } for (const p of this.banda) if (p.modo === 'seVa') { const q = p; setTimeout(() => q.modo === 'seVa' && q.quita(), 4000); } this._fin(); return r === 'si';
  }
  async combate(n) {
    this._marca(n); this.rivales = n.rivales.map(([x, z]) => { const p = this._libre(); const q = { x, z }; this.ciudad.col.resolver(q, .4); p.pon(q.x, q.z, 'ataca'); p.modo = 'rival'; p.fase = null; p.agachada = false; p.tf = 0; p.tc = 0; p.cad = 1 + Math.random(); p.vida = (n.vida || 80) * 1.4; return p; });
    await this.hasta(() => { const v = this.rivales.filter(p => p.viva); this.objetivo = `${n.objetivo} (${this.rivales.length - v.length}/${this.rivales.length})`; if (v[0]) this.punto = [v[0].x, v[0].z]; return !v.length || (n.escapa && dist({ x: n.escapa[0], z: n.escapa[1] }, this.jug) < 8); }); for (const p of this.rivales) if (p.viva) p.modo = 'seVa'; this._fin();
  }
  // Entra en un interior (banco). Guarda dónde estaba
  async interior(n) {
    const D = this.cine.D[n.lugar]; this.fuera = { x: this.jug.x, z: this.jug.z }; this.int = n.lugar; this.cine.D.enciende(n.lugar, 22); Object.assign(this.jug, { x: D.x + n.entra[0], z: D.z + n.entra[1], y: 0, vel: 0 }); this.cam.yaw = Math.PI; this.cam.foco.set(this.jug.x, 1.5, this.jug.z); this.ley.interior = true;
    this.companeros.forEach((p, k) => { p.x = this.jug.x + (k ? 1 : -1); p.z = this.jug.z + .8; }); this.gente = (n.gente || []).map(([x, z, anim]) => { const p = this._libre(); p.pon(D.x + x, D.z + z); p.modo = 'rehen'; p.fija = anim || 'rendirse'; p.th = Math.atan2(-x, 4 - z); return p; });
  }
  _fuera() { this.int = null; this.ley.interior = false; this.cine.D.enciende(null); for (const p of this.gente || []) p.quita(); this.gente = []; if (this.fuera) { this.jug.x = this.fuera.x; this.jug.z = this.fuera.z; this.jug.y = .15; this.companeros.forEach((p, k) => { p.x = this.jug.x + (k ? 1 : -1); p.z = this.jug.z + 1; }); this.cam.foco.set(this.jug.x, 1.5, this.jug.z); } }
  async salir() { this._fuera(); }
  // Cambios del mundo: coche, companeros, calor, quitar…
  async poner(n) {
    if (n.coche) { const [x, z, g] = n.coche, c = new Coche(this.escena, x, z, (g || 0) * Math.PI / 180, parseInt((n.color || '#2b2f33').slice(1), 16)); c.robado = true; c.y = this.ciudad.suelo(x, z); c.pinta(.02); this.coches.filter(o => o.misionV).forEach(o => { if (o !== this.jug.coche && dist(o, this.jug) > 40) { this.coches.splice(this.coches.indexOf(o), 1); o.quita(); } }); c.misionV = true; for (const o of [...this.coches]) if (o !== this.jug.coche && !o.misionV && dist(o, c) < 6) { if (o.trafico) this.ley.trafico.suelta(o); this.coches.splice(this.coches.indexOf(o), 1); o.quita(); } this.coches.push(c); }
    if (n.companeros != null) { while (this.companeros.length < n.companeros) { const p = this._libre(); p.pon(this.jug.x - 1.5 + this.companeros.length * 3, this.jug.z + 1.5); p.modo = 'sigue'; p.vida = 300; this.companeros.push(p); } while (this.companeros.length > n.companeros) this.companeros.pop().quita(); }
    if (n.estrellas != null) { const U = [0, 1, 25, 60, 110, 180]; this.ley.b.calor = n.suma ? Math.max(this.ley.b.calor, U[n.estrellas]) : U[n.estrellas]; this.ley.b.ultima = { x: this.jug.x, z: this.jug.z }; this.ley.b.desc = { ropa: this.jug.ropa, coche: this.jug.coche }; this.ley.b.tSin = 0; if (n.estrellas) this.ley.visto = 1; }
    if (n.quitaPaisano != null) { const p = this.ley.paisanos[n.quitaPaisano]; p.quita(); p.vuelve = 400; }
    if (n.balas) { this.jug.reserva = Math.max(this.jug.reserva, n.balas); if (!this.jug.balas) this.jug.balas = 12; } if (n.vida) this.jug.vida = 100; if (n.vars) Object.assign(this.vars, n.vars); if (n.lleva) this.jug.suyo = this.jug.coche;
  }
  async fin(n, m) {
    const pago = Math.round((n.pago || 0) * (this.partida.confianza < 30 ? .6 : this.partida.confianza >= 75 ? 1.25 : 1)); this.partida.misiones[m.id] = n.resultado; this.jug.dinero += pago;
    if (!n.sinEscena) await this.cine.pon('exito', { ...this.vars, reaccion: n.reaccion, parte: pago.toLocaleString('es-ES') }); this.despeja();
  }
  async final(n) { if (n.escena) await this.cine.pon(n.escena, { ...this.vars, rendido: n.rendido }); this.despeja(); }
  // ---- Comportamiento de los personajes de misión ----
  _gente(dt) {
    const j = this.jug;
    for (const p of this.banda) {
      if (!p.activa) continue; p.t += dt; p.cad = Math.max(0, p.cad - dt); p.apunta = false;
      if (p.estado === 'caida') { if (p.levanta && p.t > p.levanta) p.alza('ataca'); else if (p.t > 25 && p.modo !== 'sigue') p.quita(); continue; }
      if (p.modo === 'cliente') p.para(dt);
      else if (p.modo === 'rehen') { p.para(dt); p.anim.pon(p.fija); }
      else if (p.modo === 'seVa') { const a = Math.atan2(p.x - j.x, p.z - j.z); p.ve_(p.x + Math.sin(a) * 9, p.z + Math.cos(a) * 9, 2.2, dt, this.ciudad); if (dist(p, j) > 60) p.quita(); }
      else if (p.modo === 'rival') {
        const d = dist(p, j), veo = j.modo !== 'oculto' && ve({ x: p.x, y: p.y + 1.6, z: p.z, th: p.th }, { x: j.x, y: j.y + (j.agachado ? .75 : 1.2), z: j.z }, 45, 3.2, this.ciudad.col) != null;
        // Ciclo: ir a cubierto -> esperar agachado -> asomarse y disparar una ráfaga -> cambiar de sitio
        const puede = j.modo !== 'herido' && j.modo !== 'detenido'; p.agachada = false; p.fase = p.fase || 'cubre'; p.tf = (p.tf || 0) - dt;
        if (d > 34 || (!veo && p.fase === 'asoma' && p.tf < -3)) { p.fase = 'cubre'; p.cubre = null; if (d > 34) { p.ve_(j.x, j.z, 4, dt, this.ciudad); continue; } }
        if (p.fase === 'cubre') {
          p.cubre ||= this._cobertura(p, j); if (!p.cubre) { p.fase = 'asoma'; p.tf = 1.6 + Math.random(); p.lado = Math.random() < .5 ? 1 : -1; }
          else { const q = p.ve_(p.cubre.x, p.cubre.z, 4.6, dt, this.ciudad); p.tc = (p.tc || 0) + dt; if (veo && d < 20 && p.t % 1 < .5 && !p.cad && puede) { p.apunta = true; this.ley._dispara(p, d * 1.8); } if (q < .7 || p.tc > 4) { p.fase = 'espera'; p.tf = .7 + Math.random() * 1.3; p.tc = 0; } }
        } else if (p.fase === 'espera') { p.para(dt); p.mira(j.x, j.z, dt); p.agachada = true; if (p.tf <= 0) { p.fase = 'asoma'; p.tf = 1.8 + Math.random() * 1.4; p.lado = Math.random() < .5 ? 1 : -1; } }
        else { // asoma
          if (veo) { p.apunta = true; p.mira(j.x, j.z, dt); const a = p.th + Math.PI / 2 * p.lado, v = .9 * dt, ox = p.x, oz = p.z; p.x += Math.sin(a) * v; p.z += Math.cos(a) * v; if (this.ciudad.col.resolver(p, .35)) p.lado *= -1; p.vel = 0; if (!p.cad && puede) this.ley._dispara(p, d); if (p.tf <= 0) { p.fase = 'cubre'; p.cubre = null; p.tc = 0; } }
          else p.ve_(j.x, j.z, 2.6, dt, this.ciudad);
        }
      } else if (p.modo === 'sigue') {
        const k = this.companeros.indexOf(p); p.enCoche = null;
        if (j.modo === 'coche') { const s = j.coche.punto(k ? -.36 : -.38, k ? -.86 : -.25); if (p.sube || dist(p, j) < 9 || Math.abs(j.coche.v) > 4) { p.sube = true; p.x = s.x; p.z = s.z; p.th = j.coche.th; p.vel = 0; p.enCoche = j.coche; continue; } }
        else if (p.sube && j.modo === 'pie') { const s = j.coche || j; p.sube = false; p.x = j.x + (k ? 1.2 : -1.2); p.z = j.z + 1; this.ciudad.col.resolver(p, .35); }
        const r = this.rivales.find(q => q.viva && dist(q, p) < 22); if (r) { p.para(dt); p.mira(r.x, r.z, dt); p.apunta = true; if (!p.cad) { p.cad = 1.3; p.anim.ponTorso('disparar', .05, true); if (Math.random() < .4) r.herir(25); } }
        else { const x = j.x - Math.sin(j.th) * 1.8 + Math.cos(j.th) * (k ? 1.2 : -1.2), z = j.z - Math.cos(j.th) * 1.8 - Math.sin(j.th) * (k ? 1.2 : -1.2), d = Math.hypot(x - p.x, z - p.z); if (d > 45 && !j.coche) { p.x = x; p.z = z; } else if (d > 1) p.ve_(x, z, d > 4 ? 5 : 2, dt, this.ciudad); else p.para(dt); }
      }
    }
  }
}
// Convierte un diálogo en planos: plano del que habla, por encima del hombro del otro
export function planosDialogo(n) {
  const desp = !n.lugar || n.lugar === 'despacho', otro = n.con || 'lider', A = desp ? [0, .4] : [5.6, 0], B = desp ? [.3, -2.9] : [5.6, 1.7];
  const dir = B[1] > A[1] ? 1 : -1, planos = n.lineas.map(([quien, texto], i) => {
    const yo = quien === 'Tú', o = yo ? B : A, m = yo ? A : B, s = yo ? -dir : dir;
    return { dur: 1.5 + texto.length * .052, ...(desp ? { decorado: 'despacho', maleta: false } : {}), actores: [{ id: 'prota', de: A, th: dir > 0 ? 0 : 180, anim: yo ? 'hablar' : 'quieto' }, { id: otro, de: B, th: dir > 0 ? 180 : 0, anim: yo ? 'quieto' : 'hablar' }], camara: yo && desp ? { de: [-1.1, 1.5, -1.9], a: [-1, 1.5, -1.8], mira: [0, 1.35, .4], fov: 44 } : { de: [o[0] + .75, 1.65, o[1] - s * 1.0], a: [o[0] + .7, 1.65, o[1] - s * .9], mira: [m[0], 1.45, m[1]], fov: 40 }, entra: i ? .01 : .4, sale: i === n.lineas.length - 1 ? .4 : 0, sub: [{ t: .15, dur: 99, quien, texto }] };
  });
  return { origen: desp ? 'aqui' : 'calle', planos };
}
