// Ciudad costera ficticia. Cuadrícula de calles cada 80 m; el mar al sur (+z); la prisión al norte.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Colisiones } from '../systems/colisiones.js';
const CALLE = 14, XS = [-280, -200, -120, -40, 40, 120, 200, 280], ZS = [-280, -200, -120, -40, 40, 120, 200];
let sem = 7; const azar = () => (sem = (sem * 16807) % 2147483647) / 2147483647, entre = (a, b) => a + azar() * (b - a), elige = (l) => l[Math.floor(azar() * l.length)];

function lienzo(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const ruido = (g, w, h, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${azar() < .5 ? '0,0,0' : '255,255,255'},${azar() * a})`; g.fillRect(azar() * w, azar() * h, 1 + azar() * 3, 1 + azar() * 3); } };
function fachada(pared, cerco, hoja, tipo) { // 4x4 vanos, para que no se note tanto la repetición
  return lienzo(512, 512, (g) => {
    g.fillStyle = pared; g.fillRect(0, 0, 512, 512); ruido(g, 512, 512, 3500, .06);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * 128, y = j * 128;
      if (tipo === 'oficina') { g.fillStyle = cerco; g.fillRect(x + 6, y + 18, 116, 92); const d = g.createLinearGradient(x, y, x + 120, y + 110); d.addColorStop(0, '#90acb5'); d.addColorStop(1, '#3d525b'); g.fillStyle = d; g.fillRect(x + 10, y + 22, 52, 84); g.fillRect(x + 66, y + 22, 52, 84); continue; }
      g.fillStyle = '#0003'; g.fillRect(x + 34, y + 110, 66, 5);
      g.fillStyle = cerco; g.fillRect(x + 36, y + 22, 56, 88); const d = g.createLinearGradient(x, y + 22, x, y + 110); d.addColorStop(0, '#26343a'); d.addColorStop(1, '#5c7379'); g.fillStyle = d; g.fillRect(x + 41, y + 27, 46, 80); g.fillStyle = cerco; g.fillRect(x + 62, y + 27, 4, 80);
      const abierta = azar(); g.fillStyle = hoja;
      if (abierta < .6) for (const px of [x + 12, x + 93]) { g.fillStyle = hoja; g.fillRect(px, y + 22, 23, 88); g.fillStyle = '#0003'; for (let k = 0; k < 12; k++) g.fillRect(px + 2, y + 26 + k * 7, 19, 2); }
      else { g.fillRect(x + 41, y + 27, 46, 20 + azar() * 55); }
      if (azar() < .45) { g.fillStyle = '#33302e'; g.fillRect(x + 20, y + 84, 88, 3); for (let k = 0; k < 12; k++) g.fillRect(x + 20 + k * 8, y + 84, 2, 30); g.fillStyle = '#8d857a'; g.fillRect(x + 16, y + 113, 96, 7); }
    }
  });
}
const TX = {
  asfalto: () => lienzo(256, 256, (g) => { g.fillStyle = '#4b4c4e'; g.fillRect(0, 0, 256, 256); ruido(g, 256, 256, 5000, .12); }),
  acera: () => lienzo(256, 256, (g) => { g.fillStyle = '#b3aa9b'; g.fillRect(0, 0, 256, 256); ruido(g, 256, 256, 2500, .08); g.fillStyle = '#0002'; for (let i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 2, 256); g.fillRect(0, i * 64, 256, 2); } }),
  campo: () => lienzo(256, 256, (g) => { g.fillStyle = '#8c8659'; g.fillRect(0, 0, 256, 256); ruido(g, 256, 256, 6000, .13); }),
  nave: () => lienzo(256, 256, (g) => { g.fillStyle = '#a9adab'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 16; i++) { g.fillStyle = '#0002'; g.fillRect(i * 16, 0, 5, 256); } g.fillStyle = '#54707a'; g.fillRect(0, 0, 256, 40); ruido(g, 256, 256, 900, .08); }),
  bajos: () => lienzo(512, 128, (g) => { g.fillStyle = '#c8bba6'; g.fillRect(0, 0, 512, 128); for (let i = 0; i < 4; i++) { const x = i * 128; if (i % 2) { g.fillStyle = '#8d9293'; g.fillRect(x + 14, 26, 100, 102); g.fillStyle = '#0003'; for (let k = 0; k < 14; k++) g.fillRect(x + 14, 28 + k * 7, 100, 2); } else { g.fillStyle = '#39302a'; g.fillRect(x + 10, 26, 108, 102); g.fillStyle = '#6f878b'; g.fillRect(x + 16, 34, 62, 80); g.fillStyle = '#5c3f2a'; g.fillRect(x + 84, 34, 28, 94); } g.fillStyle = ['#8c3b2c', '#2f5d63', '#7d6a2e', '#3f4d74'][i]; g.fillRect(x + 8, 6, 112, 18); } }),
  teja: () => lienzo(128, 128, (g) => { g.fillStyle = '#a65a3c'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 8; i++) { g.fillStyle = '#0003'; g.fillRect(i * 16, 0, 5, 128); g.fillStyle = '#fff1'; g.fillRect(i * 16 + 8, 0, 4, 128); } ruido(g, 128, 128, 900, .15); }),
};
function rotulo(txt, fondo, color, w = 512) { return new THREE.MeshStandardMaterial({ map: lienzo(w, 96, (g) => { g.fillStyle = fondo; g.fillRect(0, 0, w, 96); g.fillStyle = color; g.font = 'bold 58px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, 50); }) }); }

export function creaCiudad(escena) {
  const col = new Colisiones(), lotes = new Map(); // material -> geometrías
  const mat = (o) => new THREE.MeshStandardMaterial({ roughness: .92, ...o });
  const MAT = {
    barrio: [fachada('#e3d6bd', '#f5efe2', '#3f6b6b'), fachada('#d9a878', '#f0e3cf', '#5b4632'), fachada('#e9e4da', '#cfc6b6', '#35577a'), fachada('#cf9488', '#f0e0d4', '#47613f')].map(map => mat({ map })),
    centro: [fachada('#d8cdb8', '#8f8574', '#5d584f'), fachada('#b9b6ae', '#55595c', '#000', 'oficina'), fachada('#8f9ca0', '#3f474b', '#000', 'oficina')].map(map => mat({ map, roughness: .7 })),
    nave: mat({ map: TX.nave() }), bajos: mat({ map: TX.bajos() }), teja: mat({ map: TX.teja() }), azotea: mat({ color: 0xb0a596 }), acera: mat({ map: TX.acera() }), asfalto: mat({ map: TX.asfalto() }), hormigon: mat({ color: 0xa5a29a, map: TX.acera() }),
    campo: mat({ map: TX.campo() }), arena: mat({ color: 0xdcc596 }), blanco: mat({ color: 0xe8e6df }), amarillo: mat({ color: 0xe0b23c }), gris: mat({ color: 0x75787a }), oscuro: mat({ color: 0x33373a }), verde: mat({ color: 0x66803f }), piedra: mat({ color: 0xd9d0bf }), rojo: mat({ color: 0xb5482f }),
  };
  const mete = (m, geo) => { if (!lotes.has(m)) lotes.set(m, []); lotes.get(m).push(geo.index ? geo.toNonIndexed() : geo); };
  // Caja con las UV en metros (um x vm = tamaño de una repetición de textura)
  function caja(m, x, y, z, a, h, f, um = 4, vm = 4, girada = 0) {
    const g = new THREE.BoxGeometry(a, h, f), uv = g.attributes.uv;
    for (let k = 0; k < 24; k++) { const c = Math.floor(k / 4), [U, W] = c < 2 ? [f, h] : c < 4 ? [a, f] : [a, h]; uv.setXY(k, uv.getX(k) * Math.max(1, Math.round(U / um * 4)) / 4, uv.getY(k) * W / vm); }
    if (girada) g.rotateY(girada); g.translate(x, y + h / 2, z); mete(m, g);
  }
  const plano = (m, x, y, z, a, f, um = 8) => { const g = new THREE.PlaneGeometry(a, f); const uv = g.attributes.uv; for (let k = 0; k < 4; k++) uv.setXY(k, uv.getX(k) * a / um, uv.getY(k) * f / um); g.rotateX(-Math.PI / 2); g.translate(x, y, z); mete(m, g); };
  const solido = (m, x, z, a, f, h, um, vm, y = 0) => { caja(m, x, y, z, a, h, f, um, vm); col.caja(x, z, a, f, h + y); };

  // ---- Suelos ----
  plano(MAT.campo, 0, -.06, -230, 1400, 876, 14);
  plano(MAT.asfalto, 0, 0, -40, 574, 494);
  plano(MAT.asfalto, -40, .01, -450, 16, 340); // carretera de salida norte
  plano(MAT.asfalto, 20, .012, -560, 136, 14); // acceso a la prisión
  plano(MAT.asfalto, 440, .01, 40, 320, 14); plano(MAT.asfalto, -440, .01, -40, 320, 14); // salidas este y oeste
  plano(MAT.arena, -150, -.02, 232, 330, 56, 10);
  const aceras = [];
  const acera = (x, z, a, f, m = MAT.acera) => { caja(m, x, 0, z, a, .15, f, 4, 4); aceras.push([x - a / 2, x + a / 2, z - f / 2, z + f / 2]); };
  for (const x of XS) for (let z = -270; z < 200; z += 8) if (!ZS.some(k => Math.abs(k - z) < 11)) plano(MAT.blanco, x, .015, z, .14, 3);
  for (const z of ZS) for (let x = -270; x < 280; x += 8) if (!XS.some(k => Math.abs(k - x) < 11)) plano(MAT.blanco, x, .015, z, 3, .14);
  for (let z = -610; z < -290; z += 10) plano(MAT.blanco, -40, .02, z, .14, 4);
  for (const x of XS) for (const z of ZS) for (let k = -5; k <= 5; k += 1.25) { if (z > -280) plano(MAT.blanco, x + k, .016, z - 9, .6, 2.4); if (x < 280) plano(MAT.blanco, x + 9, .016, z + k, 2.4, .6); }

  // ---- Manzanas ----
  const farolas = [], palmeras = [], arboles = [], contenedores = [];
  const zonaDe = (x, z) => z < -290 ? (x > 0 && z < -470 ? 'Prisión de Cala Negra' : 'Carretera del norte') : z > 207 ? (x > 5 ? 'Puerto' : 'Playa') : Math.abs(x) > 287 ? 'Afueras' : z < -200 ? 'Afueras' : x > 120 ? 'Polígono industrial' : x > -40 ? 'Centro' : 'Barrio de la Salina';
  for (let i = 0; i < XS.length - 1; i++) for (let j = 0; j < ZS.length - 1; j++) {
    const cx = XS[i] + 40, cz = ZS[j] + 40, zona = zonaDe(cx, cz), lado = 80 - CALLE;
    acera(cx, cz, lado, lado);
    for (const s of [-1, 1]) for (const t of [-18, 18]) { farolas.push([cx + s * 31.8, cz + t, s > 0 ? 0 : Math.PI]); if (zona !== 'Polígono industrial' && azar() < .8) (zona === 'Centro' ? palmeras : arboles).push([cx + t * 1.3, cz + s * 31]); }
    if (cx === -80 && cz === 80) { // Plaza (misión 2)
      for (let k = 0; k < 10; k++) palmeras.push([cx + (k % 2 ? 20 : -20), cz - 22 + Math.floor(k / 2) * 11]);
      solido(MAT.piedra, cx, cz, 8, 8, .9, 4, 4, .15); solido(MAT.piedra, cx, cz, 1.4, 1.4, 3, 4, 4, 1);
      for (const [a, b] of [[-11, 0], [11, 0], [0, -11], [0, 11]]) solido(MAT.oscuro, cx + a, cz + b, a ? .6 : 2.6, a ? 2.6 : .6, .5, 4, 4, .15);
      continue;
    }
    if (cx === 0 && cz === 0) { // Banco (misión 4)
      solido(MAT.piedra, cx, cz - 2, 40, 34, 16, 4, 4, .15); caja(MAT.piedra, cx, 13.5, cz + 17, 42, 2.6, 8); for (let k = -16; k <= 16; k += 6.4) { const g = new THREE.CylinderGeometry(.75, .85, 13.4, 20); g.translate(cx + k, 6.85, cz + 19.5); mete(MAT.piedra, g); col.caja(cx + k, cz + 19.5, 1.5, 1.5, 13); }
      caja(MAT.oscuro, cx, .15, cz + 15.02, 5, 5, .1); const r = new THREE.Mesh(new THREE.PlaneGeometry(20, 2), rotulo('BANCO DEL LITORAL', '#d9d0bf', '#3a3226', 900)); r.position.set(cx, 14.8, cz + 21.03); escena.add(r);
      continue;
    }
    if (cx === 80 && cz === 80) { // Comisaría
      solido(MAT.piedra, cx, cz - 4, 36, 26, 13, 4, 4, .15); caja(MAT.oscuro, cx, .15, cz + 9.02, 3.4, 3, .1); caja(MAT.piedra, cx, 3.6, cz + 10, 7, .3, 2.4); for (let k = -14; k <= 14; k += 4) for (const y of [5, 9]) caja(MAT.oscuro, cx + k, y, cz + 9.02, 1.8, 2, .08);
      const r = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.2), rotulo('COMISARÍA', '#1b3f6a', '#f2f4f7')); r.position.set(cx, 4.7, cz + 9.1); escena.add(r); for (const a of [-12, 12]) palmeras.push([cx + a, cz + 18]);
      continue;
    }
    if (zona === 'Afueras') { for (let k = 0; k < 7; k++) arboles.push([cx + entre(-28, 28), cz + entre(-28, 28)]); if (azar() < .7) { const a = entre(9, 14), f = entre(8, 12); casa(cx, cz, a, f, 6, elige(MAT.barrio)); } continue; }
    if (zona === 'Polígono industrial') { for (const s of [-1, 1]) { const a = entre(44, 54), f = entre(20, 24), h = entre(7, 11); solido(MAT.nave, cx, cz + s * 16, a, f, h, 6, h, .15); caja(MAT.gris, cx, h + .15, cz + s * 16, a + .6, .5, f + .6); for (const q of [-12, 12]) caja(MAT.oscuro, cx + q, .15, cz + s * (16 + f / 2), 6, 4.5, .12); } for (let k = 0; k < 4; k++) contenedores.push([cx + entre(-22, 22), cz + entre(-1.5, 1.5), 0, 0]); continue; }
    const n = zona === 'Centro' ? 2 : 3, paso = 60 / n;
    for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) {
      const x = cx - 30 + paso * (u + .5), z = cz - 30 + paso * (v + .5);
      if (zona === 'Centro') {
        const a = entre(22, 26), f = entre(22, 26), p = Math.floor(entre(5, 13)), h = p * 3.2 + 3.6, m = elige(MAT.centro);
        solido(m, x, z, a, f, h, 12.8, 12.8, .15); caja(MAT.bajos, x, .15, z, a + .12, 3.5, f + .12, 16, 3.5); caja(MAT.azotea, x, h + .15, z, a + .5, .7, f + .5); caja(MAT.gris, x + entre(-5, 5), h + .8, z + entre(-5, 5), 5, 2.4, 4);
      } else { if (n === 3 && u === 1 && v === 1) continue; casa(x, z, entre(14, 17.5), entre(14, 17.5), Math.floor(entre(1, 4)) * 3.2 + 3.4, elige(MAT.barrio)); }
    }
  }
  function casa(x, z, a, f, h, m) {
    solido(m, x, z, a, f, h, 12.8, 12.8, .15); caja(MAT.bajos, x, .15, z, a + .1, 3.2, f + .1, 16, 3.2);
    if (azar() < .6) { const g = new THREE.CylinderGeometry(.1, Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.scale(a + 1, 2.4, f + 1); g.translate(x, h + 1.35, z); const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 12, uv.getY(k) * 3); mete(MAT.teja, g); }
    else { caja(MAT.azotea, x, h + .15, z, a + .3, .6, f + .3); caja(MAT.blanco, x + entre(-3, 3), h + .7, z + entre(-3, 3), 3, 2.3, 3); }
  }
  // Bar (misión 1): rótulo y toldo en una casa del barrio
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), rotulo('BAR LA MAREA', '#7a2a20', '#f5e2b8')); bar.position.set(-160, 3.9, 112.6); escena.add(bar); solido(MAT.rojo, -160, 108, 14, 9, 4.6, 4, 4, .15); caja(MAT.oscuro, -160, .15, 112.5, 2, 2.5, .1); caja(MAT.blanco, -160, 3.0, 113.4, 8, .1, 1.8);

  // Contenedores para esconderse, roperos y cámaras (systems/ley.js los usa)
  const escondites = [], roperos = [], camaras = [];
  const basura = (x, z) => { solido(MAT.verde, x, z, 2.2, 1.2, 1.25, 4, 4, .15); caja(MAT.oscuro, x, 1.4, z, 2.3, .1, 1.3); escondites.push({ x, z }); };
  for (let i = 0; i < 4; i++) for (let j = 2; j < 6; j++) { const cx = XS[i] + 40, cz = ZS[j] + 40; if (zonaDe(cx, cz) === 'Barrio de la Salina' && !(cx === -80 && cz === 80)) { basura(cx - 3, cz - 5); basura(cx + 4, cz + 5); } }
  for (const [x, z] of [[160, -160], [240, 0], [240, 80], [160, 80]]) basura(x + 26, z);
  for (const [x, z] of [[19, 222], [185, 262]]) basura(x, z);
  for (const [x, z] of [[-80, 112], [0, 112], [-160, -8]]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1), rotulo('ROPA', '#2f4d5d', '#f3ead4')); r.position.set(x, 3.4, z + .4); if (!(x === -80)) { caja(MAT.piedra, x, .15, z - 1.2, 6, 4, 3); col.caja(x, z - 1.2, 6, 3, 4); r.position.z = z + .33; escena.add(r); } else { caja(MAT.piedra, x, .15, z - 1.2 - 60, 6, 4, 3); col.caja(x, z - 61.2, 6, 3, 4); r.position.z = z - 59.67; escena.add(r); } roperos.push({ x, z: (x === -80 ? z - 60 : z) + 1.6 }); }
  for (const [x, z, th] of [[-101, 101, -2.4], [-59, 59, .8], [-19, 22, .3], [19, 22, -.3], [-150, 114, .4], [44, 214, .9], [140, 214, -.6], [84, -8, -1.57], [152, 47, 0]]) { solido(MAT.gris, x, z, .16, .16, 4.6, 4, 4, .15); camaras.push({ x, y: 4.6, z, th }); }

  // ---- Paseo marítimo, playa y puerto ----
  acera(-142, 211, 290, 8); for (let x = -275; x < 0; x += 14) palmeras.push([x, 210]);
  acera(150, 256, 290, 98, MAT.hormigon);
  col.caja(-142, 264, 300, 6, 1); // orilla
  for (const x of [60, 110, 160]) for (let k = 0; k < 8; k++) for (let y = 0; y < 1 + Math.floor(azar() * 3); y++) contenedores.push([x + entre(-.3, .3), 226 + k * 7.5 - (k > 3 ? 0 : 3), y, 0]);
  solido(MAT.nave, 230, 240, 70, 26, 10, 6, 10, .15); caja(MAT.gris, 230, 10.15, 240, 71, .5, 27);
  for (const x of [85, 135]) { for (const a of [-7, 7]) for (const b of [-5, 5]) solido(MAT.amarillo, x + a, 293 + b, 1, 1, 24, 4, 4, .15); caja(MAT.amarillo, x, 24, 293, 16, 1.6, 12); caja(MAT.amarillo, x, 25.6, 303, 2.4, 1.6, 56); caja(MAT.oscuro, x, 21.5, 312, 4, 2.6, 4); caja(MAT.oscuro, x, 12, 312, .12, 10, .12); }
  caja(MAT.rojo, 110, -1, 326, 110, 5, 20); caja(MAT.oscuro, 110, 4, 326, 108, .3, 18); caja(MAT.blanco, 68, 4, 326, 14, 13, 15); for (let k = 0; k < 8; k++) contenedores.push([84 + k * 8, 326, 1.65, 1]);
  col.caja(150, 306, 300, 3, 1); for (let x = 12; x < 295; x += 12) { const g = new THREE.CylinderGeometry(.3, .4, .7, 10); g.translate(x, .5, 303.5); mete(MAT.oscuro, g); }

  // ---- Prisión (norte) ----
  { const x = 150, z = -560, L = 120; acera(x, z, L, L, MAT.hormigon);
    for (const s of [-1, 1]) solido(MAT.hormigon, x, z + s * 60, L, 1.2, 7, 4, 4); solido(MAT.hormigon, x + 60, z, 1.2, L, 7, 4, 4); for (const s of [-1, 1]) solido(MAT.hormigon, x - 60, z + s * 32.5, 1.2, 55, 7, 4, 4); col.caja(x - 60, z, .5, 10, 5.5); const pu = new THREE.Mesh(new THREE.BoxGeometry(.5, 5.5, 10), MAT.oscuro); pu.position.set(x - 60, 2.75, z); pu.userData.y = 2.75; pu.castShadow = true; escena.add(pu); escena.userData.puertaPrision = pu;
    for (const a of [-1, 1]) for (const b of [-1, 1]) { solido(MAT.hormigon, x + a * 60, z + b * 60, 4, 4, 11); caja(MAT.oscuro, x + a * 60, 11, z + b * 60, 5.4, 2.6, 5.4); }
    for (const k of [-28, 0, 28]) { solido(MAT.hormigon, x + 12, z + k, 70, 14, 10, 4, 4, .15); for (let q = -30; q <= 30; q += 5) for (const y of [2.5, 6]) caja(MAT.oscuro, x + 12 + q, y, z + k, 1.2, 1.1, 14.1); }
    const r = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.7), rotulo('CENTRO PENITENCIARIO', '#3b4a55', '#e8e6df', 900)); r.rotation.y = -Math.PI / 2; r.position.set(x - 60.7, 6.2, z); escena.add(r); }
  for (let k = 0; k < 160; k++) { const x = entre(-320, 320), z = entre(-630, -300); if (Math.abs(x + 40) > 14 && !(x > -50 && Math.abs(z + 560) < 75)) arboles.push([x, z]); }

  for (const [m, l] of lotes) { const g = mergeGeometries(l), o = new THREE.Mesh(g, m); o.castShadow = ![MAT.campo, MAT.asfalto, MAT.arena].includes(m); o.receiveShadow = true; escena.add(o); }

  // ---- Instancias ----
  const aux = new THREE.Object3D();
  function instancia(geo, material, lista, pon) { const o = new THREE.InstancedMesh(geo, material, lista.length); lista.forEach((e, k) => { aux.position.set(0, 0, 0); aux.rotation.set(0, 0, 0); aux.scale.set(1, 1, 1); pon(e, k, o); aux.updateMatrix(); o.setMatrixAt(k, aux.matrix); }); o.castShadow = o.receiveShadow = true; o.frustumCulled = false; escena.add(o); return o; }
  const tinte = (g, c) => { g = g.index ? g.toNonIndexed() : g; const k = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([k.r, k.g, k.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
  const VC = mat({ vertexColors: true, side: THREE.DoubleSide });
  const palma = [tinte(new THREE.CylinderGeometry(.17, .27, 7, 8).translate(0, 3.5, 0), '#7d6548')];
  for (let k = 0; k < 14; k++) { const h = new THREE.PlaneGeometry(.75, 3.2, 2, 5); const p = h.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 1.6, t = y / 3.2, x = p.getX(i) * (1 - t * .75); p.setXYZ(i, x, (k % 2 ? .9 : .35) * t * 1.6 - t * t * (k % 2 ? 2 : 2.6) - Math.abs(x) * .35, y); } h.rotateY(k / 14 * Math.PI * 2); h.translate(0, 7, 0); h.computeVertexNormals(); palma.push(tinte(h, k % 2 ? '#5f7d3a' : '#4c6b33')); }
  instancia(mergeGeometries(palma), VC, palmeras, ([x, z]) => { aux.position.set(x, .1, z); aux.rotation.y = azar() * 6; aux.scale.setScalar(entre(.85, 1.25)); });
  const copa = [tinte(new THREE.CylinderGeometry(.14, .22, 2.4, 7).translate(0, 1.2, 0), '#65513c')];
  for (const [x, y, z, r, c] of [[0, 3.4, 0, 1.5, '#667a45'], [.9, 3, .4, 1.05, '#5a6e3c'], [-.8, 3.1, -.5, 1.1, '#70844d'], [.1, 2.9, -.9, .95, '#5a6e3c']]) { const g = new THREE.IcosahedronGeometry(r, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), k = 1 + .13 * Math.sin(v.x * 7 + v.y * 5) * Math.cos(v.z * 6); p.setXYZ(i, v.x * k, v.y * k * .8, v.z * k); } g.computeVertexNormals(); copa.push(tinte(g.translate(x, y, z), c)); }
  instancia(mergeGeometries(copa), VC, arboles, ([x, z]) => { aux.position.set(x, z < -290 ? -.06 : .1, z); aux.rotation.y = azar() * 6; aux.scale.setScalar(entre(.8, 1.5)); });
  const far = [tinte(new THREE.CylinderGeometry(.06, .1, 6, 8).translate(0, 3, 0), '#3b4144'), tinte(new THREE.BoxGeometry(1.8, .08, .08).translate(.85, 5.95, 0), '#3b4144'), tinte(new THREE.BoxGeometry(.6, .1, .22).translate(1.6, 5.88, 0), '#f3e6c0')];
  instancia(mergeGeometries(far), VC, farolas, ([x, z, r]) => { aux.position.set(x, .15, z); aux.rotation.y = r; });
  for (const [x, z] of farolas) col.caja(x, z, .24, .24, 6); for (const [x, z] of [...palmeras, ...arboles]) col.caja(x, z, .4, .4, 2.5);
  const COL = [0xa8402e, 0x2f5f7a, 0x4d6b46, 0xc2892f, 0x77797b].map(c => new THREE.Color(c));
  const cont = instancia(new THREE.BoxGeometry(6.1, 2.6, 2.44), mat({ map: lienzo(128, 64, (g) => { g.fillStyle = '#ddd'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#0004'; for (let k = 0; k < 16; k++) g.fillRect(k * 8, 4, 4, 56); }), roughness: .7 }), contenedores, ([x, z, y, barco], k, o) => { aux.position.set(x, .15 + 1.3 + y * 2.6, z); o.setColorAt(k, elige(COL)); if (!barco && !y) col.caja(x, z, 6.1, 2.44, 2.75); });
  // Montañas
  const cerro = []; for (let k = 0; k < 34; k++) { const a = Math.PI + k / 33 * Math.PI, r = entre(760, 900), g = new THREE.ConeGeometry(entre(120, 200), entre(60, 170), 9, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + Math.sin(i * 12.9) * 14); g.translate(Math.cos(a) * r, 20, Math.sin(a) * r - 130); cerro.push(g.toNonIndexed()); }
  const mc = mergeGeometries(cerro); mc.computeVertexNormals(); escena.add(new THREE.Mesh(mc, mat({ color: 0x77805f })));
  // Mar
  const ola = lienzo(256, 256, (g) => { g.fillStyle = '#8080ff'; g.fillRect(0, 0, 256, 256); for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${azar() * 255 | 0},${azar() * 255 | 0},255,.16)`; const x = azar() * 256, y = azar() * 256; for (const a of [0, -256]) for (const b of [0, -256]) g.fillRect(x + a, y + b, 8 + azar() * 22, 3 + azar() * 4); } }); ola.colorSpace = THREE.NoColorSpace; ola.repeat.set(160, 80);
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1300), new THREE.MeshStandardMaterial({ color: 0x1d5566, roughness: .12, metalness: .1, normalMap: ola, normalScale: new THREE.Vector2(.5, .5) })); mar.rotation.x = -Math.PI / 2; mar.position.set(0, -.5, 858); mar.receiveShadow = true; escena.add(mar);

  const limites = { x0: -330, x1: 330, z0: -630, z1: 303 };
  return { col, limites, zonaDe, aceras, escondites, roperos, camaras, puertaPrision: escena.userData.puertaPrision,
    suelo: (x, z) => { for (const a of aceras) if (x > a[0] && x < a[1] && z > a[2] && z < a[3]) return .15; return 0; },
    paso: (dt) => { ola.offset.x += dt * .012; ola.offset.y += dt * .02; } };
}
