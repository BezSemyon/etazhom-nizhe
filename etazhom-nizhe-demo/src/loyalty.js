/* ===== Клиенты, бонусы и тренеры клуба ===== */
const LS_SES = 'en-session';
function normPhone(p) { const d = String(p || '').replace(/\D/g, ''); return d.length < 10 ? '' : '7' + d.slice(-10); }
function fmtPhone(k) { if (!k) return ''; const d = k.slice(-10); return `+7 ${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`; }
const lset = () => { const s = S.catalog.settings; if (!s.loyalty) s.loyalty = clone(DEFAULT_SETTINGS.loyalty); return s.loyalty; };
let SESSION = LS.get(LS_SES);
const sessionKey = () => (SESSION && SESSION.phone) || '';
function setSession(key) { SESSION = key ? { phone: key, at: Date.now() } : null; if (key) LS.set(LS_SES, SESSION); else LS.del(LS_SES); _cache = {}; }
const paidOf = o => (o.paid != null ? o.paid : o.total);
const staffOf = key => (key ? lset().staff.find(s => normPhone(s.phone) === key) || null : null);

/* аккаунт собирается из заказов с тем же номером телефона — отдельная база не нужна */
function account(key) {
  return memo('acc' + key, () => {
    const L = lset(), staff = staffOf(key);
    const orders = Object.values(S.orders).filter(o => normPhone(o.phone) === key).sort((a, b) => a.createdAt - b.createdAt);
    const live = orders.filter(o => o.status !== 'cancelled');
    const wo = live.find(o => o.welcome > 0) || null;
    const welcome = wo ? wo.welcome : 0, credited = !!(wo && wo.status === 'done');
    const creditedAt = credited ? (wo.history.done || wo.createdAt) : null;
    const expiresAt = creditedAt ? creditedAt + (wo.welcomeTtl || L.ttlDays) * 864e5 : null;
    const spent = live.reduce((s, o) => s + (o.bonus || 0), 0), expired = !!(expiresAt && Date.now() > expiresAt);
    const balance = credited && !expired ? Math.max(0, welcome - spent) : 0;
    const perOrder = wo ? Math.floor(welcome * (wo.welcomeSpend || L.spendPct) / 100) : 0;
    const hist = [];
    if (wo) hist.push(credited ? { at: creditedAt, t: `Кэшбэк за первый заказ №${wo.no}`, v: welcome } : { at: wo.createdAt, t: `Кэшбэк за заказ №${wo.no} — начислим, когда заберёте`, v: welcome, pending: true });
    live.filter(o => o.bonus).forEach(o => hist.push({ at: o.createdAt, t: `Оплата бонусами, заказ №${o.no}`, v: -o.bonus }));
    if (expired && welcome - spent > 0) hist.push({ at: expiresAt, t: 'Срок бонусов истёк', v: -(welcome - spent) });
    hist.sort((a, b) => b.at - a.at);
    const last = orders[orders.length - 1];
    return { key, staff, orders, live, wo, welcome, credited, creditedAt, expiresAt, expired, spent, balance, perOrder, hist,
      name: last ? last.name : (staff ? staff.name : ''), card: (orders.filter(o => o.card).pop() || {}).card || '', email: (orders.filter(o => o.email).pop() || {}).email || '',
      trainerCode: ((live.filter(o => o.trainer).pop() || {}).trainer || {}).code || '',
      firstEligible: !staff && L.on && live.length === 0 };
  });
}
/* trusted = номер подтверждён кодом на этом устройстве: без этого скидка тренера и оплата бонусами
   показываются, но не применяются (lockedStaff / lockedBonus) */
function loyaltyCalc(key, sum, useBonus, trusted = true) {
  const L = lset(), r = { sum, staffDisc: 0, bonus: 0, welcome: 0, pay: sum, acc: null, role: '', lockedStaff: 0, lockedBonus: 0 };
  if (!key) return r;
  const a = account(key); r.acc = a;
  if (a.staff) { const d = Math.round(sum * L.staffDiscount / 100); if (trusted) { r.role = a.staff.role; r.staffDisc = d; } else r.lockedStaff = d; }
  else if (L.on) {
    if (a.firstEligible) r.welcome = Math.min(Math.round(sum * L.welcomePct / 100), L.welcomeCap > 0 ? L.welcomeCap : Infinity);
    else if (useBonus && a.balance > 0) { const b = Math.max(0, Math.min(a.perOrder, a.balance, sum - 1)); if (trusted) r.bonus = b; else r.lockedBonus = b; }
  }
  r.pay = sum - r.staffDisc - r.bonus; return r;
}
/* ----- ID тренера: 5 % от заказов его клиентов, выплата раз в месяц ----- */
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
function monthKey(ts) { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
const monthLabel = mk => { const [y, m] = mk.split('-').map(Number); return MONTHS[m - 1] + ' ' + y; };
const payoutDay = mk => { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 1).getTime(); };      // 1-е число следующего месяца
const dayMonth = ts => { const d = new Date(ts); return d.getDate() + ' ' + MONTHS_GEN[d.getMonth()]; };
const trainers = () => lset().staff.filter(s => s.code);
const shortName = n => { const [f, l] = String(n || '').split(' '); return l ? `${f} ${l[0]}.` : f; };
function trainerFind(input) {
  const v = String(input || '').trim(), d = v.replace(/\D/g, '');
  if (!d) return null;
  if (d.length <= 4) return trainers().find(s => String(s.code) === d) || null;
  const k = normPhone(v); return k ? trainers().find(s => normPhone(s.phone) === k) || null : null;
}
function nextTrainerCode() { return String(Math.max(100, ...lset().staff.map(s => +s.code || 0)) + 1); }
/* начисления по тренерам и месяцам: начисляется, когда клиент забрал заказ; отменённые — не считаются */
function trainerStats() {
  return memo('trainerStats', () => {
    const m = {};
    const row = (code, t) => m[code] || (m[code] = { code, name: t.name, phone: t.phone, months: {}, pendN: 0, pendFee: 0 });
    Object.values(S.orders).forEach(o => {
      if (!o.trainer || o.status === 'cancelled') return;
      const r = row(o.trainer.code, o.trainer);
      if (o.status !== 'done') { r.pendN++; r.pendFee += o.trainer.fee; return; }
      const mk = monthKey(o.history.done || o.createdAt), x = r.months[mk] || (r.months[mk] = { n: 0, sum: 0, fee: 0 });
      x.n++; x.sum += paidOf(o); x.fee += o.trainer.fee;
    });
    trainers().forEach(t => { const r = row(t.code, t); r.name = t.name; r.phone = t.phone; r.active = true; });
    return m;
  });
}
const paidOut = (code, mk) => lset().payouts.filter(p => p.code === code && p.mk === mk).reduce((s, p) => s + p.amount, 0);
const payoutOf = (code, mk) => lset().payouts.filter(p => p.code === code && p.mk === mk).pop() || null;
function trainerMonths() {
  const set = new Set([monthKey(Date.now())]);
  Object.values(trainerStats()).forEach(r => Object.keys(r.months).forEach(mk => set.add(mk)));
  return [...set].sort().reverse();
}
function coTrainerBlock() {
  const L = lset(); if (!L.trainerOn) return '';
  const key = coKey(), a = key ? account(key) : null;
  if (a && a.staff && a.staff.code) return `<div class="loy staff"><span class="li">🏷️</span><div><b>Ваш ID тренера — ${esc(a.staff.code)}</b><div class="tiny muted">Называйте его клиентам: с их заказов вы получаете ${L.trainerPct}%, выплата — раз в месяц. За собственные заказы вознаграждение не начисляется — у вас скидка ${L.staffDiscount}%.</div></div></div>`;
  if (a && a.staff) return '';
  const v = String(UI.co.trainer || '').trim(), t = trainerFind(v), fee = Math.round(coCalc().pay * L.trainerPct / 100);
  const st = !v ? `<div class="tiny muted" style="margin-top:4px">ID тренера или его телефон. Тренер получит ${L.trainerPct}% от заказа — для вас цена не меняется.</div>`
    : t ? `<div class="verified">✓ ${esc(shortName(t.name))}, тренер — получит ${fmtRub(fee)} (${L.trainerPct}% от заказа)</div>`
      : `<div class="tiny" style="color:var(--red);margin-top:4px">Тренер с таким ID не найден — проверьте номер или оставьте поле пустым</div>`;
  return `<div class="field"><label>ID тренера</label><input class="input" data-co="trainer" data-fk="co-trainer" value="${esc(UI.co.trainer || '')}" placeholder="например, 101" inputmode="numeric" autocomplete="off" style="width:180px">${st}</div>`;
}
function orderTrainerFor(pay) {
  const L = lset(), key = coKey(), a = key ? account(key) : null;
  if (!L.trainerOn || (a && a.staff)) return null;
  const t = trainerFind(UI.co.trainer); if (!t) return null;
  return { code: t.code, name: t.name, phone: t.phone, pct: L.trainerPct, fee: Math.round(pay * L.trainerPct / 100) };
}
/* раздел тренера в профиле: ID и начисления по месяцам */
function trainerProfileBlock(code) {
  const L = lset(), r = trainerStats()[code], cur = monthKey(Date.now());
  const months = r ? Object.keys(r.months).sort().reverse() : [];
  if (!months.includes(cur)) months.unshift(cur);
  const rows = months.map(mk => {
    const x = (r && r.months[mk]) || { n: 0, fee: 0 }, p = payoutOf(code, mk), due = x.fee - paidOut(code, mk);
    const st = mk === cur ? `выплата ${dayMonth(payoutDay(mk))}` : due <= 0 && x.fee ? `выплачено ${dayMonth(p.at)}` : x.fee ? 'к выплате' : '—';
    return `<div class="row"><span class="small" style="flex:1">${monthLabel(mk)} · ${x.n} ${plural(x.n, 'заказ', 'заказа', 'заказов')}</span><span class="tiny muted" style="margin-right:10px">${st}</span><b>${fmtRub(x.fee)}</b></div>`;
  }).join('');
  return `<div class="bal trainer"><div class="tiny muted">Ваш ID тренера</div><div class="v">${esc(code)}</div>
      <div class="small">Клиенты вводят его при оформлении заказа — вы получаете ${L.trainerPct}% от суммы их заказа. Начисление — когда клиент забрал заказ, выплата — за каждый месяц, 1-го числа следующего.</div></div>
    <div class="tiny muted" style="margin:12px 0 4px">Вознаграждение</div><div class="hist">${rows}</div>
    ${r && r.pendFee ? `<div class="tiny muted" style="margin-top:6px">Ещё ${fmtRub(r.pendFee)} — заказы, которые клиенты пока не забрали (${r.pendN}).</div>` : ''}`;
}
/* клиента узнаём по номеру телефона — без кода из SMS. Личные данные (имя, email, тренер) подставляем
   только если этот номер уже заказывал с этого устройства, а заказы и QR ячейки показываем только на нём */
const LS_KNOWN = 'en-known-phones';
const knownPhones = () => LS.get(LS_KNOWN) || [];
const isKnownPhone = k => !!k && knownPhones().includes(k);
function rememberPhone(k) { if (!k) return; const a = knownPhones().filter(x => x !== k); a.push(k); LS.set(LS_KNOWN, a.slice(-5)); }
const coKey = () => normPhone(UI.co.phone);
/* код (звонок) — только перед оплатой бонусами и скидкой тренера, один раз на устройство */
const LS_TRUSTED = 'en-trusted-phones';
const trustedPhones = () => LS.get(LS_TRUSTED) || [];
const isTrusted = k => lset().confirmCode === false || (!!k && trustedPhones().includes(k));
function trustPhone(k) { if (!k) return; const a = trustedPhones().filter(x => x !== k); a.push(k); LS.set(LS_TRUSTED, a.slice(-5)); }
function untrustPhone(k) { LS.set(LS_TRUSTED, trustedPhones().filter(x => x !== k)); }
const coCalc = () => loyaltyCalc(coKey(), cartSum(), UI.co.useBonus !== false, isTrusted(coKey()));
function otpBlock(why) {
  const key = coKey(), o = UI.otp && UI.otp.key === key ? UI.otp : null;
  if (!o) return `<div class="otp"><div class="tiny muted">${why} Подтвердите номер один раз — на этом устройстве код больше не понадобится.</div>
    <button class="btn sm primary" style="margin-top:8px" data-act="otp-send">📞 Подтвердить номер звонком</button>${UI.otpErr ? `<div class="tiny" style="color:var(--red);margin-top:6px">${esc(UI.otpErr)}</div>` : ''}</div>`;
  return `<div class="otp"><div class="tiny muted">Звоним на ваш номер и сразу сбрасываем — отвечать не нужно. Введите <b>4 последние цифры</b> номера, с которого позвонили.</div>
    <div class="callsim"><span>📞</span><div><b>+7 (495) 215-${o.code.slice(0, 2)}-${o.code.slice(2)}</b><div class="tiny">входящий звонок · в демо — вместо настоящего</div></div></div>
    <div class="row" style="gap:8px;margin-top:8px"><input class="input" style="width:110px;letter-spacing:4px;text-align:center" data-otp="code" value="${esc(UI.otpCode || '')}" maxlength="4" inputmode="numeric" autocomplete="one-time-code" placeholder="____">
      <button class="btn sm primary" data-act="otp-verify">Подтвердить</button></div>
    <div class="tiny muted" style="margin-top:6px"><button class="lnk" data-act="otp-send">Позвонить ещё раз</button></div>
    ${UI.otpErr ? `<div class="tiny" style="color:var(--red);margin-top:6px">${esc(UI.otpErr)}</div>` : ''}</div>`;
}
function otpSend() {
  const key = coKey(); if (!key) return;
  const o = UI.otp && UI.otp.key === key ? UI.otp : null;
  if (o && Date.now() - o.at < 60000) { toast(`Позвонить ещё раз можно через ${Math.ceil((60000 - (Date.now() - o.at)) / 1000)} с`, 'info'); return; }
  UI.otp = { key, code: String(Math.floor(Math.random() * 10000)).padStart(4, '0'), at: Date.now(), tries: 0 }; UI.otpCode = ''; UI.otpErr = '';
  render(); setTimeout(() => { const i = document.querySelector('[data-otp="code"]'); if (i) i.focus(); }, 50);
}
function otpVerify() {
  const o = UI.otp, v = String(UI.otpCode || '').trim(); if (!o || v.length < 4) return;
  if (v === o.code) { trustPhone(o.key); UI.otp = null; UI.otpCode = ''; UI.otpErr = ''; toast('Номер подтверждён — на этом устройстве код больше не понадобится', 'ok', 5000); render(); return; }
  o.tries++; UI.otpCode = '';
  if (o.tries >= 5) { UI.otp = null; UI.otpErr = 'Слишком много неверных попыток — запросите новый звонок'; }
  else UI.otpErr = `Неверный код. Осталось попыток: ${5 - o.tries}`;
  render(); setTimeout(() => { const i = document.querySelector('[data-otp="code"]'); if (i) i.focus(); }, 50);
}

/* ----- номер телефона вместо входа по коду ----- */
function phoneHint() {
  const key = coKey(), L = lset();
  if (!key) return `<div class="tiny muted" style="margin-top:4px">По номеру узнаем вас в следующий раз${L.on ? ', начислим кэшбэк' : ''} и пришлём статус заказа. Пароль не нужен; код по звонку — только для оплаты бонусами и скидки тренера.</div>`;
  const a = account(key);
  const t = a.staff ? `${esc(a.staff.role)} клуба — скидка ${L.staffDiscount}%` : a.live.length ? 'С возвращением! Узнали ваш номер' : L.on ? `Новый номер — за первый заказ вернём ${L.welcomePct}% бонусами` : 'Новый номер';
  return `<div class="verified">✓ ${t}</div>`;
}
function coLoyaltyBlock() {
  const key = coKey(); if (!key) return '';
  const L = lset(), c = coCalc(), a = c.acc;
  if (a.staff) return `<div class="loy staff"><span class="li">🏋️</span><div style="flex:1"><b>${esc(a.staff.role)} клуба: скидка ${L.staffDiscount}%</b>${c.lockedStaff
    ? `<div class="tiny muted">−${fmtRub(c.lockedStaff)} · применится после подтверждения номера</div>${otpBlock('Скидка — только для тренеров и сотрудников клуба.')}`
    : `<div class="tiny muted">−${fmtRub(c.staffDisc)} · номер есть в списке сотрудников, который присылает клуб</div>`}</div></div>`;
  if (!L.on) return '';
  if (c.welcome) return `<div class="loy gift"><span class="li">🎁</span><div><b>Первый заказ: вернём ${L.welcomePct}% бонусами — +${fmtRub(c.welcome)}</b><div class="tiny muted">Начислим, когда заберёте заказ${L.welcomeCap ? `, не больше ${fmtRub(L.welcomeCap)}` : ''}. Потом в каждом заказе можно оплатить бонусами до ${L.spendPct}% этой суммы — ${fmtRub(Math.floor(c.welcome * L.spendPct / 100))}.</div></div></div>`;
  if (a.wo && !a.credited) return `<div class="loy"><span class="li">⏳</span><div><b>Кэшбэк ${fmtRub(a.welcome)} за заказ №${a.wo.no} ещё не начислен</b><div class="tiny muted">Начислим, когда вы нажмёте «Заказ забрал», — тогда им можно будет оплачивать следующие заказы.</div></div></div>`;
  if (a.balance > 0) { const on = UI.co.useBonus !== false; return `<button class="loy gift toggle ${on ? 'on' : ''}" data-act="co-bonus"><span class="ck">${on ? '✓' : ''}</span><div><b>Оплатить бонусами −${fmtRub(on ? (c.bonus || c.lockedBonus) : Math.min(a.perOrder, a.balance, c.sum - 1))}</b><div class="tiny muted">На счёте ${fmtRub(a.balance)} · за один заказ — до ${fmtRub(a.perOrder)} · действуют до ${fmtDate(a.expiresAt)}</div></div></button>${on && c.lockedBonus
    ? `<div class="loy" style="margin-top:-6px"><span class="li">🔒</span><div style="flex:1"><b>Бонусы спишутся после подтверждения номера</b>${otpBlock('Бонусы — это ваши деньги, поэтому тратить их можно только с подтверждённым номером.')}</div></div>` : ''}`; }
  if (a.expired) return `<div class="loy"><span class="li">⌛</span><div><b>Срок бонусов истёк ${fmtDate(a.expiresAt)}</b></div></div>`;
  if (a.wo) return `<div class="loy"><span class="li">✓</span><div class="small muted">Бонусы за первый заказ потрачены полностью.</div></div>`;
  return '';
}
function coTotals(c) {
  const lock = c.lockedStaff || c.lockedBonus;
  return `${lock ? `<div class="tiny muted" style="padding-bottom:6px">${c.lockedStaff ? 'Скидка тренера' : 'Оплата бонусами'} −${fmtRub(lock)} применится после подтверждения номера</div>` : ''}${c.staffDisc ? `<div class="sum-row"><span class="muted">Скидка: ${esc(c.role.toLowerCase())} клуба</span><span>−${fmtRub(c.staffDisc)}</span></div>` : ''}${c.bonus ? `<div class="sum-row"><span class="muted">Бонусами</span><span>−${fmtRub(c.bonus)}</span></div>` : ''}`;
}
function orderLoyaltyRows(o) {
  let h = '';
  if (o.staffDisc) h += `<div class="sum-row"><span class="muted">Скидка: ${esc((o.staffRole || 'сотрудник').toLowerCase())} клуба</span><span>−${fmtRub(o.staffDisc)}</span></div>`;
  if (o.bonus) h += `<div class="sum-row"><span class="muted">Оплачено бонусами${o.status === 'cancelled' ? ' — вернулись на счёт' : ''}</span><span>−${fmtRub(o.bonus)}</span></div>`;
  if (o.trainer) h += `<div class="sum-row"><span class="muted">ID тренера ${esc(o.trainer.code)} · ${esc(shortName(o.trainer.name))}</span><span class="small muted">${o.status === 'cancelled' ? 'не начислено' : `получит ${o.trainer.pct}%`}</span></div>`;
  return h;
}
function orderWelcomeNote(o) {
  if (!o.welcome) return '';
  const L = lset(), per = Math.floor(o.welcome * (o.welcomeSpend || L.spendPct) / 100);
  const t = o.status === 'done' ? `начислен — оплачивайте им до ${fmtRub(per)} в каждом следующем заказе` : o.status === 'cancelled' ? 'не начислен: заказ отменён' : 'начислим, когда заберёте заказ';
  return `<div class="loy gift" style="margin-top:10px"><span class="li">🎁</span><div><b>Кэшбэк ${fmtRub(o.welcome)}</b><div class="tiny muted">${t}</div></div></div>`;
}
function headProfileBtn() {
  const key = sessionKey();
  if (!key) return `<button class="btn ghost" data-act="profile">Войти</button>`;
  const a = account(key);
  const lbl = a.staff ? `🏋️ −${lset().staffDiscount}%` : a.balance ? `🎁 ${fmtRub(a.balance)}` : a.wo && !a.credited ? `🎁 +${fmtRub(a.welcome)}` : '👤 Профиль';
  return `<button class="btn" data-act="profile" title="Профиль и бонусы">${lbl}</button>`;
}
function loginModal() {
  const demo = [['79002222222', 'клиент с бонусами'], ['79001111111', 'тренер клуба, ID 101'], ['79005550000', 'новый клиент']];
  return `<div class="overlay" data-act="close-modal"><div class="modal" style="width:min(460px,100%)">
    <div class="mh"><h3>Вход по номеру телефона</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb"><p class="small muted" style="margin-top:0">Пароль и код из SMS не нужны — достаточно номера. По нему мы начисляем кэшбэк и узнаём тренеров клуба.</p>
      <div class="field"><label>Телефон</label><input class="input" data-ui="loginPhone" data-fk="login-phone" value="${esc(UI.loginPhone)}" placeholder="+7 900 000-00-00" inputmode="tel"></div>
      <button class="btn primary" data-act="login-phone" style="width:100%;justify-content:center">Войти</button>
      <div class="tiny muted" style="margin-top:14px">Демо-номера: ${demo.map(([k, t]) => `<button class="lnk" data-act="login-demo" data-v="${k}">${fmtPhone(k)}</button> — ${t}`).join(' · ')}</div></div>
  </div></div>`;
}
function profileModal() {
  const key = sessionKey(), a = account(key), L = lset();
  let body = '';
  if (a.staff) body = `<div class="loy staff"><span class="li">🏋️</span><div><b>${esc(a.staff.role)} клуба · скидка ${L.staffDiscount}% на все заказы</b><div class="tiny muted">Номер есть в списке сотрудников, который присылает клуб. Скидка применяется сама при оформлении; если вы уйдёте из клуба, номер уберут из списка.</div></div></div>${a.staff.code && L.trainerOn ? '<div style="height:12px"></div>' + trainerProfileBlock(a.staff.code) : ''}`;
  else {
    body = `<div class="bal"><div class="tiny muted">Бонусы</div><div class="v">${fmtRub(a.balance)}</div>
      <div class="small">${a.wo ? (a.credited ? (a.expired ? `Срок истёк ${fmtDate(a.expiresAt)}` : `За один заказ — до ${fmtRub(a.perOrder)} · действуют до ${fmtDate(a.expiresAt)}`) : `+${fmtRub(a.welcome)} начислим, когда заберёте заказ №${a.wo.no}`) : `Сделайте первый заказ — вернём ${L.welcomePct}% его суммы бонусами${L.welcomeCap ? ` (до ${fmtRub(L.welcomeCap)})` : ''}.`}</div>
      ${a.wo && a.credited ? `<div class="prog"><i style="width:${Math.min(100, a.spent / a.welcome * 100)}%"></i></div><div class="tiny muted">потрачено ${fmtRub(Math.min(a.spent, a.welcome))} из ${fmtRub(a.welcome)}</div>` : ''}</div>
      <div class="tiny muted" style="margin:10px 0 4px">Как это работает: за первый заказ возвращаем ${L.welcomePct}% бонусами, в каждом следующем заказе ими можно оплатить до ${L.spendPct}% этой суммы. Бонусы действуют ${L.ttlDays} дней.</div>
      ${a.hist.length ? `<div class="hist">${a.hist.map(h => `<div class="row"><span class="tiny muted" style="width:86px">${fmtDate(h.at)}</span><span class="small" style="flex:1">${esc(h.t)}</span><b class="${h.v > 0 ? 'plus' : ''} ${h.pending ? 'muted' : ''}">${h.v > 0 ? '+' : '−'}${fmtRub(Math.abs(h.v))}</b></div>`).join('')}</div>` : ''}`;
  }
  return `<div class="overlay" data-act="close-modal"><div class="modal" style="width:min(480px,100%)">
    <div class="mh"><h3>${esc((isKnownPhone(key) && a.name) || 'Профиль')}</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb"><div class="small muted" style="margin-bottom:12px">${fmtPhone(key)}${isKnownPhone(key) && a.card ? ' · клубная карта ' + esc(a.card) : ''} · заказов: ${a.live.length}</div>${body}</div>
    <div class="mf"><button class="btn ghost" data-act="logout">Выйти</button><span class="spacer"></span><button class="btn" data-act="my-orders">Мои заказы</button></div>
  </div></div>`;
}

/* ----- управляющий: клиенты и бонусы ----- */
function allAccounts() {
  const keys = new Set(Object.values(S.orders).map(o => normPhone(o.phone)).filter(Boolean));
  return [...keys].map(account).sort((a, b) => (b.orders[b.orders.length - 1] || {}).createdAt - (a.orders[a.orders.length - 1] || {}).createdAt);
}
function trainerPayoutsPanel() {
  const L = lset(), months = trainerMonths(), cur = monthKey(Date.now());
  const mk = months.includes(UI.tpMonth) ? UI.tpMonth : (months.find(m => m < cur && Object.values(trainerStats()).some(r => r.months[m] && r.months[m].fee - paidOut(r.code, m) > 0)) || cur);
  const closed = Date.now() >= payoutDay(mk);
  const rows = Object.values(trainerStats()).map(r => ({ r, x: r.months[mk] || { n: 0, sum: 0, fee: 0 } })).filter(({ r, x }) => r.active || x.n).sort((a, b) => b.x.fee - a.x.fee);
  const total = rows.reduce((s, { x }) => s + x.fee, 0), due = rows.reduce((s, { r, x }) => s + Math.max(0, x.fee - paidOut(r.code, mk)), 0);
  const st = (r, x) => { const d = x.fee - paidOut(r.code, mk), p = payoutOf(r.code, mk);
    if (!x.fee) return '<span class="muted small">—</span>';
    if (!closed) return `<span class="st blue">копится</span>`;
    if (d <= 0) return `<span class="st green">выплачено ${dayMonth(p.at)}</span>`;
    return `<button class="btn primary sm" data-act="tp-pay" data-code="${esc(r.code)}" data-mk="${mk}">Выплатить ${fmtRub(d)}</button>`; };
  return `<div class="panel"><div class="row" style="gap:10px;flex-wrap:wrap"><h3 style="margin:0">Вознаграждение тренерам по ID</h3><span class="spacer"></span>
      <select class="input" data-ui-sel="tpMonth" style="width:auto">${months.map(m => `<option value="${m}" ${m === mk ? 'selected' : ''}>${monthLabel(m)}${m === cur ? ' — текущий' : ''}</option>`).join('')}</select></div>
    <div class="small muted" style="margin:6px 0 10px">${L.trainerPct}% от оплаченной суммы заказа начисляется, когда клиент забрал заказ. ${closed ? `Месяц закрыт — выплатите начисленное полностью.` : `Месяц ещё идёт: полная выплата за ${MONTHS[+mk.slice(5) - 1]} — ${dayMonth(payoutDay(mk))}.`}</div>
    <div class="tw"><table class="t"><thead><tr><th>ID</th><th>Тренер</th><th>Телефон</th><th class="r">Заказов клиентов</th><th class="r">Сумма заказов</th><th class="r">Начислено</th><th class="r">Ждут получения</th><th>Выплата</th></tr></thead><tbody>
      ${rows.map(({ r, x }) => `<tr><td><b>${esc(r.code)}</b></td><td>${esc(r.name)}${r.active ? '' : ' <span class="tiny muted">(не в списке)</span>'}</td><td class="small" style="white-space:nowrap">${esc(fmtPhone(normPhone(r.phone)))}</td><td class="r">${x.n}</td><td class="r">${fmtRub(x.sum)}</td><td class="r"><b>${fmtRub(x.fee)}</b></td><td class="r small muted">${mk === cur && r.pendFee ? fmtRub(r.pendFee) : '—'}</td><td>${st(r, x)}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">Тренеров с ID пока нет</td></tr>'}
    </tbody></table></div>
    <div class="row" style="margin-top:10px;gap:10px;flex-wrap:wrap"><span class="small">Начислено за ${monthLabel(mk)}: <b>${fmtRub(total)}</b>${closed ? ` · к выплате: <b>${fmtRub(due)}</b>` : ''}</span><span class="spacer"></span>
      ${closed && due > 0 ? `<button class="btn primary sm" data-act="tp-pay-all" data-mk="${mk}">Выплатить всем ${fmtRub(due)}</button>` : ''}</div>
    <div class="tiny muted" style="margin-top:8px">Выплату оформляйте по договору с тренером (например, агентский договор; тренер-самозанятый выдаёт чек «Мой налог») — схему согласуйте с бухгалтером. В демо кнопка только отмечает выплату.</div></div>`;
}
function loyaltyView() {
  const L = lset(), now = Date.now(), accs = allAccounts();
  const clients = accs.filter(a => !a.staff), staffAccs = accs.filter(a => a.staff);
  const liability = clients.reduce((s, a) => s + a.balance, 0), pending = clients.reduce((s, a) => s + (a.wo && !a.credited ? a.welcome : 0), 0);
  const today = Object.values(S.orders).filter(o => sameDay(o.createdAt, now) && o.status !== 'cancelled');
  const newToday = today.filter(o => o.welcome > 0).length, bonusToday = today.reduce((s, o) => s + (o.bonus || 0), 0), staffToday = today.reduce((s, o) => s + (o.staffDisc || 0), 0);
  const gym = today.filter(o => o.mode === 'gym'), gymRev = gym.reduce((s, o) => s + paidOf(o), 0);
  const num = (k, v, w) => `<input class="input num" type="number" min="0" value="${v}" data-lset="${k}" style="width:${w || 80}px">`;
  const status = a => a.staff ? `<span class="st violet">${esc(a.staff.role)}</span>` : a.wo && !a.credited ? '<span class="st orange">ждёт начисления</span>' : a.balance ? '<span class="st green">бонусы</span>' : a.wo ? '<span class="st grey">потрачены</span>' : '<span class="st blue">гость</span>';
  return `<div class="ah"><h2>Клиенты и бонусы</h2><span class="muted">клиента узнаём по номеру телефона, тренеров — по списку от клуба</span></div>
    <div class="kpis">
      <div class="kpi"><div class="l">Клиентов (по номеру телефона)</div><div class="v">${clients.length}</div><div class="s">новых сегодня: ${newToday}</div></div>
      <div class="kpi ${liability + pending ? 'warn' : ''}"><div class="l">Бонусы на счетах</div><div class="v">${fmtRub(liability)}</div><div class="s">ещё ${fmtRub(pending)} ждут начисления — это будущие скидки</div></div>
      <div class="kpi"><div class="l">Оплачено бонусами сегодня</div><div class="v">${fmtRub(bonusToday)}</div><div class="s">скидки сотрудникам клуба: ${fmtRub(staffToday)}</div></div>
      <div class="kpi"><div class="l">Клубу за сегодня</div><div class="v">${fmtRub(gymRev * L.clubFee / 100)}</div><div class="s">${L.clubFee}% от ${fmtRub(gymRev)} — заказы с доставкой наверх (${gym.length})</div></div>
      ${(() => { const cur = monthKey(now), st = Object.values(trainerStats()); const fee = st.reduce((x, r) => x + ((r.months[cur] || {}).fee || 0), 0), n = st.reduce((x, r) => x + ((r.months[cur] || {}).n || 0), 0);
        const due = st.reduce((x, r) => x + Object.entries(r.months).filter(([mk]) => mk < cur).reduce((y, [mk, m]) => y + Math.max(0, m.fee - paidOut(r.code, mk)), 0), 0);
        return `<div class="kpi ${due ? 'warn' : ''}"><div class="l">Тренерам за ${MONTHS[new Date(now).getMonth()]}</div><div class="v">${fmtRub(fee)}</div><div class="s">${L.trainerPct}% по ID тренера · ${n} ${plural(n, 'заказ', 'заказа', 'заказов')}${due ? ` · к выплате за прошлые месяцы: ${fmtRub(due)}` : ''}</div></div>`; })()}
    </div>
    <div class="grid2">
      <div class="panel"><h3>Правила программы</h3>
        <div class="field"><label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" data-lset="on" ${L.on ? 'checked' : ''}> Кэшбэк за первый заказ включён</label></div>
        <div class="row lrow"><span>Кэшбэк за первый заказ, %</span>${num('welcomePct', L.welcomePct)}</div>
        <div class="row lrow"><span>Не больше, ₽ (0 — без лимита)</span>${num('welcomeCap', L.welcomeCap, 100)}</div>
        <div class="row lrow"><span>Можно потратить за один заказ, % от кэшбэка</span>${num('spendPct', L.spendPct)}</div>
        <div class="row lrow"><span>Срок действия бонусов, дней</span>${num('ttlDays', L.ttlDays)}</div>
        <div class="row lrow"><span>Скидка тренерам и сотрудникам клуба, %</span>${num('staffDiscount', L.staffDiscount)}</div>
        <div class="row lrow"><span>Вознаграждение клубу, % от заказов наверх</span>${num('clubFee', L.clubFee)}</div>
        <div class="field" style="margin-top:6px"><label class="row" style="gap:8px;cursor:pointer;align-items:flex-start"><input type="checkbox" data-lset="confirmCode" ${L.confirmCode !== false ? 'checked' : ''}> <span>Подтверждать номер звонком перед оплатой бонусами и скидкой тренера<div class="tiny muted">Один раз на устройство. Без этого бонусы и скидку можно получить, просто зная чужой номер.</div></span></label></div>
        <div class="field" style="margin-top:6px"><label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" data-lset="trainerOn" ${L.trainerOn ? 'checked' : ''}> Поле «ID тренера» при заказе</label></div>
        <div class="row lrow"><span>Тренеру по его ID, % от оплаченной суммы заказа</span>${num('trainerPct', L.trainerPct)}</div>
        <div class="tiny muted">Кэшбэк начисляется, когда клиент нажал «Заказ забрал», — отменённый заказ его не даёт. Новые правила действуют для новых заказов. В чеке бонусы — это скидка: цены позиций печатаются уже с её учётом.</div></div>
      <div class="panel"><h3>Тренеры и сотрудники клуба · ${L.staff.length}</h3>
        <div class="tw"><table class="t"><thead><tr><th>ID</th><th>Имя</th><th>Телефон</th><th>Роль</th><th class="r">Свои заказы</th><th class="r">Скидки</th><th></th></tr></thead><tbody>
        ${L.staff.map((s, i) => { const a = account(normPhone(s.phone)); return `<tr><td>${s.code ? `<b>${esc(s.code)}</b>` : '—'}</td><td>${esc(s.name)}</td><td class="small" style="white-space:nowrap">${esc(fmtPhone(normPhone(s.phone)) || s.phone)}</td><td>${esc(s.role)}</td><td class="r">${a.live.length}</td><td class="r">${fmtRub(a.live.reduce((x, o) => x + (o.staffDisc || 0), 0))}</td><td><button class="btn sm ghost" data-act="st-del" data-i="${i}">Убрать</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Список пуст</td></tr>'}
        </tbody></table></div>
        <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><input class="input" data-ui="stName" data-fk="st-name" value="${esc(UI.stName)}" placeholder="Имя" style="flex:1;min-width:120px"><input class="input" data-ui="stPhone" data-fk="st-phone" value="${esc(UI.stPhone)}" placeholder="+7 900 000-00-00" style="width:160px" inputmode="tel">
          <select class="input" data-ui-sel="stRole" style="width:auto">${['Тренер', 'Администратор клуба', 'Сотрудник клуба'].map(r => `<option ${UI.stRole === r ? 'selected' : ''}>${r}</option>`).join('')}</select><button class="btn primary sm" data-act="st-add">Добавить</button></div>
        <div class="tiny muted" style="margin-top:8px">Тренера узнаём по номеру телефона из этого списка: указал номер при заказе — скидка ${L.staffDiscount}% включается сама. Тренеру ID присваивается автоматически — его клиенты вводят ID при заказе. Список присылает клуб; убранный номер сразу теряет скидку, а ID перестаёт приниматься.</div></div>
    </div>
    ${trainerPayoutsPanel()}
    <div class="panel"><h3>Клиенты</h3><div class="tw" style="max-height:420px"><table class="t"><thead><tr><th>Телефон</th><th>Имя</th><th>Статус</th><th class="r">Заказов</th><th class="r">Кэшбэк</th><th class="r">Потрачено</th><th class="r">На счёте</th><th>Действуют до</th><th>Последний заказ</th></tr></thead><tbody>
      ${accs.map(a => { const last = a.orders[a.orders.length - 1]; return `<tr><td class="small" style="white-space:nowrap">${fmtPhone(a.key)}</td><td>${esc(a.name)}</td><td>${status(a)}</td><td class="r">${a.live.length}</td><td class="r">${a.welcome ? fmtRub(a.welcome) : '—'}</td><td class="r">${a.spent ? fmtRub(a.spent) : '—'}</td><td class="r"><b>${a.balance ? fmtRub(a.balance) : '—'}</b></td><td class="small">${a.expiresAt ? fmtDate(a.expiresAt) : '—'}</td><td class="small">${last ? fmtDate(last.createdAt) + ', №' + last.no : '—'}</td></tr>`; }).join('') || '<tr><td colspan="9" class="muted">Пока нет клиентов с номером телефона</td></tr>'}
    </tbody></table></div>
    <p class="tiny muted">Заказы демо-гостей без полного номера телефона в список не попадают. Клиента узнаём по номеру без кода из SMS; имя, email и QR-коды заказов показываем только на устройстве, с которого заказывали.</p></div>`;
}
