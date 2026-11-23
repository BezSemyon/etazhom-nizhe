/* ===== Утилиты ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const nbsp = ' ';
const fmtNum = (n, d = 0) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/ /g, nbsp);
const fmtRub = n => fmtNum(Math.round(n)) + nbsp + '₽';
const pad2 = n => String(n).padStart(2, '0');
const fmtTime = ms => { const d = new Date(ms); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const fmtDate = d => { d = new Date(d); return d.getDate() + nbsp + MON[d.getMonth()] + ', ' + WD[d.getDay()]; };
const startOfDay = d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d, n) => { d = new Date(d); d.setDate(d.getDate() + n); return d; };
const isoDow = d => ((new Date(d).getDay() + 6) % 7) + 1;
const dayKey = d => { d = new Date(d); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const sameDay = (a, b) => dayKey(a) === dayKey(b);
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const rndTok = (p, n = 10) => p + Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; };
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const UNIT = { g: 'г', ml: 'мл', pcs: 'шт' };
function fmtQty(q, unit) {
  if (unit === 'pcs') return fmtNum(q, q % 1 ? 1 : 0) + nbsp + 'шт';
  const big = unit === 'g' ? 'кг' : 'л';
  if (Math.abs(q) >= 1000) return fmtNum(q / 1000, Math.abs(q) >= 10000 ? 0 : 1) + nbsp + big;
  return fmtNum(Math.round(q)) + nbsp + UNIT[unit];
}
const priceUnit = unit => unit === 'g' ? 'кг' : unit === 'ml' ? 'л' : 'шт';
const unitCost = (qty, unit, price) => unit === 'pcs' ? qty * price : qty / 1000 * price;
function roundNice(q, unit) { if (unit === 'pcs') return Math.max(0, Math.ceil(q)); const step = q < 2000 ? 50 : 100; return Math.max(0, Math.round(q / step) * step); }
const MIN = 60e3;
/* адрес сайта для QR-плаката: на GitHub Pages и любом хостинге — текущий адрес, внутри claude.ai — ссылка на артефакт */
const SITE_URL = (() => { try { const framed = window.self !== window.top; if (!framed && /^https?:$/.test(location.protocol)) return location.origin + location.pathname; } catch (e) { } return ARTIFACT_URL; })();
const ceilMin = t => Math.ceil(t / MIN) * MIN;

/* ===== QR-коды (библиотека qrcode-generator, MIT) ===== */
function qrSVG(text, cls = 'qr') {
  try {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), m = 2; let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    return `<svg class="${cls}" viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" role="img" aria-label="QR-код"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
  } catch (e) { return `<div class="${cls}" style="display:grid;place-items:center;border:1px dashed #ccc">QR</div>`; }
}

/* ===== Процесс ===== */
const OPEN_H = 7.5, CLOSE_H = 22.5, SCALE = 0.6, HISTORY_DAYS = 28;
const FIT_W = [1.2, 1.05, 1.15, 1.05, 0.9, 0.8, 0.65];
const FAM_W = [0.8, 0.8, 0.85, 0.9, 1.2, 1.5, 1.4];
const DEFAULT_SETTINGS = { safety: 20, growth: 0, promo: true, stations: { hot: 3, cold: 2, bar: 2 }, packMin: 2, deliver: { locker: 5, counter: 4, cafe: 0 }, holdMax: 10,
  fiscal: { scheme: 'two', sno: 'usn', vat: 'none', subject: 'goods', sbpDefault: true, cardFee: 2.5, sbpFee: 0.7, feeVat: 0 },
  loyalty: { on: true, welcomePct: 100, welcomeCap: 1000, spendPct: 25, ttlDays: 90, staffDiscount: 20, clubFee: 5, trainerOn: true, trainerPct: 5, payouts: [], confirmCode: true,
    staff: [{ phone: '+7 900 111-11-11', name: 'Алексей Смирнов', role: 'Тренер', code: '101' }, { phone: '+7 900 111-22-22', name: 'Ирина Котова', role: 'Тренер', code: '102' }, { phone: '+7 900 111-33-33', name: 'Ольга Ветрова', role: 'Администратор клуба' }] } };
const STATUS = {
  paid:       { short: 'Принят', name: 'Принят, ждёт старта на кухне', color: 'blue' },
  cooking:    { short: 'Готовится', name: 'Готовится', color: 'orange' },
  ready:      { short: 'Готов', name: 'Готов, ждёт официанта', color: 'violet' },
  delivering: { short: 'Несём', name: 'Официант несёт заказ', color: 'violet' },
  placed:     { short: 'Можно забирать', name: 'Можно забирать', color: 'green' },
  done:       { short: 'Получен', name: 'Получен', color: 'grey' },
  cancelled:  { short: 'Отменён', name: 'Отменён, деньги возвращены', color: 'red' },
};
const ACTIVE = ['paid', 'cooking', 'ready', 'delivering'];
const CAT_V = 10;

/* ===== Сборка демо-данных ===== */
function dishFromSpec(s) {
  const [id, name, type, goals, price, weight, kcal, p, f, c, cook, emoji, pop, recipe, desc, serves] = s;
  return { id, name, type, goals, price, weight, kcal, p, f, c, cook, emoji, pop, desc, serves: serves || 1,
    station: BAR_DISHES.includes(id) ? 'bar' : COLD_DISHES.includes(id) ? 'cold' : 'hot', sub: DRINK_SUB[id] || null,
    recipe: Object.entries(recipe).map(([ing, qty]) => ({ ing, qty })),
    hit: INITIAL_PROMO.hits.includes(id), discount: INITIAL_PROMO.discounts[id] || 0, stop: false };
}
function buildSeedCatalog() {
  const dishes = DISH_SPEC.map(dishFromSpec);
  const need = {};
  dishes.forEach(d => d.recipe.forEach(r => { need[r.ing] = (need[r.ing] || 0) + r.qty * d.pop * SCALE; }));
  const rnd = mulberry32(42);
  const ingredients = ING_SPEC.map(([id, name, unit, sup, retail, pack, shelf, cat]) => {
    const price = unit === 'pcs' ? Math.max(1, Math.round(retail * 0.8)) : Math.round(retail * 0.8 / 10) * 10;
    const dn = need[id] || 0, m = STOCK_MULT[id];
    let stock = typeof m === 'string' ? +m.slice(4) : roundNice(dn * (m ?? (1.4 + rnd() * 1.6)), unit);
    if (typeof m !== 'string' && m !== 0 && stock < pack) stock = pack; // минимум одна фасовка
    const min = roundNice(dn * (shelf > 30 ? 3 : 1), unit) || pack;
    return { id, name, unit, cat, stock, min, pack, shelf,
      offers: [{ s: sup, price }, { s: 'metro', price: unit === 'pcs' ? Math.ceil(price * 1.13) : Math.round(price * 1.13 / 10) * 10 }] };
  });
  const now = new Date();
  let yest = addDays(now, -1); while (![2, 5].includes(isoDow(yest))) yest = addDays(yest, -1);
  const cat = { v: CAT_V, seededAt: Date.now(), dishes, ingredients, suppliers: clone(SUPPLIERS_SEED), settings: clone(DEFAULT_SETTINGS), pos: [], moves: [] };
  const greenNext = deliverySchedule(cat.suppliers.find(s => s.id === 'green'), now).next;
  cat.pos.push(makePO(cat, 'green', 'sent', greenNext, [['cucumber', 3000], ['cherry', 3000], ['banana', 4000], ['lettuce', 1500]], now.getTime() - 3 * 3600e3));
  const po2 = makePO(cat, 'fish', 'received', startOfDay(yest), [['salmon', 4000], ['cod', 2000]], yest.getTime() - 26 * 3600e3);
  po2.receivedAt = new Date(yest).setHours(9, 40, 0, 0); cat.pos.push(po2);
  cat.moves = [
    { id: uid('m'), at: po2.receivedAt, ing: 'salmon', qty: 4000, type: 'in', note: 'Приёмка: Северная рыба' },
    { id: uid('m'), at: po2.receivedAt + 60e3, ing: 'cod', qty: 2000, type: 'in', note: 'Приёмка: Северная рыба' },
    { id: uid('m'), at: now.getTime() - 5 * 3600e3, ing: 'spinach', qty: -300, type: 'waste', note: 'Порча: завял' },
    { id: uid('m'), at: now.getTime() - 4 * 3600e3, ing: 'avocado', qty: -3, type: 'inv', note: 'Инвентаризация: недостача' },
  ];
  return cat;
}
function makePO(cat, supId, status, deliveryDate, items, createdAt) {
  const its = items.map(([ing, qty]) => { const i = cat.ingredients.find(x => x.id === ing); const off = i.offers.find(o => o.s === supId) || i.offers[0]; return { ing, qty, price: off.price }; });
  return { id: uid('po'), supplierId: supId, status, createdAt: createdAt || Date.now(), deliveryDate: startOfDay(deliveryDate).getTime(), items: its,
    total: its.reduce((s, it) => s + unitCost(it.qty, cat.ingredients.find(x => x.id === it.ing).unit, it.price), 0) };
}
/* заказ: позиции → задачи цехов; части: стакан (напитки) и пакет (еда) */
function taskDur(d, q) { return (d.cook + Math.ceil(d.cook * 0.3) * (q - 1)) * MIN; }
function buildOrder(cat, items, extra) {
  const dishes = Object.fromEntries(cat.dishes.map(d => [d.id, d]));
  const its = items.map(([id, q]) => { const d = dishes[id]; return { d: id, n: d.name, e: d.emoji, q, price: Math.round(d.price * (1 - (d.discount || 0) / 100)), full: d.price, st: d.station, drink: d.station === 'bar', type: d.type }; });
  const hasFood = its.some(i => !i.drink), hasDrink = its.some(i => i.drink);
  const o = Object.assign({ id: uid('o'), no: '', name: '', phone: '', card: '', comment: '', mode: 'gym', items: its,
    total: its.reduce((s, it) => s + it.price * it.q, 0), saved: its.reduce((s, it) => s + (it.full - it.price) * it.q, 0), payMethod: 'card',
    createdAt: Date.now(), readyAt: Date.now() + 60 * MIN, status: 'paid', history: {},
    tasks: its.map((it, i) => ({ i, st: it.st, dur: taskDur(dishes[it.d], it.q) })),
    pack: { need: hasFood }, cup: { need: hasDrink }, bag: { need: hasFood }, pickTok: null }, extra || {});
  o.history.paid = o.history.paid || o.createdAt;
  return o;
}
function bagSize(o) { if (o.items.some(i => i.type === 'set' || i.type === 'ration') || o.items.filter(i => !i.drink).reduce((s, i) => s + i.q, 0) >= 4) return 'L'; if (o.items.some(i => !i.drink && (i.st === 'hot'))) return 'M'; return 'S'; }
function buildSeedOrders(cat) {
  const now = Date.now(), used = new Set(), fdRef = { v: 1180 }, emails = ['anna.k@mail.ru', '', 'ksenia.fit@yandex.ru', 'maria@inbox.ru', '', 'elena.s@gmail.com', '', 'sergey.p@mail.ru', ''];
  let ix = 0;
  const no = () => { let n; do { n = String(100 + Math.floor(Math.random() * 900)); } while (used.has(n)); used.add(n); return n; };
  const mk = (name, phone, mode, items, readyIn, status, extra = {}) => {
    const o = buildOrder(cat, items, { no: no(), name, phone, mode, readyAt: ceilMin(now + readyIn * MIN), status, payMethod: Math.random() > .5 ? 'card' : 'sbp', demo: true, comment: extra.comment || '' });
    o.createdAt = o.readyAt - 70 * MIN; o.history = { paid: o.createdAt };
    const flow = ['paid', 'cooking', 'ready', 'delivering', 'placed', 'done'], k = flow.indexOf(status);
    const t0 = o.readyAt - 40 * MIN;
    if (status === 'cooking') { o.tasks[0].start = now - 5 * MIN; o.history.cooking = o.tasks[0].start; }
    if (k >= 2) { o.tasks.forEach(t => { t.start = t0; t.done = t0 + t.dur; }); o.history.cooking = t0; o.pack.done = o.pack.need ? t0 + 22 * MIN : undefined; o.history.ready = o.readyAt - 12 * MIN; o.writtenOff = true; }
    if (k >= 3) o.history.delivering = o.readyAt - 9 * MIN;
    if (k >= 4) { o.pickTok = rndTok('P-'); o.history.placed = o.readyAt - 3 * MIN; if (o.cup.need) o.cup.placedAt = o.history.placed; if (o.bag.need && mode === 'gym') { o.bag.cell = extra.cell; o.bag.depositedAt = o.history.placed; } if (mode === 'cafe') o.shelfAt = o.history.placed; }
    if (k >= 5) { o.history.done = o.readyAt + 6 * MIN; if (o.bag.need) o.bag.pickedAt = o.history.done; if (o.cup.need) o.cup.pickedAt = o.history.done; }
    o.email = extra.email != null ? extra.email : emails[ix++ % emails.length];
    const LY = cat.settings.loyalty;
    if (extra.loy === 'welcome') Object.assign(o, { welcome: Math.min(o.total, LY.welcomeCap || o.total), welcomeTtl: LY.ttlDays, welcomeSpend: LY.spendPct });
    if (extra.loy === 'staff') Object.assign(o, { staffDisc: Math.round(o.total * LY.staffDiscount / 100), staffRole: 'Тренер' });
    if (extra.bonus) o.bonus = Math.min(extra.bonus, o.total - 1);
    o.paid = o.total - (o.staffDisc || 0) - (o.bonus || 0);
    if (extra.trainer) { const t = LY.staff.find(x => x.code === extra.trainer); if (t) o.trainer = { code: t.code, name: t.name, phone: t.phone, pct: LY.trainerPct, fee: Math.round(o.paid * LY.trainerPct / 100) }; }
    seedReceipts(o, cat.settings.fiscal, fdRef);
    return o;
  };
  const list = [
    mk('Анна', '+7 916 ••• 21 40', 'gym', [['caesar', 1], ['shakeberry', 1]], 55, 'paid', { comment: 'Без гренок', trainer: '101' }),
    mk('Игорь', '+7 903 ••• 77 12', 'gym', [['megabowl', 1], ['gainer', 1]], 22, 'paid'),
    mk('Ксения', '+7 985 ••• 50 03', 'gym', [['cappuccino', 1], ['greensmoothie', 1]], 12, 'paid'),
    mk('Мария', '+7 925 ••• 10 05', 'cafe', [['bolognese', 1], ['kidcutlets', 1]], 21, 'cooking'),
    mk('Дмитрий', '+7 999 ••• 45 61', 'gym', [['chickenrice', 1], ['bar', 2], ['americano', 1]], 6, 'ready'),
    mk('Елена', '+7 915 ••• 33 18', 'gym', [['salmonbatat', 1], ['mors', 1]], -4, 'placed', { cell: 'B2' }),
    mk('Ольга', '+7 926 ••• 81 93', 'cafe', [['greek', 1], ['cappuccino', 1]], -2, 'placed'),
    mk('Сергей', '+7 901 ••• 62 70', 'gym', [['teriyaki', 1], ['shakebanana', 1]], -45, 'done', { cell: 'C1', trainer: '101' }),
    mk('Павел', '+7 977 ••• 04 27', 'gym', [['beefbuck', 1]], -110, 'done', { cell: 'B4', trainer: '102' }),
  ];
  const m1 = mk('Марина', '+7 900 222-22-22', 'gym', [['salmonbatat', 1], ['oj', 1]], -3 * 1440 - 30, 'done', { email: 'marina.fit@mail.ru', loy: 'welcome' });
  list.push(m1, mk('Марина', '+7 900 222-22-22', 'gym', [['chickenrice', 1], ['matcha', 1]], -1440 - 60, 'done', { email: 'marina.fit@mail.ru', bonus: Math.floor(m1.welcome * m1.welcomeSpend / 100) }),
    mk('Алексей', '+7 900 111-11-11', 'gym', [['megabowl', 1], ['shakeberry', 1]], -150, 'done', { email: '', loy: 'staff' }));
  // прошлый месяц: заказы с ID тренеров — за них уже можно выплатить вознаграждение
  const d0 = new Date(now), prev = (day, h) => Math.round((new Date(d0.getFullYear(), d0.getMonth() - 1, day, h, 0).getTime() - now) / MIN);
  const past = [['Виктор', '+7 905 ••• 18 22', [['chickenrice', 1], ['shakeberry', 1]], 6, 13, '101'], ['Наталья', '+7 916 ••• 70 41', [['caesar', 1], ['mors', 1]], 9, 19, '101'],
    ['Роман', '+7 925 ••• 33 09', [['megabowl', 1], ['gainer', 1]], 14, 12, '102'], ['Юлия', '+7 903 ••• 92 15', [['salmonbatat', 1], ['greensmoothie', 1]], 17, 20, '101'],
    ['Артём', '+7 999 ••• 11 64', [['teriyaki', 1], ['americano', 1]], 22, 18, '102'], ['Вера', '+7 977 ••• 58 30', [['greek', 1], ['matcha', 1]], 27, 13, '101']];
  past.forEach(([n, ph, it, day, h, tr]) => list.push(mk(n, ph, 'gym', it, prev(day, h), 'done', { cell: 'A1', trainer: tr })));
  // за прошлый месяц Ирине уже выплатили, Алексею — ещё нет (кнопка «Выплатить» у управляющего)
  const pm = monthKey(new Date(d0.getFullYear(), d0.getMonth() - 1, 15).getTime());
  const ir = list.filter(o => o.trainer && o.trainer.code === '102' && monthKey(o.history.done) === pm);
  cat.settings.loyalty.payouts = [{ mk: pm, code: '102', name: 'Ирина Котова', amount: ir.reduce((s, o) => s + o.trainer.fee, 0), n: ir.length, at: new Date(d0.getFullYear(), d0.getMonth(), 1, 11, 20).getTime() }];
  return list;
}
function buildSeedLockers(orders) {
  const L = { cells: clone(LOCKER_SEED), log: [] };
  orders.filter(o => o.status === 'placed' && o.bag.cell).forEach(o => { const c = L.cells.find(x => x.id === o.bag.cell); Object.assign(c, { state: 'occupied', orderId: o.id, no: o.no, since: o.bag.depositedAt }); });
  return L;
}

/* ===== Состояние ===== */
const S = { catalog: null, orders: {}, lockers: null, mode: 'local', dbStatus: 'off', dbNote: '', version: 0 };
let DISH = {}, ING = {}, SUP = {};
let _cache = {};
function reindex() {
  if (!S.catalog.settings.stations) S.catalog.settings = Object.assign(clone(DEFAULT_SETTINGS), S.catalog.settings);
  if (!S.catalog.settings.fiscal) S.catalog.settings.fiscal = clone(DEFAULT_SETTINGS.fiscal);
  if (!S.catalog.settings.loyalty) S.catalog.settings.loyalty = clone(DEFAULT_SETTINGS.loyalty);
  S.catalog.settings.loyalty = Object.assign(clone(DEFAULT_SETTINGS.loyalty), S.catalog.settings.loyalty);
  DISH = Object.fromEntries(S.catalog.dishes.map(d => [d.id, d]));
  ING = Object.fromEntries(S.catalog.ingredients.map(i => [i.id, i]));
  SUP = Object.fromEntries(S.catalog.suppliers.map(s => [s.id, s]));
  S.version++; _cache = {};
}
const memo = (key, fn) => (key in _cache ? _cache[key] : (_cache[key] = fn()));
const ordersList = () => Object.values(S.orders).sort((a, b) => a.readyAt - b.readyAt);

/* ===== Хранилище ===== */
const LS = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } },
};
let BC = null; try { BC = new BroadcastChannel('etazhom-nizhe-v5'); } catch (e) { }
const LS_CAT = 'en-catalog-v5', LS_ORD = 'en-orders-v5', LS_LOCK = 'en-lockers-v5', LS_MY = 'en-my-orders-v5';
let _memMy = [];
const myOrderIds = () => LS.get(LS_MY) || _memMy;
function addMyOrder(id) { const a = myOrderIds().filter(x => x !== id); a.push(id); _memMy = a.slice(-20); LS.set(LS_MY, _memMy); }
function seedLocal() { const cat = buildSeedCatalog(); S.catalog = cat; reindex(); const o = buildSeedOrders(cat); S.orders = Object.fromEntries(o.map(x => [x.id, x])); S.lockers = buildSeedLockers(o); saveLocal(); }
function loadLocal() {
  const cat = LS.get(LS_CAT);
  if (!cat || cat.v !== CAT_V) seedLocal();
  else { S.catalog = cat; reindex(); S.orders = LS.get(LS_ORD) || {}; S.lockers = LS.get(LS_LOCK) || { cells: clone(LOCKER_SEED), log: [] }; }
}
function saveLocal() { LS.set(LS_CAT, S.catalog); LS.set(LS_ORD, S.orders); LS.set(LS_LOCK, S.lockers); if (BC) try { BC.postMessage('sync'); } catch (e) { } }
function syncFromLocal() { const c = LS.get(LS_CAT); if (!c) return; const before = S.orders; S.catalog = c; reindex(); S.orders = LS.get(LS_ORD) || {}; S.lockers = LS.get(LS_LOCK) || S.lockers; onOrdersChanged(before); render(); }

let DB = null, USER = null, CAN_WRITE = null;
const writeChains = {};
function dbSet(path, data) {
  const prev = writeChains[path] || Promise.resolve();
  const next = prev.then(() => DB.doc(path).set(clone(data))).catch(e => dbError(e));
  writeChains[path] = next; return next;
}
function dbError(e) {
  const code = e && e.code;
  if (code === 'invalid_argument' && CAN_WRITE !== true) { S.dbNote = 'У вас доступ только на просмотр — изменения не сохраняются в общей базе.'; toast(S.dbNote, 'warn'); }
  else if (code === 'quota_exceeded') toast('Общая база переполнена: сбросьте демо-данные.', 'warn');
  else if (code) toast('Ошибка общей базы: ' + code, 'warn');
  render();
}
let _catTimer = null;
function saveCatalog() { reindex(); if (S.mode === 'db') { clearTimeout(_catTimer); _catTimer = setTimeout(() => dbSet('shop/catalog', S.catalog), 250); } else saveLocal(); }
function saveOrder(o) { S.orders[o.id] = o; _cache = {}; if (S.mode === 'db') dbSet('orders/' + o.id, o); else saveLocal(); }
function saveLockers() { _cache = {}; if (S.mode === 'db') dbSet('shop/lockers', S.lockers); else saveLocal(); }

/* недостающие настройки старой версии каталога берём из значений по умолчанию (в памяти, без записи) */
function upgradeCatalog(c) {
  c.settings = c.settings || {};
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    if (c.settings[k] === undefined) c.settings[k] = clone(v);
    else if (v && typeof v === 'object' && !Array.isArray(v) && c.settings[k] && typeof c.settings[k] === 'object') c.settings[k] = Object.assign(clone(v), c.settings[k]);
  }
  return c;
}
async function initDb() {
  const c = window.claude;
  if (!c || typeof c.use !== 'function') return;
  let db, user;
  try { [db, user] = await Promise.all([c.use('db'), c.use('user')]); } catch (e) { return; }
  if (!db) return;
  DB = db; USER = user;
  try { CAN_WRITE = user ? await Promise.resolve(user.can('data.write')) : null; } catch (e) { CAN_WRITE = null; }
  let isOwner = false; try { isOwner = user ? !!(await Promise.resolve(user.isOwner())) : false; } catch (e) { }
  const canWrite = isOwner || CAN_WRITE !== false;
  S.dbStatus = 'connecting'; render();
  const timer = setTimeout(() => { if (S.dbStatus === 'connecting') { S.dbStatus = 'slow'; S.dbNote = 'Общая база пока недоступна — работаем с демо-данными в этом браузере.'; render(); } }, 10000);
  let seeding = false, migrating = false, subscribed = false;
  DB.doc('shop/catalog').onSnapshot(async snap => {
    const data = snap.exists ? snap.data() : null, cached = !!(snap.metadata && snap.metadata.fromCache);
    if (data && Array.isArray(data.dishes)) {
      /* общая база есть — работаем с ней, даже если каталог от прошлой версии демо:
         иначе каждое устройство живёт в своём браузере и кухня не видит заказы с телефона */
      clearTimeout(timer);
      S.catalog = upgradeCatalog(clone(data)); S.mode = 'db'; S.dbStatus = 'live'; S.dbNote = ''; reindex();
      if (!subscribed) { subscribed = true; subscribeRest(); }
      render();
      if ((data.v || 0) < CAT_V && !cached && canWrite && !migrating) { migrating = true; migrateSharedCatalog(); }
    } else if (!cached) {
      clearTimeout(timer); S.dbStatus = 'empty';
      if (canWrite && !seeding) { seeding = true; await seedSharedDb(); } else render();
    }
  }, err => { clearTimeout(timer); S.dbStatus = 'error'; S.dbNote = 'Общая база недоступна (' + (err && err.code) + ') — показываем демо-данные этого браузера.'; render(); });
}
/* каталог в общей базе от старой версии демо → одна запись нового каталога; заказы остаются */
async function migrateSharedCatalog() {
  try {
    let lease = { acquired: true };
    try { lease = await DB.doc('shop/catalog').acquire({ holder: uid('mig'), ttlMs: 15000 }); } catch (e) { }
    if (!lease.acquired) return;
    const snap = await DB.doc('shop/catalog').get();
    const cur = snap.exists ? snap.data() : null;
    if (cur && (cur.v || 0) >= CAT_V) return;
    await dbSet('shop/catalog', buildSeedCatalog());
  } catch (e) { dbError(e); }
}
let _ordersPrimed = false;
function subscribeRest() {
  DB.collection('orders').orderBy('readyAt', 'desc').limit(400).onSnapshot(qs => {
    const m = {}; qs.docs.forEach(d => { const o = d.data(); if (o && o.id && o.tasks) m[o.id] = clone(o); });
    const before = S.orders; S.orders = m; _cache = {}; if (_ordersPrimed) onOrdersChanged(before); _ordersPrimed = true; render();
  }, err => { S.dbNote = 'Заказы из общей базы не загрузились (' + (err && err.code) + ').'; render(); });
  DB.doc('shop/lockers').onSnapshot(snap => { if (snap.exists) { S.lockers = clone(snap.data()); _cache = {}; render(); } }, () => { });
}
async function writeSeed() {
  const qs = await DB.collection('orders').limit(1000).get();
  for (const d of qs.docs) await DB.doc('orders/' + d.id).delete();
  const cat = buildSeedCatalog(); const orders = buildSeedOrders(cat);
  for (const o of orders) await DB.doc('orders/' + o.id).set(o);
  await DB.doc('shop/lockers').set(buildSeedLockers(orders));
  await DB.doc('shop/catalog').set(cat);
}
async function seedSharedDb() {
  try {
    const lease = await DB.doc('shop/catalog').acquire({ holder: uid('seed'), ttlMs: 20000 });
    if (!lease.acquired) return;
    const snap = await DB.doc('shop/catalog').get();
    if (snap.exists && snap.data() && snap.data().v === CAT_V) return;
    await writeSeed();
    toast('Общая база создана — заказы видны на всех устройствах.', 'ok');
  } catch (e) { dbError(e); }
}
async function resetDemo() {
  if (S.mode === 'db') {
    if (CAN_WRITE === false) { toast('Нет прав на изменение общей базы.', 'warn'); return; }
    try { await writeSeed(); toast('Демо-данные восстановлены', 'ok'); } catch (e) { dbError(e); }
  } else { LS.del(LS_MY); _memMy = []; seedLocal(); toast('Демо-данные восстановлены', 'ok'); render(); }
}

/* ===== Цены, резерв, порции ===== */
const effPrice = d => Math.round(d.price * (1 - (d.discount || 0) / 100));
function reserved() {
  return memo('reserved', () => {
    const r = {};
    Object.values(S.orders).forEach(o => {
      if (o.status === 'cancelled' || !o.tasks) return;
      o.tasks.forEach(t => { if (t.start) return; const it = o.items[t.i], d = DISH[it.d]; if (!d) return; d.recipe.forEach(x => { r[x.ing] = (r[x.ing] || 0) + x.qty * it.q; }); });
    });
    return r;
  });
}
const available = id => (ING[id] ? ING[id].stock : 0) - (reserved()[id] || 0);
function portions(d, extra) {
  if (!d.recipe.length) return 99;
  let m = Infinity;
  d.recipe.forEach(x => { const a = available(x.ing) - ((extra && extra[x.ing]) || 0); m = Math.min(m, Math.floor(a / x.qty + 1e-9)); });
  return Math.max(0, m === Infinity ? 0 : m);
}
function limitingIng(d) { let m = Infinity, lim = null; d.recipe.forEach(x => { const p = available(x.ing) / x.qty; if (p < m) { m = p; lim = x.ing; } }); return lim; }
const onSale = d => !d.stop && portions(d) > 0;
const dishCost = d => d.recipe.reduce((s, x) => { const i = ING[x.ing]; return i ? s + unitCost(x.qty, i.unit, i.offers[0].price) : s; }, 0);
function needFor(items) { const r = {}; Object.entries(items).forEach(([id, q]) => { const d = DISH[id]; if (!d) return; d.recipe.forEach(x => { r[x.ing] = (r[x.ing] || 0) + x.qty * q; }); }); return r; }

/* ===== История продаж и прогноз ===== */
function histSales(d, date) {
  const r = mulberry32(hashStr(d.id + dayKey(date)));
  const dow = isoDow(date);
  const fam = d.type === 'set' || d.goals.includes('family') || d.goals.includes('kids');
  const wf = d.type === 'drink' ? 1 : (fam ? FAM_W : FIT_W)[dow - 1];
  const weeksAgo = (startOfDay(new Date()) - startOfDay(date)) / (7 * 864e5);
  return Math.floor((d.pop || 3) * SCALE * wf * (1 - 0.015 * weeksAgo) * (0.7 + r() * 0.6) + r());
}
function forecastDish(d, date) {
  if (d.stop) return 0;
  const st = S.catalog.settings; let s = 0;
  for (let k = 1; k <= 4; k++) s += histSales(d, addDays(date, -7 * k));
  let f = s / 4 * (1 + (st.growth || 0) / 100);
  if (st.promo) f *= (d.hit ? 1.3 : 1) * (1 + 1.5 * (d.discount || 0) / 100);
  return f;
}
const dayRemainFrac = () => { const n = new Date(); const h = n.getHours() + n.getMinutes() / 60; return Math.min(1, Math.max(0, (CLOSE_H - h) / (CLOSE_H - OPEN_H))); };
function ingDemandByDay() {
  return memo('demand', () => {
    const today = startOfDay(new Date()), frac = dayRemainFrac(), out = [];
    for (let k = 0; k < 21; k++) { const date = addDays(today, k), need = {}; S.catalog.dishes.forEach(d => { const f = forecastDish(d, date) * (k === 0 ? frac : 1); if (!f) return; d.recipe.forEach(x => { need[x.ing] = (need[x.ing] || 0) + f * x.qty; }); }); out.push({ date, need }); }
    return out;
  });
}
function demandBetween(ing, from, to) { const a = startOfDay(from).getTime(), b = startOfDay(to).getTime(); return ingDemandByDay().reduce((s, x) => s + (x.date.getTime() >= a && x.date.getTime() < b ? (x.need[ing] || 0) : 0), 0); }
function avgDailyNeed(ing) { const days = ingDemandByDay().slice(1, 8); return days.reduce((s, x) => s + (x.need[ing] || 0), 0) / days.length; }
function firstDeliveryOnOrAfter(sup, date) { let d = startOfDay(date); for (let i = 0; i < 14; i++) { if (sup.days.includes(isoDow(d))) return d; d = addDays(d, 1); } return d; }
function deliverySchedule(sup, now = new Date()) { const lead = sup.lead + (now.getHours() >= sup.cutoff ? 1 : 0); const next = firstDeliveryOnOrAfter(sup, addDays(startOfDay(now), lead)); return { next, following: firstDeliveryOnOrAfter(sup, addDays(next, 1)) }; }
function orderedQty(ing) { return S.catalog.pos.filter(p => p.status === 'draft' || p.status === 'sent').reduce((s, p) => s + p.items.filter(i => i.ing === ing).reduce((a, i) => a + i.qty, 0), 0); }
function planRow(ing, supId) {
  const sup = SUP[supId] || SUP[ing.offers[0].s]; const { next, following } = deliverySchedule(sup); const today = new Date();
  const avail = available(ing.id), ordered = orderedQty(ing.id), needToNext = demandBetween(ing.id, today, next), needTotal = demandBetween(ing.id, today, following);
  let qty = needTotal * (1 + (S.catalog.settings.safety || 0) / 100) - avail - ordered; qty = qty > 0 ? Math.ceil(qty / ing.pack) * ing.pack : 0;
  const off = ing.offers.find(o => o.s === sup.id) || ing.offers[0];
  return { ing, sup, next, following, avail, ordered, needToNext, needTotal, qty, price: off.price, sum: unitCost(qty, ing.unit, off.price), risk: avail + ordered < needToNext * 0.999 && needToNext > 0 };
}
function defaultSupplier(ing) { const main = ing.offers[0].s, r = planRow(ing, main); if (r.risk) { const alt = ing.offers.find(o => SUP[o.s] && SUP[o.s].backup); if (alt && deliverySchedule(SUP[alt.s]).next < r.next) return alt.s; } return main; }

/* ===== Планировщик кухни ===== */
const st = () => S.catalog.settings;
function deliverMs(o) { const s = st(); return (o.mode === 'cafe' ? s.deliver.cafe : (o.bag.need ? s.deliver.locker : s.deliver.counter)) * MIN; }
const packMs = o => o.pack.need ? st().packMin * MIN : 0;
const deadlineOf = o => o.readyAt - deliverMs(o) - packMs(o);
const kitchenOrders = () => Object.values(S.orders).filter(o => o.tasks && (o.status === 'paid' || o.status === 'cooking'));
function latestFit(busy, latest, dur, now) {
  const cands = [latest, ...busy.map(b => b[0] - dur)].filter(s => s <= latest && s >= now).sort((a, b) => b - a);
  for (const s of cands) if (!busy.some(b => s < b[1] && s + dur > b[0])) return s;
  return null;
}
function earliestFit(busy, now, dur) {
  const cands = [now, ...busy.map(b => b[1])].filter(s => s >= now).sort((a, b) => a - b);
  for (const s of cands) if (!busy.some(b => s < b[1] && s + dur > b[0])) return s;
  return now;
}
function schedule(extra) {
  const now = Date.now(), s = st();
  const slots = {}; STATIONS.forEach(x => { slots[x.id] = Array.from({ length: Math.max(1, s.stations[x.id] || 1) }, () => []); });
  const plan = {}, pending = [];
  const orders = kitchenOrders().concat(extra ? [extra] : []);
  orders.forEach(o => o.tasks.forEach((t, ix) => {
    const key = o.id + ':' + ix;
    if (t.done) return;
    if (t.start) {
      const end = Math.max(t.start + t.dur, now + 30e3), sl = slots[t.st] || slots.hot;
      let si = sl.findIndex(b => !b.some(x => t.start < x[1] && end > x[0])); if (si < 0) si = 0;
      sl[si].push([t.start, end]); plan[key] = { o, t, ix, start: t.start, end, si, started: true, late: end > deadlineOf(o) + 30e3 };
      return;
    }
    pending.push({ o, t, ix, key, D: deadlineOf(o) });
  }));
  pending.sort((a, b) => (b.D - a.D) || (b.t.dur - a.t.dur));
  pending.forEach(p => {
    const sl = slots[p.t.st] || slots.hot; let best = null, late = false;
    sl.forEach((busy, si) => { const x = latestFit(busy, p.D - p.t.dur, p.t.dur, now); if (x != null && (!best || x > best.s)) best = { s: x, si }; });
    if (!best) { sl.forEach((busy, si) => { const x = earliestFit(busy, now, p.t.dur); if (!best || x < best.s) best = { s: x, si }; }); late = best.s + p.t.dur > p.D + MIN; }
    sl[best.si].push([best.s, best.s + p.t.dur]);
    plan[p.key] = { o: p.o, t: p.t, ix: p.ix, start: best.s, end: best.s + p.t.dur, si: best.si, late };
  });
  return plan;
}
const plan = () => memo('plan' + Math.floor(Date.now() / 15000), () => schedule());
const lateCount = (p, exceptId) => Object.values(p).filter(x => x.late && x.o.id !== exceptId).length;
function orderFinishAt(o, p) { const ends = o.tasks.map((t, ix) => t.done || (p[o.id + ':' + ix] || {}).end || 0); return Math.max(...ends) + packMs(o) + deliverMs(o); }
/* минимальное время готовности корзины */
function minReadyAt(cart, mode) {
  const ids = Object.keys(cart).filter(id => DISH[id]); if (!ids.length) return null;
  const key = 'min:' + mode + ':' + ids.map(id => id + 'x' + cart[id]).join(',') + ':' + Math.floor(Date.now() / 15000);
  return memo(key, () => {
    const fake = buildOrder(S.catalog, ids.map(id => [id, cart[id]]), { id: 'draft', mode });
    const baseLate = lateCount(plan());
    const maxDur = Math.max(...fake.tasks.map(t => t.dur));
    let T = ceilMin(Date.now() + maxDur + deliverMs(fake) + packMs(fake) + MIN);
    for (let k = 0; k < 240; k++) {
      fake.readyAt = T; const p = schedule(fake);
      const mine = fake.tasks.some((t, ix) => p['draft:' + ix].late);
      if (!mine && lateCount(p, 'draft') <= baseLate) return T;
      T += MIN;
    }
    return T;
  });
}

/* ===== Операции ===== */
function addMove(ing, qty, type, note) { S.catalog.moves.unshift({ id: uid('m'), at: Date.now(), ing, qty, type, note }); if (S.catalog.moves.length > 200) S.catalog.moves.length = 200; }
function writeOffItems(items, type, note) {
  items.forEach(it => { const d = DISH[it.d]; if (!d) return; d.recipe.forEach(x => { const i = ING[x.ing]; if (!i) return; i.stock = Math.max(0, +(i.stock - x.qty * it.q).toFixed(2)); addMove(x.ing, -x.qty * it.q, type, note); }); });
}
function mark(o, status) { o.status = status; o.history = o.history || {}; o.history[status] = Date.now(); if (status === 'done') fiscalOnDone(o); }
function refreshStatus(o) {
  if (o.status === 'cancelled' || o.status === 'done') return;
  const allDone = o.tasks.every(t => t.done), anyStart = o.tasks.some(t => t.start);
  if (o.status === 'paid' && anyStart) mark(o, 'cooking');
  if ((o.status === 'paid' || o.status === 'cooking') && allDone && (!o.pack.need || o.pack.done)) mark(o, 'ready');
}
function taskStart(oid, ix) {
  const o = clone(S.orders[oid]); const t = o.tasks[ix]; if (!t || t.start) return;
  t.start = Date.now(); const it = o.items[t.i];
  writeOffItems([{ d: it.d, q: it.q }], 'order', 'Заказ №' + o.no); saveCatalog();
  refreshStatus(o); saveOrder(o);
}
function taskDone(oid, ix) { const o = clone(S.orders[oid]); const t = o.tasks[ix]; if (!t) return; if (!t.start) t.start = Date.now(); t.done = Date.now(); refreshStatus(o); saveOrder(o); }
function packDone(oid) { const o = clone(S.orders[oid]); o.pack.done = Date.now(); refreshStatus(o); saveOrder(o); }
function cancelOrder(oid) { const o = clone(S.orders[oid]); if (o.tasks.some(t => t.start)) return false; mark(o, 'cancelled'); fiscalOnCancel(o); saveOrder(o); return true; }
function newOrderNo() { const used = new Set(Object.values(S.orders).filter(o => sameDay(o.createdAt, Date.now())).map(o => o.no)); let n; do { n = String(100 + Math.floor(Math.random() * 900)); } while (used.has(n)); return n; }
function allPlaced(o) { if (o.mode === 'cafe') return !!o.shelfAt; return (!o.cup.need || o.cup.placedAt) && (!o.bag.need || o.bag.depositedAt); }
function takeOrder(oid) { const o0 = S.orders[oid]; if (!o0 || o0.status !== 'ready') return null; let cell = null; if (o0.mode === 'gym' && o0.bag.need) { cell = allocateCell(oid); if (!cell) { toast('Нет свободных ячеек подходящего размера', 'warn'); return null; } } const o = clone(S.orders[oid]); mark(o, 'delivering'); saveOrder(o); return cell; }
function shelfPlace(oid) { const o = clone(S.orders[oid]); o.shelfAt = Date.now(); o.pickTok = rndTok('P-'); if (o.cup.need) o.cup.placedAt = o.shelfAt; mark(o, 'placed'); saveOrder(o); }
function cafeHandOver(oid) { const o = clone(S.orders[oid]); const t = Date.now(); if (o.bag.need) o.bag.pickedAt = t; if (o.cup.need) o.cup.pickedAt = t; o.pickedBy = 'staff'; mark(o, 'done'); saveOrder(o); }

/* ----- ячейки шкафа ----- */
const SIZE_RANK = { S: 1, M: 2, L: 3 };
function lockerLog(text) { S.lockers.log = S.lockers.log || []; S.lockers.log.unshift({ at: Date.now(), text }); if (S.lockers.log.length > 40) S.lockers.log.length = 40; }
function cellFree(c) { return c.state === 'free' || (c.state === 'reserved' && c.depExp < Date.now() && !c.openFor); }
function allocateCell(oid) {
  const o = clone(S.orders[oid]); if (!o.bag.need) return null;
  if (o.bag.cell) { const c = S.lockers.cells.find(x => x.id === o.bag.cell); if (c && c.state === 'reserved') { c.depTok = rndTok('D-'); c.depExp = Date.now() + 10 * MIN; saveLockers(); return c; } }
  const need = SIZE_RANK[bagSize(o)];
  const c = S.lockers.cells.filter(cellFree).filter(x => SIZE_RANK[x.size] >= need).sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size])[0];
  if (!c) return null;
  Object.assign(c, { state: 'reserved', orderId: o.id, no: o.no, depTok: rndTok('D-'), depExp: Date.now() + 10 * MIN, openFor: null });
  lockerLog(`Ячейка ${c.id} забронирована для №${o.no}`); saveLockers();
  o.bag.cell = c.id; saveOrder(o); return c;
}
/* сканирование QR на табло шкафа: возвращает {ok, msg, cell} */
function lockerScan(tok) {
  tok = (tok || '').trim().toUpperCase();
  const dep = S.lockers.cells.find(c => c.depTok && c.depTok === tok && c.state === 'reserved');
  if (dep) {
    if (dep.depExp < Date.now()) return { ok: false, msg: 'Код официанта просрочен — получите ячейку заново' };
    dep.state = 'open'; dep.openFor = 'deposit'; dep.depTok = null; lockerLog(`${dep.id} открыта официантом для №${dep.no}`); saveLockers();
    return { ok: true, msg: `Ячейка ${dep.id} открыта — положите пакет №${dep.no}, закройте дверцу и нажмите «Заказ доставлен в ячейку»`, cell: dep.id };
  }
  const o = tok ? Object.values(S.orders).find(x => x.pickTok === tok) : null;
  if (o) {
    const c = S.lockers.cells.find(x => x.orderId === o.id && (x.state === 'occupied' || (x.state === 'open' && x.openFor === 'pickup')));
    if (!c) return { ok: false, msg: o.bag.pickedAt ? 'Этот заказ уже получен' : 'Заказ ещё не в ячейке — дождитесь уведомления' };
    if (c.state === 'occupied') { c.state = 'open'; c.openFor = 'pickup'; c.openedAt = Date.now(); lockerLog(`${c.id} открыта клиентом, №${o.no}`); saveLockers(); }
    return { ok: true, msg: `Ячейка ${c.id} открыта — заберите заказ №${o.no}, закройте дверцу и нажмите «Заказ забрал»`, cell: c.id };
  }
  return { ok: false, msg: 'Код не подходит или уже использован' };
}
function lockerClose(cellId) {
  const c = S.lockers.cells.find(x => x.id === cellId); if (!c || c.state !== 'open') return;
  if (c.openFor === 'deposit' && c.orderId) bagDelivered(c.orderId);
}
/* ячейка освобождается для следующего заказа */
function freeCell(c, why) {
  lockerLog(`${c.id}: ${why} — ячейка свободна`);
  Object.assign(c, { state: 'free', orderId: null, no: null, openFor: null, since: null, openedAt: null, depTok: null, depExp: null });
  saveLockers();
}
function allPicked(o) {
  if (o.mode === 'cafe') return o.status === 'done';
  return (!o.cup.need || o.cup.pickedAt) && (!o.bag.need || o.bag.pickedAt);
}
/* клиент нажал «Заказ забрал». part: cup | bag | cafe. Для ячейки, которую клиент ещё не открывал своим QR, нужен force — иначе вернём 'confirm' */
function clientPicked(oid, part, force) {
  const o = clone(S.orders[oid]); if (!o || o.status === 'cancelled' || o.status === 'done') return false;
  const t = Date.now();
  if (part === 'cup') { if (!o.cup.placedAt || o.cup.pickedAt) return false; o.cup.pickedAt = t; }
  else if (part === 'bag') {
    if (!o.bag.depositedAt || o.bag.pickedAt) return false;
    const c = S.lockers.cells.find(x => x.id === o.bag.cell && x.orderId === o.id);
    if (c && c.state === 'occupied' && !force) return 'confirm';
    if (c) freeCell(c, `клиент забрал №${o.no} и нажал «Заказ забрал»`);
    o.bag.pickedAt = t;
  } else if (part === 'cafe') {
    if (!o.shelfAt) return false;
    if (o.bag.need) o.bag.pickedAt = t; if (o.cup.need) o.cup.pickedAt = t;
    o.pickedBy = 'client'; mark(o, 'done'); saveOrder(o); return true;
  } else return false;
  if (allPicked(o)) { if (!o.history.placed) mark(o, 'placed'); mark(o, 'done'); }
  saveOrder(o); return true;
}
/* страховка: клиент ушёл, не нажав кнопку, — официант освобождает ячейку вручную */
function staffRelease(cellId) {
  const c = S.lockers.cells.find(x => x.id === cellId); if (!c || !(c.state === 'occupied' || (c.state === 'open' && c.openFor === 'pickup'))) return false;
  const o = c.orderId && S.orders[c.orderId] ? clone(S.orders[c.orderId]) : null;
  freeCell(c, `освобождена официантом${c.no ? ', №' + c.no : ''}`);
  if (o && !o.bag.pickedAt) { o.bag.pickedAt = Date.now(); o.bag.releasedBy = 'staff'; if (allPicked(o)) mark(o, 'done'); saveOrder(o); }
  return true;
}
function cupPlaced(oid) { const o = clone(S.orders[oid]); o.cup.placedAt = Date.now(); if (allPlaced(o)) mark(o, 'placed'); saveOrder(o); }
/* официант положил пакет, закрыл дверцу и нажал «Заказ доставлен в ячейку»: только сейчас у клиента появляется QR-код */
function bagDelivered(oid) {
  const o = clone(S.orders[oid]); if (!o || !o.bag.cell) return false;
  const c = S.lockers.cells.find(x => x.id === o.bag.cell); if (!c || c.state !== 'open' || c.openFor !== 'deposit') return false;
  Object.assign(c, { state: 'occupied', since: Date.now(), openFor: null }); lockerLog(`${c.id}: пакет №${c.no} доставлен, дверца закрыта`); saveLockers();
  o.bag.depositedAt = Date.now(); o.pickTok = rndTok('P-'); if (allPlaced(o)) mark(o, 'placed'); saveOrder(o);
  return true;
}

/* ===== Уведомления ===== */
function notifyMyOrders(before) {
  if (typeof UI !== 'undefined' && UI.app !== 'client') return;
  const mine = new Set(typeof myOrders === 'function' ? myOrders().map(o => o.id) : myOrderIds()); let openId = null;
  Object.values(S.orders).forEach(o => {
    if (!mine.has(o.id)) return; const b = before[o.id]; if (!b) return;
    if (o.bag.depositedAt && !b.bag.depositedAt) { toast(`Заказ №${o.no} доставлен в ячейку ${o.bag.cell}. QR-код для ячейки — на странице заказа`, 'ok', 9000); openId = o.id; }
    if (o.cup.placedAt && !b.cup.placedAt && o.mode === 'gym') { toast(`Заказ №${o.no} доставлен на стойку ресепшена — заберите стакан с номером №${o.no}`, 'ok', 9000); openId = openId || o.id; }
    if (o.shelfAt && !b.shelfAt) { toast(`Заказ №${o.no} ждёт вас на стойке кафе`, 'ok', 8000); openId = openId || o.id; }
    if (b.status !== o.status) {
      if (o.status === 'cooking') toast(`Заказ №${o.no}: начали готовить`, 'info');
      else if (o.status === 'delivering') toast(`Заказ №${o.no}: официант несёт наверх`, 'info');
    }
  });
  // показываем страницу заказа в момент доставки, если клиент не занят другим окном
  if (openId && typeof UI !== 'undefined' && !UI.drawer && (!UI.modal || (UI.modal.kind === 'track' && UI.modal.id === openId))) UI.modal = { kind: 'track', id: openId };
}
function toast(msg, kind = 'info', ms = 3800) {
  const box = $('#toasts'); if (!box) return;
  const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg;
  box.appendChild(el); setTimeout(() => el.classList.add('out'), ms); setTimeout(() => el.remove(), ms + 400);
}
