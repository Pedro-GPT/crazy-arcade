// Pistola sujeta a la mano derecha de una persona
import * as THREE from 'three';
export function creaArma(esq) {
    const p = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: .7, roughness: .4 });
    const c = (a, h, f, y, z, r = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(a, h, f), m); o.position.set(0, y, z); o.rotation.x = r; o.castShadow = true; p.add(o); };
    c(.03, .035, .19, .035, .06); c(.026, .03, .15, .008, .05); c(.028, .12, .045, -.05, -.005, .2); c(.006, .03, .05, -.015, .045);
    const i = esq.idx.RMano, h = esq.huesos[i], inv = esq.repQ[i].clone().invert(), es = 1 / h.getWorldScale(new THREE.Vector3()).x;
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0)));
    p.quaternion.copy(inv).multiply(q); p.position.set(-.085, -.035, .015).applyQuaternion(inv).multiplyScalar(es); p.scale.setScalar(es); h.add(p); p.visible = false;
    return p;
}
