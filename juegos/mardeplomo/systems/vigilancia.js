// Cámaras de seguridad, conos de visión en el suelo y ojos de sospecha
import * as THREE from 'three';
const SEG = 24;
export function creaCono(escena, alcance, semi) {
  const p = [0, 0, 0], ix = []; for (let i = 0; i <= SEG; i++) { const a = -semi + 2 * semi * i / SEG; p.push(Math.sin(a) * alcance, 0, Math.cos(a) * alcance); if (i) ix.push(0, i, i + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(ix);
  const o = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false })); o.renderOrder = 2; escena.add(o); return o;
}
export const tinteCono = (o, s) => { o.material.color.setHSL(.13 * (1 - s), 1, .55); o.material.opacity = .13 + s * .2; };
// Ojo que se llena: 9 niveles dibujados una vez
let OJOS;
function ojos() {
  return OJOS ||= Array.from({ length: 9 }, (_, k) => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), forma = () => { g.beginPath(); g.moveTo(4, 32); g.quadraticCurveTo(32, 2, 60, 32); g.quadraticCurveTo(32, 62, 4, 32); };
    forma(); g.fillStyle = '#000a'; g.fill(); g.save(); forma(); g.clip(); g.fillStyle = k === 8 ? '#f2452f' : '#f5c542'; g.fillRect(0, 64 - 8 - k * 6, 64, 64); g.restore(); forma(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); g.beginPath(); g.arc(32, 32, 9, 0, 7); g.fillStyle = '#111'; g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}
export function creaOjo(escena) { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: ojos()[0], transparent: true, depthTest: false, sizeAttenuation: false })); o.scale.setScalar(.04); o.visible = false; o.renderOrder = 5; escena.add(o); return o; }
export function ponOjo(o, x, y, z, s) { o.visible = s > .03; if (!o.visible) return; o.position.set(x, y, z); o.material.map = ojos()[Math.min(8, Math.floor(s * 8.01))]; }
export class CamaraSeg {
  constructor(escena, d) {
    Object.assign(this, { x: d.x, y: d.y, z: d.z, th0: d.th, th: d.th, t: Math.random() * 9, sospecha: 0, alcance: 20, semi: .42, vida: 1 });
    this.g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0xdedfe0, roughness: .5 }), c = new THREE.Mesh(new THREE.BoxGeometry(.18, .16, .46), m), l = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .06, 12), new THREE.MeshStandardMaterial({ color: 0x101114, roughness: .1 })); l.rotation.x = Math.PI / 2; l.position.z = .25; c.castShadow = true;
    this.piloto = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0x30ff50 })); this.piloto.position.set(0, .1, .2); this.g.add(c, l, this.piloto); this.g.position.set(d.x, d.y + .25, d.z); this.g.rotation.order = 'YXZ'; escena.add(this.g);
    this.cono = creaCono(escena, this.alcance, this.semi); this.ojo = creaOjo(escena);
  }
  paso(dt, objetivo) { // si te está viendo, te sigue
    this.t += dt; const b = this.th0 + Math.sin(this.t * .5) * .65;
    if (objetivo && this.sospecha > .15) { const a = Math.atan2(objetivo.x - this.x, objetivo.z - this.z); this.th += Math.atan2(Math.sin(a - this.th), Math.cos(a - this.th)) * Math.min(1, dt * 2); } else this.th += Math.atan2(Math.sin(b - this.th), Math.cos(b - this.th)) * Math.min(1, dt * 2);
    this.g.rotation.set(.35, this.th, 0); this.cono.position.set(this.x, .22, this.z); this.cono.rotation.y = this.th; tinteCono(this.cono, this.sospecha); this.piloto.material.color.set(this.sospecha > .5 ? 0xff3020 : 0x30ff50); ponOjo(this.ojo, this.x, this.y + .8, this.z, this.sospecha);
  }
  rompe() { this.vida = 0; this.sospecha = 0; this.cono.visible = this.ojo.visible = this.piloto.visible = false; this.g.rotation.x = 1.2; }
}
