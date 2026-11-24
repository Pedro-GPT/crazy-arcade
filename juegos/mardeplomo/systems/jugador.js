// Lógica del protagonista: a pie, armas y coche
import * as THREE from 'three';
import { CATALOGO } from '../animations/catalogo.js';
import { creaArma } from './arma.js';
import { ROPA } from './gente.js';
const angDif = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export class Jugador {
  constructor(escena, ciudad, per, coches) {
    Object.assign(this, { escena, ciudad, coches, esq: per.esq, anim: per.anim, x: -80, z: 108, y: .15, th: Math.PI, vel: 0, modo: 'pie', agachado: false, rendido: false, vida: 100, balas: 12, reserva: 60, coche: null, espera: 0, dinero: 250, ropa: 0, tinte: per.tinte, tDisparo: 99, mundo: null, ritmo: 1, aviso: '' });
    escena.add(this.esq.raiz); this.g = this.esq.raiz; this.nombres = Object.keys(CATALOGO);
    // Pistola sujeta a la mano derecha: en reposo (T) el cañón sigue los dedos y el pulgar queda arriba
    this.arma = creaArma(this.esq);
    this.luz = new THREE.PointLight(0xffc36b, 0, 8); escena.add(this.luz);
    this.marcas = new THREE.InstancedMesh(new THREE.CircleGeometry(.045, 8), new THREE.MeshBasicMaterial({ color: 0x151515, polygonOffset: true, polygonOffsetFactor: -2 }), 60); this.marcas.count = 0; this.marcas.frustumCulled = false; escena.add(this.marcas); this.nMarca = 0;
  }
  paso(dt, en, cam) {
    this.aviso = ''; this.tDisparo += dt; this.espera = Math.max(0, this.espera - dt); this.luz.intensity *= Math.exp(-dt * 35); this.mirando = false;
    if (this.visor != null) this._visor(dt, en);
    else if (this.modo === 'pie') this._pie(dt, en, cam);
    else if (this.modo === 'coche') this._conduce(dt, en, cam);
    else if (this.modo === 'oculto') this._oculto(dt, en);
    else this._transicion(dt);
    this.g.visible = this.modo !== 'oculto';
    this.anim.estado.cab = this.mirando ? -cam.pitch * 57.3 : 0;
    this.anim.paso(dt, this.ritmo);
    this.arma.visible = !!this.anim.torso && this.anim.torso !== 'impacto' || ['apuntar', 'disparar', 'recargar'].includes(this.anim.cuerpo);
    if (this.modo !== 'coche' || this.visor != null) { this.g.position.set(this.x, this.y, this.z); this.g.rotation.set(0, this.th, 0); }
    else { const c = this.coche, p = c.punto(.38, -.25); this.g.position.set(p.x, c.y, p.z); this.g.rotation.set(0, c.th, 0); }
  }
  _pie(dt, en, cam) {
    if (en.pulsada('Space')) { this.rendido = !this.rendido; this.agachado = false; }
    if (en.pulsada('KeyC') && !this.rendido) this.agachado = !this.agachado;
    const a = this.anim, ad = en.eje('KeyW', 'KeyS'), la = en.eje('KeyA', 'KeyD'), hay = (ad || la) && !this.rendido;
    const apunta = en.apunta && !this.rendido; this.mirando = apunta;
    const corre = hay && en.tiene('ShiftLeft') && !apunta; if (corre) this.agachado = false;
    const meta = !hay ? 0 : this.agachado ? 1.3 : corre ? 5.2 : apunta ? 1.5 : 1.9;
    this.vel += (meta - this.vel) * (1 - Math.exp(-dt * 9)); if (this.vel < .03) this.vel = 0;
    if (hay) this.rumbo = Math.atan2(la, ad) + cam.yaw;
    if (apunta) this.th += angDif(cam.yaw, this.th) * (1 - Math.exp(-dt * 16)); else if (hay) this.th += angDif(this.rumbo, this.th) * (1 - Math.exp(-dt * 11));
    if (this.vel) { const r = this.rumbo ?? this.th; this.x += Math.sin(r) * this.vel * dt; this.z += Math.cos(r) * this.vel * dt; }
    this._choca(); 
    // Animación de base. Si se apunta andando hacia atrás, el paso va al revés
    const atras = apunta && Math.cos(angDif(this.rumbo ?? 0, this.th)) < -.3 ? -1 : 1;
    if (this.rendido) a.pon('rendirse', .4);
    else if (this.vel > 3.2) { a.pon('correr'); this.ritmo = this.vel / 3.6; }
    else if (this.vel > .25) { a.pon(this.agachado ? 'andar_agachado' : 'andar'); this.ritmo = atras * this.vel / (this.agachado ? 1.1 : 1.65); }
    else a.pon(this.agachado ? 'agacharse' : 'quieto', .28);
    // Arma
    const recarga = a.torso === 'recargar' && !a.torsoTerminado;
    if (this.rendido) a.ponTorso(null);
    else if (recarga) { }
    else {
      if (a.torso === 'recargar') { const n = Math.min(12 - this.balas, this.reserva); this.balas += n; this.reserva -= n; }
      if (en.pulsada('KeyR') && this.balas < 12 && this.reserva) a.ponTorso('recargar');
      else if (apunta) {
        if (en.dispara && !this.espera) { if (this.balas) { this._dispara(cam); a.ponTorso('disparar', .05, true); } else if (this.reserva) a.ponTorso('recargar'); }
        else if (a.torso !== 'disparar' || a.torsoTerminado) a.ponTorso('apuntar', .18);
      } else if (a.torso !== 'impacto' || a.torsoTerminado) a.ponTorso(null, .25);
    }
    // Interacciones: contenedor, ropa, coche
    if (!this.rendido && this.mundo.interaccion(this, en)) return;
    if (this.rendido) { this.aviso = 'Espacio: bajar las manos'; return; }
    let mejor = null, d = 3; for (const c of this.coches) { const q = Math.min(...c.circulos().map(k => Math.hypot(k.x - this.x, k.z - this.z))); if (q < d) { d = q; mejor = c; } }
    if (mejor && Math.abs(mejor.v) < 5) { this.aviso = mejor.robado || mejor === this.suyo ? 'E: entrar en el coche' : 'E: robar el coche'; if (en.pulsada('KeyE')) { this.mundo.roba(mejor); this._entra(mejor); } }
  }
  _choca() {
    const r = .34; this.ciudad.col.resolver(this, r);
    for (const c of this.coches) for (const k of c.circulos()) { const dx = this.x - k.x, dz = this.z - k.z, d = Math.hypot(dx, dz) || .01; if (d < 1.28) { this.x = k.x + dx / d * 1.28; this.z = k.z + dz / d * 1.28; } }
    this.ciudad.col.resolver(this, r);
    const l = this.ciudad.limites; if (this.x < 1000) { this.x = Math.max(l.x0, Math.min(l.x1, this.x)); this.z = Math.max(l.z0, Math.min(l.z1, this.z)); }
    this.y += (this.ciudad.suelo(this.x, this.z) - this.y) * .25;
  }
  _dispara(cam) {
    this.balas--; this.espera = .22; const o = cam.cam.position.clone(), d = cam.dir(); let t = this.ciudad.col.rayo(o, d, 150);
    if (d.y < 0) t = Math.min(t, (o.y - this.y) / -d.y);
    this.tDisparo = 0; const blanco = this.mundo.impacto(o, d, t); if (blanco) t = blanco;
    const p = o.clone().addScaledVector(d, t - .01);
    if (t < 150 && !blanco) { const q = new THREE.Object3D(); q.position.copy(p); const e = [.02, .02]; // normal: se busca el lado de la caja que se ha tocado
      let n = new THREE.Vector3(0, 1, 0); for (const c of this.ciudad.col.cerca(p.x, p.z)) { if (p.y > c.h) continue; for (const [v, nx, nz] of [[p.x - c.x0, -1, 0], [p.x - c.x1, 1, 0], [p.z - c.z0, 0, -1], [p.z - c.z1, 0, 1]]) if (Math.abs(v) < e[0] && p.x > c.x0 - .02 && p.x < c.x1 + .02 && p.z > c.z0 - .02 && p.z < c.z1 + .02) n.set(nx, 0, nz); }
      q.position.addScaledVector(n, .02); q.lookAt(q.position.clone().add(n)); q.updateMatrix(); this.marcas.setMatrixAt(this.nMarca % 60, q.matrix); this.nMarca++; this.marcas.count = Math.min(60, this.nMarca); this.marcas.instanceMatrix.needsUpdate = true; }
    this.arma.getWorldPosition(this.luz.position); this.luz.intensity = 30;
    cam.pitch -= .018; cam.yaw += (Math.random() - .5) * .012; cam.sacudida = .03; // retroceso
  }
  // Golpe o bala: lo usarán la policía y las misiones
  herir(n) { this.vida = Math.max(0, this.vida - n); if (!this.vida && (this.modo === 'pie' || this.modo === 'coche') && this.modo !== 'herido') { if (this.coche) { const p = this.coche.punto(1.6, -.1); this.coche.vx = this.coche.vz = 0; this.coche.ocupado = false; this.coche = null; this.x = p.x; this.z = p.z; } this.modo = 'herido'; this.anim.ponTorso(null); this.anim.pon('caer_herido'); } else if (this.modo === 'pie') this.anim.ponTorso('impacto', .06, true); }
  oculta(sitio) { this.modo = 'oculto'; this.sitio = sitio; this.volver = { x: this.x, z: this.z }; this.x = sitio.x; this.z = sitio.z; this.vel = 0; this.agachado = false; this.anim.ponTorso(null); this.anim.pon('agacharse'); }
  _oculto(dt, en) { this.aviso = 'Escondido · E: salir'; if (en.pulsada('KeyE')) { this.modo = 'pie'; this.x = this.volver.x; this.z = this.volver.z; } }
  vistete(n) { this.ropa = n; this.tinte(ROPA[n]); }
  detener() { if (this.coche) { const p = this.coche.punto(1.42, -.1); this.coche.vx = this.coche.vz = 0; this.coche.ocupado = false; this.coche = null; this.x = p.x; this.z = p.z; } this.modo = 'detenido'; this.vel = 0; this.rendido = false; this.anim.ponTorso(null); this.anim.pon('esposado', .4); }
  revive(x, z) { this.visor = null; if (this.coche) { this.coche.ocupado = false; this.coche = null; } Object.assign(this, { x, z, y: .15, th: Math.PI, modo: 'pie', vida: 100, vel: 0, rendido: false, agachado: false }); this.anim.ponTorso(null); this.anim.pon('quieto'); }
  _entra(c) { this.coche = c; c.ocupado = true; this.modo = 'entrando'; this.tt = 0; this.agachado = false; this.anim.ponTorso(null); this.de = { x: this.x, z: this.z, th: this.th }; c.puertaObj = 1; }
  _transicion(dt) {
    if (this.modo === 'herido' || this.modo === 'detenido') return;
    const c = this.coche, pu = c.punto(1.42, -.1), si = c.punto(.38, -.25), mez = (a, b, k) => a + (b - a) * k; this.tt += dt; c.pinta(dt);
    if (this.modo === 'entrando') {
      const ta = Math.max(.35, Math.hypot(pu.x - this.de.x, pu.z - this.de.z) / 2.4);
      if (this.tt < ta) { // camina a la puerta; si está al otro lado, rodea por delante
        const k = this.tt / ta, loc = (q) => ({ x: (q.x - c.x) * Math.cos(c.th) - (q.z - c.z) * Math.sin(c.th), z: (q.x - c.x) * Math.sin(c.th) + (q.z - c.z) * Math.cos(c.th) }), L = loc(this.de);
        let p; if (L.x < .9) { const m = c.punto(L.x * .5, L.z < -1.3 ? -3.2 : 3.2), u = 1 - k; p = { x: u * u * this.de.x + 2 * u * k * m.x + k * k * pu.x, z: u * u * this.de.z + 2 * u * k * m.z + k * k * pu.z }; } else p = { x: mez(this.de.x, pu.x, k), z: mez(this.de.z, pu.z, k) };
        const dx = p.x - this.x, dz = p.z - this.z; if (Math.hypot(dx, dz) > .003) this.th += angDif(Math.atan2(dx, dz), this.th) * Math.min(1, dt * 10); this.x = p.x; this.z = p.z; this.anim.pon('andar'); this.ritmo = 1.4;
      } else { const k = Math.min(1, (this.tt - ta) / 1), s = k * k * (3 - 2 * k); this.anim.pon('entrar_coche', .25); this.x = mez(pu.x, si.x, s); this.z = mez(pu.z, si.z, s); this.th += angDif(c.th, this.th) * Math.min(1, dt * 8); this.y += (c.y - this.y) * .2; if (k >= 1) { c.puertaObj = 0; this.modo = 'coche'; this.anim.pon('conducir', .3); } }
    } else {
      const k = Math.min(1, this.tt / .9), s = k * k * (3 - 2 * k), o = this.sal; this.x = mez(si.x, o.x, s); this.z = mez(si.z, o.z, s); this.th = c.th;
      if (k >= 1) { c.puertaObj = 0; c.ocupado = false; this.modo = 'pie'; this.coche = null; this.vel = 0; this.anim.pon('quieto', .3); }
    }
  }
  _conduce(dt, en, cam) {
    const c = this.coche, e = { gas: en.eje('KeyW', 'KeyS'), dir: en.eje('KeyA', 'KeyD'), mano: en.tiene('Space') };
    // pasos fijos para que no dependa de los fps
    let golpe = 0; const n = Math.max(1, Math.ceil(dt / .0084)); for (let i = 0; i < n; i++) golpe = Math.max(golpe, c.paso(dt / n, e, this.ciudad, this.coches));
    if (golpe > 5) { cam.sacudida = Math.min(.4, golpe * .02); if (golpe > 12) this.vida = Math.max(5, this.vida - golpe * .5); }
    this.x = c.x; this.z = c.z; this.y = c.y; this.th = c.th; this.anim.estado.dir = c.giro / .3;
    cam.sinRaton += dt; if (cam.sinRaton > 1.2 && Math.abs(c.v) > 3) cam.yaw += angDif(c.th + (c.v < 0 ? Math.PI : 0), cam.yaw) * (1 - Math.exp(-dt * 2.2));
    if (Math.abs(c.v) < 4) { this.aviso = 'E: salir'; if (en.pulsada('KeyE')) {
      // sale por la izquierda; si está tapada, por la derecha
      for (const lado of [1.42, -1.42]) { const p = c.punto(lado, -.1), q = { ...p }; if (!this.ciudad.col.resolver(q, .34) && !this.coches.some(o => o !== c && o.circulos().some(k => Math.hypot(k.x - p.x, k.z - p.z) < 1.28))) { c.vx = c.vz = c.v = 0; this.sal = p; this.modo = 'saliendo'; this.tt = 0; c.puertaObj = lado > 0 ? 1 : 0; const s = c.punto(.38, -.25); this.x = s.x; this.z = s.z; this.anim.pon('salir_coche', .2); break; } }
      if (this.modo === 'coche') this.aviso = 'No hay sitio para salir'; } }
  }
  alternaVisor() { if (this.modo !== 'pie') return; if (this.visor == null) { this.visor = 0; this.anim.ponTorso(null); this._pontVisor(); } else { this.visor = null; this.anim.pon('quieto'); } }
  _pontVisor() { const n = this.nombres[this.visor]; this.anim.ponTorso(null); if (CATALOGO[n].torso) { this.anim.pon('quieto'); this.anim.ponTorso(n, .2, true); } else this.anim.pon(n); this.esperaV = 0; }
  _visor(dt, en) {
    const n = this.nombres.length; this.ritmo = this.nombres[this.visor] === 'correr' ? 1.4 : 1;
    if (en.pulsada('ArrowRight')) { this.visor = (this.visor + 1) % n; this._pontVisor(); }
    if (en.pulsada('ArrowLeft')) { this.visor = (this.visor + n - 1) % n; this._pontVisor(); }
    const d = CATALOGO[this.nombres[this.visor]].dur; this.esperaV += dt; if (d && this.esperaV > d + 1) { this.esperaV = 0; this.anim._corte(.2); this.anim.t = this.anim.tt = 0; }
  }
}
