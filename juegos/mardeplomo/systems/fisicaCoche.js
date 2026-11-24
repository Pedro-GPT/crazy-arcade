// Física arcade del coche. Sin Three.js. Rumbo th: avance = (sin th, cos th); giro positivo = izquierda.
export const COCHE = { acel: 8, freno: 15, marchaAtras: 9, max: 44, batalla: 2.6, giroMax: 0.58 };

// Agarre lateral (1/s): cuánto se corrige por segundo el deslizamiento de lado.
// Alto = va sobre raíles; bajo = derrapa.  v en m/s, frenoMano es true/false.
export function agarreLateral(v, frenoMano) {
  // TODO(human): decide cómo cambia el agarre con la velocidad y el freno de mano.
  // Valor provisional para que el coche funcione:
  return frenoMano ? 1.5 : 9;
}

// c: {x,z,th,vx,vz,giro}; e: {gas,-1..1; dir,-1..1 (izq. +); mano}
export function pasoCoche(c, e, dt) {
  const s = Math.sin(c.th), k = Math.cos(c.th);
  let va = c.vx * s + c.vz * k, vl = c.vx * k - c.vz * s; // avance y lateral (+ = izquierda)
  if (e.gas > 0) va += (va < 0 ? COCHE.freno : COCHE.acel * (1 - va / COCHE.max)) * e.gas * dt;
  else if (e.gas < 0) va = va > 0.5 ? Math.max(0, va + COCHE.freno * e.gas * dt) : Math.max(-COCHE.marchaAtras, va + 5 * e.gas * dt);
  va -= va * 0.12 * dt;
  if (!e.gas) va -= Math.sign(va) * Math.min(Math.abs(va), 1.2 * dt);
  if (e.mano) va -= Math.sign(va) * Math.min(Math.abs(va), 6 * dt);
  const tope = COCHE.giroMax / (1 + Math.abs(va) * 0.075);
  c.giro += (e.dir * tope - c.giro) * Math.min(1, dt * 8);
  const w = va * Math.tan(c.giro) / COCHE.batalla * (e.mano ? 1.5 : 1);
  c.th += w * dt;
  vl *= Math.exp(-agarreLateral(Math.abs(va), e.mano) * dt);
  // La velocidad se conserva en el mundo: al girar el morro aparece deslizamiento lateral
  c.vx = s * va + k * vl; c.vz = k * va - s * vl;
  const s2 = Math.sin(c.th), k2 = Math.cos(c.th);
  const a2 = c.vx * s2 + c.vz * k2; let l2 = c.vx * k2 - c.vz * s2;
  c.vx = s2 * a2 + k2 * l2; c.vz = k2 * a2 - s2 * l2;
  c.x += c.vx * dt; c.z += c.vz * dt;
  c.v = a2; c.desliz = l2;
}
