// Decorados interiores de las escenas, construidos lejos de la ciudad. Cada uno: {x, z} de su origen.
import * as THREE from 'three';
const mat = (o) => new THREE.MeshStandardMaterial({ roughness: .9, ...o });
export function creaDecorados(escena, col) {
  const M = { pared: mat({ color: 0xa9aea6 }), zocalo: mat({ color: 0x4d6660 }), suelo: mat({ color: 0x85857e, roughness: .55 }), techo: mat({ color: 0xc9c9c2 }), acero: mat({ color: 0x3b4044, metalness: .8, roughness: .4 }), manta: mat({ color: 0x7c7f6c }), madera: mat({ color: 0x5a3820, roughness: .5 }), cuero: mat({ color: 0x2a1a14, roughness: .5 }), ladrillo: mat({ color: 0x7c4636 }), hormigon: mat({ color: 0x77756f }), luz: new THREE.MeshBasicMaterial({ color: 0xfff6dd }), rojo: mat({ color: 0x5d2320 }), blanco: mat({ color: 0xe4e2da }), negro: mat({ color: 0x17181a }) };
  const D = {}, grupo = (n, x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.visible = false; escena.add(g); D[n] = { x, z, g }; return g; };
  const caja = (g, m, x, y, z, a, h, f) => { const o = new THREE.Mesh(new THREE.BoxGeometry(a, h, f), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const sala = (g, a, f, h, m = M.pared, z = M.zocalo) => { caja(g, M.suelo, 0, -.1, 0, a, .1, f); caja(g, M.techo, 0, h, 0, a, .15, f); for (const s of [-1, 1]) { caja(g, m, s * (a / 2 + .1), 0, 0, .2, h, f); caja(g, z, s * (a / 2 - .01), 0, 0, .04, 1.1, f); caja(g, m, 0, 0, s * (f / 2 + .1), a, h, .2); caja(g, z, 0, 0, s * (f / 2 - .01), a, 1.1, .04); } };
  const rejas = (g, x, z, largo, alto = 2.6, eje = 'z') => { const n = Math.round(largo / .14), o = new THREE.InstancedMesh(new THREE.CylinderGeometry(.018, .018, alto, 8), M.acero, n + 1), q = new THREE.Object3D(); for (let i = 0; i <= n; i++) { const k = -largo / 2 + largo * i / n; q.position.set(eje === 'z' ? 0 : k, alto / 2, eje === 'z' ? k : 0); q.updateMatrix(); o.setMatrixAt(i, q.matrix); } o.castShadow = true; const t = new THREE.Group(); t.add(o); for (const y of [.04, 1.2, alto - .04]) caja(t, M.acero, 0, y - .03, 0, eje === 'z' ? .05 : largo, .06, eje === 'z' ? largo : .05); t.position.set(x, 0, z); g.add(t); return t; };
  const tubo = (g, x, y, z) => caja(g, M.luz, x, y, z, .18, .05, 1.4).castShadow = false;

  { // Control de entrada
    const g = grupo('control', 1500, 0); sala(g, 9, 9, 3); for (const z of [-2.5, 2]) tubo(g, 0, 2.93, z);
    caja(g, M.zocalo, 2.7, 0, 1, .8, 1.1, 4); caja(g, M.acero, 2.7, 1.1, 1, .95, .05, 4.2); caja(g, M.negro, 2.75, 1.15, 1.6, .06, .35, .55); // mostrador
    for (const s of [-.65, .65]) caja(g, M.acero, s, 0, -.5, .16, 2.2, .5); caja(g, M.acero, 0, 2.2, -.5, 1.46, .18, .5); // arco detector
    caja(g, M.negro, 0, 0, 4.48, 1.3, 2.3, .06); rejas(g, 0, 4.35, 1.5, 2.4, 'x'); for (let k = 0; k < 4; k++) caja(g, M.acero, -4.1, .45, -2.6 + k * .8, .5, .05, .7);
  }
  { // Ficha: pared con marcas de altura
    const g = grupo('ficha', 1530, 0); sala(g, 6, 6, 3, M.blanco, M.blanco); tubo(g, 0, 2.93, .5); for (let k = 0; k < 9; k++) caja(g, M.negro, 0, 1.2 + k * .1, -2.95, k % 5 ? 2.2 : 3.2, .012, .03).castShadow = false; caja(g, M.acero, 0, 0, -2, 1.2, .02, .8);
  }
  { // Pasillo de celdas
    const g = grupo('pasillo', 1600, 0), L = 30; caja(g, M.suelo, 0, -.1, 0, 11, .1, L); caja(g, M.techo, 0, 3, 0, 11, .15, L); for (const s of [-1, 1]) { caja(g, M.pared, s * 5.1, 0, 0, .2, 3, L); caja(g, M.pared, 0, 0, s * (L / 2 + .1), 11, 3, .2); }
    for (let k = 0; k < 8; k++) { const z = -13.1 + k * 3.75; for (const s of [-1, 1]) { caja(g, M.pared, s * 3.5, 0, z - 1.87, 3, 3, .18); if (!(s === 1 && k === 5)) rejas(g, s * 2, z, 3.55); caja(g, M.acero, s * 4.3, .45, z, .9, .06, 2); caja(g, M.manta, s * 4.3, .51, z, .85, .14, 1.9); } tubo(g, 0, 2.93, z); }
    caja(g, M.zocalo, 0, 0, 14.95, 1.2, 2.2, .06); for (const s of [-1, 1]) caja(g, M.pared, s * 2, 2.62, 0, .16, .4, L);
    // Celda del jugador (derecha local = x+, k=5) con puerta corredera
    const z = -13.1 + 5 * 3.75; rejas(g, 2, z - 1.15, 1.25); rejas(g, 2, z + 1.15, 1.25); D.pasillo.puerta = rejas(g, 1.94, z, 1.1); D.pasillo.zCelda = z;
  }
  { // Patio: muro de la ejecución
    const g = grupo('muro', 1700, 0); caja(g, M.hormigon, 0, -.1, 4, 34, .1, 30); caja(g, M.ladrillo, 0, 0, -3, 26, 4.2, .4); for (const s of [-1, 1]) caja(g, M.hormigon, s * 13, 0, 7, .4, 4.2, 20); caja(g, M.hormigon, 0, 0, 17, 26, 4.2, .4); caja(g, M.acero, 5, 0, 16.7, 4, 3.4, .3); for (let y = .3; y < 4.2; y += .3) { const j = caja(g, M.hormigon, 0, y, -2.79, 26, .02, .02); j.castShadow = false; }
    for (const [x, a] of [[7, 1.2], [8.4, 1], [-8, 1.1]]) caja(g, M.madera, x, 0, -1.8, a, a * .8, a); caja(g, M.acero, -5, 0, -2.6, .12, 5.4, .12); caja(g, M.luz, -5, 5.2, -2.3, .5, .12, .7);
  }
  { // Despacho del líder
    const g = grupo('despacho', 1760, 0); sala(g, 8, 8, 3, M.rojo, M.madera); caja(g, M.madera, 0, 0, -1.6, 2.2, .78, 1); caja(g, M.cuero, 0, 0, -2.6, .75, 1.25, .2); caja(g, M.cuero, 0, 0, -2.35, .75, .5, .6); caja(g, M.madera, -3.6, 0, 0, .5, 2.2, 3); for (let k = 0; k < 12; k++) caja(g, [M.rojo, M.zocalo, M.blanco][k % 3], -3.45, 1.2 + (k % 2) * .5, -1.3 + k * .23, .3, .3, .16); caja(g, M.blanco, .6, .78, -1.5, .3, .02, .4); caja(g, M.cuero, 3.2, 0, .5, 1, .45, 2.2); caja(g, M.cuero, 3.7, .2, .5, .25, .7, 2.2); tubo(g, 0, 2.93, 0);
    D.despacho.maleta = caja(g, M.negro, -.35, .78, -1.5, .55, .14, .4);
  }
  { // Banco por dentro (se juega: lleva colisiones)
    const g = grupo('banco', 1820, 0), X = 1820; sala(g, 16, 18, 4.2, M.blanco, M.madera); for (const z of [-5, 0, 5]) for (const x of [-3, 3]) tubo(g, x, 4.13, z);
    for (const s of [-1, 1]) { col.caja(X + s * 8.2, 0, .6, 19, 4.2); col.caja(X, s * 9.2, 17, .6, 4.2); }
    const mueble = (m, x, z, a, f, h) => { caja(g, m, x, 0, z, a, h, f); col.caja(X + x, z, a, f, h); };
    mueble(M.madera, -4.7, -2, 5.6, .9, 1.15); mueble(M.madera, 5.2, -2, 4.6, .9, 1.15); for (const x of [-6, -3.6, 4.4, 6.4]) caja(g, M.acero, x, 1.15, -2, .05, 1, .7);
    for (const x of [-5.5, 5.5]) for (const z of [2, 5.5]) { mueble(M.blanco, x, z, .7, .7, 4.2); } mueble(M.cuero, -6.8, 4, .9, 2.4, .5); mueble(M.cuero, 6.8, 4, .9, 2.4, .5);
    const v = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, .35, 40).rotateX(Math.PI / 2), M.acero); v.position.set(0, 1.5, -8.8); g.add(v); for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(1.1, .07, .07), M.blanco); r.position.set(0, 1.5, -8.58); r.rotation.z = k * Math.PI / 4; g.add(r); }
    caja(g, M.negro, 0, 0, 8.96, 2.2, 2.6, .06);
  }
  // Dos luces fijas que se mueven al decorado activo (crear luces en marcha obliga a recompilar)
  const L1 = new THREE.PointLight(0xfff0d8, 0, 14, 1.6), L2 = new THREE.PointLight(0xfff0d8, 0, 14, 1.6); escena.add(L1, L2);
  D.enciende = (n, i = 14) => { for (const k in D) if (D[k].g) D[k].g.visible = k === n; const d = D[n]; L1.intensity = L2.intensity = d ? i : 0; if (d) { const f = n === 'muro' ? [[-5, 5, -1.8], [3, 4, 4]] : n === 'banco' ? [[0, 3.6, 4], [0, 3.6, -5]] : n === 'pasillo' ? [[0, 2.7, 8], [0, 2.7, -2]] : [[0, 2.6, 1.5], [0, 2.6, -1.5]]; L1.position.set(d.x + f[0][0], f[0][1], d.z + f[0][2]); L2.position.set(d.x + f[1][0], f[1][1], d.z + f[1][2]); } };
  return D;
}
// Furgón de traslados
export function creaFurgon(escena) {
  const g = new THREE.Group(), B = mat({ color: 0xe6e8ea, roughness: .4, metalness: .2 }), N = mat({ color: 0x14161a, roughness: .6 }), A = mat({ color: 0x1b3f8a }), V = mat({ color: 0x2b3a42, roughness: .1, metalness: .3 });
  const c = (m, x, y, z, a, h, f, rx = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(a, h, f), m); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = o.receiveShadow = true; g.add(o); };
  const s = new THREE.Shape([[-2.6, .45], [2.5, .45], [2.6, 1.05], [2.0, 1.2], [1.35, 2.3], [-2.6, 2.35]].map(p => new THREE.Vector2(...p))), e = new THREE.ExtrudeGeometry(s, { depth: 1.9, bevelSize: .06, bevelThickness: .06 }); e.translate(0, 0, -.95); e.rotateY(-Math.PI / 2); const o = new THREE.Mesh(e, B); o.castShadow = true; g.add(o);
  c(V, 0, 1.78, 1.73, 1.8, 1.05, .05, -.53); for (const q of [-1, 1]) { c(A, q * 1.02, 1.0, -.3, .03, .25, 4.6); c(V, q * 1.02, 1.7, .95, .03, .5, .8); for (let k = 0; k < 3; k++) c(N, q * 1.02, 1.85, -.4 - k * .75, .03, .28, .5); c(mat({ color: 0xffffff, emissive: 0xfff0c0, emissiveIntensity: .6 }), q * .75, .8, 2.65, .35, .18, .06); } c(N, 0, .5, 2.66, 2, .22, .1); c(N, 0, 1.3, -2.68, 1.6, 1.5, .03);
  const r = []; for (const x of [-.9, .9]) for (const z of [-1.7, 1.6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .28, 20).rotateZ(Math.PI / 2), N); w.position.set(x, .4, z); w.castShadow = true; g.add(w); const l = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .3, 8).rotateZ(Math.PI / 2), B); w.add(l); r.push(w); }
  g.visible = false; escena.add(g); return { g, ruedas: r, x: 0, z: 0, th: 0 };
}
// Lancha de la huida
export function creaLancha(escena) {
  const g = new THREE.Group(), B = mat({ color: 0xe9ebec, roughness: .3 }), N = mat({ color: 0x1b2126 }), s = new THREE.Shape([[-2.6, 0], [1.9, 0], [3.3, .95], [-2.6, .8]].map(p => new THREE.Vector2(...p)));
  const c = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelSize: .08, bevelThickness: .25 }); c.translate(0, 0, -.8); c.rotateY(-Math.PI / 2); const o = new THREE.Mesh(c, B); o.castShadow = true; g.add(o);
  const k = (m, x, y, z, a, h, f) => { const q = new THREE.Mesh(new THREE.BoxGeometry(a, h, f), m); q.position.set(x, y, z); q.castShadow = true; g.add(q); }; k(N, 0, 1.1, .6, 1.1, .7, .5); k(N, 0, .75, -2.8, .5, 1.1, .5); k(N, 0, .83, -1.2, 1.4, .06, 2.4);
  g.visible = false; escena.add(g); return { g, ruedas: [], x: 0, z: 0, th: 0 };
}
