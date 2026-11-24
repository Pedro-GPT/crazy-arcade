// Catálogo de animaciones por código. Cada una es una función (t, e) => pose; t en segundos, e = estado
// {fase 0..1 del paso, cab = inclinación de la mira en grados, dir = volante}.
// torso:true = solo de cintura para arriba (se mezcla con las piernas que haya debajo).
const { sin, cos, PI, min, max } = Math, sierra = (t, d) => min(1, max(0, t / d)), suave = (x) => x * x * (3 - 2 * x);
const mez = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
// Interpola entre poses clave: [[t, pose], ...] (todas con los mismos campos)
export function claves(lista, t) {
  let i = 0; while (i < lista.length - 2 && t > lista[i + 1][0]) i++;
  const [ta, a] = lista[i], [tb, b] = lista[i + 1], k = suave(sierra(t - ta, tb - ta)), r = {};
  for (const c in a) r[c] = Array.isArray(a[c]) ? mez(a[c], b[c], k) : typeof a[c] === 'number' ? a[c] + (b[c] - a[c]) * k : a[c];
  return r;
}
const pasos = (f, zancada, flexion, sube) => { // ciclo de piernas
  const pierna = (g, x) => { const s = sin(g) * zancada, dobla = max(0, cos(g)) * flexion; return [[x, -1, s + dobla * .35], [x * .6, -1, s - dobla - .06]]; };
  const [mi, pi] = pierna(f, .05), [md, pd] = pierna(f + PI, -.05);
  return { musloI: mi, piernaI: pi, musloD: md, piernaD: pd, pieLibre: .6, sube };
};
const AGACHADO = { musloI: [.14, -.1, 1], piernaI: [.06, -1, -.15], musloD: [-.18, -.7, .5], piernaD: [-.06, -.25, -1], pieLibre: .5, torso: [28, 0, 0], cabeza: [-22, 0, 0] };
const EN_PIE = { musloI: [.06, -1, .02], piernaI: [.03, -1, -.03], musloD: [-.06, -1, .02], piernaD: [-.03, -1, -.03], torso: [0, 0, 0], cabeza: [0, 0, 0], raiz: [0, 0, 0], mueve: [0, 0, 0] };
const SENTADO = { musloI: [.13, .25, 1], piernaI: [.05, -.55, .8], musloD: [-.13, .25, 1], piernaD: [-.05, -.55, .8], torso: [-7, 0, 0], cabeza: [10, 0, 0], alto: .5, raiz: [0, 0, 0], mueve: [0, 0, 0] };
const ATRAS = { manoI: [.05, .95, -.2], manoD: [-.05, .95, -.2], codoI: [1, 0, -.8], codoD: [-1, 0, -.8], puno: 25 };
const BAJAS = { manoI: [.25, .86, .06], manoD: [-.25, .86, .06], codoI: [.6, 0, -1], codoD: [-.6, 0, -1] };
const MIRA = { manoI: [.0, 1.43, .47], manoD: [-.03, 1.46, .44], codoI: [1, -1, 0], codoD: [-1, -1, 0], giroI: -75, giroD: 90, puno: 70 };

export const CATALOGO = {
  quieto: { f: t => ({ torso: [1 + sin(t * 1.7), 0, 0], cabeza: [0, sin(t * .5) * 6, 0], brazoI: [.2, -1, -.02], brazoD: [-.2, -1, -.02] }) },
  andar: { paso: 1, f: (t, e) => { const g = e.fase * 2 * PI, s = sin(g) * .38; return { ...pasos(g, .42, .4, 0), torso: [3, -sin(g) * 6, 0], brazoI: [.16, -1, -s], brazoD: [-.16, -1, s] }; } },
  correr: { paso: 1, f: (t, e) => { const g = e.fase * 2 * PI, s = sin(g) * .9; return { ...pasos(g, .85, 1.1, .05 + .03 * cos(2 * g)), torso: [13, -sin(g) * 12, 0], cabeza: [-8, 0, 0], brazoI: [.25, -1, -s], anteI: [.02, -.3, 1 - s * .5], brazoD: [-.25, -1, s], anteD: [-.02, -.3, 1 + s * .5], puno: 60 }; } },
  agacharse: { f: t => ({ ...AGACHADO, torso: [28 + sin(t * 2), 0, 0], manoI: [.16, 1.0, .36], manoD: [-.16, 1.0, .36] }) },
  andar_agachado: { paso: 1, f: (t, e) => { const g = e.fase * 2 * PI, s = sin(g); return { musloI: [.1, -.8, .65 + s * .4], piernaI: [.05, -1, -.65 + s * .3 - max(0, cos(g)) * .4], musloD: [-.1, -.8, .65 - s * .4], piernaD: [-.05, -1, -.65 - s * .3 - max(0, -cos(g)) * .4], torso: [30, 0, 0], cabeza: [-24, 0, 0], manoI: [.2, 1.02, .32], manoD: [-.2, 1.02, .32] }; } },
  apuntar: { torso: 1, f: (t, e) => ({ ...MIRA, torso: [-e.cab, 0, 0] }) },
  disparar: { torso: 1, dur: .22, f: (t, e) => { const k = max(0, 1 - t / .2); return { ...MIRA, manoI: [0, 1.43 + k * .05, .47 - k * .07], manoD: [-.03, 1.46 + k * .05, .44 - k * .07], torso: [-e.cab - k * 6, 0, 0] }; } },
  recargar: { torso: 1, dur: 1.6, f: t => claves([[0, { ...MIRA, torso: [0, 0, 0], cabeza: [0, 0, 0] }], [.35, { ...MIRA, manoD: [-.1, 1.28, .33], manoI: [.2, .95, .1], torso: [4, 0, 0], cabeza: [18, 0, 0] }], [.85, { ...MIRA, manoD: [-.1, 1.28, .33], manoI: [-.06, 1.2, .3], torso: [4, 0, 0], cabeza: [18, 0, 0] }], [1.15, { ...MIRA, manoD: [-.08, 1.34, .36], manoI: [-.05, 1.4, .34], torso: [2, 0, 0], cabeza: [10, 0, 0] }], [1.6, { ...MIRA, torso: [0, 0, 0], cabeza: [0, 0, 0] }]], t) },
  impacto: { torso: 1, dur: .5, f: t => { const k = sin(sierra(t, .5) * PI); return { torso: [-16 * k, 24 * k, 8 * k], cabeza: [12 * k, 0, 0], manoI: [.08, 1.15, .25], manoD: [-.35, 1.0, .05] }; } },
  caer_herido: { dur: 1.7, f: t => claves([[0, { ...EN_PIE, alto: 1, ...BAJAS }], [.6, { ...EN_PIE, musloI: [.1, -1, .25], piernaI: [.1, -.1, -1], musloD: [-.1, -1, .2], piernaD: [-.1, -.1, -1], torso: [22, 8, 0], cabeza: [15, 0, 0], alto: .52, ...BAJAS, manoI: [.0, 1.1, .2] }], [1.35, { ...EN_PIE, raiz: [82, 25, 0], musloI: [.15, -1, .2], piernaI: [.1, -1, -.3], torso: [4, 0, 4], cabeza: [-8, 35, 0], alto: .13, mueve: [0, 0, .5], ...BAJAS, manoI: [.35, 1.35, .05], manoD: [-.4, 1.1, .02] }], [1.7, { ...EN_PIE, raiz: [86, 25, 0], musloI: [.15, -1, .15], piernaI: [.1, -1, -.2], torso: [2, 0, 4], cabeza: [-4, 40, 0], alto: .12, mueve: [0, 0, .52], ...BAJAS, manoI: [.35, 1.35, .03], manoD: [-.4, 1.1, .02] }]], t) },
  rendirse: { f: t => ({ manoI: [.34, 1.78, .08], manoD: [-.34, 1.78, .08], codoI: [1, -.3, .1], codoD: [-1, -.3, .1], giroI: 60, giroD: -60, puno: 4, torso: [sin(t * 2), 0, 0], cabeza: [6, 0, 0] }) },
  esposado: { dur: 1.6, f: t => claves([[0, { ...EN_PIE, manoI: [.34, 1.78, .08], manoD: [-.34, 1.78, .08], codoI: [1, -.3, .1], codoD: [-1, -.3, .1], puno: 4 }], [.7, { ...EN_PIE, manoI: [.45, 1.15, -.1], manoD: [-.34, 1.7, .05], codoI: [1, 0, -.8], codoD: [-1, -.3, .1], puno: 15 }], [1.6, { ...EN_PIE, torso: [12, 0, 0], cabeza: [20, 0, 0], ...ATRAS }]], t) },
  sentado_coche: { f: t => ({ ...SENTADO, ...ATRAS, torso: [4, 0, sin(t * 1.3) * 2], cabeza: [14, sin(t * .4) * 22, 0] }) },
  escoltado: { paso: 1, f: (t, e) => { const g = e.fase * 2 * PI; return { ...pasos(g, .3, .35, 0), ...ATRAS, torso: [17, sin(g) * 5, sin(g) * 3], cabeza: [18, sin(t * .7) * 12, 0] }; } },
  conducir: { f: (t, e) => { const d = e.dir * .09; return { ...SENTADO, manoI: [.16, 1.38 - d, .46], manoD: [-.16, 1.38 + d, .46], codoI: [.6, -1, 0], codoD: [-.6, -1, 0], giroI: -70, giroD: 70, puno: 65, cabeza: [10, e.dir * 12, 0] }; } },
  entrar_coche: { dur: 1, f: t => claves([[0, { ...EN_PIE, alto: 1, ...BAJAS }], [.5, { ...EN_PIE, musloI: [.1, -.5, 1], piernaI: [.05, -1, -.2], musloD: [-.3, -.5, 1], piernaD: [-.1, -1, -.1], torso: [32, -15, 12], cabeza: [-10, 0, 0], alto: .68, ...BAJAS, manoI: [.3, 1.25, .25] }], [1, { ...SENTADO, ...BAJAS, manoI: [.16, 1.38, .46], manoD: [-.16, 1.38, .46] }]], t) },
  salir_coche: { dur: .9, f: t => CATALOGO.entrar_coche.f(1 - sierra(t, .9)) },
  sobre_capo: { f: t => ({ musloI: [.1, -1, .12], piernaI: [.05, -1, -.12], musloD: [-.1, -1, .12], piernaD: [-.05, -1, -.12], cadera: [38, 0, 0], torso: [38, 0, 0], cabeza: [-18, 28, 0], ...ATRAS }) },
  sujetar: { torso: 1, f: t => ({ torso: [6, 0, 0], manoD: [-.1, 1.12, .42], manoI: [.1, 1.2, .42], codoI: [1, -1, -.3], codoD: [-1, -1, -.3], giroI: -60, giroD: 60, puno: 45 }) },
  atado: { f: t => ({ torso: [5 + sin(t * 2.2) * 1.5, 0, 0], cabeza: [10, sin(t * .6) * 8, 0], ...ATRAS }) },
  quieto_sentado: { f: t => ({ ...SENTADO, cabeza: [6, sin(t * .6) * 18, 0], manoI: [.14, .98, .34], manoD: [-.14, .98, .34] }) },
  hablar: { f: t => ({ torso: [1, sin(t * .9) * 4, 0], cabeza: [sin(t * 2.3) * 5, sin(t * 1.1) * 8, 0], manoI: [.24 + sin(t * 1.9) * .06, 1.12 + sin(t * 2.7) * .09, .28], manoD: [-.24 + sin(t * 1.3) * .05, 1.08 + max(0, sin(t * 1.6)) * .17, .28], giroI: -80, giroD: 80, puno: 12 }) },
};
