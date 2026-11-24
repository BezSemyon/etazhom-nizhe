/* ===== Приложение управляющего ===== */
const ADMIN_TABS = [['admin-menu', 'Меню и акции'], ['restart', 'РестАрт'], ['receipts', 'Платежи и чеки'], ['loyalty', 'Клиенты и бонусы'], ['dashboard', 'Сводка'], ['settings', 'Настройки']];
function adminHead() {
  const noCode = S.catalog.dishes.filter(d => !d.rc).length;
  const rcQueue = Object.values(S.orders).reduce((s, o) => s + (o.receipts || []).filter(r => !rcInOfd(r)).length, 0);
  return staffHead('Управляющий', 'меню, РестАрт, чеки, клиенты', ADMIN_TABS.map(([id, n]) => [id, n, id === 'restart' ? noCode : id === 'receipts' ? rcQueue : 0]), UI.view, 'nav');
}
function adminMain() {
  const v = { 'admin-menu': menuAdminView, restart: restartView, receipts: receiptsView, loyalty: loyaltyView, dashboard: dashboardView, settings: settingsView }[UI.view] || menuAdminView;
  const note = S.dbNote ? `<div class="banner">⚠️ ${esc(S.dbNote)}</div>` : '';
  return `<div class="awrap">${note}${v()}</div>`;
}
const stBadge = st => `<span class="st ${STATUS[st].color}">${STATUS[st].short}</span>`;
const mins = ms => Math.round(ms / 60e3);
const inMin = m => m >= 0 ? `через ${m} мин` : `${-m} мин назад`;

/* ----- Меню и акции ----- */
function menuAdminView() {
  const q = UI.mq.trim().toLowerCase();
  const list = S.catalog.dishes.filter(d => (UI.mGoal === 'all' || d.goals.includes(UI.mGoal)) && (UI.mType === 'all' || d.type === UI.mType) && (!q || d.name.toLowerCase().includes(q)));
  const stopped = S.catalog.dishes.filter(d => d.stop), noCode = S.catalog.dishes.filter(d => !d.rc);
  return `<div class="ah"><h2>Меню и акции</h2><span class="muted">${S.catalog.dishes.length} блюд · хиты: ${S.catalog.dishes.filter(d => d.hit).length} · со скидкой: ${S.catalog.dishes.filter(d => d.discount).length} · в стопе: ${stopped.length}</span><span class="spacer"></span><button class="btn primary" data-act="m-new">+ Новое блюдо</button></div>
    ${noCode.length ? `<div class="note red" style="margin-bottom:12px">У ${noCode.length} ${plural(noCode.length, 'блюда', 'блюд', 'блюд')} нет кода РестАрт — заказ с ними не дойдёт до кассы: ${noCode.slice(0, 5).map(d => esc(d.name)).join(', ')}${noCode.length > 5 ? '…' : ''}</div>` : ''}
    <div class="panel">
      <div class="toolbar" style="margin-top:0"><div class="search">${ICON.search}<input class="input" data-ui="mq" data-fk="mq" placeholder="Найти блюдо" value="${esc(UI.mq)}"></div>
        <select class="input" data-ui-sel="mGoal"><option value="all">Все цели</option>${GOALS.map(g => `<option value="${g.id}" ${UI.mGoal === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}</select>
        <select class="input" data-ui-sel="mType"><option value="all">Все типы</option>${TYPES.map(t => `<option value="${t.id}" ${UI.mType === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
      <div class="tw"><table class="t"><thead><tr><th>Блюдо</th><th>Цели</th><th>Код РестАрт</th><th class="r">Цена, ₽</th><th class="r">Скидка, %</th><th class="r">На сайте</th><th>Хит дня</th><th>Стоп</th></tr></thead><tbody>
      ${list.map(d => `<tr>
        <td><a href="#admin-menu" data-act="m-edit" data-id="${d.id}" style="text-decoration:none;color:inherit"><b>${d.emoji} ${esc(d.name)}</b></a><div class="tiny muted">${TYPE[d.type].name} · ${d.kcal} ккал · ${d.cook} мин</div></td>
        <td><div class="goal-dots">${d.goals.map(g => `<span class="gdot" style="--gc:${GOAL[g].color}">${GOAL[g].name}</span>`).join('')}</div></td>
        <td><input class="input" value="${esc(d.rc || '')}" data-rc="1" data-id="${d.id}" data-fk="rc-${d.id}" placeholder="нет кода" style="width:96px${d.rc ? '' : ';border-color:var(--red)'}"></td>
        <td class="r"><input class="input num" type="number" min="0" step="10" value="${d.price}" data-dish="price" data-id="${d.id}" data-fk="pr-${d.id}"></td>
        <td class="r"><input class="input num" type="number" min="0" max="90" step="5" value="${d.discount || 0}" data-dish="discount" data-id="${d.id}" data-fk="dc-${d.id}" style="width:64px"></td>
        <td class="r b num">${fmtRub(effPrice(d))}</td>
        <td><button class="tog hitc ${d.hit ? 'on' : ''}" data-act="m-hit" data-id="${d.id}" aria-label="Хит дня"></button></td>
        <td><button class="tog stopc ${d.stop ? 'on' : ''}" data-act="m-stop" data-id="${d.id}" aria-label="Стоп"></button></td></tr>`).join('')}
      </tbody></table></div>
      <p class="tiny muted">Стоп-лист ставится здесь: блюдо пропадает с сайта. Остатки продуктов, техкарты и закупки ведутся в РестАрт и 1С. Код РестАрт — код этой позиции в номенклатуре кассы: по нему заказ с сайта попадает в РестАрт.</p>
    </div>`;
}
function editDishModal() {
  const d = UI.editDish, isNew = !DISH[d.id];
  const f = (k, label, type = 'text', extra = '') => `<div class="field"><label>${label}</label><input class="input" type="${type}" data-ed="${k}" data-fk="ed-${k}" value="${esc(d[k] ?? '')}" ${extra}></div>`;
  return `<div class="overlay" data-act="close-modal"><div class="modal wide">
    <div class="mh"><h3>${isNew ? 'Новое блюдо' : 'Редактировать: ' + esc(d.name)}</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb">
      <div class="formgrid">${f('name', 'Название', 'text')}${f('emoji', 'Иконка (эмодзи)')}<div class="field"><label>Тип</label><select class="input" data-ed="type">${TYPES.map(t => `<option value="${t.id}" ${d.type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div><div class="field"><label>Цех (для расчёта загрузки)</label><select class="input" data-ed="station">${STATIONS.map(t => `<option value="${t.id}" ${d.station === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>${f('weight', 'Выход')}${f('rc', 'Код в РестАрт')}</div>
      <div class="field"><label>Описание</label><input class="input" data-ed="desc" data-fk="ed-desc" value="${esc(d.desc)}"></div>
      <div class="field"><label>Цели питания</label><div class="chips">${GOALS.map(g => `<button class="chip ${d.goals.includes(g.id) ? 'on' : ''}" data-act="ed-goal" data-v="${g.id}">${g.icon} ${g.name}</button>`).join('')}</div></div>
      <div class="formgrid">${f('price', 'Цена, ₽', 'number')}${f('cook', 'Готовка, мин', 'number')}${f('kcal', 'Ккал', 'number')}${f('p', 'Белки, г', 'number')}${f('f', 'Жиры, г', 'number')}${f('c', 'Углеводы, г', 'number')}${f('serves', 'Персон', 'number')}</div>
      <div class="small muted">Техкарта и себестоимость — в РестАрт и 1С.</div>
    </div>
    <div class="mf">${isNew ? '' : `<button class="btn danger" data-act="ed-delete">${UI.confirmDel ? 'Точно удалить?' : 'Удалить блюдо'}</button>`}<span class="spacer"></span><button class="btn" data-act="close-modal">Отмена</button><button class="btn primary" data-act="ed-save">Сохранить</button></div>
  </div></div>`;
}

/* ----- РестАрт: передача заказов в кассу кафе ----- */
function restartView() {
  const now = Date.now(), today = Object.values(S.orders).filter(o => o.ra && sameDay(o.ra.at || o.createdAt, now)).sort((a, b) => b.createdAt - a.createdAt);
  const noCode = S.catalog.dishes.filter(d => !d.rc), notPrinted = today.filter(o => o.status === 'paid' && !o.ra.printed);
  const raSt = o => o.status === 'cancelled' ? '<span class="st grey">отменён</span>' : '<span class="st green">в РестАрт</span>';
  return `<div class="ah"><h2>РестАрт</h2><span class="muted">оплаченный заказ уходит в кассу кафе, кассир печатает бегунок для кухни</span></div>
    <div class="note" style="margin-bottom:12px">В демо РестАрт имитируется: заказ «доходит» сразу, а экран кассира — во вкладке «Касса РестАрт». В рабочей версии сервер отправляет заказ через службу RestAPI РестАрт и повторяет, если связи нет.</div>
    <div class="kpis">
      <div class="kpi"><div class="l">Передано сегодня</div><div class="v">${today.length}</div><div class="s">тип заказа «Сайт»</div></div>
      <div class="kpi ${notPrinted.length ? 'warn' : ''}"><div class="l">Бегунок не напечатан</div><div class="v">${notPrinted.length}</div><div class="s">кассир ещё не отнёс на кухню</div></div>
      <div class="kpi"><div class="l">Не дошли</div><div class="v">0</div><div class="s">кассир пробивает их вручную</div></div>
      <div class="kpi ${noCode.length ? 'bad' : ''}"><div class="l">Блюд без кода</div><div class="v">${noCode.length}</div><div class="s">заказ с ними не дойдёт</div></div>
    </div>
    <div class="panel"><h3>Сегодня</h3><div class="tw"><table class="t"><thead><tr><th>№</th><th>Оплачен</th><th>К</th><th>Начать не позже</th><th>РестАрт</th><th>Бегунок</th></tr></thead><tbody>
      ${today.map(o => `<tr><td><b>${o.no}</b></td><td>${fmtTime(o.ra.at)}</td><td>${fmtTime(o.readyAt)}</td><td>${fmtTime(o.cookStart || o.readyAt)}</td><td>${raSt(o)} <span class="tiny muted">${o.ra.id}</span></td><td>${o.ra.printed ? fmtTime(o.ra.printed) : '<span class="st orange">ждёт кассира</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Сегодня заказов ещё не было</td></tr>'}
    </tbody></table></div></div>
    <div class="panel"><h3>Как это устроено</h3><div class="small">
      <p>1. Клиент оплатил на сайте → облачная касса сайта пробила чек → заказ ушёл в РестАрт с типом оплаты «Оплачено на сайте» (нефискальный: второго чека нет).</p>
      <p>2. Кассир видит заказ в РестАрт и печатает бегунок: номер, к какому времени, когда начать, куда нести.</p>
      <p>3. Кухня готовит по бегунку. Официант забирает пакет и нажимает «Забрал с кухни» — получает ячейку и код к ней.</p>
      <p>4. Клиент отменил заказ — отмена тоже уходит в РестАрт, кассир и официант видят предупреждение.</p></div></div>`;
}
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
  return `<div class="ah"><h2>Настройки выдачи и кассы</h2><span class="muted">ближайшее время на сайте пересчитывается сразу</span></div>
    <div class="grid2"><div class="panel"><h3>Цеха: сколько блюд готовится одновременно</h3>
      <p class="tiny muted">Кухня работает в РестАрт по бегункам. Эти числа нужны, чтобы сайт не предлагал время, к которому кухня не успеет.</p>
      ${STATIONS.map(x => `<div class="row" style="margin:8px 0"><span style="width:160px"><b style="color:${x.color}">${x.name}</b></span>${num('stations.' + x.id, s.stations[x.id], 1, 10)}<span class="small muted">мест</span></div>`).join('')}
      <p class="tiny muted">Блюда распределяются по цехам из карточки блюда (поле «Цех»).</p></div>
    <div class="panel"><h3>Время на упаковку и доставку, мин</h3>
      <div class="row" style="margin:8px 0"><span style="width:220px">Упаковка пакета</span>${num('packMin', s.packMin, 0, 15)}</div>
      <div class="row" style="margin:8px 0"><span style="width:220px">Подъём к шкафу с ячейками</span>${num('deliver.locker', s.deliver.locker, 0, 30)}</div>
      <div class="row" style="margin:8px 0"><span style="width:220px">Подъём на стойку ресепшена</span>${num('deliver.counter', s.deliver.counter, 0, 30)}</div>
      <div class="row" style="margin:8px 0"><span style="width:220px">Выдача в кафе</span>${num('deliver.cafe', s.deliver.cafe, 0, 15)}</div></div></div>
    ${fiscalSettingsPanel()}
    <div class="panel"><h3>Шкаф</h3><p class="small">16 одинаковых ячеек A1–D4: в каждую помещается пакет с заказом. Официант получает любую свободную ячейку.</p>${lockerGrid(false)}</div>`;
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
