/* ===== Приложения и маршруты ===== */
const APPS = [['client', 'Клиент', 'menu'], ['kitchen', 'Кухня', 'kitchen'], ['waiter', 'Официант', 'waiter'], ['locker', 'Шкаф', 'locker'], ['manager', 'Управляющий', 'admin-menu'], ['poster', 'QR в зале', 'poster']];
const MANAGER_VIEWS = ['admin-menu', 'stock', 'purchasing', 'receipts', 'loyalty', 'dashboard', 'settings'];
function readHash() {
  const h = location.hash.slice(1);
  if (MANAGER_VIEWS.includes(h)) { UI.app = 'manager'; UI.view = h; UI.mView = h; }
  else if (['kitchen', 'waiter', 'locker', 'poster'].includes(h)) { UI.app = h; UI.view = h; }
  else { UI.app = 'client'; UI.view = 'menu'; }
}
window.addEventListener('hashchange', () => { readHash(); UI.modal = null; UI.drawer = null; UI.lockMsg = null; render(); window.scrollTo(0, 0); });
const go = h => { if (location.hash.slice(1) === h) { readHash(); render(); } else location.hash = h; };

function demobarHTML() {
  const live = S.mode === 'db';
  const txt = live ? 'Общая база: все устройства видят одни данные' : S.dbStatus === 'connecting' ? 'Подключаем общую базу…' : 'Демо-данные в этом браузере · вкладки синхронизируются';
  return `<span class="tag">Прототип «Этажом ниже»</span>
    <div class="seg">${APPS.map(([id, n, h]) => `<button class="${UI.app === id ? 'on' : ''}" data-act="app" data-v="${id === 'manager' ? UI.mView || h : h}">${n}</button>`).join('')}</div>
    <span class="spacer"></span><span class="dbstate"><i class="dot ${live ? 'live' : 'local'}"></i><span class="hide-m">${txt}</span><span class="show-m">${live ? 'общая база' : 'этот браузер'}</span></span>
    <button class="reset" data-act="reset-demo">${UI.confirmReset ? 'Точно сбросить?' : 'Сбросить демо'}</button>`;
}
let _prevLayer = '';
function layerHTML() {
  let h = '';
  const key = (UI.app === 'client' && UI.drawer ? 'd' : '') + '|' + (UI.modal ? UI.modal.kind + (UI.modal.id || '') : '');
  const fresh = key !== _prevLayer; _prevLayer = key;
  if (UI.app === 'client' && UI.drawer) h += cartDrawer();
  const m = UI.modal;
  if (m) {
    if (m.kind === 'dish' && DISH[m.id]) h += dishModal(DISH[m.id]);
    else if (m.kind === 'track' && S.orders[m.id]) h += trackModal(S.orders[m.id]);
    else if (m.kind === 'my') h += myOrdersModal();
    else if (m.kind === 'login') h += loginModal();
    else if (m.kind === 'profile' && sessionKey()) h += profileModal();
    else if (m.kind === 'receipt' && S.orders[m.id]) { const o = S.orders[m.id], r = (o.receipts || []).find(x => x.id === m.r); if (r) h += receiptModal(o, r, m.back); }
    else if (m.kind === 'edit' && UI.editDish) h += editDishModal();
    else if (m.kind === 'op') h += opModal();
    else if (m.kind === 'receive') { const p = S.catalog.pos.find(x => x.id === m.id); if (p) h += receiveModal(p); }
  }
  if (fresh) h = h.replace(/class="overlay"/g, 'class="overlay anim"').replace(/class="drawer"/g, 'class="drawer anim"');
  return h;
}
function captureFocus() { const a = document.activeElement; if (!a || !a.dataset || !a.dataset.fk) return null; let s = null, e = null; try { s = a.selectionStart; e = a.selectionEnd; } catch (x) { } return { fk: a.dataset.fk, s, e }; }
function restoreFocus(f) { if (!f) return; const el = document.querySelector(`[data-fk="${CSS.escape(f.fk)}"]`); if (!el) return; el.focus({ preventScroll: true }); try { if (f.s != null) el.setSelectionRange(f.s, f.e); } catch (x) { } }
function render() {
  if (!S.catalog) return;
  const f = captureFocus();
  const scrollers = $$('.tw, .drawer .db, .modal').map(el => [el.className, el.scrollTop]);
  document.body.dataset.app = UI.app;
  $('#demobar').innerHTML = demobarHTML();
  const A = {
    client: [clientHead, clientMain], kitchen: [kitchenHead, kitchenMain], waiter: [waiterHead, waiterMain],
    locker: [() => staffHead('Табло шкафа', 'ячейки у ресепшена клуба'), lockerMain], manager: [adminHead, adminMain], poster: [() => '', posterMain],
  }[UI.app];
  $('#head').innerHTML = A[0](); $('#main').innerHTML = A[1]();
  $('#layer').innerHTML = layerHTML();
  $$('.tw, .drawer .db, .modal').forEach((el, k) => { const s = scrollers[k]; if (s && s[0] === el.className) el.scrollTop = s[1]; });
  document.documentElement.style.setProperty('--dbh', $('#demobar').offsetHeight + 'px');
  restoreFocus(f);
}
let _rs = null;
function renderSoon(ms = 120) { clearTimeout(_rs); _rs = setTimeout(render, ms); }

/* ===== Действия ===== */
const byId = id => S.orders[id];
const rcCount = o => (o && o.receipts ? o.receipts.length : 0);
function welcomeToast(id) { const o = byId(id); if (o && o.welcome && o.status === 'done') toast(`🎁 Начислено ${fmtRub(o.welcome)} бонусов — оплачивайте ими до ${fmtRub(Math.floor(o.welcome * (o.welcomeSpend || 25) / 100))} в каждом следующем заказе`, 'ok', 7000); }
function closingToast(id, n0) { welcomeToast(id); const o = byId(id); if (o && rcCount(o) > n0) { const r = o.receipts[o.receipts.length - 1]; toast(r.ch === 'email' ? `Второй чек «Полный расчёт» отправлен на ${maskContact(r.contact)}` : 'Второй чек «Полный расчёт» готов — скачайте PDF на странице заказа', 'info', 5000); } }
/* имя, email, карту и тренера подставляем только для номера, который уже заказывал с этого устройства */
function prefillKnown() {
  const k = coKey(); if (!isKnownPhone(k)) return;
  const a = account(k);
  UI.co.name = UI.co.name || a.name; UI.co.card = UI.co.card || a.card; UI.co.trainer = UI.co.trainer || a.trainerCode;
  if (!UI.co.email && a.email) { UI.co.email = a.email; if (!UI.co.rcChosen) UI.co.rcTo = 'email'; }
}
const ACT = {
  app: el => go(el.dataset.v),
  nav: el => { UI.mView = el.dataset.v; UI.modal = null; go(el.dataset.v); },
  home: () => { UI.goal = 'all'; UI.type = 'all'; UI.q = ''; go('menu'); window.scrollTo(0, 0); },
  'reset-demo': () => {
    if (!UI.confirmReset) { UI.confirmReset = true; render(); setTimeout(() => { UI.confirmReset = false; render(); }, 4000); return; }
    UI.confirmReset = false; UI.cart = {}; UI.modal = null; UI.drawer = null; UI.pChoice = {}; UI.lockMsg = null; resetDemo();
  },
  goal: el => { UI.goal = el.dataset.id; render(); const t = $('.goals'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  type: el => { UI.type = el.dataset.id; UI.sub = 'all'; render(); },
  sub: el => { UI.sub = el.dataset.id; render(); },
  'to-menu': () => { const t = $('.goals'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  'reset-filters': () => { UI.goal = 'all'; UI.type = 'all'; UI.sub = 'all'; UI.q = ''; render(); },
  dish: el => { UI.modal = { kind: 'dish', id: el.dataset.id }; render(); },
  plus: el => cartAdd(el.dataset.id, 1),
  minus: el => cartAdd(el.dataset.id, -1),
  'open-cart': () => { UI.drawer = 'cart'; UI.modal = null; render(); },
  'close-drawer': () => { if (UI.drawer === 'paying') return; UI.drawer = null; render(); },
  'close-modal': () => { UI.modal = null; UI.pickConfirm = null; UI.editDish = null; UI.confirmDel = false; UI.rcv = null; render(); },
  'co-next': () => {
    UI.drawer = 'checkout'; UI.payErr = ''; if (!UI.co.email) UI.co.email = LS.get('en-email') || '';
    const k = sessionKey(); if (k && !UI.co.phone) UI.co.phone = fmtPhone(k);
    prefillKnown(); if (!UI.co.rcChosen) UI.co.rcTo = UI.co.email.trim() ? 'email' : 'pdf'; render();
  },
  'co-bonus': () => { UI.co.useBonus = UI.co.useBonus === false; render(); },
  'otp-send': () => otpSend(),
  'otp-verify': () => otpVerify(),
  profile: () => { UI.otp = null; UI.otpErr = ''; UI.modal = { kind: sessionKey() ? 'profile' : 'login' }; render(); },
  'login-demo': el => { UI.loginPhone = fmtPhone(el.dataset.v); UI.otp = null; render(); },
  logout: () => { if (sessionKey()) untrustPhone(sessionKey()); setSession(null); UI.otp = null; if (UI.modal && UI.modal.kind === 'profile') UI.modal = null; UI.co.useBonus = true; render(); },
  'st-add': () => {
    const k = normPhone(UI.stPhone); if (!UI.stName.trim() || !k) { toast('Укажите имя и телефон полностью', 'warn'); return; }
    const L = lset(); if (L.staff.some(s => normPhone(s.phone) === k)) { toast('Этот номер уже в списке', 'warn'); return; }
    const code = UI.stRole === 'Тренер' ? nextTrainerCode() : undefined;
    L.staff.push(Object.assign({ phone: fmtPhone(k), name: UI.stName.trim(), role: UI.stRole }, code ? { code } : {})); UI.stName = ''; UI.stPhone = ''; saveCatalog();
    toast(code ? `Добавлено: скидка включится при следующем заказе, ID тренера — ${code}` : 'Добавлено: скидка включится при следующем заказе с этого номера', 'ok', 6000); render();
  },
  'st-del': el => { const L = lset(); const s = L.staff.splice(+el.dataset.i, 1)[0]; saveCatalog(); toast(`${s ? s.name : 'Сотрудник'} убран(а) из списка — скидки больше нет`); render(); },
  'co-back': () => { UI.drawer = UI.drawer === 'pay' ? 'checkout' : 'cart'; render(); },
  'co-mode': el => { UI.co.mode = el.dataset.v; render(); },
  'co-when': el => { const v = el.dataset.v; UI.co.when = ['asap', 'custom'].includes(v) ? v : +v; if (v === 'custom' && !UI.co.time) { const t = coTimes(); if (t) UI.co.time = fmtTime(t.min + 15 * MIN); } render(); },
  'co-topay': () => {
    if (!UI.co.name.trim()) { UI.payErr = 'Укажите имя.'; render(); return; }
    if (UI.co.phone.replace(/\D/g, '').length < 10) { UI.payErr = 'Укажите телефон: пришлём статус заказа.'; render(); return; }
    if (!coKey()) { UI.payErr = 'Укажите номер телефона полностью.'; render(); return; }
    if (UI.co.rcTo === 'email' && !validEmail(UI.co.email)) { UI.payErr = 'Укажите email для чека — или выберите «Скачаю PDF на странице заказа».'; render(); return; }
    if (String(UI.co.trainer || '').trim() && lset().trainerOn && !(account(coKey()).staff) && !trainerFind(UI.co.trainer)) { UI.payErr = 'Тренер с таким ID не найден — проверьте номер или оставьте поле пустым.'; render(); return; }
    if (UI.co.rcTo === 'email') LS.set('en-email', UI.co.email.trim());
    if (!UI.co.no) UI.co.no = newOrderNo();        // номер заказа регистрируется в банке до перехода на страницу оплаты
    if (!UI.co.pay) UI.co.pay = fset().sbpDefault ? 'sbp' : 'card';
    if (!UI.co.bank) UI.co.bank = LS.get('en-sbp-bank');
    UI.payErr = ''; UI.drawer = 'pay'; render();
  },
  'co-pay': el => { UI.co.pay = el.dataset.v; UI.payErr = ''; render(); },
  'co-rc': el => { UI.co.rcTo = el.dataset.v; UI.co.rcChosen = true; UI.payErr = ''; render(); },
  'login-phone': () => {
    const key = normPhone(UI.loginPhone); if (!key) { toast('Введите номер телефона полностью', 'warn'); return; }
    setSession(key); if (!UI.co.phone) UI.co.phone = fmtPhone(key);
    const a = account(key); UI.modal = { kind: 'profile' };
    toast(a.staff ? `${a.staff.role} клуба: скидка ${lset().staffDiscount}% на заказы` : a.live.length ? 'С возвращением!' : `За первый заказ вернём ${lset().welcomePct}% бонусами`, 'ok', 5000); render();
  },
  'rc-pdf': async el => {
    const o = byId(el.dataset.id), r = o && (o.receipts || []).find(x => x.id === el.dataset.r); if (!r) return;
    try { const res = await saveFile(`Чек-заказ-${o.no}-ФД-${r.fd}.pdf`, receiptPdf(o, r)); if (res) toast('Чек сохранён в PDF', 'ok'); }
    catch (e) { toast(e && e.code === 'declined' ? 'Скачивание отменено' : 'Скачивание недоступно в этом окне', 'warn'); }
  },
  'co-bank': el => { UI.co.bank = el.dataset.v; LS.set('en-sbp-bank', UI.co.bank); UI.payErr = ''; render(); },
  'co-paynow': () => {
    const err = UI.co.pay === 'card' ? cardError() : (UI.co.bank ? '' : 'Выберите банк, в приложении которого подтвердите платёж.');
    if (err) { UI.payErr = err; render(); return; }
    UI.payErr = ''; UI.drawer = 'paying'; render(); setTimeout(placeOrder, 1300);
  },
  'tp-pay': el => {
    const { code, mk } = el.dataset, r = trainerStats()[code], x = r && r.months[mk]; if (!x) return;
    const amount = x.fee - paidOut(code, mk); if (amount <= 0) return;
    lset().payouts.push({ mk, code, name: r.name, amount, n: x.n, at: Date.now() }); saveCatalog();
    toast(`Выплата ${fmtRub(amount)} — ${r.name} (ID ${code}) за ${monthLabel(mk)} отмечена`, 'ok', 5000); render();
  },
  'tp-pay-all': el => {
    const mk = el.dataset.mk; let sum = 0, n = 0;
    Object.values(trainerStats()).forEach(r => { const x = r.months[mk]; if (!x) return; const amount = x.fee - paidOut(r.code, mk); if (amount > 0) { lset().payouts.push({ mk, code: r.code, name: r.name, amount, n: x.n, at: Date.now() }); sum += amount; n++; } });
    if (!n) return; saveCatalog(); toast(`Выплачено ${fmtRub(sum)} — ${n} ${plural(n, 'тренеру', 'тренерам', 'тренерам')} за ${monthLabel(mk)}`, 'ok', 5000); render();
  },
  track: el => { UI.drawer = null; UI.modal = { kind: 'track', id: el.dataset.id }; render(); },
  'my-orders': () => { UI.modal = { kind: 'my' }; render(); },
  'cancel-order': el => { if (cancelOrder(el.dataset.id)) toast('Заказ отменён: Форабанк вернёт деньги на карту или счёт, чек возврата придёт на email или SMS', 'ok', 5000); else toast('Заказ уже готовится — отменить нельзя', 'warn'); render(); },
  'client-scan': el => { const o = byId(el.dataset.id); if (!o) return; const r = lockerScan(o.pickTok); UI.lockMsg = r; toast(r.msg, r.ok ? 'ok' : 'warn', 5000); render(); },

  'k-st': el => { UI.kSt = el.dataset.v; render(); },
  't-start': el => { taskStart(el.dataset.id, +el.dataset.i); render(); },
  't-done': el => { taskDone(el.dataset.id, +el.dataset.i); const o = byId(el.dataset.id); if (o && o.status === 'ready') toast(`№${o.no} готов — передан официанту`, 'ok'); render(); },
  't-pack': el => { packDone(el.dataset.id); const o = byId(el.dataset.id); if (o && o.status === 'ready') toast(`№${o.no} упакован — передан официанту`, 'ok'); render(); },

  'w-tab': el => { UI.wTab = el.dataset.v; render(); },
  'w-take': el => { const c = takeOrder(el.dataset.id); const o = byId(el.dataset.id); if (o && o.status === 'delivering') toast(c ? `№${o.no}: ячейка ${c.id}, QR на экране` : `№${o.no} в рейсе`, 'ok'); render(); },
  'w-takeall': () => { ordersList().filter(o => o.mode === 'gym' && o.status === 'ready').forEach(o => takeOrder(o.id)); toast('Все готовые заказы в рейсе', 'ok'); render(); },
  'w-cell': el => { allocateCell(el.dataset.id); render(); },
  'w-scan': el => { const c = S.lockers.cells.find(x => x.id === el.dataset.id); if (!c) return; const r = lockerScan(c.depTok); UI.lockMsg = r; toast(r.msg, r.ok ? 'ok' : 'warn', 5000); render(); },
  'w-cup': el => { cupPlaced(el.dataset.id); const o = byId(el.dataset.id); toast(`№${o.no}: заказ доставлен на стойку — клиент видит, что стакан ждёт его`, 'ok'); render(); },
  'w-bag-done': el => { if (bagDelivered(el.dataset.id)) { const o = byId(el.dataset.id); UI.lockMsg = null; toast(`№${o.no}: заказ доставлен в ячейку ${o.bag.cell} — клиенту открыт QR-код`, 'ok'); } else toast('Сначала откройте ячейку QR-кодом у табло', 'warn'); render(); },
  'w-shelf': el => { shelfPlace(el.dataset.id); render(); },
  'w-hand': el => { const o = byId(el.dataset.id); cafeHandOver(el.dataset.id); UI.cafeNo = ''; toast(`Выдано: №${o.no}, ${o.name}`, 'ok'); render(); },
  'lk-scan': el => { UI.lockMsg = lockerScan(el.dataset.v); render(); },
  'lk-scan-in': () => { UI.lockMsg = lockerScan(UI.lockIn); UI.lockIn = ''; render(); },
  'lk-close': el => { lockerClose(el.dataset.id); UI.lockMsg = null; render(); },
  'pick-cup': el => { const o = byId(el.dataset.id), n0 = rcCount(o); if (clientPicked(el.dataset.id, 'cup')) { toast(`Напиток №${o.no} у вас — хорошего дня!`, 'ok'); closingToast(el.dataset.id, n0); } render(); },
  'pick-bag': el => {
    const id = el.dataset.id, cell = (byId(id) || {}).bag?.cell, n0 = rcCount(byId(id)), r = clientPicked(id, 'bag', el.dataset.force === '1');
    if (r === 'confirm') UI.pickConfirm = id;
    else if (r) { UI.pickConfirm = null; UI.lockMsg = null; toast(`Спасибо! Ячейка ${cell} освобождена для следующего заказа. Приятного аппетита!`, 'ok', 5000); closingToast(id, n0); }
    render();
  },
  'pick-cancel': () => { UI.pickConfirm = null; render(); },
  'pick-cafe': el => { const o = byId(el.dataset.id), n0 = rcCount(o); if (clientPicked(el.dataset.id, 'cafe')) { toast(`Заказ №${o.no} получен — приятного аппетита!`, 'ok'); closingToast(el.dataset.id, n0); } render(); },
  'rc-open': el => { UI.modal = { kind: 'receipt', id: el.dataset.id, r: el.dataset.r, back: UI.app === 'client' }; render(); },
  'rc-close-day': () => { const n = closeDeliveredReceipts(); toast(n ? `Выбито чеков «Полный расчёт»: ${n}` : 'Нет доставленных заказов без второго чека', n ? 'ok' : 'info'); render(); },
  'w-release': el => { if (staffRelease(el.dataset.id)) toast(`Ячейка ${el.dataset.id} освобождена`, 'ok'); render(); },

  'm-hit': el => { const d = DISH[el.dataset.id]; d.hit = !d.hit; saveCatalog(); toast(d.hit ? '«' + d.name + '» — хит дня' : 'Убрано из хитов'); render(); },
  'm-stop': el => { const d = DISH[el.dataset.id]; d.stop = !d.stop; saveCatalog(); render(); },
  'm-apply-sale': el => { const d = DISH[el.dataset.id]; d.discount = +el.dataset.v; saveCatalog(); toast('Скидка ' + d.discount + '% на «' + d.name + '» уже на сайте', 'ok'); render(); },
  'm-new': () => { UI.editDish = { id: uid('d'), name: '', type: 'hot', station: 'hot', goals: [], price: 400, weight: '300 г', kcal: 400, p: 30, f: 12, c: 40, cook: 12, emoji: '🍽️', pop: 3, desc: '', serves: 1, recipe: [{ ing: 'chicken', qty: 150 }], hit: false, discount: 0, stop: false }; UI.modal = { kind: 'edit' }; render(); },
  'm-edit': el => { UI.editDish = clone(DISH[el.dataset.id]); UI.modal = { kind: 'edit' }; render(); },
  'ed-goal': el => { const g = el.dataset.v, a = UI.editDish.goals; UI.editDish.goals = a.includes(g) ? a.filter(x => x !== g) : a.concat(g); render(); },
  'ed-addrow': () => { UI.editDish.recipe.push({ ing: S.catalog.ingredients[0].id, qty: 100 }); render(); },
  'ed-delrow': el => { UI.editDish.recipe.splice(+el.dataset.i, 1); render(); },
  'ed-save': () => {
    const d = UI.editDish; if (!d.name.trim()) { toast('Укажите название', 'warn'); return; }
    ['price', 'kcal', 'p', 'f', 'c', 'cook', 'serves'].forEach(k => { d[k] = +d[k] || 0; }); d.serves = d.serves || 1; d.cook = Math.max(1, d.cook);
    d.recipe = d.recipe.filter(r => r.qty > 0);
    const ix = S.catalog.dishes.findIndex(x => x.id === d.id); if (ix >= 0) S.catalog.dishes[ix] = d; else S.catalog.dishes.push(d);
    saveCatalog(); UI.modal = null; UI.editDish = null; toast('Блюдо сохранено и уже на сайте', 'ok'); render();
  },
  'ed-delete': () => { if (!UI.confirmDel) { UI.confirmDel = true; render(); return; } S.catalog.dishes = S.catalog.dishes.filter(x => x.id !== UI.editDish.id); saveCatalog(); UI.modal = null; UI.editDish = null; UI.confirmDel = false; toast('Блюдо удалено'); render(); },
  op: el => { UI.modal = { kind: 'op', type: el.dataset.v, ing: el.dataset.ing || S.catalog.ingredients[0].id, dish: S.catalog.dishes[0].id, qty: el.dataset.v === 'hall' ? 1 : null, note: '' }; render(); },
  'op-save': () => {
    const m = UI.modal, i = ING[m.ing];
    if (m.type === 'hall') { const d = DISH[m.dish], q = +m.qty || 0; if (!d || q <= 0) return; writeOffItems([{ d: d.id, q }], 'hall', 'Зал: ' + d.name + ' × ' + q); saveCatalog(); toast('Списано по техкарте: ' + d.name + ' × ' + q, 'ok'); }
    else {
      const q = +m.qty; if (!i || m.qty === '' || m.qty == null || !(q >= 0)) { toast('Укажите количество', 'warn'); return; }
      if (m.type === 'in') { i.stock += q; addMove(i.id, q, 'in', m.note || 'Приход'); }
      if (m.type === 'waste') { const w = Math.min(q, i.stock); i.stock -= w; addMove(i.id, -w, 'waste', m.note || 'Списание'); }
      if (m.type === 'inv') { const diff = q - i.stock; i.stock = q; addMove(i.id, diff, 'inv', m.note || (diff >= 0 ? 'Излишек' : 'Недостача')); }
      saveCatalog(); toast('Проведено: ' + i.name, 'ok');
    }
    UI.modal = null; render();
  },
  'p-promo': () => { S.catalog.settings.promo = !S.catalog.settings.promo; saveCatalog(); render(); },
  'p-all': () => { UI.pAll = !UI.pAll; render(); },
  'p-generate': () => {
    const groups = {};
    S.catalog.ingredients.forEach(i => { const r = planRow(i, UI.pChoice[i.id] || defaultSupplier(i)); if (r.qty > 0) (groups[r.sup.id] = groups[r.sup.id] || { next: r.next, items: [] }).items.push([i.id, r.qty]); });
    const n = Object.keys(groups).length;
    Object.entries(groups).forEach(([sid, g]) => S.catalog.pos.unshift(makePO(S.catalog, sid, 'draft', g.next, g.items)));
    saveCatalog(); toast('Создано заявок: ' + n + '. Проверьте и отправьте поставщикам.', 'ok'); render();
  },
  'po-send': el => {
    const p = S.catalog.pos.find(x => x.id === el.dataset.id); if (!p) return; const s = SUP[p.supplierId];
    const text = `Заявка от кафе «Этажом ниже»\nПоставщик: ${s.name}\nДата поставки: ${fmtDate(p.deliveryDate)}\n\n` + p.items.map(it => `• ${ING[it.ing].name} — ${fmtQty(it.qty, ING[it.ing].unit)}`).join('\n') + `\n\nИтого ≈ ${fmtRub(p.total)}`;
    try { navigator.clipboard.writeText(text).then(() => toast('Текст заявки скопирован — вставьте в письмо или мессенджер'), () => { }); } catch (e) { }
    p.status = 'sent'; p.sentAt = Date.now(); saveCatalog(); toast('Заявка отправлена: ' + s.name, 'ok'); render();
  },
  'po-del': el => { S.catalog.pos = S.catalog.pos.filter(x => x.id !== el.dataset.id); saveCatalog(); render(); },
  'po-recv': el => { UI.modal = { kind: 'receive', id: el.dataset.id }; UI.rcv = null; render(); },
  'po-recv-ok': el => {
    const p = S.catalog.pos.find(x => x.id === el.dataset.id); if (!p) return;
    p.items.forEach((it, ix) => { const q = UI.rcv && UI.rcv[ix] != null ? +UI.rcv[ix] : it.qty; const i = ING[it.ing]; if (!i || !(q > 0)) return; i.stock += q; addMove(i.id, q, 'in', 'Приёмка: ' + SUP[p.supplierId].name); it.got = q; });
    p.status = 'received'; p.receivedAt = Date.now(); saveCatalog(); UI.modal = null; UI.rcv = null; toast('Поставка принята, остатки обновлены', 'ok'); render();
  },
};
const KDS_HOLD = {};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.classList.contains('overlay') && e.target !== el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  /* кухня на планшете: двойное касание не должно сразу «начать» и «закончить» задачу */
  if (['t-start', 't-done', 't-pack'].includes(el.dataset.act)) {
    const key = el.dataset.id + ':' + (el.dataset.i || ''), now = Date.now();
    if ((KDS_HOLD[key] || 0) > now) return;
    KDS_HOLD[key] = now + 1500; setTimeout(() => { delete KDS_HOLD[key]; render(); }, 1500);
  }
  fn(el, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && (UI.modal || UI.drawer)) { if (UI.modal) ACT['close-modal'](); else ACT['close-drawer'](); }
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.ui === 'lockIn') ACT['lk-scan-in']();
});
document.addEventListener('input', e => {
  const t = e.target, ds = t.dataset || {};
  if (ds.otp === 'code') { t.value = t.value.replace(/\D/g, '').slice(0, 4); UI.otpCode = t.value; if (t.value.length === 4) otpVerify(); return; }
  if (ds.co === 'phone') { UI.co.phone = t.value; const k = coKey(); if (k && isKnownPhone(k)) prefillKnown(); renderSoon(350); return; }
  if (ds.co) {
    if (ds.co === 'num') { const d = t.value.replace(/\D/g, '').slice(0, 19); t.value = d.replace(/(\d{4})(?=\d)/g, '$1 '); }
    if (ds.co === 'exp') { const d = t.value.replace(/\D/g, '').slice(0, 4); t.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; }
    if (ds.co === 'cvc') t.value = t.value.replace(/\D/g, '').slice(0, 3);
    UI.co[ds.co] = t.value;
    if (UI.payErr && ['num', 'exp', 'cvc'].includes(ds.co)) { UI.payErr = ''; renderSoon(400); }
    if (ds.co === 'time') renderSoon(400); if (ds.co === 'trainer') renderSoon(250); if (ds.co === 'num') renderSoon(500);
    return;
  }
  if (ds.f === 'q') { UI.q = t.value; renderSoon(160); return; }
  if (ds.ui) { UI[ds.ui] = t.value; if (ds.ui !== 'lockIn') renderSoon(160); return; }
  if (ds.ed) { UI.editDish[ds.ed] = t.value; return; }
  if (ds.edr) { const r = UI.editDish.recipe[+ds.i]; if (r) r[ds.edr] = ds.edr === 'qty' ? +t.value : t.value; return; }
  if (ds.op) { UI.modal[ds.op] = t.value; return; }
  if (ds.rcv != null) { UI.rcv = UI.rcv || {}; UI.rcv[+ds.rcv] = t.value; return; }
  if (ds.set) { S.catalog.settings[ds.set] = +t.value; _cache = {}; renderSoon(80); return; }
});
document.addEventListener('change', e => {
  const t = e.target, ds = t.dataset || {};
  if (ds.f === 'sort') { UI.sort = t.value; render(); return; }
  if (ds.uiSel === 'sbpOther') { if (t.value) { UI.co.bank = t.value; LS.set('en-sbp-bank', t.value); UI.payErr = ''; } render(); return; }
  if (ds.uiSel) { UI[ds.uiSel] = t.value; render(); return; }
  if (ds.dish) { const d = DISH[ds.id]; if (!d) return; let v = Math.max(0, +t.value || 0); if (ds.dish === 'discount') v = Math.min(90, v); d[ds.dish] = v; saveCatalog(); render(); return; }
  if (ds.set) { S.catalog.settings[ds.set] = +t.value; saveCatalog(); render(); return; }
  if (ds.lset) { const L = lset(); L[ds.lset] = t.type === 'checkbox' ? t.checked : Math.max(0, +t.value || 0); saveCatalog(); toast('Правила программы сохранены — действуют для новых заказов', 'ok'); render(); return; }
  if (ds.fset) { const f = fset(), num = ['cardFee', 'sbpFee', 'feeVat'].includes(ds.fset); f[ds.fset] = t.type === 'checkbox' ? t.checked : num ? Math.max(0, +String(t.value).replace(',', '.') || 0) : t.value; saveCatalog(); toast('Настройки кассы сохранены — действуют для новых заказов', 'ok'); render(); return; }
  if (ds.setp) { const [a, b] = ds.setp.split('.'); const v = Math.max(0, +t.value || 0); if (b) S.catalog.settings[a][b] = a === 'stations' ? Math.max(1, v) : v; else S.catalog.settings[a] = v; saveCatalog(); toast('Планировщик пересчитал задачи'); render(); return; }
  if (ds.pchoice != null) { UI.pChoice[ds.id] = t.value; render(); return; }
  if (ds.ed) { UI.editDish[ds.ed] = t.value; if (['type', 'price', 'station'].includes(ds.ed)) render(); return; }
  if (ds.edr) { const r = UI.editDish.recipe[+ds.i]; if (r) r[ds.edr] = ds.edr === 'qty' ? +t.value : t.value; render(); return; }
  if (ds.op) { UI.modal[ds.op] = t.value; if (ds.op === 'ing' || ds.op === 'dish') render(); return; }
});
function onOrdersChanged(before) {
  notifyMyOrders(before);
  Object.values(S.orders).forEach(o => {
    const b = before[o.id];
    if (!b && o.status === 'paid' && UI.app === 'kitchen') toast(`Новый заказ №${o.no} · к ${fmtTime(o.readyAt)} · планировщик поставил задачи`, 'ok', 6000);
    if (b && b.status !== 'ready' && o.status === 'ready' && UI.app === 'waiter') toast(`№${o.no} готов к выносу (${whereLabel(o)})`, 'ok', 6000);
  });
}

/* ===== Старт ===== */
function boot() {
  loadLocal(); readHash(); render();
  if (BC) BC.onmessage = () => { if (S.mode === 'local') syncFromLocal(); };
  window.addEventListener('storage', e => { if (S.mode === 'local' && [LS_CAT, LS_ORD, LS_LOCK].includes(e.key)) syncFromLocal(); });
  setInterval(() => {
    const busy = UI.modal || (UI.app === 'client' && UI.drawer && UI.drawer !== 'checkout' && UI.drawer !== 'cart');
    if (!busy) { _cache = {}; render(); } else { const c = $('.clock'); if (c) c.textContent = fmtTime(Date.now()); }
  }, 15000);
  initDb();
}
document.addEventListener('DOMContentLoaded', boot);
