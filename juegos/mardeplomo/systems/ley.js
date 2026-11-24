// La ley: quién te ve, cuánto sospecha, y qué manda la policía en cada nivel de búsqueda
import * as THREE from 'three';
import { Busqueda } from './busqueda.js';
import { ve, ritmoSospecha } from './percepcion.js';
import { CamaraSeg, creaCono, tinteCono, creaOjo, ponOjo } from './vigilancia.js';
import { Persona, ROPA } from './gente.js';
import { Coche } from './coche.js';
import { nodoCerca, siguiente, carril, pos, pilota, XS, ZS } from './rutas.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const N_COCHES = [0, 1, 2, 3, 3, 4]; // coches persiguiendo por estrella
// Rutas fijas de vigilancia. tipo: policia (uniforme) o paisano
const PUESTOS = [
  { tipo: 'paisano', ruta: [[-99, 66], [-99, 96], [-66, 98]] }, { tipo: 'paisano', ruta: [[-62, 62], [-62, 95]] },
  { tipo: 'policia', ruta: [[-32.4, 32.4], [32.4, 32.4]] }, { tipo: 'policia', ruta: [[32.4, -32.4], [32.4, 30]] },
  { tipo: 'policia', ruta: [[-112.4, 112.4], [-47.6, 112.4]] }, { tipo: 'policia', ruta: [[30, 214], [140, 214]] },
];
export class Ley {
  constructor(o) { // escena, ciudad, coches, jug, peatones, trafico, mod
    Object.assign(this, o); this.b = new Busqueda(); this.t = 0; this.n = 0; this.radio = ''; this.tRadio = 0; this.reserva = []; this.patrullas = []; this.controles = []; this.arresto = 0; this.visto = 0; this.estAnt = 0; this.llamadas = 0; this.tRef = 0; this.fin = null; this.trazas = [];
    this.agentes = Array.from({ length: 8 }, (_, k) => new Persona(this.escena, this.mod, 'policia', k));
    this.paisanos = [0, 1].map(k => new Persona(this.escena, this.mod, 'paisano', k * 5 + 4));
    for (const p of [...this.agentes, ...this.paisanos]) { p.cono = creaCono(this.escena, 16, .6); p.ojo = creaOjo(this.escena); p.cono.visible = false; }
    this.camaras = this.ciudad.camaras.map(c => new CamaraSeg(this.escena, c));
    // Helicóptero
    const h = this.heli = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x16264a, roughness: .4, metalness: .3 }), pon = (g, x, y, z, mt = m) => { const q = new THREE.Mesh(g, mt); q.position.set(x, y, z); q.castShadow = true; h.add(q); return q; };
    pon(new THREE.SphereGeometry(1.3, 20, 14).scale(1, .95, 1.7), 0, 0, 0); pon(new THREE.CylinderGeometry(.12, .4, 5, 10).rotateX(Math.PI / 2).scale(1, 1, -1), 0, .3, -4); pon(new THREE.BoxGeometry(.1, 1.4, .8), 0, .8, -6.3);
    pon(new THREE.SphereGeometry(1.05, 16, 12).scale(1, .9, 1.2), 0, .05, 1.15, new THREE.MeshStandardMaterial({ color: 0x6f8fa0, roughness: .05, metalness: .4 })); for (const s of [-1, 1]) pon(new THREE.CylinderGeometry(.06, .06, 3.4, 8).rotateX(Math.PI / 2), s * 1, -1.6, .2); pon(new THREE.CylinderGeometry(.1, .1, .7, 8), 0, 1.4, 0);
    this.rotor = pon(new THREE.BoxGeometry(.28, .05, 10), 0, 1.75, 0); this.rotor2 = pon(new THREE.BoxGeometry(10, .05, .28), 0, 1.75, 0); h.visible = false; this.escena.add(h);
    this.foco = new THREE.SpotLight(0xe8f2ff, 0, 130, .13, .5, 0); this.escena.add(this.foco, this.foco.target);
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.BufferAttribute(new Float32Array(36), 3)); this.lineas = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: .7 })); this.lineas.frustumCulled = false; this.escena.add(this.lineas);
    PUESTOS.forEach((p, k) => { const q = p.tipo === 'paisano' ? this.paisanos[k] : this.agentes[k - 2]; q.puesto = p; q.ip = 0; q.pon(...p.ruta[0]); });
    for (const p of this.ciudad.roperos) { const a = new THREE.Mesh(new THREE.TorusGeometry(.8, .05, 8, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6fd0e8 })); a.position.set(p.x, .25, p.z); this.escena.add(a); }
  }
  di(t) { if (this.radio !== t) { this.radio = t; this.tRadio = 5; } }
  get policias() { return [...this.agentes, ...this.paisanos]; }
  get personas() { return this._pers ||= [...this.agentes, ...this.paisanos, ...this.peatones.l, ...(this.extra || [])]; }

  // ---- Delitos ----
  // ¿Hay algún policía o cámara que lo presencie ahora? (radio: distancia a la que además se oye)
  testigoPolicial(radio) {
    const j = this.jug; if (this.camaras.some(c => c.vida && c.ve)) return true;
    return this.policias.some(p => p.viva && (p.ve != null || dist(p, j) < radio)) || this.patrullas.some(c => dist(c, j) < Math.max(radio, 25));
  }
  // Si nadie de la ley lo ve, puede llamar un vecino (tarda unos segundos)
  delito(tipo, radio = 0) {
    if (this.fin) return;
    const j = this.jug;
    if (this.testigoPolicial(radio)) { const antes = this.b.estrellas; this.b.delito(tipo, j); this.b.desc = { ropa: j.ropa, coche: j.coche }; if (this.b.estrellas > antes) this.visto = 1; return; }
    const v = this.peatones.l.filter(p => p.viva && !p.llama && dist(p, j) < Math.max(28, radio)).sort((a, b) => dist(a, j) - dist(b, j))[0];
    if (v && this.llamadas < 2) { v.llama = 4; v.delito = tipo; v.vio = { ropa: j.ropa, coche: j.coche, x: j.x, z: j.z }; v.mira(j.x, j.z, 1); this.llamadas++; }
  }
  llamada(p) { this.llamadas--; if (!p.vio) return; this.b.delito(p.delito, p.vio); this.b.desc = { ropa: p.vio.ropa, coche: p.vio.coche }; this.di('Radio: un vecino ha llamado. Unidad de camino.'); }
  // Disparo del jugador: devuelve la distancia al blanco alcanzado o null
  impacto(o, d, max) {
    this.peatones.asusta(this.jug.x, this.jug.z, 45); let m = null, t = max;
    for (const p of this.personas) if (p.viva && p.modo !== 'sigue') { // cápsula vertical aproximada
      const A = d.x * d.x + d.z * d.z; if (A < 1e-6) continue; const u = ((p.x - o.x) * d.x + (p.z - o.z) * d.z) / A; if (u < 0 || u > t) continue;
      const y = o.y + d.y * u - p.y; if (y < 0 || y > 1.8 || Math.hypot(o.x + d.x * u - p.x, o.z + d.z * u - p.z) > .32) continue; m = p; t = u; p.cabezazo = y > 1.5;
    }
    for (const c of this.camaras) if (c.vida) { const v = new THREE.Vector3(c.x - o.x, c.y + .25 - o.y, c.z - o.z), u = v.dot(d); if (u > 0 && u < t + .6 && v.addScaledVector(d, -u).length() < .35) { c.rompe(); this.delito('disparo', 45); return u; } }
    if (m) { const cae = m.herir(m.cabezazo ? 75 : 34), pol = m.tipo === 'policia' || m.tipo === 'paisano'; if (cae) m.llama = 0; this.delito(pol ? (cae ? 'matarPolicia' : 'agredirPolicia') : cae ? 'matar' : 'herir', 45); return t; }
    this.delito('disparo', 45); return null;
  }
  roba(c) {
    if (c.policia && this.patrullas.includes(c)) { this.patrullas.splice(this.patrullas.indexOf(c), 1); this.delito('agredirPolicia', 40); }
    else if (c.trafico) { this.trafico.suelta(c); this._conductor(c); this.delito('robo'); }
    else if (!c.robado && c !== this.jug.suyo) this.delito('robo');
    c.robado = true; c.sirena(0, false);
  }
  _conductor(c) { const p = this.peatones.l.find(q => !q.activa) || this.peatones.l.reduce((a, q) => dist(q, this.jug) > dist(a, this.jug) ? q : a); const s = c.punto(1.7, .2); p.manz = { x: 0, z: 0 }; this.peatones._ruta(p); p.ie = 0; p.sg = 1; p.v = 1.5; p.pon(s.x, s.z, 'huye'); p.de = { x: c.x, z: c.z }; }

  // ---- Interacciones del jugador a pie (contenedor, ropa). Devuelve true si se ha usado E ----
  interaccion(j, en) {
    for (const s of this.ciudad.escondites) if (dist(s, j) < 1.9) { j.aviso = 'E: esconderse en el contenedor'; if (en.pulsada('KeyE')) { if (this.visto > .2) this.di('Te han visto esconderte.'); j.oculta(s); j.vistoAlEntrar = this.visto > .2; return true; } return true; }
    for (const s of this.ciudad.roperos) if (dist(s, j) < 1.6) { j.aviso = j.dinero >= 60 ? 'E: cambiarse de ropa (60 €)' : 'Ropa: hacen falta 60 €'; if (en.pulsada('KeyE') && j.dinero >= 60) { j.dinero -= 60; j.vistete((j.ropa + 1) % ROPA.length); this.di(this.visto > .2 ? 'Te han visto cambiarte: no sirve de disfraz.' : 'Ropa cambiada.'); } return true; }
    return false;
  }

  // ---- Percepción: lo sospechoso que resultas ----
  llamativo() {
    const j = this.jug, s = this.b.estrellas; let v = 0;
    if (j.mirando || j.tDisparo < 4) v = 2; if (j.modo === 'pie' && j.agachado) v = Math.max(v, .12); if (j.vendiendo) v = Math.max(v, .8);
    if (s) v = Math.max(v, this.b.disfrazado(j.ropa, j.coche) ? .16 : 3);
    return v;
  }
  _mira(p, o, alcance, semi, dt) {
    const j = this.jug; let d = null;
    if (j.modo !== 'oculto') d = ve(o, { x: j.x, y: j.y + (j.agachado ? .75 : 1.25), z: j.z }, alcance, semi, this.ciudad.col);
    p.ve = d; const l = this.llamativo();
    if (d != null && l) p.sospecha = Math.min(1, p.sospecha + ritmoSospecha(l, d, alcance) * dt); else p.sospecha = Math.max(0, p.sospecha - .22 * dt);
    if (d != null && p.sospecha >= 1) {
      if (!this.b.estrellas) { this.b.delito(j.mirando || j.tDisparo < 4 ? 'armaVista' : j.vendiendo ? 'venta' : 'sospechoso', j); this.di('Radio: individuo sospechoso, voy a identificarle.'); }
      this.visto = .8;
    }
  }

  paso(dt, cam) {
    const j = this.jug, b = this.b; this.t += dt; this.n++; this.tRadio -= dt; if (this.tRadio < 0) this.radio = ''; this.visto = Math.max(0, this.visto - dt);
    if (this.fin) return this._final(dt);
    if (this.interior) { if (j.modo === 'herido') this._acaba('abatido'); return; }
    // Vigilantes: cada uno mira 10 veces por segundo, repartidos
    const V = [...this.policias.filter(p => p.viva), ...this.camaras.filter(c => c.vida)];
    V.forEach((p, k) => { p.ac2 = (p.ac2 || 0) + dt; if ((this.n + k) % 6) return; const q = p.ac2; p.ac2 = 0; const esC = p instanceof CamaraSeg, al = esC ? p.alcance : b.estrellas ? 32 : 18; if (dist(p, j) > al + 2) { p.ve = null; p.sospecha = Math.max(0, p.sospecha - .22 * q); } else this._mira(p, { x: p.x, y: esC ? p.y + .1 : p.y + 1.65, z: p.z, th: p.th }, al, esC ? p.semi : b.estrellas ? .95 : .65, q); });
    // Los coches patrulla (y los controles) también miran: hacia delante y a los lados
    if (b.estrellas) this.patrullas.forEach((c, k) => { if ((this.n + k) % 8 || dist(c, j) > 28 || j.modo === 'oculto') return; if (ve({ x: c.x, y: c.y + 1.2, z: c.z, th: c.th }, { x: j.x, y: j.y + 1.2, z: j.z }, this.b.disfrazado(j.ropa, j.coche) ? 8 : 28, .9, this.ciudad.col) != null) { this.visto = Math.max(this.visto, .5); for (const p of this.policias) if (p.viva && dist(p, c) < 15) p.sospecha = Math.max(p.sospecha, .6); } });
    for (const c of this.camaras) if (c.vida) c.paso(dt, j);
    const s = b.estrellas;
    if (s > this.estAnt) this.di(['', 'Radio: buscamos a un sospechoso en la zona.', 'Radio: sospechoso localizado, refuerzos.', 'Radio: persecución en curso, todas las unidades.', 'Radio: cortad las carreteras. Helicóptero en camino.', 'Radio: unidad especial autorizada.'][s]); else if (s < this.estAnt) this.di(s ? 'Radio: lo hemos perdido, seguid buscando.' : 'Ya no te buscan.');
    this.estAnt = s;
    const oculto = j.modo === 'oculto' && !j.vistoAlEntrar; if (j.modo === 'oculto' && j.vistoAlEntrar && this.policias.some(p => p.viva && dist(p, j) < 6)) { j.modo = 'pie'; j.x = j.volver.x; j.z = j.volver.z; this.visto = 1; }
    b.paso(dt, { visto: this.visto > 0, oculto, ropa: j.ropa, coche: j.coche, pos: j, huye: !j.rendido && j.modo !== 'detenido' });
    // Objetivo conocido por la policía: solo la última posición vista
    this.obj = s ? (this.visto > 0 ? { x: j.x, z: j.z } : b.ultima || { x: j.x, z: j.z }) : null;
    this._atropellos(); this._agentes(dt); this._patrullas(dt, cam); this._controles(dt); this._heli(dt); this._arresto(dt);
    const p = this.lineas.geometry.attributes.position; p.array.fill(0); this.trazas = this.trazas.filter(q => (q.t -= dt) > 0); this.trazas.slice(0, 6).forEach((q, k) => p.array.set(q.p, k * 6)); p.needsUpdate = true;
    if (j.modo === 'herido') this._acaba('abatido');
  }
  _agentes(dt) {
    const j = this.jug, s = this.b.estrellas, ag = j.tDisparo < 20 || j.mirando;
    for (const p of this.policias) {
      if (!p.activa) { p.cono.visible = p.ojo.visible = false; continue; } p.t += dt; p.apunta = false;
      const lejos = dist(p, j);
      if (p.estado === 'caida') { if (p.levanta && p.t > p.levanta) p.alza('persigue'); else if (p.t > 25) { p.quita(); p.vuelve = 40; } } else {
        p.cad = Math.max(0, p.cad - dt);
        if (!s) {
          if (p.estado === 'ruta' && p.puesto) {
            const [x, z] = p.puesto.ruta[p.ip]; if (p.espera > 0) { p.espera -= dt; p.para(dt); p.th += Math.sin(p.t * .9) * dt * .6; } else if (p.ve_(x, z, 1.25, dt, this.ciudad) < .8) { p.ip = (p.ip + 1) % p.puesto.ruta.length; p.espera = 2 + Math.random() * 4; }
            if (p.sospecha > .25 && p.ve != null) { p.para(dt); p.mira(j.x, j.z, dt); }
          } else { p.estado = 'ruta'; if (!p.puesto) { if (lejos > 70) p.quita(); else { p.manda = p.manda || { x: p.x + 60, z: p.z }; p.ve_(p.manda.x, p.manda.z, 1.4, dt, this.ciudad); } } }
        } else {
          p.estado = 'persigue'; p.manda = null; const o = this.obj, d = dist(p, o), veo = p.ve != null && this.visto > 0;
          const dispara = veo && !j.rendido && j.modo !== 'detenido' && (s >= 3 || ag) && lejos < 32;
          // Se aparta si le viene un coche encima
          const jc = j.coche; if (jc && Math.abs(jc.v) > 5 && lejos < 16) { const x = p.x - jc.x, z = p.z - jc.z, av = (x * jc.vx + z * jc.vz) / Math.abs(jc.v), la = (x * jc.vz - z * jc.vx) / Math.abs(jc.v); if (av > 0 && Math.abs(la) < 2.2) { const s = la > 0 ? 1 : -1, vv = Math.abs(jc.v); p.ve_(p.x + jc.vz / vv * s * 6, p.z - jc.vx / vv * s * 6, 4.4, dt, this.ciudad); continue; } }
          if (p.puesto && lejos > 130) { p.estado = 'ruta'; }
          else if (dispara && lejos < (p.especial ? 24 : 17)) { p.para(dt); p.mira(j.x, j.z, dt); p.apunta = true; }
          else if (j.rendido && veo && lejos < 9) { p.apunta = lejos > 1.6; if (lejos > 1.3) p.ve_(j.x, j.z, 1.6, dt, this.ciudad); else p.para(dt); }
          else if (d > (veo ? 1.1 : 2.5)) { p.ve_(o.x, o.z, veo ? 4.7 : 3.4, dt, this.ciudad); if (dispara) p.apunta = true; }
          else { p.para(dt); p.th += dt * 1.6 * (p.k % 2 ? 1 : -1); } // busca alrededor
          if (p.apunta && dispara && !p.cad) this._dispara(p, lejos);
          if (!p.puesto && lejos > 160) p.quita();
        }
        // No atravesar coches ni a otros agentes
        for (const c of this.coches) if (Math.abs(c.x - p.x) < 5 && Math.abs(c.z - p.z) < 5) for (const k of c.circulos()) { const x = p.x - k.x, z = p.z - k.z, m = Math.hypot(x, z) || .01; if (m < 1.25) { p.x = k.x + x / m * 1.25; p.z = k.z + z / m * 1.25; } }
        for (const q of this.policias) if (q !== p && q.viva) { const x = p.x - q.x, z = p.z - q.z, m = Math.hypot(x, z) || .01; if (m < .8) { p.x += x / m * (.8 - m) * .5; p.z += z / m * (.8 - m) * .5; } }
      }
      p.cono.visible = p.viva && lejos < 45 && !s; if (p.cono.visible) { p.cono.position.set(p.x, .22, p.z); p.cono.rotation.y = p.th; tinteCono(p.cono, p.sospecha); }
      ponOjo(p.ojo, p.x, p.y + 2.15, p.z, p.viva && lejos < 50 ? p.sospecha : 0);
    }
    // Los puestos fijos vuelven a cubrirse al rato
    for (const p of this.policias) if (!p.activa && p.puesto && !s) { p.vuelve = (p.vuelve || 0) - dt; const [x, z] = p.puesto.ruta[0]; if (p.vuelve <= 0 && Math.hypot(x - j.x, z - j.z) > 60) { p.especial = false; p.ip = 0; p.pon(x, z); } }
  }
  _dispara(p, d) {
    const j = this.jug; p.cad = (p.especial ? .55 : p.modo === "rival" ? .85 : 1.15) + Math.random() * .4; p.anim.ponTorso('disparar', .05, true);
    const pr = Math.max(.06, .55 - d * .013 - (j.vel > 3 ? .14 : 0) - (j.agachado ? .15 : 0) - (j.coche ? .25 : 0) + (p.especial ? .12 : p.modo === "rival" ? -.03 : 0)), da = Math.random() < pr, e = da ? 0 : 1.2;
    const A = new THREE.Vector3(p.x + Math.sin(p.th) * .6, p.y + 1.45, p.z + Math.cos(p.th) * .6), B = new THREE.Vector3(j.x + (Math.random() - .5) * e, j.y + 1.2 + (Math.random() - .3) * e, j.z + (Math.random() - .5) * e);
    this.trazas.push({ t: .06, p: [...A, ...B] }); if (da) j.herir(p.especial ? 9 : p.modo === "rival" ? 7 : 6);
  }
  _sacaAgente(x, z, esp) { const p = this.agentes.find(q => !q.activa && !q.puesto) || this.agentes.find(q => !q.activa); if (!p) return null; p.especial = esp; p.tinte(esp ? { outfit_top: '#14161a', outfit_bottom: '#14161a' } : p.base || { outfit_top: '#1e2b4c', outfit_bottom: '#1a2133', footwear: '#151515' }); p.pon(x, z, 'persigue'); p.sospecha = .9; return p; }
  _patrullas(dt, cam) {
    const s = this.b.estrellas, j = this.jug; this.tRef -= dt;
    if (s && this.tRef <= 0 && this.patrullas.filter(c => !c.control).length < N_COCHES[s] && Math.abs(j.x) < 330 && j.z > -300) {
      this.tRef = 6; const o = this.obj, fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
      const c = []; for (let a = 0; a < 8; a++) for (let k = 0; k < 7; k++) { const p = pos([a, k]), d = dist(p, o), dj = dist(p, j); if (d < 190 && dj > 75 && !(dj < 110 && (p.x - j.x) * fx + (p.z - j.z) * fz > 0) && !this.coches.some(q => dist(q, p) < 8)) c.push([p, d]); }
      c.sort((u, v) => u[1] - v[1]); if (c.length) { const p = c[Math.floor(Math.random() * Math.min(3, c.length))][0]; this.patrullas.push(this._coche(p.x + 2, p.z, Math.atan2(o.x - p.x, o.z - p.z))); }
    }
    for (const c of [...this.patrullas]) {
      const d = dist(c, j); c.sirena(this.t, s > 0); if (c.control) continue;
      if (!s || d > 260) { if (d > 110 || d > 260) { this._borra(c); continue; } if (!s) { c.paso(dt, { gas: 0, dir: 0, mano: true }, this.ciudad, this.coches); continue; } }
      const o = this.obj, od = dist(c, o), veo = this.visto > 0; let t = o, vm = 24;
      if (od > 45 || (!veo && od > 25)) { // por las calles, hasta el cruce siguiente
        const n = nodoCerca(c.x, c.z), dest = nodoCerca(o.x, o.z); c.cruce ||= n;
        if (dist(pos(c.cruce), c) < 13) { c.de = c.cruce; c.cruce = siguiente(c.cruce, dest) || dest; } if (dist(pos(c.cruce), c) > 110) c.cruce = n;
        t = c.de && (c.de[0] !== c.cruce[0] || c.de[1] !== c.cruce[1]) ? carril(c.de, c.cruce, 4) : pos(c.cruce); vm = 21;
      } else if (!j.coche && od < 17) vm = 0; else if (j.coche) vm = Math.min(22, Math.max(12, Math.abs(j.coche.v) + 1));
      const e = vm ? pilota(c, t, vm, dt) : { gas: c.v > 1 ? -1 : 0, dir: 0, mano: true }, ant = c.tocado; c.tocado = null; { const x = c.x - j.x, z = c.z - j.z, l = Math.hypot(x, z) || 1, yo = j.coche ? (j.coche.vx * x + j.coche.vz * z) / l : 0, el = -(c.vx * x + c.vz * z) / l; this.embiste = yo > el ? yo : 0; }
      const k = Math.max(1, Math.ceil(dt / .0084)); let g = 0; for (let i = 0; i < k; i++) g = Math.max(g, c.paso(dt / k, e, this.ciudad, this.coches));
      // Solo es delito si embistes tú: ibas hacia ellos más deprisa que ellos hacia ti
      if (j.coche && c.tocado === j.coche && this.embiste > 6 && this.t - (c.tChoque || -9) > 3) { c.tChoque = this.t; this.delito('choquePolicia', 30); }
      // Con el objetivo parado y cerca, bajan los agentes
      const quieto = !j.coche || Math.abs(j.coche.v) < 3; c.bajan ??= 2;
      if (c.bajan && Math.abs(c.v) < 2 && od < 20 && (quieto || !veo)) { const l = c.bajan === 2 ? 1.5 : -1.5, p = c.punto(l, 0); if (this._sacaAgente(p.x, p.z, s === 5)) c.bajan--; else c.bajan = 0; }
      // Si huye, recogen a los agentes cercanos
      if (od > 40 && c.bajan < 2) { const p = this.agentes.find(q => q.viva && !q.puesto && dist(q, c) < 14); if (p) { p.quita(); c.bajan++; } }
    }
  }
  _coche(x, z, th) { const c = this.reserva.pop() || new Coche(this.escena, x, z, th, 0xe9ebee, true); Object.assign(c, { x, z, th, vx: 0, vz: 0, v: 0, giro: 0, bajan: 2, cruce: null, de: null, control: null, atasco: 0, reversa: 0, robado: false }); if (!c.g.parent) this.escena.add(c.g); this.coches.push(c); c.y = this.ciudad.suelo(x, z); c.pinta(.01); return c; }
  _borra(c) { this.patrullas.splice(this.patrullas.indexOf(c), 1); this.coches.splice(this.coches.indexOf(c), 1); c.quita(); this.reserva.push(c); }
  // Control de carretera: dos coches cruzados en una calle por delante del jugador
  _controles(dt) {
    const j = this.jug, s = this.b.estrellas;
    for (const k of [...this.controles]) if (dist(k, j) > 170 || (s < 4 && dist(k, j) > 70)) { for (const c of k.coches) if (this.patrullas.includes(c)) this._borra(c); k.conos.forEach(o => this.escena.remove(o)); this.controles.splice(this.controles.indexOf(k), 1); }
    this.tCon = (this.tCon || 0) - dt; if (s < 4 || this.controles.length >= 2 || this.tCon > 0 || j.z < -285) return; this.tCon = 5;
    const th = j.coche && Math.abs(j.coche.v) > 4 ? Math.atan2(j.coche.vx, j.coche.vz) : Math.random() * 6.28, n = nodoCerca(j.x + Math.sin(th) * 130, j.z + Math.cos(th) * 130), p = pos(n); if (dist(p, j) < 75 || this.controles.some(k => dist(k, p) < 50) || this.coches.some(q => dist(q, p) < 12)) return;
    const ns = Math.abs(Math.cos(th)) > Math.abs(Math.sin(th)), k = { ...p, coches: [], conos: [] };
    for (const l of [-3.1, 3.1]) { const c = this._coche(p.x + (ns ? l : 0), p.z + (ns ? 0 : l), (ns ? Math.PI / 2 : 0) + (l > 0 ? .25 : -.25)); c.control = k; this.patrullas.push(c); k.coches.push(c); }
    for (const l of [-6, -2, 2, 6]) { const o = new THREE.Mesh(new THREE.ConeGeometry(.18, .6, 12), new THREE.MeshStandardMaterial({ color: 0xff6a1a })); o.position.set(p.x + (ns ? l : -Math.sign(Math.sin(th)) * 4), .3, p.z + (ns ? -Math.sign(Math.cos(th)) * 4 : l)); this.escena.add(o); k.conos.push(o); }
    for (const l of [-5, 5]) this._sacaAgente(p.x + (ns ? l : 2.5), p.z + (ns ? 2.5 : l), s === 5); this.controles.push(k); this.di('Radio: control montado.');
  }
  _heli(dt) {
    const s = this.b.estrellas, j = this.jug, h = this.heli, on = s >= 4; this.hA = (this.hA || 0) + dt * .35;
    if (on && !h.visible) { h.visible = true; h.position.set(j.x + 180, 60, j.z - 180); }
    if (!h.visible) return; this.rotor.rotation.y += dt * 25; this.rotor2.rotation.y += dt * 25;
    const o = on ? this.obj : { x: h.position.x + 300, z: h.position.z }, m = new THREE.Vector3(o.x + (on ? Math.cos(this.hA) * 24 : 0), on ? 42 : 80, o.z + (on ? Math.sin(this.hA) * 24 : 0)), v = m.sub(h.position), l = v.length(), a = Math.atan2(v.x, v.z);
    h.position.addScaledVector(v, Math.min(1, Math.min(34, l * 1.2) * dt / (l || 1))); h.rotation.y += Math.atan2(Math.sin(a - h.rotation.y), Math.cos(a - h.rotation.y)) * Math.min(1, dt * 1.5); h.rotation.x = Math.min(.2, l * .004);
    this.foco.intensity = on ? 9 : 0; this.foco.position.copy(h.position); this.foco.target.position.x += (o.x - this.foco.target.position.x) * Math.min(1, dt * 1.2); this.foco.target.position.z += (o.z - this.foco.target.position.z) * Math.min(1, dt * 1.2);
    // Ve al jugador si está cerca del foco y ningún edificio lo tapa; el disfraz también le engaña
    if (on && j.modo !== 'oculto' && !this.b.disfrazado(j.ropa, j.coche) && dist(this.foco.target.position, j) < 7 && ve({ ...h.position, x: h.position.x, y: h.position.y, z: h.position.z, th: 0 }, { x: j.x, y: j.y + 1.5, z: j.z }, 90, 4, this.ciudad.col) != null) this.visto = Math.max(this.visto, .5);
    if (!on && (dist(h.position, j) > 280)) h.visible = false;
  }
  _atropellos() {
    const j = this.jug, c = j.coche; if (!c || j.modo !== 'coche' || Math.abs(c.v) < 4) return;
    for (const p of this.personas) if (p.viva && !p.enCoche && Math.abs(p.x - c.x) < 4 && Math.abs(p.z - c.z) < 4 && c.circulos().some(k => dist(k, p) < 1.35)) { const v = Math.abs(c.v); if (!p.herir(v < 8 ? 15 : 15 + (v - 8) * 7.2)) p.derriba(3 + v * .1); p.x += c.vx * .05; p.z += c.vz * .05; c.vx *= .9; c.vz *= .9; this.peatones.asusta(c.x, c.z, 30); this.delito(p.tipo === 'policia' || p.tipo === 'paisano' ? 'agredirPolicia' : 'atropello', 20); }
  }
  _arresto(dt) {
    const j = this.jug, s = this.b.estrellas; let cerca = false;
    if (s && (j.modo === 'pie' || j.modo === 'coche') && (this.visto > 0 || j.rendido)) { const r = j.coche ? 3.6 : j.rendido ? 2.1 : 1.8; cerca = this.policias.some(p => p.viva && p.ve != null && dist(p, j) < r) && !(j.mirando) && (j.coche ? Math.abs(j.coche.v) < 1.5 : true); }
    const v = !cerca ? -.8 : j.rendido ? 2 : j.vel > 3 ? .25 : .75; this.arresto = Math.max(0, Math.min(1, this.arresto + v * dt)); if (this.arresto >= 1) { this.seRindio = j.rendido; j.detener(); this._acaba('detenido'); }
  }
  // Desenlace: main.js lanza la escena y después llama a limpia()
  _acaba(t) { if (!this.fin) { this.fin = { t, s: 0, rendido: this.seRindio }; this.alAcabar?.(t); } }
  _final(dt) { this.fin.s += dt; for (const p of this.policias) if (p.viva) { p.apunta = false; p.para(dt); } }
  // Deja la ciudad en calma y al jugador en el punto de control
  limpia(pc) {
    const j = this.jug;
    this.b = new Busqueda(); this.b.desc.ropa = j.ropa; this.estAnt = 0; this.arresto = 0; this.visto = 0; this.llamadas = 0; this.fin = null;
    for (const c of [...this.patrullas]) this._borra(c); for (const k of this.controles) k.conos.forEach(o => this.escena.remove(o)); this.controles = []; this.heli.visible = false; this.foco.intensity = 0;
    for (const p of this.policias) { p.sospecha = 0; p.estado = 'ruta'; if (!p.puesto) p.quita(); else { p.especial = false; p.ip = 0; p.pon(...p.puesto.ruta[0]); } } for (const p of this.peatones.l) { p.llama = 0; }
    j.revive(pc.x, pc.z);
  }
}
