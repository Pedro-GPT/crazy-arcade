// Recibe los avisos del portal (POST /evento) y entrega las sesiones al dashboard (GET /datos).
const JUEGOS = new Set(['skillwar', 'atrapate', 'ultimo', 'salto', 'acero', 'cielo', 'parabolica', 'acero2', 'lajaula']);
const ID = /^[a-z0-9-]{8,40}$/i;
const MAX_CUERPO = 300;
const MARGEN_SEG = 5; // tolerancia entre el reloj del navegador y el del servidor

const GUARDAR = `
  INSERT INTO sesiones (id, persona, juego, inicio, ultimo, segundos, nombre)
  VALUES (?1, ?2, ?3, ?4, ?4, 0, ?6)
  ON CONFLICT(id) DO UPDATE SET
    ultimo = ?4,
    segundos = MAX(segundos, MIN(?5, (?4 - inicio) / 1000 + ${MARGEN_SEG})),
    nombre = COALESCE(?6, nombre)
  WHERE persona = excluded.persona AND juego = excluded.juego`;

// Nombre opcional: sin caracteres de control y de 1 a 30 letras; si no vale, se guarda sin nombre.
function limpiarNombre(n) {
  if (typeof n !== 'string') return null;
  const t = n.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  return t && [...t].length <= 30 ? t : null;
}

function origenPermitido(request, env) {
  const origen = request.headers.get('Origin');
  const lista = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  return origen && lista.includes(origen) ? origen : null;
}

function responder(cuerpo, estado, origen) {
  const cabeceras = { 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (origen) cabeceras['Access-Control-Allow-Origin'] = origen;
  if (cuerpo !== null) cabeceras['Content-Type'] = 'application/json';
  return new Response(cuerpo === null ? null : JSON.stringify(cuerpo), { status: estado, headers: cabeceras });
}

async function guardarEvento(request, env, origen) {
  const texto = await request.text();
  if (texto.length > MAX_CUERPO) return responder({ error: 'demasiado grande' }, 413, origen);

  let e;
  try { e = JSON.parse(texto); } catch { return responder({ error: 'json' }, 400, origen); }
  const seg = Number(e && e.seg);
  const valido = e && ID.test(e.s) && ID.test(e.p) && JUEGOS.has(e.j) && Number.isInteger(seg) && seg >= 0;
  if (!valido) return responder({ error: 'datos' }, 400, origen);

  await env.DB.prepare(GUARDAR).bind(e.s, e.p, e.j, Date.now(), seg, limpiarNombre(e.n)).run();
  return responder(null, 204, origen);
}

async function huella(texto) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
}

async function claveCorrecta(request, env) {
  if (!env.ANALYTICS_KEY) return false;
  const recibida = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
  return crypto.subtle.timingSafeEqual(await huella(recibida), await huella(env.ANALYTICS_KEY));
}

async function entregarDatos(request, env, origen) {
  if (!(await claveCorrecta(request, env))) return responder({ error: 'clave' }, 401, origen);
  const { results } = await env.DB
    .prepare('SELECT persona, nombre, juego, inicio, ultimo, segundos FROM sesiones ORDER BY inicio')
    .all();
  return responder({ sesiones: results }, 200, origen);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const origen = origenPermitido(request, env);
    if (!origen) return responder({ error: 'origen' }, 403, null);

    if (request.method === 'OPTIONS' && pathname === '/datos') {
      const r = responder(null, 204, origen);
      r.headers.set('Access-Control-Allow-Methods', 'GET');
      r.headers.set('Access-Control-Allow-Headers', 'Authorization');
      r.headers.set('Access-Control-Max-Age', '86400');
      return r;
    }
    if (request.method === 'POST' && pathname === '/evento') return guardarEvento(request, env, origen);
    if (request.method === 'GET' && pathname === '/datos') return entregarDatos(request, env, origen);
    return responder({ error: 'no existe' }, 404, origen);
  }
};
