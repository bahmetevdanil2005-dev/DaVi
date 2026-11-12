/* ============================================================
   VPN LIBRARY v1.0 для VIDEO CREATE
   Анимированные фоны, модели устройств, схемы и иконки на тему VPN / интернета.
   Всё рисуется кодом на Canvas 2D, без картинок и внешних зависимостей.
   Результат зависит только от времени t (сек), поэтому годится и для превью, и для экспорта.

   API (window.VPNLib):
     BG_IDS, BG_NAMES, drawBg(ctx, id, t, W, H, col)          — анимированные фоны
     ART, ART_IDS, draw(ctx, id, box, t, col, appear)         — рисунки (модели, схемы, иконки)
     drawIcon(ctx, name, color, lineWidth)                    — одиночная линейная иконка (±1)
     isTopic(text)                                            — тема про VPN / интернет?
     plan(list, active)                                       — подбор рисунка для каждой сцены
     fitBox(L, W, H, ar)                                      — свободное место рядом с текстом
   col = { a: акцент, f: цвет текста, b: цвет фона, s: акцент для экранов устройств } (все #rrggbb)
   ============================================================ */
(function (root) {
'use strict';
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hr = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + 1.234) * 43758.5453; return x - Math.floor(x); };
const eo3 = t => 1 - Math.pow(1 - t, 3);
const eback = t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;
const RED = '#ff3b4e';
const MONO = "'JetBrains Mono',Menlo,Consolas,monospace", SANS = "Inter,system-ui,-apple-system,sans-serif";
const rgb = h => { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16) || 0; return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${clamp(a, 0, 1).toFixed(3)})`; };
const full = h => { h = String(h || ''); return /^#[0-9a-f]{3}$/i.test(h) ? '#' + h.slice(1).replace(/./g, '$&$&') : h; };
const mix = (h1, h2, k) => { const A = rgb(h1), B = rgb(h2); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
function pal(col) { col = col || {}; const a = full(col.a) || '#b6ff00', f = full(col.f) || '#ffffff', b = full(col.b) || '#0a0a0a'; return { a, f, b, s: full(col.s) || a }; }

/* ---------- общие помощники (локальные единицы: 1 = половина высоты рисунка) ---------- */
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const gl = (g, color, amt) => { g.c.shadowColor = color; g.c.shadowBlur = g.px * amt; };
const ng = g => { g.c.shadowBlur = 0; g.c.shadowColor = 'transparent'; };
function txt(g, s, x, y, size, color, o) {
  o = o || {}; const c = g.c; c.save(); c.translate(x, y); c.scale(.01, .01);
  c.font = `${o.w || 700} ${size * 100}px ${o.mono ? MONO : SANS}`; c.textAlign = o.al || 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(s, 0, 0); c.restore();
}
function shieldPath(c, s, oy) {
  s = s === undefined ? 1 : s; oy = oy || 0; c.beginPath(); c.moveTo(0, -s + oy);
  c.bezierCurveTo(.25 * s, -.82 * s + oy, .55 * s, -.72 * s + oy, .8 * s, -.72 * s + oy); c.lineTo(.8 * s, .05 * s + oy);
  c.bezierCurveTo(.8 * s, .55 * s + oy, .45 * s, .85 * s + oy, 0, s + oy); c.bezierCurveTo(-.45 * s, .85 * s + oy, -.8 * s, .55 * s + oy, -.8 * s, .05 * s + oy);
  c.lineTo(-.8 * s, -.72 * s + oy); c.bezierCurveTo(-.55 * s, -.72 * s + oy, -.25 * s, -.82 * s + oy, 0, -s + oy); c.closePath();
}

/* ---------- Иконки (линейные, вписаны в ±1) ---------- */
const ICON = {
  shield(c) { shieldPath(c, .92, 0); c.stroke(); },
  shieldcheck(c) { shieldPath(c, .92, 0); c.stroke(); c.beginPath(); c.moveTo(-.34, .02); c.lineTo(-.08, .3); c.lineTo(.38, -.24); c.stroke(); },
  lock(c) { rr(c, -.55, -.08, 1.1, .88, .14); c.stroke(); c.beginPath(); c.moveTo(-.33, -.08); c.lineTo(-.33, -.36); c.arc(0, -.36, .33, PI, 0); c.lineTo(.33, -.08); c.stroke(); c.beginPath(); c.arc(0, .3, .1, 0, TAU); c.fill(); c.beginPath(); c.moveTo(0, .3); c.lineTo(0, .52); c.stroke(); },
  key(c) { c.beginPath(); c.arc(-.5, 0, .3, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-.2, 0); c.lineTo(.85, 0); c.moveTo(.5, 0); c.lineTo(.5, .28); c.moveTo(.72, 0); c.lineTo(.72, .22); c.stroke(); c.beginPath(); c.arc(-.5, 0, .08, 0, TAU); c.fill(); },
  wifi(c) { c.beginPath(); c.arc(0, .5, .08, 0, TAU); c.fill(); [.35, .65, .95].forEach(r => { c.beginPath(); c.arc(0, .5, r, -PI * .75, -PI * .25); c.stroke(); }); },
  globe(c) { c.beginPath(); c.arc(0, 0, .8, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(0, 0, .34, .8, 0, 0, TAU); c.stroke(); [-.4, 0, .4].forEach(y => { const h = Math.sqrt(.64 - y * y); c.beginPath(); c.moveTo(-h, y); c.lineTo(h, y); c.stroke(); }); },
  bolt(c) { c.beginPath(); c.moveTo(.18, -.9); c.lineTo(-.5, .12); c.lineTo(-.04, .12); c.lineTo(-.18, .9); c.lineTo(.5, -.18); c.lineTo(.04, -.18); c.closePath(); c.stroke(); },
  eye_off(c) { c.beginPath(); c.moveTo(-.9, 0); c.quadraticCurveTo(0, -.85, .9, 0); c.quadraticCurveTo(0, .85, -.9, 0); c.stroke(); c.beginPath(); c.arc(0, 0, .27, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-.72, -.72); c.lineTo(.72, .72); c.stroke(); },
  server(c) { [-.78, .08].forEach(y => { rr(c, -.7, y, 1.4, .7, .1); c.stroke(); c.beginPath(); c.arc(-.45, y + .35, .07, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-.2, y + .35); c.lineTo(.5, y + .35); c.stroke(); }); c.beginPath(); c.moveTo(0, .78); c.lineTo(0, .95); c.stroke(); },
  phone(c) { rr(c, -.42, -.88, .84, 1.76, .15); c.stroke(); c.beginPath(); c.moveTo(-.12, -.68); c.lineTo(.12, -.68); c.moveTo(-.14, .68); c.lineTo(.14, .68); c.stroke(); },
  laptop(c) { rr(c, -.7, -.6, 1.4, .95, .08); c.stroke(); c.beginPath(); c.moveTo(-.92, .62); c.lineTo(.92, .62); c.moveTo(-.92, .62); c.lineTo(-.78, .35); c.moveTo(.92, .62); c.lineTo(.78, .35); c.stroke(); },
  tablet(c) { rr(c, -.78, -.58, 1.56, 1.16, .12); c.stroke(); c.beginPath(); c.arc(.62, 0, .035, 0, TAU); c.fill(); },
  tv(c) { rr(c, -.88, -.62, 1.76, 1.1, .1); c.stroke(); c.beginPath(); c.moveTo(-.4, .86); c.lineTo(.4, .86); c.moveTo(0, .48); c.lineTo(0, .86); c.stroke(); },
  pin(c) { c.beginPath(); c.moveTo(0, .92); c.bezierCurveTo(-.15, .55, -.62, .12, -.62, -.3); c.arc(0, -.3, .62, PI, 0); c.bezierCurveTo(.62, .12, .15, .55, 0, .92); c.closePath(); c.stroke(); c.beginPath(); c.arc(0, -.3, .22, 0, TAU); c.stroke(); },
  cloud(c) { c.beginPath(); c.arc(-.5, .18, .32, PI * .5, PI * 1.5); c.arc(-.05, -.12, .42, PI * 1.1, PI * 1.9); c.arc(.48, .18, .32, PI * 1.5, PI * 2.5); c.closePath(); c.stroke(); },
  power(c) { c.beginPath(); c.arc(0, .08, .7, -PI / 2 + .65, -PI / 2 - .65 + TAU); c.stroke(); c.beginPath(); c.moveTo(0, -.85); c.lineTo(0, -.05); c.stroke(); },
  check(c) { c.beginPath(); c.moveTo(-.6, .05); c.lineTo(-.2, .45); c.lineTo(.6, -.4); c.stroke(); },
  block(c) { c.beginPath(); c.arc(0, 0, .75, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-.53, -.53); c.lineTo(.53, .53); c.stroke(); },
  warn(c) { c.beginPath(); c.moveTo(0, -.8); c.lineTo(.85, .65); c.lineTo(-.85, .65); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(0, -.25); c.lineTo(0, .17); c.stroke(); c.beginPath(); c.arc(0, .43, .05, 0, TAU); c.fill(); }
};
function drawIcon(c, name, color, lw) {
  if (!ICON[name]) return; c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = lw || .12; c.lineCap = 'round'; c.lineJoin = 'round'; ICON[name](c); c.restore();
}
const icon = (g, name, x, y, s, color, lw) => { g.c.save(); g.c.translate(x, y); g.c.scale(s, s); drawIcon(g.c, name, color, lw || .12); g.c.restore(); };
function badge(g, x, y, r, color, fa) { const c = g.c; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = rgba(color, fa === undefined ? .1 : fa); c.fill(); c.lineWidth = .035; c.strokeStyle = rgba(color, .85); c.stroke(); }

/* ---------- Карта мира (грубая растровая заготовка 40×20, шаг 9°) и города ---------- */
const LAND = { 1: [[14, 17], [26, 38]], 2: [[3, 12], [14, 17], [21, 23], [24, 39]], 3: [[2, 13], [20, 39]], 4: [[3, 12], [19, 38]], 5: [[4, 12], [19, 37]], 6: [[5, 11], [19, 37]], 7: [[6, 10], [18, 26], [27, 28], [29, 31], [33, 35]], 8: [[8, 10], [11, 15], [18, 27], [29, 30], [33, 35]], 9: [[11, 15], [19, 26], [33, 37]], 10: [[11, 16], [20, 26], [33, 37]], 11: [[11, 16], [21, 26], [33, 36]], 12: [[12, 15], [21, 26], [32, 37]], 13: [[12, 14], [22, 25], [32, 37]], 14: [[12, 14], [34, 36], [38, 39]], 15: [[12, 13]], 16: [[12, 12]] };
function isLand(lat, lon) { const r = Math.floor((90 - lat) / 9), c = Math.floor((lon + 180) / 9), row = LAND[r]; if (!row) return false; for (const s of row) if (c >= s[0] && c <= s[1]) return true; return false; }
const CITIES = [['US', 40.7, -74], ['GB', 51.5, -.1], ['DE', 50.1, 8.7], ['AE', 25.2, 55.3], ['SG', 1.3, 103.8], ['JP', 35.7, 139.7], ['BR', -23.5, -46.6], ['AU', -33.9, 151.2], ['US', 34, -118]];
const ARCS = [[0, 1], [2, 4], [4, 5], [8, 0], [1, 3], [5, 7], [6, 0]];
const vec = (lat, lon) => { const la = lat * PI / 180, lo = lon * PI / 180; return [Math.cos(la) * Math.sin(lo), -Math.sin(la), Math.cos(la) * Math.cos(lo)]; };
function view(v, rot, tilt) { const cr = Math.cos(rot), sr = Math.sin(rot), x = v[0] * cr + v[2] * sr, z = -v[0] * sr + v[2] * cr, y = v[1], ct = Math.cos(tilt), st = Math.sin(tilt); return [x, y * ct + z * st, -y * st + z * ct]; }
function poly(c, R, rot, tilt, fn, n) { let pen = false; c.beginPath(); for (let i = 0; i < n; i++) { const q = fn(i), p = view(vec(q[0], q[1]), rot, tilt); if (p[2] > 0) { if (pen) c.lineTo(p[0] * R, p[1] * R); else { c.moveTo(p[0] * R, p[1] * R); pen = true; } } else pen = false; } c.stroke(); }

function drawGlobe(c, cx, cy, R, rot, tilt, k, o, t) {
  o = o || {}; const A = o.a === undefined ? 1 : o.a; const u = 1 / (Math.abs(c.getTransform().a) || 1); c.save(); c.translate(cx, cy);
  const g = c.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R); g.addColorStop(0, rgba(k.a, .18 * A)); g.addColorStop(1, rgba(k.a, .02 * A));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.lineWidth = Math.max(u, R * .018); c.strokeStyle = rgba(k.a, .55 * A); c.stroke();
  c.lineWidth = Math.max(u * .6, R * .006); c.strokeStyle = rgba(k.a, .15 * A);
  for (let la = -60; la <= 60; la += 30) poly(c, R, rot, tilt, i => [la, -180 + i * 10], 37);
  for (let lo = -180; lo < 180; lo += 30) poly(c, R, rot, tilt, i => [-90 + i * 10, lo], 19);
  for (let la = -84; la <= 84; la += 6) {
    const st = Math.max(6, 6 / Math.cos(la * PI / 180));
    for (let lo = -180; lo < 180; lo += st) {
      if (!isLand(la, lo)) continue; const p = view(vec(la, lo), rot, tilt); if (p[2] <= .02) continue;
      c.fillStyle = rgba(k.a, (.2 + .6 * p[2]) * A); c.beginPath(); c.arc(p[0] * R, p[1] * R, R * .016 * (.6 + .5 * p[2]), 0, TAU); c.fill();
    }
  }
  if (o.arcs) ARCS.forEach((pr, ai) => {
    const a1 = vec(CITIES[pr[0]][1], CITIES[pr[0]][2]), b1 = vec(CITIES[pr[1]][1], CITIES[pr[1]][2]), om = Math.acos(clamp(a1[0] * b1[0] + a1[1] * b1[1] + a1[2] * b1[2], -1, 1)), sa = Math.sin(om) || 1, N = 28, pts = [];
    c.beginPath(); let pen = false;
    for (let s = 0; s <= N; s++) {
      const u = s / N, f1 = Math.sin((1 - u) * om) / sa, f2 = Math.sin(u * om) / sa, lift = 1 + .22 * Math.sin(PI * u) * Math.min(1, om);
      const p = view([(a1[0] * f1 + b1[0] * f2) * lift, (a1[1] * f1 + b1[1] * f2) * lift, (a1[2] * f1 + b1[2] * f2) * lift], rot, tilt); pts.push(p);
      if (p[2] > .02) { if (pen) c.lineTo(p[0] * R, p[1] * R); else { c.moveTo(p[0] * R, p[1] * R); pen = true; } } else pen = false;
    }
    c.lineWidth = Math.max(u, R * .012); c.strokeStyle = rgba(k.a, .6 * A); c.stroke();
    const q = pts[Math.floor(((t * .3 + ai * .21) % 1) * N)];
    if (q && q[2] > .05) { c.fillStyle = rgba(k.f, .95 * A); c.shadowColor = k.a; c.shadowBlur = R * .12; c.beginPath(); c.arc(q[0] * R, q[1] * R, R * .028, 0, TAU); c.fill(); c.shadowBlur = 0; }
  });
  if (o.pins) CITIES.forEach((ct, i) => {
    const p = view(vec(ct[1], ct[2]), rot, tilt); if (p[2] < .08) return; const rp = (t * .7 + i * .37) % 1;
    c.fillStyle = rgba(k.a, A); c.beginPath(); c.arc(p[0] * R, p[1] * R, R * .03, 0, TAU); c.fill();
    c.lineWidth = Math.max(u, R * .008); c.strokeStyle = rgba(k.a, (1 - rp) * .7 * A); c.beginPath(); c.arc(p[0] * R, p[1] * R, R * (.03 + .08 * rp), 0, TAU); c.stroke();
  });
  c.restore();
}
const ll2xy = (lat, lon, x, y, w, h) => [x + (lon + 180) / 360 * w, y + (90 - lat) / 180 * h];
function drawMap(c, x, y, w, h, k, t, o) {
  o = o || {}; const cols = 64, rows = 32, cw = w / cols, ch = h / rows, rad = Math.min(cw, ch) * .36;
  c.fillStyle = rgba(k.s, .42 * (o.a === undefined ? 1 : o.a)); c.beginPath();
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { if (!isLand(90 - (r + .5) * 180 / rows, -180 + (q + .5) * 360 / cols)) continue; const px = x + (q + .5) * cw, py = y + (r + .5) * ch; c.moveTo(px + rad, py); c.arc(px, py, rad, 0, TAU); }
  c.fill();
  if (o.route) {
    const A = ll2xy(CITIES[o.route[0]][1], CITIES[o.route[0]][2], x, y, w, h), B = ll2xy(CITIES[o.route[1]][1], CITIES[o.route[1]][2], x, y, w, h), cx = (A[0] + B[0]) / 2, cy = Math.min(A[1], B[1]) - h * .35;
    c.lineWidth = h * .014; c.strokeStyle = rgba(k.s, .8); c.beginPath(); c.moveTo(A[0], A[1]); c.quadraticCurveTo(cx, cy, B[0], B[1]); c.stroke();
    const u = (t * .35) % 1, bx = (1 - u) * (1 - u) * A[0] + 2 * (1 - u) * u * cx + u * u * B[0], by = (1 - u) * (1 - u) * A[1] + 2 * (1 - u) * u * cy + u * u * B[1];
    c.fillStyle = '#fff'; c.shadowColor = k.s; c.shadowBlur = h * .08; c.beginPath(); c.arc(bx, by, h * .022, 0, TAU); c.fill(); c.shadowBlur = 0;
    [A, B].forEach((p, i) => { const rp = (t * .6 + i * .5) % 1; c.fillStyle = k.s; c.beginPath(); c.arc(p[0], p[1], h * .03, 0, TAU); c.fill(); c.strokeStyle = rgba(k.s, (1 - rp) * .8); c.lineWidth = h * .012; c.beginPath(); c.arc(p[0], p[1], h * (.03 + .08 * rp), 0, TAU); c.stroke(); });
  }
}

/* ---------- Детали устройств ---------- */
function phoneBody(g, t) {
  const c = g.c, k = g.k, T = t % 7, cf = T < 1.6 ? 0 : T < 2 ? (T - 1.6) / .4 : T < 6.2 ? 1 : Math.max(0, 1 - (T - 6.2) / .5), grey = '#8b97a3';
  gl(g, rgba(k.s, .45), .22); rr(c, -.49, -1, .98, 2, .16); c.fillStyle = '#161b21'; c.fill(); ng(g); c.lineWidth = .03; c.strokeStyle = rgba(k.s, .55); c.stroke();
  const sg = c.createLinearGradient(0, -.95, 0, .95); sg.addColorStop(0, '#0f1822'); sg.addColorStop(1, '#05080c'); rr(c, -.44, -.95, .88, 1.9, .12); c.fillStyle = sg; c.fill();
  c.save(); rr(c, -.44, -.95, .88, 1.9, .12); c.clip();
  const rg = c.createRadialGradient(0, -.12, 0, 0, -.12, .8); rg.addColorStop(0, rgba(k.s, .05 + .28 * cf)); rg.addColorStop(1, rgba(k.s, 0)); c.fillStyle = rg; c.fillRect(-.5, -1, 1, 2);
  c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 3; i++) { rr(c, .2 + i * .045, -.84 - i * .012, .03, .04 + i * .012, .008); c.fill(); }
  rr(c, -.11, -.9, .22, .065, .032); c.fillStyle = '#000'; c.fill(); txt(g, 'VPN', 0, -.68, .12, '#fff', { w: 800 });
  const cy = -.12, R = .34; c.beginPath(); c.arc(0, cy, R, 0, TAU); c.fillStyle = rgba(k.s, .07 + .12 * cf); c.fill(); c.lineWidth = .04; c.lineCap = 'round';
  if (T < 1.6) { c.strokeStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.arc(0, cy, R, 0, TAU); c.stroke(); c.strokeStyle = k.s; c.beginPath(); c.arc(0, cy, R, T * 5, T * 5 + 1.4); c.stroke(); }
  else { c.strokeStyle = mix('#59636e', k.s, cf); c.beginPath(); c.arc(0, cy, R, 0, TAU); c.stroke(); }
  if (cf >= 1) for (let i = 0; i < 2; i++) { const p = ((T - 2) * .6 + i * .5) % 1; c.strokeStyle = rgba(k.s, (1 - p) * .4); c.lineWidth = .02; c.beginPath(); c.arc(0, cy, R + .13 * p, 0, TAU); c.stroke(); }
  icon(g, cf > .5 ? 'shieldcheck' : 'shield', 0, cy, .17, mix(grey, k.s, cf), .14);
  txt(g, T < 1.6 ? 'ПОДКЛЮЧЕНИЕ' : cf > .5 ? 'ЗАЩИЩЕНО' : 'ОТКЛЮЧЕНО', 0, .37, .075, mix(grey, k.s, cf));
  rr(c, -.36, .46, .72, .2, .06); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill(); icon(g, 'pin', -.27, .56, .06, grey, .2); txt(g, 'DE · Frankfurt', -.18, .56, .06, '#cfd8df', { al: 'left', w: 600 });
  for (let i = 0; i < 3; i++) { c.fillStyle = i < 1 + Math.round(cf * 2) ? k.s : 'rgba(255,255,255,.2)'; rr(c, .22 + i * .045, .585 - i * .02, .03, .03 + i * .02, .008); c.fill(); }
  rr(c, -.17, .78, .34, .12, .06); c.fillStyle = mix('#2a323b', k.s, cf); c.fill(); c.beginPath(); c.arc(-.11 + .22 * cf, .84, .045, 0, TAU); c.fillStyle = '#fff'; c.fill();
  rr(c, -.1, .92, .2, .014, .007); c.fillStyle = 'rgba(255,255,255,.4)'; c.fill(); c.restore();
}
function serverBody(g, t) {
  const c = g.c, k = g.k; gl(g, rgba(k.s, .35), .15);
  [-.95, -.3, .35].forEach((y, r) => {
    rr(c, -.8, y, 1.6, .56, .09); c.fillStyle = '#141a20'; c.fill(); ng(g); c.lineWidth = .028; c.strokeStyle = rgba(k.s, .6); c.stroke();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-.6 + i * .15, y + .28, .045, 0, TAU); c.fillStyle = hr(r * 3 + i, Math.floor(t * 4)) > .35 ? k.s : '#2b3640'; c.fill(); }
    for (let i = 0; i < 3; i++) { rr(c, -.1 + i * .22, y + .17, .17, .22, .03); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill(); }
    if (r === 0) icon(g, 'lock', .62, y + .28, .17, k.s, .15);
  });
  c.strokeStyle = rgba(k.s, .6); c.lineWidth = .03; c.beginPath(); c.moveTo(-.4, .91); c.lineTo(-.4, 1); c.moveTo(.4, .91); c.lineTo(.4, 1); c.stroke();
}

/* ---------- Рисунки ---------- */
const ART = {};
const ART_IDS = [];
function reg(id, name, group, ar, draw) { ART[id] = { id, name, group, ar, draw }; ART_IDS.push(id); }

reg('phone', 'Смартфон с VPN', 'device', .5, (g, t) => phoneBody(g, t));

reg('laptop', 'Ноутбук с VPN', 'device', 1.5, (g, t) => {
  const c = g.c, k = g.k; gl(g, rgba(k.s, .4), .2); rr(c, -1.15, -.9, 2.3, 1.45, .1); c.fillStyle = '#161b21'; c.fill(); ng(g); c.lineWidth = .03; c.strokeStyle = rgba(k.s, .55); c.stroke();
  const sx = -1.07, sy = -.82, sw = 2.14, sh = 1.29, gr = c.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, '#0f1822'); gr.addColorStop(1, '#05080c');
  rr(c, sx, sy, sw, sh, .05); c.fillStyle = gr; c.fill(); c.save(); rr(c, sx, sy, sw, sh, .05); c.clip();
  drawMap(c, sx + .1, sy + .24, sw - .2, sh - .4, k, t, { route: [2, 0] });
  rr(c, sx + .08, sy + .06, .78, .13, .05); c.fillStyle = rgba(k.s, .18); c.fill(); c.beginPath(); c.arc(sx + .16, sy + .125, .03, 0, TAU); c.fillStyle = k.s; c.fill(); txt(g, 'VPN: ПОДКЛЮЧЕНО', sx + .22, sy + .125, .06, '#e8eef2', { al: 'left' });
  c.restore(); rr(c, -1.5, .55, 3, .17, .08); c.fillStyle = '#1d242c'; c.fill(); c.lineWidth = .02; c.strokeStyle = rgba(k.s, .4); c.stroke(); rr(c, -.25, .55, .5, .06, .03); c.fillStyle = '#0e1318'; c.fill();
});

reg('router', 'Wi-Fi роутер', 'device', 1.5, (g, t) => {
  const c = g.c, k = g.k;
  for (let i = 0; i < 3; i++) { const p = (t * .5 + i / 3) % 1, r = .3 + p * .75; c.strokeStyle = rgba(k.s, (1 - p) * .8); c.lineWidth = .05; c.beginPath(); c.arc(0, -.05, r, -PI * .85, -PI * .15); c.stroke(); }
  gl(g, rgba(k.s, .4), .15); c.lineCap = 'round';
  [[-.9, -1], [.9, 1]].forEach(a => { c.strokeStyle = '#1d242c'; c.lineWidth = .11; c.beginPath(); c.moveTo(a[0], .25); c.lineTo(a[0] + a[1] * .22, -.65); c.stroke(); c.strokeStyle = rgba(k.s, .6); c.lineWidth = .025; c.stroke(); c.beginPath(); c.arc(a[0] + a[1] * .22, -.65, .06, 0, TAU); c.fillStyle = k.s; c.fill(); });
  rr(c, -1.25, .2, 2.5, .62, .15); c.fillStyle = '#161b21'; c.fill(); ng(g); c.lineWidth = .03; c.strokeStyle = rgba(k.s, .6); c.stroke();
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-.9 + i * .26, .51, .05, 0, TAU); c.fillStyle = hr(i, Math.floor(t * 3)) > .3 ? k.s : '#2b3640'; c.fill(); }
  icon(g, 'shield', .9, .51, .2, k.s, .15); rr(c, -.2, .46, .8, .1, .05); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill();
  c.strokeStyle = rgba(k.s, .5); c.lineWidth = .04; c.beginPath(); c.moveTo(.3, .82); c.quadraticCurveTo(.3, .98, .7, .98); c.lineTo(1.5, .98); c.stroke(); c.fillStyle = '#fff';
  for (let i = 0; i < 3; i++) { const u = (t * .4 + i / 3) % 1; c.beginPath(); c.arc(.5 + u, .98, .03, 0, TAU); c.fill(); }
});

reg('server', 'VPN-сервер', 'device', .9, (g, t) => {
  const c = g.c, k = g.k;
  for (let i = 0; i < 2; i++) { const p = (t * .4 + i * .5) % 1; c.strokeStyle = rgba(k.s, (1 - p) * .5); c.lineWidth = .03; rr(c, -.8 - p * .08, -.95 - p * .08, 1.6 + p * .16, 1.9 + p * .16, .1); c.stroke(); }
  serverBody(g, t);
});

reg('vpn_flow', 'Схема VPN-туннеля', 'scheme', 2.6, (g, t) => {
  const c = g.c, k = g.k, x0 = -1.75, x1 = .55, th = .3;
  c.save(); c.translate(-2.2, 0); c.scale(.6, .6); phoneBody(g, t); c.restore();
  c.save(); c.translate(1.0, 0); c.scale(.5, .5); serverBody(g, t); c.restore();
  const gx = 2.2; badge(g, gx, 0, .38, k.a, .08); icon(g, 'globe', gx, 0, .24, k.a, .12);
  // открытый интернет и «наблюдатель»
  c.save(); c.setLineDash([.07, .09]); c.lineDashOffset = -t * .2; c.strokeStyle = rgba(k.f, .3); c.lineWidth = .025; c.beginPath(); c.moveTo(-2.0, -.62); c.quadraticCurveTo(0, -1.45, 2.0, -.62); c.stroke(); c.restore();
  const bl = (t % 3) < .25 ? .3 : 1; icon(g, 'eye_off', 0, -.88, .17, rgba(RED, bl), .14); c.save(); c.globalAlpha = .9; c.strokeStyle = RED; c.lineWidth = .025; c.beginPath(); c.moveTo(-.16, -.99); c.lineTo(.16, -.77); c.stroke(); c.restore();
  // туннель
  const tg = c.createLinearGradient(x0, 0, x1, 0); tg.addColorStop(0, rgba(k.a, .05)); tg.addColorStop(.5, rgba(k.a, .16)); tg.addColorStop(1, rgba(k.a, .05));
  gl(g, rgba(k.a, .55), .16); rr(c, x0, -th, x1 - x0, th * 2, th); c.fillStyle = tg; c.fill(); c.lineWidth = .035; c.strokeStyle = rgba(k.a, .9); c.stroke(); ng(g);
  c.save(); rr(c, x0, -th, x1 - x0, th * 2, th); c.clip(); c.strokeStyle = rgba(k.a, .25); c.lineWidth = .03;
  for (let i = 0; i < 9; i++) { const x = x0 + ((t * .55 + i / 9) % 1) * (x1 - x0); c.beginPath(); c.moveTo(x - .05, -.17); c.lineTo(x + .03, 0); c.lineTo(x - .05, .17); c.stroke(); } c.restore();
  // пакеты: до туннеля и после сервера открыты, внутри туннеля зашифрованы
  const n = 6, xa = -1.9, xb = 1.85;
  for (let i = 0; i < n; i++) {
    const p = (t * .26 + i / n) % 1, x = xa + p * (xb - xa), enc = x > x0 + .04 && x < x1 - .02, s = .13;
    if (enc) { gl(g, rgba(k.a, .8), .12); rr(c, x - s, -s, s * 2, s * 2, .05); c.fillStyle = k.a; c.fill(); ng(g); icon(g, 'lock', x, 0, .09, k.b, .22); }
    else { rr(c, x - s, -s, s * 2, s * 2, .05); c.fillStyle = rgba(k.f, .08); c.fill(); c.lineWidth = .025; c.strokeStyle = rgba(k.f, .75); c.stroke(); c.lineWidth = .02; c.beginPath(); c.moveTo(x - .07, -.04); c.lineTo(x + .07, -.04); c.moveTo(x - .07, .04); c.lineTo(x + .03, .04); c.stroke(); }
    [x0, x1].forEach(ex => { const d = Math.abs(x - ex); if (d < .16) { c.strokeStyle = rgba(k.a, (1 - d / .16) * .8); c.lineWidth = .03; c.beginPath(); c.arc(ex, 0, .1 + d * 1.2, 0, TAU); c.stroke(); } });
  }
  txt(g, 'ЗАШИФРОВАНО', (x0 + x1) / 2, .5, .1, k.a); txt(g, 'ОТКРЫТО', 1.55, .62, .08, rgba(k.f, .6)); txt(g, 'ОТКРЫТО', -2.2, .86, .08, rgba(k.f, .0));
});

reg('globe', 'Глобус и серверы', 'scheme', 1, (g, t) => {
  const c = g.c, k = g.k; c.save(); c.translate(0, 0); c.rotate(-.35); c.strokeStyle = rgba(k.a, .3); c.lineWidth = .02; c.setLineDash([.05, .06]); c.beginPath(); c.ellipse(0, 0, 1, .3, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  const a = t * .8; c.fillStyle = '#fff'; c.shadowColor = k.a; c.shadowBlur = g.px * .1; c.beginPath(); c.arc(Math.cos(a) * 1, Math.sin(a) * .3, .035, 0, TAU); c.fill(); c.shadowBlur = 0; c.restore();
  gl(g, rgba(k.a, .35), .2); drawGlobe(c, 0, 0, .78, t * .5, .32, k, { arcs: true, pins: true }, t); ng(g);
});

reg('shield', 'Щит защиты', 'icon', .95, (g, t) => {
  const c = g.c, k = g.k, S = .78;
  for (let i = 0; i < 3; i++) { const p = (t * .5 + i / 3) % 1; shieldPath(c, S + p * .22, 0); c.strokeStyle = rgba(k.a, (1 - p) * .45); c.lineWidth = .025; c.stroke(); }
  const fg = c.createLinearGradient(0, -S, 0, S); fg.addColorStop(0, rgba(k.a, .32)); fg.addColorStop(1, rgba(k.a, .06));
  gl(g, rgba(k.a, .6), .25); shieldPath(c, S, 0); c.fillStyle = fg; c.fill(); c.lineWidth = .045; c.strokeStyle = k.a; c.stroke(); ng(g);
  c.save(); shieldPath(c, S, 0); c.clip();
  c.strokeStyle = rgba(k.a, .12); c.lineWidth = .015; for (let i = -6; i < 7; i++) { c.beginPath(); c.moveTo(i * .22, -1); c.lineTo(i * .22 + .5, 1); c.moveTo(i * .22, -1); c.lineTo(i * .22 - .5, 1); c.stroke(); }
  const y = -S + ((t * .55) % 1.3) * S * 1.9, sg = c.createLinearGradient(0, y - .22, 0, y + .02); sg.addColorStop(0, rgba(k.a, 0)); sg.addColorStop(1, rgba(k.a, .4)); c.fillStyle = sg; c.fillRect(-1, y - .22, 2, .24); c.restore();
  gl(g, rgba(k.a, .8), .2); icon(g, 'lock', 0, .02, .34, k.a, .17); ng(g);
  [-150, -30, 150, 30].forEach((d, i) => {
    const p = (t * .45 + i * .27) % 1, a = d * PI / 180, ux = Math.cos(a), uy = Math.sin(a) * .75;
    if (p < .72) { const r = 1.15 - (p / .72) * .5, x = ux * r, y2 = uy * r; c.fillStyle = RED; c.shadowColor = RED; c.shadowBlur = g.px * .08; c.beginPath(); c.arc(x, y2, .05, 0, TAU); c.fill(); c.shadowBlur = 0; }
    else { const q = (p - .72) / .28, x = ux * .65, y2 = uy * .65; c.strokeStyle = rgba(k.a, 1 - q); c.lineWidth = .025; for (let j = 0; j < 5; j++) { const aa = j / 5 * TAU; c.beginPath(); c.moveTo(x + Math.cos(aa) * .04, y2 + Math.sin(aa) * .04); c.lineTo(x + Math.cos(aa) * (.04 + q * .14), y2 + Math.sin(aa) * (.04 + q * .14)); c.stroke(); } }
  });
});

reg('lock_pad', 'Замок', 'icon', .8, (g, t) => {
  const c = g.c, k = g.k, T = t % 5, cl = T < 1.2 ? 0 : T < 1.6 ? eo3((T - 1.2) / .4) : T < 4.4 ? 1 : T < 4.8 ? 1 - eo3((T - 4.4) / .4) : 0, lift = (1 - cl) * .3, col = cl > .5 ? k.a : mix(k.a, RED, .55 * (1 - cl));
  gl(g, rgba(col, .6), .22); c.lineCap = 'round'; c.strokeStyle = col; c.lineWidth = .1; c.beginPath(); c.moveTo(-.36, -.05 - lift); c.lineTo(-.36, -.42 - lift); c.arc(0, -.42 - lift, .36, PI, 0); c.lineTo(.36, -.05 - lift - (1 - cl) * .0); c.stroke();
  const bg = c.createLinearGradient(0, -.05, 0, .95); bg.addColorStop(0, rgba(col, .35)); bg.addColorStop(1, rgba(col, .1)); rr(c, -.62, -.05, 1.24, 1.0, .16); c.fillStyle = bg; c.fill(); c.lineWidth = .045; c.strokeStyle = col; c.stroke(); ng(g);
  c.beginPath(); c.arc(0, .38, .1, 0, TAU); c.fillStyle = col; c.fill(); rr(c, -.035, .38, .07, .26, .03); c.fill();
  if (T >= 1.6 && T < 2.3) { const p = (T - 1.6) / .7; c.strokeStyle = rgba(k.a, (1 - p) * .8); c.lineWidth = .035; rr(c, -.62 - p * .3, -.05 - p * .3, 1.24 + p * .6, 1.0 + p * .6, .16 + p * .2); c.stroke(); }
  if (cl > .9) for (let i = 0; i < 4; i++) { const a = hr(i, 1) * TAU, r = .8 + .1 * Math.sin(t * 3 + i), s = .5 + .5 * Math.sin(t * 4 + i * 2); c.fillStyle = rgba(k.a, s * .8); c.beginPath(); c.arc(Math.cos(a) * r * .95, Math.sin(a) * r * .95 + .2, .025 + .02 * s, 0, TAU); c.fill(); }
});

reg('cipher', 'Шифрование данных', 'scheme', 1.7, (g, t) => {
  const c = g.c, k = g.k, LINES = ['LOGIN: ADMIN_01', 'PASS: QWERTY12345', 'CARD: 4242 4242 4242', 'MSG: HELLO, WORLD!', 'IP: 192.168.0.12'], HEX = '0123456789ABCDEF@#$%&', cw = .125;
  gl(g, rgba(k.s, .35), .15); rr(c, -1.6, -.95, 3.2, 1.9, .12); c.fillStyle = '#0b1015'; c.fill(); ng(g); c.lineWidth = .03; c.strokeStyle = rgba(k.s, .6); c.stroke();
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-1.45 + i * .14, -.8, .04, 0, TAU); c.fillStyle = i === 0 ? RED : i === 1 ? '#ffbd2e' : '#27c93f'; c.fill(); }
  txt(g, 'ENCRYPTION', 1.5, -.8, .09, rgba(k.s, .9), { al: 'right', mono: true });
  const p = (t * .4) % 1.5, sx = -1.4 + p * 2.9;
  c.save(); rr(c, -1.6, -.95, 3.2, 1.9, .12); c.clip();
  const sg = c.createLinearGradient(sx - .6, 0, sx, 0); sg.addColorStop(0, rgba(k.s, 0)); sg.addColorStop(1, rgba(k.s, .18)); c.fillStyle = sg; c.fillRect(sx - .6, -.95, .6, 1.9);
  LINES.forEach((ln, r) => {
    const y = -.5 + r * .27; for (let i = 0; i < ln.length; i++) {
      const x = -1.3 + i * cw; let ch = ln[i], col;
      if (x < sx - .03) { ch = HEX[Math.floor(hr(r * 31 + i, Math.floor(t * 8 + r)) * HEX.length)]; col = k.s; } else if (x < sx + .12) col = '#fff'; else col = 'rgba(214,221,228,.92)';
      if (ch !== ' ') txt(g, ch, x, y, .2, col, { mono: true, w: 700 });
    }
  });
  c.strokeStyle = k.s; c.lineWidth = .025; c.shadowColor = k.s; c.shadowBlur = g.px * .1; c.beginPath(); c.moveTo(sx, -.7); c.lineTo(sx, .95); c.stroke(); c.shadowBlur = 0; c.restore();
  if (sx > -1.5 && sx < 1.55) { badge(g, sx, -.62, .13, k.s, .3); icon(g, 'lock', sx, -.62, .08, k.s, .22); }
  txt(g, p > 1.0 ? 'ЗАШИФРОВАНО' : 'ШИФРУЮ…', -1.45, .82, .09, p > 1.0 ? k.s : 'rgba(214,221,228,.7)', { al: 'left' });
});

reg('eye_off', 'Слежка выключена', 'scheme', 1.3, (g, t) => {
  const c = g.c, k = g.k, T = t % 6, sl = T < 3 ? 0 : T < 3.6 ? eo3((T - 3) / .6) : T < 5.4 ? 1 : 1 - eo3((T - 5.4) / .6), col = mix(RED, k.a, sl);
  if (sl < .99) for (let i = 0; i < 3; i++) { c.save(); c.setLineDash([.06, .08]); c.lineDashOffset = -t * .3; c.strokeStyle = rgba(RED, .5 * (1 - sl)); c.lineWidth = .025; c.beginPath(); c.moveTo((i - 1) * .35, .5); c.lineTo((i - 1) * .75, 1); c.stroke(); c.restore(); }
  const eye = () => { c.beginPath(); c.moveTo(-1.15, -.05); c.quadraticCurveTo(0, -1.0, 1.15, -.05); c.quadraticCurveTo(0, .9, -1.15, -.05); c.closePath(); };
  gl(g, rgba(col, .55), .2); eye(); c.fillStyle = rgba(col, .08); c.fill(); c.lineWidth = .065; c.strokeStyle = col; c.lineJoin = 'round'; c.stroke(); ng(g);
  c.save(); eye(); c.clip(); const px = Math.sin(t * 1.4) * .38 * (1 - sl), py = -.05 + Math.sin(t * .9) * .1 * (1 - sl);
  c.beginPath(); c.arc(px, py, .38, 0, TAU); c.fillStyle = rgba(col, .35); c.fill(); c.lineWidth = .04; c.strokeStyle = col; c.stroke(); c.beginPath(); c.arc(px, py, .17, 0, TAU); c.fillStyle = col; c.fill(); c.beginPath(); c.arc(px - .07, py - .07, .04, 0, TAU); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill(); c.restore();
  if (sl > 0) { gl(g, rgba(k.a, .8), .15); c.lineCap = 'round'; c.strokeStyle = k.a; c.lineWidth = .1; c.beginPath(); c.moveTo(-.9, -.8); c.lineTo(-.9 + 1.8 * sl, -.8 + 1.6 * sl); c.stroke(); ng(g); }
});

reg('hacker', 'Хакер и защита', 'scheme', 1.1, (g, t) => {
  const c = g.c, k = g.k, dome = () => { c.beginPath(); c.ellipse(0, .22, .88, .72, 0, PI, TAU); };
  icon(g, 'wifi', 0, -.78, .2, rgba(k.f, .85), .13);
  let hit = 0; const tg = [130, 100, 70, 40];
  tg.forEach((d, i) => {
    const p = (t * .5 + i * .25) % 1, a = d * PI / 180, tx = Math.cos(a) * .88, ty = .22 - Math.sin(a) * .72, sx = 0, sy = -.62;
    if (p < .7) { const u = p / .7, x = lerp(sx, tx, u), y = lerp(sy, ty, u); c.fillStyle = RED; c.shadowColor = RED; c.shadowBlur = g.px * .08; rr(c, x - .05, y - .05, .1, .1, .02); c.fill(); c.shadowBlur = 0; }
    else { const q = (p - .7) / .3; hit = Math.max(hit, 1 - q); c.strokeStyle = rgba(k.a, 1 - q); c.lineWidth = .025; for (let j = 0; j < 5; j++) { const aa = j / 5 * TAU; c.beginPath(); c.moveTo(tx + Math.cos(aa) * .04, ty + Math.sin(aa) * .04); c.lineTo(tx + Math.cos(aa) * (.04 + q * .15), ty + Math.sin(aa) * (.04 + q * .15)); c.stroke(); } }
  });
  gl(g, rgba(k.a, .5 + .4 * hit), .15 + .15 * hit); dome(); c.fillStyle = rgba(k.a, .06 + .08 * hit); c.fill(); c.lineWidth = .045; c.strokeStyle = k.a; c.stroke(); ng(g);
  c.fillStyle = '#161b21'; c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = .025;
  c.beginPath(); c.moveTo(-.4, .62); c.bezierCurveTo(-.42, .08, -.3, -.2, 0, -.2); c.bezierCurveTo(.3, -.2, .42, .08, .4, .62); c.closePath(); c.fill(); c.stroke(); rr(c, -.6, .52, 1.2, .24, .1); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(0, .12, .21, .25, 0, 0, TAU); c.fillStyle = '#000'; c.fill(); const bl = (t % 3) < .15 ? .3 : 1;
  c.fillStyle = RED; c.shadowColor = RED; c.shadowBlur = g.px * .08; [-.09, .09].forEach(x => { c.beginPath(); c.ellipse(x, .1, .045, .035 * bl, 0, 0, TAU); c.fill(); }); c.shadowBlur = 0;
  rr(c, -.46, .5, .92, .3, .05); c.fillStyle = '#0d1116'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.2)'; c.stroke(); c.beginPath(); c.arc(0, .65, .04, 0, TAU); c.fillStyle = RED; c.fill();
});

reg('public_wifi', 'Публичный Wi-Fi', 'scheme', 1.2, (g, t) => {
  const c = g.c, k = g.k, T = t % 6, s = T < 2.6 ? 0 : T < 3.1 ? (T - 2.6) / .5 : T < 5.5 ? 1 : 1 - (T - 5.5) / .5, col = mix(RED, k.a, s);
  c.save(); c.translate(0, -.12);
  [.4, .75, 1.1].forEach((r, i) => { const pl = .45 + .55 * Math.max(0, Math.sin(t * 3 - i * .9)); c.lineCap = 'round'; c.lineWidth = .13; c.strokeStyle = rgba(col, pl); c.shadowColor = col; c.shadowBlur = g.px * .08 * pl; c.beginPath(); c.arc(0, .6, r, -PI * .78, -PI * .22); c.stroke(); });
  c.shadowBlur = 0; c.beginPath(); c.arc(0, .6, .1, 0, TAU); c.fillStyle = col; c.fill(); c.restore();
  const bx = .78, by = .52; c.beginPath(); c.arc(bx, by, .34, 0, TAU); c.fillStyle = '#0c1116'; c.fill(); c.lineWidth = .05; c.strokeStyle = col; c.stroke();
  c.save(); c.globalAlpha *= 1 - s; icon(g, 'warn', bx, by - .01, .2, RED, .14); c.restore(); c.save(); c.globalAlpha *= s; icon(g, 'shieldcheck', bx, by, .2, k.a, .14); c.restore();
  c.save(); c.globalAlpha *= 1 - s; txt(g, 'ОТКРЫТАЯ СЕТЬ', 0, .93, .12, RED); c.restore(); c.save(); c.globalAlpha *= s; txt(g, 'VPN ЗАЩИЩАЕТ', 0, .93, .12, k.a); c.restore();
});

reg('speed', 'Скорость', 'scheme', 1.2, (g, t) => {
  const c = g.c, k = g.k, T = t % 5, v0 = T < 2.2 ? eo3(T / 2.2) : T < 4.4 ? 1 : 1 - eo3((T - 4.4) / .6), v = clamp(.1 + .82 * v0 + Math.sin(t * 9) * .012 * v0, 0, 1), cx = 0, cy = .45, R = .95;
  c.lineCap = 'round'; c.lineWidth = .14; c.strokeStyle = rgba(k.f, .14); c.beginPath(); c.arc(cx, cy, R, PI, TAU); c.stroke();
  gl(g, rgba(k.a, .6), .2); c.strokeStyle = k.a; c.beginPath(); c.arc(cx, cy, R, PI, PI + v * PI); c.stroke(); ng(g);
  c.lineWidth = .025; for (let i = 0; i <= 10; i++) { const a = PI + i / 10 * PI; c.strokeStyle = rgba(k.f, i / 10 <= v ? .9 : .35); c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - .2), cy + Math.sin(a) * (R - .2)); c.lineTo(cx + Math.cos(a) * (R - (i % 5 === 0 ? .32 : .27)), cy + Math.sin(a) * (R - (i % 5 === 0 ? .32 : .27))); c.stroke(); }
  const a = PI + v * PI; gl(g, rgba(k.a, .7), .12); c.strokeStyle = k.f; c.lineWidth = .06; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * (R - .3), cy + Math.sin(a) * (R - .3)); c.stroke(); ng(g);
  c.beginPath(); c.arc(cx, cy, .1, 0, TAU); c.fillStyle = k.a; c.fill(); icon(g, 'bolt', 0, .78, .17, k.a, .17);
  if (v > .55) for (let i = 0; i < 4; i++) { const u = (t * 1.5 + i * .25) % 1, y = .15 + i * .22; c.strokeStyle = rgba(k.f, (1 - u) * .5); c.lineWidth = .03; c.beginPath(); c.moveTo(-1 - u * .2, y); c.lineTo(-1.1 - u * .2 - .15, y); c.moveTo(1 + u * .2, y); c.lineTo(1.1 + u * .2 + .15, y); c.stroke(); }
});

reg('pin_hop', 'Смена локации', 'scheme', 1.6, (g, t) => {
  const c = g.c, k = g.k, hops = [0, 2, 4, 5, 7, 6], n = hops.length, HD = 1.5, seg = Math.floor(t / HD) % n, p = (t % HD) / HD, mx = -1.55, my = -.55, mw = 3.1, mh = 1.5;
  gl(g, rgba(k.s, .3), .12); rr(c, -1.6, -.95, 3.2, 1.9, .12); c.fillStyle = '#0b1015'; c.fill(); ng(g); c.lineWidth = .03; c.strokeStyle = rgba(k.s, .55); c.stroke();
  drawMap(c, mx, my, mw, mh, k, t, { a: .8 });
  const A = CITIES[hops[seg]], B = CITIES[hops[(seg + 1) % n]], pa = ll2xy(A[1], A[2], mx, my, mw, mh), pb = ll2xy(B[1], B[2], mx, my, mw, mh), cx = (pa[0] + pb[0]) / 2, cy = Math.min(pa[1], pb[1]) - .5;
  c.save(); c.setLineDash([.06, .06]); c.strokeStyle = rgba(k.s, .7); c.lineWidth = .025; c.beginPath(); c.moveTo(pa[0], pa[1]); c.quadraticCurveTo(cx, cy, pb[0], pb[1]); c.stroke(); c.restore();
  const u = eo3(clamp(p / .7, 0, 1)), px = (1 - u) * (1 - u) * pa[0] + 2 * (1 - u) * u * cx + u * u * pb[0], py = (1 - u) * (1 - u) * pa[1] + 2 * (1 - u) * u * cy + u * u * pb[1];
  [pa, pb].forEach(q => { c.beginPath(); c.arc(q[0], q[1], .05, 0, TAU); c.fillStyle = rgba(k.s, .9); c.fill(); });
  if (p > .7) { const r = (p - .7) / .3; c.strokeStyle = rgba(k.s, 1 - r); c.lineWidth = .03; c.beginPath(); c.arc(pb[0], pb[1], .06 + .25 * r, 0, TAU); c.stroke(); }
  gl(g, rgba(k.s, .8), .15); icon(g, 'pin', px, py - .13, .15, k.s, .2); ng(g);
  const cur = p > .7 ? B : A, id = p > .7 ? seg + 1 : seg, ip = [11 + Math.floor(hr(id, 1) * 230), Math.floor(hr(id, 2) * 250), Math.floor(hr(id, 3) * 250), 2 + Math.floor(hr(id, 4) * 250)].join('.');
  rr(c, -1.5, -.88, 1.75, .3, .07); c.fillStyle = 'rgba(8,12,16,.85)'; c.fill(); c.lineWidth = .02; c.strokeStyle = rgba(k.s, .5); c.stroke(); txt(g, cur[0], -1.38, -.73, .13, k.s, { al: 'left', mono: true }); txt(g, 'IP ' + ip, -1.12, -.73, .12, '#e8eef2', { al: 'left', mono: true, w: 600 });
  txt(g, 'ВИРТУАЛЬНАЯ ЛОКАЦИЯ', 0, .83, .1, rgba(k.f, .0)); 
});

reg('unblock', 'Доступ к видео', 'scheme', 1.4, (g, t) => {
  const c = g.c, k = g.k, T = t % 5, op = T < 1.2 ? 0 : T < 1.8 ? eo3((T - 1.2) / .6) : T < 4.6 ? 1 : 1 - eo3((T - 4.6) / .4), prog = clamp((T - 1.9) / 2.6, 0, 1);
  gl(g, rgba(k.s, .4), .2); rr(c, -1.25, -.9, 2.5, 1.6, .1); c.fillStyle = '#161b21'; c.fill(); ng(g); c.lineWidth = .03; c.strokeStyle = rgba(k.s, .6); c.stroke();
  const sx = -1.17, sy = -.82, sw = 2.34, sh = 1.44, sg = c.createLinearGradient(0, sy, 0, sy + sh); sg.addColorStop(0, mix('#101c28', k.s, .22)); sg.addColorStop(1, '#05080c');
  rr(c, sx, sy, sw, sh, .06); c.fillStyle = sg; c.fill(); c.save(); rr(c, sx, sy, sw, sh, .06); c.clip();
  c.fillStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.moveTo(sx, sy + sh); c.lineTo(sx + .8, sy + .6); c.lineTo(sx + 1.3, sy + sh * .75); c.lineTo(sx + 1.7, sy + .5); c.lineTo(sx + sw, sy + sh * .8); c.lineTo(sx + sw, sy + sh); c.closePath(); c.fill(); c.beginPath(); c.arc(sx + 1.75, sy + .35, .14, 0, TAU); c.fillStyle = rgba(k.s, .5); c.fill();
  c.beginPath(); c.arc(0, -.12, .34 * (1 + .04 * Math.sin(t * 4) * op), 0, TAU); c.fillStyle = rgba('#000000', .5); c.fill(); c.lineWidth = .04; c.strokeStyle = '#fff'; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-.1, -.27); c.lineTo(.2, -.12); c.lineTo(-.1, .03); c.closePath(); c.fill();
  rr(c, -.95, .45, 1.9, .07, .035); c.fillStyle = 'rgba(255,255,255,.2)'; c.fill(); rr(c, -.95, .45, 1.9 * prog, .07, .035); c.fillStyle = k.s; c.fill();
  if (op < 1) { c.fillStyle = `rgba(5,8,12,${.88 * (1 - op)})`; c.fillRect(sx, sy, sw, sh); c.save(); c.globalAlpha *= 1 - op; const sh2 = (1 - op) * 0, ly = -.1 - op * .1; c.strokeStyle = RED; c.fillStyle = RED; c.lineCap = 'round';
    c.translate(0, ly); c.scale(.38, .38); c.lineWidth = .16; c.beginPath(); c.moveTo(-.33, -.08 - op * .5); c.lineTo(-.33, -.36 - op * .5); c.arc(0, -.36 - op * .5, .33, PI, 0); c.lineTo(.33, -.08 - op * .5); c.stroke(); rr(c, -.55, -.08, 1.1, .88, .14); c.fill(); c.restore(); txt(g, 'ЗАБЛОКИРОВАНО В ВАШЕМ РЕГИОНЕ', 0, .38, .08, RED, { mono: true }); }
  c.restore(); c.fillStyle = '#1d242c'; rr(c, -.14, .7, .28, .15, .02); c.fill(); rr(c, -.6, .83, 1.2, .08, .04); c.fill(); c.lineWidth = .02; c.strokeStyle = rgba(k.s, .4); c.stroke();
});

reg('killswitch', 'Kill Switch', 'scheme', 1.6, (g, t) => {
  const c = g.c, k = g.k, T = t % 6, drop = T > 3 && T < 5.2, col = drop ? RED : k.a;
  badge(g, -1.3, 0, .36, k.a, .1); icon(g, 'phone', -1.3, 0, .22, k.a, .13); badge(g, 1.3, 0, .36, drop ? RED : k.a, .1); icon(g, drop ? 'block' : 'globe', 1.3, 0, .22, drop ? RED : k.a, .13);
  c.lineCap = 'round'; c.lineWidth = .05;
  c.save(); c.setLineDash([.07, .07]); c.lineDashOffset = -t * .4; c.strokeStyle = k.a; c.beginPath(); c.moveTo(-.94, 0); c.lineTo(-.55, 0); c.stroke(); c.restore();
  if (!drop) { c.save(); c.setLineDash([.07, .07]); c.lineDashOffset = -t * .4; c.strokeStyle = k.a; c.beginPath(); c.moveTo(.55, 0); c.lineTo(.94, 0); c.stroke(); c.restore(); }
  else { c.strokeStyle = rgba(RED, .8); c.beginPath(); c.moveTo(.55, 0); c.lineTo(.68, 0); c.stroke(); for (let i = 0; i < 6; i++) { const f = hr(i, Math.floor(t * 12)), a = (f - .5) * 2.4, l = .06 + hr(i, 9) * .1; c.strokeStyle = rgba('#ffb347', .9); c.lineWidth = .025; c.beginPath(); c.moveTo(.72, 0); c.lineTo(.72 + Math.cos(a) * l, Math.sin(a) * l); c.stroke(); } c.strokeStyle = rgba(RED, .5); c.lineWidth = .05; c.beginPath(); c.moveTo(.9, 0); c.lineTo(.94, 0); c.stroke(); }
  if (!drop) for (let i = 0; i < 2; i++) { const p = ((t * .5) + i * .5) % 1; c.strokeStyle = rgba(k.a, (1 - p) * .45); c.lineWidth = .025; c.beginPath(); c.arc(0, 0, .5 + p * .25, 0, TAU); c.stroke(); }
  gl(g, rgba(col, .7), .22); c.beginPath(); c.arc(0, 0, .5, 0, TAU); c.fillStyle = '#0c1116'; c.fill(); c.lineWidth = .055; c.strokeStyle = col; c.stroke(); ng(g); icon(g, 'power', 0, 0, .27, col, .16);
  txt(g, drop ? 'KILL SWITCH: ТРАФИК ЗАБЛОКИРОВАН' : 'VPN ВКЛЮЧЁН', 0, .86, .11, col);
});

reg('multi', 'Все устройства', 'device', 1.8, (g, t) => {
  const c = g.c, k = g.k, D = [['phone', -1.45, -.35], ['tablet', -1.0, .62], ['laptop', 1.45, -.35], ['tv', 1.0, .62], ['cloud', 0, -.78]];
  D.forEach((d, i) => { c.strokeStyle = rgba(k.a, .25); c.lineWidth = .025; c.beginPath(); c.moveTo(d[1], d[2]); c.lineTo(0, 0); c.stroke(); const p = (t * .5 + i * .2) % 1; c.fillStyle = '#fff'; c.shadowColor = k.a; c.shadowBlur = g.px * .08; c.beginPath(); c.arc(lerp(d[1], 0, p), lerp(d[2], 0, p), .04, 0, TAU); c.fill(); c.shadowBlur = 0; });
  for (let i = 0; i < 2; i++) { const p = (t * .5 + i * .5) % 1; c.strokeStyle = rgba(k.a, (1 - p) * .5); c.lineWidth = .03; c.beginPath(); c.arc(0, 0, .5 + p * .35, 0, TAU); c.stroke(); }
  gl(g, rgba(k.a, .6), .22); badge(g, 0, 0, .5, k.a, .16); ng(g); icon(g, 'shieldcheck', 0, 0, .3, k.a, .13);
  D.forEach((d, i) => { const b = 1 + .05 * Math.sin(t * 2 + i); c.save(); c.translate(d[1], d[2]); c.scale(b, b); badge(g, 0, 0, .34, k.a, .1); icon(g, d[0], 0, 0, .2, k.a, .14); c.restore(); });
});

reg('icons_row', 'Ряд иконок VPN', 'icon', 3.2, (g, t) => {
  const c = g.c, k = g.k, I = ['shield', 'lock', 'globe', 'bolt', 'eye_off'], act = Math.floor(t / .9) % 5; c.strokeStyle = rgba(k.a, .2); c.lineWidth = .02; c.beginPath(); c.moveTo(-2.4, 0); c.lineTo(2.4, 0); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-2.4 + ((t * .4) % 1) * 4.8, 0, .035, 0, TAU); c.fill();
  I.forEach((n, i) => { const on = i === act, q = on ? eback(clamp((t % .9) / .3, 0, 1)) : 0, s = 1 + .16 * q; c.save(); c.translate((i - 2) * 1.2, 0); c.scale(s, s); if (on) gl(g, rgba(k.a, .8), .22); c.beginPath(); c.arc(0, 0, .5, 0, TAU); c.fillStyle = on ? k.a : rgba(k.a, .08); c.fill(); ng(g); c.lineWidth = .035; c.strokeStyle = rgba(k.a, on ? 1 : .55); c.stroke(); icon(g, n, 0, 0, .27, on ? k.b : k.a, .14); c.restore(); });
});

reg('icon_orbit', 'Орбита иконок', 'icon', 1, (g, t) => {
  const c = g.c, k = g.k, I = ['lock', 'key', 'wifi', 'globe', 'server', 'phone'], R = .72;
  c.save(); c.setLineDash([.05, .07]); c.lineDashOffset = -t * .1; c.strokeStyle = rgba(k.a, .35); c.lineWidth = .02; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke(); c.restore();
  I.forEach((n, i) => { const a = t * .5 + i / I.length * TAU, x = Math.cos(a) * R, y = Math.sin(a) * R; badge(g, x, y, .21, k.a, .12); icon(g, n, x, y, .12, k.a, .16); });
  for (let i = 0; i < 2; i++) { const p = (t * .5 + i * .5) % 1; c.strokeStyle = rgba(k.a, (1 - p) * .5); c.lineWidth = .025; c.beginPath(); c.arc(0, 0, .3 + p * .3, 0, TAU); c.stroke(); }
  gl(g, rgba(k.a, .7), .25); badge(g, 0, 0, .34, k.a, .18); ng(g); icon(g, 'shieldcheck', 0, 0, .2, k.a, .14);
});

// одиночные иконки в круглом бейдже
const ICON_NAMES = { shield: 'Щит', key: 'Ключ', wifi: 'Wi-Fi', globe: 'Глобус', bolt: 'Молния', eye_off: 'Скрытый глаз', server: 'Сервер', phone: 'Телефон', laptop: 'Ноутбук', pin: 'Метка локации', cloud: 'Облако', power: 'Питание', check: 'Галочка', block: 'Блок', lock: 'Замок', warn: 'Предупреждение' };
Object.keys(ICON_NAMES).forEach(n => reg('icon_' + n, 'Иконка · ' + ICON_NAMES[n], 'icon', 1, (g, t) => {
  const c = g.c, k = g.k, s = 1 + .03 * Math.sin(t * 2.4), col = n === 'warn' ? RED : k.a;
  for (let i = 0; i < 2; i++) { const p = (t * .5 + i * .5) % 1; c.strokeStyle = rgba(col, (1 - p) * .4); c.lineWidth = .025; c.beginPath(); c.arc(0, 0, .72 + p * .22, 0, TAU); c.stroke(); }
  c.save(); c.scale(s, s); gl(g, rgba(col, .6), .22); badge(g, 0, 0, .72, col, .12); ng(g);
  c.save(); c.setLineDash([.08, .1]); c.lineDashOffset = -t * .15; c.strokeStyle = rgba(col, .35); c.lineWidth = .02; c.beginPath(); c.arc(0, 0, .86, 0, TAU); c.stroke(); c.restore();
  const a = t * .8; c.fillStyle = '#fff'; c.beginPath(); c.arc(Math.cos(a) * .86, Math.sin(a) * .86, .035, 0, TAU); c.fill(); icon(g, n, 0, 0, .4, col, .11); c.restore();
}));

/* ---------- Обёртка: вписывает рисунок в рамку, анимирует появление ---------- */
function draw(c, id, box, t, col, appear) {
  const a = ART[id]; if (!a) return; appear = appear === undefined ? 1 : appear; if (appear <= .001) return;
  const k = pal(col); let h = box.h, w = h * a.ar; if (w > box.w) { w = box.w; h = w / a.ar; }
  const sc = h / 2, cx = box.x + box.w / 2, cy = box.y + box.h / 2 + Math.sin(t * 1.6) * h * .012, s = .55 + .45 * eback(clamp(appear, 0, 1));
  c.save(); c.translate(cx, cy); c.scale(s, s); c.scale(sc, sc); c.globalAlpha *= clamp(appear * 1.6, 0, 1); c.lineCap = 'round'; c.lineJoin = 'round';
  try { a.draw({ c, px: sc * s, k }, t); } finally { c.restore(); }
}

/* ---------- Анимированные фоны (рисуются поверх залитого фона, приглушённо, чтобы текст читался) ---------- */
const BGS = {};
const BG_IDS = ['vpn_net', 'vpn_matrix', 'vpn_globe', 'vpn_tunnel', 'vpn_hex', 'vpn_circuit', 'vpn_radar'];
const BG_NAMES = { vpn_net: 'VPN · Сеть узлов', vpn_matrix: 'VPN · Поток данных', vpn_globe: 'VPN · Глобус', vpn_tunnel: 'VPN · Туннель', vpn_hex: 'VPN · Соты защиты', vpn_circuit: 'VPN · Схема', vpn_radar: 'VPN · Радар угроз' };
const HEXC = '0123456789ABCDEF';

BGS.vpn_net = (c, t, W, H, k) => {
  const m = Math.min(W, H), N = 26, P = [], maxD = m * .45; c.lineWidth = Math.max(1, m * .0024);
  for (let i = 0; i < N; i++) { const sp = .25 + hr(i, 4) * .35, ph = hr(i, 3) * TAU; P.push([hr(i, 1) * W + Math.sin(t * sp + ph) * m * .06, hr(i, 2) * H + Math.cos(t * sp * .8 + ph) * m * .06]); }
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1], d = Math.hypot(dx, dy); if (d > maxD) continue; const a = 1 - d / maxD;
    c.strokeStyle = rgba(k.a, a * .3); c.beginPath(); c.moveTo(P[i][0], P[i][1]); c.lineTo(P[j][0], P[j][1]); c.stroke();
    if ((i * 7 + j * 3) % 4 === 0) { const u = (t * .4 + hr(i, j)) % 1; c.fillStyle = rgba(k.a, .35 + a * .5); c.beginPath(); c.arc(P[i][0] + dx * u, P[i][1] + dy * u, m * .006, 0, TAU); c.fill(); }
  }
  for (let i = 0; i < N; i++) {
    const hub = i % 5 === 0; c.fillStyle = rgba(k.a, hub ? .7 : .45); c.beginPath(); c.arc(P[i][0], P[i][1], m * (hub ? .014 : .007), 0, TAU); c.fill();
    if (hub) { const p = (t * .5 + hr(i, 5)) % 1; c.strokeStyle = rgba(k.a, (1 - p) * .4); c.beginPath(); c.arc(P[i][0], P[i][1], m * (.02 + p * .06), 0, TAU); c.stroke(); }
  }
};
BGS.vpn_matrix = (c, t, W, H, k) => {
  const m = Math.min(W, H), cols = Math.round(W / (m * .05)), fs = W / cols, len = 13; c.font = `700 ${fs * .85}px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let ci = 0; ci < cols; ci++) {
    const spd = .3 + hr(ci, 1) * .45, head = ((t * spd + hr(ci, 2)) % 1.4) * (H + fs * len) - fs * 4;
    for (let r = 0; r < len; r++) { const y = head - r * fs * 1.15; if (y < -fs || y > H + fs) continue; const ch = HEXC[Math.floor(hr(ci * 13 + r, Math.floor(t * (r ? 4 : 10)) + ci) * 16)]; c.fillStyle = r === 0 ? rgba(k.f, .55) : rgba(k.a, (1 - r / len) * .38); c.fillText(ch, (ci + .5) * fs, y); }
  }
};
BGS.vpn_globe = (c, t, W, H, k) => {
  const m = Math.min(W, H), R = m * .5, cx = W / 2, cy = H / 2;
  c.save(); c.translate(cx, cy); c.rotate(-.35); c.setLineDash([m * .012, m * .016]); c.lineDashOffset = -t * m * .02; c.strokeStyle = rgba(k.a, .22); c.lineWidth = Math.max(1, m * .003); c.beginPath(); c.ellipse(0, 0, R * 1.35, R * .42, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  const a = t * .7; c.fillStyle = rgba(k.f, .7); c.beginPath(); c.arc(Math.cos(a) * R * 1.35, Math.sin(a) * R * .42, m * .009, 0, TAU); c.fill(); c.restore();
  drawGlobe(c, cx, cy, R, t * .22, .34, k, { a: .55, arcs: true, pins: true }, t);
};
BGS.vpn_tunnel = (c, t, W, H, k) => {
  const m = Math.min(W, H), cx = W / 2, cy = H / 2, N = 9, rg = c.createRadialGradient(cx, cy, 0, cx, cy, m * .6); rg.addColorStop(0, rgba(k.a, .22)); rg.addColorStop(1, rgba(k.a, 0)); c.fillStyle = rg; c.fillRect(0, 0, W, H);
  c.strokeStyle = rgba(k.a, .08); c.lineWidth = Math.max(1, m * .002); [[0, 0], [W, 0], [W, H], [0, H]].forEach(q => { c.beginPath(); c.moveTo(cx, cy); c.lineTo(q[0], q[1]); c.stroke(); });
  for (let i = 0; i < N; i++) { const z = (i / N + t * .22) % 1, s = Math.pow(z, 2.2) * 1.35 + .02, w = W * s, h = H * s; c.strokeStyle = rgba(k.a, Math.sin(PI * z) * .5); c.lineWidth = 1 + z * m * .008; rr(c, cx - w / 2, cy - h / 2, w, h, m * .06 * s); c.stroke(); }
  for (let i = 0; i < 32; i++) { const an = hr(i, 1) * TAU, z = (hr(i, 2) + t * .45) % 1, r0 = z * z * m * .75, r1 = r0 + z * m * .12; c.strokeStyle = rgba(k.f, z * .45); c.lineWidth = Math.max(1, m * .003); c.beginPath(); c.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); c.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); c.stroke(); }
};
BGS.vpn_hex = (c, t, W, H, k) => {
  const m = Math.min(W, H), r = m * .085, hw = Math.sqrt(3) * r, hh = r * 1.5, cols = Math.ceil(W / hw) + 2, rows = Math.ceil(H / hh) + 2; c.lineWidth = Math.max(1, m * .0025);
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = col * hw + (row % 2 ? hw / 2 : 0) - hw, y = row * hh - r, d = Math.hypot(x - W / 2, y - H / 2), a = Math.max(0, Math.sin(d / m * 7 - t * 2.4) - .55) / .45;
    c.beginPath(); for (let i = 0; i < 6; i++) { const an = PI / 6 + i * PI / 3; const px = x + Math.cos(an) * r * .94, py = y + Math.sin(an) * r * .94; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath();
    if (a > 0) { c.fillStyle = rgba(k.a, a * .22); c.fill(); } c.strokeStyle = rgba(k.a, .09 + a * .35); c.stroke();
  }
};
const CIRC = new Map();
function circuitFor(W, H) {
  const key = W + 'x' + H; if (CIRC.has(key)) return CIRC.get(key); const m = Math.min(W, H), gs = m * .06, DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]], T = [];
  for (let i = 0; i < 16; i++) {
    let x = Math.round(hr(i, 1) * W / gs) * gs, y = Math.round(hr(i, 2) * H / gs) * gs, last = -1; const pts = [[x, y]], cum = [0];
    for (let s = 0; s < 6; s++) { let di = Math.floor(hr(i, 10 + s) * 8); if (di === last) di = (di + 2) % 8; last = di; const len = (1 + Math.floor(hr(i, 20 + s) * 4)) * gs; x += DIRS[di][0] * len; y += DIRS[di][1] * len; pts.push([x, y]); cum.push(cum[cum.length - 1] + Math.hypot(DIRS[di][0], DIRS[di][1]) * len); }
    T.push({ pts, cum, total: cum[cum.length - 1] });
  }
  CIRC.set(key, T); return T;
}
function pointAt(tr, d) { for (let i = 1; i < tr.cum.length; i++) if (d <= tr.cum[i]) { const u = (d - tr.cum[i - 1]) / (tr.cum[i] - tr.cum[i - 1] || 1); return [lerp(tr.pts[i - 1][0], tr.pts[i][0], u), lerp(tr.pts[i - 1][1], tr.pts[i][1], u)]; } return tr.pts[tr.pts.length - 1]; }
BGS.vpn_circuit = (c, t, W, H, k) => {
  const m = Math.min(W, H), T = circuitFor(W, H); c.lineJoin = 'round';
  T.forEach((tr, i) => {
    c.strokeStyle = rgba(k.a, .2); c.lineWidth = Math.max(1, m * .0032); c.beginPath(); tr.pts.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    [tr.pts[0], tr.pts[tr.pts.length - 1]].forEach(p => { c.strokeStyle = rgba(k.a, .45); c.beginPath(); c.arc(p[0], p[1], m * .008, 0, TAU); c.stroke(); });
    const tail = m * .14, d = (t * m * .32 + hr(i, 30) * tr.total * 2) % (tr.total + tail * 2), hd = Math.min(d, tr.total), tl = Math.max(0, d - tail);
    if (tl < tr.total) { const A = pointAt(tr, tl), B = pointAt(tr, hd), g = c.createLinearGradient(A[0], A[1], B[0], B[1]); g.addColorStop(0, rgba(k.a, 0)); g.addColorStop(1, rgba(k.a, .85)); c.strokeStyle = g; c.lineWidth = Math.max(1.5, m * .006); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); c.fillStyle = rgba(k.f, .9); c.beginPath(); c.arc(B[0], B[1], m * .007, 0, TAU); c.fill(); }
  });
};
BGS.vpn_radar = (c, t, W, H, k) => {
  const m = Math.min(W, H), cx = W / 2, cy = H / 2, R = m * .62, a = t * 1.1; c.lineWidth = Math.max(1, m * .0025);
  for (let i = 1; i <= 4; i++) { c.strokeStyle = rgba(k.a, .16); c.beginPath(); c.arc(cx, cy, R * i / 4, 0, TAU); c.stroke(); }
  c.strokeStyle = rgba(k.a, .1); c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
  for (let i = 0; i < 24; i++) { c.fillStyle = rgba(k.a, .012 + (1 - i / 24) * .11); c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a - (i + 1) * .04, a - i * .04); c.closePath(); c.fill(); }
  c.strokeStyle = rgba(k.a, .8); c.lineWidth = Math.max(1.5, m * .004); c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke();
  for (let i = 0; i < 7; i++) { const an = hr(i, 1) * TAU, rad = R * (.25 + hr(i, 2) * .7), diff = (((a - an) % TAU) + TAU) % TAU, f = Math.max(0, 1 - diff / TAU * 1.3), col = i % 3 === 0 ? k.a : RED; if (f <= 0) continue; const x = cx + Math.cos(an) * rad, y = cy + Math.sin(an) * rad; c.fillStyle = rgba(col, f * .9); c.beginPath(); c.arc(x, y, m * .01, 0, TAU); c.fill(); c.strokeStyle = rgba(col, f * .6); c.beginPath(); c.arc(x, y, m * (.012 + (1 - f) * .03), 0, TAU); c.stroke(); }
};
function drawBg(c, id, t, W, H, col) { const f = BGS[id]; if (!f) return; c.save(); try { f(c, t, W, H, pal(col)); } finally { c.restore(); } }

/* ---------- Тема и подбор рисунка ---------- */
const STRONG = /vpn|впн|прокси|proxy|анонимайзер|тунн?ел|шифрован|шифру|зашифр|трафик|ip-?адрес|(?:^|[^a-z])ip(?:[^a-z]|$)|wi-?fi|вайфай|кибербезопас|конфиденциальн|приватност|анонимност|блокировк[аиу]|провайдер/g;
const WEAK = /интернет|(?:^|[^а-яё])сет[ьи](?![а-яё])|онлайн|сайт|браузер|хакер|взлом|защит/g;
function isTopic(text) { const low = String(text || '').toLowerCase().replace(/\*/g, ''); return (low.match(STRONG) || []).length >= 1 || (low.match(WEAK) || []).length >= 2; }
const KW = [
  ['hacker', /хакер|взлом|перехват|краж|украд|мошенник|угроз/], ['public_wifi', /wi-?fi|вайфай|кафе|аэропорт|публичн|открыт(?:ая|ой|ую) сет/], ['speed', /скорост|быстр|пинг|лаг|задержк/],
  ['cipher', /шифр|парол|данны|карт[аыу]|переписк/], ['eye_off', /слеж|следи|видит|видят|провайдер|рекламодател|трекинг|приватн|анонимн|конфиденц/], ['pin_hop', /стран[аыуе]|локаци|(?:^|[^a-z])ip(?:[^a-z]|$)|адрес|регион/],
  ['unblock', /блокиров|доступ|стрим|видео|сервис|сайт|фильм|контент/], ['killswitch', /kill|обрыв|отключ|разрыв/], ['multi', /устройств/], ['phone', /телефон|смартфон|приложен|мобил/],
  ['laptop', /ноутбук|компьютер|(?:^|[^а-яё])пк(?![а-яё])/], ['router', /роутер/], ['server', /сервер|узел/], ['lock_pad', /замок|ключ|закрыт/], ['vpn_flow', /vpn|впн|туннел|тоннел|подключ/],
  ['globe', /(?:^|[^а-яё])мир|глобаль|интернет|сеть|сети/], ['shield', /защит|безопасн|щит/]
];
const POOL = ['vpn_flow', 'phone', 'shield', 'globe', 'cipher', 'laptop', 'lock_pad', 'public_wifi', 'pin_hop', 'multi', 'server', 'router', 'unblock', 'eye_off', 'speed', 'hacker', 'killswitch', 'icons_row', 'icon_orbit'];
// list: [{text, art}], active: включена ли авто-графика. Возвращает id рисунка (или '') для каждой сцены.
function plan(list, active) {
  const out = [], recent = []; let rot = 0;
  list.forEach(s => {
    let id = ''; const a = s.art || 'auto';
    if (a === 'none') id = '';
    else if (a !== 'auto' && ART[a]) id = a;
    else if (active) {
      const low = String(s.text || '').toLowerCase().replace(/\*/g, ''); let cand = '';
      for (const kw of KW) if (kw[1].test(low) && !recent.includes(kw[0])) { cand = kw[0]; break; }
      if (!cand) for (let n = 0; n < POOL.length; n++) { const aid = POOL[(rot + n) % POOL.length]; if (!recent.includes(aid)) { cand = aid; rot = rot + n + 1; break; } }
      id = cand || POOL[0];
    }
    out.push(id); if (id) { recent.push(id); if (recent.length > 3) recent.shift(); }
  });
  return out;
}
/* Свободное место рядом с текстом. L — раскладка текущего бита (bx0, bx1, by0, by1, size). Возвращает рамку рисунка или null. */
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

root.VPNLib = { version: '1.0', BG_IDS, BG_NAMES, BG: BGS, drawBg, ART, ART_IDS, draw, drawIcon, ICON_IDS: Object.keys(ICON), isTopic, plan, fitBox };
})(typeof window !== 'undefined' ? window : globalThis);
