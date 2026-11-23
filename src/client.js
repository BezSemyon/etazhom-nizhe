/* ===== Состояние интерфейса ===== */
const UI = {
  app: 'client', view: 'menu', goal: 'all', type: 'all', q: '', sort: 'pop',
  cart: {}, drawer: null, modal: null, lastOrder: null, payErr: '',
  co: { mode: 'gym', when: 'asap', time: '', name: '', phone: '', email: '', card: '', comment: '', trainer: '', rcTo: 'pdf', rcChosen: false, no: '', pay: null, bank: null, num: '2200 1234 5678 9019', exp: '12/28', cvc: '123' },
  sub: 'all', kSt: 'all', wTab: 'up', lockMsg: null, pickConfirm: null, loginPhone: '', otp: null, otpCode: '', otpErr: '', stName: '', stPhone: '', stRole: 'Тренер', lockIn: '', cafeNo: '',
  mq: '', mGoal: 'all', mType: 'all', sq: '', sCat: 'all', sStatus: 'all', pAll: false, pChoice: {}, editDish: null, mView: 'admin-menu',
};
const ICON = {
  logo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 6h5v4.5h5V15h5v4" stroke="#c9f26b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 17.5 18 20l2.5-2.5" stroke="#c9f26b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  stairs: '<svg width="260" height="200" viewBox="0 0 260 200" fill="none"><path d="M0 40h70v50h60v50h60v50h70" stroke="#c9f26b" stroke-width="18"/></svg>',
};

/* ===== Корзина ===== */
const cartCount = () => Object.values(UI.cart).reduce((s, q) => s + q, 0);
const cartSum = () => Object.entries(UI.cart).reduce((s, [id, q]) => s + (DISH[id] ? effPrice(DISH[id]) * q : 0), 0);
const cartFull = () => Object.entries(UI.cart).reduce((s, [id, q]) => s + (DISH[id] ? DISH[id].price * q : 0), 0);
function canAddMore(d) { return !d.stop && portions(d, needFor(UI.cart)) >= 1; }
function cartAdd(id, n = 1) {
  const d = DISH[id]; if (!d) return;
  if (n > 0 && !canAddMore(d)) { toast('Больше нет в наличии: ' + d.name, 'warn'); return; }
  const q = (UI.cart[id] || 0) + n; if (q <= 0) delete UI.cart[id]; else UI.cart[id] = q; render();
}
/* мои заказы — только сделанные с этого устройства: номер телефона без кода не доказывает, что это вы,
   а на странице заказа — QR-код ячейки */
function myOrders() { const ids = new Set(myOrderIds()); return Object.values(S.orders).filter(o => ids.has(o.id)).sort((a, b) => b.createdAt - a.createdAt); }
const myActive = () => myOrders().filter(o => o.status !== 'done' && o.status !== 'cancelled');

function filteredDishes() {
  const q = UI.q.trim().toLowerCase();
  let list = S.catalog.dishes.filter(d => (UI.goal === 'all' || d.goals.includes(UI.goal)) && (UI.type === 'all' || d.type === UI.type) && (UI.type !== 'drink' || UI.sub === 'all' || d.sub === UI.sub) && (!q || (d.name + ' ' + d.desc).toLowerCase().includes(q)));
  const sorters = { pop: (a, b) => (b.hit - a.hit) || (b.pop - a.pop), priceAsc: (a, b) => effPrice(a) - effPrice(b), priceDesc: (a, b) => effPrice(b) - effPrice(a), kcalAsc: (a, b) => a.kcal - b.kcal, protein: (a, b) => b.p - a.p };
  list.sort(sorters[UI.sort] || sorters.pop);
  list.sort((a, b) => (onSale(b) ? 1 : 0) - (onSale(a) ? 1 : 0));
  return list;
}
function drinkGroups(ds) {
  let h = ''; const rest = ds.filter(d => !d.sub);
  DRINK_SUBS.forEach(s => { const g = ds.filter(d => d.sub === s.id); if (g.length) h += `<div class="sub-h"><h3>${s.name}</h3><span class="muted small">${g.length}</span></div><div class="grid">${g.map(dishCard).join('')}</div>`; });
  if (rest.length) h += `<div class="sub-h"><h3>Другие напитки</h3></div><div class="grid">${rest.map(dishCard).join('')}</div>`;
  return h;
}
const goalColor = d => (GOAL[d.goals[0]] || { color: '#8a9a90' }).color;
function dishCard(d) {
  const left = portions(d), inCart = UI.cart[d.id] || 0, sold = (d.stop || left === 0) && !inCart, price = effPrice(d);
  const btn = inCart
    ? `<div class="stepper"><button data-act="minus" data-id="${d.id}" aria-label="Убрать">−</button><span>${inCart}</span><button data-act="plus" data-id="${d.id}" ${canAddMore(d) ? '' : 'disabled'} aria-label="Добавить">+</button></div>`
    : `<button class="add" data-act="plus" data-id="${d.id}" ${canAddMore(d) ? '' : 'disabled'} aria-label="В корзину">+</button>`;
  return `<article class="dish ${sold ? 'soldout' : ''}" data-act="dish" data-id="${d.id}" style="--gc:${goalColor(d)}">
    <div class="pic"><span class="em">${d.emoji}</span>
      <div class="badges">${d.hit ? '<span class="badge hit">ХИТ ДНЯ</span>' : ''}${d.discount ? `<span class="badge sale">−${d.discount}%</span>` : ''}${sold ? '<span class="badge out">Закончилось</span>' : ''}${d.station === 'bar' ? `<span class="badge">${d.sub === 'water' ? '🧴 бутылка' : '🥤 стакан'}</span>` : ''}</div>
      <span class="kcal">${d.kcal} ккал</span></div>
    <div class="body"><div class="nm">${esc(d.name)}</div>
      <div class="meta">${esc(d.weight)}${d.serves > 1 ? ' · на ' + d.serves + ' перс.' : ''} · ${d.cook} мин</div>
      <div class="macros"><span><b>Б</b>${d.p}</span><span><b>Ж</b>${d.f}</span><span><b>У</b>${d.c}</span></div>
      <div class="foot"><div><div class="price">${fmtRub(price)}</div>${d.discount ? `<div class="old">${fmtRub(d.price)}</div>` : ''}${!sold && left <= 5 ? `<div class="left">Осталось ${left}</div>` : ''}</div>${btn}</div>
    </div></article>`;
}

/* ===== Сайт клиента ===== */
function clientHead() {
  const cnt = cartCount(), act = myActive().length;
  return `<header class="site-head"><div class="in">
    <a class="logo" href="#menu" data-act="home"><span class="mark">${ICON.logo}</span><div><div class="t1">Этажом ниже</div><div class="t2">кухня для тех, кто тренируется этажом выше</div></div></a>
    <div class="spacer"></div>
    ${headProfileBtn()}
    <button class="btn ${act ? '' : 'ghost hide-m'}" data-act="my-orders">${act ? 'Заказы' : 'Мои заказы'}${act ? ` <span class="cnt">${act}</span>` : ''}</button>
    <button class="btn primary" data-act="open-cart">${ICON.cart}<span class="${cnt ? '' : 'cart-lbl'}">${cnt ? fmtRub(cartSum()) : 'Корзина'}</span>${cnt ? `<span class="cnt">${cnt}</span>` : ''}</button>
  </div></header>`;
}
function clientMain() {
  const typical = minReadyAt({ chickenrice: 1 }, 'gym');
  const filtered = UI.goal !== 'all' || UI.type !== 'all' || UI.q.trim();
  const list = filteredDishes();
  const hits = S.catalog.dishes.filter(d => d.hit && !d.stop), sales = S.catalog.dishes.filter(d => d.discount > 0 && !d.stop);
  const goalBtn = g => `<button class="goal ${UI.goal === g.id ? 'on' : ''}" style="--gc:${g.color}" data-act="goal" data-id="${g.id}"><span class="ic">${g.icon}</span><span class="nm">${g.name}</span><span class="hn">${g.hint}</span></button>`;
  let body = '';
  if (!filtered) {
    body += `<div class="sec-h"><h2>Хиты дня</h2><span class="muted">выбор шефа на сегодня</span></div><div class="rail">${hits.map(dishCard).join('') || '<div class="empty">Сегодня без хитов</div>'}</div>`;
    if (sales.length) body += `<div class="sec-h"><h2>Скидки сегодня</h2><span class="muted">цена уже со скидкой</span></div><div class="rail">${sales.map(dishCard).join('')}</div>`;
    TYPES.forEach(t => { const ds = list.filter(d => d.type === t.id); if (!ds.length) return; body += `<div class="sec-h"><h2>${t.name}</h2><span class="muted">${ds.length} ${plural(ds.length, 'позиция', 'позиции', 'позиций')}</span></div>`; body += t.id === 'drink' ? drinkGroups(ds) : `<div class="grid">${ds.map(dishCard).join('')}</div>`; });
  } else {
    const g = GOAL[UI.goal];
    const subName = UI.type === 'drink' && UI.sub !== 'all' ? (DRINK_SUBS.find(s => s.id === UI.sub) || {}).name : null;
    body += `<div class="sec-h"><h2>${g ? g.icon + ' ' + g.name : subName || (UI.type !== 'all' ? TYPE[UI.type].name : 'Результаты поиска')}</h2><span class="muted">${list.length} ${plural(list.length, 'позиция', 'позиции', 'позиций')}${g ? ' · ' + g.hint : ''}</span><span class="spacer"></span><button class="btn sm ghost" data-act="reset-filters">Сбросить фильтры</button></div>`;
    body += list.length ? (UI.type === 'drink' && UI.sub === 'all' && !UI.q.trim() ? drinkGroups(list) : `<div class="grid">${list.map(dishCard).join('')}</div>`) : '<div class="empty">Ничего не нашлось. Попробуйте другую цель или тип блюда.</div>';
  }
  return `<div class="wrap">
    <section class="hero">
      <div class="main"><div class="stairs">${ICON.stairs}</div>
        <h1>Тренируйтесь — <em>мы приготовим</em> к вашему выходу из зала</h1>
        <p>Закажите из кафе этажом ниже и укажите, к какому времени. Еду положим в ячейку шкафа наверху — откроете своим QR-кодом, напиток будет ждать на стойке ресепшена с номером заказа.</p>
        <div class="steps"><div class="s"><b>1</b>Выберите блюда под цель</div><div class="s"><b>2</b>Укажите время</div><div class="s"><b>3</b>Заберите по QR из ячейки</div></div>
        <div class="m-only small" style="margin-top:14px;color:#d6e8dc">Ближайшая готовность — <b style="color:#fff">${typical ? fmtTime(typical) : '—'}</b> · кухня 07:30–22:30</div>
      </div>
      <div class="side">
        <div class="muted small">Ближайшая готовность наверху</div>
        <div class="big">${typical ? fmtTime(typical) : '—'}</div>
        <div class="tiny muted" style="margin-top:-8px">считаем по текущей загрузке кухни</div>
        <div class="kv"><span class="muted">Где забрать</span><b>ячейка шкафа · стойка · кафе</b></div>
        <div class="kv"><span class="muted">Оплата</span><b>онлайн: карта или СБП</b></div>
        <div class="kv"><span class="muted">Сейчас в меню</span><b>${S.catalog.dishes.filter(onSale).length} из ${S.catalog.dishes.length} блюд</b></div>
        <span class="spacer"></span>
        <button class="btn lime lg" style="justify-content:center" data-act="to-menu">Выбрать блюда под цель ↓</button>
      </div>
    </section>
    <div class="goals"><button class="goal ${UI.goal === 'all' ? 'on' : ''}" data-act="goal" data-id="all"><span class="ic">🍽️</span><span class="nm">Всё меню</span><span class="hn">${S.catalog.dishes.length} позиций</span></button>${GOALS.map(goalBtn).join('')}</div>
    <div class="toolbar"><div class="tabs"><button class="tab ${UI.type === 'all' ? 'on' : ''}" data-act="type" data-id="all">Все</button>${TYPES.map(t => `<button class="tab ${UI.type === t.id ? 'on' : ''}" data-act="type" data-id="${t.id}">${t.name}</button>`).join('')}</div></div>
    ${UI.type === 'drink' ? `<div class="toolbar"><div class="tabs subtabs"><button class="tab ${UI.sub === 'all' ? 'on' : ''}" data-act="sub" data-id="all">Все напитки</button>${DRINK_SUBS.map(s => `<button class="tab ${UI.sub === s.id ? 'on' : ''}" data-act="sub" data-id="${s.id}">${s.name}</button>`).join('')}</div></div>` : ''}
    <div class="toolbar">
      <div class="search">${ICON.search}<input class="input" data-f="q" data-fk="q" placeholder="Поиск: лосось, творог, без мяса…" value="${esc(UI.q)}"></div>
      <select class="input" data-f="sort">${[['pop', 'Сначала популярные'], ['priceAsc', 'Сначала дешевле'], ['priceDesc', 'Сначала дороже'], ['kcalAsc', 'Меньше калорий'], ['protein', 'Больше белка']].map(([v, n]) => `<option value="${v}" ${UI.sort === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
    </div>
    ${body}
  </div>
  <footer class="f"><span>«Этажом ниже» — прототип сервиса заказа еды для фитнес-клуба.</span><span>Оплата в прототипе — имитация, деньги не списываются.</span></footer>
  ${orderPill()}`;
}
function orderPill() {
  const a = myActive(); if (!a.length || UI.drawer || UI.modal) return '';
  const o = a[0];
  return `<button class="orderpill" data-act="track" data-id="${o.id}">Заказ №${o.no} · к ${fmtTime(o.readyAt)} <span class="st">${clientStatus(o)}</span></button>`;
}
function clientStatus(o) {
  if (o.mode === 'gym' && (o.status === 'placed' || o.status === 'delivering')) {
    const left = [];
    if (o.bag.need && o.bag.depositedAt && !o.bag.pickedAt) left.push('в ячейке ' + o.bag.cell);
    if (o.cup.need && o.cup.placedAt && !o.cup.pickedAt) left.push(o.bag.need ? 'на стойке' : 'на стойке ресепшена');
    if (left.length) { const t = left.join(' и '); return t[0].toUpperCase() + t.slice(1); }
    return o.status === 'delivering' ? 'Несём наверх' : 'Ждёт клиента';
  }
  if (o.status === 'placed') return 'На стойке кафе';
  if (o.status === 'ready') return o.mode === 'cafe' ? 'Готов' : 'Готов, несём';
  return STATUS[o.status].short;
}

function dishModal(d) {
  const left = portions(d), inCart = UI.cart[d.id] || 0;
  const ings = d.recipe.map(x => ING[x.ing] ? ING[x.ing].name.replace(/\s*\(.*\)/, '').toLowerCase() : '').filter(Boolean);
  return `<div class="overlay" data-act="close-modal"><div class="modal">
    <div class="mh"><h3>${esc(d.name)}</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb"><div class="dm-top"><div class="dm-pic" style="--gc:${goalColor(d)}">${d.emoji}</div><div>
      <div class="goal-dots">${d.goals.map(g => `<span class="gdot" style="--gc:${GOAL[g].color}">${GOAL[g].name}</span>`).join('')}${d.hit ? '<span class="badge hit">ХИТ ДНЯ</span>' : ''}${d.discount ? `<span class="badge sale">−${d.discount}%</span>` : ''}</div>
      <p>${esc(d.desc)}</p>
      <div class="kbju"><div><b>${d.kcal}</b><span>ккал</span></div><div><b>${d.p} г</b><span>белки</span></div><div><b>${d.f} г</b><span>жиры</span></div><div><b>${d.c} г</b><span>углеводы</span></div></div>
      <div class="small muted">Выход ${esc(d.weight)}${d.serves > 1 ? ' · на ' + d.serves + ' персоны, КБЖУ на 1 порцию' : ''} · ${STATION[d.station].name.toLowerCase()}, ${d.cook} мин${d.station === 'bar' ? ' · подаём в стакане с номером заказа' : ''}</div>
      <div class="small" style="margin-top:8px"><b>Состав:</b> ${esc(ings.join(', '))}</div>
      <div class="row" style="margin-top:16px"><div><div class="price">${fmtRub(effPrice(d))}</div>${d.discount ? `<div class="old">${fmtRub(d.price)}</div>` : ''}</div><span class="spacer"></span>
        ${d.stop || left === 0 ? '<span class="st out">Закончилось</span>' : (left <= 5 ? `<span class="left">Осталось ${left}</span>` : '')}
        ${inCart ? `<div class="stepper"><button data-act="minus" data-id="${d.id}">−</button><span>${inCart}</span><button data-act="plus" data-id="${d.id}" ${canAddMore(d) ? '' : 'disabled'}>+</button></div>` : `<button class="btn primary" data-act="plus" data-id="${d.id}" ${canAddMore(d) ? '' : 'disabled'}>В корзину</button>`}
      </div></div></div></div></div></div>`;
}

/* ===== Оформление: место, время, оплата ===== */
function coTimes() {
  const min = minReadyAt(UI.cart, UI.co.mode); if (!min) return null;
  let t;
  if (UI.co.when === 'asap') t = min;
  else if (UI.co.when === 'custom') { if (UI.co.time) { const [h, m] = UI.co.time.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); if (d.getTime() < Date.now() - 6 * 3600e3) d.setDate(d.getDate() + 1); t = d.getTime(); } else t = min; }
  else { const d = new Date(Date.now() + UI.co.when * MIN); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0); t = d.getTime(); }
  const bumped = t < min; t = Math.max(t, min);
  const fake = buildOrder(S.catalog, Object.entries(UI.cart).map(([id, q]) => [id, q]), { mode: UI.co.mode });
  const start = t - deliverMs(fake) - packMs(fake) - Math.max(...fake.tasks.map(x => x.dur));
  return { min, t, bumped, start, fake };
}
function cartDrawer() {
  const ids = Object.keys(UI.cart);
  const head = t => `<div class="dh">${['checkout', 'pay'].includes(UI.drawer) ? '<button class="x" data-act="co-back">‹</button>' : ''}<h3>${t}</h3><button class="x" data-act="close-drawer">×</button></div>`;
  let h = '';
  if (UI.drawer === 'cart') {
    const saved = cartFull() - cartSum(), min = minReadyAt(UI.cart, UI.co.mode);
    h = head('Корзина') + `<div class="db">${ids.length ? ids.map(id => { const d = DISH[id]; if (!d) return ''; return `<div class="ci"><div class="e">${d.emoji}</div><div class="n">${esc(d.name)}<div class="tiny muted">${fmtRub(effPrice(d))} · ${d.kcal} ккал${d.station === 'bar' ? ' · в стакане' : ''}</div></div><div class="stepper"><button data-act="minus" data-id="${id}">−</button><span>${UI.cart[id]}</span><button data-act="plus" data-id="${id}" ${canAddMore(d) ? '' : 'disabled'}>+</button></div></div>`; }).join('') : '<div class="empty">Корзина пуста. Выберите блюда под свою цель.</div>'}
      ${ids.length ? `<div class="note green" style="margin-top:12px">Минимальное время готовности: <b>${fmtTime(min)}</b>. Считаем по загрузке кухни прямо сейчас.</div>
      <div style="margin-top:10px">${saved > 0 ? `<div class="sum-row"><span class="muted">Скидка</span><span>−${fmtRub(saved)}</span></div>` : ''}
      <div class="sum-row"><span class="muted">Итого КБЖУ</span><span class="small">${ids.reduce((s, id) => s + DISH[id].kcal * UI.cart[id], 0)} ккал · Б ${ids.reduce((s, id) => s + DISH[id].p * UI.cart[id], 0)} г</span></div>
      <div class="sum-row total"><span>К оплате</span><span>${fmtRub(cartSum())}</span></div></div>` : ''}</div>
      <div class="df"><button class="btn primary lg" style="width:100%;justify-content:center" data-act="co-next" ${ids.length ? '' : 'disabled'}>Оформить заказ</button></div>`;
  } else if (UI.drawer === 'checkout') {
    const tm = coTimes(); if (!tm) { UI.drawer = 'cart'; return cartDrawer(); }
    const hasDrink = tm.fake.cup.need, hasFood = tm.fake.bag.need;
    const gymText = hasFood && hasDrink ? 'Еда — в ячейке шкафа (откроете QR-кодом), напиток — на стойке ресепшена с номером заказа' : hasFood ? 'Пакет положим в ячейку шкафа, откроете своим QR-кодом' : 'Напиток с номером заказа поставим на стойку ресепшена';
    h = head('Оформление') + `<div class="db">
      <div class="field"><label>Где заберёте?</label><div class="paym">
        <button class="${UI.co.mode === 'gym' ? 'on' : ''}" data-act="co-mode" data-v="gym">🏋️ Наверху, в клубе<small>${gymText}</small></button>
        <button class="${UI.co.mode === 'cafe' ? 'on' : ''}" data-act="co-mode" data-v="cafe">☕ В кафе<small>Заберу сам на стойке выдачи кафе</small></button></div></div>
      <div class="field"><label>К какому времени приготовить и ${UI.co.mode === 'cafe' ? 'выдать' : 'принести'}?</label>
        <div class="minbox"><span>Минимальное время</span><b>${fmtTime(tm.min)}</b><span class="tiny muted">обновляется по загрузке кухни</span></div>
        <div class="chips" style="margin-top:8px">
          <button class="chip ${UI.co.when === 'asap' ? 'on' : ''}" data-act="co-when" data-v="asap">Как можно скорее</button>
          ${[30, 45, 60, 90].map(m => `<button class="chip ${UI.co.when === m ? 'on' : ''}" data-act="co-when" data-v="${m}">через ${m} мин</button>`).join('')}
          <button class="chip ${UI.co.when === 'custom' ? 'on' : ''}" data-act="co-when" data-v="custom">Своё время</button></div>
        ${UI.co.when === 'custom' ? `<input class="input" type="time" data-co="time" data-fk="co-time" value="${esc(UI.co.time)}" min="${fmtTime(tm.min)}" style="margin-top:8px;width:140px">` : ''}
      </div>
      <div class="note green">Заказ будет ${UI.co.mode === 'cafe' ? 'на стойке кафе' : 'наверху'} к <b>${fmtTime(tm.t)}</b>. Кухня начнёт готовить около ${fmtTime(tm.start)} — вы в это время тренируетесь.${tm.bumped ? ` Раньше ${fmtTime(tm.min)} не успеем — время сдвинуто.` : ''}</div>
      <div style="height:12px"></div>
      <div class="field"><label>Имя *</label><input class="input" data-co="name" data-fk="co-name" value="${esc(UI.co.name)}" placeholder="Как к вам обращаться"></div>
      <div class="field"><label>Телефон *</label><input class="input" data-co="phone" data-fk="co-phone" value="${esc(UI.co.phone)}" placeholder="+7 900 000-00-00" inputmode="tel" autocomplete="tel">${phoneHint()}</div>
      ${coLoyaltyBlock()}
      ${coTrainerBlock()}
      <div class="field"><label>Чек</label><div class="chips">
          <button class="chip ${UI.co.rcTo === 'email' ? 'on' : ''}" data-act="co-rc" data-v="email">✉️ На email</button>
          <button class="chip ${UI.co.rcTo === 'pdf' ? 'on' : ''}" data-act="co-rc" data-v="pdf">📄 Скачаю PDF на странице заказа</button></div>
        ${UI.co.rcTo === 'email' ? `<input class="input" data-co="email" data-fk="co-email" value="${esc(UI.co.email)}" placeholder="name@mail.ru" inputmode="email" autocomplete="email" style="margin-top:8px"><div class="tiny muted" style="margin-top:4px">Чек пришлёт Контур.ОФД. Его же можно будет скачать на странице заказа.</div>`
          : '<div class="tiny muted" style="margin-top:6px">Чек появится на странице заказа сразу после оплаты — кнопка «Скачать PDF».</div>'}</div>
      <div class="field"><label>Номер клубной карты</label><input class="input" data-co="card" data-fk="co-card" value="${esc(UI.co.card)}" placeholder="необязательно"></div>
      <div class="field"><label>Комментарий для кухни</label><input class="input" data-co="comment" data-fk="co-comment" value="${esc(UI.co.comment)}" placeholder="Например: без лука, соус отдельно"></div>
      ${UI.payErr ? `<div class="note red">${esc(UI.payErr)}</div>` : ''}</div>
    <div class="df">${coTotals(coCalc())}<div class="sum-row total" style="padding:0 0 10px"><span>К оплате</span><span>${fmtRub(coCalc().pay)}</span></div><button class="btn primary lg" style="width:100%;justify-content:center" data-act="co-topay">Перейти к оплате</button></div>`;
  } else if (UI.drawer === 'pay') {
    const pay = coCalc().pay, bank = bankById(UI.co.bank), card = UI.co.pay === 'card';
    const tab = (v, t) => `<button class="${UI.co.pay === v ? 'on' : ''}" data-act="co-pay" data-v="${v}">${t}</button>`;
    let body, btn;
    if (card) {
      const brand = cardBrand(UI.co.num);
      body = `<div class="field"><label>Номер карты${brand ? ` <span class="brand">${brand}</span>` : ''}</label><input class="input" data-co="num" data-fk="co-num" value="${esc(UI.co.num)}" placeholder="0000 0000 0000 0000" inputmode="numeric" autocomplete="cc-number"></div>
          <div class="row" style="gap:12px"><div class="field" style="flex:1"><label>Срок действия</label><input class="input" data-co="exp" data-fk="co-exp" value="${esc(UI.co.exp)}" placeholder="ММ/ГГ" inputmode="numeric" autocomplete="cc-exp"></div>
            <div class="field" style="flex:1"><label>CVC / CVV</label><input class="input" data-co="cvc" data-fk="co-cvc" value="${esc(UI.co.cvc)}" placeholder="3 цифры" inputmode="numeric" autocomplete="cc-csc" type="password"></div></div>
          <div class="tiny muted">Банк может попросить подтвердить оплату кодом из SMS (3-D Secure).</div>`;
      btn = `Оплатить ${fmtRub(pay)}`;
    } else {
      const other = BANKS_MORE.find(b => b[0] === UI.co.bank);
      body = `<div class="small" style="margin-bottom:8px">Выберите банк — откроется его приложение, где нужно только подтвердить платёж. QR-код сканировать не нужно.</div>
        <div class="banks">${BANKS.map(([id, n]) => `<button class="bank ${UI.co.bank === id ? 'on' : ''}" data-act="co-bank" data-v="${id}"><i>${esc(n[0])}</i><span>${esc(n)}</span></button>`).join('')}</div>
        <select class="input" data-ui-sel="sbpOther" style="margin-top:8px"><option value="">${other ? esc(other[1]) : 'Другой банк…'}</option>${BANKS_MORE.map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('')}</select>`;
      btn = bank ? `Перейти в «${esc(bank)}» и оплатить ${fmtRub(pay)}` : 'Выберите банк';
    }
    h = `<div class="dh bank-dh"><button class="x" data-act="co-back">‹</button><h3>Оплата заказа</h3><button class="x" data-act="close-drawer">×</button></div>
    <div class="db bankpage">
      <div class="bp-top"><span class="lock">🔒</span><div><b>Интернет-эквайринг Форабанка</b><div class="tiny">защищённая страница оплаты банка</div></div></div>
      <div class="bp-demo">Демо: имитация страницы банка. В рабочей версии клиент переходит на страницу Форабанка, данные карты вводятся только там — кафе их не видит и не хранит.</div>
      <div class="bp-sum"><div><div class="tiny muted">Получатель</div><b>Кафе «Этажом ниже»</b><div class="tiny muted">Заказ №${esc(UI.co.no)}</div></div><div class="bp-amt">${fmtRub(pay)}</div></div>
      <div class="bp-tabs">${fset().sbpDefault ? tab('sbp', '⚡ СБП') + tab('card', '💳 Банковская карта') : tab('card', '💳 Банковская карта') + tab('sbp', '⚡ СБП')}</div>
      <div class="bp-card">${body}</div>
      ${UI.payErr ? `<div class="note red" style="margin-top:10px">${esc(UI.payErr)}</div>` : ''}
      <div class="tiny muted" style="margin-top:10px">После оплаты вы вернётесь на сайт кафе. Чек сформирует облачная касса, ${UI.co.rcTo === 'email' && UI.co.email.trim() ? 'Контур.ОФД пришлёт его на ' + esc(UI.co.email.trim()) + ', а' : 'а'} скачать его можно будет на странице заказа.</div></div>
    <div class="df"><button class="btn primary lg" style="width:100%;justify-content:center" data-act="co-paynow" ${!card && !bank ? 'disabled' : ''}>${btn}</button></div>`;
  } else if (UI.drawer === 'paying') {
    const bank = bankById(UI.co.bank);
    h = `<div class="dh bank-dh"><span></span><h3>Оплата заказа</h3><span></span></div><div class="db bankpage"><div class="bp-top"><span class="lock">🔒</span><div><b>Интернет-эквайринг Форабанка</b><div class="tiny">защищённая страница оплаты банка</div></div></div><div class="spinner"></div><p style="text-align:center" class="muted">${UI.co.pay === 'card' ? 'Банк проверяет карту и списывает оплату…' : `Открываем приложение «${esc(bank || 'банка')}». Подтвердите платёж там — затем вернётесь на сайт кафе.`}</p></div>`;
  } else if (UI.drawer === 'success') {
    const o = S.orders[UI.lastOrder];
    h = head('Заказ оплачен') + (o ? `<div class="db">${orderCardBody(o, true)}</div>
      <div class="df"><button class="btn primary lg" style="width:100%;justify-content:center" data-act="track" data-id="${o.id}">Следить за заказом</button></div>` : '<div class="db">…</div>');
  }
  return `<div class="overlay" data-act="close-drawer" style="justify-content:flex-end;padding:0"></div><aside class="drawer">${h}</aside>`;
}
/* ----- оплата: банки для СБП и проверка карты ----- */
const BANKS = [['sber', 'Сбербанк'], ['tbank', 'Т-Банк'], ['alfa', 'Альфа-Банк'], ['vtb', 'ВТБ'], ['gpb', 'Газпромбанк'], ['ozon', 'Озон Банк']];
const BANKS_MORE = [['raif', 'Райффайзенбанк'], ['sovcom', 'Совкомбанк'], ['mts', 'МТС Банк'], ['pochta', 'Почта Банк'], ['yandex', 'Яндекс Банк'], ['psb', 'ПСБ'], ['rosbank', 'Росбанк'], ['uralsib', 'Уралсиб'], ['otkritie', 'Открытие'], ['rshb', 'Россельхозбанк']];
const bankById = id => ((BANKS.concat(BANKS_MORE)).find(b => b[0] === id) || [])[1] || '';
function cardBrand(num) { const d = String(num || '').replace(/\D/g, ''); return /^220[0-4]/.test(d) ? 'Мир' : /^4/.test(d) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(d) ? 'Mastercard' : ''; }
function luhnOk(d) { let t = 0; [...d].reverse().forEach((c, i) => { let x = +c; if (i % 2) { x *= 2; if (x > 9) x -= 9; } t += x; }); return t % 10 === 0; }
function cardError() {
  const d = UI.co.num.replace(/\D/g, '');
  if (d.length < 16 || d.length > 19 || !luhnOk(d)) return 'Проверьте номер карты.';
  const m = UI.co.exp.match(/^(\d{2})\s*\/?\s*(\d{2})$/); if (!m || +m[1] < 1 || +m[1] > 12) return 'Укажите срок действия в формате ММ/ГГ.';
  const now = new Date(), y = 2000 + +m[2]; if (y < now.getFullYear() || (y === now.getFullYear() && +m[1] < now.getMonth() + 1)) return 'Срок действия карты истёк.';
  if (!/^\d{3}$/.test(UI.co.cvc)) return 'CVC — три цифры на обороте карты.';
  return '';
}
function placeOrder() {
  const need = needFor(UI.cart);
  const short = Object.entries(need).filter(([ing, q]) => available(ing) < q - 1e-9);
  if (short.length) { const dishes = Object.keys(UI.cart).filter(id => DISH[id].recipe.some(x => short.some(([i]) => i === x.ing))); UI.drawer = 'cart'; render(); toast('Пока вы оформляли, закончилось: ' + dishes.map(id => DISH[id].name).join(', '), 'warn', 6000); return; }
  const tm = coTimes(), lc = coCalc(), L = lset();
  const email = UI.co.rcTo === 'email' ? UI.co.email.trim() : '';
  const o = buildOrder(S.catalog, Object.entries(UI.cart), { no: UI.co.no || newOrderNo(), name: UI.co.name.trim(), phone: UI.co.phone.trim(), email, card: UI.co.card.trim(), comment: UI.co.comment.trim(), mode: UI.co.mode, payMethod: UI.co.pay, readyAt: tm.t, minAt: tm.min });
  Object.assign(o, { phone: fmtPhone(coKey()) || o.phone, staffDisc: lc.staffDisc, staffRole: lc.role, bonus: lc.bonus, paid: lc.pay, welcome: lc.welcome });
  const tr = orderTrainerFor(lc.pay); if (tr) o.trainer = tr;
  if (lc.welcome) Object.assign(o, { welcomeTtl: L.ttlDays, welcomeSpend: L.spendPct });
  o.rcTo = email ? 'email' : 'pdf';
  fiscalOnPaid(o); saveOrder(o); addMyOrder(o.id);
  setSession(coKey()); rememberPhone(coKey());
  UI.cart = {}; UI.co.no = ''; UI.lastOrder = o.id; UI.drawer = 'success'; render();
}

/* ===== Страница заказа ===== */
function orderCardBody(o, fresh) {
  const gym = o.mode === 'gym', inCell = o.bag.need && o.bag.depositedAt && !o.bag.pickedAt;
  const cell = o.bag.cell && S.lockers ? S.lockers.cells.find(c => c.id === o.bag.cell) : null;
  const open = cell && cell.state === 'open' && cell.orderId === o.id && cell.openFor === 'pickup';
  const cancelled = o.status === 'cancelled';
  const qr = (title, sub, extra) => `<div class="qrbox">${qrSVG(o.pickTok, 'qr big')}<div class="small"><b>${title}</b><div class="muted tiny">${sub}</div>${extra || ''}</div></div>`;
  const gotBtn = (act, primary) => `<button class="btn ${primary ? 'primary' : 'green'} gotbtn" data-act="${act}" data-id="${o.id}">✓ Заказ забрал</button>`;
  let ready = '', wait = '', got = '';
  if (!cancelled && gym && o.cup.need) {
    if (o.cup.pickedAt) got += `<div class="part"><div class="pi">✅</div><div><b>Напиток получен на стойке</b><div class="small muted">${fmtTime(o.cup.pickedAt)}</div></div></div>`;
    else if (o.cup.placedAt) ready += `<div class="part ok pcol"><div class="row"><div class="pi">🥤</div><div><b>Заказ доставлен на стойку ресепшена</b><div class="small">Заберите стакан с номером <b>№${o.no}</b> · ${fmtTime(o.cup.placedAt)}</div></div></div>${gotBtn('pick-cup', true)}</div>`;
    else wait += `<div class="part"><div class="pi">🥤</div><div><b>Напиток — на стойку ресепшена</b><div class="small muted">Официант подпишет стакан номером №${o.no} и отметит «Заказ доставлен на стойку».</div></div></div>`;
  }
  if (!cancelled && gym && o.bag.need) {
    if (o.bag.pickedAt) got += `<div class="part"><div class="pi">✅</div><div><b>Заказ получен из ячейки ${o.bag.cell}</b><div class="small muted">${fmtTime(o.bag.pickedAt)} · ячейка освобождена для следующего заказа</div></div></div>`;
    else if (inCell && o.pickTok) {
      let act;
      if (UI.pickConfirm === o.id && !open) act = `<div class="note amber" style="margin-top:10px">Ячейка ${o.bag.cell} ещё не открывалась вашим QR-кодом. Если пакет уже у вас, подтвердите — ячейка освободится, и открыть её этим кодом будет нельзя.</div>
        <div class="row" style="margin-top:8px;gap:8px"><button class="btn green" data-act="pick-bag" data-id="${o.id}" data-force="1">Да, пакет у меня</button><button class="btn" data-act="pick-cancel">Сначала открою ячейку</button></div>`;
      else if (open) act = `<div class="note green" style="margin-top:10px">Ячейка ${o.bag.cell} открыта — заберите пакет №${o.no}, закройте дверцу и нажмите «Заказ забрал».</div>${gotBtn('pick-bag', true)}`;
      else act = gotBtn('pick-bag', false);
      ready += `<div class="part ok pcol"><div class="row"><div class="pi">📦</div><div><b>Заказ доставлен в ячейку ${o.bag.cell}</b><div class="small">Поднесите QR-код к табло шкафа — ячейка откроется · ${fmtTime(o.bag.depositedAt)}</div></div></div>
      ${qr('Ваш QR-код для ячейки ' + o.bag.cell, o.pickTok, open ? '' : `<button class="btn sm lime" style="margin-top:8px" data-act="client-scan" data-id="${o.id}">Поднести к табло шкафа (демо)</button>`)}${act}</div>`;
    }
    else wait += `<div class="part"><div class="pi">📦</div><div><b>Еда — в ячейку шкафа наверху</b><div class="small muted">QR-код для ячейки появится здесь, когда официант положит заказ в ячейку и отметит «Заказ доставлен в ячейку».</div></div></div>`;
  }
  if (!cancelled && !gym) {
    if (o.status === 'done') got += `<div class="part"><div class="pi">✅</div><div><b>Заказ получен</b><div class="small muted">${fmtTime(o.history.done || Date.now())}</div></div></div>`;
    else if (o.shelfAt && o.pickTok) ready += `<div class="part ok pcol"><div class="row"><div class="pi">☕</div><div><b>Заказ ждёт вас на стойке кафе</b><div class="small">Назовите номер №${o.no} или покажите QR-код · ${fmtTime(o.shelfAt)}</div></div></div>${qr('QR-код для выдачи', o.pickTok)}${gotBtn('pick-cafe', true)}</div>`;
    else wait += `<div class="part"><div class="pi">☕</div><div><b>Заберёте на стойке выдачи кафе</b><div class="small muted">Номер и QR-код для выдачи появятся здесь, когда заказ будет на полке.</div></div></div>`;
  }
  if (o.status === 'done') got = `<div class="note green">Заказ получен полностью — приятного аппетита!</div>` + got;
  return `<div class="success">${fresh ? '<div class="ok">✓</div>' : ''}<div class="muted">Номер заказа — он будет на ${o.bag.need ? 'пакете' : ''}${o.bag.need && o.cup.need ? ' и ' : ''}${o.cup.need ? 'стакане' : ''}</div><div class="code">№${o.no}</div>
      <p>Будет ${gym ? 'наверху' : 'на стойке кафе'} к <b>${fmtTime(o.readyAt)}</b>${o.minAt ? ` <span class="muted small">(минимально было ${fmtTime(o.minAt)})</span>` : ''}</p></div>
    <div class="parts">${ready}${wait}${got}</div>
    ${receiptRows(o)}
    ${o.items.map(it => `<div class="ci"><div class="e">${it.e}</div><div class="n">${esc(it.n)}${it.drink ? ` <span class="tiny muted">· ${DRINK_SUB[it.d] === 'water' ? 'бутылка' : 'стакан'}</span>` : ''}</div><b>× ${it.q}</b></div>`).join('')}
    ${orderLoyaltyRows(o)}<div class="sum-row total"><span>${o.status === 'cancelled' ? 'Возвращено' : 'Оплачено'} ${o.payMethod === 'sbp' ? 'по СБП' : 'картой'}</span><span>${fmtRub(paidOf(o))}</span></div>${orderWelcomeNote(o)}`;
}
function trackModal(o) {
  const steps = o.mode === 'cafe' ? [['paid', 'Принят'], ['cooking', 'Готовится'], ['ready', 'Готов'], ['placed', 'На стойке кафе'], ['done', 'Получен']]
    : [['paid', 'Принят'], ['cooking', 'Готовится'], ['ready', 'Готов'], ['delivering', 'Официант несёт наверх'], ['placed', o.bag.need && o.cup.need ? 'В ячейке и на стойке' : o.bag.need ? 'В ячейке' + (o.bag.cell ? ' ' + o.bag.cell : '') : 'На стойке ресепшена'], ['done', 'Получен']];
  const order = steps.map(s => s[0]); let idx = order.indexOf(o.status); if (idx < 0) idx = 0;
  return `<div class="overlay" data-act="close-modal"><div class="modal" style="width:min(560px,100%)">
    <div class="mh"><h3>Заказ №${o.no}</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb">${o.status === 'cancelled' ? '<div class="note red">Заказ отменён, деньги вернутся на карту в течение нескольких минут.</div>' : `<div class="track hz">${steps.map(([k, t], i) => `<div class="tstep ${i <= idx ? 'done' : ''} ${i === idx && k !== 'done' ? 'cur' : ''}"><div class="c">${i <= idx ? '✓' : i + 1}</div><div><div class="t">${t}</div><div class="w">${o.history && o.history[k] ? fmtTime(o.history[k]) : ''}</div></div></div>`).join('')}</div>`}
      ${orderCardBody(o, false)}</div>
    <div class="mf">${o.status === 'paid' && !o.tasks.some(t => t.start) ? `<button class="btn danger" data-act="cancel-order" data-id="${o.id}">Отменить заказ</button>` : ''}<span class="spacer"></span><button class="btn" data-act="close-modal">Закрыть</button></div>
  </div></div>`;
}
function myOrdersModal() {
  const list = myOrders();
  return `<div class="overlay" data-act="close-modal"><div class="modal" style="width:min(560px,100%)">
    <div class="mh"><h3>Мои заказы</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb">${list.length ? list.map(o => `<div class="ci" data-act="track" data-id="${o.id}" style="cursor:pointer"><div class="e" style="font-size:14px;font-weight:800">№${o.no}</div><div class="n">${fmtRub(paidOf(o))} · ${o.mode === 'cafe' ? 'в кафе' : 'наверху'}<div class="tiny muted">${fmtDate(o.readyAt)}, к ${fmtTime(o.readyAt)} · ${o.items.map(i => i.n).join(', ')}</div></div><span class="st ${STATUS[o.status].color}">${clientStatus(o)}</span></div>`).join('') : '<div class="empty">Вы ещё ничего не заказывали с этого устройства.</div>'}</div>
  </div></div>`;
}
