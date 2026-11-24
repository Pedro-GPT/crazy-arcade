// Motor de misiones: sigue el grafo de pasos de missions/*.json. Sin Three.js.
// El "mundo" ejecuta cada tipo de paso (mundoMision.js en el juego; uno falso en las pruebas).
export const TIPOS = ['dialogo', 'llamada', 'mensaje', 'escena', 'decision', 'ir', 'interactuar', 'mantener', 'esperar', 'perder', 'vender', 'combate', 'interior', 'salir', 'poner', 'si', 'fin', 'final'];
export class Cancelada extends Error { }
export function cumple(c, e) { // e: {marcas, confianza, dinero, estrellas}
  return (!c.marca || !!e.marcas[c.marca]) && (!c.sinMarca || !e.marcas[c.sinMarca]) && (c.confianzaMin == null || e.confianza >= c.confianzaMin) && (c.confianzaMax == null || e.confianza <= c.confianzaMax) && (c.dineroMin == null || e.dinero >= c.dineroMin) && (c.estrellasMax == null || e.estrellas <= c.estrellasMax);
}
// Destinos posibles de un paso
export const salidas = (n) => n.tipo === 'decision' ? n.opciones.map(o => o.sig) : n.tipo === 'si' ? [n.sig, n.sino] : n.tipo === 'vender' ? [n.sig, n.fallo] : n.tipo === 'fin' || n.tipo === 'final' ? [] : [n.sig];
export function valida(m) {
  const E = (t) => { throw new Error(`Misión ${m.id}: ${t}`); };
  if (!m.pasos?.[m.inicio]) E('falta el paso inicial');
  for (const id in m.pasos) {
    const n = m.pasos[id]; if (!TIPOS.includes(n.tipo)) E(`paso ${id}: tipo desconocido ${n.tipo}`);
    for (const s of salidas(n)) if (!m.pasos[s]) E(`paso ${id}: no existe el destino ${s}`);
    if (n.tipo === 'decision' && (n.opciones.length < 2 || n.opciones.length > 4 || n.opciones.filter(o => o.peor).length !== 1)) E(`paso ${id}: 2-4 opciones y exactamente una "peor"`);
    if (['ir', 'interactuar', 'mantener'].includes(n.tipo) && !(n.punto?.length === 2 && n.objetivo)) E(`paso ${id}: falta punto u objetivo`);
    if (n.tipo === 'fin' && !['limpio', 'problemas', 'traicion'].includes(n.resultado)) E(`paso ${id}: resultado no válido`);
  }
  return m;
}
export class Misiones {
  constructor(mundo, partida) { Object.assign(this, { mundo, partida, activa: null, paso: null, control: null, token: 0 }); }
  estado() { return { marcas: this.partida.marcas, confianza: this.partida.confianza, dinero: this.mundo.dinero, estrellas: this.mundo.estrellas }; }
  // Juega la misión desde un paso. Devuelve {resultado} o {final}; lanza Cancelada si se corta
  async corre(m, desde = m.inicio) {
    valida(m); const tk = ++this.token; this.activa = m; let id = desde;
    for (let vueltas = 0; vueltas < 500; vueltas++) {
      const n = m.pasos[id]; this.paso = id;
      if (n.control) this.control = id;
      if (n.efectos) this.partida.aplica(n.efectos, this.mundo.mundo);
      let sig = n.sig;
      if (n.tipo === 'si') sig = cumple(n.cond, this.estado()) ? n.sig : n.sino;
      else if (n.tipo === 'decision') { const o = await this.mundo.decision({ ...n, id: m.id + '.' + id }); sig = n.opciones.find(q => q.id === o.id).sig; }
      else { const r = await this.mundo[n.tipo](n, m); if (n.tipo === 'vender') sig = r ? n.sig : n.fallo; }
      if (tk !== this.token) throw new Cancelada();
      if (n.tipo === 'fin') { this.activa = null; return { resultado: n.resultado, paso: id }; }
      if (n.tipo === 'final') { this.activa = null; return { final: n.final, paso: id }; }
      id = sig;
    }
    throw new Error(`Misión ${m.id}: demasiados pasos`);
  }
  corta() { this.token++; this.mundo.corta?.(); }
}
