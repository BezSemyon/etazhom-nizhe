/* ===== Общая шапка рабочих приложений ===== */
function staffHead(title, sub, tabs, active, act) {
  return `<header class="admin-head"><div class="in">
    <div class="logo"><span class="mark">${ICON.logo}</span><div><div class="t1">${title}</div><div class="t2">${sub}</div></div></div>
    ${tabs ? `<nav class="atabs">${tabs.map(([id, n, c]) => `<button class="atab ${active === id ? 'on' : ''}" data-act="${act}" data-v="${id}">${n}${c ? `<span class="n">${c}</span>` : ''}</button>`).join('')}</nav>` : ''}
    <span class="spacer"></span><span class="clock">${fmtTime(Date.now())}</span></div></header>`;
}
const whereLabel = o => o.mode === 'cafe' ? 'кафе' : o.bag.need ? (o.cup.need ? 'ячейка + стойка' : 'ячейка') : 'стойка ресепшена';
const mm = ms => Math.round(ms / MIN);

/* ===== Касса РестАрт (имитация) =====
   В жизни кассир работает в РестАрт: заказ с сайта приходит туда сам (тип «Сайт», оплата «Оплачено на сайте» —
   нефискальная, чек уже пробила облачная касса сайта). Кассир печатает бегунок и несёт на кухню. */
const raOrders = () => Object.values(S.orders).filter(o => o.ra && sameDay(o.ra.at || o.createdAt, Date.now())).sort((a, b) => (a.cookStart || a.readyAt) - (b.cookStart || b.readyAt));
function cashierHead() {
  const n = raOrders().filter(o => o.status === 'paid' && !o.ra.printed).length;
  return staffHead('Касса · РестАрт', 'имитация: заказы с сайта приходят в кассу кафе', [['new', 'Новые', n], ['all', 'Все за день', 0]], UI.caTab, 'ca-tab');
}
function runnerText(o) {
  const where = o.mode === 'cafe' ? 'КАФЕ — полка выдачи' : (o.bag.need ? 'НАВЕРХ — ячейка шкафа' + (o.cup.need ? ' + напиток на стойку' : '') : 'НАВЕРХ — напиток на стойку');
  const line = '-'.repeat(32);
  return [`САЙТ №${o.no}        ${fmtTime(o.ra.at)}`, line, `К ${fmtTime(o.readyAt)}   начать не позже ${fmtTime(o.cookStart || o.readyAt)}`, where, line,
    ...o.items.map(i => `${String(i.q).padStart(2)} × ${i.n}${i.drink ? ' (бар)' : ''}`), line,
    ...(o.comment ? ['! ' + o.comment, line] : []), `Гость: ${o.name || '—'}`, `ОПЛАЧЕНО НА САЙТЕ: ${fmtRub(paidOf(o))}`, 'Номер на пакете и стакане: №' + o.no].join('\n');
}
function cashierCard(o) {
  const cancelled = o.status === 'cancelled', printed = !!o.ra.printed, late = !printed && (o.cookStart || o.readyAt) < Date.now() + 5 * MIN;
  return `<div class="wcard ${cancelled ? 'late' : ''}"><div class="top"><span class="cd">№${o.no}</span><span class="who">${esc(o.name)}</span><span class="spacer"></span>
      ${cancelled ? '<span class="st red">ОТМЕНЁН</span>' : `<span class="st ${late ? 'red' : 'blue'}">к ${fmtTime(o.readyAt)} · начать ${fmtTime(o.cookStart || o.readyAt)}</span>`}</div>
    <div class="tiny muted" style="margin:4px 0">${whereLabel(o)} · ${o.items.map(i => i.q + '× ' + esc(i.n) + ' <span class="code-token">[' + ((DISH[i.d] && DISH[i.d].rc) || '—') + ']</span>').join(', ')} · оплачено на сайте ${fmtRub(paidOf(o))}</div>
    ${o.comment ? `<div class="tiny">💬 ${esc(o.comment)}</div>` : ''}
    ${cancelled ? `<div class="note red" style="margin-top:6px">Клиент отменил заказ${printed ? ' — бегунок уже на кухне: скажите поварам, чтобы не готовили' : ''}.</div>`
      : printed ? `<div class="row" style="margin-top:6px"><span class="tiny muted">🧾 Бегунок отдан на кухню в ${fmtTime(o.ra.printed)}</span><span class="spacer"></span><button class="btn sm ghost" data-act="ca-runner" data-id="${o.id}">Бегунок</button></div>`
      : `<button class="btn primary" style="width:100%;justify-content:center;margin-top:8px" data-act="ca-runner" data-id="${o.id}">🧾 Напечатать бегунок для кухни</button>`}</div>`;
}
function cashierMain() {
  const all = raOrders(), list = UI.caTab === 'new' ? all.filter(o => (o.status === 'paid' && !o.ra.printed) || (o.status === 'cancelled' && o.ra.printed && o.history.cancelled > Date.now() - 60 * MIN)) : all;
  return `<div class="wwrap">${S.mode !== 'db' && S.dbNote ? `<div class="banner">⚠️ ${esc(S.dbNote)}</div>` : ''}
    <div class="note" style="margin-bottom:12px">Это имитация экрана РестАрт. В жизни оплаченный заказ с сайта сам появляется в кассе с типом «Сайт» и оплатой «Оплачено на сайте» — без второго фискального чека. Кассир печатает бегунок и несёт на кухню.</div>
    <div class="wsec"><h3>${UI.caTab === 'new' ? 'Напечатать и отнести на кухню' : 'Заказы с сайта за день'} · ${list.length}</h3>${list.map(cashierCard).join('') || '<div class="muted small">Новых заказов нет. Оформите заказ на сайте клиента — он появится здесь сразу после оплаты.</div>'}</div></div>`;
}
function runnerModal(o) {
  return `<div class="overlay" data-act="close-modal"><div class="modal" style="width:min(420px,100%)">
    <div class="mh"><h3>Бегунок №${o.no}</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb"><pre class="runner">${esc(runnerText(o))}</pre><div class="tiny muted">В РестАрт бегунок печатается на кухонном принтере (место печати — по цеху блюда).</div></div>
    <div class="mf"><span class="spacer"></span><button class="btn" data-act="close-modal">Закрыть</button>${o.ra.printed ? '' : `<button class="btn primary" data-act="ca-print" data-id="${o.id}">Напечатан, отнёс на кухню</button>`}</div>
  </div></div>`;
}

/* ===== Официант ===== */
function waiterHead() {
  const up = Object.values(S.orders).filter(o => o.mode === 'gym' && (o.status === 'paid' || o.status === 'delivering')).length;
  const cafe = Object.values(S.orders).filter(o => o.mode === 'cafe' && (o.status === 'paid' || o.status === 'placed')).length;
  return staffHead('Официант', 'забрать с кухни, отнести наверх, выдать в кафе', [['up', 'Наверх', up], ['cafe', 'Кафе', cafe], ['cells', 'Шкаф', 0]], UI.wTab, 'w-tab');
}
function partRow(icon, title, sub, btn) { return `<div class="wpart"><span class="wi">${icon}</span><div style="flex:1"><b>${title}</b><div class="tiny muted">${sub}</div></div>${btn || ''}</div>`; }
function waiterCard(o) {
  const now = Date.now(), toT = mm(o.readyAt - now);
  let parts = '';
  if (o.status === 'paid') {
    parts += raLine(o);
    if (o.cup.need) parts += partRow('🥤', `Подпишите стакан: №${o.no}`, o.items.filter(i => i.drink).map(i => i.q + '× ' + i.n).join(', ') + ' → стойка ресепшена');
    if (o.bag.need) parts += partRow('📦', `Пакет №${o.no}`, o.items.filter(i => !i.drink).map(i => i.q + '× ' + i.n).join(', ') + ' → ячейка шкафа');
  } else {
    const c = o.bag.cell && S.lockers.cells.find(x => x.id === o.bag.cell);
    if (o.bag.need) {
      if (o.bag.depositedAt) parts += partRow('✅', `Заказ доставлен в ячейку ${o.bag.cell}`, `${fmtTime(o.bag.depositedAt)} · у клиента появился QR-код ячейки`);
      else if (c && c.state === 'open') parts += `<div class="wpart wcol"><div class="row"><span class="wi">🔓</span><div style="flex:1"><b>Ячейка ${c.id} открыта</b><div class="tiny muted">Положите пакет №${o.no}, закройте дверцу и отметьте доставку</div></div></div><button class="btn primary wbtn" data-act="w-bag-done" data-id="${o.id}">📦 Заказ доставлен в ячейку</button></div>`;
      else if (c && c.state === 'reserved') parts += `<div class="wpart cellqr"><div>${qrSVG(c.depTok, 'qr')}</div><div style="flex:1"><div class="tiny muted">Ячейка для пакета №${o.no}</div><div class="cellid">${c.id}</div><div class="tiny muted">Поднесите этот QR к табло шкафа — ячейка откроется. Код одноразовый, действует до ${fmtTime(c.depExp)}.</div><button class="btn sm lime" style="margin-top:8px" data-act="w-scan" data-id="${c.id}">Поднести к табло (демо)</button></div></div><button class="btn wbtn" disabled title="Сначала откройте ячейку QR-кодом">📦 Заказ доставлен в ячейку</button>`;
      else parts += partRow('⚠️', 'Бронь ячейки истекла', '', `<button class="btn sm" data-act="w-cell" data-id="${o.id}">Получить ячейку</button>`);
    }
    if (o.cup.need) parts += o.cup.placedAt ? partRow('✅', 'Заказ доставлен на стойку', `${fmtTime(o.cup.placedAt)} · клиент видит, что стакан №${o.no} ждёт на стойке`)
      : `<div class="wpart wcol"><div class="row"><span class="wi">🥤</span><div style="flex:1"><b>Стакан №${o.no} → стойка ресепшена</b><div class="tiny muted">${o.items.filter(i => i.drink).map(i => i.q + '× ' + i.n).join(', ')} · поставьте на стойку номером к залу</div></div></div><button class="btn primary wbtn" data-act="w-cup" data-id="${o.id}">🥤 Заказ доставлен на стойку</button></div>`;
  }
  return `<div class="wcard ${toT < 0 && o.status !== 'placed' ? 'late' : ''}"><div class="top"><span class="cd">№${o.no}</span><span class="who">${esc(o.name)}</span><span class="spacer"></span><span class="st ${toT < 0 ? 'red' : 'blue'}">к ${fmtTime(o.readyAt)}${toT >= 0 ? ' · ' + toT + ' мин' : ''}</span></div>${parts}
    ${o.status === 'paid' ? `<button class="btn primary" style="width:100%;justify-content:center;margin-top:8px" data-act="w-take" data-id="${o.id}">Забрал с кухни${o.bag.need ? ' — получить ячейку' : ''}</button>` : ''}</div>`;
}
/* дошёл ли заказ до кассы и напечатан ли бегунок */
function raLine(o) {
  if (!o.ra) return '';
  return `<div class="tiny muted" style="margin:4px 0">${o.ra.printed ? `✓ В РестАрт · бегунок на кухне с ${fmtTime(o.ra.printed)}` : '⏳ В РестАрт · кассир ещё не напечатал бегунок'} · начать не позже ${fmtTime(o.cookStart || o.readyAt)}</div>`;
}
function waiterMain() {
  const now = Date.now(), all = ordersList();
  let h = '';
  if (UI.wTab === 'up') {
    const kitchen = all.filter(o => o.mode === 'gym' && o.status === 'paid'), trip = all.filter(o => o.mode === 'gym' && o.status === 'delivering');
    const ready = kitchen.filter(o => o.readyAt - now < 15 * MIN), soon = kitchen.filter(o => o.readyAt - now >= 15 * MIN);
    const gone = all.filter(o => o.status === 'cancelled' && o.ra && o.ra.printed && o.history.cancelled > now - 60 * MIN);
    h += gone.map(o => `<div class="note red" style="margin-bottom:10px">⚠️ <b>№${o.no}</b> (${esc(o.name)}) отменён клиентом — отмена ушла в РестАрт. Предупредите кухню, чтобы не готовили.</div>`).join('');
    const doneToday = all.filter(o => o.mode === 'gym' && ['placed', 'done'].includes(o.status) && sameDay(o.readyAt, now)).reverse().slice(0, 6);
    h += `<div class="wsec"><div class="row"><h3>В рейсе · ${trip.length}</h3></div>${trip.map(waiterCard).join('') || '<div class="muted small">Сейчас ничего не несёте.</div>'}</div>`;
    h += `<div class="wsec"><h3>Пора забирать с кухни · ${ready.length}</h3><div class="tiny muted" style="margin-bottom:8px">Кухня готовит по бегунку из РестАрт к этому времени. Забрали пакет — нажмите «Забрал с кухни».</div>${ready.map(waiterCard).join('') || '<div class="muted small">Пока нечего нести.</div>'}</div>`;
    h += `<div class="wsec"><h3>Готовятся позже</h3>${soon.map(o => `<div class="ci"><div class="e" style="font-size:14px;font-weight:800">№${o.no}</div><div class="n">${esc(o.name)}<div class="tiny muted">${whereLabel(o)} · к ${fmtTime(o.readyAt)}</div></div><button class="btn sm" data-act="w-take" data-id="${o.id}" title="Кухня отдала раньше времени">Забрал</button></div>`).join('') || '<div class="muted small">Пусто</div>'}</div>`;
    h += `<div class="wsec"><h3>Доставлено сегодня</h3>${doneToday.map(o => `<div class="ci"><div class="e" style="font-size:14px;font-weight:800">№${o.no}</div><div class="n">${esc(o.name)}<div class="tiny muted">${[o.bag.need ? 'ячейка ' + o.bag.cell + (o.bag.pickedAt ? ' — забран' : ' — ждёт') : '', o.cup.need ? 'стойка' + (o.cup.pickedAt ? ' — забран' : ' — ждёт') : ''].filter(Boolean).join(' · ')}</div></div></div>`).join('') || '<div class="muted small">Пока нет</div>'}</div>`;
  } else if (UI.wTab === 'cafe') {
    const ready = all.filter(o => o.mode === 'cafe' && o.status === 'paid'), shelf = all.filter(o => o.mode === 'cafe' && o.status === 'placed');
    const q = UI.cafeNo.trim();
    h += `<div class="wsec"><h3>На кухне — поставить на полку выдачи · ${ready.length}</h3>${ready.map(o => `<div class="wcard"><div class="top"><span class="cd">№${o.no}</span><span class="who">${esc(o.name)}</span><span class="spacer"></span><span class="st blue">к ${fmtTime(o.readyAt)}</span></div>${raLine(o)}<div class="tiny muted">${o.items.map(i => i.q + '× ' + i.n).join(', ')}</div><button class="btn primary" style="width:100%;justify-content:center;margin-top:8px" data-act="w-shelf" data-id="${o.id}">Поставил на полку, номер подписан</button></div>`).join('') || '<div class="muted small">Пусто</div>'}</div>`;
    h += `<div class="wsec"><h3>На полке · ${shelf.length}</h3><input class="input" style="width:100%;margin-bottom:10px" data-ui="cafeNo" data-fk="cafeNo" placeholder="Номер, который назвал клиент" inputmode="numeric" value="${esc(q)}">
      ${shelf.map(o => `<div class="wcard ${q && o.no === q ? 'hl' : ''}"><div class="top"><span class="cd">№${o.no}</span><span class="who">${esc(o.name)}</span><span class="spacer"></span><span class="tiny muted">на полке ${mm(now - (o.shelfAt || now))} мин</span></div><button class="btn ${q && o.no === q ? 'primary' : ''}" style="width:100%;justify-content:center;margin-top:8px" data-act="w-hand" data-id="${o.id}">${q && o.no === q ? 'Номер совпал — выдать' : 'Выдать'}</button></div>`).join('') || '<div class="muted small">Пусто</div>'}</div>`;
  } else h += `<div class="wsec"><h3>Ячейки шкафа</h3>${lockerGrid(false)}<div class="tiny muted" style="margin-top:10px">Ячейка освобождается, когда клиент нажимает «Заказ забрал». «Освободить» — на случай, если клиент забрал пакет и ушёл, не нажав кнопку.</div></div>`;
  return `<div class="wwrap">${h}</div>`;
}

/* ===== Шкаф с ячейками ===== */
function lockerGrid(big) {
  const now = Date.now();
  return `<div class="cells ${big ? 'big' : ''}">${S.lockers.cells.map(c => {
    const exp = c.state === 'reserved' && c.depExp < now;
    const lbl = c.state === 'free' || exp ? 'свободна' : c.state === 'reserved' ? `бронь №${c.no}` : c.state === 'occupied' ? `№${c.no} · ${mm(now - (c.since || now))} мин` : 'ОТКРЫТА';
    return `<div class="cell s-${exp ? 'free' : c.state}"><div class="row"><b>${c.id}</b></div><div class="cl">${lbl}</div>${c.state === 'open' && big ? '<div class="tiny muted">' + (c.openFor === 'deposit' ? 'официант кладёт пакет №' + c.no + ' — ждём отметки «Заказ доставлен в ячейку»' : 'клиент забирает №' + c.no + ' — ячейка освободится, когда он нажмёт «Заказ забрал»') + '</div>' : ''}${!big && (c.state === 'occupied' || (c.state === 'open' && c.openFor === 'pickup')) ? `<button class="btn sm rel" data-act="w-release" data-id="${c.id}" title="Если клиент забрал пакет, но не нажал «Заказ забрал»">Освободить</button>` : ''}</div>`;
  }).join('')}</div>`;
}
function lockerMain() {
  const now = Date.now();
  const depToks = S.lockers.cells.filter(c => c.state === 'reserved' && c.depTok && c.depExp > now);
  const pickToks = Object.values(S.orders).filter(o => o.bag.need && o.bag.depositedAt && !o.bag.pickedAt && o.mode === 'gym');
  const m = UI.lockMsg;
  return `<div class="awrap"><div class="ah"><h2>Шкаф с ячейками</h2><span class="muted">табло со сканером QR и 16 одинаковых ячеек. Камера в прототипе недоступна — «подносите» телефоны кнопками ниже</span></div>
    <div class="locker">
      <div class="screen"><div class="scr ${m ? (m.ok ? 'ok' : 'bad') : ''}">${m ? `<div class="big">${m.ok ? '🔓' : '⛔'}</div><div>${esc(m.msg)}</div>` : '<div class="big">⌁</div><div>Поднесите QR-код к сканеру</div><div class="tiny" style="opacity:.7;margin-top:6px">Этажом ниже · выдача заказов</div>'}</div>
        <div class="sim"><div class="tiny muted" style="margin-bottom:6px">Имитация: какой телефон поднесли</div>
          ${depToks.map(c => `<button class="btn sm" data-act="lk-scan" data-v="${c.depTok}">📱 Официант · №${c.no} → ${c.id}</button>`).join('')}
          ${pickToks.map(o => `<button class="btn sm" data-act="lk-scan" data-v="${o.pickTok}">📱 Клиент · №${o.no}</button>`).join('')}
          ${!depToks.length && !pickToks.length ? '<div class="tiny muted">Нет активных кодов. Возьмите заказ в рейс в приложении официанта.</div>' : ''}
          <div class="row" style="margin-top:8px"><input class="input" style="flex:1" data-ui="lockIn" data-fk="lockIn" placeholder="или введите код" value="${esc(UI.lockIn)}"><button class="btn sm" data-act="lk-scan-in">Сканировать</button></div></div></div>
      <div>${lockerGrid(true)}
        <div class="panel" style="margin-top:14px"><h3>Журнал шкафа</h3>${(S.lockers.log || []).slice(0, 10).map(l => `<div class="small"><span class="muted">${fmtTime(l.at)}</span> ${esc(l.text)}</div>`).join('') || '<div class="muted small">Пока пусто</div>'}</div></div>
    </div></div>`;
}

/* ===== QR-постер для зала ===== */
function posterMain() {
  return `<div class="poster-wrap"><div class="poster">
    <div class="row"><span class="mark" style="width:48px;height:48px;border-radius:14px;background:var(--brand);display:grid;place-items:center">${ICON.logo}</span><div><div class="b" style="font-size:22px">Этажом ниже</div><div class="muted">кафе этажом ниже</div></div></div>
    <h1>Голодны после тренировки?</h1>
    <p>Наведите камеру телефона на код, закажите и идите заниматься. К вашему выходу еда будет в ячейке шкафа у ресепшена, а напиток — на стойке.</p>
    ${qrSVG(SITE_URL + '#menu', 'qr poster-qr')}
    <div class="steps dark"><div class="s"><b>1</b>Сканируйте</div><div class="s"><b>2</b>Выберите время</div><div class="s"><b>3</b>Откройте ячейку своим QR</div></div>
    <p class="tiny muted">Код ведёт на: ${esc(SITE_URL)}</p>
  </div></div>`;
}
