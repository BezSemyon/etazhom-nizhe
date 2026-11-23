/* ===== Общая шапка рабочих приложений ===== */
function staffHead(title, sub, tabs, active, act) {
  return `<header class="admin-head"><div class="in">
    <div class="logo"><span class="mark">${ICON.logo}</span><div><div class="t1">${title}</div><div class="t2">${sub}</div></div></div>
    ${tabs ? `<nav class="atabs">${tabs.map(([id, n, c]) => `<button class="atab ${active === id ? 'on' : ''}" data-act="${act}" data-v="${id}">${n}${c ? `<span class="n">${c}</span>` : ''}</button>`).join('')}</nav>` : ''}
    <span class="spacer"></span><span class="clock">${fmtTime(Date.now())}</span></div></header>`;
}
const whereLabel = o => o.mode === 'cafe' ? 'кафе' : o.bag.need ? (o.cup.need ? 'ячейка + стойка' : 'ячейка') : 'стойка ресепшена';
const mm = ms => Math.round(ms / MIN);

/* ===== Кухня ===== */
function kitchenTabs() {
  const p = plan(), now = Date.now();
  const due = st => Object.values(p).filter(x => !x.started && x.start <= now + MIN && (st === 'all' || x.t.st === st)).length;
  const packN = kitchenPackList().length;
  return [['all', 'Все цеха', due('all')], ...STATIONS.map(s => [s.id, s.name, due(s.id)]), ['pack', 'Упаковка', packN]];
}
function kitchenPackList() { return Object.values(S.orders).filter(o => o.tasks && (o.status === 'cooking' || o.status === 'paid') && o.pack.need && !o.pack.done && o.tasks.filter(t => !o.items[t.i].drink).every(t => t.done)); }
function kitchenHead() { return staffHead('Кухня', 'задачи от планировщика', kitchenTabs(), UI.kSt, 'k-st'); }
function ganttSVG(p) {
  const now = Date.now(), from = now - 10 * MIN, to = now + 60 * MIN, W = 1000, L = 110, R = 10, rowH = 26, top = 24;
  const rows = []; STATIONS.forEach(s => { for (let i = 0; i < (st().stations[s.id] || 1); i++) rows.push({ s, i }); });
  const H = top + rows.length * rowH + 8, X = t => L + (Math.max(from, Math.min(to, t)) - from) / (to - from) * (W - L - R);
  let g = '';
  for (let m = 0; m <= 70; m += 10) { const t = from + m * MIN, x = X(t); g += `<line x1="${x}" x2="${x}" y1="${top - 4}" y2="${H - 6}" stroke="#ece8df"/><text x="${x}" y="14" font-size="11" text-anchor="middle" fill="#7a817c">${fmtTime(t)}</text>`; }
  rows.forEach((r, k) => { const y = top + k * rowH; g += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="${k % 2 ? '#fbfaf7' : '#fff'}"/><text x="8" y="${y + 17}" font-size="12" font-weight="700" fill="${r.s.color}">${r.s.short}${(st().stations[r.s.id] || 1) > 1 ? ' ' + (r.i + 1) : ''}</text>`; });
  Object.values(p).forEach(x => {
    const k = rows.findIndex(r => r.s.id === x.t.st && r.i === x.si); if (k < 0 || x.end < from || x.start > to) return;
    const y = top + k * rowH + 3, x1 = X(x.start), x2 = Math.max(X(x.end), x1 + 3), w = x2 - x1;
    const fill = x.late ? '#e3463a' : x.started ? '#e8743b' : '#1d6b45', it = x.o.items[x.t.i];
    const label = `№${x.o.no} ${it.n}`; const chars = Math.floor((w - 6) / 6.3);
    g += `<g><rect x="${x1}" y="${y}" width="${w}" height="${rowH - 6}" rx="4" fill="${fill}" fill-opacity="${x.started ? 1 : .85}"><title>№${x.o.no} · ${esc(it.n)} ×${it.q} · ${fmtTime(x.start)}–${fmtTime(x.end)}${x.late ? ' · опаздываем' : ''}</title></rect>${chars > 3 ? `<text x="${x1 + 4}" y="${y + 14}" font-size="11" fill="#fff" pointer-events="none">${esc(label.length > chars ? label.slice(0, chars - 1) + '…' : label)}</text>` : ''}</g>`;
  });
  g += `<line x1="${X(now)}" x2="${X(now)}" y1="${top - 6}" y2="${H - 4}" stroke="#17201b" stroke-width="2"/><text x="${X(now) + 4}" y="${H - 8}" font-size="11" font-weight="700" fill="#17201b">сейчас</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Загрузка цехов на час вперёд">${g}</svg>`;
}
function taskCard(x) {
  const now = Date.now(), o = x.o, it = o.items[x.t.i], D = deadlineOf(o);
  const toStart = mm(x.start - now), lateBy = mm(x.end - D);
  return `<div class="tk ${x.late ? 'late' : ''} ${x.started ? 's-cooking' : x.start <= now + MIN ? 's-due' : 's-paid'}" style="border-left-color:${x.late ? 'var(--red)' : STATION[x.t.st].color}">
    <div class="top"><span class="cd">№${o.no}</span><span class="who">${it.e} ${esc(it.n)}</span><span class="spacer"></span><b>×${it.q}</b></div>
    <div class="tm">${x.started ? `Готовится с ${fmtTime(x.t.start)} · готово к <b>${fmtTime(x.end)}</b>` : `Старт <b>${fmtTime(x.start)}</b> ${toStart > 0 ? '· через ' + toStart + ' мин' : toStart < -1 ? '· <span class="bad">просрочен на ' + -toStart + ' мин</span>' : '· сейчас'} → готово ${fmtTime(x.end)}`}<br>
      <span class="tiny">${STATION[x.t.st].short} · ${it.drink ? 'стакан' : 'в пакет'} → ${whereLabel(o)} к ${fmtTime(o.readyAt)}${x.late ? ` · <span class="bad">опоздание ${lateBy} мин</span>` : ''}</span></div>
    ${o.comment ? `<div class="cm">💬 ${esc(o.comment)}</div>` : ''}
    <div class="acts">${x.started ? `<button class="btn primary kbtn done" data-act="t-done" data-id="${o.id}" data-i="${x.ix}" ${(KDS_HOLD[o.id + ':' + x.ix] || 0) > Date.now() ? 'disabled' : ''}>✓ Готово</button>` : `<button class="btn kbtn ${x.start <= now + MIN ? 'primary' : ''}" data-act="t-start" data-id="${o.id}" data-i="${x.ix}">${x.start <= now + MIN ? '▶ Начать' : 'Начать раньше'}</button>`}</div></div>`;
}
function kitchenMain() {
  const p = plan(), now = Date.now(), f = UI.kSt;
  const all = Object.values(p).filter(x => f === 'all' || f === 'pack' || x.t.st === f).sort((a, b) => a.start - b.start);
  const nowL = all.filter(x => !x.started && x.start <= now + MIN), work = all.filter(x => x.started), next = all.filter(x => !x.started && x.start > now + MIN && x.start <= now + 45 * MIN);
  const laterL = all.filter(x => !x.started && x.start > now + 45 * MIN);
  const shown = new Set([...nowL, ...work, ...next].map(x => x.o.id));
  const laterOrders = [...new Map(laterL.filter(x => !shown.has(x.o.id)).map(x => [x.o.id, x])).values()];      // по заказу — самая ранняя задача
  const packs = kitchenPackList();
  const col = (t, list, hint) => `<div class="col"><h4>${t}<span class="n">${list.length}</span></h4>${list.map(taskCard).join('') || `<div class="tiny muted" style="padding:6px">${hint}</div>`}</div>`;
  const packCol = `<div class="col"><h4>Упаковка<span class="n">${packs.length}</span></h4>${packs.map(o => `<div class="tk s-packed"><div class="top"><span class="cd">№${o.no}</span><span class="who">${esc(o.name)}</span><span class="spacer"></span><span class="tiny muted">к ${fmtTime(o.readyAt)}</span></div><div class="tm">Напишите <b>№${o.no}</b> на пакете · ${o.mode === 'cafe' ? 'выдача в кафе' : 'ячейка ' + bagSize(o)}</div><ul>${o.items.filter(i => !i.drink).map(i => `<li><span class="q">${i.q}×</span><span>${i.e} ${esc(i.n)}</span></li>`).join('')}</ul><div class="acts"><button class="btn lime kbtn" data-act="t-pack" data-id="${o.id}">✓ Упакован, №${o.no} на пакете</button></div></div>`).join('') || '<div class="tiny muted" style="padding:6px">Нечего упаковывать</div>'}</div>`;
  const lateN = Object.values(p).filter(x => x.late).length;
  return `<div class="awrap">${S.mode !== 'db' && S.dbNote ? `<div class="banner">⚠️ ${esc(S.dbNote)} Заказы с других устройств здесь не появятся.</div>` : ''}
    <div class="ah"><h2>${f === 'all' ? 'Все цеха' : f === 'pack' ? 'Упаковка' : STATION[f].name}</h2><span class="muted">планировщик ставит старт так, чтобы заказ был в точке выдачи к времени клиента; план пересчитывается при каждом событии</span></div>
    <div class="panel"><div class="row"><h3 style="margin:0">Загрузка цехов на час вперёд</h3><span class="spacer"></span><div class="legend"><span><i style="background:#1d6b45"></i>запланировано</span><span><i style="background:#e8743b"></i>готовится</span><span><i style="background:#e3463a"></i>опаздываем</span></div></div>${ganttSVG(p)}
      ${lateN ? `<div class="note red" style="margin-top:8px">Опаздываем по ${lateN} ${plural(lateN, 'задаче', 'задачам', 'задачам')}: в цехе не хватает мест. Клиентам с опозданием сайт покажет новое время.</div>` : ''}</div>
    ${f === 'pack' ? `<div class="cols" style="grid-template-columns:1fr">${packCol}</div>` : `<div class="cols">${col('Сейчас', nowL, 'Нечего начинать')}${col('В работе', work, 'Плита свободна')}${col('Далее · 45 мин', next, 'Пусто')}${packCol}</div>`}
    ${laterOrders.length ? `<div class="panel later"><h3>Позже · ${laterOrders.length} ${plural(laterOrders.length, 'заказ', 'заказа', 'заказов')}</h3><div class="tiny muted" style="margin:-4px 0 8px">Оплачены, но готовить ещё рано — заказ появится в колонке «Сейчас» к своему времени старта.</div>
      <div class="laterlist">${laterOrders.map(x => `<span class="li"><b>№${x.o.no}</b> ${esc(x.o.items.map(i => i.n).join(', ').slice(0, 60))} · старт ${sameDay(x.start, now) ? '' : 'завтра '}<b>${fmtTime(x.start)}</b></span>`).join('')}</div></div>` : ''}
  </div>`;
}

/* ===== Официант ===== */
function waiterHead() {
  const up = Object.values(S.orders).filter(o => o.mode === 'gym' && (o.status === 'ready' || o.status === 'delivering')).length;
  const cafe = Object.values(S.orders).filter(o => o.mode === 'cafe' && (o.status === 'ready' || o.status === 'placed')).length;
  return staffHead('Официант', 'доставка наверх и выдача в кафе', [['up', 'Наверх', up], ['cafe', 'Кафе', cafe], ['cells', 'Шкаф', 0]], UI.wTab, 'w-tab');
}
function partRow(icon, title, sub, btn) { return `<div class="wpart"><span class="wi">${icon}</span><div style="flex:1"><b>${title}</b><div class="tiny muted">${sub}</div></div>${btn || ''}</div>`; }
function waiterCard(o) {
  const now = Date.now(), toT = mm(o.readyAt - now);
  let parts = '';
  if (o.status === 'ready') {
    if (o.cup.need) parts += partRow('🥤', `Подпишите стакан: №${o.no}`, o.items.filter(i => i.drink).map(i => i.q + '× ' + i.n).join(', ') + ' → стойка ресепшена');
    if (o.bag.need) parts += partRow('📦', `Пакет №${o.no}`, o.items.filter(i => !i.drink).map(i => i.q + '× ' + i.n).join(', ') + ' → ячейка ' + bagSize(o));
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
    ${o.status === 'ready' ? `<button class="btn primary" style="width:100%;justify-content:center;margin-top:8px" data-act="w-take" data-id="${o.id}">Взять в рейс${o.bag.need ? ' и получить ячейку' : ''}</button>` : ''}</div>`;
}
function waiterMain() {
  const now = Date.now(), all = ordersList();
  let h = '';
  if (UI.wTab === 'up') {
    const ready = all.filter(o => o.mode === 'gym' && o.status === 'ready'), trip = all.filter(o => o.mode === 'gym' && o.status === 'delivering');
    const soon = all.filter(o => o.mode === 'gym' && (o.status === 'paid' || o.status === 'cooking') && o.readyAt - now < 40 * MIN);
    const doneToday = all.filter(o => o.mode === 'gym' && ['placed', 'done'].includes(o.status) && sameDay(o.readyAt, now)).reverse().slice(0, 6);
    h += `<div class="wsec"><div class="row"><h3>В рейсе · ${trip.length}</h3></div>${trip.map(waiterCard).join('') || '<div class="muted small">Сейчас ничего не несёте.</div>'}</div>`;
    h += `<div class="wsec"><div class="row"><h3>Готовы к выносу · ${ready.length}</h3><span class="spacer"></span>${ready.length > 1 ? `<button class="btn sm lime" data-act="w-takeall">Взять все в рейс</button>` : ''}</div>${ready.map(waiterCard).join('') || '<div class="muted small">Пока нечего нести.</div>'}</div>`;
    h += `<div class="wsec"><h3>Скоро будут готовы</h3>${soon.map(o => `<div class="ci"><div class="e" style="font-size:14px;font-weight:800">№${o.no}</div><div class="n">${esc(o.name)}<div class="tiny muted">${whereLabel(o)} · к ${fmtTime(o.readyAt)}</div></div><span class="st ${STATUS[o.status].color}">${STATUS[o.status].short}</span></div>`).join('') || '<div class="muted small">Пусто</div>'}</div>`;
    h += `<div class="wsec"><h3>Доставлено сегодня</h3>${doneToday.map(o => `<div class="ci"><div class="e" style="font-size:14px;font-weight:800">№${o.no}</div><div class="n">${esc(o.name)}<div class="tiny muted">${[o.bag.need ? 'ячейка ' + o.bag.cell + (o.bag.pickedAt ? ' — забран' : ' — ждёт') : '', o.cup.need ? 'стойка' + (o.cup.pickedAt ? ' — забран' : ' — ждёт') : ''].filter(Boolean).join(' · ')}</div></div></div>`).join('') || '<div class="muted small">Пока нет</div>'}</div>`;
  } else if (UI.wTab === 'cafe') {
    const ready = all.filter(o => o.mode === 'cafe' && o.status === 'ready'), shelf = all.filter(o => o.mode === 'cafe' && o.status === 'placed');
    const q = UI.cafeNo.trim();
    h += `<div class="wsec"><h3>Готовы — поставить на полку выдачи · ${ready.length}</h3>${ready.map(o => `<div class="wcard"><div class="top"><span class="cd">№${o.no}</span><span class="who">${esc(o.name)}</span><span class="spacer"></span><span class="st blue">к ${fmtTime(o.readyAt)}</span></div><div class="tiny muted">${o.items.map(i => i.q + '× ' + i.n).join(', ')}</div><button class="btn primary" style="width:100%;justify-content:center;margin-top:8px" data-act="w-shelf" data-id="${o.id}">Поставил на полку, номер подписан</button></div>`).join('') || '<div class="muted small">Пусто</div>'}</div>`;
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
    return `<div class="cell s-${exp ? 'free' : c.state}"><div class="row"><b>${c.id}</b><span class="tiny muted">${c.size}</span></div><div class="cl">${lbl}</div>${c.state === 'open' && big ? '<div class="tiny muted">' + (c.openFor === 'deposit' ? 'официант кладёт пакет №' + c.no + ' — ждём отметки «Заказ доставлен в ячейку»' : 'клиент забирает №' + c.no + ' — ячейка освободится, когда он нажмёт «Заказ забрал»') + '</div>' : ''}${!big && (c.state === 'occupied' || (c.state === 'open' && c.openFor === 'pickup')) ? `<button class="btn sm rel" data-act="w-release" data-id="${c.id}" title="Если клиент забрал пакет, но не нажал «Заказ забрал»">Освободить</button>` : ''}</div>`;
  }).join('')}</div>`;
}
function lockerMain() {
  const now = Date.now();
  const depToks = S.lockers.cells.filter(c => c.state === 'reserved' && c.depTok && c.depExp > now);
  const pickToks = Object.values(S.orders).filter(o => o.bag.need && o.bag.depositedAt && !o.bag.pickedAt && o.mode === 'gym');
  const m = UI.lockMsg;
  return `<div class="awrap"><div class="ah"><h2>Шкаф с ячейками</h2><span class="muted">табло со сканером QR и 12 ячеек. Камера в прототипе недоступна — «подносите» телефоны кнопками ниже</span></div>
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
