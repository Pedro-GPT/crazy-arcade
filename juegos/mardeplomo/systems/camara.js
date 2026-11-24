// Cámara en tercera persona sobre el hombro, con choque contra edificios
import * as THREE from 'three';
export class Camara {
  constructor(cam, col) { this.cam = cam; this.col = col; this.yaw = Math.PI; this.pitch = .12; this.sens = .0022; this.d = 3; this.foco = new THREE.Vector3(); this.lado = .5; this.sinRaton = 0; this.sacudida = 0; }
  raton(mx, my) { this.yaw -= mx * this.sens; this.pitch = Math.max(-.9, Math.min(1.1, this.pitch + my * this.sens)); this.sinRaton = (mx || my) ? 0 : this.sinRaton; }
  // dirección a la que mira
  dir() { const c = Math.cos(this.pitch); return new THREE.Vector3(Math.sin(this.yaw) * c, -Math.sin(this.pitch), Math.cos(this.yaw) * c); }
  paso(dt, pos, m) { // m: {alto, dist, lado, fov, duro}
    const k = 1 - Math.exp(-dt * 10);
    const obj = new THREE.Vector3(pos.x, pos.y + m.alto, pos.z);
    if (m.duro || this.foco.distanceTo(obj) > 8) this.foco.copy(obj); else { this.foco.x = obj.x; this.foco.z = obj.z; this.foco.y += (obj.y - this.foco.y) * k; }
    this.lado += (m.lado - this.lado) * k;
    const d = this.dir(), der = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const l = this.col.rayo(this.foco, der, this.lado + .25) - .25, o = this.foco.clone().addScaledVector(der, Math.max(0, Math.min(this.lado, l)));
    const atras = d.clone().negate(); let libre = this.col.rayo(o, atras, m.dist + .25) - .25;
    if (atras.y < -.01) libre = Math.min(libre, (o.y - .3) / -atras.y);
    libre = Math.max(.35, Math.min(m.dist, libre));
    this.d = libre < this.d ? libre : this.d + (libre - this.d) * (1 - Math.exp(-dt * 5)); // se acerca de golpe, se aleja suave
    this.cam.position.copy(o).addScaledVector(atras, this.d);
    if (this.sacudida > .001) { this.cam.position.y += (Math.random() - .5) * this.sacudida; this.sacudida *= Math.exp(-dt * 8); }
    this.cam.lookAt(this.cam.position.clone().add(d));
    if (Math.abs(this.cam.fov - m.fov) > .05) { this.cam.fov += (m.fov - this.cam.fov) * k; this.cam.updateProjectionMatrix(); }
  }
}
