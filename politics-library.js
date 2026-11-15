/* ============================================================
   POLITICS LIBRARY v1.0 для VIDEO CREATE   (politics-library.js)
   Анимированные фоны и рисунки на тему политики, выборов, власти и права.
   Всё рисуется кодом на Canvas 2D, без картинок и внешних зависимостей.
   Нейтральная: никаких реальных партий, флагов, политиков и символики. Цвета берутся из палитры ролика.
   Результат зависит только от времени t (сек), поэтому годится и для превью, и для экспорта.

   API (window.PolitLib) — тот же контракт, что у window.VPNLib:
     BG_IDS, BG_NAMES, BG, drawBg(ctx, id, t, W, H, col)      — анимированные фоны (pol_*)
     ART, ART_IDS, draw(ctx, id, box, t, col, appear)         — рисунки: парламент, урна, дебаты, весы, молоток,
                                                                опрос, карта подсчёта, переговоры, закон, этапы закона,
                                                                митинг, бюджет, референдум, коалиция, календарь, здание, иконки
     drawIcon(ctx, name, color, lineWidth)                    — одиночная линейная иконка (±1)
     isTopic(text), topicScore(text)                          — тема про политику? (topicScore нужен, чтобы выбрать между библиотеками)
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

/* ---------- Иконки (линейные, вписаны в ±1) ---------- */
Object.assign(ICON, {
  columns(c) { c.beginPath(); c.moveTo(-.88, -.32); c.lineTo(0, -.9); c.lineTo(.88, -.32); c.closePath(); c.stroke(); [-.6, -.2, .2, .6].forEach(x => { c.beginPath(); c.moveTo(x, -.18); c.lineTo(x, .56); c.stroke(); }); c.beginPath(); c.moveTo(-.88, -.18); c.lineTo(.88, -.18); c.moveTo(-.88, .7); c.lineTo(.88, .7); c.moveTo(-.98, .9); c.lineTo(.98, .9); c.stroke(); },
  gavel(c) { c.save(); c.translate(.12, -.3); c.rotate(-PI / 4); rr(c, -.5, -.3, 1, .6, .12); c.stroke(); c.beginPath(); c.moveTo(0, .3); c.lineTo(0, 1.05); c.stroke(); c.restore(); c.beginPath(); c.moveTo(-.9, .88); c.lineTo(.1, .88); c.stroke(); },
  scales(c) { c.beginPath(); c.moveTo(-.85, -.5); c.lineTo(.85, -.5); c.moveTo(0, -.5); c.lineTo(0, .78); c.moveTo(-.4, .88); c.lineTo(.4, .88); c.stroke(); [-.85, .85].forEach(x => { c.beginPath(); c.moveTo(x, -.5); c.lineTo(x - .22, .1); c.moveTo(x, -.5); c.lineTo(x + .22, .1); c.stroke(); c.beginPath(); c.arc(x, .1, .26, 0, PI); c.stroke(); }); c.beginPath(); c.arc(0, -.62, .09, 0, TAU); c.fill(); },
  ballot(c) { rr(c, -.85, .06, 1.7, .84, .1); c.stroke(); c.beginPath(); c.moveTo(-.45, .06); c.lineTo(.45, .06); c.stroke(); rr(c, -.4, -.88, .8, .8, .08); c.stroke(); c.beginPath(); c.moveTo(-.2, -.48); c.lineTo(-.05, -.33); c.lineTo(.22, -.65); c.stroke(); },
  mic(c) { rr(c, -.3, -.9, .6, 1.05, .3); c.stroke(); c.beginPath(); c.arc(0, .12, .52, 0, PI); c.stroke(); c.beginPath(); c.moveTo(0, .64); c.lineTo(0, .92); c.moveTo(-.32, .92); c.lineTo(.32, .92); c.stroke(); },
  megaphone(c) { c.beginPath(); c.moveTo(-.85, -.22); c.lineTo(.1, -.22); c.lineTo(.85, -.72); c.lineTo(.85, .72); c.lineTo(.1, .22); c.lineTo(-.85, .22); c.closePath(); c.stroke(); rr(c, -.55, .22, .24, .5, .08); c.stroke(); },
  doc(c) { rr(c, -.62, -.9, 1.24, 1.8, .1); c.stroke(); c.beginPath(); c.moveTo(-.34, -.46); c.lineTo(.34, -.46); c.moveTo(-.34, -.06); c.lineTo(.34, -.06); c.moveTo(-.34, .34); c.lineTo(.1, .34); c.stroke(); },
  stamp(c) { c.beginPath(); c.arc(0, -.62, .24, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(0, -.38); c.lineTo(0, -.12); c.stroke(); rr(c, -.6, -.12, 1.2, .5, .1); c.stroke(); c.beginPath(); c.moveTo(-.86, .6); c.lineTo(.86, .6); c.moveTo(-.86, .88); c.lineTo(.86, .88); c.stroke(); },
  people(c) { [[0, -.35, .3], [-.62, -.12, .22], [.62, -.12, .22]].forEach(p => { c.beginPath(); c.arc(p[0], p[1], p[2], 0, TAU); c.stroke(); c.beginPath(); c.arc(p[0], p[1] + p[2] * 3.1, p[2] * 1.8, PI * 1.12, PI * 1.88); c.stroke(); }); },
  coin(c) { [.5, .12, -.26].forEach((y, i) => { c.beginPath(); c.ellipse(0, y, .72, .26, 0, 0, TAU); c.stroke(); if (i < 2) { c.beginPath(); c.moveTo(-.72, y); c.lineTo(-.72, y + .38); c.moveTo(.72, y); c.lineTo(.72, y + .38); c.stroke(); } }); },
  check(c) { c.beginPath(); c.moveTo(-.6, .05); c.lineTo(-.2, .45); c.lineTo(.6, -.4); c.stroke(); },
  cross(c) { c.beginPath(); c.moveTo(-.55, -.55); c.lineTo(.55, .55); c.moveTo(.55, -.55); c.lineTo(-.55, .55); c.stroke(); },
  chart(c) { c.beginPath(); c.moveTo(-.85, .85); c.lineTo(.9, .85); c.stroke(); [[-.6, .1], [-.15, -.35], [.3, -.8]].forEach(b => { rr(c, b[0], b[1], .3, .85 - b[1], .05); c.stroke(); }); },
  flag(c) { c.beginPath(); c.moveTo(-.62, -.92); c.lineTo(-.62, .92); c.stroke(); c.beginPath(); c.moveTo(-.62, -.82); c.bezierCurveTo(-.1, -1.0, .2, -.5, .8, -.7); c.lineTo(.8, .05); c.bezierCurveTo(.2, .25, -.1, -.25, -.62, -.1); c.closePath(); c.stroke(); },
  bulb(c) { c.beginPath(); c.arc(0, -.28, .52, PI * .78, PI * .22, false); c.lineTo(.2, .38); c.lineTo(-.2, .38); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(-.22, .6); c.lineTo(.22, .6); c.moveTo(-.14, .82); c.lineTo(.14, .82); c.stroke(); },
  pen(c) { c.beginPath(); c.moveTo(-.7, .7); c.lineTo(-.55, .25); c.lineTo(.4, -.7); c.lineTo(.75, -.35); c.lineTo(-.2, .6); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(.2, -.5); c.lineTo(.55, -.15); c.stroke(); }
});

/* ---------- Парламент: полукруг мест, голосование, большинство ---------- */
const PARL = (() => { const seats = [], y0 = .74; for (let i = 0; i < 6; i++) { const r = .72 + i * .165, n = Math.round(PI * r / .118); for (let j = 0; j < n; j++) { const a = PI + (j + .5) / n * PI; seats.push({ a, x: Math.cos(a) * r, y: y0 + Math.sin(a) * r }); } } seats.sort((p, q) => p.a - q.a); return { seats, y0 }; })();
reg('pol_parliament', 'Парламент · голосование', 'scene', 1.75, (g, t) => {
  const c = g.c, k = g.k, N = PARL.seats.length, T = t % 9, p = eo3(clamp((T - .5) / 3.4, 0, 1)), lit = Math.floor(N * p), cols = [k.a, mix(k.a, k.f, .55), rgba(k.f, .55), rgba(k.f, .3)], cut = [0, .38, .68, .88, 1.01];
  PARL.seats.forEach((s, i) => { const f = i / N, bl = f < cut[1] ? 0 : f < cut[2] ? 1 : f < cut[3] ? 2 : 3, on = i < lit; c.save(); c.translate(s.x, s.y); c.rotate(s.a + PI / 2); rr(c, -.043, -.035, .086, .07, .018); if (on) { c.fillStyle = cols[bl]; c.fill(); } else { c.fillStyle = rgba(k.f, .1); c.fill(); } c.restore(); });
  c.save(); c.setLineDash([.05, .06]); c.strokeStyle = rgba(k.f, .45); c.lineWidth = .02; c.beginPath(); c.moveTo(0, PARL.y0 - 1.6); c.lineTo(0, PARL.y0 + .02); c.stroke(); c.restore(); txt(g, '50%', 0, -.92, .1, k.f, { mono: 1 });
  rr(c, -.18, PARL.y0 + .03, .36, .15, .05); c.fillStyle = rgba(k.f, .25); c.fill();
  txt(g, String(lit), 0, .3, .36, k.f, { mono: 1, w: 800 }); txt(g, 'из ' + N + ' голосов', 0, .56, .09, rgba(k.f, .6), { w: 600 });
  const maj = lit >= N * .5; if (maj) { const q = eo3((T - 2.2) / .5); c.save(); c.globalAlpha = clamp(q, 0, 1); pill(g, T > 5 ? 'ЗАКОН ПРИНЯТ' : 'БОЛЬШИНСТВО ЕСТЬ', 0, .98 - .02, .1, k.b, k.a); c.restore(); }
});

/* ---------- Урна: бюллетени падают в прорезь ---------- */
reg('pol_ballot', 'Урна для голосования', 'scene', 1.05, (g, t) => {
  const c = g.c, k = g.k, cnt = Math.floor(t / 1.6) * 1 + 128, pu = Math.max(0, 1 - ((t % 1.6) / .5));
  gl(g, rgba(k.a, .25 + .3 * pu), .15 + .1 * pu); rr(c, -.72, .08, 1.44, .86, .08); const bg = c.createLinearGradient(0, .08, 0, .94); bg.addColorStop(0, rgba(k.a, .28)); bg.addColorStop(1, rgba(k.a, .08)); c.fillStyle = bg; c.fill(); ng(g); c.lineWidth = .045; c.strokeStyle = k.a; c.stroke();
  [0, 1].forEach(i => { const T = (t + i * .8) % 1.6 / 1.6, ph = T; c.save(); c.beginPath(); c.rect(-1, -1.1, 2, 1.1 + .0 + .08); c.clip(); const y = lerp(-.56, .1, eo3(clamp((ph - .22) / .6, 0, 1))), ck = clamp(ph / .22, 0, 1);
    c.translate(0, y); c.rotate(Math.sin(ph * 6 + i) * .05 * (1 - clamp((ph - .22) / .6, 0, 1))); rr(c, -.36, -.5, .72, .86, .05); c.fillStyle = k.f; c.fill();
    for (let r = 0; r < 3; r++) { c.fillStyle = rgba(k.b, .4); c.fillRect(-.12, -.34 + r * .24, .38, .05); c.lineWidth = .028; c.strokeStyle = rgba(k.b, .55); c.strokeRect(-.28, -.4 + r * .24, .1, .1); }
    c.strokeStyle = k.a; c.lineWidth = .05; c.beginPath(); c.moveTo(-.26, -.16); c.lineTo(-.26 + .04 * ck, -.16 + .02 * ck); c.lineTo(-.23 + .03 * ck, -.12 + .03 * ck); c.stroke();
    c.beginPath(); c.moveTo(-.28, -.16 + .24); c.lineTo(-.24, -.11 + .24); c.lineTo(-.17, -.24 + .24); c.stroke(); c.restore(); });
  rr(c, -.86, -.02, 1.72, .17, .06); c.fillStyle = mix(k.a, k.b, .35); c.fill(); c.lineWidth = .03; c.strokeStyle = k.a; c.stroke(); rr(c, -.42, .045, .84, .045, .02); c.fillStyle = k.b; c.fill();
  rr(c, -.4, .36, .8, .36, .06); c.fillStyle = rgba(k.b, .75); c.fill(); c.lineWidth = .025; c.strokeStyle = rgba(k.a, .8); c.stroke(); txt(g, String(cnt), 0, .55, .22, k.a, { mono: 1, w: 800 });
});

/* ---------- Дебаты: два подиума, микрофоны, реплики, таймер ---------- */
reg('pol_debate', 'Дебаты', 'scene', 1.55, (g, t) => {
  const c = g.c, k = g.k, act = Math.floor(t / 2.2) % 2, ph = (t % 2.2) / 2.2;
  [-1, 1].forEach((sd, i) => {
    const x = sd * .95, on = act === i, col = i ? mix(k.a, k.f, .6) : k.a, al = on ? 1 : .45;
    if (on) { const lg = c.createLinearGradient(0, -1, 0, .6); lg.addColorStop(0, rgba(col, .0)); lg.addColorStop(1, rgba(col, .22)); c.fillStyle = lg; c.beginPath(); c.moveTo(x - .08, -1); c.lineTo(x + .08, -1); c.lineTo(x + .55, .6); c.lineTo(x - .55, .6); c.closePath(); c.fill(); }
    c.save(); c.globalAlpha = al; person(c, x, -.12 + (on ? Math.sin(t * 7) * .008 : 0), .21, rgba(col, .85)); 
    c.beginPath(); c.moveTo(x - .42, .98); c.lineTo(x - .34, .36); c.lineTo(x + .34, .36); c.lineTo(x + .42, .98); c.closePath(); const pg = c.createLinearGradient(0, .36, 0, .98); pg.addColorStop(0, rgba(col, .45)); pg.addColorStop(1, rgba(col, .12)); c.fillStyle = pg; c.fill(); c.lineWidth = .035; c.strokeStyle = col; c.stroke();
    c.beginPath(); c.moveTo(x, .36); c.bezierCurveTo(x - sd * .02, .12, x - sd * .16, .08, x - sd * .2, .02); c.lineWidth = .028; c.strokeStyle = k.f; c.stroke(); rr(c, x - sd * .2 - .045, -.03, .09, .12, .04); c.fillStyle = k.f; c.fill();
    rr(c, x - .17, .55, .34, .12, .03); c.fillStyle = rgba(k.b, .6); c.fill(); txt(g, i ? 'Б' : 'А', x, .615, .1, col, { w: 800 }); c.restore();
    if (on) { const bx = x - sd * .02, by = -.74; rr(c, bx - .42, by - .17, .84, .34, .17); c.fillStyle = rgba(col, .2); c.fill(); c.lineWidth = .03; c.strokeStyle = col; c.stroke(); c.beginPath(); c.moveTo(bx - sd * .1, by + .16); c.lineTo(bx - sd * .17, by + .3); c.lineTo(bx + sd * .02, by + .16); c.fillStyle = rgba(col, .2); c.fill();
      for (let b = 0; b < 9; b++) { const h = .05 + .13 * Math.abs(Math.sin(t * 9 + b * 1.3 + i)) * (.5 + .5 * Math.sin(ph * PI)); c.fillStyle = col; rr(c, bx - .3 + b * .075, by - h / 2, .045, h, .02); c.fill(); } }
  });
  const cx = 0, cy = .05, R = .24; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fillStyle = rgba(k.b, .7); c.fill(); c.lineWidth = .03; c.strokeStyle = rgba(k.f, .35); c.stroke(); c.lineWidth = .05; c.strokeStyle = k.a; c.beginPath(); c.arc(cx, cy, R, -PI / 2, -PI / 2 + TAU * (1 - ph)); c.stroke(); txt(g, String(Math.max(0, Math.ceil(30 * (1 - ph)))).padStart(2, '0'), cx, cy + .01, .14, k.f, { mono: 1, w: 800 }); txt(g, 'СЕК', cx, cy + .36, .07, rgba(k.f, .6), { w: 700 });
});

/* ---------- Весы правосудия ---------- */
reg('pol_scales', 'Весы правосудия', 'scene', 1.1, (g, t) => {
  const c = g.c, k = g.k, th = .3 * Math.sin(t * .95) * (1 - .0) + .06 * Math.sin(t * 2.6), L = 1.0, py = -.6, ex = Math.cos(th) * L, ey = Math.sin(th) * L;
  gl(g, rgba(k.a, .3), .12); c.strokeStyle = k.a; c.lineWidth = .06; c.beginPath(); c.moveTo(0, py); c.lineTo(0, .78); c.stroke(); rr(c, -.42, .78, .84, .16, .05); c.fillStyle = rgba(k.a, .35); c.fill(); c.lineWidth = .04; c.stroke(); ng(g);
  c.beginPath(); c.moveTo(-ex, py - ey); c.lineTo(ex, py + ey); c.lineWidth = .07; c.strokeStyle = k.f; c.stroke(); c.beginPath(); c.arc(0, py, .1, 0, TAU); c.fillStyle = k.a; c.fill();
  [[-1, '#coins'], [1, '#doc']].forEach(([sd, kind]) => {
    const x = sd * ex, y = py + sd * ey, py2 = y + .72, sw = Math.sin(t * 2 + sd) * .01; c.lineWidth = .025; c.strokeStyle = rgba(k.f, .7); c.beginPath(); c.moveTo(x, y); c.lineTo(x - .34, py2); c.moveTo(x, y); c.lineTo(x + .34, py2); c.stroke();
    c.beginPath(); c.arc(x, py2, .36, 0, PI); c.closePath(); c.fillStyle = rgba(k.a, .22); c.fill(); c.lineWidth = .04; c.strokeStyle = k.a; c.stroke();
    if (kind === '#coins') { for (let i = 0; i < 4; i++) { const cy = py2 - .06 - i * .075, cx = x + (i % 2 ? .05 : -.05); c.beginPath(); c.ellipse(cx, cy, .17, .05, 0, 0, TAU); c.fillStyle = i % 2 ? mix(k.a, k.f, .3) : k.a; c.fill(); c.lineWidth = .02; c.strokeStyle = rgba(k.b, .5); c.stroke(); } }
    else { rr(c, x - .15, py2 - .42, .3, .4, .03); c.fillStyle = k.f; c.fill(); [0, 1, 2].forEach(r => { c.fillStyle = rgba(k.b, .45); c.fillRect(x - .1, py2 - .35 + r * .09, .2 - r * .04, .03); }); c.beginPath(); c.arc(x + .1, py2 - .1, .05, 0, TAU); c.fillStyle = k.a; c.fill(); }
  });
});

/* ---------- Молоток судьи / председателя ---------- */
reg('pol_gavel', 'Молоток · «принято»', 'scene', 1.35, (g, t) => {
  const c = g.c, k = g.k, T = t % 2.6, sw = T < 1.1 ? -.95 + .05 * Math.sin(T * 3) : T < 1.4 ? lerp(-.95, .08, eo3((T - 1.1) / .3)) : lerp(.08, -.95, eo3((T - 1.7) / .7)), hit = T >= 1.38 && T < 2.2 ? (T - 1.38) / .8 : -1;
  c.beginPath(); c.ellipse(.3, .86, .72, .14, 0, 0, TAU); c.fillStyle = rgba(k.a, .12); c.fill(); rr(c, -.22, .52, .104 * 10, .34, .06); c.fillStyle = rgba(k.a, .35); c.fill(); c.lineWidth = .04; c.strokeStyle = k.a; c.stroke(); c.beginPath(); c.ellipse(.3, .52, .52, .12, 0, 0, TAU); c.fillStyle = mix(k.a, k.f, .25); c.fill(); c.stroke();
  if (hit >= 0) { for (let i = 0; i < 3; i++) { const q = clamp(hit - i * .12, 0, 1); c.strokeStyle = rgba(k.a, (1 - q) * .8); c.lineWidth = .035; c.beginPath(); c.ellipse(.3, .52, .5 + q * .9, .12 + q * .22, 0, 0, TAU); c.stroke(); } for (let i = 0; i < 8; i++) { const a = -PI * (.1 + .8 * i / 7), d = hit * .6; c.fillStyle = rgba(k.f, 1 - hit); c.fillRect(.3 + Math.cos(a) * (.4 + d) - .015, .5 + Math.sin(a) * (.3 + d * .6) - .015, .03, .03); } }
  c.save(); c.translate(-.55, .32); c.rotate(sw); c.lineCap = 'round'; c.lineWidth = .11; c.strokeStyle = mix(k.a, k.f, .15); c.beginPath(); c.moveTo(0, 0); c.lineTo(1.12, 0); c.stroke(); rr(c, 1.0, -.34, .3, .68, .08); const hg = c.createLinearGradient(1, -.34, 1.3, .34); hg.addColorStop(0, k.a); hg.addColorStop(1, mix(k.a, k.b, .5)); c.fillStyle = hg; c.fill(); c.lineWidth = .035; c.strokeStyle = k.f; c.stroke(); c.fillStyle = rgba(k.b, .5); c.fillRect(1.06, -.34, .035, .68); c.fillRect(1.2, -.34, .035, .68); c.restore();
  rr(c, -1.15, -.88, .62, .78, .06); c.fillStyle = rgba(k.f, .1); c.fill(); c.lineWidth = .025; c.strokeStyle = rgba(k.f, .4); c.stroke(); [0, 1, 2, 3].forEach(r => { c.fillStyle = rgba(k.f, .35); c.fillRect(-1.05, -.76 + r * .15, .42 - (r % 2) * .1, .04); });
});

/* ---------- Опрос: полосы с процентами, «выборка» людей ---------- */
reg('pol_poll', 'Опрос общественного мнения', 'chart', 1.5, (g, t) => {
  const c = g.c, k = g.k, DS = [[47, 38, 15], [41, 44, 15], [52, 33, 15]], seg = Math.floor(t / 4.5), q = sm(((t % 4.5) - 3.2) / 1.0), A = DS[seg % 3], B = DS[(seg + 1) % 3], intro = eo3(clamp(t / 1.2, 0, 1)), names = ['ЗА', 'ПРОТИВ', 'НЕ ЗНАЮ'], x0 = -.55, wTrack = 1.9;
  const vals = A.map((v, i) => lerp(v, B[i], q)), lead = vals.indexOf(Math.max(...vals));
  names.forEach((nm, i) => { const y = -.68 + i * .43, v = vals[i] * intro, col = i === 0 ? k.a : i === 1 ? mix(k.a, k.f, .65) : rgba(k.f, .55);
    txt(g, nm, x0 - .08, y, .13, k.f, { al: 'right', w: 800 }); rr(c, x0, y - .13, wTrack, .26, .13); c.fillStyle = rgba(k.f, .1); c.fill();
    const w = Math.max(.26, wTrack * v / 60); if (i === lead) gl(g, rgba(col, .55), .12); rr(c, x0, y - .13, w, .26, .13); c.fillStyle = col; c.fill(); ng(g);
    txt(g, Math.round(vals[i] * intro) + '%', x0 + w - .08, y + .005, .15, i === 2 ? k.f : k.b, { al: 'right', mono: 1, w: 800 }); });
  const n = 30, base = .62; for (let i = 0; i < n; i++) { const share = (i + .5) / n * 100, own = share < vals[0] ? 0 : share < vals[0] + vals[1] ? 1 : 2, on = i / n < intro, x = -1.25 + i * .085, hh = .26; c.save(); c.globalAlpha = on ? 1 : .2; person(c, x + .03, base - .06, .03, own === 0 ? k.a : own === 1 ? mix(k.a, k.f, .65) : rgba(k.f, .55)); c.restore(); }
  txt(g, 'ОПРОШЕНО 1 000 ЧЕЛОВЕК', 0, .9, .09, rgba(k.f, .6), { w: 700 });
});

/* ---------- Тайл-карта подсчёта голосов (абстрактная, без реальных регионов) ---------- */
const TILES = (() => { const a = [], cx = 5, cy = 2.5; for (let y = 0; y < 6; y++) for (let x = 0; x < 11; x++) { const d = Math.pow((x - cx) / 5.4, 2) + Math.pow((y - cy) / 3.1, 2), n = hr(x * 3.1, y * 5.7); if (d < 1 - n * .35) { const zone = Math.sin(x * .55 + y * .3) + Math.cos(y * .9 - x * .2) * .8 + (hr(x, y + 9) - .5) * .9; a.push({ x, y, bl: zone > .45 ? 0 : zone < -.25 ? 1 : 2, o: hr(x * 7.7, y * 3.3) }); } } return a; })();
reg('pol_tilemap', 'Подсчёт голосов · карта', 'scene', 1.6, (g, t) => {
  const c = g.c, k = g.k, T = t % 8, p = clamp((T - .4) / 4.6, 0, 1), cols = [k.a, mix(k.a, k.f, .65), rgba(k.f, .5)], cnt = [0, 0, 0], s = .25, ox = -5 * s * 1.05, oy = -2.5 * s * 1.05 - .0;
  TILES.forEach(tl => { const f = clamp((p - tl.o * .8) / .2, 0, 1), x = ox + tl.x * s * 1.05, y = oy + tl.y * s * 1.05 + .12; if (f >= 1) cnt[tl.bl]++; const w = Math.abs(Math.cos(f * PI)); c.save(); c.translate(x, y); c.scale(Math.max(.05, f < .5 ? 1 - f * 2 : (f - .5) * 2), 1); rr(c, -s * .45, -s * .45, s * .9, s * .9, s * .18); c.fillStyle = f < .5 ? rgba(k.f, .14) : cols[tl.bl]; c.fill(); c.restore(); });
  const tot = TILES.length, lead = cnt.indexOf(Math.max(...cnt));
  rr(c, -1.3, -.98, 2.6, .17, .08); c.fillStyle = rgba(k.f, .1); c.fill(); let sx = -1.3; cnt.forEach((n, i) => { const w = 2.6 * n / tot; if (w > .01) { rr(c, sx, -.98, w, .17, .08); c.fillStyle = cols[i]; c.fill(); } sx += w; });
  c.setLineDash([.04, .05]); c.strokeStyle = rgba(k.f, .6); c.lineWidth = .02; c.beginPath(); c.moveTo(0, -1.03); c.lineTo(0, -.76); c.stroke(); c.setLineDash([]);
  txt(g, 'ПОДСЧЁТ ' + Math.round(p * 100) + '%', 0, .98, .11, k.f, { mono: 1, w: 800 });
});

/* ---------- Саммит: круглый стол, делегаты, согласование ---------- */
reg('pol_summit', 'Переговоры · круглый стол', 'scene', 1.2, (g, t) => {
  const c = g.c, k = g.k, N = 8, R = .84, act = Math.floor(t / .75) % N, T = t % 8, agree = clamp((T - 2.5) / 3, 0, 1);
  c.beginPath(); c.arc(0, 0, .62, 0, TAU); const tg = c.createRadialGradient(0, 0, 0, 0, 0, .62); tg.addColorStop(0, rgba(k.a, .22)); tg.addColorStop(1, rgba(k.a, .06)); c.fillStyle = tg; c.fill(); c.lineWidth = .045; c.strokeStyle = k.a; c.stroke();
  for (let i = 0; i < N; i++) { const a = i / N * TAU - PI / 2, x = Math.cos(a) * R, y = Math.sin(a) * R, on = i === act; if (on) { for (let r = 0; r < 2; r++) { const q = ((t * 1.6 + r * .5) % 1); c.strokeStyle = rgba(k.a, (1 - q) * .6); c.lineWidth = .03; c.beginPath(); c.arc(x, y, .16 + q * .22, 0, TAU); c.stroke(); } }
    c.beginPath(); c.arc(x, y, .17, 0, TAU); c.fillStyle = on ? k.a : rgba(k.f, .22); c.fill(); c.lineWidth = .03; c.strokeStyle = on ? k.f : rgba(k.f, .5); c.stroke(); c.beginPath(); c.arc(x, y - .02, .06, 0, TAU); c.fillStyle = on ? k.b : rgba(k.f, .75); c.fill(); c.beginPath(); c.arc(x, y + .12, .09, PI * 1.1, PI * 1.9); c.strokeStyle = on ? k.b : rgba(k.f, .75); c.lineWidth = .035; c.stroke();
    rr(c, Math.cos(a) * .5 - .07, Math.sin(a) * .5 - .05, .14, .1, .02); c.fillStyle = rgba(k.f, .7); c.fill(); }
  for (let i = 0; i < N; i++) { const j = (i + 3) % N; if (i > 2 && i % 2) continue; const a1 = i / N * TAU - PI / 2, a2 = j / N * TAU - PI / 2, f = clamp(agree * 1.6 - i * .12, 0, 1); if (f <= 0) continue; c.strokeStyle = rgba(k.a, .5 * f); c.lineWidth = .02; c.setLineDash([.04, .05]); c.beginPath(); c.moveTo(Math.cos(a1) * .66, Math.sin(a1) * .66); c.lineTo(lerp(Math.cos(a1) * .66, Math.cos(a2) * .66, f), lerp(Math.sin(a1) * .66, Math.sin(a2) * .66, f)); c.stroke(); c.setLineDash([]); }
  c.save(); c.translate(0, 0); c.rotate(t * .4); c.strokeStyle = k.f; c.lineWidth = .028; c.beginPath(); c.arc(0, 0, .3, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(0, 0, .12, .3, 0, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-.3, 0); c.lineTo(.3, 0); c.stroke(); c.restore();
  if (agree >= 1) { const q = eback((T - 5.5) / .5); c.save(); c.scale(Math.max(.01, q), Math.max(.01, q)); c.beginPath(); c.arc(0, 0, .2, 0, TAU); c.fillStyle = k.a; c.fill(); c.strokeStyle = k.b; c.lineWidth = .06; c.beginPath(); c.moveTo(-.09, .0); c.lineTo(-.02, .08); c.lineTo(.11, -.07); c.stroke(); c.restore(); }
});

/* ---------- Закон: документ, статьи, проверка, печать ---------- */
reg('pol_law', 'Закон · статьи и печать', 'scene', .82, (g, t) => {
  const c = g.c, k = g.k, T = t % 7, scan = clamp((T - .6) / 3.8, 0, 1), rows = 6, stamp = eback((T - 4.7) / .35);
  rr(c, -.62, -.95, 1.24, 1.9, .07); c.fillStyle = k.f; c.fill(); gl(g, rgba(k.a, .3), .1); c.lineWidth = .03; c.strokeStyle = k.a; c.stroke(); ng(g);
  rr(c, -.46, -.8, .92, .15, .04); c.fillStyle = k.b; c.fill(); txt(g, 'ЗАКОН', 0, -.725, .1, k.f, { w: 800 });
  const sy = -.5 + scan * 1.1; for (let i = 0; i < rows; i++) { const y = -.5 + i * .19, hot = Math.abs(y - sy) < .1 && T > .6 && T < 4.6; if (hot) { rr(c, -.52, y - .075, 1.04, .15, .03); c.fillStyle = rgba(k.a, .35); c.fill(); } txt(g, 'Ст.' + (i + 1), -.46, y, .075, hot ? k.b : rgba(k.b, .55), { al: 'left', mono: 1, w: 700 }); c.fillStyle = hot ? k.b : rgba(k.b, .3); c.fillRect(-.22, y - .015, .62 - (i % 3) * .12, .03); }
  if (T > .6 && T < 4.6) { c.save(); c.translate(.38, sy + .08); c.strokeStyle = k.a; c.lineWidth = .05; c.beginPath(); c.arc(0, 0, .16, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(.11, .11); c.lineTo(.3, .3); c.stroke(); c.restore(); }
  if (T > 4.7) { const s = clamp(stamp, 0, 1.3); c.save(); c.translate(.0, .62); c.rotate(-.18); c.scale(1.5 - .5 * Math.min(1, s), 1.5 - .5 * Math.min(1, s)); c.globalAlpha = clamp((T - 4.7) / .15, 0, 1); c.lineWidth = .045; c.strokeStyle = k.a; rr(c, -.48, -.2, .96, .4, .06); c.stroke(); c.lineWidth = .02; rr(c, -.43, -.15, .86, .3, .04); c.stroke(); txt(g, 'ПРИНЯТО', 0, 0, .17, k.a, { w: 900 }); c.restore(); }
});

/* ---------- Как принимается закон: цепочка этапов ---------- */
reg('pol_lawflow', 'Как принимается закон', 'scene', 2.5, (g, t) => {
  const c = g.c, k = g.k, S = [['bulb', 'Идея'], ['people', 'Комитет'], ['ballot', 'Голосование'], ['pen', 'Подпись'], ['columns', 'Закон']], n = S.length, xs = S.map((_, i) => -2.0 + i * 1.0), T = (t % 9) / 9 * (n + .6), pos = clamp(T, 0, n - 1), cur = Math.min(n - 1, Math.floor(T));
  c.lineWidth = .05; c.strokeStyle = rgba(k.f, .16); c.lineCap = 'round'; c.beginPath(); c.moveTo(xs[0], 0); c.lineTo(xs[n - 1], 0); c.stroke(); c.strokeStyle = k.a; gl(g, rgba(k.a, .6), .1); c.beginPath(); c.moveTo(xs[0], 0); c.lineTo(xs[0] + pos, 0); c.stroke(); ng(g);
  S.forEach((s, i) => { const done = T >= i + .5 || (i === 0 && T >= .1), act = cur === i && T < n, r = .34 + (act ? .04 * Math.sin(t * 6) : 0); if (act) { gl(g, rgba(k.a, .7), .2); } c.beginPath(); c.arc(xs[i], 0, r, 0, TAU); c.fillStyle = done ? rgba(k.a, .9) : k.b; c.fill(); c.lineWidth = .045; c.strokeStyle = done || act ? k.a : rgba(k.f, .35); c.stroke(); ng(g); icon(g, s[0], xs[i], 0, .2, done ? k.b : act ? k.a : rgba(k.f, .6), .15); txt(g, s[1], xs[i], .66, .125, act || done ? k.f : rgba(k.f, .55), { w: 800 });
    if (done && i < n - 1 && T > i + .9) { c.beginPath(); c.arc(xs[i] + .27, -.27, .1, 0, TAU); c.fillStyle = k.f; c.fill(); icon(g, 'check', xs[i] + .27, -.27, .07, k.b, .22); } });
  const dx = xs[0] + pos; c.save(); c.translate(dx, -.62 + Math.sin(t * 5) * .02); rr(c, -.13, -.17, .26, .34, .03); c.fillStyle = k.f; c.fill(); [0, 1, 2].forEach(r => { c.fillStyle = rgba(k.b, .5); c.fillRect(-.08, -.11 + r * .08, .16 - r * .03, .025); }); c.restore();
});

/* ---------- Митинг: толпа, плакаты, мегафон ---------- */
reg('pol_rally', 'Митинг · толпа и мегафон', 'scene', 1.85, (g, t) => {
  const c = g.c, k = g.k; for (let r = 0; r < 3; r++) { const n = 10 - r, y = -.1 + r * .38, sc = .15 + r * .035, al = .35 + r * .25; for (let i = 0; i < n; i++) { const x = (-1.55 + (i + (r % 2 ? .5 : 0)) * (3.1 / (n - .5))) * (r === 0 ? .95 : 1), b = Math.sin(t * 3 + i * 1.7 + r) * .03, hasSign = hr(i, r + 4) > .66; if (hasSign) { const sw = Math.sin(t * 2.4 + i) * .06; c.save(); c.translate(x, y + b + .1); c.rotate(sw); c.strokeStyle = rgba(k.f, al * .7); c.lineWidth = .03; c.beginPath(); c.moveTo(0, .2); c.lineTo(0, -.65 - r * .05); c.stroke(); rr(c, -.28, -.98 - r * .05, .56, .38, .04); c.fillStyle = r === 2 ? k.a : rgba(k.a, al); c.fill(); txt(g, hr(i, r) > .5 ? '!' : '?', 0, -.79 - r * .05, .26, k.b, { w: 900 }); c.restore(); } person(c, x, y + b, sc, hasSign ? rgba(k.a, al * .85) : rgba(k.f, al * .55)); } }
  c.save(); c.translate(-1.3, .72); c.scale(.8, .8); c.rotate(-.12 + Math.sin(t * 5) * .03); c.beginPath(); c.moveTo(-.3, -.12); c.lineTo(.1, -.12); c.lineTo(.5, -.4); c.lineTo(.5, .4); c.lineTo(.1, .12); c.lineTo(-.3, .12); c.closePath(); c.fillStyle = k.b; c.fill(); c.lineWidth = .06; c.strokeStyle = k.a; c.stroke(); rr(c, -.2, .1, .12, .3, .04); c.fillStyle = k.a; c.fill(); for (let i = 0; i < 3; i++) { const q = (t * 1.3 + i / 3) % 1; c.strokeStyle = rgba(k.a, (1 - q) * .8); c.lineWidth = .035; c.beginPath(); c.arc(.5, 0, .2 + q * .7, -.7, .7); c.stroke(); } c.restore();
});

/* ---------- Бюджет: потоки денег по направлениям ---------- */
reg('pol_budget', 'Бюджет · куда уходят деньги', 'chart', 1.45, (g, t) => {
  const c = g.c, k = g.k, V = [['cross', 'Здоровье', .4], ['bulb', 'Школы', .25], ['flag', 'Дороги', .2], ['coin', 'Прочее', .15]], xs = [-1.05, -.35, .35, 1.05], T = t % 7, fill = eo3(clamp((T - .4) / 4.2, 0, 1));
  gl(g, rgba(k.a, .35), .15); rr(c, -.5, -.95, 1.0, .36, .1); c.fillStyle = rgba(k.a, .25); c.fill(); c.lineWidth = .04; c.strokeStyle = k.a; c.stroke(); ng(g); icon(g, 'coin', -.28, -.77, .15, k.a, .16); txt(g, 'БЮДЖЕТ', .1, -.77, .13, k.f, { w: 800 });
  V.forEach((v, i) => { const x = xs[i]; c.strokeStyle = rgba(k.a, .45); c.lineWidth = .04; c.beginPath(); c.moveTo(0, -.6); c.lineTo(0, -.42); c.lineTo(x, -.42); c.lineTo(x, -.12); c.stroke();
    for (let d = 0; d < 4; d++) { const q = ((t * .7 + d / 4 + i * .13) % 1), px = q < .25 ? lerp(0, 0, 0) : q < .5 ? lerp(0, x, (q - .25) / .25) : x, py = q < .25 ? lerp(-.6, -.42, q / .25) : q < .5 ? -.42 : lerp(-.42, -.1, (q - .5) / .5); c.fillStyle = k.f; c.beginPath(); c.arc(px, py, .028, 0, TAU); c.fill(); }
    const lvl = v[2] * 2.0 * fill, vh = .78, vy = .08; rr(c, x - .28, vy, .56, vh, .08); c.fillStyle = rgba(k.f, .06); c.fill(); c.save(); rr(c, x - .28, vy, .56, vh, .08); c.clip(); const top = vy + vh - Math.min(vh, lvl * vh * 1.0); const wg = c.createLinearGradient(0, top, 0, vy + vh); wg.addColorStop(0, rgba(k.a, .85)); wg.addColorStop(1, rgba(k.a, .35)); c.fillStyle = wg; c.beginPath(); c.moveTo(x - .3, vy + vh + .02); for (let s = 0; s <= 10; s++) c.lineTo(x - .3 + s * .06, top + Math.sin(t * 3 + s * 1 + i) * .012); c.lineTo(x + .3, vy + vh + .02); c.closePath(); c.fill(); c.restore(); c.lineWidth = .035; c.strokeStyle = k.a; rr(c, x - .28, vy, .56, vh, .08); c.stroke();
    icon(g, v[0], x, -.02, .1, k.f, .2); txt(g, Math.round(v[2] * 100 * fill) + '%', x, vy + vh * .5, .16, lvl > .24 ? k.b : k.f, { mono: 1, w: 800 }); txt(g, v[1], x, vy + vh + .1, .09, rgba(k.f, .75), { w: 700 }); });
});

/* ---------- Референдум: «за» и «против» ---------- */
reg('pol_referendum', 'Референдум · за / против', 'scene', 1.55, (g, t) => {
  const c = g.c, k = g.k, share = .5 + .12 * Math.sin(t * .9) + .06 * Math.sin(t * 2.3 + 1), yes = share, lead = yes > .5 ? 0 : 1, pu = .5 + .5 * Math.sin(t * 5);
  [[-1, 'ЗА', k.a, 'check'], [1, 'ПРОТИВ', RED, 'cross']].forEach(([sd, nm, col, ic], i) => { const x = sd * .88, on = lead === i; if (on) gl(g, rgba(col, .6), .2 + .05 * pu); c.beginPath(); c.arc(x, -.2, .52 + (on ? .02 * pu : 0), 0, TAU); c.fillStyle = on ? col : rgba(col, .18); c.fill(); c.lineWidth = .05; c.strokeStyle = col; c.stroke(); ng(g); icon(g, ic, x, -.32, .26, on ? k.b : col, .2); txt(g, nm, x, -.02, .15, on ? k.b : col, { w: 900 });
    txt(g, Math.round((i ? 1 - yes : yes) * 100) + '%', x, .56, .3, on ? k.f : rgba(k.f, .6), { mono: 1, w: 800 }); });
  const bw = 2.7, bx = -bw / 2, by = .88; rr(c, bx, by - .1, bw, .2, .1); c.fillStyle = rgba(RED, .55); c.fill(); c.save(); rr(c, bx, by - .1, bw, .2, .1); c.clip(); c.fillStyle = k.a; c.fillRect(bx, by - .1, bw * yes, .2); c.restore(); c.fillStyle = k.f; c.fillRect(bx + bw * yes - .015, by - .17, .03, .34); c.setLineDash([.04, .04]); c.strokeStyle = rgba(k.f, .7); c.lineWidth = .02; c.beginPath(); c.moveTo(0, by - .2); c.lineTo(0, by + .2); c.stroke(); c.setLineDash([]);
});

/* ---------- Коалиция: три партии и общее большинство ---------- */
reg('pol_coalition', 'Коалиция · общее большинство', 'scene', 1.5, (g, t) => {
  const c = g.c, k = g.k, T = t % 7, mv = eo3(clamp((T - .3) / 2.4, 0, 1)), R = .58, sp = lerp(.95, .5, mv), P = [[-sp, .16, 'A', 41, k.a], [sp, .16, 'B', 33, mix(k.a, k.f, .65)], [0, -.5 * sp / .95 - .22, 'C', 27, rgba(k.f, .7)]].map(p => ({ x: p[0], y: p[1] - (p[2] === 'C' ? 0 : 0), l: p[2], n: p[3], col: p[4] }));
  P.forEach(p => { c.beginPath(); c.arc(p.x, p.y, R, 0, TAU); c.fillStyle = rgba(typeof p.col === 'string' && p.col[0] === '#' ? p.col : k.f, .22); c.fill(); });
  c.save(); c.beginPath(); c.arc(P[0].x, P[0].y, R, 0, TAU); c.clip(); c.beginPath(); c.arc(P[1].x, P[1].y, R, 0, TAU); c.clip(); c.beginPath(); c.arc(P[2].x, P[2].y, R, 0, TAU); c.clip(); const hg = c.createRadialGradient(0, 0, 0, 0, 0, .4); hg.addColorStop(0, rgba(k.a, .95)); hg.addColorStop(1, rgba(k.a, .5 + .3 * mv)); c.fillStyle = hg; c.fillRect(-1, -1, 2, 2); c.restore();
  P.forEach(p => { c.lineWidth = .04; c.strokeStyle = typeof p.col === 'string' && p.col[0] === '#' ? p.col : k.f; c.beginPath(); c.arc(p.x, p.y, R, 0, TAU); c.stroke(); });
  txt(g, 'А', P[0].x - .27 * (1 - mv * .3) - .12, P[0].y + .02, .17, k.f, { w: 900 }); txt(g, String(P[0].n), P[0].x - .39, P[0].y + .22, .13, k.f, { mono: 1, w: 800 }); txt(g, 'Б', P[1].x + .27 * (1 - mv * .3) + .12, P[1].y + .02, .17, k.f, { w: 900 }); txt(g, String(P[1].n), P[1].x + .39, P[1].y + .22, .13, k.f, { mono: 1, w: 800 }); txt(g, 'В', P[2].x, P[2].y - .3, .17, k.f, { w: 900 }); txt(g, String(P[2].n), P[2].x, P[2].y - .1, .13, k.f, { mono: 1, w: 800 });
  const tot = Math.round(P[0].n + P[1].n + P[2].n), ok = mv > .85; c.save(); c.globalAlpha = clamp(mv * 1.5, 0, 1); pill(g, 'ВМЕСТЕ ' + tot + ' ≥ 51', 0, .88, .11, ok ? k.b : k.f, ok ? k.a : rgba(k.f, .2), { mono: 1 }); c.restore();
});

/* ---------- Календарь выборов ---------- */
reg('pol_timeline', 'Календарь выборов', 'scene', 2.5, (g, t) => {
  const c = g.c, k = g.k, S = ['Регистрация', 'Кампания', 'Дебаты', 'Тишина', 'Голосование', 'Итоги'], n = S.length, xs = S.map((_, i) => -2.05 + i * (4.1 / (n - 1))), T = (t % 10) / 10 * (n + .2), pos = clamp(T, 0, n - 1);
  c.lineCap = 'round'; c.lineWidth = .06; c.strokeStyle = rgba(k.f, .16); c.beginPath(); c.moveTo(xs[0], .1); c.lineTo(xs[n - 1], .1); c.stroke(); gl(g, rgba(k.a, .6), .1); c.strokeStyle = k.a; c.beginPath(); c.moveTo(xs[0], .1); c.lineTo(lerp(xs[0], xs[n - 1], pos / (n - 1)), .1); c.stroke(); ng(g);
  S.forEach((s, i) => { const done = pos >= i, act = Math.abs(pos - i) < .5 && T < n; const r = act ? .17 + .02 * Math.sin(t * 6) : .12; if (act) gl(g, rgba(k.a, .8), .22); c.beginPath(); c.arc(xs[i], .1, r, 0, TAU); c.fillStyle = done ? k.a : k.b; c.fill(); c.lineWidth = .04; c.strokeStyle = done ? k.a : rgba(k.f, .4); c.stroke(); ng(g); const up = i % 2 === 0; txt(g, s, xs[i], up ? -.38 : .6, .14, act ? k.a : done ? k.f : rgba(k.f, .5), { w: 800 }); c.strokeStyle = rgba(done ? k.a : k.f, .35); c.lineWidth = .02; c.beginPath(); c.moveTo(xs[i], .1 + (up ? -r : r)); c.lineTo(xs[i], up ? -.2 : .45); c.stroke(); if (act) icon(g, ['doc', 'megaphone', 'mic', 'cross', 'ballot', 'chart'][i], xs[i], up ? -.72 : .93, .17, k.a, .15); });
});

/* ---------- Здание власти ---------- */
reg('pol_building', 'Здание власти', 'object', 1.4, (g, t) => {
  const c = g.c, k = g.k, T = t % 6, n = 6, base = .72, pw = .17, cols = Array.from({ length: n }, (_, i) => -1.0 + i * (2.0 / (n - 1)));
  const rise = i => eo3(clamp((T - .2 - i * .18) / .6, 0, 1));
  gl(g, rgba(k.a, .3), .12); cols.forEach((x, i) => { const h = (base + .2 - (-.22)) * rise(i), top = base - h; rr(c, x - pw / 2, top, pw, h, .03); const cg = c.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0); cg.addColorStop(0, rgba(k.a, .12)); cg.addColorStop(.5, rgba(k.a, .45)); cg.addColorStop(1, rgba(k.a, .12)); c.fillStyle = cg; c.fill(); c.lineWidth = .025; c.strokeStyle = k.a; c.stroke(); c.strokeStyle = rgba(k.f, .25); c.lineWidth = .015; [-.04, 0, .04].forEach(o => { c.beginPath(); c.moveTo(x + o, top + .04); c.lineTo(x + o, base - .02); c.stroke(); }); }); ng(g);
  const ped = eo3(clamp((T - 1.5) / .7, 0, 1)); c.save(); c.globalAlpha = ped; c.translate(0, -(1 - ped) * .3); c.beginPath(); c.moveTo(-1.35, -.24); c.lineTo(0, -.9); c.lineTo(1.35, -.24); c.closePath(); c.fillStyle = rgba(k.a, .2); c.fill(); c.lineWidth = .045; c.strokeStyle = k.a; c.stroke(); c.beginPath(); c.arc(0, -.45, .15, 0, TAU); c.strokeStyle = k.f; c.lineWidth = .03; c.stroke(); rr(c, -1.3, -.24, 2.6, .1, .02); c.fillStyle = rgba(k.a, .5); c.fill(); c.restore();
  [0, 1, 2].forEach(i => { rr(c, -1.25 - i * .08, base + .02 + i * .09, 2.5 + i * .16, .09, .02); c.fillStyle = rgba(k.a, .22 + i * .08); c.fill(); c.lineWidth = .02; c.strokeStyle = rgba(k.a, .6); c.stroke(); });
  c.save(); c.beginPath(); c.rect(-1.5, -1, 3, 2); c.clip(); const sx = ((t * .5) % 2.6) - 1.3, sg = c.createLinearGradient(sx - .18, 0, sx + .18, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.22)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sg; c.fillRect(-1.5, -1, 3, 2); c.restore();
  const fy = -.9, fl = eo3(clamp((T - 2.2) / .5, 0, 1)); c.strokeStyle = k.f; c.lineWidth = .03; c.beginPath(); c.moveTo(0, fy); c.lineTo(0, fy - .22 * fl); c.stroke(); if (fl > 0) { c.beginPath(); c.moveTo(0, fy - .22 * fl); const w = .3; c.bezierCurveTo(w * .4, fy - .26 * fl + Math.sin(t * 5) * .02, w * .7, fy - .16 * fl - Math.sin(t * 5) * .02, w, fy - .2 * fl); c.lineTo(w, fy - .08 * fl); c.bezierCurveTo(w * .7, fy - .04 * fl, w * .4, fy - .13 * fl, 0, fy - .09 * fl); c.closePath(); c.fillStyle = k.a; c.fill(); }
});

/* ---------- Иконки в круглых бейджах ---------- */
const ICON_NAMES = { columns: 'Здание власти', gavel: 'Молоток', scales: 'Весы', ballot: 'Урна', mic: 'Микрофон', megaphone: 'Мегафон', doc: 'Документ', stamp: 'Печать', people: 'Люди', coin: 'Деньги', check: 'Галочка', cross: 'Крест', chart: 'Диаграмма', flag: 'Флаг', bulb: 'Идея', pen: 'Подпись' };
Object.keys(ICON_NAMES).forEach(n => reg('pol_icon_' + n, 'Иконка · ' + ICON_NAMES[n], 'icon', 1, (g, t) => {
  const c = g.c, k = g.k, s = 1 + .03 * Math.sin(t * 2.4), col = n === 'cross' ? RED : k.a;
  for (let i = 0; i < 2; i++) { const p = (t * .5 + i * .5) % 1; c.strokeStyle = rgba(col, (1 - p) * .4); c.lineWidth = .025; c.beginPath(); c.arc(0, 0, .72 + p * .22, 0, TAU); c.stroke(); }
  c.save(); c.scale(s, s); gl(g, rgba(col, .6), .22); badge(g, 0, 0, .72, col, .12); ng(g);
  c.save(); c.setLineDash([.08, .1]); c.lineDashOffset = -t * .15; c.strokeStyle = rgba(col, .35); c.lineWidth = .02; c.beginPath(); c.arc(0, 0, .86, 0, TAU); c.stroke(); c.restore();
  const a = t * .8; c.fillStyle = '#fff'; c.beginPath(); c.arc(Math.cos(a) * .86, Math.sin(a) * .86, .035, 0, TAU); c.fill(); icon(g, n, 0, 0, .4, col, .11); c.restore();
}));

/* ---------- Анимированные фоны (приглушённые, чтобы текст читался) ---------- */
CFG.BG_IDS = ['pol_hemi', 'pol_bars', 'pol_columns', 'pol_ballots', 'pol_tiles', 'pol_spot'];
CFG.BG_NAMES = { pol_hemi: 'Политика · Полукруг', pol_bars: 'Политика · Рейтинги', pol_columns: 'Политика · Колоннады', pol_ballots: 'Политика · Бюллетени', pol_tiles: 'Политика · Карта-плитка', pol_spot: 'Политика · Прожекторы' };
BGS.pol_hemi = (c, t, W, H, k) => { // концентрические дуги мест, загорающихся волной
  const m = Math.min(W, H), cx = W / 2, cy = H * .66, rows = 9; for (let i = 0; i < rows; i++) { const r = m * (.22 + i * .075), n = Math.round(PI * r / (m * .035)); for (let j = 0; j < n; j++) { const a = PI + (j + .5) / n * PI, w = .5 + .5 * Math.sin(t * 1.4 - a * 2.2 + i * .35), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; c.save(); c.translate(x, y); c.rotate(a + PI / 2); c.fillStyle = rgba(w > .72 ? k.a : k.f, .05 + .2 * Math.pow(w, 3) * (w > .72 ? 1 : .3)); c.fillRect(-m * .011, -m * .009, m * .022, m * .018); c.restore(); } }
};
BGS.pol_bars = (c, t, W, H, k) => { // столбцы рейтингов растут и падают
  const m = Math.min(W, H), n = Math.round(W / (m * .09)), bw = W / n; for (let i = 0; i < n; i++) { const v = .22 + .5 * (.5 + .5 * Math.sin(t * .8 + i * 1.3 + hr(i, 2) * 6)), h = H * v * .6, hot = i === Math.floor(t * 1.2) % n; c.fillStyle = rgba(hot ? k.a : k.f, hot ? .22 : .06); c.fillRect(i * bw + bw * .12, H - h, bw * .76, h); c.fillStyle = rgba(k.a, hot ? .6 : .18); c.fillRect(i * bw + bw * .12, H - h, bw * .76, Math.max(2, m * .004)); }
};
BGS.pol_columns = (c, t, W, H, k) => { // колонны с лучами света
  const m = Math.min(W, H), n = Math.round(W / (m * .22)) + 1, cw = m * .09; for (let i = -1; i < n; i++) { const x = i * (W / (n - 1)) + Math.sin(t * .3 + i) * m * .01, g = c.createLinearGradient(x - cw, 0, x + cw, 0); g.addColorStop(0, rgba(k.f, 0)); g.addColorStop(.5, rgba(k.a, .1)); g.addColorStop(1, rgba(k.f, 0)); c.fillStyle = g; c.fillRect(x - cw, 0, cw * 2, H); c.fillStyle = rgba(k.f, .05); c.fillRect(x - cw * .5, 0, cw, H); }
  c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const a = -.5 + i * .5 + Math.sin(t * .4 + i) * .1, g = c.createLinearGradient(W / 2, 0, W / 2 + Math.sin(a) * H, H); g.addColorStop(0, rgba(k.a, .1)); g.addColorStop(1, rgba(k.a, 0)); c.fillStyle = g; c.beginPath(); c.moveTo(W / 2 - m * .02, 0); c.lineTo(W / 2 + m * .02, 0); c.lineTo(W / 2 + Math.sin(a) * H + m * .22, H); c.lineTo(W / 2 + Math.sin(a) * H - m * .22, H); c.closePath(); c.fill(); } c.restore();
};
BGS.pol_ballots = (c, t, W, H, k) => { // падающие бюллетени
  const m = Math.min(W, H), n = 16; for (let i = 0; i < n; i++) { const sp = .05 + hr(i, 1) * .06, y = ((t * sp + hr(i, 2)) % 1.2 - .1) * H, x = hr(i, 3) * W + Math.sin(t * .8 + i) * m * .03, s = m * (.05 + hr(i, 4) * .05), a = Math.sin(t * .9 + i * 2) * .5; c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = rgba(k.f, .06 + hr(i, 5) * .06); c.fillRect(-s * .5, -s * .65, s, s * 1.3); c.strokeStyle = rgba(k.a, .3); c.lineWidth = Math.max(1, m * .002); c.strokeRect(-s * .5, -s * .65, s, s * 1.3); c.beginPath(); c.moveTo(-s * .25, -s * .2); c.lineTo(-s * .1, -s * .05); c.lineTo(s * .22, -s * .4); c.stroke(); c.restore(); }
};
BGS.pol_tiles = (c, t, W, H, k) => { // плитки-«регионы» мерцают блоками
  const m = Math.min(W, H), s = m * .09, cols = Math.ceil(W / s) + 1, rows = Math.ceil(H / s) + 1; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const w = Math.sin(t * .7 + x * .6 + Math.sin(y * .5 + t * .3) * 2) + Math.cos(y * .8 - t * .5), on = w > 1.0, mid = w > .3; c.fillStyle = on ? rgba(k.a, .2) : mid ? rgba(k.f, .06) : rgba(k.f, .025); c.fillRect(x * s + 2, y * s + 2, s - 4, s - 4); }
};
BGS.pol_spot = (c, t, W, H, k) => { // сценические прожекторы
  c.save(); c.globalCompositeOperation = 'lighter'; const m = Math.min(W, H); for (let i = 0; i < 4; i++) { const bx = W * (.15 + i * .23), a = Math.sin(t * .6 + i * 1.7) * .5, tx = bx + Math.sin(a) * H * 1.1, g = c.createLinearGradient(bx, -m * .05, tx, H); g.addColorStop(0, rgba(i % 2 ? k.a : k.f, i % 2 ? .16 : .09)); g.addColorStop(1, rgba(i % 2 ? k.a : k.f, 0)); c.fillStyle = g; c.beginPath(); c.moveTo(bx - m * .015, -m * .05); c.lineTo(bx + m * .015, -m * .05); c.lineTo(tx + m * .2, H); c.lineTo(tx - m * .2, H); c.closePath(); c.fill(); } c.restore();
};

/* ---------- Тема и подбор рисунка ---------- */
CFG.global = 'PolitLib'; CFG.id = 'politics'; CFG.name = 'Политика';
CFG.STRONG = /политик|политич|выбор(?:ы|ов|ах|ам|ами)(?![а-яё])|избирател|избиратель|голосован|референдум|бюллетен|депутат|парламент|президент|премьер|правительств|министр|законопроект|госдум|сенат|конгресс|коалиц|оппозиц|митинг|протест(?:ы|ов|ующ)|кандидат|предвыборн|партии|партия|партий|дипломат|саммит|санкци|конституц|мэр(?![а-яё])|губернатор|реформ|налог|бюджет|политбюро|монархи|диктатур|демократи|автократи|выборн/g;
CFG.WEAK = /закон|власт|госуда|страна|стран[аыуе]|общество|гражданин|гражданск|права|решени|суд(?![а-яё])|договор|переговор|мнени|опрос|рейтинг|лидер|кампани|голос(?![а-яё])/g;
CFG.KW = [
  ['pol_referendum', /референдум|за или против|за и против|плебисцит/], ['pol_ballot', /бюллетен|урн[аыуе]|проголосу|явк/], ['pol_tilemap', /подсчёт|подсчет|итоги выбор|результат(?:ы)? выбор|регион/],
  ['pol_debate', /дебат|спор|полемик|кандидат[ыа]? (?:спор|выступ)|выступлен|трибун/], ['pol_coalition', /коалиц|альянс|объедин|большинств|союз/], ['pol_parliament', /парламент|депутат|госдум|сенат|конгресс|голосован|принима(?:ют|ет) закон/],
  ['pol_lawflow', /как принима|законопроект|процедур|этап|комитет/], ['pol_law', /закон|статья|кодекс|постановлен|указ|документ/], ['pol_gavel', /суд(?![а-яё])|судья|приговор|вердикт|председател/], ['pol_scales', /справедлив|правосуди|баланс|весы|право(?![а-яё])/],
  ['pol_rally', /митинг|протест|демонстрац|толп|народ|улиц/], ['pol_budget', /бюджет|налог|деньги|расход|финансир|экономи|субсиди|зарплат/], ['pol_summit', /саммит|переговор|дипломат|договор|соглашен|санкци|международ/],
  ['pol_poll', /опрос|рейтинг|социолог|мнение|процент|доверие|одобрен/], ['pol_timeline', /кампани|календар|этапы|регистрац|срок|дата/], ['pol_building', /власть|правительств|министр|президент|администрац|государств/]
];
CFG.POOL = ['pol_parliament', 'pol_debate', 'pol_ballot', 'pol_scales', 'pol_poll', 'pol_lawflow', 'pol_summit', 'pol_tilemap', 'pol_gavel', 'pol_coalition', 'pol_referendum', 'pol_budget', 'pol_building', 'pol_law', 'pol_rally', 'pol_timeline'];

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
