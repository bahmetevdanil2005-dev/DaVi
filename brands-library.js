/* ============================================================
   BrandLib — логотипы брендов и компаний, упомянутых в видео.
   1) Находит бренды в тексте (русские и английские названия, падежи: «в ютубе», «Сбера»).
   2) Подгружает оригинальный логотип: Simple Icons (SVG) → Worker /logo (иконка сайта) → запасная плашка с названием.
   3) Рисует логотип на «карточке» с анимацией появления (в момент, когда слово произнесено).
   Картинки превращаются в blob/data-URL, поэтому холст не «грязнится» и экспорт видео работает.
   ============================================================ */
(function () {
  'use strict';
  // [id, название, [алиасы], домен, slug в Simple Icons (или ''), цвет]
  // Алиас — начало слова (ютуб → ютубе, ютуба). Если в конце «$», то слово должно совпасть целиком.
  const RAW = [
    ['youtube', 'YouTube', ['youtube', 'ютуб', 'ютьюб'], 'youtube.com', 'youtube', 'FF0000'],
    ['telegram', 'Telegram', ['telegram', 'телеграм', 'телеграмм'], 'telegram.org', 'telegram', '26A5E4'],
    ['instagram', 'Instagram', ['instagram', 'инстаграм', 'инста$'], 'instagram.com', 'instagram', 'E4405F'],
    ['tiktok', 'TikTok', ['tiktok', 'тикток', 'тик-ток'], 'tiktok.com', 'tiktok', '000000'],
    ['whatsapp', 'WhatsApp', ['whatsapp', 'ватсап', 'вотсап', 'ватсапп', 'вацап'], 'whatsapp.com', 'whatsapp', '25D366'],
    ['facebook', 'Facebook', ['facebook', 'фейсбук', 'фэйсбук'], 'facebook.com', 'facebook', '0866FF'],
    ['meta', 'Meta', ['meta$'], 'meta.com', 'meta', '0467DF'],
    ['x', 'X', ['твиттер', 'twitter'], 'x.com', 'x', '000000'],
    ['vk', 'VK', ['vk$', 'вк$', 'вконтакте', 'vkontakte'], 'vk.com', 'vk', '0077FF'],
    ['ok', 'Одноклассники', ['одноклассник'], 'ok.ru', 'odnoklassniki', 'EE8208'],
    ['google', 'Google', ['google', 'гугл'], 'google.com', 'google', '4285F4'],
    ['chrome', 'Chrome', ['chrome', 'хром$'], 'google.com/chrome', 'googlechrome', '4285F4'],
    ['gmail', 'Gmail', ['gmail', 'джимейл', 'гмейл'], 'gmail.com', 'gmail', 'EA4335'],
    ['apple', 'Apple', ['apple', 'эппл', 'эпл$', 'айфон', 'iphone', 'macbook', 'макбук'], 'apple.com', 'apple', '000000'],
    ['icloud', 'iCloud', ['icloud', 'айклауд'], 'icloud.com', 'icloud', '3693F0'],
    ['microsoft', 'Microsoft', ['microsoft', 'майкрософт', 'майкрософт'], 'microsoft.com', 'microsoft', '5E5E5E'],
    ['windows', 'Windows', ['windows', 'виндовс'], 'microsoft.com/windows', 'windows', '0078D4'],
    ['android', 'Android', ['android', 'андроид'], 'android.com', 'android', '3DDC84'],
    ['linux', 'Linux', ['linux', 'линукс'], 'kernel.org', 'linux', '000000'],
    ['samsung', 'Samsung', ['samsung', 'самсунг'], 'samsung.com', 'samsung', '1428A0'],
    ['huawei', 'Huawei', ['huawei', 'хуавей'], 'huawei.com', 'huawei', 'FF0000'],
    ['xiaomi', 'Xiaomi', ['xiaomi', 'сяоми', 'ксиоми'], 'mi.com', 'xiaomi', 'FF6900'],
    ['tesla', 'Tesla', ['tesla', 'тесла$', 'теслы$'], 'tesla.com', 'tesla', 'CC0000'],
    ['nvidia', 'NVIDIA', ['nvidia', 'нвидиа', 'энвидиа'], 'nvidia.com', 'nvidia', '76B900'],
    ['intel', 'Intel', ['intel', 'интел$'], 'intel.com', 'intel', '0071C5'],
    ['amd', 'AMD', ['amd$'], 'amd.com', 'amd', 'ED1C24'],
    ['openai', 'OpenAI', ['openai', 'опенаи', 'чатгпт', 'chatgpt', 'чат-gpt', 'чат-гпт'], 'openai.com', 'openai', '10A37F'],
    ['claude', 'Claude', ['claude', 'клод$'], 'claude.ai', 'claude', 'D97757'],
    ['anthropic', 'Anthropic', ['anthropic', 'антропик'], 'anthropic.com', 'anthropic', '191919'],
    ['gemini', 'Gemini', ['gemini', 'джемини', 'джеминай'], 'gemini.google.com', 'googlegemini', '8E75B2'],
    ['netflix', 'Netflix', ['netflix', 'нетфликс'], 'netflix.com', 'netflix', 'E50914'],
    ['spotify', 'Spotify', ['spotify', 'спотифай'], 'spotify.com', 'spotify', '1DB954'],
    ['twitch', 'Twitch', ['twitch', 'твич$'], 'twitch.tv', 'twitch', '9146FF'],
    ['discord', 'Discord', ['discord', 'дискорд'], 'discord.com', 'discord', '5865F2'],
    ['reddit', 'Reddit', ['reddit', 'реддит'], 'reddit.com', 'reddit', 'FF4500'],
    ['linkedin', 'LinkedIn', ['linkedin', 'линкедин'], 'linkedin.com', 'linkedin', '0A66C2'],
    ['snapchat', 'Snapchat', ['snapchat', 'снэпчат', 'снапчат'], 'snapchat.com', 'snapchat', 'FFCC00'],
    ['pinterest', 'Pinterest', ['pinterest', 'пинтерест'], 'pinterest.com', 'pinterest', 'E60023'],
    ['viber', 'Viber', ['viber', 'вайбер'], 'viber.com', 'viber', '7360F2'],
    ['signal', 'Signal', ['signal$', 'сигнал$'], 'signal.org', 'signal', '3B45FD'],
    ['zoom', 'Zoom', ['zoom$', 'зум$'], 'zoom.us', 'zoom', '0B5CFF'],
    ['skype', 'Skype', ['skype', 'скайп'], 'skype.com', 'skype', '00AFF0'],
    ['slack', 'Slack', ['slack$', 'слак$'], 'slack.com', 'slack', '4A154B'],
    ['github', 'GitHub', ['github', 'гитхаб'], 'github.com', 'github', '181717'],
    ['figma', 'Figma', ['figma', 'фигма'], 'figma.com', 'figma', 'F24E1E'],
    ['adobe', 'Adobe', ['adobe', 'адоб$', 'фотошоп', 'photoshop'], 'adobe.com', 'adobe', 'FF0000'],
    ['canva', 'Canva', ['canva', 'канва$'], 'canva.com', 'canva', '00C4CC'],
    ['dropbox', 'Dropbox', ['dropbox', 'дропбокс'], 'dropbox.com', 'dropbox', '0061FF'],
    ['cloudflare', 'Cloudflare', ['cloudflare', 'клаудфлер', 'клаудфлэр'], 'cloudflare.com', 'cloudflare', 'F38020'],
    ['firefox', 'Firefox', ['firefox', 'фаерфокс', 'файрфокс'], 'mozilla.org/firefox', 'firefoxbrowser', 'FF7139'],
    ['opera', 'Opera', ['opera$', 'опера$'], 'opera.com', 'opera', 'FF1B2D'],
    ['duckduckgo', 'DuckDuckGo', ['duckduckgo', 'дакдакго'], 'duckduckgo.com', 'duckduckgo', 'DE5833'],
    ['tor', 'Tor', ['tor$'], 'torproject.org', 'torproject', '7D4698'],
    ['proton', 'Proton', ['proton', 'протон$'], 'proton.me', 'proton', '6D4AFF'],
    ['nordvpn', 'NordVPN', ['nordvpn', 'нордвпн'], 'nordvpn.com', 'nordvpn', '4687FF'],
    ['wireguard', 'WireGuard', ['wireguard', 'вайргард', 'вайрегард'], 'wireguard.com', 'wireguard', '88171A'],
    ['amazon', 'Amazon', ['amazon', 'амазон'], 'amazon.com', 'amazon', 'FF9900'],
    ['ebay', 'eBay', ['ebay', 'ебей', 'ибэй'], 'ebay.com', 'ebay', 'E53238'],
    ['aliexpress', 'AliExpress', ['aliexpress', 'алиэкспресс', 'алиекспресс', 'алик$'], 'aliexpress.com', 'aliexpress', 'E62E04'],
    ['alibaba', 'Alibaba', ['alibaba', 'алибаба'], 'alibaba.com', 'alibabadotcom', 'FF6A00'],
    ['shopify', 'Shopify', ['shopify', 'шопифай'], 'shopify.com', 'shopify', '7AB55C'],
    ['uber', 'Uber', ['uber$', 'убер$'], 'uber.com', 'uber', '000000'],
    ['airbnb', 'Airbnb', ['airbnb', 'эйрбнб', 'аирбнб'], 'airbnb.com', 'airbnb', 'FF5A5F'],
    ['booking', 'Booking.com', ['booking', 'букинг'], 'booking.com', 'bookingdotcom', '003B95'],
    ['tinder', 'Tinder', ['tinder', 'тиндер'], 'tinder.com', 'tinder', 'FE3C72'],
    ['steam', 'Steam', ['steam$', 'стим$'], 'steampowered.com', 'steam', '000000'],
    ['playstation', 'PlayStation', ['playstation', 'плейстейшн', 'плейстейшен'], 'playstation.com', 'playstation', '003791'],
    ['xbox', 'Xbox', ['xbox', 'иксбокс'], 'xbox.com', 'xbox', '107C10'],
    ['nintendo', 'Nintendo', ['nintendo', 'нинтендо'], 'nintendo.com', 'nintendo', 'E60012'],
    ['paypal', 'PayPal', ['paypal', 'пейпал'], 'paypal.com', 'paypal', '003087'],
    ['visa', 'Visa', ['visa$', 'виза$', 'визы$'], 'visa.com', 'visa', '1A1F71'],
    ['mastercard', 'Mastercard', ['mastercard', 'мастеркард', 'мастер-кард'], 'mastercard.com', 'mastercard', 'EB001B'],
    ['binance', 'Binance', ['binance', 'бинанс'], 'binance.com', 'binance', 'F0B90B'],
    ['bitcoin', 'Bitcoin', ['bitcoin', 'биткоин', 'биткойн'], 'bitcoin.org', 'bitcoin', 'F7931A'],
    ['ethereum', 'Ethereum', ['ethereum', 'эфириум', 'эфир$'], 'ethereum.org', 'ethereum', '3C3C3D'],
    // Россия: банки и сервисы (если нет в Simple Icons — иконка сайта через Worker /logo)
    ['sber', 'Сбер', ['сбер', 'sber$', 'sberbank'], 'sberbank.ru', 'sberbank', '21A038'],
    ['tbank', 'Т-Банк', ['тинькофф', 'тинькоф', 'tinkoff', 'т-банк', 'tbank'], 'tbank.ru', 'tinkoff', 'FFDD2D'],
    ['alfa', 'Альфа-Банк', ['альфа-банк', 'альфабанк', 'альфа$', 'alfabank'], 'alfabank.ru', '', 'EF3124'],
    ['vtb', 'ВТБ', ['втб$', 'vtb$'], 'vtb.ru', '', '009FDF'],
    ['gazprombank', 'Газпромбанк', ['газпромбанк'], 'gazprombank.ru', '', '0A56A8'],
    ['raif', 'Райффайзен', ['райффайзен', 'raiffeisen'], 'raiffeisen.ru', '', 'FEE600'],
    ['sbp', 'СБП', ['сбп$'], 'sbp.nspk.ru', '', '5B2D86'],
    ['mir', 'Мир', ['мир-пэй', 'mirpay'], 'mironline.ru', '', '4DB45E'],
    ['qiwi', 'QIWI', ['qiwi', 'киви$'], 'qiwi.com', 'qiwi', 'FF8C00'],
    ['yoomoney', 'ЮMoney', ['юmoney', 'юмани', 'yoomoney'], 'yoomoney.ru', '', '8B3FFD'],
    ['yandex', 'Яндекс', ['яндекс', 'yandex'], 'yandex.ru', 'yandex', 'FC3F1D'],
    ['ozon', 'Ozon', ['ozon', 'озон$'], 'ozon.ru', '', '005BFF'],
    ['wb', 'Wildberries', ['wildberries', 'вайлдберриз', 'вайлдбериз', 'вайлдберис'], 'wildberries.ru', '', 'CB11AB'],
    ['avito', 'Авито', ['avito', 'авито'], 'avito.ru', '', '00AAFF'],
    ['gosuslugi', 'Госуслуги', ['госуслуг'], 'gosuslugi.ru', '', '0D4CD3'],
    ['dzen', 'Дзен', ['дзен$'], 'dzen.ru', '', '000000'],
    ['rutube', 'Rutube', ['rutube', 'рутуб'], 'rutube.ru', '', '100943'],
    ['mts', 'МТС', ['мтс$', 'mts$'], 'mts.ru', '', 'E30611'],
    ['beeline', 'Билайн', ['билайн', 'beeline'], 'beeline.ru', '', 'FFCC00'],
    ['megafon', 'МегаФон', ['мегафон', 'megafon'], 'megafon.ru', '', '00B956'],
    ['tele2', 'Tele2', ['tele2', 'теле2'], 'tele2.ru', '', '000000'],
    ['mailru', 'Mail.ru', ['mail.ru', 'майл.ру', 'мейлру'], 'mail.ru', 'maildotru', '005FF9']
  ];
  const BRANDS = RAW.map(r => ({ id: r[0], name: r[1], aliases: r[2], domain: r[3], slug: r[4], color: '#' + r[5] }));
  const BY_ID = {}; BRANDS.forEach(b => BY_ID[b.id] = b);
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9.\-]/g, '');
  const prep = BRANDS.map(b => ({ b, al: b.aliases.map(a => { a = a.toLowerCase().replace(/ё/g, 'е'); const ex = a.endsWith('$'); return { s: ex ? a.slice(0, -1) : a, ex }; }) }));

  // Подходит ли слово под бренд
  function matchWord(word) {
    const w = norm(word).replace(/\.+$/, ''); if (w.length < 2) return null;
    for (const { b, al } of prep) for (const a of al) if (a.ex ? w === a.s : w.startsWith(a.s)) return b;
    return null;
  }
  // Находит бренды в списке слов: [{brand, ti}] — ti индекс слова, в котором бренд назван (каждый бренд один раз)
  function scan(words) {
    const out = [], seen = new Set();
    words.forEach((w, ti) => { const b = matchWord(w); if (b && !seen.has(b.id)) { seen.add(b.id); out.push({ brand: b, ti }); } });
    return out;
  }
  const DOM = /^(?:https?:\/\/)?(?:www\.)?([a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+)(?:[\/?#].*)?$/i;
  // Превращает строку от ИИ или пользователя («youtube.com», «Сбер», «Spotify») в описание бренда
  function resolve(str) {
    str = String(str || '').trim(); if (!str) return null;
    const known = matchWord(str); if (known) return known;
    const m = DOM.exec(str.toLowerCase());
    if (m) {
      const dom = m[1], host = dom.split('.').slice(-2, -1)[0] || dom, hit = BRANDS.find(b => b.domain === dom || b.domain.split('/')[0] === dom || b.id === host);
      if (hit) return hit;
      const hue = [...dom].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
      return { id: dom, name: host.charAt(0).toUpperCase() + host.slice(1), domain: dom, slug: '', color: hslHex(hue, .65, .42), generic: true };
    }
    if (/^[a-zа-я0-9][a-zа-я0-9 .&+\-]{1,28}$/i.test(str)) { // просто название без известного домена: плашка с названием
      const hue = [...str].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
      return { id: 'n:' + norm(str), name: str, domain: '', slug: '', color: hslHex(hue, .65, .42), generic: true };
    }
    return null;
  }
  function hslHex(h, s, l) { const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }

  /* ---------- загрузка картинок ---------- */
  const cache = new Map(); // id → { st: 'loading'|'ok'|'fail', img, kind, p }
  let workerUrl = () => '', onReady = () => { };
  const SVG_CDN = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/';
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  function imgFromUrl(url) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('img')); im.src = url; }); }
  async function fromSimpleIcons(b) {
    const r = await withTimeout(fetch(SVG_CDN + b.slug + '.svg'), 7000); if (!r.ok) throw new Error('si ' + r.status);
    let svg = await r.text(); if (!/<svg/i.test(svg)) throw new Error('not svg');
    svg = svg.replace(/<svg\b([^>]*)>/i, (m, a) => '<svg' + a.replace(/\s(width|height|fill)="[^"]*"/g, '') + ` width="512" height="512" fill="${b.color}">`);
    const im = await imgFromUrl('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); return { img: im, kind: 'svg' };
  }
  async function fromWorker(b) {
    const w = workerUrl(); if (!w || !b.domain) throw new Error('no worker');
    const r = await withTimeout(fetch(w + '/logo?domain=' + encodeURIComponent(b.domain.split('/')[0])), 9000); if (!r.ok) throw new Error('worker ' + r.status);
    const blob = await r.blob(); if (!/^image\//.test(blob.type)) throw new Error('not image');
    const im = await imgFromUrl(URL.createObjectURL(blob)); if (Math.min(im.naturalWidth, im.naturalHeight) < 24) throw new Error('too small'); return { img: im, kind: 'bmp' };
  }
  function load(b) {
    let e = cache.get(b.id); if (e) return e.p;
    e = { st: 'loading', img: null, kind: '' }; cache.set(b.id, e);
    e.p = (async () => {
      const steps = b.slug ? [fromSimpleIcons, fromWorker] : [fromWorker];
      for (const fn of steps) { try { const r = await fn(b); e.img = r.img; e.kind = r.kind; e.st = 'ok'; break; } catch (err) { /* пробуем следующий источник */ } }
      if (e.st !== 'ok') e.st = 'fail';
      try { onReady(b); } catch { }
    })();
    return e.p;
  }
  // Состояние логотипа для рисования: null — ещё грузится, иначе { img?, kind }
  function state(b) { const e = cache.get(b.id); if (!e) { load(b); return null; } return e.st === 'loading' ? null : e; }
  function preload(list) { return Promise.all(list.map(b => load(b))); }
  function forget() { cache.forEach((e, k) => { if (e.st === 'fail') cache.delete(k); }); } // после смены адреса Worker пробуем заново

  /* ---------- рисование ---------- */
  const easeOutBack = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function plate(c, x, y, s, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + s, y, x + s, y + s, r); c.arcTo(x + s, y + s, x, y + s, r); c.arcTo(x, y + s, x, y, r); c.arcTo(x, y, x + s, y, r); c.closePath(); }
  // Рисует карточку логотипа с центром (cx, cy) и стороной s; k — прогресс появления 0..1
  function draw(c, b, cx, cy, s, k) {
    if (k <= 0) return; const st = state(b); if (!st) return;
    const sc = Math.max(.001, easeOutBack(Math.min(1, k))), a = Math.min(1, k * 3.2);
    c.save(); c.globalAlpha *= a; c.translate(cx, cy); c.scale(sc, sc); c.rotate((1 - Math.min(1, k)) * -.12);
    const x = -s / 2, y = -s / 2, r = s * .24;
    c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = s * .22; c.shadowOffsetY = s * .06;
    const textBadge = st.st === 'fail' || !st.img;
    c.fillStyle = textBadge ? b.color : '#ffffff'; plate(c, x, y, s, r); c.fill(); c.shadowColor = 'transparent'; c.shadowBlur = 0;
    if (textBadge) { // запасной вариант: название бренда на плашке цвета бренда
      const L = (() => { const n = parseInt(b.color.slice(1), 16), f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(n >> 16) + .7152 * f((n >> 8) & 255) + .0722 * f(n & 255); })();
      c.fillStyle = L > .5 ? '#111' : '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; const t = b.name; let fs = s * .34; c.font = `800 ${fs}px Inter,Arial,sans-serif`; const w = c.measureText(t).width; if (w > s * .8) { fs *= s * .8 / w; c.font = `800 ${fs}px Inter,Arial,sans-serif`; } c.fillText(t, 0, 0);
    } else {
      const im = st.img, pad = st.kind === 'svg' ? s * .2 : s * .1, box = s - pad * 2, ar = (im.naturalWidth || 1) / (im.naturalHeight || 1);
      let w = box, h = box; if (ar > 1) h = box / ar; else w = box * ar;
      if (st.kind === 'bmp') { c.save(); plate(c, x + pad * .5, y + pad * .5, s - pad, r * .7); c.clip(); c.imageSmoothingQuality = 'high'; c.drawImage(im, -w / 2 - pad * .25, -h / 2 - pad * .25, w + pad * .5, h + pad * .5); c.restore(); }
      else c.drawImage(im, -w / 2, -h / 2, w, h);
    }
    c.restore();
  }
  window.BrandLib = { BRANDS, BY_ID, matchWord, scan, resolve, load, preload, state, draw, forget, setWorker(fn) { workerUrl = fn; }, setOnReady(fn) { onReady = fn; } };
})();
