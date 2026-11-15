/* ============================================================
   NEWS LIBRARY v1.0 для VIDEO CREATE   (news-library.js)
   Анимированные фоны и рисунки на тему новостей, СМИ, эфира и проверки фактов.
   Всё рисуется кодом на Canvas 2D, без картинок и внешних зависимостей.
   Нейтральная: без логотипов реальных СМИ, имён и символики. Цвета берутся из палитры ролика.
   Результат зависит только от времени t (сек), поэтому годится и для превью, и для экспорта.

   API (window.NewsLib) — тот же контракт, что у window.VPNLib:
     BG_IDS, BG_NAMES, BG, drawBg(ctx, id, t, W, H, col)      — анимированные фоны (nws_*)
     ART, ART_IDS, draw(ctx, id, box, t, col, appear)         — рисунки: прямой эфир, «срочно», газета, глобус событий,
                                                                микрофон, камера, лента, проверка фактов, тренд, хронология,
                                                                пресс-конференция, путь новости, уведомление, заголовок, иконки
     drawIcon(ctx, name, color, lineWidth)                    — одиночная линейная иконка (±1)
     isTopic(text), topicScore(text)                          — тема про новости / СМИ? (topicScore нужен, чтобы выбрать между библиотеками)
     plan(list, active)                                       — подбор рисунка для каждой сцены
     slot(W, H, ar, idx)                                      — постоянное место рисунка + область для текста
     fitBox(L, W, H, ar)                                      — запасной вариант: свободное место рядом с текстом
   col = { a: акцент, f: цвет текста, b: цвет фона, s: акцент для экранов } (все #rrggbb)
   ============================================================ */
(function (root) {
'use strict';
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hr = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + 1.234) * 43758.5453; return x - Math.floor(x); };
const eo3 = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const eback = t => { t = clamp(t, 0, 1); const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;
const RED = '#ff3b4e', AMBER = '#ffb020';
const MONO = "'JetBrains Mono',Menlo,Consolas,monospace", SANS = "Inter,system-ui,-apple-system,sans-serif";
const rgb = h => { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16) || 0; return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${clamp(a, 0, 1).toFixed(3)})`; };
const full = h => { h = String(h || ''); return /^#[0-9a-f]{3}$/i.test(h) ? '#' + h.slice(1).replace(/./g, '$&$&') : h; };
const mix = (h1, h2, k) => { const A = rgb(h1), B = rgb(h2); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
function pal(col) { col = col || {}; const a = full(col.a) || '#b6ff00', f = full(col.f) || '#ffffff', b = full(col.b) || '#0a0a0a'; return { a, f, b, s: full(col.s) || a }; }

/* ---------- общие помощники (локальные единицы: 1 = половина высоты рисунка) ---------- */
function rr(c, x, y, w, h, r) { r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const gl = (g, color, amt) => { g.c.shadowColor = color; g.c.shadowBlur = g.px * amt; };
const ng = g => { g.c.shadowBlur = 0; g.c.shadowColor = 'transparent'; };
function txt(g, s, x, y, size, color, o) {
  o = o || {}; const c = g.c; c.save(); c.translate(x, y); c.scale(.01, .01);
  c.font = `${o.w || 700} ${size * 100}px ${o.mono ? MONO : SANS}`; c.textAlign = o.al || 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(s, 0, 0); c.restore();
}
// пилюля с текстом (ширина считается по тексту)
function pill(g, s, x, y, size, fg, bg, o) {
  o = o || {}; const c = g.c; c.save(); c.font = `${o.w || 800} ${size * 100}px ${o.mono ? MONO : SANS}`; const w = c.measureText(s).width * .01 + size * 1.1, h = size * 1.75; c.restore();
  rr(g.c, x - w / 2, y - h / 2, w, h, h / 2); g.c.fillStyle = bg; g.c.fill(); if (o.line) { g.c.lineWidth = .02; g.c.strokeStyle = o.line; g.c.stroke(); } txt(g, s, x, y + size * .04, size, fg, o); return w;
}
const ICON = {};
function drawIcon(c, name, color, lw) { if (!ICON[name]) return; c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = lw || .12; c.lineCap = 'round'; c.lineJoin = 'round'; ICON[name](c); c.restore(); }
const icon = (g, name, x, y, s, color, lw) => { g.c.save(); g.c.translate(x, y); g.c.scale(s, s); drawIcon(g.c, name, color, lw || .12); g.c.restore(); };
function badge(g, x, y, r, color, fa) { const c = g.c; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = rgba(color, fa === undefined ? .1 : fa); c.fill(); c.lineWidth = .035; c.strokeStyle = rgba(color, .85); c.stroke(); }
// «человечек»: голова + плечи (вид спереди), origin — центр головы
function person(c, x, y, s, fill, line) { c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.arc(0, 0, .5, 0, TAU); c.fillStyle = fill; c.fill(); if (line) { c.lineWidth = .08; c.strokeStyle = line; c.stroke(); } c.beginPath(); c.moveTo(-.95, 1.7); c.bezierCurveTo(-.95, .8, -.5, .62, 0, .62); c.bezierCurveTo(.5, .62, .95, .8, .95, 1.7); c.closePath(); c.fillStyle = fill; c.fill(); if (line) c.stroke(); c.restore(); }

const ART = {}, ART_IDS = [];
function reg(id, name, group, ar, draw) { ART[id] = { id, name, group, ar, draw }; ART_IDS.push(id); }
const BGS = {}, CFG = {};

/* ---------- Карта мира: битовая маска суши 144×72 (Natural Earth 110m, шаг 2.5°) ---------- */
const LAND_B64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAPz///8DAAAAAEAAAAAAAAAAAPz7//8A4AEAAMAAAAAAAAAAF/nw//8AAAAAAcAfgAEAAADAAfUA/v8AAABAAP5/AAAAAALAPvcP/H8AAAAg2P///x8Awf//f18e+D8AgH+A////////5////398+AMD4P//////////wP///084+IAB+P7/////////wP///wcOcAAAfP7//////38fAAf+/wd+AAAAfPz//////wEBAAD4/x/+AABAKP//////f8ABAADw/3//AQDw+P///////8AAAADg////AwDA/////////wEAAADA//8/BwCA/////////wAAAADA//9/AACA///v////fwAAAADA//8PAACg1wf3////PwMAAADA//8HAADwYX/v////DwEAAACA//8DAADwAPnv//9/BAEAAACA//8DAABgD+D/////yAAAAAAA/v8BAADgH8D/////MAAAAAAA/v8AAADwf///////AQAAAAAA/IMAAAD4///3////AQAAAAAA8IEAAAD8///P////AAAAAAAA4AEAAAD8/79/+P9/AQAAAAAAwBEDAAD+/3//8OcfAAAAAAAAwBsIAAD+/39/4OMHAAAAAAAAAB8AAAD+//8e4MEHAQAAAAAAAHAAAAD+//8HwIAPAAAAAAAAAGAcAAD8//8LwIAGAAAAAAAAAID+AAD4//8PAIEAAgAAAAAAAAD+AQDw//8PAABBAAAAAAAAAAD+DwAA8P8HAIBhAAAAAAAAAAD/DwAA8P8DAIBxAAAAAAAAAAD/PwAA8P8BAABzIQAAAAAAAAD//wEA8P8AAAAC4QMAAAAAAAD//wMA4P8AAAAEgAcAAAAAAAD//wMA4P8AAAAAAA0AAAAAAAD+/wEA4P8AAAAAAAAAAAAAAAD+/wEA4P8IAAAAcAIAAAAAAAD8/wAA4P8MAAAAfgMAAAAAAADw/wAA4H8MAAAA/gcAAAAAAADw/wAA4D8GAADA/w8AAAAAAADwPwAAwD8GAADg/x8AAAAAAADwHwAAwB8AAADg/x8AAAAAAAD4DwAAwB8AAADA/x8AAAAAAAD4DwAAgA8AAADA/x8AAAAAAAD4BwAAgAcAAADAwR8AAAAAAAD4AQAAAAAAAAAAAA8AAAAAAAD4AAAAAAAAAAAAAARAAAAAAAB8AAAAAAAAAAAAAAQAAAAAAAA8AAAAAAAAAAAAAAAQAAAAAAAcAAAAAAAAAAAAAAAIAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAAAAABgAAAzcAAAAAAAAAAgAAAAACD/j////z8AAAAAAAB4AADg////7/////8PAAAAgP//AAD8//////////8PAOD///8fAOD///////////8DgP7///8BMPz///////////8DAPj/////OP////////////8BAPj///////////////////8P////////////////////////////////////////////////';
let _mask = null, _pts = null, _cells = null;
function mask() { if (_mask) return _mask; const bin = atob(LAND_B64), m = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) m[i] = bin.charCodeAt(i); return _mask = m; }
const isLand = (x, y) => (mask()[(y * 144 + x) >> 3] >> ((y * 144 + x) & 7)) & 1;
function landCells() { if (_cells) return _cells; const a = []; for (let y = 0; y < 72; y++)for (let x = 0; x < 144; x++)if (isLand(x, y)) a.push(x, y); return _cells = a; }
function landPts() { if (_pts) return _pts; const a = []; for (let y = 0; y < 72; y++) { const lat = (90 - (y + .5) * 2.5) * PI / 180, n = Math.max(1, Math.round(144 * Math.cos(lat))); for (let i = 0; i < n; i++) { const lon = -180 + (i + .5) * 360 / n, mx = Math.min(143, Math.floor((lon + 180) / 2.5)); if (isLand(mx, y)) { const lr = lon * PI / 180; a.push(Math.cos(lat) * Math.sin(lr), Math.sin(lat), Math.cos(lat) * Math.cos(lr)); } } } return _pts = new Float32Array(a); }
const CITY = [[40.7, -74], [51.5, -.1], [50.1, 8.7], [25.2, 55.3], [1.35, 103.8], [35.7, 139.7], [-23.5, -46.6], [-33.9, 151.2], [34, -118.2], [19, 72.8], [30, 31.2], [-1.3, 36.8], [39.9, 116.4], [28.6, 77.2]];
const llv = (lat, lon) => { const a = lat * PI / 180, o = lon * PI / 180; return [Math.cos(a) * Math.sin(o), Math.sin(a), Math.cos(a) * Math.cos(o)]; };
function rotv(v, yaw, tilt) { const x1 = v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw), z1 = -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw), y2 = v[1] * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = v[1] * Math.sin(tilt) + z1 * Math.cos(tilt); return [x1, y2, z2]; }
const mapXY = (lat, lon, x, y, w, h) => [x + (lon + 180) / 360 * w, y + (90 - lat) / 180 * h];

/* ---------- Иконки (линейные, вписаны в ±1) ---------- */
Object.assign(ICON, {
  newspaper(c) { rr(c, -.88, -.72, 1.76, 1.44, .1); c.stroke(); rr(c, -.66, -.5, .6, .5, .05); c.stroke(); c.beginPath(); c.moveTo(.12, -.42); c.lineTo(.64, -.42); c.moveTo(.12, -.14); c.lineTo(.64, -.14); c.moveTo(-.66, .22); c.lineTo(.64, .22); c.moveTo(-.66, .48); c.lineTo(.3, .48); c.stroke(); },
  mic(c) { rr(c, -.3, -.9, .6, 1.05, .3); c.stroke(); c.beginPath(); c.arc(0, .12, .52, 0, PI); c.stroke(); c.beginPath(); c.moveTo(0, .64); c.lineTo(0, .92); c.moveTo(-.32, .92); c.lineTo(.32, .92); c.stroke(); },
  camera(c) { rr(c, -.88, -.4, 1.22, .92, .12); c.stroke(); c.beginPath(); c.moveTo(.34, -.12); c.lineTo(.88, -.42); c.lineTo(.88, .52); c.lineTo(.34, .22); c.stroke(); c.beginPath(); c.arc(-.27, .06, .27, 0, TAU); c.stroke(); rr(c, -.62, -.66, .46, .26, .06); c.stroke(); },
  bell(c) { c.beginPath(); c.moveTo(-.62, .42); c.lineTo(-.52, -.08); c.arc(0, -.08, .52, PI, 0); c.lineTo(.62, .42); c.closePath(); c.stroke(); c.beginPath(); c.arc(0, .6, .14, 0, PI); c.stroke(); c.beginPath(); c.arc(0, -.72, .08, 0, TAU); c.fill(); },
  tv(c) { rr(c, -.88, -.62, 1.76, 1.1, .1); c.stroke(); c.beginPath(); c.moveTo(-.4, .86); c.lineTo(.4, .86); c.moveTo(0, .48); c.lineTo(0, .86); c.stroke(); },
  globe(c) { c.beginPath(); c.arc(0, 0, .8, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(0, 0, .34, .8, 0, 0, TAU); c.stroke(); [-.4, 0, .4].forEach(y => { const h = Math.sqrt(.64 - y * y); c.beginPath(); c.moveTo(-h, y); c.lineTo(h, y); c.stroke(); }); },
  pin(c) { c.beginPath(); c.moveTo(0, .92); c.bezierCurveTo(-.15, .55, -.62, .12, -.62, -.3); c.arc(0, -.3, .62, PI, 0); c.bezierCurveTo(.62, .12, .15, .55, 0, .92); c.closePath(); c.stroke(); c.beginPath(); c.arc(0, -.3, .22, 0, TAU); c.stroke(); },
  clock(c) { c.beginPath(); c.arc(0, 0, .8, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(0, -.5); c.lineTo(0, 0); c.lineTo(.36, .22); c.stroke(); },
  search(c) { c.beginPath(); c.arc(-.15, -.15, .52, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(.24, .24); c.lineTo(.8, .8); c.stroke(); },
  check(c) { c.beginPath(); c.moveTo(-.6, .05); c.lineTo(-.2, .45); c.lineTo(.6, -.4); c.stroke(); },
  cross(c) { c.beginPath(); c.moveTo(-.55, -.55); c.lineTo(.55, .55); c.moveTo(.55, -.55); c.lineTo(-.55, .55); c.stroke(); },
  share(c) { [[.55, -.5], [-.55, 0], [.55, .5]].forEach(p => { c.beginPath(); c.arc(p[0], p[1], .2, 0, TAU); c.stroke(); }); c.beginPath(); c.moveTo(-.38, -.1); c.lineTo(.38, -.4); c.moveTo(-.38, .1); c.lineTo(.38, .4); c.stroke(); },
  flame(c) { c.beginPath(); c.moveTo(0, -.92); c.bezierCurveTo(.2, -.5, .72, -.2, .62, .35); c.bezierCurveTo(.55, .78, .2, .9, 0, .9); c.bezierCurveTo(-.2, .9, -.6, .78, -.62, .35); c.bezierCurveTo(-.64, .05, -.35, -.05, -.3, -.4); c.bezierCurveTo(-.15, -.25, -.05, -.4, 0, -.92); c.closePath(); c.stroke(); },
  chat(c) { rr(c, -.85, -.65, 1.7, 1.1, .22); c.stroke(); c.beginPath(); c.moveTo(-.4, .45); c.lineTo(-.45, .85); c.lineTo(.0, .45); c.stroke(); c.beginPath(); c.moveTo(-.5, -.3); c.lineTo(.5, -.3); c.moveTo(-.5, .0); c.lineTo(.2, .0); c.stroke(); },
  rss(c) { c.beginPath(); c.arc(-.55, .55, .1, 0, TAU); c.fill(); c.beginPath(); c.arc(-.55, .55, .6, -PI / 2, 0); c.stroke(); c.beginPath(); c.arc(-.55, .55, 1.1, -PI / 2, 0); c.stroke(); },
  bolt(c) { c.beginPath(); c.moveTo(.18, -.9); c.lineTo(-.5, .12); c.lineTo(-.04, .12); c.lineTo(-.18, .9); c.lineTo(.5, -.18); c.lineTo(.04, -.18); c.closePath(); c.stroke(); },
  doc(c) { rr(c, -.62, -.9, 1.24, 1.8, .1); c.stroke(); c.beginPath(); c.moveTo(-.34, -.46); c.lineTo(.34, -.46); c.moveTo(-.34, -.06); c.lineTo(.34, -.06); c.moveTo(-.34, .34); c.lineTo(.1, .34); c.stroke(); },
  people(c) { [[0, -.35, .3], [-.62, -.12, .22], [.62, -.12, .22]].forEach(p => { c.beginPath(); c.arc(p[0], p[1], p[2], 0, TAU); c.stroke(); c.beginPath(); c.arc(p[0], p[1] + p[2] * 3.1, p[2] * 1.8, PI * 1.12, PI * 1.88); c.stroke(); }); },
  heart(c) { c.beginPath(); c.moveTo(0, .8); c.bezierCurveTo(-1.2, -.1, -.7, -.9, 0, -.35); c.bezierCurveTo(.7, -.9, 1.2, -.1, 0, .8); c.closePath(); c.stroke(); }
});

/* ---------- Прямой эфир: студия, ведущий, плашки ---------- */
reg('nws_live', 'Прямой эфир · студия', 'scene', 1.6, (g, t) => {
  const c = g.c, k = g.k, W = 1.5, H = .98, blink = Math.sin(t * 5) > 0;
  rr(c, -W, -H, W * 2, H * 1.78, .1); c.fillStyle = '#05080c'; c.fill(); c.lineWidth = .04; c.strokeStyle = rgba(k.f, .55); c.stroke();
  c.save(); rr(c, -W + .05, -H + .05, W * 2 - .1, H * 1.78 - .1, .07); c.clip(); const bg = c.createLinearGradient(0, -H, 0, .8); bg.addColorStop(0, mix('#101c28', k.s, .22)); bg.addColorStop(1, '#070b10'); c.fillStyle = bg; c.fillRect(-W, -H, W * 2, H * 2);
  rr(c, .35, -.8, 1.0, .72, .06); c.fillStyle = rgba(k.s, .14); c.fill(); c.lineWidth = .02; c.strokeStyle = rgba(k.s, .55); c.stroke(); c.save(); c.translate(.85, -.44); c.rotate(t * .4); c.strokeStyle = k.s; c.lineWidth = .028; c.beginPath(); c.arc(0, 0, .22, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(0, 0, .09, .22, 0, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-.22, 0); c.lineTo(.22, 0); c.stroke(); c.restore();
  person(c, -.55, -.38, .26, rgba(k.f, .82)); rr(c, -1.45, .05, 1.9, .26, .05); const dg = c.createLinearGradient(0, .15, 0, .43); dg.addColorStop(0, rgba(k.s, .55)); dg.addColorStop(1, rgba(k.s, .18)); c.fillStyle = dg; c.fill();
  const sl = eo3(clamp((t % 8 - .6) / .6, 0, 1)); c.save(); c.translate(-(1 - sl) * 2, 0); rr(c, -1.3, .36, 1.35, .17, .02); c.fillStyle = k.s; c.fill(); rr(c, .05, .36, 1.3, .17, .02); c.fillStyle = rgba(k.f, .9); c.fill(); txt(g, 'ВЕДУЩИЙ', -1.22, .445, .1, k.b, { al: 'left', w: 900 }); txt(g, 'Прямой эфир из студии', .12, .445, .095, k.b, { al: 'left', w: 700 }); c.restore();
  c.fillStyle = rgba(k.f, .12); c.fillRect(-W, .58, W * 2, .15); c.save(); c.beginPath(); c.rect(-W, .58, W * 2, .15); c.clip(); txt(g, 'ПОСЛЕДНИЕ НОВОСТИ  •  ГЛАВНОЕ ЗА ДЕНЬ  •  ПОСЛЕДНИЕ НОВОСТИ  •  ГЛАВНОЕ ЗА ДЕНЬ  •  ', 1.6 - ((t * .5) % 4.2), .655, .09, rgba(k.f, .85), { al: 'left', w: 700 }); c.restore();
  c.restore();
  rr(c, -W + .12, -H + .12, .5, .17, .03); c.fillStyle = RED; c.fill(); c.beginPath(); c.arc(-W + .2, -H + .205, .033, 0, TAU); c.fillStyle = blink ? '#fff' : rgba('#fff', .3); c.fill(); txt(g, 'LIVE', -W + .26, -H + .21, .1, '#fff', { al: 'left', w: 900 });
  txt(g, '21:' + String(Math.floor(t / 60 % 60) + 14).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0'), W - .14, -H + .21, .1, rgba(k.f, .85), { al: 'right', mono: 1, w: 700 });
  c.beginPath(); c.moveTo(-.28, H * .8 + .0); c.lineTo(.28, H * .8); c.lineTo(.4, H * .8 + .12); c.lineTo(-.4, H * .8 + .12); c.closePath(); c.fillStyle = rgba(k.f, .4); c.fill();
});

/* ---------- Срочная новость: плашка «СРОЧНО» и бегущая строка ---------- */
reg('nws_breaking', 'Срочно · плашка новостей', 'scene', 2.6, (g, t) => {
  const c = g.c, k = g.k, T = t % 7, sl = eo3(clamp(T / .55, 0, 1)), fl = .6 + .4 * Math.abs(Math.sin(t * 6)), type = clamp((T - .8) / 2.4, 0, 1);
  c.save(); c.translate(-(1 - sl) * 3.2, 0);
  rr(c, -2.5, -.95, 5.0, 1.45, .1); c.fillStyle = 'rgba(0,0,0,.55)'; c.fill(); c.lineWidth = .03; c.strokeStyle = rgba(k.f, .35); c.stroke();
  rr(c, -2.5, -.95, 1.6, 1.45, .1); c.fillStyle = RED; c.fill(); c.fillStyle = rgba('#fff', .14 * fl); c.fillRect(-2.5, -.95, 1.6, .6); txt(g, 'СРОЧНО', -1.7, -.22, .36, '#fff', { w: 900 });
  c.save(); c.beginPath(); c.rect(-.9, -.95, 3.4, 1.45); c.clip(); txt(g, 'ГЛАВНОЕ', -.75, -.72, .12, k.a, { al: 'left', w: 900 });
  [[3.0, -.36], [2.3, .02]].forEach(([w, y], i) => { const f = clamp(type * 2 - i * .8, 0, 1); rr(c, -.75, y - .12, w * f, .24, .08); c.fillStyle = i ? rgba(k.f, .7) : k.f; c.fill(); if (f > 0 && f < 1) { c.fillStyle = k.a; c.fillRect(-.75 + w * f, y - .16, .05, .32); } }); c.restore();
  c.beginPath(); c.arc(1.55, .3, .06, 0, TAU); c.fillStyle = RED; c.fill(); txt(g, 'LIVE', 1.66, .3, .14, k.f, { al: 'left', w: 900 }); icon(g, 'clock', 2.1, .3, .1, rgba(k.f, .8), .2); txt(g, '12:' + String(30 + Math.floor(t) % 30), 2.23, .3, .13, rgba(k.f, .85), { al: 'left', mono: 1, w: 700 });
  rr(c, -2.5, .62, 5.0, .4, .06); c.fillStyle = rgba(k.f, .14); c.fill(); c.save(); c.beginPath(); c.rect(-2.5, .62, 5.0, .4); c.clip(); txt(g, 'ОБНОВЛЕНО ТОЛЬКО ЧТО  ●  ЛЕНТА НОВОСТЕЙ  ●  ПОДРОБНОСТИ В ЭФИРЕ  ●  ОБНОВЛЕНО ТОЛЬКО ЧТО  ●  ЛЕНТА НОВОСТЕЙ  ●  ', 2.4 - ((t * .55) % 6.2), .83, .2, k.f, { al: 'left', w: 700 }); c.restore();
  c.restore();
});

/* ---------- Газета: шапка, заголовок, фото, колонки, штамп ---------- */
reg('nws_newspaper', 'Газета · первая полоса', 'scene', .88, (g, t) => {
  const c = g.c, k = g.k, T = t % 8, fl = Math.sin(t * 1.3) * .012, hd = clamp((T - .4) / 1.8, 0, 1), ph = clamp((T - 1.2) / 1.2, 0, 1), col = clamp((T - 2.0) / 1.6, 0, 1), st = eback((T - 4.6) / .35);
  c.save(); c.rotate(fl); gl(g, rgba(k.a, .22), .12); rr(c, -.82, -.97, 1.64, 1.94, .05); c.fillStyle = k.f; c.fill(); ng(g); c.lineWidth = .025; c.strokeStyle = rgba(k.a, .8); c.stroke();
  txt(g, 'ВЕСТНИК', 0, -.82, .2, k.b, { w: 900 }); c.fillStyle = k.b; c.fillRect(-.7, -.71, 1.4, .025); c.fillRect(-.7, -.675, 1.4, .012); txt(g, 'ВЫПУСК · ГЛАВНОЕ', 0, -.58, .07, rgba(k.b, .6), { w: 700 });
  [[1.3, -.4], [1.0, -.25]].forEach(([w, y], i) => { const f = clamp(hd * 2 - i * .9, 0, 1); rr(c, -.7, y - .06, w * f, .12, .03); c.fillStyle = k.b; c.fill(); });
  c.save(); rr(c, -.7, -.12, .78, .52, .03); c.clip(); const pg = c.createLinearGradient(0, -.12, 0, .4); pg.addColorStop(0, mix(k.a, k.f, .3)); pg.addColorStop(1, mix(k.a, k.b, .35)); c.globalAlpha = ph; c.fillStyle = pg; c.fillRect(-.7, -.12, .78, .52); c.fillStyle = rgba(k.b, .4); c.beginPath(); c.moveTo(-.7, .4); c.lineTo(-.45, .12); c.lineTo(-.28, .26); c.lineTo(-.05, 0); c.lineTo(.08, .4); c.closePath(); c.fill(); c.beginPath(); c.arc(-.5, .0, .07, 0, TAU); c.fillStyle = rgba(k.f, .8); c.fill(); const sx = -.8 + ((t * .5) % 1.8); const sw = c.createLinearGradient(sx - .1, 0, sx + .1, 0); sw.addColorStop(0, 'rgba(255,255,255,0)'); sw.addColorStop(.5, 'rgba(255,255,255,.4)'); sw.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sw; c.fillRect(-.7, -.12, .78, .52); c.restore();
  for (let i = 0; i < 5; i++) { const f = clamp(col * 5 - i * .8, 0, 1); c.fillStyle = rgba(k.b, .55); c.fillRect(.14, -.08 + i * .1, .56 * f, .035); }
  for (let i = 0; i < 4; i++) { const f = clamp(col * 4 - i * .6, 0, 1); c.fillStyle = rgba(k.b, .4); c.fillRect(-.7, .5 + i * .1, 1.4 * f * (i === 3 ? .6 : 1), .035); }
  if (T > 4.6) { const s = clamp(st, 0, 1.2); c.save(); c.translate(.38, .1); c.rotate(-.2); c.scale(1.6 - .6 * Math.min(1, s), 1.6 - .6 * Math.min(1, s)); c.globalAlpha = clamp((T - 4.6) / .15, 0, 1); c.lineWidth = .045; c.strokeStyle = RED; rr(c, -.4, -.14, .8, .28, .05); c.stroke(); txt(g, 'ЭКСТРА', 0, 0, .17, RED, { w: 900 }); c.restore(); }
  c.restore();
});

/* ---------- Мир новостей: глобус с вспышками событий ---------- */
reg('nws_world', 'Мир новостей · глобус', 'scene', 1.1, (g, t) => {
  const c = g.c, k = g.k, R = .86, yaw = t * .3 - 1.2, tilt = .35, P = landPts(), TAGS = ['СРОЧНО', 'ЛАЙВ', 'ВИДЕО', 'ЭКСКЛЮЗИВ'];
  const gg = c.createRadialGradient(-R * .3, -R * .35, R * .1, 0, 0, R); gg.addColorStop(0, rgba(mix(k.b, k.f, .22), 1)); gg.addColorStop(1, rgba(mix(k.b, k.f, .04), 1)); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fillStyle = gg; c.fill(); gl(g, rgba(k.a, .45), .15); c.lineWidth = .025; c.strokeStyle = rgba(k.a, .85); c.stroke(); ng(g);
  const bk = [[], [], []]; for (let i = 0; i < P.length; i += 3) { const p = rotv([P[i], P[i + 1], P[i + 2]], yaw, tilt); if (p[2] <= 0) continue; bk[p[2] < .35 ? 0 : p[2] < .7 ? 1 : 2].push(p[0] * R, -p[1] * R, p[2]); }
  [.28, .6, .95].forEach((al, b) => { c.fillStyle = rgba(k.a, al); c.beginPath(); const a = bk[b]; for (let i = 0; i < a.length; i += 3) { const s = .02 * (.7 + .5 * a[i + 2]); c.rect(a[i] - s / 2, a[i + 1] - s / 2, s, s); } c.fill(); });
  const seg = Math.floor(t / 1.1), ci = (seg * 5) % CITY.length;
  CITY.forEach((ct, i) => { const p = rotv(llv(ct[0], ct[1]), yaw, tilt); if (p[2] < .05) return; const x = p[0] * R, y = -p[1] * R, ph = ((t * .6 + i * .27) % 1), a = clamp(p[2] * 1.6, 0, 1); c.strokeStyle = rgba(k.a, (1 - ph) * .8 * a); c.lineWidth = .02; c.beginPath(); c.arc(x, y, .03 + ph * .12, 0, TAU); c.stroke(); c.fillStyle = rgba(i === ci ? RED : k.f, a); c.beginPath(); c.arc(x, y, i === ci ? .045 : .028, 0, TAU); c.fill(); });
  const p = rotv(llv(CITY[ci][0], CITY[ci][1]), yaw, tilt), q = clamp((t % 1.1) / .25, 0, 1) * (1 - clamp(((t % 1.1) - .85) / .25, 0, 1));
  if (p[2] > .15 && q > .01) { const x = p[0] * R, y = -p[1] * R; c.save(); c.globalAlpha = q; c.strokeStyle = rgba(k.f, .8); c.lineWidth = .02; c.beginPath(); c.moveTo(x, y); c.lineTo(x + .18, y - .22); c.stroke(); pill(g, TAGS[seg % 4], x + .18 + (TAGS[seg % 4].length * .035), y - .24, .09, '#fff', seg % 4 === 0 ? RED : rgba(k.b, .8), { line: seg % 4 === 0 ? undefined : k.a }); c.restore(); }
});

/* ---------- Репортёрский микрофон ---------- */
reg('nws_mic', 'Репортёрский микрофон', 'object', .95, (g, t) => {
  const c = g.c, k = g.k, pu = .5 + .5 * Math.sin(t * 6);
  for (let i = 0; i < 3; i++) { const q = (t * .8 + i / 3) % 1; [-1, 1].forEach(sd => { c.strokeStyle = rgba(k.a, (1 - q) * .7); c.lineWidth = .04; c.beginPath(); c.arc(0, -.45, .5 + q * .32, sd > 0 ? -PI * .32 : PI * .68, sd > 0 ? PI * .32 : PI * 1.32); c.stroke(); }); }
  const hg = c.createLinearGradient(-.2, 0, .2, 0); hg.addColorStop(0, rgba(k.f, .3)); hg.addColorStop(.5, rgba(k.f, .8)); hg.addColorStop(1, rgba(k.f, .25)); rr(c, -.14, -.05, .28, 1.0, .1); c.fillStyle = hg; c.fill(); rr(c, -.16, .18, .32, .2, .05); c.fillStyle = k.a; c.fill(); txt(g, 'NEWS', 0, .285, .09, k.b, { w: 900 });
  const sg = c.createRadialGradient(-.12, -.62, .02, 0, -.45, .42); sg.addColorStop(0, mix(k.f, k.a, .1)); sg.addColorStop(1, mix(k.b, k.f, .45)); gl(g, rgba(k.a, .35), .12); c.beginPath(); c.arc(0, -.45, .4, 0, TAU); c.fillStyle = sg; c.fill(); ng(g); c.lineWidth = .02; c.strokeStyle = rgba(k.f, .5); for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(0, -.45, .4, 0, TAU); c.save(); c.clip(); c.beginPath(); c.moveTo(i * .16 - .4, -.9); c.lineTo(i * .16 + .4, -.0); c.strokeStyle = rgba(k.b, .18); c.lineWidth = .03; c.stroke(); c.restore(); }
  c.beginPath(); c.arc(.62, .78, .05, 0, TAU); c.fillStyle = RED; c.fill(); if (pu > .5) { c.beginPath(); c.arc(.62, .78, .09, 0, TAU); c.strokeStyle = rgba(RED, .5); c.lineWidth = .02; c.stroke(); } txt(g, 'REC', .75, .78, .1, k.f, { al: 'left', w: 900 });
  for (let i = 0; i < 9; i++) { const h = .06 + .2 * Math.abs(Math.sin(t * 7 + i * 1.7)) * (.5 + .5 * Math.sin(t * 2 + i)); rr(c, -.8 + i * .09, .95 - h, .055, h, .02); c.fillStyle = i > 6 ? RED : k.a; c.fill(); }
});

/* ---------- Телекамера на штативе ---------- */
reg('nws_camera', 'Телекамера', 'object', 1.35, (g, t) => {
  const c = g.c, k = g.k, tally = Math.sin(t * 4) > -.2, ir = .55 + .25 * Math.sin(t * 1.4);
  c.strokeStyle = rgba(k.f, .7); c.lineWidth = .06; c.beginPath(); c.moveTo(-.05, .5); c.lineTo(-.55, .98); c.moveTo(.0, .5); c.lineTo(0, .98); c.moveTo(.05, .5); c.lineTo(.55, .98); c.stroke(); rr(c, -.12, .38, .24, .16, .04); c.fillStyle = k.a; c.fill();
  rr(c, -.85, -.5, 1.35, .9, .1); const bg = c.createLinearGradient(0, -.5, 0, .4); bg.addColorStop(0, mix(k.b, k.f, .28)); bg.addColorStop(1, mix(k.b, k.f, .1)); c.fillStyle = bg; c.fill(); c.lineWidth = .035; c.strokeStyle = k.a; c.stroke();
  rr(c, -.7, -.78, .7, .26, .06); c.fillStyle = mix(k.b, k.f, .2); c.fill(); c.strokeStyle = rgba(k.a, .8); c.stroke(); rr(c, -.62, -.74, .54, .18, .04); c.fillStyle = '#05080c'; c.fill(); const vf = c.createLinearGradient(-.62, 0, -.08, 0); vf.addColorStop(0, rgba(k.s, .5)); vf.addColorStop(1, rgba(k.s, .1)); c.fillStyle = vf; c.fillRect(-.6, -.72, .5 * (.4 + .4 * Math.sin(t * 2)), .14);
  c.beginPath(); c.arc(.62, -.05, .5, 0, TAU); c.fillStyle = '#080b0f'; c.fill(); c.lineWidth = .05; c.strokeStyle = k.a; c.stroke(); [.4, .28].forEach((r, i) => { c.beginPath(); c.arc(.62, -.05, r, 0, TAU); c.strokeStyle = rgba(k.f, .3 - i * .08); c.lineWidth = .02; c.stroke(); });
  const lg = c.createRadialGradient(.55, -.12, .02, .62, -.05, .3); lg.addColorStop(0, rgba(k.s, .9)); lg.addColorStop(.6, rgba(k.s, .3)); lg.addColorStop(1, rgba('#000000', .9)); c.beginPath(); c.arc(.62, -.05, .24 * ir + .06, 0, TAU); c.fillStyle = lg; c.fill(); c.beginPath(); c.arc(.55, -.14, .05, 0, TAU); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill();
  c.beginPath(); c.arc(-.6, -.25, .06, 0, TAU); c.fillStyle = tally ? RED : rgba(RED, .25); c.fill(); if (tally) glow2(g, -.6, -.25, RED);
  txt(g, 'REC ' + String(Math.floor(t / 60 % 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0'), -.2, .22, .1, k.f, { mono: 1, w: 800 });
  [[-.78, -.86], [-.46, -.86]].forEach(() => 0);
});
function glow2(g, x, y, col) { const c = g.c, r = c.createRadialGradient(x, y, 0, x, y, .22); r.addColorStop(0, rgba(col, .6)); r.addColorStop(1, rgba(col, 0)); c.fillStyle = r; c.beginPath(); c.arc(x, y, .22, 0, TAU); c.fill(); }

/* ---------- Лента новостей: карточки, пуш, лайки ---------- */
reg('nws_feed', 'Лента новостей · карточки', 'scene', .74, (g, t) => {
  const c = g.c, k = g.k, W = .66, H = .98, off = (t * .35) % 1.0, T = t % 8, push = T < .4 ? 0 : T < .9 ? eback((T - .4) / .5) : T < 3.6 ? 1 : eo3(1 - (T - 3.6) / .4);
  rr(c, -W, -H, W * 2, H * 2, .12); c.fillStyle = '#06090d'; c.fill(); c.lineWidth = .035; c.strokeStyle = rgba(k.f, .5); c.stroke();
  c.save(); rr(c, -W + .03, -H + .03, W * 2 - .06, H * 2 - .06, .1); c.clip();
  for (let i = -1; i < 3; i++) { const y = -.92 + i * 1.0 - off + .0, n = Math.floor(t * .35) + i; c.save(); c.translate(0, y); rr(c, -.58, 0, 1.16, .9, .07); c.fillStyle = rgba(k.f, .07); c.fill(); c.strokeStyle = rgba(k.f, .16); c.lineWidth = .015; c.stroke();
    const ig = c.createLinearGradient(-.58, 0, .58, .4); ig.addColorStop(0, mix(k.s, k.b, .5 - hr(n, 1) * .3)); ig.addColorStop(1, mix(k.s, k.b, .8)); rr(c, -.52, .06, 1.04, .38, .05); c.fillStyle = ig; c.fill(); c.fillStyle = rgba(k.f, .3); c.beginPath(); c.moveTo(-.52, .44); c.lineTo(-.2, .22 + hr(n, 2) * .08); c.lineTo(.05, .36); c.lineTo(.3, .18); c.lineTo(.52, .44); c.closePath(); c.fill();
    c.fillStyle = k.f; rr(c, -.52, .5, .98 - hr(n, 3) * .25, .07, .03); c.fill(); c.fillStyle = rgba(k.f, .6); rr(c, -.52, .62, .7, .05, .025); c.fill(); c.beginPath(); c.arc(-.46, .8, .035, 0, TAU); c.fillStyle = k.a; c.fill(); c.fillStyle = rgba(k.f, .5); c.fillRect(-.4, .785, .3, .03); icon(g, 'heart', .28, .8, .05, hr(n, 4) > .5 ? RED : rgba(k.f, .7), .25); icon(g, 'share', .46, .8, .05, rgba(k.f, .7), .25); c.restore(); }
  c.restore();
  if (push > .01) { c.save(); c.translate(0, -H + .2 - (1 - push) * .5); c.globalAlpha = clamp(push, 0, 1); rr(c, -.58, -.12, 1.16, .3, .08); c.fillStyle = 'rgba(15,20,28,.96)'; c.fill(); c.lineWidth = .02; c.strokeStyle = k.a; c.stroke(); c.beginPath(); c.arc(-.46, .03, .07, 0, TAU); c.fillStyle = RED; c.fill(); icon(g, 'bell', -.46, .03, .045, '#fff', .25); txt(g, 'СРОЧНО', -.34, -.04, .065, RED, { al: 'left', w: 900 }); c.fillStyle = rgba(k.f, .85); c.fillRect(-.34, .04, .72, .035); c.fillStyle = rgba(k.f, .5); c.fillRect(-.34, .1, .5, .03); c.restore(); }
});

/* ---------- Проверка фактов: утверждение, лупа, вердикт ---------- */
reg('nws_factcheck', 'Проверка фактов', 'scene', 1.5, (g, t) => {
  const c = g.c, k = g.k, P = 9, T = t % P, V = [['ПРАВДА', k.a, 'check'], ['ЛОЖЬ', RED, 'cross'], ['НЕТОЧНО', AMBER, null]][Math.floor(t / P) % 3], scan = clamp((T - .5) / 3, 0, 1), vd = eback((T - 4.2) / .4);
  rr(c, -1.3, -.85, 1.75, 1.2, .1); c.fillStyle = rgba(k.f, .09); c.fill(); c.lineWidth = .03; c.strokeStyle = rgba(k.f, .4); c.stroke(); txt(g, '“', -1.14, -.58, .55, rgba(k.a, .9), { w: 900 }); txt(g, 'УТВЕРЖДЕНИЕ', -.7, -.7, .09, rgba(k.f, .6), { al: 'left', w: 800 });
  [[1.3, -.4], [1.55, -.2], [.95, 0], [1.4, .2]].forEach(([w, y], i) => { const hot = Math.abs(scan * 1.1 - 0.05 - (i * .25 + .12)) < .14 && T > .5 && T < 4; rr(c, -1.12, y - .045, w * .88, .09, .045); c.fillStyle = hot ? k.a : rgba(k.f, .5); c.fill(); });
  if (T > .5 && T < 4.1) { const x = -1.0 + scan * 1.5, y = -.4 + Math.sin(scan * 9) * .06 + scan * .5; c.save(); c.translate(x, y); c.strokeStyle = k.a; c.lineWidth = .06; c.beginPath(); c.arc(0, 0, .22, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(.16, .16); c.lineTo(.4, .4); c.stroke(); c.fillStyle = rgba(k.a, .15); c.beginPath(); c.arc(0, 0, .22, 0, TAU); c.fill(); c.restore(); }
  ['Источник 1', 'Источник 2', 'Источник 3'].forEach((s, i) => { const y = -.7 + i * .5, f = clamp((T - 1.2 - i * .9) / .4, 0, 1), ok = V[0] === 'ПРАВДА' ? true : V[0] === 'ЛОЖЬ' ? false : i !== 1; rr(c, .6, y - .17, .86, .34, .08); c.fillStyle = rgba(k.f, .08); c.fill(); c.lineWidth = .02; c.strokeStyle = rgba(k.f, .3); c.stroke(); txt(g, s, .67, y, .07, rgba(k.f, .75), { al: 'left', w: 700 }); if (f > 0) { c.beginPath(); c.arc(1.33, y, .09 * f, 0, TAU); c.fillStyle = ok ? k.a : RED; c.fill(); icon(g, ok ? 'check' : 'cross', 1.33, y, .055 * f, k.b, .28); } });
  if (T > 4.2) { const s = clamp(vd, 0, 1.2); c.save(); c.translate(-.2, .62); c.rotate(-.1); c.scale(1.7 - .7 * Math.min(1, s), 1.7 - .7 * Math.min(1, s)); c.globalAlpha = clamp((T - 4.2) / .12, 0, 1); c.lineWidth = .06; c.strokeStyle = V[1]; rr(c, -.72, -.22, 1.44, .44, .07); c.stroke(); c.fillStyle = rgba(V[1], .16); c.fill(); txt(g, V[0], V[2] ? .12 : 0, 0, .26, V[1], { w: 900 }); if (V[2]) icon(g, V[2], -.52, 0, .14, V[1], .3); c.restore(); }
});

/* ---------- Тренд: график всплеска, хэштеги, просмотры ---------- */
reg('nws_trending', 'Тренд · всплеск интереса', 'chart', 1.55, (g, t) => {
  const c = g.c, k = g.k, T = t % 7, p = eo3(clamp((T - .3) / 3.6, 0, 1)), n = 40, X0 = -1.35, X1 = 1.35, base = .6, f = i => { const u = i / n; return base - (.12 + .1 * Math.sin(u * 9 + 1) * .5 + Math.pow(Math.max(0, u - .55) / .45, 2.2) * .78 + u * .08); };
  c.strokeStyle = rgba(k.f, .12); c.lineWidth = .015; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(X0, -.7 + i * .32); c.lineTo(X1, -.7 + i * .32); c.stroke(); }
  c.beginPath(); const m = Math.floor(n * p); for (let i = 0; i <= m; i++) { const x = lerp(X0, X1, i / n), y = f(i); i ? c.lineTo(x, y) : c.moveTo(x, y); } const ex = lerp(X0, X1, m / n), ey = f(m); c.lineWidth = .06; c.strokeStyle = k.a; gl(g, rgba(k.a, .7), .12); c.stroke(); ng(g); c.lineTo(ex, base + .1); c.lineTo(X0, base + .1); c.closePath(); const ag = c.createLinearGradient(0, -.7, 0, base); ag.addColorStop(0, rgba(k.a, .35)); ag.addColorStop(1, rgba(k.a, 0)); c.fillStyle = ag; c.fill();
  c.beginPath(); c.arc(ex, ey, .07, 0, TAU); c.fillStyle = k.f; c.fill(); const pu = (t * 1.4) % 1; c.strokeStyle = rgba(k.a, 1 - pu); c.lineWidth = .025; c.beginPath(); c.arc(ex, ey, .07 + pu * .2, 0, TAU); c.stroke();
  icon(g, 'flame', ex, ey - .24 + Math.sin(t * 8) * .01, .13, RED, .2); const views = Math.round(40 + p * p * 1160); txt(g, views + 'K', -1.3, -.86, .22, k.f, { al: 'left', mono: 1, w: 800 }); txt(g, 'просмотров', -1.3 + String(views).length * .13 + .5, -.84, .09, rgba(k.f, .6), { al: 'left', w: 700 });
  ['#срочно', '#новости', '#тренд'].forEach((h, i) => { const q = ((t * .28 + i / 3) % 1), x = -.5 + i * .65, y = .95 - q * 1.0; c.save(); c.globalAlpha = Math.sin(q * PI); pill(g, h, x, y, .085, k.b, rgba(k.f, .85)); c.restore(); });
});

/* ---------- Хронология: события по часам ---------- */
reg('nws_timeline', 'Хронология событий', 'scene', 2.5, (g, t) => {
  const c = g.c, k = g.k, E = ['09:40', '11:15', '13:02', '14:30', '16:05'], n = E.length, xs = E.map((_, i) => -1.95 + i * 1.95 / 2 * 1.0), T = t % 9, pr = clamp((T - .3) / 5.5, 0, 1) * (n - 1);
  c.lineCap = 'round'; c.lineWidth = .06; c.strokeStyle = rgba(k.f, .16); c.beginPath(); c.moveTo(xs[0], 0); c.lineTo(xs[n - 1], 0); c.stroke(); gl(g, rgba(k.a, .6), .1); c.strokeStyle = k.a; c.beginPath(); c.moveTo(xs[0], 0); c.lineTo(xs[0] + pr * 1.95 / 2, 0); c.stroke(); ng(g);
  E.forEach((e, i) => { const on = pr >= i - .01, last = Math.floor(pr + .01) === i && T < 7, up = i % 2 === 0, r = last ? .17 + .02 * Math.sin(t * 6) : .12; if (last) gl(g, rgba(RED, .8), .2); c.beginPath(); c.arc(xs[i], 0, r, 0, TAU); c.fillStyle = on ? (last ? RED : k.a) : k.b; c.fill(); c.lineWidth = .04; c.strokeStyle = on ? (last ? RED : k.a) : rgba(k.f, .4); c.stroke(); ng(g);
    const a = clamp((pr - i + .3) * 2, 0, 1); c.save(); c.globalAlpha = a; txt(g, e, xs[i], up ? -.42 : .5, .15, last ? RED : k.f, { mono: 1, w: 800 }); c.fillStyle = rgba(k.f, .7); const y0 = up ? -.72 : .76; rr(c, xs[i] - .4, y0 - .04, .8 - (i % 2) * .15, .08, .04); c.fill(); rr(c, xs[i] - .4, y0 + .1, .55, .06, .03); c.fillStyle = rgba(k.f, .4); c.fill(); c.restore(); });
  const bl = Math.sin(t * 4) > 0; pill(g, 'ОБНОВЛЯЕТСЯ', 1.75, -.82, .085, '#fff', RED); c.beginPath(); c.arc(1.27, -.82, .035, 0, TAU); c.fillStyle = bl ? '#fff' : rgba('#fff', .3); c.fill();
});

/* ---------- Пресс-конференция: подиум, микрофоны, вспышки ---------- */
reg('nws_press', 'Пресс-конференция', 'scene', 1.6, (g, t) => {
  const c = g.c, k = g.k, flashes = []; for (let i = 0; i < 14; i++) { const ph = (t * 1.9 + hr(i, 7) * 5) % 5; if (ph < .12) flashes.push([-1.35 + hr(i, 1) * 2.7, .62 + hr(i, 2) * .22, 1 - ph / .12]); }
  rr(c, -.95, -.95, 1.9, .95, .06); c.fillStyle = rgba(k.f, .07); c.fill(); c.lineWidth = .02; c.strokeStyle = rgba(k.f, .3); c.stroke(); for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { rr(c, -.84 + i * .3, -.84 + j * .4, .22, .3, .03); c.fillStyle = rgba(k.a, .1 + .12 * ((i + j) % 2)); c.fill(); }
  person(c, 0, -.33, .2, rgba(k.f, .85)); c.beginPath(); c.moveTo(-.55, .28); c.lineTo(-.42, -.02); c.lineTo(.42, -.02); c.lineTo(.55, .28); c.closePath(); const pg = c.createLinearGradient(0, -.02, 0, .28); pg.addColorStop(0, rgba(k.a, .55)); pg.addColorStop(1, rgba(k.a, .2)); c.fillStyle = pg; c.fill(); c.lineWidth = .035; c.strokeStyle = k.a; c.stroke();
  [-.28, 0, .28].forEach((x, i) => { c.strokeStyle = rgba(k.f, .75); c.lineWidth = .02; c.beginPath(); c.moveTo(x, -.02); c.lineTo(x, -.14); c.stroke(); rr(c, x - .035, -.22, .07, .1, .03); c.fillStyle = [k.a, k.f, RED][i]; c.fill(); });
  for (let r = 0; r < 2; r++) for (let i = 0; i < 10; i++) { const x = -1.4 + i * .31 + (r ? .15 : 0), y = .62 + r * .26, b = Math.sin(t * 2 + i + r) * .012, up = hr(i, r + 3) > .6; person(c, x, y + b, .1 + r * .02, rgba(k.f, .3 + r * .25)); if (up) { c.fillStyle = rgba(k.f, .8); c.strokeStyle = rgba(k.f, .8); c.lineWidth = .02; c.beginPath(); c.moveTo(x + .06, y + b + .12); c.lineTo(x + .1, y + b - .12 + Math.sin(t * 3 + i) * .02); c.stroke(); rr(c, x + .06, y + b - .2 + Math.sin(t * 3 + i) * .02, .1, .08, .015); c.fill(); } }
  flashes.forEach(f => { const r = .5 * (1 - f[2] * .4); const gg = c.createRadialGradient(f[0], f[1], 0, f[0], f[1], r); gg.addColorStop(0, rgba('#ffffff', .95 * f[2])); gg.addColorStop(1, rgba('#ffffff', 0)); c.fillStyle = gg; c.beginPath(); c.arc(f[0], f[1], r, 0, TAU); c.fill(); });
});

/* ---------- Путь новости: от события до зрителя ---------- */
reg('nws_pipeline', 'Путь новости', 'scene', 2.55, (g, t) => {
  const c = g.c, k = g.k, S = [['pin', 'Событие'], ['mic', 'Репортёр'], ['search', 'Проверка'], ['newspaper', 'Редактор'], ['tv', 'Эфир'], ['people', 'Вы']], n = S.length, xs = S.map((_, i) => -2.1 + i * 4.2 / (n - 1)), T = (t % 9) / 9 * (n + .5), pos = clamp(T, 0, n - 1);
  c.lineCap = 'round'; c.lineWidth = .05; c.strokeStyle = rgba(k.f, .16); c.beginPath(); c.moveTo(xs[0], 0); c.lineTo(xs[n - 1], 0); c.stroke(); gl(g, rgba(k.a, .6), .1); c.strokeStyle = k.a; c.beginPath(); c.moveTo(xs[0], 0); c.lineTo(lerp(xs[0], xs[n - 1], pos / (n - 1)), 0); c.stroke(); ng(g);
  S.forEach((s, i) => { const done = T >= i + .4 || i === 0 && T > .05, act = Math.abs(T - i) < .5 && T < n, r = .3 + (act ? .03 * Math.sin(t * 6) : 0); if (act) gl(g, rgba(k.a, .7), .2); c.beginPath(); c.arc(xs[i], 0, r, 0, TAU); c.fillStyle = done ? rgba(k.a, .9) : k.b; c.fill(); c.lineWidth = .04; c.strokeStyle = done || act ? k.a : rgba(k.f, .35); c.stroke(); ng(g); icon(g, s[0], xs[i], 0, .17, done ? k.b : act ? k.a : rgba(k.f, .6), .17); txt(g, s[1], xs[i], .56, .115, act || done ? k.f : rgba(k.f, .55), { w: 800 }); });
  const chk = Math.abs(T - 2) < .5; if (T > 2.3) { c.beginPath(); c.arc(xs[2] + .24, -.24, .09, 0, TAU); c.fillStyle = k.f; c.fill(); icon(g, 'check', xs[2] + .24, -.24, .06, k.b, .26); }
  c.save(); c.translate(lerp(xs[0], xs[n - 1], pos / (n - 1)), -.55 + Math.sin(t * 5) * .02); rr(c, -.12, -.15, .24, .3, .03); c.fillStyle = k.f; c.fill(); [0, 1, 2].forEach(r => { c.fillStyle = rgba(k.b, .5); c.fillRect(-.07, -.1 + r * .08, .14 - r * .03, .022); }); c.restore();
});

/* ---------- Уведомление: колокольчик, волны, счётчик ---------- */
reg('nws_alert', 'Уведомление о новости', 'object', 1.05, (g, t) => {
  const c = g.c, k = g.k, T = t % 3, sw = T < 1.2 ? Math.sin(T * 22) * .25 * (1 - T / 1.2) : 0, cnt = 1 + Math.floor(t / 3) % 9;
  for (let i = 0; i < 3; i++) { const q = (t * .7 + i / 3) % 1; c.strokeStyle = rgba(RED, (1 - q) * .55); c.lineWidth = .035; c.beginPath(); c.arc(0, .0, .45 + q * .5, 0, TAU); c.stroke(); }
  c.save(); c.translate(0, -.62); c.rotate(sw); c.translate(0, .62); gl(g, rgba(k.a, .5), .15); c.beginPath(); c.moveTo(-.52, .38); c.lineTo(-.44, -.1); c.arc(0, -.1, .44, PI, 0); c.lineTo(.52, .38); c.closePath(); const bg = c.createLinearGradient(-.5, -.5, .5, .4); bg.addColorStop(0, mix(k.a, k.f, .2)); bg.addColorStop(1, mix(k.a, k.b, .35)); c.fillStyle = bg; c.fill(); ng(g); c.lineWidth = .04; c.strokeStyle = k.f; c.stroke(); rr(c, -.62, .36, 1.24, .1, .05); c.fillStyle = k.a; c.fill(); c.stroke(); c.beginPath(); c.arc(0, .6 + Math.abs(sw) * .1, .12, 0, PI); c.fillStyle = k.f; c.fill(); c.beginPath(); c.arc(0, -.62, .07, 0, TAU); c.fillStyle = k.f; c.fill(); c.restore();
  c.beginPath(); c.arc(.42, -.4, .2, 0, TAU); c.fillStyle = RED; c.fill(); c.lineWidth = .04; c.strokeStyle = k.b; c.stroke(); txt(g, String(cnt), .42, -.39, .22, '#fff', { w: 900 });
  [['СРОЧНО', -.78, .82, RED], ['НОВОЕ', .8, .68, k.a]].forEach(([s, x, y, col], i) => { const q = clamp(((t + i * 1.4) % 3 - .3) / .3, 0, 1) * (1 - clamp(((t + i * 1.4) % 3 - 2.3) / .4, 0, 1)); c.save(); c.globalAlpha = q; pill(g, s, x, y - (1 - q) * .1, .1, col === RED ? '#fff' : k.b, col); c.restore(); });
});

/* ---------- Заголовок дня: печатается крупными блоками ---------- */
reg('nws_headline', 'Заголовок дня', 'scene', 2.1, (g, t) => {
  const c = g.c, k = g.k, T = t % 7, W = 2.0;
  rr(c, -W, -.78, W * 2, 1.56, .1); c.fillStyle = rgba(k.f, .08); c.fill(); c.lineWidth = .03; c.strokeStyle = rgba(k.f, .35); c.stroke();
  pill(g, 'ГЛАВНОЕ', -1.35, -.55, .1, k.b, k.a); txt(g, 'сегодня · обновлено', -.9, -.55, .09, rgba(k.f, .6), { al: 'left', w: 600 });
  const L = [[3.4, -.25], [2.6, .08]], type = clamp((T - .4) / 2.6, 0, 1);
  L.forEach(([w, y], i) => { const f = clamp(type * 2 - i, 0, 1); if (i === 1 && f > 0) { const hh = clamp((T - 2.6) / .6, 0, 1); rr(c, -1.8 + .0, y - .12, 1.4 * hh, .24, .06); c.fillStyle = rgba(k.a, .55); c.fill(); } rr(c, -1.8, y - .1, w * f, .2, .07); c.fillStyle = k.f; c.fill(); if (f > 0 && f < 1) { c.fillStyle = k.a; c.fillRect(-1.8 + w * f, y - .16, .06, .32); } });
  [.5, .68].forEach((y, i) => { const f = clamp((T - 3 - i * .3) / .6, 0, 1); rr(c, -1.8, y - .04, (i ? 1.5 : 2.1) * f, .08, .04); c.fillStyle = rgba(k.f, .45); c.fill(); });
  icon(g, 'share', 1.82, .6, .12, rgba(k.f, .75), .2); icon(g, 'heart', 1.52, .6, .12, hr(Math.floor(t / 2), 3) > .4 ? RED : rgba(k.f, .75), .2); icon(g, 'chat', 1.22, .6, .12, rgba(k.f, .75), .2);
});

/* ---------- Иконки в круглых бейджах ---------- */
const ICON_NAMES = { newspaper: 'Газета', mic: 'Микрофон', camera: 'Камера', bell: 'Колокольчик', tv: 'Телевизор', globe: 'Глобус', pin: 'Место события', clock: 'Время', search: 'Проверка', check: 'Подтверждено', cross: 'Опровергнуто', share: 'Репост', flame: 'Тренд', chat: 'Комментарии', rss: 'Лента RSS', bolt: 'Молния' };
Object.keys(ICON_NAMES).forEach(n => reg('nws_icon_' + n, 'Иконка · ' + ICON_NAMES[n], 'icon', 1, (g, t) => {
  const c = g.c, k = g.k, s = 1 + .03 * Math.sin(t * 2.4), col = (n === 'cross' || n === 'flame') ? RED : k.a;
  for (let i = 0; i < 2; i++) { const p = (t * .5 + i * .5) % 1; c.strokeStyle = rgba(col, (1 - p) * .4); c.lineWidth = .025; c.beginPath(); c.arc(0, 0, .72 + p * .22, 0, TAU); c.stroke(); }
  c.save(); c.scale(s, s); gl(g, rgba(col, .6), .22); badge(g, 0, 0, .72, col, .12); ng(g);
  c.save(); c.setLineDash([.08, .1]); c.lineDashOffset = -t * .15; c.strokeStyle = rgba(col, .35); c.lineWidth = .02; c.beginPath(); c.arc(0, 0, .86, 0, TAU); c.stroke(); c.restore();
  const a = t * .8; c.fillStyle = '#fff'; c.beginPath(); c.arc(Math.cos(a) * .86, Math.sin(a) * .86, .035, 0, TAU); c.fill(); icon(g, n, 0, 0, .4, col, .11); c.restore();
}));

/* ---------- Анимированные фоны (приглушённые, чтобы текст читался) ---------- */
CFG.BG_IDS = ['nws_ticker', 'nws_wave', 'nws_world', 'nws_studio', 'nws_columns', 'nws_pulse'];
CFG.BG_NAMES = { nws_ticker: 'Новости · Бегущие строки', nws_wave: 'Новости · Звуковая волна', nws_world: 'Новости · Карта мира', nws_studio: 'Новости · Студийный свет', nws_columns: 'Новости · Колонки газеты', nws_pulse: 'Новости · Сигнал' };
BGS.nws_ticker = (c, t, W, H, k) => { // горизонтальные ленты из блоков-«слов», едут в разные стороны
  const m = Math.min(W, H), rows = 9, rh = H / rows; for (let r = 0; r < rows; r++) { const dir = r % 2 ? 1 : -1, sp = m * (.06 + hr(r, 1) * .08), y = r * rh + rh / 2, hot = r === Math.floor(t * .7) % rows; let x = ((t * sp * dir) % (m * 2)) - m * 2; while (x < W + m) { const w = m * (.1 + hr(Math.floor(x / 37), r) * .26); c.fillStyle = rgba(hot ? k.a : k.f, hot ? .2 : .05 + hr(Math.floor(x / 37), r + 5) * .04); c.fillRect(x, y - rh * .12, w, rh * .24); x += w + m * .05; } }
};
BGS.nws_wave = (c, t, W, H, k) => { // звуковые волны и эквалайзер
  const m = Math.min(W, H); c.lineWidth = Math.max(1.5, m * .004); for (let i = 0; i < 5; i++) { c.strokeStyle = rgba(i === 2 ? k.a : k.f, i === 2 ? .3 : .08 + i * .01); c.beginPath(); for (let x = 0; x <= W; x += W / 80) { const y = H * (.35 + i * .08) + Math.sin(x / W * 9 + t * (1 + i * .3) + i) * H * .05 * (.5 + .5 * Math.sin(t * .7 + i)); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  const n = Math.round(W / (m * .045)), bw = W / n; for (let i = 0; i < n; i++) { const h = H * .18 * (.2 + .8 * Math.abs(Math.sin(t * 3 + i * .7) * Math.sin(t * 1.1 + i * .23))); c.fillStyle = rgba(i % 7 === 0 ? k.a : k.f, i % 7 === 0 ? .25 : .07); c.fillRect(i * bw + bw * .2, H - h, bw * .6, h); }
};
BGS.nws_world = (c, t, W, H, k) => { // карта мира из точек плывёт, на ней вспыхивают события
  const m = Math.min(W, H), mw = Math.max(W * 1.1, H * 1.5), mh = mw / 2, ox = -((t * mw * .015) % mw), oy = (H - mh) / 2, cw = mw / 144, cells = landCells();
  for (let rep = 0; rep < 3; rep++) { const bx = ox + rep * mw; if (bx > W || bx + mw < 0) continue; c.fillStyle = rgba(k.a, .12); c.beginPath(); const ds = cw * .55; for (let i = 0; i < cells.length; i += 2) { const x = bx + cells[i] * cw, y = oy + cells[i + 1] * cw; if (x < -cw || x > W) continue; c.rect(x + (cw - ds) / 2, y + (cw - ds) / 2, ds, ds); } c.fill();
    CITY.forEach((ct, i) => { const p = mapXY(ct[0], ct[1], bx, oy, mw, mh), ph = ((t * .5 + i * .31) % 1); if (p[0] < 0 || p[0] > W) return; c.strokeStyle = rgba(k.a, (1 - ph) * .5); c.lineWidth = Math.max(1, m * .002); c.beginPath(); c.arc(p[0], p[1], m * (.006 + ph * .03), 0, TAU); c.stroke(); c.fillStyle = rgba(k.f, .55); c.beginPath(); c.arc(p[0], p[1], m * .005, 0, TAU); c.fill(); }); }
};
BGS.nws_studio = (c, t, W, H, k) => { // студийные лучи и боке
  const m = Math.min(W, H); c.save(); c.globalCompositeOperation = 'lighter'; [[0, 0, 1], [W, 0, -1]].forEach(([bx, by, sd], i) => { const ang = .35 + .2 * Math.sin(t * .5 + i * 2), tx = bx + sd * Math.sin(ang) * H, g = c.createLinearGradient(bx, by, tx, H); g.addColorStop(0, rgba(i ? k.a : k.f, .16)); g.addColorStop(1, rgba(i ? k.a : k.f, 0)); c.fillStyle = g; c.beginPath(); c.moveTo(bx, by); c.lineTo(tx + m * .25, H); c.lineTo(tx - m * .25, H); c.closePath(); c.fill(); });
  for (let i = 0; i < 14; i++) { const x = hr(i, 1) * W, y = ((hr(i, 2) * H - t * m * (.01 + hr(i, 3) * .02)) % H + H) % H, r = m * (.02 + hr(i, 4) * .05), g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(i % 3 ? k.f : k.a, .09)); g.addColorStop(1, rgba(k.f, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } c.restore();
};
BGS.nws_columns = (c, t, W, H, k) => { // колонки газетного текста плывут вверх
  const m = Math.min(W, H), cols = Math.max(3, Math.round(W / (m * .26))), cw = W / cols; for (let i = 0; i < cols; i++) { const sp = m * (.02 + hr(i, 1) * .03) * (i % 2 ? 1 : -1), off = (t * sp) % (m * .12), x0 = i * cw + cw * .1; for (let y = -m * .12; y < H + m * .12; y += m * .045) { const j = Math.floor((y - (t * sp - off)) / (m * .045)), w = cw * .8 * (.55 + hr(j, i + 3) * .45), yy = y + off, head = hr(j, i + 9) > .93; c.fillStyle = rgba(head ? k.a : k.f, head ? .18 : .045); c.fillRect(x0, yy, head ? cw * .5 : w, head ? m * .012 : m * .008); } }
};
BGS.nws_pulse = (c, t, W, H, k) => { // сигнал расходится кругами из нескольких точек
  const m = Math.min(W, H); [[.2, .25], [.78, .3], [.5, .72], [.15, .8], [.85, .85]].forEach((p, i) => { for (let r = 0; r < 3; r++) { const q = ((t * .22 + r / 3 + i * .37) % 1); c.strokeStyle = rgba(i === 2 ? k.a : k.f, (1 - q) * (i === 2 ? .22 : .09)); c.lineWidth = Math.max(1, m * .003); c.beginPath(); c.arc(W * p[0], H * p[1], m * (.03 + q * .4), 0, TAU); c.stroke(); } c.fillStyle = rgba(k.a, .3); c.beginPath(); c.arc(W * p[0], H * p[1], m * .007, 0, TAU); c.fill(); });
};

/* ---------- Тема и подбор рисунка ---------- */
CFG.global = 'NewsLib'; CFG.id = 'news'; CFG.name = 'Новости';
CFG.STRONG = /новост|срочн|сводк|репортаж|журналист|корреспондент|редакци|(?:^|[^а-яё])сми(?![а-яё])|прямой эфир|в эфире|телеканал|трансляц|пресс-?конференц|заголов|инсайд|фейк|факт-?чек|проверк[аи] фактов|разоблач|расследован|эксклюзив|breaking|газет|интервью|инфоповод|лент[аеуы] новостей|слух[иов]|очевидц|пресс-?служб|кликбейт|сенсац|сообщил[аи]?(?![а-яё])|сообщает|заявил[аи]?(?![а-яё])/g;
CFG.WEAK = /событи|происшеств|публикац|вышла|стало известно|узнал[аи]?(?![а-яё])|по данным|информац|тренд|вирусн|соцсет|телеграм|твит|читай|подробност|инцидент|источник|репост|подписчик/g;
CFG.KW = [
  ['nws_breaking', /срочн|breaking|молния|только что|внимание/], ['nws_factcheck', /фейк|факт-?чек|проверк|правд[аы]|ложь|вранье|достоверн|разоблач|миф/], ['nws_live', /эфир|прямой|live|трансляц|ведущ|телеканал|телевиден|стрим/],
  ['nws_press', /пресс-?конференц|заявил|брифинг|спикер|комментар/], ['nws_newspaper', /газет|статья|издани|публикац|колонк|редакци/], ['nws_mic', /интервью|репортёр|репортер|корреспондент|микрофон|подкаст/],
  ['nws_camera', /съемк|съёмк|видео|камер|кадр|оператор|очевидц/], ['nws_feed', /лент[аыу]|соцсет|телеграм|пост(?![а-яё])|канал|подписчик|репост|алгоритм|рекоменд/], ['nws_trending', /тренд|вирус|просмотр|популярн|хайп|набрал|миллион|рекорд/],
  ['nws_alert', /уведомлен|push|пуш|оповещени|тревог|сигнал|предупрежд/], ['nws_pipeline', /как делают|как создают|путь новости|источник|редактор|механик/], ['nws_timeline', /хронолог|по часам|развити|события дня|история|этапы|ход событий/],
  ['nws_world', /(?:^|[^а-яё])мир(?![а-яё])|в мире|страны|глобальн|международ|по всему|планет/], ['nws_headline', /заголов|кликбейт|громк|шок|сенсац|скандал/]
];
CFG.POOL = ['nws_breaking', 'nws_live', 'nws_newspaper', 'nws_world', 'nws_factcheck', 'nws_feed', 'nws_trending', 'nws_press', 'nws_pipeline', 'nws_timeline', 'nws_camera', 'nws_mic', 'nws_alert', 'nws_headline'];

/* ---------- Обёртка: вписывает рисунок в рамку, анимирует появление ---------- */
function draw(c, id, box, t, col, appear) {
  const a = ART[id]; if (!a) return; appear = appear === undefined ? 1 : appear; if (appear <= .001) return;
  const k = pal(col); let h = box.h, w = h * a.ar; if (w > box.w) { w = box.w; h = w / a.ar; }
  const sc = h / 2, cx = box.x + box.w / 2, cy = box.y + box.h / 2 + Math.sin(t * 1.6) * h * .012, s = .55 + .45 * eback(clamp(appear, 0, 1));
  c.save(); c.translate(cx, cy); c.scale(s, s); c.scale(sc, sc); c.globalAlpha *= clamp(appear * 1.6, 0, 1); c.lineCap = 'round'; c.lineJoin = 'round';
  try { a.draw({ c, px: sc * s, k }, t); } finally { c.restore(); }
}
function drawBg(c, id, t, W, H, col) { const f = BGS[id]; if (!f) return; c.save(); try { f(c, t, W, H, pal(col)); } finally { c.restore(); } }

/* ---------- Тема и подбор рисунка ---------- */
const countRx = (rx, s) => (s.match(rx) || []).length;
function topicScore(text) { const low = String(text || '').toLowerCase().replace(/\*/g, ''); return countRx(CFG.STRONG, low) * 2 + countRx(CFG.WEAK, low); }
function isTopic(text) { const low = String(text || '').toLowerCase().replace(/\*/g, ''); return countRx(CFG.STRONG, low) >= 1 || countRx(CFG.WEAK, low) >= 2; }
// list: [{text, art}], active: включена ли авто-графика. Возвращает id рисунка (или '') для каждой сцены.
function plan(list, active) {
  const out = [], recent = []; let rot = 0;
  list.forEach(s => {
    let id = ''; const a = s.art || 'auto';
    if (a === 'none') id = '';
    else if (a !== 'auto' && ART[a]) id = a;
    else if (active) {
      const low = String(s.text || '').toLowerCase().replace(/\*/g, ''); let cand = '';
      for (const kw of CFG.KW) if (kw[1].test(low) && !recent.includes(kw[0])) { cand = kw[0]; break; }
      if (!cand) for (let n = 0; n < CFG.POOL.length; n++) { const aid = CFG.POOL[(rot + n) % CFG.POOL.length]; if (!recent.includes(aid)) { cand = aid; rot = rot + n + 1; break; } }
      id = cand || CFG.POOL[0];
    }
    out.push(id); if (id) { recent.push(id); if (recent.length > 3) recent.shift(); }
  });
  return out;
}
/* Свободное место рядом с текстом для текущего бита (запасной вариант). */
function fitBox(L, W, H, ar) {
  const m = Math.min(W, H), pad = L.size * .12 + m * .025, y1 = L.by1 + pad;
  const C = [{ x: W * .05, y: H * .035, w: W * .9, h: L.by0 - pad - H * .035 }, { x: W * .05, y: y1, w: W * .9, h: H * .965 - y1 }, { x: W * .03, y: H * .06, w: L.bx0 - pad - W * .03, h: H * .88 }, { x: L.bx1 + pad, y: H * .06, w: W * .97 - (L.bx1 + pad), h: H * .88 }];
  let best = null, bs = 0;
  for (const r of C) {
    if (r.w <= 0 || r.h <= 0) continue; let h = Math.min(r.h, H * .5), w = h * ar; if (w > r.w) { w = r.w; h = w / ar; } if (w > W * .9) { w = W * .9; h = w / ar; }
    if (Math.min(w, h) < m * .15) continue; if (w * h > bs) { bs = w * h; best = { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h }; }
  }
  return best;
}
/* Постоянное место рисунка на ВСЮ сцену + область для текста (рисунок не прыгает, текст не заезжает на него).
   Вертикальный кадр: рисунок сверху/снизу (чередуется по номеру сцены). Широкий кадр: справа/слева или сверху, где рисунок крупнее. */
function slot(W, H, ar, idx) {
  idx = idx | 0; const mn = Math.min(W, H), m = mn * .05, gap = mn * .035, m2 = mn * .03;
  const fit = (sw, sh) => { let h = Math.min(sh, H * .9), w = h * ar; if (w > sw) { w = sw; h = w / ar; } return { w, h }; };
  const vert = bottom => { const f = fit(W - 2 * m, H * .42), ay = bottom ? H - m - f.h : m, ty = bottom ? m : ay + f.h + gap, th = bottom ? ay - gap - m : H - m - (ay + f.h + gap);
    return { art: { x: (W - f.w) / 2, y: ay, w: f.w, h: f.h }, text: { x: m, y: ty, w: W - 2 * m, h: th }, lim: { x0: m2, x1: W - m2, y0: bottom ? m2 : ay + f.h + gap * .5, y1: bottom ? ay - gap * .5 : H - m2 } }; };
  if (H > W * 1.15) return vert(idx % 2 === 1);
  const f = fit(W * .44, H - 2 * m), left = idx % 2 === 1, ax = left ? m : W - m - f.w;
  const side = { art: { x: ax, y: (H - f.h) / 2, w: f.w, h: f.h }, text: { x: left ? ax + f.w + gap : m, y: m, w: W - 2 * m - f.w - gap, h: H - 2 * m }, lim: { x0: left ? ax + f.w + gap * .5 : m2, x1: left ? W - m2 : ax - gap * .5, y0: m2, y1: H - m2 } };
  const top = vert(false), okS = side.text.w >= W * .38, okT = top.text.h >= H * .3;
  if (okS && (!okT || side.art.w * side.art.h >= top.art.w * top.art.h)) return side;
  return okT ? top : side;
}

root[CFG.global] = { version: '1.0', id: CFG.id, name: CFG.name, BG_IDS: CFG.BG_IDS, BG_NAMES: CFG.BG_NAMES, BG: BGS, drawBg, ART, ART_IDS, draw, drawIcon, ICON_IDS: Object.keys(ICON), isTopic, topicScore, plan, fitBox, slot };
})(typeof window !== 'undefined' ? window : globalThis);
