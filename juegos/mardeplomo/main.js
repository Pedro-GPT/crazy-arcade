// Arranque y bucle principal
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { creaCiudad } from './scenes/ciudad.js';
import { cargaModelos, creaPersona } from './systems/cargaPersonaje.js';
import { Entrada } from './systems/entrada.js';
import { Camara } from './systems/camara.js';
import { Coche } from './systems/coche.js';
import { Jugador } from './systems/jugador.js';
import { Peatones } from './systems/gente.js';
import { Trafico } from './systems/trafico.js';
import { Ley } from './systems/ley.js';
import { Partida, Decision, texto } from './systems/partida.js';
import { Sonido } from './systems/sonido.js';
import { Cine } from './scenes/cine.js';
import { UiCine } from './ui/cine.js';
import { Misiones, Cancelada } from './systems/misiones.js';
import { MundoMision } from './systems/mundoMision.js';
import { Hud } from './ui/hud.js';
const $ = (id) => document.getElementById(id), params = new URLSearchParams(location.search);
addEventListener('error', e => { $('carga').textContent = 'Error: ' + e.message; });

async function arranca() {
  const lienzo = $('lienzo'), ren = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
  ren.setPixelRatio(Math.min(devicePixelRatio, 1.5)); ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap; ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = .5;
  const escena = new THREE.Scene(), cam3 = new THREE.PerspectiveCamera(60, 1, .1, 3000);
  escena.fog = new THREE.Fog(0xc9cfcb, 250, 1300);
  // Cielo y luz de media tarde
  const sol = new THREE.Vector3().setFromSphericalCoords(1, (90 - 32) * Math.PI / 180, 2.3), cielo = new Sky(); cielo.scale.setScalar(2800);
  Object.assign(cielo.material.uniforms, {}); for (const [k, v] of [['turbidity', 3], ['rayleigh', 1.1], ['mieCoefficient', .004], ['mieDirectionalG', .8]]) cielo.material.uniforms[k].value = v; cielo.material.uniforms.sunPosition.value.copy(sol); 
  const pm = new THREE.PMREMGenerator(ren), esc2 = new THREE.Scene(); esc2.add(cielo); escena.environment = pm.fromScene(esc2, 0, .1, 4000).texture; escena.add(cielo);
  const luz = new THREE.DirectionalLight(0xffe7c4, 3.4); luz.castShadow = true; luz.shadow.mapSize.set(2048, 2048); Object.assign(luz.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 320 }); luz.shadow.bias = -.0004; luz.shadow.normalBias = .04; escena.add(luz, luz.target, new THREE.HemisphereLight(0xdfe9f2, 0xb09a7c, .9));

  $('carga').textContent = 'Construyendo la ciudad…'; await new Promise(r => setTimeout(r, 30));
  const ciudad = creaCiudad(escena), coches = [];
  for (const [x, z, th, c] of [[-68, 124.4, 1.571, 0x7d2b27], [-115.6, 70, 0, 0x31526b], [-124.4, 20, 3.142, 0xc9c5bb], [-44.4, 90, 3.142, 0x2c2f31], [-160, 124.4, 1.571, 0x6b7a4b], [-10, 44.4, 1.571, 0x1f2d3d], [44.4, 10, 0, 0xb9bcbd], [60, 35.6, -1.571, 0x8b1e1e], [160, 44.4, 1.571, 0xd0cfc9], [204.4, 80, 0, 0x4b4f52], [60, 204.4, 1.571, 0x35506e], [-150, 204.4, 1.571, 0xc49a3c], [-35.6, -320, 0, 0x565b3f], [70, -565.5, 1.571, 0x24384d]]) coches.push(new Coche(escena, x, z, th, c));
  $('carga').textContent = 'Cargando personas…';
  const mod = await cargaModelos(), per = creaPersona(mod.prota, { sinClips: params.has('sinclips'), extra: mod.extra });
  const en = new Entrada(lienzo), cam = new Camara(cam3, ciudad.col), jug = new Jugador(escena, ciudad, per, coches), hud = new Hud(ciudad);
  jug.suyo = coches[0];
  const peatones = new Peatones(escena, mod, ciudad), trafico = new Trafico(escena, ciudad, coches), ley = new Ley({ escena, ciudad, coches, jug, peatones, trafico, mod });
  jug.mundo = ley; trafico.alChocar = (c) => { if (jug.coche) ley._conductor(c); };
  let pausa = true, ultimo = 0, fps = 60;
  // ---- Escenas, decisiones y finales ----
  let guardado = null; try { guardado = window.localStorage; } catch { }
  const partida = new Partida(guardado), sonido = new Sonido(), ui = new UiCine(), cine = new Cine({ escena, cielo, ren, cam3, luz, sol, ciudad, coches, jug, ley, peatones, trafico, mod, partida, sonido, ui });
  let decision = null, pantalla = false; const control = { x: -80, z: 108 };
  const decide = (def) => new Promise(r => { decision = new Decision(def, (o, porTiempo) => { decision = null; ui.decision(null); partida.decisiones.push({ decision: def.id, opcion: o.id, resumen: o.resumen || o.texto, porTiempo }); partida.aplica(o.efectos, { jug, ley }); r(o); }); });
  const conPantalla = async (p) => { pantalla = true; en.suelta(); const r = await p; pantalla = false; vuelve(); return r; };
  const vuelve = () => { en.suelta(); ultimo = 0; juega(); };
  async function desenlace(t) {
    const m = mis.activa, enMision = !!m; mis.corta(); await new Promise(r => setTimeout(r, t === 'detenido' ? 900 : 0));
    if (m && m[t === 'detenido' ? 'alDetener' : 'alMorir']) { mm.despeja(); const c = m[t === 'detenido' ? 'alDetener' : 'alMorir']; await cine.pon(t === 'detenido' ? 'arresto' : 'abatido', { rendido: ley.fin?.rendido }); mis.activa = null; await finDe(c, m); campanaDesde(0); return; }
    const sigue = () => { mm.despeja(); const f = mis.foto; if (enMision && f) { partida.marcas = { ...f.marcas }; partida.confianza = Math.max(0, f.confianza - 3); partida.decisiones.length = f.n; } campanaDesde(partida.siguiente, enMision ? mis.control || m.inicio : null); }; const hist = { ...ley.b.historial };
    if (t === 'detenido') {
      await cine.pon('arresto', { rendido: ley.fin?.rendido }); const { r, c } = await conPantalla(ui.condena(hist, jug.dinero));
      let m2; if (r === 'abogado') { jug.dinero -= c.abogado; m2 = `El abogado rebaja la condena a ${texto(c.conAbogado)}. Conservas tus cosas.`; } else { const q = Math.round(jug.dinero * .3); jug.dinero -= q; jug.balas = jug.reserva = 0; m2 = `Pierdes ${q} € y la munición.`; }
      ley.limpia(control); ley.di(m2); sigue();
    } else { await cine.pon('abatido'); const q = Math.round(jug.dinero * .2); jug.dinero -= q; ley.limpia(control); ley.di(`Pierdes ${q} €.`); sigue(); }
  }
  // ---- Campaña ----
  const mm = new MundoMision({ escena, ciudad, coches, jug, ley, cine, decide, en, mod, ui, sonido, partida, cam }), mis = new Misiones(mm, partida), lista = await Promise.all((await (await fetch('missions/indice.json')).json()).map(f => fetch('missions/' + f).then(r => r.json())));
  mm.vars = { jefe: 'Salvatierra' }; const SEDE = [26, 218]; let campana = null;
  const finDe = async (clave, m) => { await conPantalla(ui.fin(m.finales[clave], partida.decisiones)); partida.decisiones = []; partida.marcas = {}; partida.misiones = {}; partida.confianza = 50; partida.siguiente = 0; jug.dinero = 250; jug.balas = 12; jug.reserva = 60; mm.despeja(); ley.limpia(control); };
  // Entre misiones: el líder llama y hay que ir a verle. Con poca confianza, antes manda a alguien a por ti
  async function entreMisiones(m) {
    mis.token++; const tk = mis.token, vivo = () => { if (tk !== mis.token) throw new Cancelada(); };
    await mm.esperar({ seg: 2 }); vivo(); await mm.llamada({ lineas: [['Salvatierra', partida.confianza < 25 ? 'Tenemos que hablar. Ya.' : partida.confianza >= 75 ? 'Amigo mío, pásate por la oficina.' : 'Tengo trabajo para ti. Ven al puerto.']] }); vivo();
    if (partida.confianza < 25 && !partida.marcas.emboscada && m.id !== 'm5') { partida.marcas.emboscada = true; await mm.combate({ objetivo: 'Alguien te ha mandado un aviso: defiéndete', rivales: [[jug.x + 25, jug.z + 18], [jug.x - 25, jug.z + 20]], vida: 60, escapa: SEDE }); vivo(); }
    await mm.interactuar({ objetivo: `Ve a ver a Salvatierra: «${m.titulo}»`, punto: SEDE, radio: 3, accion: 'entrar en la oficina' }); vivo();
  }
  async function campanaDesde(i, paso) {
    const yo = campana = {};
    try {
      for (; i < lista.length;) {
        const m = lista[i]; partida.siguiente = i;
        if (!paso) { await entreMisiones(m); mm.msg = { quien: 'Misión ' + (i + 1), texto: m.titulo, t: 5 }; Object.assign(control, { x: 30, z: 214 }); if (jug.modo === 'pie') { jug.x = 30; jug.z = 214; } mis.control = null; }
        const r = await mis.corre(m, paso || m.inicio); paso = null;
        if (r.final) { await finDe(r.final, m); i = 0; continue; }
        mm.msg = { quien: 'Misión completada', texto: { limpio: 'Éxito limpio', problemas: 'Éxito con problemas', traicion: 'Has traicionado a Salvatierra' }[r.resultado], t: 6 }; i++; ley.limpia({ x: 30, z: 214 }); Object.assign(control, { x: 30, z: 214 });
      }
    } catch (e) { if (!(e instanceof Cancelada)) { console.error(e); ley.di('Error de misión: ' + e.message); } }
  }
  // El punto de control guarda también dónde estabas
  Object.defineProperty(mis, 'control', { get() { return this._c; }, set(v) { this._c = v; if (v && jug.x < 1000) Object.assign(control, { x: jug.x, z: jug.z }); this.foto = { marcas: { ...partida.marcas }, confianza: partida.confianza, dinero: jug.dinero, n: partida.decisiones.length }; } });
  const ejecuta = async (motivo, jefe = 'Salvatierra') => { await cine.pon('ejecucion', { jefe }); await conPantalla(ui.fin(motivo, partida.decisiones)); ley.limpia(control); };
  ley.alAcabar = (t) => desenlace(t).catch(e => { console.error(e); ley.limpia(control); });
  const PRUEBAS = {
    'Arresto (rendido)': () => { Object.assign(ley.b.historial, { robo: 2, agredirPolicia: 1 }); ley.fin = { t: 'detenido', s: 0, rendido: true }; return desenlace('detenido'); },
    'Arresto (derribado)': () => { Object.assign(ley.b.historial, { disparo: 3, matarPolicia: 1 }); ley.fin = { t: 'detenido', s: 0, rendido: false }; return desenlace('detenido'); },
    'Abatido': () => desenlace('abatido'), 'Ejecución': () => ejecuta('Salvatierra descubrió que le traicionabas.'),
    'Éxito': () => cine.pon('exito', { jefe: 'Salvatierra', reaccion: 'Limpio y sin ruido. Así me gusta.', parte: '1.200' }),
    'Decisión': async () => { const o = await decide(await fetch('scenes/datos/decision_prueba.json').then(r => r.json())); ley.di('Elegiste: ' + o.texto + ' · confianza ' + partida.confianza); },
  };
  lista.forEach((m, i) => PRUEBAS['M' + (i + 1)] = async () => { partida.siguiente = i; Object.assign(control, { x: 30, z: 214 }); jug.x = 30; jug.z = 214; mis.control = null; campanaDesde(i, m.inicio); });
  for (const n in PRUEBAS) { const b = document.createElement('button'); b.textContent = n; b.onclick = () => { if (cine.activo || decision) return; juega(); empezada = true; mis.corta(); mm.despeja(); PRUEBAS[n]().catch(e => { console.error(e); ley.di('Error: ' + e.message); }); }; $('pruebas').append(b); } $('pruebas').hidden = false;
  addEventListener('keydown', e => { if (pausa || pantalla) return; if (decision && /^(Digit|Numpad)[1-4]$/.test(e.code)) decision.elige(+e.code.slice(-1) - 1); else if (cine.activo && e.code === 'Enter') cine.saltar(); });
  let cuadro = 0;
  for (const c of coches) { c.y = ciudad.suelo(c.x, c.z); c.pinta(.016); }
  const ajusta = () => { ren.setSize(innerWidth, innerHeight, false); cam3.aspect = innerWidth / innerHeight; cam3.updateProjectionMatrix(); }; addEventListener('resize', ajusta); ajusta();

  const juega = () => { sonido.arranca(); pausa = false; en.activa = true; $('portada').hidden = true; $('hud').hidden = false; try { lienzo.requestPointerLock()?.catch?.(() => { }); } catch { } };
  const para = () => { pausa = true; en.activa = false; en.suelta(); $('portada').hidden = false; $('carga').textContent = 'Pausa'; $('jugar').textContent = 'Continuar'; };
  let empezada = false; $('jugar').onclick = () => { juega(); if (!empezada) { empezada = true; campanaDesde(0); } }; lienzo.onclick = () => { if (!pausa && document.pointerLockElement !== lienzo) try { lienzo.requestPointerLock()?.catch?.(() => { }); } catch { } };
  document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== lienzo && !pausa && !pantalla) para(); });
  addEventListener('keydown', e => { if (e.code === 'Escape' && !pausa && !pantalla) para(); });
  addEventListener('blur', () => { if (!pausa && !pantalla) para(); });

  function simula(dt, lento) { if (lento) en.suelta();
    if (en.pulsada('KeyV')) jug.alternaVisor();
    cam.raton(en.mx, en.my); jug.paso(dt, en, cam); ciudad.paso(dt); cuadro++;
    if (!mm.int) { trafico.paso(dt, jug, ley.personas); peatones.paso(dt, jug, ley); } ley.paso(dt, cam); mm.paso(dt);
    for (const p of ley.personas) if (p.activa) p.dibuja(dt, ciudad, cam3.position, cuadro);
    for (const c of coches) { c.g.visible = Math.hypot(c.x - jug.x, c.z - jug.z) < 260; if (c !== jug.coche && !c.trafico && !(ley.patrullas.includes(c) && !c.control)) { if (Math.hypot(c.vx, c.vz) > .05) c.paso(dt, { gas: 0, dir: 0, mano: true }, ciudad, coches); else c.pinta(dt); } }
    const enCoche = jug.modo === 'coche', v = enCoche ? Math.abs(jug.coche.v) : 0;
    cam.paso(dt, { x: jug.x, y: jug.y, z: jug.z }, enCoche ? { alto: 1.5, dist: 6.2 + v * .04, lado: 0, fov: 62 + v * .35 } : jug.mirando ? { alto: jug.agachado ? 1.15 : 1.55, dist: 1.6, lado: .58, fov: 48 } : { alto: jug.agachado ? 1.15 : 1.5, dist: jug.visor != null ? 3.6 : 2.9, lado: jug.visor != null ? 0 : .42, fov: 60 });
    luz.target.position.set(jug.x, 0, jug.z); luz.position.copy(luz.target.position).addScaledVector(sol, 160); cielo.position.copy(cam3.position);
    $('visor').hidden = jug.visor == null; if (jug.visor != null) $('visor').textContent = `← ${jug.nombres[jug.visor]} (${jug.visor + 1}/${jug.nombres.length}) →  ·  V: salir`;
    hud.pinta({ x: jug.x, z: jug.z, th: jug.th, yaw: cam.yaw, vida: jug.vida, dinero: jug.dinero, estrellas: ley.b.estrellas, ley, ropa: jug.ropa, coche: jug.coche, balas: jug.balas + ' / ' + jug.reserva, objetivo: mm.objetivo, mision: mm, confianza: partida.confianza, aviso: jug.aviso, mira: jug.mirando, vel: enCoche ? v * 3.6 : null, coches });
    en.finFotograma();
  }
  function avanza(dt) {
    if (pantalla) return;
    if (cine.activo) { cine.paso(dt); cielo.position.copy(cam3.position); ciudad.paso(dt); en.finFotograma(); }
    else if (decision) { const d = decision; d.paso(dt); if (decision) ui.decision(d); simula(dt * .04, true); }
    else simula(dt);
  }
  simula(.016);
  globalThis.__J = { jug, cam, en, coches, ley, peatones, trafico, mod, ciudad, ren, escena, cam3, simula, avanza, cine, partida, mis, mm, lista, campanaDesde, control, decide, ui, PRUEBAS, ejecuta, get decision() { return decision; }, juega, dibuja: () => ren.render(escena, cam3), get fps() { return fps; }, url: per.url }; // para pruebas
  $('carga').textContent = per.url.startsWith('http') ? 'Personaje provisional' : per.url; $('jugar').hidden = false;
  ren.setAnimationLoop(t => { const dt = Math.min(.05, (t - ultimo) / 1000 || .016); if (ultimo) fps += (1000 / (t - ultimo) - fps) * .05; ultimo = t; if (!pausa) avanza(dt); ren.render(escena, cam3); });
}
arranca().catch(e => { console.error(e); $('carga').textContent = 'No se pudo arrancar: ' + e.message; });
