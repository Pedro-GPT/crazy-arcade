// Carga modelos y crea personas. Protagonista: models/protagonista.glb -> models/provisional.glb -> modelo de red
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { Esqueleto } from './esqueleto.js';
import { Animador } from './animador.js';
const RED = 'https://threejs.org/examples/models/gltf/';
const existe = (u) => fetch(u, { method: 'HEAD' }).then(r => r.ok).catch(() => false);
const cargador = new GLTFLoader();
async function glb(local, red) { for (const u of local) if (await existe('models/' + u)) return { ...await cargador.loadAsync('models/' + u), url: u }; return { ...await cargador.loadAsync(RED + red), url: RED + red }; }
export async function cargaModelos() {
  const [prota, civil, policia] = await Promise.all([glb(['protagonista.glb', 'provisional.glb'], 'Soldier.glb'), glb(['civil.glb'], 'readyplayer.me.glb'), glb(['policia.glb'], 'readyplayer.me.glb')]);
  const extra = {}, indice = await fetch('animations/indice.json').then(r => r.json()).catch(() => ({}));
  for (const n in indice) try { const g = await cargador.loadAsync('animations/' + indice[n]); if (g.animations[0]) extra[n] = g.animations[0]; } catch (e) { console.warn('No se pudo cargar la animación', n, e); }
  return { prota, civil, policia, extra };
}
// opc: {tintes: {trozoDeNombre: color}, alto, sinClips}
export function creaPersona(m, opc = {}) {
  const modelo = clone(m.scene), mats = [];
  modelo.traverse(o => { if (!o.isMesh) return; o.castShadow = !/eye|teeth|beard/i.test(o.name); o.receiveShadow = true; o.frustumCulled = false; o.material = o.material.clone(); o.material.envMapIntensity = .7; mats.push([o.name + ' ' + o.material.name, o.material, o.material.color.clone()]); });
  const tinte = (t) => { for (const [n, mat, base] of mats) { mat.color.copy(base); for (const k in t) if (n.toLowerCase().includes(k)) mat.color.multiply(new THREE.Color(t[k])); } };
  if (opc.tintes) tinte(opc.tintes);
  const esq = new Esqueleto(modelo, opc.alto), anim = new Animador(esq, opc.sinClips ? [] : m.animations);
  for (const n in opc.extra || {}) anim.ponClip(n, opc.extra[n]);
  return { esq, anim, tinte, url: m.url };
}
