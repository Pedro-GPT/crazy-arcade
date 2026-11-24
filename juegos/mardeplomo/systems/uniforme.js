// Uniforme de policía sobre un cuerpo humano: pelo corto, chaleco, cinturón y equipo, sujetos a los huesos
import * as THREE from 'three';
const mat = (o) => new THREE.MeshStandardMaterial({ roughness: .85, ...o });
const AZUL = mat({ color: 0x141d33, side: THREE.DoubleSide }), CUERO = mat({ color: 0x0c0c0e, roughness: .45 }), CHAROL = mat({ color: 0x08080a, roughness: .15 }), PLATA = mat({ color: 0xc9ccd2, metalness: .9, roughness: .3 }), NYLON = mat({ color: 0x12161f, side: THREE.DoubleSide });
let PARCHE;
function parche() {
  if (PARCHE) return PARCHE;
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#12161f'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#e8ecf2'; g.font = 'bold 46px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('POLICÍA', 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return PARCHE = mat({ map: t, polygonOffset: true, polygonOffsetFactor: -2 });
}
// Sección elíptica girada alrededor del eje Y: pts = [[y, radioX, radioZ], ...]
function casco(pts, arco = [0, Math.PI * 2]) {
  const n = 28, p = [], ix = [];
  for (const [y, rx, rz] of pts) for (let i = 0; i <= n; i++) { const a = arco[0] + (arco[1] - arco[0]) * i / n; p.push(Math.sin(a) * rx, y, Math.cos(a) * rz); }
  for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + n + 1; ix.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(ix); g.computeVertexNormals(); return g;
}
// Medidas del cuerpo en reposo (a partir de los vértices): semiejes de la sección a una altura
function seccion(esq, y, tol, soloCentro) {
  const b = new THREE.Box3(), v = new THREE.Vector3(); b.makeEmpty();
  esq.raiz.traverse(o => { if (!o.isSkinnedMesh || /hair|beard|headwear/i.test(o.name)) return; const n = o.geometry.attributes.position.count; for (let i = 0; i < n; i += 2) { o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld); if (Math.abs(v.y - y) < tol && Math.abs(v.x) < soloCentro) b.expandByPoint(v); } });
  return b;
}
// Arregla el cuerpo provisional: sin sombrero y con pelo corto
export function arreglaCuerpo(esq, k, liso) {
  const cad = esq.repP[esq.idx.Hips].y;
  // Sin sombrero ni faldones; si liso, tela sin dibujo (para el uniforme)
  const v0 = new THREE.Vector3();
  esq.raiz.traverse(o => {
    if (!o.isSkinnedMesh) return; const n = o.name.toLowerCase();
    if (n.includes('headwear') || (n.includes('beard') && k % 4)) o.visible = false;
    if (n.includes('outfit_top')) {
      const g = o.geometry = o.geometry.clone(), ix = [...g.index.array], bajo = []; for (let i = 0; i < g.attributes.position.count; i++) bajo.push(o.getVertexPosition(i, v0).applyMatrix4(o.matrixWorld).y < cad - .035);
      const nuevo = []; for (let i = 0; i < ix.length; i += 3) if (!(bajo[ix[i]] && bajo[ix[i + 1]] && bajo[ix[i + 2]])) nuevo.push(ix[i], ix[i + 1], ix[i + 2]); g.setIndex(nuevo);
      if (liso) { o.material.map = null; o.material.metalnessMap = o.material.roughnessMap = null; o.material.metalness = 0; o.material.roughness = .9; }
    }
    if (liso && n.includes('outfit_bottom')) { o.material.map = null; o.material.metalness = 0; o.material.roughness = .9; }
  });
  // Sin gorra: pelo corto, hecho con la piel del cráneo separada unos milímetros (se mueve con la cabeza)
  let cara = null; esq.raiz.traverse(o => { if (o.isSkinnedMesh && /head$/i.test(o.name)) cara = o; });
  if (cara) {
    const v = new THREE.Vector3(), n = cara.geometry.attributes.position.count, p = []; let alto = 0, zs = [1e9, -1e9];
    for (let i = 0; i < n; i++) { cara.getVertexPosition(i, v).applyMatrix4(cara.matrixWorld); p.push([v.x, v.y, v.z]); alto = Math.max(alto, v.y); }
    for (const q of p) if (q[1] > alto - .1) { zs[0] = Math.min(zs[0], q[2]); zs[1] = Math.max(zs[1], q[2]); }
    const L = zs[1] - zs[0], pelo = p.map(([x, y, z]) => { const t = (z - zs[0]) / L, linea = alto - (t > .85 ? .045 : t > .62 ? .06 + (.85 - t) * .1 : t > .42 ? .1 : .165); return Math.min(y - linea, y > alto - .1 ? 1 : .082 - Math.abs(x)); });
    const g = cara.geometry.clone(), ix = g.index.array, nu = []; for (let i = 0; i < ix.length; i += 3) if (pelo[ix[i]] > 0 || pelo[ix[i + 1]] > 0 || pelo[ix[i + 2]] > 0) nu.push(ix[i], ix[i + 1], ix[i + 2]);
    // Grosor en unidades del modelo original
    const A = new THREE.Vector3().fromBufferAttribute(g.attributes.position, nu[0]), B = new THREE.Vector3().fromBufferAttribute(g.attributes.position, nu[1]), es = A.distanceTo(B) / (new THREE.Vector3(...p[nu[0]]).distanceTo(new THREE.Vector3(...p[nu[1]])) || 1);
    const po = g.attributes.position = g.attributes.position.clone(), no = g.attributes.normal; for (let i = 0; i < n; i++) { const gr = (Math.max(0, Math.min(.007, .002 + pelo[i] * .25)) + Math.max(0, p[i][1] - alto + .06) * .09) * es; po.setXYZ(i, po.getX(i) + no.getX(i) * gr, po.getY(i) + no.getY(i) * gr, po.getZ(i) + no.getZ(i) * gr); }
    g.setIndex(nu); const m = new THREE.SkinnedMesh(g, mat({ color: [0x1a120c, 0x2e1d12, 0x0d0b0a, 0x4a3420][k % 4], roughness: .75, side: THREE.DoubleSide })); m.name = 'pelo';
    // El borde del pelo se recorta por píxel, para que no siga los triángulos
    g.setAttribute('borde', new THREE.Float32BufferAttribute(pelo, 1)); m.material.onBeforeCompile = (q) => { q.vertexShader = q.vertexShader.replace('#include <common>', '#include <common>\nattribute float borde; varying float vBorde;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBorde = borde;'); q.fragmentShader = q.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBorde;').replace('#include <clipping_planes_fragment>', 'if (vBorde < 0.0) discard;'); };
    m.castShadow = true; m.frustumCulled = false; cara.parent.add(m); m.position.copy(cara.position); m.quaternion.copy(cara.quaternion); m.scale.copy(cara.scale); m.bind(cara.skeleton, cara.bindMatrix);
  }
}
export function ponUniforme(esq, k = 0) {
  const H = (k) => esq.huesos[esq.idx[k]], P = (k) => esq.repP[esq.idx[k]], pecho = esq.huesos[esq.pecho];
  const pon = (hueso, geo, m, x, y, z, rx = 0, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, 0); o.castShadow = true; esq.raiz.add(o); o.updateMatrixWorld(true); hueso.attach(o); return o; };
  const cad = P('Hips').y, hom = P('LBrazo').y;
  // Braga de cuello
  const cu = P('Neck'); pon(esq.huesos[esq.padre[esq.idx.Neck]] || pecho, casco([[cu.y - .035, .098, .1], [cu.y + .01, .078, .084], [cu.y + .05, .069, .078]]), NYLON, 0, 0, cu.z + .012);
  // Chaleco
  const at = (k) => hom + (cad - hom) * k, med = [.12, .4, .7].map(k => { const b = seccion(esq, at(k), .03, .2); return { x: Math.min(.19, Math.max(.14, (b.max.x - b.min.x) / 2)), zc: (b.max.z + b.min.z) / 2, z: (b.max.z - b.min.z) / 2 }; });
  const zc = (med[0].zc + med[1].zc + med[2].zc) / 3, gr = .022, rz = Math.max(...med.map(m => m.z)) + gr;
  pon(pecho, casco([[at(.82), med[2].x + gr, rz * .93], [at(.6), med[2].x + gr + .004, rz], [at(.35), med[1].x + gr, rz], [at(.14), med[0].x * .93, rz * .95], [at(.06), .13, rz * .86]]), NYLON, 0, 0, zc);
  pon(pecho, new THREE.PlaneGeometry(.24, .06), parche(), 0, at(.25), zc - rz - .006, 0, Math.PI);
  pon(pecho, new THREE.PlaneGeometry(.13, .033), parche(), -.075, at(.22), zc + rz + .004);
  for (const [x, w] of [[.085, .07], [0, .07], [-.085, .07]]) pon(pecho, new THREE.BoxGeometry(w, .11, .035), NYLON, x, at(.62), zc + rz * .97);
  pon(pecho, new THREE.BoxGeometry(.045, .1, .03), CUERO, .1, at(.22), zc + rz * .93); pon(pecho, new THREE.CylinderGeometry(.006, .006, .09, 6), CUERO, .115, at(.1), zc + rz * .9);
  const placa = pon(pecho, new THREE.CircleGeometry(.022, 6), PLATA, .03, at(.24), zc + rz + .006); placa.castShadow = false;
  // Cinturón con funda, porra y cargadores
  const c = seccion(esq, cad + .04, .03, .24), cx = (c.max.x - c.min.x) / 2 + .012, cz = (c.max.z - c.min.z) / 2 + .012, ccz = (c.max.z + c.min.z) / 2;
  pon(H('Hips'), casco([[cad + .015, cx, cz], [cad + .065, cx, cz]]), CUERO, 0, 0, ccz);
  pon(H('Hips'), new THREE.BoxGeometry(.055, .045, .015), PLATA, 0, cad + .04, ccz + cz);
  pon(H('Hips'), new THREE.BoxGeometry(.045, .16, .07), CUERO, -cx - .015, cad - .05, ccz);
  pon(H('Hips'), new THREE.CylinderGeometry(.014, .014, .34, 8), CUERO, cx + .02, cad - .1, ccz - .02);
  for (const x of [.09, .05]) pon(H('Hips'), new THREE.BoxGeometry(.03, .075, .03), CUERO, x, cad + .03, ccz + cz * .93);
}
