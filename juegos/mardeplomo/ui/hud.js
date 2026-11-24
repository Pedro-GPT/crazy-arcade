// HUD y minimapa
const $ = (id) => document.getElementById(id);
export class Hud {
  constructor(ciudad) {
    this.ciudad = ciudad; const l = ciudad.limites, c = this.plano = document.createElement('canvas'); this.ox = l.x0; this.oz = l.z0; c.width = l.x1 - l.x0; c.height = l.z1 - l.z0 + 20; const g = c.getContext('2d');
    g.fillStyle = '#6d7256'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#3c5a66'; g.fillRect(0, 590 + 300, c.width, 60); g.fillStyle = '#a5a7a5'; g.fillRect(-287 - l.x0, -287 - l.z0, 574, 494); g.fillRect(-48 - l.x0, 0, 16, 350); g.fillRect(-48 - l.x0, 63, 138, 14);
    g.fillStyle = '#454b4a'; for (const a of ciudad.aceras) g.fillRect(a[0] - l.x0, a[2] - l.z0, a[1] - a[0], a[3] - a[2]);
    g.fillStyle = '#707773'; for (const a of ciudad.col.cajas) if (a.x1 - a.x0 > 1) g.fillRect(a.x0 - l.x0, a.z0 - l.z0, a.x1 - a.x0, a.z1 - a.z0);
    this.g = $('mapa').getContext('2d');
  }
  pinta(d) { // {x,z,th,yaw,vida,dinero,estrellas,balas,objetivo,aviso,mira,vel,coches}
    $('vida').firstChild.style.width = d.vida + '%'; $('dinero').textContent = d.dinero.toLocaleString('es-ES') + ' €'; $('estrellas').innerHTML = '<b>' + '★'.repeat(d.estrellas) + '</b>' + '★'.repeat(5 - d.estrellas);
    $('municion').textContent = d.balas; $('objetivo').textContent = d.objetivo; $('aviso').textContent = d.aviso; $('mira').style.display = d.mira ? 'block' : 'none'; $('velocidad').textContent = d.vel == null ? '' : Math.round(d.vel) + ' km/h'; $('zona').textContent = d.x > 1000 ? 'Banco del Litoral' : this.ciudad.zonaDe(d.x, d.z); const m = d.mision; $('telefono').hidden = !m.msg; if (m.msg && this._m !== m.msg) { this._m = m.msg; $('telefono').replaceChildren(Object.assign(document.createElement('b'), { textContent: m.msg.quien }), m.msg.texto); } $('barra').hidden = !m.progreso; $('barra').firstChild.style.width = Math.min(1, m.progreso) * 100 + '%'; $('confianza').textContent = 'Confianza ' + d.confianza;
    const L = d.ley, est = d.estrellas; $('radio').textContent = L.radio; $('arresto').hidden = L.arresto < .02; $('arresto').lastChild.style.width = L.arresto * 100 + '%';
    $('alerta').textContent = !est ? '' : L.visto > 0 ? 'TE VEN' : L.b.disfrazado(d.ropa, d.coche) ? `No te reconocen · ${Math.ceil(L.b.espera - L.b.tSin)} s` : `Te buscan · ${Math.ceil(L.b.espera - L.b.tSin)} s`; $('alerta').style.color = L.visto > 0 ? '#ff6b57' : '#9fd8ff';
    const g = this.g, e = d.vel == null ? 1.1 : .75, s = Math.sin(d.yaw) * e, k = Math.cos(d.yaw) * e;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 200, 200); g.setTransform(-k, -s, s, -k, 100, 100); g.drawImage(this.plano, this.ox - d.x, this.oz - d.z);
    g.fillStyle = '#e8e0cc'; for (const c of d.coches) if (g.fillStyle = c.policia ? '#3d7dff' : '#e8e0cc') g.fillRect(c.x - d.x - 1.5, c.z - d.z - 1.5, 3, 3);
    g.fillStyle = '#5aa2ff'; for (const p of L.policias) if (p.viva && p.tipo === 'policia') g.fillRect(p.x - d.x - 2, p.z - d.z - 2, 4, 4); if (est && L.visto <= 0 && L.b.ultima) { g.strokeStyle = '#ff6b57'; g.lineWidth = 1.5; g.beginPath(); g.arc(L.b.ultima.x - d.x, L.b.ultima.z - d.z, 14, 0, 7); g.stroke(); } g.fillStyle = '#6fd0e8'; for (const p of L.ciudad.roperos) { g.beginPath(); g.arc(p.x - d.x, p.z - d.z, 4, 0, 7); g.fill(); }
    if (m.punto && d.x < 1000) { const dx = m.punto[0] - d.x, dz = m.punto[1] - d.z; let px = -k * dx + s * dz, py = -s * dx - k * dz; const L = Math.max(Math.abs(px), Math.abs(py)); if (L > 92) { px *= 92 / L; py *= 92 / L; } g.setTransform(1, 0, 0, 1, 100, 100); g.fillStyle = '#ffb84d'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill(); g.stroke(); }
    g.setTransform(1, 0, 0, 1, 100, 100); g.rotate(d.yaw - d.th + 0); g.fillStyle = '#f0a93b'; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.fill();
  }
}
