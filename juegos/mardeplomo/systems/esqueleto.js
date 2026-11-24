// Convierte poses descritas "en el cuerpo" (direcciones y posiciones de manos) en giros de huesos.
// Ejes: +x izquierda del personaje, +y arriba, +z delante. Vale para cualquier esqueleto humanoide.
import * as THREE from 'three';
const V = (a) => new THREE.Vector3(...a), RAD = Math.PI / 180;
const qEuler = (a) => new THREE.Quaternion().setFromEuler(new THREE.Euler(a[0] * RAD, a[1] * RAD, a[2] * RAD, 'YXZ'));

// Nombre de hueso del GLB -> nombre interno
const ALIAS = { hips: 'Hips', hip: 'Hips', pelvis: 'Hips', neck: 'Neck', necktwist01: 'Neck', head: 'Head' };
for (const [l, L] of [['left', 'L'], ['right', 'R']]) {
  const p = l[0] + '_', t = { shoulder: 'Hombro', arm: 'Brazo', forearm: 'Ante', hand: 'Mano', upleg: 'Muslo', leg: 'Pierna', foot: 'Pie', toebase: 'Punta' };
  for (const k in t) ALIAS[l + k] = L + t[k];
  const u = { clavicle: 'Hombro', upperarm: 'Brazo', forearm: 'Ante', hand: 'Mano', thigh: 'Muslo', calf: 'Pierna', foot: 'Pie', toebase: 'Punta' };
  for (const k in u) ALIAS[p + k] = L + u[k];
}
const limpio = (n) => n.toLowerCase().replace(/^mixamorig\d*:?/, '').replace(/[:.\s]/g, '');
const OBLIGATORIOS = ['Hips', 'Head', ...['L', 'R'].flatMap(s => ['Brazo', 'Ante', 'Mano', 'Muslo', 'Pierna', 'Pie'].map(x => s + x))];

export class Esqueleto {
  constructor(modelo, alto = 1.78) {
    this.raiz = new THREE.Group(); this.raiz.add(modelo);
    this.raiz.updateMatrixWorld(true);
    this.huesos = []; this.idx = {}; this.columna = []; this.dedos = [];
    modelo.traverse(o => { if (o.isBone) this.huesos.push(o); });
    const num = new Map(this.huesos.map((h, i) => [h, i]));
    this.padre = this.huesos.map(h => num.has(h.parent) ? num.get(h.parent) : -1);
    this.huesos.forEach((h, i) => {
      const n = limpio(h.name);
      if (/^(spine\d*|waist)$/.test(n)) this.columna.push(i);
      else if (/^(left|right)hand(index|middle|ring|pinky)[123]$/.test(n)) this.dedos.push([i, n[0] === 'l' ? -1 : 1]);
      else if (ALIAS[n] && !(ALIAS[n] in this.idx)) this.idx[ALIAS[n]] = i;
    });
    const faltan = OBLIGATORIOS.filter(k => !(k in this.idx));
    if (faltan.length) throw new Error('Al esqueleto del modelo le faltan huesos: ' + faltan.join(', '));
    // Orientación y altura: izquierda × arriba = delante
    const pos = (k) => this.huesos[this.idx[k]].getWorldPosition(new THREE.Vector3());
    const izq = pos('LMuslo').sub(pos('RMuslo')); modelo.rotation.y -= Math.atan2(-izq.z, izq.x);
    this.raiz.updateMatrixWorld(true);
    let caja = new THREE.Box3().setFromObject(modelo, true);
    modelo.scale.multiplyScalar(alto / (caja.max.y - caja.min.y));
    this.raiz.updateMatrixWorld(true);
    caja = new THREE.Box3().setFromObject(modelo, true);
    const c = pos('Hips'); modelo.position.x -= c.x; modelo.position.z -= c.z; modelo.position.y -= caja.min.y;
    this.raiz.updateMatrixWorld(true);
    // Datos de reposo
    this.repQ = this.huesos.map(h => h.getWorldQuaternion(new THREE.Quaternion()));
    this.repP = this.huesos.map(h => h.getWorldPosition(new THREE.Vector3()));
    this.repLocal = this.huesos.map(h => h.quaternion.clone());
    const cad = this.huesos[this.idx.Hips];
    this.padreCad = new THREE.Matrix4().copy(cad.parent.matrixWorld).invert();
    this.padreCadQ = cad.parent.getWorldQuaternion(new THREE.Quaternion());
    this.cadLocal = cad.position.clone();
    const L = (a, b) => this.repP[this.idx[a]].distanceTo(this.repP[this.idx[b]]);
    this.largo = { brazo: L('LBrazo', 'LAnte'), ante: L('LAnte', 'LMano'), muslo: L('LMuslo', 'LPierna'), pierna: L('LPierna', 'LPie') };
    this.tobillo = this.repP[this.idx.LPie].y;
    this.pecho = this.columna.at(-1) ?? this.idx.Hips;
    const rolDe = []; for (const k in this.idx) rolDe[this.idx[k]] = k; this.rolDe = rolDe;
    this.giroDedo = new Map(this.dedos);
    // Máscara del torso: columna y todo lo que cuelga de ella
    this.esTorso = this.huesos.map((_, i) => { for (let j = i; j >= 0; j = this.padre[j]) if (this.columna.includes(j)) return true; return false; });
  }
  pose() { return { q: this.huesos.map((_, i) => this.repLocal[i].clone()), p: this.cadLocal.clone() }; }

  // Dos huesos hasta la mano: devuelve direcciones de brazo y antebrazo
  ik(lado, mano, codo) {
    const h = this.repP[this.idx[lado + 'Brazo']], d = V(mano).multiplyScalar(this.escala ?? 1).sub(h);
    const a = this.largo.brazo, b = this.largo.ante, D = Math.min(Math.max(d.length(), Math.abs(a - b) + .02), a + b - .004); d.normalize();
    const cos = (a * a + D * D - b * b) / (2 * a * D), polo = V(codo);
    polo.addScaledVector(d, -polo.dot(d)).normalize();
    const br = d.clone().multiplyScalar(cos).addScaledVector(polo, Math.sqrt(Math.max(0, 1 - cos * cos)));
    return [br, d.multiplyScalar(D).addScaledVector(br, -a).normalize()];
  }
  // s = descripción de la pose (ver animations/catalogo.js)
  resolver(s, sal) {
    const A = [], R = qEuler(s.raiz || [0, 0, 0]), nCol = this.columna.length || 1, dirs = {};
    for (const [lado, n] of [['L', 'I'], ['R', 'D']]) {
      const sg = lado === 'L' ? 1 : -1;
      if (s['mano' + n]) [dirs[lado + 'Brazo'], dirs[lado + 'Ante']] = this.ik(lado, s['mano' + n], s['codo' + n] || [sg * .6, -1, -.3]);
      else { const b = s['brazo' + n] || [sg * .18, -1, 0]; dirs[lado + 'Brazo'] = V(b).normalize(); dirs[lado + 'Ante'] = V(s['ante' + n] || [b[0] * .6, b[1], b[2] + .18]).normalize(); }
      dirs[lado + 'Muslo'] = V(s['muslo' + n] || [sg * .06, -1, .02]).normalize();
      dirs[lado + 'Pierna'] = V(s['pierna' + n] || [sg * .03, -1, -.03]).normalize();
    }
    const mt = new THREE.Vector3();
    for (let i = 0; i < this.huesos.length; i++) {
      const p = this.padre[i], k = this.rolDe[i];
      const a = (p >= 0 ? A[p] : new THREE.Quaternion()).clone();
      if (k === 'Hips') a.copy(R).multiply(qEuler(s.cadera || [0, 0, 0]));
      else if (this.columna.includes(i)) { if (s.torso) a.multiply(qEuler(s.torso.map(v => v / nCol))); }
      else if (k === 'Neck' || k === 'Head') { if (s.cabeza) a.multiply(qEuler(s.cabeza.map(v => v / 2))); }
      else if (dirs[k]) {
        const hijo = { Brazo: 'Ante', Ante: 'Mano', Muslo: 'Pierna', Pierna: 'Pie' }[k.slice(1)];
        const de = mt.copy(this.repP[this.idx[k[0] + hijo]]).sub(this.repP[i]).normalize().applyQuaternion(a).clone();
        const marco = /Brazo|Ante/.test(k) ? A[this.pecho] : R;
        const a2 = dirs[k].clone().applyQuaternion(marco);
        a.premultiply(new THREE.Quaternion().setFromUnitVectors(de, a2));
        const g = k.endsWith('Ante') && s['giro' + (k[0] === 'L' ? 'I' : 'D')];
        if (g) a.premultiply(new THREE.Quaternion().setFromAxisAngle(a2, g * RAD));
      } else if (k === 'LPie' || k === 'RPie') { if (!s.pieLibre) a.copy(R); else a.slerp(R, 1 - s.pieLibre); }
      else if (this.giroDedo.has(i)) a.multiply(qEuler([0, 0, this.giroDedo.get(i) * (s.puno ?? 18)]));
      A[i] = a;
      const pq = p >= 0 ? A[p].clone().multiply(this.repQ[p]) : this.padreCadQ.clone();
      sal.q[i].copy(pq.invert()).multiply(a.clone().multiply(this.repQ[i]));
    }
    // Altura de la cadera: automática para que el pie (o la rodilla) más bajo toque el suelo
    const ih = this.idx.Hips, P = this.repP[ih].clone();
    if (s.alto != null) P.y *= s.alto;
    else {
      let baja = 0;
      for (const l of ['L', 'R']) {
        const m = this.largo.muslo * -dirs[l + 'Muslo'].y, art = this.repP[ih].y - this.repP[this.idx[l + 'Muslo']].y;
        baja = Math.max(baja, art + m + this.largo.pierna * -dirs[l + 'Pierna'].y + this.tobillo, art + m + .06);
      }
      P.y = baja + (s.sube || 0);
    }
    if (s.mueve) P.add(V(s.mueve));
    sal.p.copy(P).applyMatrix4(this.padreCad);
    return sal;
  }
}
