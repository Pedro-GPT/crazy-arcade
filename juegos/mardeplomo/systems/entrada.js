// Teclado y ratón
export class Entrada {
  constructor(lienzo) {
    this.t = new Set(); this.nuevas = new Set(); this.mx = this.my = 0; this.apunta = this.dispara = false; this.lienzo = lienzo; this.activa = false;
    addEventListener('keydown', e => { if (!this.activa) return; if (!e.repeat) this.nuevas.add(e.code); this.t.add(e.code); if (/Space|Arrow|Tab/.test(e.code)) e.preventDefault(); });
    addEventListener('keyup', e => this.t.delete(e.code));
    addEventListener('blur', () => this.suelta());
    addEventListener('mousemove', e => { if (document.pointerLockElement === lienzo) { this.mx += e.movementX; this.my += e.movementY; } });
    addEventListener('mousedown', e => { if (!this.activa) return; if (e.button === 2) this.apunta = true; if (e.button === 0) this.dispara = true; });
    addEventListener('mouseup', e => { if (e.button === 2) this.apunta = false; });
    addEventListener('contextmenu', e => e.preventDefault());
  }
  suelta() { this.t.clear(); this.nuevas.clear(); this.apunta = this.dispara = false; }
  tiene(c) { return this.t.has(c); }
  pulsada(c) { return this.nuevas.has(c); }
  eje(a, b) { return (this.tiene(a) ? 1 : 0) - (this.tiene(b) ? 1 : 0); }
  finFotograma() { this.nuevas.clear(); this.mx = this.my = 0; this.dispara = false; }
}
