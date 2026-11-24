// Modelo del coche (carrocería hueca con interior) y su puerta
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pasoCoche } from './fisicaCoche.js';
const M = (o) => new THREE.MeshStandardMaterial(o);
const CRISTAL = new THREE.MeshPhysicalMaterial({ color: 0x8fa5ab, transparent: true, opacity: .28, roughness: .05, side: THREE.DoubleSide, depthWrite: false });
const NEGRO = M({ color: 0x15171a, roughness: .8 }), TELA = M({ color: 0x3a3532, roughness: .95 }), LLANTA = M({ color: 0xb8bcc0, metalness: .9, roughness: .3 });
const FARO = M({ color: 0xffffff, emissive: 0xfff2cc, emissiveIntensity: .5 }), PILOTO = M({ color: 0x8a1010, emissive: 0xff1a10, emissiveIntensity: .25 });
// Junta por material las piezas sueltas de un grupo. Todos los coches son iguales: la geometría se comparte.
const FUSION = new Map();
function fusiona(g, clave) {
  const piezas = g.children.filter(o => o.isMesh), mats = [...new Set(piezas.map(o => o.material))];
  mats.forEach((m, k) => {
    const id = clave + k; if (!FUSION.has(id)) FUSION.set(id, mergeGeometries(piezas.filter(o => o.material === m).map(o => { o.updateMatrix(); const q = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix); for (const n of Object.keys(q.attributes)) if (n !== 'position' && n !== 'normal') q.deleteAttribute(n); return q; })));
    const o = new THREE.Mesh(FUSION.get(id), m); o.castShadow = !m.transparent && k < 2; o.receiveShadow = true; g.add(o);
  });
  for (const o of piezas) g.remove(o);
}
const AZUL = M({ color: 0x1b3f8a, roughness: .5 });
export class Coche {
  constructor(escena, x, z, th, color = 0x8a2f2a, policia = false) {
    this.policia = policia; this.escena = escena;
    Object.assign(this, { x, z, th, vx: 0, vz: 0, giro: 0, v: 0, desliz: 0, y: 0, puerta: 0, puertaObj: 0, ocupado: false });
    const g = this.g = new THREE.Group(), pint = new THREE.MeshPhysicalMaterial({ color, metalness: .35, roughness: .38, clearcoat: 1, clearcoatRoughness: .12 });
    const pon = (geo, mat, px, py, pz, padre = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; padre.add(m); return m; };
    const caja = (a, h, f, mat, px, py, pz, padre) => pon(new THREE.BoxGeometry(a, h, f), mat, px, py, pz, padre);
    // Perfil lateral extruido en anchura. Puntos [z, y]
    const perfil = (pts, ancho, mat, bisel = .05) => {
      const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
      const geo = new THREE.ExtrudeGeometry(s, { depth: ancho - bisel * 2, bevelSize: bisel, bevelThickness: bisel, bevelSegments: 3, curveSegments: 10 });
      geo.translate(0, 0, -(ancho - bisel * 2) / 2); geo.rotateY(-Math.PI / 2); return pon(geo, mat, 0, 0, 0);
    };
    perfil([[.82, .36], [2.05, .36], [2.12, .5], [2.08, .72], [1.6, .86], [.82, .95]], 1.74, pint, .07);
    perfil([[-2.06, .4], [-1.3, .36], [-1.3, .95], [-1.95, .95], [-2.1, .75]], 1.74, pint, .07);
    caja(1.7, .08, 2.2, NEGRO, 0, .34, -.25);
    caja(.07, .58, 2.1, pint, -.86, .65, -.24); // lateral derecho entero
    caja(.07, .58, .95, pint, .86, .65, -.82); // aleta trasera izquierda
    this.pivote = new THREE.Group(); this.pivote.position.set(.86, 0, .8); g.add(this.pivote);
    caja(.07, .58, 1.12, pint, 0, .65, -.57, this.pivote); caja(.04, .03, .16, LLANTA, .05, .82, -.95, this.pivote);
    const barra = (a, b, r = .035) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), m = pon(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 6), pint, 0, 0, 0); m.position.copy(A).lerp(B, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); };
    for (const s of [-1, 1]) { barra([s * .82, .93, .82], [s * .64, 1.44, .12]); barra([s * .84, .93, -.4], [s * .66, 1.45, -.4], .04); barra([s * .82, .93, -1.35], [s * .64, 1.43, -.95], .05); }
    caja(1.36, .06, 1.2, pint, 0, 1.46, -.42);
    const vid = (p) => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute([0, 1, 2, 0, 2, 3].flatMap(i => p[i]), 3)); b.computeVertexNormals(); const m = new THREE.Mesh(b, CRISTAL); g.add(m); };
    vid([[-.82, .93, .82], [.82, .93, .82], [.64, 1.44, .12], [-.64, 1.44, .12]]); vid([[-.82, .93, -1.35], [.82, .93, -1.35], [.64, 1.43, -.95], [-.64, 1.43, -.95]]);
    for (const s of [-1, 1]) vid([[s * .84, .93, -1.3], [s * .84, .93, -.4], [s * .66, 1.44, -.4], [s * .66, 1.43, -.95]]);
    vid([[-.84, .93, .8], [-.84, .93, -.4], [-.66, 1.44, -.4], [-.66, 1.44, .12]]);
    for (const s of [-1, 1]) { caja(.5, .14, .5, TELA, s * .38, .42, -.3); const r = caja(.5, .62, .13, TELA, s * .38, .75, -.6); r.rotation.x = -.2; }
    caja(1.4, .14, .45, TELA, 0, .42, -1.0); caja(1.4, .5, .12, TELA, 0, .7, -1.28);
    caja(1.6, .2, .28, NEGRO, 0, .86, .68);
    this.volante = new THREE.Group(); this.volante.position.set(.38, .88, .27); this.volante.rotation.x = -.4; g.add(this.volante);
    pon(new THREE.TorusGeometry(.17, .018, 8, 24), NEGRO, 0, 0, 0, this.volante); caja(.32, .03, .02, NEGRO, 0, 0, 0, this.volante);
    for (const s of [-1, 1]) { caja(.42, .12, .06, FARO, s * .58, .66, 2.13); caja(.4, .12, .05, PILOTO, s * .6, .74, -2.14); caja(.14, .1, .1, pint, s * .96, .98, .66); }
    caja(1.7, .13, .12, NEGRO, 0, .42, 2.14); caja(1.7, .13, .12, NEGRO, 0, .44, -2.12); caja(.46, .1, .02, LLANTA, 0, .52, -2.19);
    this.ruedas = [];
    for (const [rx, rz] of [[.8, 1.35], [-.8, 1.35], [.8, -1.35], [-.8, -1.35]]) {
      const p = new THREE.Group(); p.position.set(rx, .33, rz); g.add(p); const r = new THREE.Group(); p.add(r);
      const t = pon(new THREE.CylinderGeometry(.33, .33, .22, 24), NEGRO, 0, 0, 0, r), l = pon(new THREE.CylinderGeometry(.2, .2, .235, 10), LLANTA, 0, 0, 0, r); t.rotation.z = l.rotation.z = Math.PI / 2;
      fusiona(r, 'rueda'); const arco = pon(new THREE.CylinderGeometry(.39, .39, .03, 24), NEGRO, rx + Math.sign(rx) * .075, .35, rz); arco.rotation.z = Math.PI / 2; arco.castShadow = false;
      this.ruedas.push({ p, r, del: rz > 0 });
    }
    if (policia) { for (let k = -5; k <= 5; k++) caja(.012, .5, .012, NEGRO, k * .125, 1.14, -.66); for (const y of [.9, 1.14, 1.38]) caja(1.36, .015, .015, NEGRO, 0, y, -.66); // reja
      for (const q of [-1, 1]) caja(.02, .16, 2.0, AZUL, q * .902, .62, -.25); caja(1.2, .02, .8, AZUL, 0, .93, 1.2).rotation.x = .1; caja(1.1, .06, .22, NEGRO, 0, 1.51, -.35); }
    fusiona(this.pivote, 'puerta'); fusiona(this.volante, 'volante'); fusiona(g, policia ? 'pol' : 'civ');
    if (policia) { this.luces = [M({ color: 0x111122, emissive: 0x2255ff }), M({ color: 0x111122, emissive: 0x2255ff })]; this.luces.forEach((m, k) => { const o = new THREE.Mesh(new THREE.BoxGeometry(.5, .12, .2), m); o.position.set(k ? .28 : -.28, 1.59, -.35); g.add(o); m.emissiveIntensity = 0; }); }
    escena.add(g);
  }
  quita() { this.escena.remove(this.g); }
  sirena(t, on) { if (this.luces) this.luces.forEach((m, k) => m.emissiveIntensity = on && ((t * 3.2 + k * .5) % 1) < .5 ? 5 : 0); }
  punto(x, z) { const s = Math.sin(this.th), k = Math.cos(this.th); return { x: this.x + x * k + z * s, z: this.z - x * s + z * k }; }
  circulos() { return [1.25, 0, -1.25].map(z => this.punto(0, z)); }
  paso(dt, e, ciudad, coches) {
    let golpe = 0;
    pasoCoche(this, e, dt);
    for (const [k, c] of this.circulos().entries()) {
      const q = { ...c }, n = ciudad.col.resolver(q, .92);
      if (n) golpe = Math.max(golpe, this._choque(q.x - c.x, q.z - c.z, n, k));
      for (const o of coches) if (o !== this && Math.hypot(o.x - this.x, o.z - this.z) < 6) for (const b of o.circulos()) {
        const dx = c.x - b.x, dz = c.z - b.z, d = Math.hypot(dx, dz) || .01; if (d >= 1.84) continue;
        const n2 = { x: dx / d, z: dz / d }, m = 1.84 - d, vr = -(this.vx * n2.x + this.vz * n2.z);
        o.x -= n2.x * m * .5; o.z -= n2.z * m * .5; if (vr > 0) { o.vx -= n2.x * vr * .5; o.vz -= n2.z * vr * .5; }
        if (vr > 2) { this.tocado = o; o.tocado = this; }
        golpe = Math.max(golpe, this._choque(n2.x * m * .5, n2.z * m * .5, n2, k));
      }
    }
    const l = ciudad.limites; if (this.x < l.x0 || this.x > l.x1) { this.vx *= -.2; this.x = Math.max(l.x0, Math.min(l.x1, this.x)); } if (this.z < l.z0 || this.z > l.z1) { this.vz *= -.2; this.z = Math.max(l.z0, Math.min(l.z1, this.z)); }
    this.y += (ciudad.suelo(this.x, this.z) - this.y) * Math.min(1, dt * 14);
    this.v = this.vx * Math.sin(this.th) + this.vz * Math.cos(this.th);
    this.pinta(dt); return golpe;
  }
  _choque(dx, dz, n, k) { this.x += dx; this.z += dz; const vn = this.vx * n.x + this.vz * n.z; if (vn < 0) { this.vx -= n.x * vn * 1.15; this.vz -= n.z * vn * 1.15; const lado = n.x * Math.cos(this.th) - n.z * Math.sin(this.th); this.th += (k === 0 ? 1 : k === 2 ? -1 : 0) * lado * Math.min(.04, -vn * .006); return -vn; } return 0; }
  pinta(dt) {
    this.puerta += (this.puertaObj - this.puerta) * Math.min(1, dt * 7); this.pivote.rotation.y = this.puerta * -1.1 * -1;
    this.g.position.set(this.x, this.y, this.z); this.g.rotation.y = this.th;
    for (const w of this.ruedas) { w.r.rotation.x += this.v * dt / .33; if (w.del) w.p.rotation.y = this.giro; }
    this.volante.rotation.z = this.giro * -4;
  }
}
