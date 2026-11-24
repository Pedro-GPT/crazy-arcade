// Sonidos de las escenas, sintetizados. Si existe audio/<id>.mp3 y está en audio/indice.json, se usa ese archivo.
export class Sonido {
  constructor() { this.vivos = []; this.archivos = {}; fetch('audio/indice.json').then(r => r.json()).then(async i => { for (const k in i) this.archivos[k] = 'audio/' + i[k]; }).catch(() => { }); }
  arranca() { if (!this.c) { try { this.c = new AudioContext(); this.m = this.c.createGain(); this.m.gain.value = .5; this.m.connect(this.c.destination); } catch { } } this.c?.resume?.(); }
  _ruido(dur, f, g, tipo = 'lowpass', ret = 0) { const c = this.c, t = c.currentTime + ret, b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(), q = c.createBiquadFilter(), v = c.createGain(); s.buffer = b; q.type = tipo; q.frequency.setValueAtTime(f, t); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(q).connect(v).connect(this.m); s.start(t); this.vivos.push(s); }
  _tono(f, dur, g, tipo = 'sine', ret = 0, f2) { const c = this.c, t = c.currentTime + ret, o = c.createOscillator(), v = c.createGain(); o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(v).connect(this.m); o.start(t); o.stop(t + dur); this.vivos.push(o); }
  pon(id) {
    if (this.archivos[id]) { const a = new Audio(this.archivos[id]); a.play().catch(() => { }); this.vivos.push({ stop: () => a.pause() }); return; }
    if (!this.c) return;
    if (id === 'disparo') { this._ruido(.5, 2600, 1); this._ruido(1.6, 500, .5); this._tono(120, .25, .8, 'sine', 0, 40); }
    else if (id === 'esposas') for (const r of [0, .12, .4, .52]) { this._tono(2300, .06, .25, 'square', r); this._ruido(.05, 5000, .3, 'highpass', r); }
    else if (id === 'puerta') { this._ruido(1, 900, .25); this._tono(95, 1.4, .8, 'triangle', 1); this._ruido(.5, 1600, .9, 'lowpass', 1); }
    else if (id === 'coche') { this._tono(70, 3.5, .3, 'sawtooth', 0, 95); this._ruido(3.5, 300, .25); }
    else if (id === 'sirena') for (let k = 0; k < 5; k++) { this._tono(620, .5, .12, 'triangle', k, 900); this._tono(900, .5, .12, 'triangle', k + .5, 620); }
    else if (id === 'latido') for (let k = 0; k < 5; k++) { this._tono(60, .18, .9, 'sine', k * .9); this._tono(50, .2, .7, 'sine', k * .9 + .22); }
    else if (id === 'telefono') for (const r of [0, .2, .8, 1]) this._tono(880, .16, .2, 'square', r);
    else if (id === 'mensaje') { this._tono(990, .1, .25); this._tono(1320, .16, .25, 'sine', .1); }
    else if (id === 'golpe') { this._ruido(.2, 400, .8); this._tono(80, .2, .6); }
  }
  calla() { for (const s of this.vivos) try { s.stop(); } catch { } this.vivos = []; }
}
