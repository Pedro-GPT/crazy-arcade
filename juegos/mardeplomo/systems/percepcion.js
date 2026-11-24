// ¿Puede un vigilante ver un punto? Sin Three.js.
// o: {x,y,z,th} ojos; alcance en m; semi = medio ángulo en radianes; p: {x,y,z}
export function enCono(o, p, alcance, semi) {
  const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
  if (d > alcance) return null;
  if (d > 1.2) { const a = Math.atan2(dx, dz) - o.th; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > semi) return null; }
  return d;
}
export function ve(o, p, alcance, semi, col) {
  const d = enCono(o, p, alcance, semi); if (d == null) return null;
  const v = { x: p.x - o.x, y: p.y - o.y, z: p.z - o.z }, l = Math.hypot(v.x, v.y, v.z) || 1;
  v.x /= l; v.y /= l; v.z /= l;
  return col.rayo(o, v, l) < l - .05 ? null : d;
}
// Velocidad a la que se llena el ojo (1/s). llama: lo sospechoso que eres; d: distancia; alcance del vigilante
export const ritmoSospecha = (llama, d, alcance) => llama * (.35 + 1.4 * (1 - d / alcance) ** 2);
