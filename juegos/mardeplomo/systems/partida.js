// Estado de la partida: decisiones tomadas, confianza del líder, marcas, escenas vistas. Sin Three.js.
export class Partida {
  constructor(almacen) { this.almacen = almacen; this.decisiones = []; this.marcas = {}; this.misiones = {}; this.siguiente = 0; this.confianza = 50; let v = []; try { v = JSON.parse(almacen?.getItem('mdp_vistas') || '[]'); } catch { } this.vistas = new Set(Array.isArray(v) ? v : []); }
  escenaVista(id) { return this.vistas.has(id); }
  marcaVista(id) { this.vistas.add(id); try { this.almacen?.setItem('mdp_vistas', JSON.stringify([...this.vistas])); } catch { } }
  // ef: {confianza, dinero, calor, marca: 'x' | {x: valor}}
  aplica(ef = {}, mundo = {}) {
    if (ef.confianza) this.confianza = Math.max(0, Math.min(100, this.confianza + ef.confianza));
    if (ef.dinero && mundo.jug) mundo.jug.dinero = Math.max(0, mundo.jug.dinero + ef.dinero);
    if (ef.calor && mundo.ley) mundo.ley.b.calor = Math.max(0, mundo.ley.b.calor + ef.calor);
    if (typeof ef.marca === 'string') this.marcas[ef.marca] = true; else Object.assign(this.marcas, ef.marca);
  }
}
// Una decisión abierta. def: {id, texto, segundos, opciones: [{id, texto, peor, resumen, efectos}]}
export class Decision {
  constructor(def, alElegir) {
    if (!def.opciones || def.opciones.length < 2 || def.opciones.length > 4) throw new Error('La decisión ' + def.id + ' debe tener de 2 a 4 opciones');
    if (def.opciones.filter(o => o.peor).length !== 1) throw new Error('La decisión ' + def.id + ' debe marcar una (y solo una) opción como peor');
    this.def = def; this.queda = def.segundos || 10; this.alElegir = alElegir; this.hecha = null;
  }
  paso(dt) { if (this.hecha) return; this.queda -= dt; if (this.queda <= 0) this._fin(this.def.opciones.find(o => o.peor), true); }
  elige(i) { if (!this.hecha && this.def.opciones[i]) this._fin(this.def.opciones[i], false); }
  _fin(o, porTiempo) { this.hecha = o; this.alElegir(o, porTiempo); }
}
// ---- Condena ----
export const PENAS = { sospechoso: [0, 'Desobediencia'], armaVista: [4, 'Exhibición de arma'], venta: [18, 'Venta ilegal'], robo: [8, 'Robo de vehículo'], disparo: [6, 'Disparos en la vía pública'], herir: [24, 'Lesiones graves'], atropello: [18, 'Atropello'], choquePolicia: [10, 'Embestir a un coche patrulla'], agredirPolicia: [30, 'Agresión a un agente'], matar: [150, 'Homicidio'], matarPolicia: [216, 'Homicidio de un agente'] };
// historial: {delito: veces}. Devuelve meses, desglose, y coste y resultado del abogado
export function condena(historial) {
  const lista = Object.entries(historial).filter(([k]) => PENAS[k]).map(([k, n]) => ({ nombre: PENAS[k][1], n, meses: Math.round(PENAS[k][0] * (1 + (n - 1) * .5)) }));
  const meses = Math.min(480, Math.max(2, lista.reduce((s, d) => s + d.meses, 0)));
  return { lista, meses, abogado: Math.max(100, Math.round(meses * 18 / 50) * 50), conAbogado: Math.max(1, Math.round(meses * .4)) };
}
export const texto = (m) => { const a = Math.floor(m / 12), r = m % 12; return [a && a + (a > 1 ? ' años' : ' año'), r && r + (r > 1 ? ' meses' : ' mes')].filter(Boolean).join(' y '); };
