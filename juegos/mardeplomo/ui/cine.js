// Interfaz de escenas, decisiones, condena y final
import { condena, texto } from '../systems/partida.js';
const $ = (id) => document.getElementById(id);
export class UiCine {
  constructor() {
    const d = document.createElement('div'); d.id = 'cine'; d.hidden = true; d.innerHTML = '<div id="negro"></div><div class="banda"></div><div class="banda abajo"></div><div id="rotulo"></div><div id="subt"></div><div id="salta">Enter: saltar</div>'; document.body.append(d);
    const q = document.createElement('div'); q.id = 'decide'; q.hidden = true; document.body.append(q); const p = document.createElement('div'); p.id = 'pantalla'; p.hidden = true; document.body.append(p);
  }
  abre(vista) { $('cine').hidden = false; $('hud').hidden = true; $('salta').hidden = !vista; this.negro(1); }
  cierra() { $('cine').hidden = true; $('hud').hidden = false; this.sub(null); this.rotulo(''); }
  negro(o) { $('negro').style.opacity = o; }
  rotulo(t) { $('rotulo').textContent = t; }
  sub(s) { const id = s ? s.quien + s.texto : ''; if (id === this._s) return; this._s = id; $('subt').replaceChildren(); if (s) { if (s.quien) { const b = document.createElement('b'); b.textContent = s.quien + ': '; $('subt').append(b); } $('subt').append(s.texto); } }
  // ---- Decisión ----
  decision(d) {
    const c = $('decide'); c.hidden = !d; if (!d) { this._d = null; return; }
    if (this._d !== d) { this._d = d; c.replaceChildren(); const t = document.createElement('p'); t.textContent = d.def.texto; c.append(t); d.def.opciones.forEach((o, i) => { const b = document.createElement('div'); b.className = 'op'; b.textContent = `${i + 1}  ${o.texto}`; b.onclick = () => d.elige(i); c.append(b); }); const r = document.createElement('div'); r.className = 'reloj'; r.append(document.createElement('i')); c.append(r); }
    c.lastChild.firstChild.style.width = Math.max(0, d.queda / (d.def.segundos || 10) * 100) + '%';
  }
  // ---- Pantallas. Devuelven una promesa con lo elegido ----
  _pantalla(titulo, lineas, botones) {
    const p = $('pantalla'); p.hidden = false; p.replaceChildren(); document.exitPointerLock?.(); const h = document.createElement('h2'); h.textContent = titulo; p.append(h); for (const l of lineas) { const e = document.createElement('p'); e.textContent = l; p.append(e); }
    return new Promise(r => { const f = document.createElement('div'); for (const [id, t, no] of botones) { const b = document.createElement('button'); b.textContent = t; b.disabled = !!no; b.onclick = () => { p.hidden = true; r(id); }; f.append(b); } p.append(f); });
  }
  condena(historial, dinero) { const c = condena(historial); return this._pantalla('Condena: ' + texto(c.meses), c.lista.map(d => `${d.nombre}${d.n > 1 ? ' ×' + d.n : ''}: ${d.meses ? texto(d.meses) : 'multa'}`), [['abogado', `Abogado (${c.abogado.toLocaleString('es-ES')} €): baja a ${texto(c.conAbogado)}`, dinero < c.abogado], ['reintentar', 'Volver al último punto de control']]).then(r => ({ r, c })); }
  fin(motivo, decisiones) { return this._pantalla('FIN', [motivo, ...(decisiones.length ? ['Las decisiones que te trajeron aquí:', ...decisiones.map(d => `· ${d.resumen}${d.porTiempo ? ' (no elegiste a tiempo)' : ''}`)] : ['No llegaste a tomar ninguna decisión.'])], [['menu', 'Empezar una partida nueva']]); }
}
