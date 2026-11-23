/* ===== Приложение управляющего ===== */
const ADMIN_TABS = [['admin-menu', 'Меню и акции'], ['stock', 'Склад'], ['purchasing', 'Закупки'], ['receipts', 'Платежи и чеки'], ['loyalty', 'Клиенты и бонусы'], ['dashboard', 'Сводка'], ['settings', 'Настройки']];
function adminHead() {
  const stockN = S.catalog.ingredients.filter(i => ingStatus(i)[0] !== 'ok').length;
  const rcQueue = Object.values(S.orders).reduce((s, o) => s + (o.receipts || []).filter(r => !rcInOfd(r)).length, 0);
  return staffHead('Управляющий', 'меню, склад, закупки, чеки', ADMIN_TABS.map(([id, n]) => [id, n, id === 'stock' ? stockN : id === 'receipts' ? rcQueue : 0]), UI.view, 'nav');
}
function adminMain() {
  const v = { 'admin-menu': menuAdminView, stock: stockView, purchasing: purchasingView, receipts: receiptsView, loyalty: loyaltyView, dashboard: dashboardView, settings: settingsView }[UI.view] || menuAdminView;
  const note = S.dbNote ? `<div class="banner">⚠️ ${esc(S.dbNote)}</div>` : '';
  return `<div class="awrap">${note}${v()}</div>`;
}
const stBadge = st => `<span class="st ${STATUS[st].color}">${STATUS[st].short}</span>`;
const mins = ms => Math.round(ms / 60e3);
const inMin = m => m >= 0 ? `через ${m} мин` : `${-m} мин назад`;

/* ----- Меню и акции ----- */
function promoRecs() {
  const recs = [], today = new Date();
  S.catalog.ingredients.forEach(i => {
    if (i.shelf > 10) return;
    const dn = avgDailyNeed(i.id), av = available(i.id), days = Math.min(i.shelf, 4);
    if (dn > 0 && av > dn * days * 1.3) {
      S.catalog.dishes.filter(d => !d.discount && !d.stop && d.recipe.some(x => x.ing === i.id))
        .sort((a, b) => b.recipe.find(x => x.ing === i.id).qty - a.recipe.find(x => x.ing === i.id).qty).slice(0, 2)
        .forEach(d => recs.push({ ic: '🏷️', dish: d, sale: 20, text: `<b>${esc(i.name)}</b>: на складе ${fmtQty(av, i.unit)}, а за ${days} дн. до конца срока уйдёт ≈${fmtQty(dn * days, i.unit)}. Скидка на «${esc(d.name)}» разгонит спрос.` }));
    }
  });
  S.catalog.dishes.filter(d => d.hit && !d.stop).forEach(d => {
    const f = forecastDish(d, today) * dayRemainFrac(), p = portions(d);
    if (p < f) { const li = ING[limitingIng(d)]; recs.push({ ic: '⚠️', text: `Хит «<b>${esc(d.name)}</b>»: осталось ${p} порц., а до закрытия ожидаем ≈${Math.ceil(f)}. Узкое место — ${esc(li ? li.name : '')}. Проверьте закупку.`, go: 'purchasing' }); }
  });
  return recs;
}
function menuAdminView() {
  const q = UI.mq.trim().toLowerCase();
  const list = S.catalog.dishes.filter(d => (UI.mGoal === 'all' || d.goals.includes(UI.mGoal)) && (UI.mType === 'all' || d.type === UI.mType) && (!q || d.name.toLowerCase().includes(q)));
  const recs = promoRecs();
  const stopped = S.catalog.dishes.filter(d => !onSale(d));
  return `<div class="ah"><h2>Меню и акции</h2><span class="muted">${S.catalog.dishes.length} блюд · хиты: ${S.catalog.dishes.filter(d => d.hit).length} · со скидкой: ${S.catalog.dishes.filter(d => d.discount).length} · в стопе: ${stopped.length}</span><span class="spacer"></span><button class="btn primary" data-act="m-new">+ Новое блюдо</button></div>
    ${recs.length ? `<div class="panel"><h3>Подсказки системы</h3>${recs.map(r => `<div class="rec"><span class="ic">${r.ic}</span><span class="tx">${r.text}</span>${r.dish && r.sale ? `<button class="btn sm" data-act="m-apply-sale" data-id="${r.dish.id}" data-v="${r.sale}">Скидка ${r.sale}%</button>` : ''}${r.go ? `<button class="btn sm" data-act="nav" data-v="${r.go}">К закупкам</button>` : ''}</div>`).join('')}</div>` : ''}
    <div class="panel">
      <div class="toolbar" style="margin-top:0"><div class="search">${ICON.search}<input class="input" data-ui="mq" data-fk="mq" placeholder="Найти блюдо" value="${esc(UI.mq)}"></div>
        <select class="input" data-ui-sel="mGoal"><option value="all">Все цели</option>${GOALS.map(g => `<option value="${g.id}" ${UI.mGoal === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}</select>
        <select class="input" data-ui-sel="mType"><option value="all">Все типы</option>${TYPES.map(t => `<option value="${t.id}" ${UI.mType === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
      <div class="tw"><table class="t"><thead><tr><th>Блюдо</th><th>Цели</th><th class="r">Цена, ₽</th><th class="r">Скидка, %</th><th class="r">На сайте</th><th>Хит дня</th><th>Стоп</th><th class="r">Порций</th><th>Ограничивает</th><th class="r">Себест.</th><th class="r">Фудкост</th></tr></thead><tbody>
      ${list.map(d => { const p = portions(d), li = ING[limitingIng(d)], cost = dishCost(d), fc = cost / effPrice(d) * 100; return `<tr>
        <td><a href="#admin-menu" data-act="m-edit" data-id="${d.id}" style="text-decoration:none;color:inherit"><b>${d.emoji} ${esc(d.name)}</b></a><div class="tiny muted">${TYPE[d.type].name} · ${d.kcal} ккал · ${d.cook} мин</div></td>
        <td><div class="goal-dots">${d.goals.map(g => `<span class="gdot" style="--gc:${GOAL[g].color}">${GOAL[g].name}</span>`).join('')}</div></td>
        <td class="r"><input class="input num" type="number" min="0" step="10" value="${d.price}" data-dish="price" data-id="${d.id}" data-fk="pr-${d.id}"></td>
        <td class="r"><input class="input num" type="number" min="0" max="90" step="5" value="${d.discount || 0}" data-dish="discount" data-id="${d.id}" data-fk="dc-${d.id}" style="width:64px"></td>
        <td class="r b num">${fmtRub(effPrice(d))}</td>
        <td><button class="tog hitc ${d.hit ? 'on' : ''}" data-act="m-hit" data-id="${d.id}" aria-label="Хит дня"></button></td>
        <td><button class="tog stopc ${d.stop ? 'on' : ''}" data-act="m-stop" data-id="${d.id}" aria-label="Стоп"></button></td>
        <td class="r num">${d.stop ? '<span class="st out">стоп</span>' : p === 0 ? '<span class="st out">0 — авто-стоп</span>' : p <= 5 ? `<span class="st low">${p}</span>` : p}</td>
        <td class="small">${li ? esc(li.name) : '—'}</td>
        <td class="r num">${fmtRub(cost)}</td>
        <td class="r num ${fc > 35 ? 'b' : ''}" style="${fc > 35 ? 'color:var(--orange)' : ''}">${fmtNum(fc)}%</td></tr>`; }).join('')}
      </tbody></table></div>
      <p class="tiny muted">Порций = минимум по ингредиентам (остаток − резерв) ÷ норма из техкарты. При 0 блюдо автоматически скрывается с сайта. Фудкост выше 35% подсвечен.</p>
    </div>`;
}
function editDishModal() {
  const d = UI.editDish, isNew = !DISH[d.id];
  const ingOpts = sel => S.catalog.ingredients.map(i => `<option value="${i.id}" ${sel === i.id ? 'selected' : ''}>${esc(i.name)} (${UI_UNIT(i)})</option>`).join('');
  const f = (k, label, type = 'text', extra = '') => `<div class="field"><label>${label}</label><input class="input" type="${type}" data-ed="${k}" data-fk="ed-${k}" value="${esc(d[k])}" ${extra}></div>`;
  return `<div class="overlay" data-act="close-modal"><div class="modal wide">
    <div class="mh"><h3>${isNew ? 'Новое блюдо' : 'Редактировать: ' + esc(d.name)}</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb">
      <div class="formgrid">${f('name', 'Название', 'text')}${f('emoji', 'Иконка (эмодзи)')}<div class="field"><label>Тип</label><select class="input" data-ed="type">${TYPES.map(t => `<option value="${t.id}" ${d.type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div><div class="field"><label>Цех</label><select class="input" data-ed="station">${STATIONS.map(t => `<option value="${t.id}" ${d.station === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>${f('weight', 'Выход')}</div>
      <div class="field"><label>Описание</label><input class="input" data-ed="desc" data-fk="ed-desc" value="${esc(d.desc)}"></div>
      <div class="field"><label>Цели питания</label><div class="chips">${GOALS.map(g => `<button class="chip ${d.goals.includes(g.id) ? 'on' : ''}" data-act="ed-goal" data-v="${g.id}">${g.icon} ${g.name}</button>`).join('')}</div></div>
      <div class="formgrid">${f('price', 'Цена, ₽', 'number')}${f('cook', 'Готовка, мин', 'number')}${f('kcal', 'Ккал', 'number')}${f('p', 'Белки, г', 'number')}${f('f', 'Жиры, г', 'number')}${f('c', 'Углеводы, г', 'number')}${f('serves', 'Персон', 'number')}</div>
      <div class="field"><label>Техкарта (норма на 1 позицию)</label>
        ${d.recipe.map((r, ix) => `<div class="recipe-row"><select class="input" data-edr="ing" data-i="${ix}">${ingOpts(r.ing)}</select><input class="input" type="number" step="any" min="0" data-edr="qty" data-i="${ix}" data-fk="edr-${ix}" value="${r.qty}"><button class="x" data-act="ed-delrow" data-i="${ix}">×</button></div>`).join('')}
        <button class="btn sm" data-act="ed-addrow">+ Ингредиент</button></div>
      <div class="small muted">Себестоимость по техкарте: <b>${fmtRub(dishCost(d))}</b> · фудкост ${d.price ? fmtNum(dishCost(d) / (d.price * (1 - (d.discount || 0) / 100)) * 100) : 0}%</div>
    </div>
    <div class="mf">${isNew ? '' : `<button class="btn danger" data-act="ed-delete">${UI.confirmDel ? 'Точно удалить?' : 'Удалить блюдо'}</button>`}<span class="spacer"></span><button class="btn" data-act="close-modal">Отмена</button><button class="btn primary" data-act="ed-save">Сохранить</button></div>
  </div></div>`;
}
const UI_UNIT = i => UNIT[i.unit];

/* ----- Склад ----- */
const MOVE_T = { in: 'Приход', order: 'Заказ с сайта', hall: 'Продажа в зале', waste: 'Списание', inv: 'Инвентаризация' };
function ingStatus(i) { const a = available(i.id), dn = avgDailyNeed(i.id); return a <= 0 ? ['out', 'Нет'] : (a < i.min || (dn > 0 && a < dn)) ? ['low', 'Мало'] : ['ok', 'Норма']; }
function stockView() {
  const q = UI.sq.trim().toLowerCase(), cats = [...new Set(S.catalog.ingredients.map(i => i.cat))];
  const list = S.catalog.ingredients.filter(i => (UI.sCat === 'all' || i.cat === UI.sCat) && (!q || i.name.toLowerCase().includes(q)) && (UI.sStatus === 'all' || ingStatus(i)[0] === UI.sStatus));
  const low = S.catalog.ingredients.filter(i => ingStatus(i)[0] === 'low').length, out = S.catalog.ingredients.filter(i => ingStatus(i)[0] === 'out').length;
  const value = S.catalog.ingredients.reduce((s, i) => s + unitCost(i.stock, i.unit, i.offers[0].price), 0);
  const res = reserved(), stopped = S.catalog.dishes.filter(d => !onSale(d));
  const transit = S.catalog.pos.filter(p => p.status === 'sent');
  return `<div class="ah"><h2>Склад</h2><span class="muted">остатки в реальном времени: заказы резервируют продукты, старт готовки списывает</span><span class="spacer"></span>
      <button class="btn" data-act="op" data-v="in">+ Приход</button><button class="btn" data-act="op" data-v="hall">Продажа в зале</button><button class="btn" data-act="op" data-v="waste">Списание</button><button class="btn" data-act="op" data-v="inv">Инвентаризация</button></div>
    <div class="kpis">
      <div class="kpi ${out ? 'bad' : ''}"><div class="l">Закончилось</div><div class="v">${out}</div><div class="s">ингредиентов</div></div>
      <div class="kpi ${low ? 'warn' : ''}"><div class="l">Заканчивается</div><div class="v">${low}</div><div class="s">ниже минимума или меньше чем на день</div></div>
      <div class="kpi ${stopped.length ? 'warn' : ''}"><div class="l">Блюд в стоп-листе</div><div class="v">${stopped.length}</div><div class="s">${stopped.slice(0, 3).map(d => esc(d.name)).join(', ') || 'все в продаже'}</div></div>
      <div class="kpi"><div class="l">Стоимость запасов</div><div class="v">${fmtRub(value)}</div><div class="s">по ценам основных поставщиков</div></div>
      <div class="kpi"><div class="l">Поставок в пути</div><div class="v">${transit.length}</div><div class="s">${fmtRub(transit.reduce((s, p) => s + p.total, 0))}</div></div>
    </div>
    <div class="panel">
      <div class="toolbar" style="margin-top:0"><div class="search">${ICON.search}<input class="input" data-ui="sq" data-fk="sq" placeholder="Найти продукт" value="${esc(UI.sq)}"></div>
        <select class="input" data-ui-sel="sCat"><option value="all">Все категории</option>${cats.map(c => `<option ${UI.sCat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <select class="input" data-ui-sel="sStatus"><option value="all">Любой статус</option><option value="out" ${UI.sStatus === 'out' ? 'selected' : ''}>Нет</option><option value="low" ${UI.sStatus === 'low' ? 'selected' : ''}>Мало</option><option value="ok" ${UI.sStatus === 'ok' ? 'selected' : ''}>Норма</option></select></div>
      <div class="tw"><table class="t"><thead><tr><th>Продукт</th><th class="r">Остаток</th><th class="r">Резерв</th><th class="r">Доступно</th><th class="r">Мин. остаток</th><th class="r">Хватит на</th><th class="r">Срок годн.</th><th>Поставщик</th><th>Статус</th><th></th></tr></thead><tbody>
      ${list.map(i => { const a = available(i.id), dn = avgDailyNeed(i.id), days = dn > 0 ? a / dn : Infinity, [sc, sn] = ingStatus(i); return `<tr>
        <td><b>${esc(i.name)}</b><div class="tiny muted">${i.cat}</div></td>
        <td class="r num">${fmtQty(i.stock, i.unit)}</td><td class="r num muted">${res[i.id] ? fmtQty(res[i.id], i.unit) : '—'}</td>
        <td class="r num b">${fmtQty(Math.max(0, a), i.unit)}</td><td class="r num muted">${fmtQty(i.min, i.unit)}</td>
        <td class="r num">${days === Infinity ? '—' : days < 1 ? '<span style="color:var(--red);font-weight:700">&lt; 1 дн.</span>' : fmtNum(days, days < 10 ? 1 : 0) + ' дн.'}</td>
        <td class="r num muted">${i.shelf} дн.</td><td class="small">${esc(SUP[i.offers[0].s].name)}</td>
        <td><span class="st ${sc}">${sn}</span></td>
        <td><button class="btn sm ghost" data-act="op" data-v="in" data-ing="${i.id}">Приход</button><button class="btn sm ghost" data-act="op" data-v="inv" data-ing="${i.id}">Факт</button></td></tr>`; }).join('')}
      </tbody></table></div>
    </div>
    <div class="panel"><h3>Журнал движений</h3><div class="tw" style="max-height:340px"><table class="t"><thead><tr><th>Когда</th><th>Продукт</th><th class="r">Количество</th><th>Операция</th><th>Основание</th></tr></thead><tbody>
      ${S.catalog.moves.slice().sort((a, b) => b.at - a.at).slice(0, 40).map(m => { const i = ING[m.ing]; return `<tr><td class="nowrap small">${fmtDate(m.at)}, ${fmtTime(m.at)}</td><td>${i ? esc(i.name) : m.ing}</td><td class="r num b" style="color:${m.qty > 0 ? 'var(--green)' : 'var(--ink)'}">${m.qty > 0 ? '+' : '−'}${i ? fmtQty(Math.abs(m.qty), i.unit) : Math.abs(m.qty)}</td><td><span class="st ${m.type === 'in' ? 'green' : m.type === 'waste' ? 'red' : m.type === 'inv' ? 'violet' : 'grey'}">${MOVE_T[m.type] || m.type}</span></td><td class="small muted">${esc(m.note || '')}</td></tr>`; }).join('')}
    </tbody></table></div></div>`;
}
function opModal() {
  const m = UI.modal, t = m.type;
  const titles = { in: 'Приход продуктов', waste: 'Списание (порча, брак)', inv: 'Инвентаризация: фактический остаток', hall: 'Продажа в зале кафе' };
  const ingSel = `<div class="field"><label>Продукт</label><select class="input" data-op="ing">${S.catalog.ingredients.map(i => `<option value="${i.id}" ${m.ing === i.id ? 'selected' : ''}>${esc(i.name)} — сейчас ${fmtQty(i.stock, i.unit)}</option>`).join('')}</select></div>`;
  const i = ING[m.ing];
  const body = t === 'hall'
    ? `<p class="small muted">Пока касса кафе не связана с сайтом, продажи в зале вносятся здесь — иначе остатки на сайте разойдутся с реальностью.</p>
       <div class="field"><label>Блюдо</label><select class="input" data-op="dish">${S.catalog.dishes.map(d => `<option value="${d.id}" ${m.dish === d.id ? 'selected' : ''}>${d.emoji} ${esc(d.name)}</option>`).join('')}</select></div>
       <div class="field"><label>Количество порций</label><input class="input" type="number" min="1" data-op="qty" data-fk="op-qty" value="${m.qty || 1}"></div>`
    : `${ingSel}<div class="field"><label>${t === 'inv' ? 'Фактический остаток' : 'Количество'}, ${i ? UNIT[i.unit] : ''}</label><input class="input" type="number" step="any" min="0" data-op="qty" data-fk="op-qty" value="${m.qty ?? ''}" placeholder="${t === 'inv' && i ? 'по учёту ' + i.stock : ''}"></div>
       <div class="field"><label>Комментарий</label><input class="input" data-op="note" data-fk="op-note" value="${esc(m.note || '')}" placeholder="${t === 'in' ? 'накладная, поставщик' : t === 'waste' ? 'причина' : ''}"></div>`;
  return `<div class="overlay" data-act="close-modal"><div class="modal" style="width:min(520px,100%)"><div class="mh"><h3>${titles[t]}</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb">${body}</div><div class="mf"><button class="btn" data-act="close-modal">Отмена</button><button class="btn primary" data-act="op-save">Провести</button></div></div></div>`;
}

/* ----- Закупки ----- */
function colChart(vals, labels, { split = -1, h = 210, fmt = v => fmtNum(v), mark = -1 } = {}) {
  const W = 1000, pl = 44, pr = 8, pt = 10, pb = 26, n = vals.length;
  const max = Math.max(1, ...vals), step = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / step * 1.1) * step;
  const bw = (W - pl - pr) / n, y = v => pt + (h - pt - pb) * (1 - v / top);
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = top * k / 4; g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#ebe7de"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#7a817c">${fmtNum(v)}</text>`; }
  vals.forEach((v, k) => {
    const fut = split >= 0 && k >= split, x = pl + k * bw + bw * 0.15, w = bw * 0.7;
    g += `<rect x="${x}" y="${y(v)}" width="${w}" height="${Math.max(0, h - pb - y(v))}" rx="3" fill="${fut ? '#c9f26b' : k === mark ? '#e8743b' : '#1d6b45'}" ${fut ? 'stroke="#8fb33a"' : ''}><title>${labels[k]}: ${fmt(v)}</title></rect>`;
    if (k % 7 === 0 || k === split || k === n - 1) g += `<text x="${x + w / 2}" y="${h - 8}" text-anchor="middle" font-size="11" fill="${k === split ? '#17201b' : '#7a817c'}" font-weight="${k === split ? 700 : 400}">${k === split ? 'сегодня' : labels[k]}</text>`;
  });
  if (split >= 0) g += `<line x1="${pl + split * bw}" x2="${pl + split * bw}" y1="${pt}" y2="${h - pb}" stroke="#17201b" stroke-dasharray="4 4"/>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">${g}</svg>`;
}
function purchasingView() {
  const st = S.catalog.settings, today = startOfDay(new Date());
  const past = [], labels = [], fut = [];
  for (let k = HISTORY_DAYS; k >= 1; k--) { const d = addDays(today, -k); past.push(S.catalog.dishes.reduce((s, x) => s + histSales(x, d), 0)); labels.push(d.getDate() + ' ' + MON[d.getMonth()]); }
  for (let k = 0; k < 7; k++) { const d = addDays(today, k); fut.push(Math.round(S.catalog.dishes.reduce((s, x) => s + forecastDish(x, d), 0))); labels.push(d.getDate() + ' ' + MON[d.getMonth()]); }
  const rows = S.catalog.ingredients.map(i => planRow(i, UI.pChoice[i.id] || defaultSupplier(i)));
  const shown = rows.filter(r => UI.pAll || r.qty > 0 || r.risk).sort((a, b) => (b.risk - a.risk) || (b.sum - a.sum));
  const toOrder = rows.filter(r => r.qty > 0), bySup = {};
  toOrder.forEach(r => { bySup[r.sup.id] = (bySup[r.sup.id] || 0) + r.sum; });
  const pos = S.catalog.pos.slice().sort((a, b) => ({ draft: 0, sent: 1, received: 2 }[a.status] - { draft: 0, sent: 1, received: 2 }[b.status]) || b.createdAt - a.createdAt);
  return `<div class="ah"><h2>Закупки</h2><span class="muted">потребность = прогноз продаж × техкарты до следующей поставки, с учётом остатков, резерва и заказанного</span></div>
    <div class="panel"><div class="settings">
      <label>Страховой запас <input type="range" min="0" max="50" step="5" value="${st.safety}" data-set="safety"><b class="num">${st.safety}%</b></label>
      <label>Ожидаемый рост спроса <input type="range" min="-30" max="60" step="5" value="${st.growth}" data-set="growth"><b class="num">${st.growth > 0 ? '+' : ''}${st.growth}%</b></label>
      <label><button class="tog ${st.promo ? 'on' : ''}" data-act="p-promo"></button> Учитывать хиты и скидки в прогнозе</label>
    </div></div>
    <div class="panel"><div class="row"><h3 style="margin:0">Порций в день: факт за 4 недели и прогноз на неделю</h3><span class="spacer"></span><div class="legend"><span><i style="background:#1d6b45"></i>продано</span><span><i style="background:#c9f26b;outline:1px solid #8fb33a"></i>прогноз</span></div></div>
      ${colChart(past.concat(fut), labels, { split: HISTORY_DAYS, fmt: v => fmtNum(v) + ' порц.' })}
      <p class="tiny muted" style="margin:6px 0 0">Прогноз блюда = среднее продаж в тот же день недели за 4 недели × (1 + рост спроса) × коэффициент акции (хит ×1,3; скидка 20% ×1,3).</p></div>
    <div class="panel">
      <div class="row wrap"><h3 style="margin:0">Предложение к заказу</h3><span class="muted small">${toOrder.length} позиций · ${fmtRub(toOrder.reduce((s, r) => s + r.sum, 0))} · ${Object.keys(bySup).length} ${plural(Object.keys(bySup).length, 'поставщик', 'поставщика', 'поставщиков')}</span><span class="spacer"></span>
        <label class="small row"><button class="tog ${UI.pAll ? 'on' : ''}" data-act="p-all"></button> показать все продукты</label>
        <button class="btn primary" data-act="p-generate" ${toOrder.length ? '' : 'disabled'}>Сформировать заявки</button></div>
      <div class="tw" style="margin-top:10px"><table class="t"><thead><tr><th>Продукт</th><th class="r">Расход/день</th><th class="r">Доступно</th><th class="r">Уже заказано</th><th>Поставщик и цена</th><th>Поставка</th><th class="r">Нужно до след.</th><th class="r">К заказу</th><th class="r">Сумма</th><th></th></tr></thead><tbody>
      ${shown.map(r => { const i = r.ing; return `<tr>
        <td><b>${esc(i.name)}</b><div class="tiny muted">фасовка ${fmtQty(i.pack, i.unit)}</div></td>
        <td class="r num">${fmtQty(avgDailyNeed(i.id), i.unit)}</td><td class="r num">${fmtQty(Math.max(0, r.avail), i.unit)}</td><td class="r num muted">${r.ordered ? fmtQty(r.ordered, i.unit) : '—'}</td>
        <td><select class="input" data-pchoice data-id="${i.id}" style="width:auto;max-width:240px">${i.offers.map(o => `<option value="${o.s}" ${o.s === r.sup.id ? 'selected' : ''}>${esc(SUP[o.s].name)} — ${fmtRub(o.price)}/${priceUnit(i.unit)}</option>`).join('')}</select></td>
        <td class="small nowrap">${fmtDate(r.next)}<div class="tiny muted">след.: ${fmtDate(r.following)}</div></td>
        <td class="r num">${fmtQty(r.needTotal, i.unit)}</td><td class="r num b">${r.qty ? fmtQty(r.qty, i.unit) : '—'}</td><td class="r num">${r.qty ? fmtRub(r.sum) : '—'}</td>
        <td>${r.risk ? '<span class="st out" title="Запаса не хватит до ближайшей поставки">риск дефицита</span>' : ''}</td></tr>`; }).join('') || '<tr><td colspan="10" class="muted">Всё в норме — заказывать ничего не нужно.</td></tr>'}
      </tbody></table></div>
      <p class="tiny muted">К заказу = потребность до поставки, следующей за ближайшей, × (1 + страховой запас) − доступно − уже заказано; округляется вверх до фасовки. При риске дефицита по умолчанию предлагается резервный поставщик с доставкой на следующий день.</p>
    </div>
    <div class="panel"><h3>Заявки поставщикам</h3>${pos.map(poCard).join('') || '<div class="muted small">Заявок пока нет.</div>'}</div>
    <div class="panel"><h3>Поставщики</h3><div class="tw"><table class="t"><thead><tr><th>Поставщик</th><th>Что везёт</th><th>Дни поставки</th><th class="r">Заказ за</th><th class="r">Приём до</th><th class="r">Мин. сумма</th><th>Ближайшая поставка</th></tr></thead><tbody>
      ${S.catalog.suppliers.map(s => `<tr><td><b>${esc(s.name)}</b>${s.backup ? ' <span class="st grey">резерв</span>' : ''}</td><td class="small">${esc(s.what)}</td><td class="small">${s.days.length === 7 ? 'ежедневно' : s.days.map(d => ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'][d - 1]).join(', ')}</td><td class="r">${s.lead} дн.</td><td class="r">${s.cutoff}:00</td><td class="r num">${s.min ? fmtRub(s.min) : '—'}</td><td class="small">${fmtDate(deliverySchedule(s).next)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}
function poCard(p) {
  const s = SUP[p.supplierId] || { name: p.supplierId, min: 0 };
  const stc = { draft: ['grey', 'Черновик'], sent: ['blue', 'Отправлена · в пути'], received: ['green', 'Получена'] }[p.status];
  return `<div class="po"><div class="ph"><b>${esc(s.name)}</b><span class="st ${stc[0]}">${stc[1]}</span><span class="small muted">поставка ${fmtDate(p.deliveryDate)}${p.receivedAt ? ' · принята ' + fmtTime(p.receivedAt) : ''}</span><span class="spacer"></span><b class="num">${fmtRub(p.total)}</b>
    ${p.status === 'draft' ? `<button class="btn sm primary" data-act="po-send" data-id="${p.id}">Отправить поставщику</button><button class="btn sm ghost danger" data-act="po-del" data-id="${p.id}">Удалить</button>` : ''}
    ${p.status === 'sent' ? `<button class="btn sm lime" data-act="po-recv" data-id="${p.id}">Принять поставку</button>` : ''}</div>
    ${p.status !== 'received' && s.min && p.total < s.min ? `<div class="note" style="margin-top:8px">Сумма ниже минимального заказа поставщика (${fmtRub(s.min)}). Добавьте позиции или переключите их на резервного поставщика.</div>` : ''}
    ${p.status !== 'received' || UI.poOpen === p.id ? `<table class="t"><tbody>${p.items.map(it => { const i = ING[it.ing]; return `<tr><td>${i ? esc(i.name) : it.ing}</td><td class="r num">${i ? fmtQty(it.qty, i.unit) : it.qty}</td><td class="r num muted">${fmtRub(it.price)}/${i ? priceUnit(i.unit) : ''}</td><td class="r num">${i ? fmtRub(unitCost(it.qty, i.unit, it.price)) : ''}</td></tr>`; }).join('')}</tbody></table>` : `<div class="tiny muted" style="margin-top:4px">${p.items.map(it => ING[it.ing] ? ING[it.ing].name : it.ing).join(', ')}</div>`}
  </div>`;
}
function receiveModal(p) {
  return `<div class="overlay" data-act="close-modal"><div class="modal" style="width:min(600px,100%)"><div class="mh"><h3>Приёмка: ${esc(SUP[p.supplierId].name)}</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb"><p class="small muted">Сверьте фактическое количество с накладной. Остатки на складе увеличатся, блюда вернутся на сайт автоматически.</p>
    <table class="t"><thead><tr><th>Продукт</th><th class="r">Заказано</th><th class="r">Принято</th></tr></thead><tbody>${p.items.map((it, ix) => { const i = ING[it.ing]; return `<tr><td>${esc(i.name)}</td><td class="r num">${fmtQty(it.qty, i.unit)}</td><td class="r"><input class="input num" type="number" step="any" min="0" data-rcv="${ix}" data-fk="rcv-${ix}" value="${UI.rcv && UI.rcv[ix] != null ? UI.rcv[ix] : it.qty}" style="width:100px"> ${UNIT[i.unit]}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="mf"><button class="btn" data-act="close-modal">Отмена</button><button class="btn primary" data-act="po-recv-ok" data-id="${p.id}">Принять на склад</button></div></div></div>`;
}

/* ----- Сводка ----- */
function dashboardView() {
  const now = Date.now(), today = Object.values(S.orders).filter(o => sameDay(o.createdAt, now) || sameDay(o.readyAt, now));
  const paid = today.filter(o => o.status !== 'cancelled'), rev = paid.reduce((s, o) => s + paidOf(o), 0);
  const done = today.filter(o => ['placed', 'done'].includes(o.status) && o.history.placed);
  const ontime = done.length ? done.filter(o => o.history.placed <= o.readyAt + 60e3).length / done.length * 100 : 100;
  const gymN = paid.filter(o => o.mode === 'gym').length;
  const d0 = startOfDay(new Date()), revDays = [], labels = [], byDish = {}, byGoal = {};
  for (let k = HISTORY_DAYS; k >= 1; k--) {
    const d = addDays(d0, -k); let r = 0;
    S.catalog.dishes.forEach(x => { const n = histSales(x, d); r += n * effPrice(x); byDish[x.id] = (byDish[x.id] || 0) + n; x.goals.forEach(g => { byGoal[g] = (byGoal[g] || 0) + n; }); });
    revDays.push(r); labels.push(d.getDate() + ' ' + MON[d.getMonth()]);
  }
  const top = Object.entries(byDish).sort((a, b) => b[1] - a[1]).slice(0, 10), topMax = top[0] ? top[0][1] : 1;
  const goals = GOALS.map(g => [g, byGoal[g.id] || 0]).sort((a, b) => b[1] - a[1]), gMax = goals[0][1] || 1;
  const total28 = revDays.reduce((s, v) => s + v, 0);
  return `<div class="ah"><h2>Сводка</h2><span class="muted">сегодня, ${fmtDate(now)}</span></div>
    <div class="kpis">
      <div class="kpi"><div class="l">Выручка сайта сегодня</div><div class="v">${fmtRub(rev)}</div><div class="s">оплачено онлайн</div></div>
      <div class="kpi"><div class="l">Заказов</div><div class="v">${paid.length}</div><div class="s">наверх ${gymN} · в кафе ${paid.length - gymN} · отменено ${today.length - paid.length}</div></div>
      <div class="kpi"><div class="l">Средний чек</div><div class="v">${fmtRub(paid.length ? rev / paid.length : 0)}</div><div class="s">&nbsp;</div></div>
      <div class="kpi ${ontime < 90 ? 'warn' : ''}"><div class="l">Готово к сроку</div><div class="v">${fmtNum(ontime)}%</div><div class="s">заказ в ячейке, на стойке или полке не позже времени клиента</div></div>
      <div class="kpi"><div class="l">Выручка за 28 дней</div><div class="v">${fmtRub(total28)}</div><div class="s">≈ ${fmtRub(total28 / 28)} в день</div></div>
    </div>
    <div class="panel"><h3>Выручка по дням за 4 недели, ₽</h3>${colChart(revDays, labels, { fmt: v => fmtRub(v) })}</div>
    <div class="grid2">
      <div class="panel"><h3>Спрос по целям питания (порций за 28 дней)</h3>${goals.map(([g, v]) => `<div class="bar-h"><span class="lb">${g.icon} ${g.name}</span><span class="tr"><i style="width:${v / gMax * 100}%;background:${g.color}"></i></span><span class="vl">${fmtNum(v)}</span></div>`).join('')}</div>
      <div class="panel"><h3>Топ-10 блюд (порций за 28 дней)</h3>${top.map(([id, v]) => `<div class="bar-h"><span class="lb">${DISH[id].emoji} ${esc(DISH[id].name)}</span><span class="tr"><i style="width:${v / topMax * 100}%"></i></span><span class="vl">${fmtNum(v)}</span></div>`).join('')}</div>
    </div>
    <p class="tiny muted">История продаж в прототипе сгенерирована по модели спроса (будни выше для фитнес-блюд, выходные — для семейных). В боевой версии она берётся из кассы и заказов сайта.</p>`;
}

/* ----- Настройки планировщика ----- */
function settingsView() {
  const s = st();
  const num = (path, val, min, max) => `<input class="input num" type="number" min="${min}" max="${max}" value="${val}" data-setp="${path}" style="width:80px">`;
  return `<div class="ah"><h2>Настройки кухни, выдачи и кассы</h2><span class="muted">планировщик сразу пересчитывает задачи и минимальное время на сайте</span></div>
    <div class="grid2"><div class="panel"><h3>Цеха: сколько блюд готовится одновременно</h3>
      ${STATIONS.map(x => `<div class="row" style="margin:8px 0"><span style="width:160px"><b style="color:${x.color}">${x.name}</b></span>${num('stations.' + x.id, s.stations[x.id], 1, 10)}<span class="small muted">мест</span></div>`).join('')}
      <p class="tiny muted">Блюда распределяются по цехам из карточки блюда (поле «Цех»).</p></div>
    <div class="panel"><h3>Время на упаковку и доставку, мин</h3>
      <div class="row" style="margin:8px 0"><span style="width:220px">Упаковка пакета</span>${num('packMin', s.packMin, 0, 15)}</div>
      <div class="row" style="margin:8px 0"><span style="width:220px">Подъём к шкафу с ячейками</span>${num('deliver.locker', s.deliver.locker, 0, 30)}</div>
      <div class="row" style="margin:8px 0"><span style="width:220px">Подъём на стойку ресепшена</span>${num('deliver.counter', s.deliver.counter, 0, 30)}</div>
      <div class="row" style="margin:8px 0"><span style="width:220px">Выдача в кафе</span>${num('deliver.cafe', s.deliver.cafe, 0, 15)}</div></div></div>
    ${fiscalSettingsPanel()}
    <div class="panel"><h3>Шкаф</h3><p class="small">12 ячеек: A1–A4 размер S (перекусы), B1–B4 размер M (обед), C1–C4 размер L (семейные наборы и рационы). Свободная ячейка подбирается по размеру пакета.</p>${lockerGrid(false)}</div>`;
}

/* ----- Платежи и чеки ----- */
function receiptsView() {
  const now = Date.now(), f = fset();
  const today = Object.values(S.orders).filter(o => sameDay(o.createdAt, now));
  const all = Object.values(S.orders).flatMap(o => (o.receipts || []).map(r => ({ o, r }))).sort((a, b) => b.r.at - a.r.at);
  const rToday = all.filter(x => sameDay(x.r.at, now));
  const inc = rToday.filter(x => x.r.type === 'income' && x.r.pay !== 'offset').reduce((s, x) => s + x.r.sum, 0);
  const ref = rToday.filter(x => x.r.type === 'refund').reduce((s, x) => s + x.r.sum, 0);
  const queue = all.filter(x => !rcInOfd(x.r)).length;
  const noRc = today.filter(o => !(o.receipts || []).some(r => r.type === 'income'));
  const waitClose = Object.values(S.orders).filter(o => needsClosing(o) && o.status !== 'cancelled');
  const delivered = waitClose.filter(o => o.status === 'placed');
  const a = acquiringStats(today);
  const payName = r => r.pay === 'offset' ? 'зачёт предоплаты' : r.pay === 'sbp' ? 'СБП' : 'карта';
  return `<div class="ah"><h2>Платежи и чеки</h2><span class="muted">Форабанк принимает оплату → ${KKT.kkt} формирует чек → ${KKT.ofd} отправляет его в ФНС и клиенту</span></div>
    <div class="kpis">
      <div class="kpi"><div class="l">Оплачено сегодня</div><div class="v">${fmtRub(inc)}</div><div class="s">чеков прихода: ${rToday.filter(x => x.r.type === 'income').length}${ref ? ' · возвратов на ' + fmtRub(ref) : ''}</div></div>
      <div class="kpi ${queue ? 'warn' : ''}"><div class="l">В очереди кассы</div><div class="v">${queue}</div><div class="s">${queue ? 'облачная касса формирует чеки' : 'все чеки приняты Контур.ОФД'}</div></div>
      <div class="kpi ${noRc.length ? 'bad' : ''}"><div class="l">Сверка: заказ ↔ платёж ↔ чек</div><div class="v">${noRc.length ? noRc.length + ' без чека' : '✓'}</div><div class="s">${noRc.length ? 'проверьте заказы: ' + noRc.map(o => '№' + o.no).join(', ') : 'все оплаченные заказы сегодня с чеком прихода'}</div></div>
      <div class="kpi ${delivered.length ? 'warn' : ''}"><div class="l">Ждут второго чека</div><div class="v">${waitClose.length}</div><div class="s">уйдёт по «Заказ забрал»; доставлено, но не нажато: ${delivered.length}${f.scheme === 'one' && waitClose.length ? ' · оформлены до перехода на один чек' : ''}</div></div>
    </div>
    <div class="grid2">
      <div class="panel"><h3>Как сейчас выбиваются чеки</h3>
        <div class="small"><b>${f.scheme === 'one' ? 'Один чек «Полный расчёт» сразу при оплате' : 'Два чека: «Предоплата 100%» при оплате и «Полный расчёт» при получении'}</b></div>
        <div class="small muted" style="margin-top:4px">${SNO[f.sno]} · ${VAT[f.vat][0]} · предмет расчёта «${SUBJ[f.subject]}» · бутылки — с GTIN и реквизитом 1265</div>
        ${f.scheme === 'two' || delivered.length ? `<button class="btn sm" style="margin-top:12px" data-act="rc-close-day" ${delivered.length ? '' : 'disabled'}>Закрыть день: «Полный расчёт» по ${delivered.length} доставленным</button>
        <div class="tiny muted" style="margin-top:6px">Для заказов, которые лежат в ячейке или на стойке, но клиент не нажал «Заказ забрал».</div>` : ''}
        <div class="tiny muted" style="margin-top:10px">Схему, НДС и комиссии меняют во вкладке «Настройки».</div></div>
      <div class="panel"><h3>Эквайринг сегодня — оценка комиссии</h3>
        <div class="bar-h"><span class="lb">⚡ СБП · ${a.sbpN} опл.</span><span class="tr"><i style="width:${a.share}%;background:var(--green)"></i></span><span class="vl">${fmtRub(a.sbp)}</span></div>
        <div class="bar-h"><span class="lb">💳 Карты · ${a.cardN} опл.</span><span class="tr"><i style="width:${100 - a.share}%;background:var(--orange)"></i></span><span class="vl">${fmtRub(a.card)}</span></div>
        <div class="sum-row" style="margin-top:8px"><span class="muted">Комиссия: карты ${String(f.cardFee).replace(".", ",")}%${f.feeVat ? " + НДС " + f.feeVat + "%" : " без НДС"} · СБП ${String(f.sbpFee).replace(".", ",")}%</span><b>≈ ${fmtRub(a.fee)}</b></div>
        <div class="sum-row"><span class="muted">Сэкономили бы, если бы все платили по СБП</span><b>≈ ${fmtRub(a.save)}</b></div>
        <div class="tiny muted">Доля СБП ${fmtNum(a.share)}%. ${f.sbpDefault ? 'СБП стоит первым и выбран по умолчанию на сайте.' : 'Включите «СБП по умолчанию» в настройках, чтобы поднять долю.'}</div></div>
    </div>
    <div class="panel"><h3>Журнал чеков</h3><div class="tw" style="max-height:440px"><table class="t"><thead><tr><th>Время</th><th>Заказ</th><th>Чек</th><th>Признак</th><th class="r">Сумма</th><th>Оплата</th><th>Куда отправлен</th><th>Статус</th><th></th></tr></thead><tbody>
      ${all.slice(0, 60).map(({ o, r }) => `<tr><td>${sameDay(r.at, now) ? '' : fmtDate(r.at) + ' '}${fmtTime(r.at)}</td><td>№${o.no}<div class="tiny muted">${esc(o.name)}</div></td><td>ФД ${r.fd}</td>
        <td><span class="st ${r.type === 'refund' ? 'red' : r.mode === 'prepay' ? 'blue' : 'green'}">${RC_TYPE[r.type]}</span><div class="tiny muted">${RC_MODE[r.mode]}</div></td>
        <td class="r">${r.type === 'refund' ? '−' : ''}${fmtRub(r.sum)}</td><td>${payName(r)}</td><td class="small">${r.ch === 'email' ? '✉️ ' + esc(maskContact(r.contact)) : r.ch === 'sms' ? '💬 ' + esc(maskContact(r.contact)) : '📄 PDF на странице заказа'}</td>
        <td>${rcInOfd(r) ? '<span class="st green">Контур.ОФД</span>' : '<span class="st orange">в кассе</span>'}</td><td><button class="btn sm" data-act="rc-open" data-id="${o.id}" data-r="${r.id}">Чек</button></td></tr>`).join('') || '<tr><td colspan="9" class="muted">Чеков пока нет</td></tr>'}
      </tbody></table></div></div>
    <p class="tiny muted">В прототипе касса и ОФД имитируются: реквизиты условные, чеки не фискальные. В боевой версии сервер отправляет данные чека в API облачной кассы, а статус и фискальный признак получает в ответ; сверка с Контур.ОФД — раз в сутки.</p>`;
}

function fiscalSettingsPanel() {
  const f = fset();
  const sel = (key, opts) => `<select class="input" data-fset="${key}">${Object.entries(opts).map(([k, v]) => `<option value="${k}" ${f[key] === k ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
  const fee = (key, val) => `<input class="input num" type="number" step="0.1" min="0" max="30" value="${val}" data-fset="${key}" style="width:80px">`;
  const warn = f.sno === 'osn' && f.scheme === 'one';
  return `<div class="panel"><h3>Касса и чеки</h3>
    <div class="grid2"><div>
      <div class="field"><label>Система налогообложения (в чеке)</label>${sel('sno', SNO)}</div>
      <div class="field"><label>Схема чеков</label>${sel('scheme', { two: 'Два чека: предоплата при оплате + полный расчёт при получении', one: 'Один чек «Полный расчёт» при оплате' })}
        <div class="tiny muted" style="margin-top:4px">Один чек допустим при кассовом методе (УСН) и согласии покупателя в оферте — письмо ФНС № АБ-3-20/7479@. Решает бухгалтер.</div>
        ${warn ? '<div class="note red" style="margin-top:6px">На ОСН нужен вариант с двумя чеками.</div>' : ''}</div>
      <div class="row" style="gap:12px"><div class="field" style="flex:1"><label>Ставка НДС в чеке</label>${sel('vat', Object.fromEntries(Object.entries(VAT).map(([k, v]) => [k, v[0]])))}</div>
        <div class="field" style="flex:1"><label>Предмет расчёта для блюд</label>${sel('subject', SUBJ)}</div></div>
    </div><div>
      <div class="field"><label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" data-fset="sbpDefault" ${f.sbpDefault ? 'checked' : ''}> СБП первым и по умолчанию на сайте</label></div>
      <div class="field"><label>Комиссия эквайринга, % — для оценки в «Платежи и чеки»</label>
        <div class="row" style="margin:6px 0"><span style="width:150px">Карты</span>${fee('cardFee', f.cardFee)}<span class="small muted">+ НДС на комиссию</span>${fee('feeVat', f.feeVat)}<span class="small muted">%</span></div>
        <div class="row" style="margin:6px 0"><span style="width:150px">СБП</span>${fee('sbpFee', f.sbpFee)}</div></div>
      <div class="small muted">Эквайринг: ${KKT.acq} · касса: ${KKT.kkt} · ОФД: ${KKT.ofd}. Настройки действуют для новых заказов.</div>
    </div></div></div>`;
}
