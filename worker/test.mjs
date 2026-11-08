// Pruebas con el motor real de Workers y una base D1 local en memoria.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';

const ORIGEN = 'https://pedro-gpt.github.io';
const CLAVE = 'clave-de-prueba';
const URL_BASE = 'http://worker.test';
let mf;

const evento = (cuerpo, origen = ORIGEN) => mf.dispatchFetch(`${URL_BASE}/evento`, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain', Origin: origen },
  body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)
});
const datos = (clave = CLAVE) => mf.dispatchFetch(`${URL_BASE}/datos`, {
  headers: { Origin: ORIGEN, Authorization: `Bearer ${clave}` }
});
const sesiones = async () => (await (await datos()).json()).sesiones;
const limpiar = async () => (await mf.getD1Database('DB')).exec('DELETE FROM sesiones');

before(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: 'src/index.js',
    compatibilityDate: '2026-07-01',
    d1Databases: ['DB'],
    bindings: { ALLOWED_ORIGINS: ORIGEN, ANALYTICS_KEY: CLAVE }
  });
  const db = await mf.getD1Database('DB');
  const sql = readFileSync('schema.sql', 'utf8').replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim();
  await db.exec(sql);
});
after(() => mf.dispose());

test('el mismo dispositivo entrando 5 veces cuenta como 1 persona y 5 veces', async () => {
  await limpiar();
  for (let i = 0; i < 5; i++) {
    const r = await evento({ s: `sesion-hermano-${i}`, p: 'persona-hermano', j: 'parabolica', seg: 0 });
    assert.equal(r.status, 204);
  }
  const filas = await sesiones();
  assert.equal(filas.length, 5);
  assert.equal(new Set(filas.map(f => f.persona)).size, 1);
});

test('los avisos de una misma partida no crean visitas nuevas', async () => {
  await limpiar();
  const base = { s: 'sesion-unica-1', p: 'persona-uno', j: 'acero2' };
  await evento({ ...base, seg: 0 });
  await evento({ ...base, seg: 2 });
  await evento({ ...base, seg: 3 });
  const filas = await sesiones();
  assert.equal(filas.length, 1);
  assert.equal(filas[0].segundos, 3);
});

test('los segundos no bajan y no pueden superar el tiempo transcurrido', async () => {
  await limpiar();
  const base = { s: 'sesion-trampa', p: 'persona-uno', j: 'cielo' };
  await evento({ ...base, seg: 0 });
  await evento({ ...base, seg: 4 });
  await evento({ ...base, seg: 1 });
  assert.equal((await sesiones())[0].segundos, 4);
  await evento({ ...base, seg: 99999 });
  assert.ok((await sesiones())[0].segundos <= 6);
});

test('una sesión no puede cambiar de juego ni de persona', async () => {
  await limpiar();
  await evento({ s: 'sesion-fija-1', p: 'persona-uno', j: 'salto', seg: 0 });
  await evento({ s: 'sesion-fija-1', p: 'persona-dos', j: 'salto', seg: 1 });
  await evento({ s: 'sesion-fija-1', p: 'persona-uno', j: 'cielo', seg: 2 });
  const [f] = await sesiones();
  assert.equal(f.persona, 'persona-uno');
  assert.equal(f.juego, 'salto');
  assert.equal(f.segundos, 0);
});

test('los 9 juegos del portal se aceptan', async () => {
  await limpiar();
  const juegos = ['skillwar', 'atrapate', 'ultimo', 'salto', 'acero', 'cielo', 'parabolica', 'acero2', 'lajaula'];
  for (const j of juegos) assert.equal((await evento({ s: `sesion-${j}`, p: 'persona-uno', j, seg: 0 })).status, 204);
  assert.equal((await sesiones()).length, 9);
});

test('rechaza datos no válidos, otras webs y cuerpos grandes', async () => {
  await limpiar();
  const ok = { s: 'sesion-valida', p: 'persona-uno', j: 'salto', seg: 0 };
  assert.equal((await evento({ ...ok, j: 'inventado' })).status, 400);
  assert.equal((await evento({ ...ok, s: 'x' })).status, 400);
  assert.equal((await evento({ ...ok, seg: -1 })).status, 400);
  assert.equal((await evento({ ...ok, seg: 1.5 })).status, 400);
  assert.equal((await evento('no es json')).status, 400);
  assert.equal((await evento('null')).status, 400);
  assert.equal((await evento('x'.repeat(301))).status, 413);
  assert.equal((await evento(ok, 'https://otra-web.example')).status, 403);
  assert.equal((await sesiones()).length, 0);
});

test('guarda el nombre, lo limpia y permite cambiarlo', async () => {
  await limpiar();
  await evento({ s: 'sesion-nombre-1', p: 'persona-uno', j: 'salto', seg: 0, n: '  Ana \n María ' });
  await evento({ s: 'sesion-nombre-2', p: 'persona-dos', j: 'salto', seg: 0 });
  await evento({ s: 'sesion-nombre-3', p: 'persona-tres', j: 'salto', seg: 0, n: 'x'.repeat(31) });
  await evento({ s: 'sesion-nombre-1', p: 'persona-uno', j: 'salto', seg: 1 });
  let f = await sesiones();
  assert.deepEqual(f.map(x => x.nombre), ['Ana María', null, null]);
  await evento({ s: 'sesion-nombre-1', p: 'persona-uno', j: 'salto', seg: 2, n: 'Ana' });
  assert.equal((await sesiones())[0].nombre, 'Ana');
});

test('los datos solo se entregan con la clave correcta', async () => {
  assert.equal((await datos('clave-mala')).status, 401);
  const sinClave = await mf.dispatchFetch(`${URL_BASE}/datos`, { headers: { Origin: ORIGEN } });
  assert.equal(sinClave.status, 401);
  const r = await datos();
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGEN);
});

test('permite al dashboard enviar la clave desde el navegador', async () => {
  const r = await mf.dispatchFetch(`${URL_BASE}/datos`, { method: 'OPTIONS', headers: { Origin: ORIGEN } });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('Access-Control-Allow-Headers'), 'Authorization');
});
