/* ===== Платежи и чеки (имитация связки Форабанк → облачная касса Orange Data → Контур.ОФД) ===== */
const VAT = { none: ['Без НДС', 0], vat5: ['НДС 5%', 5], vat7: ['НДС 7%', 7], vat10: ['НДС 10%', 10], vat22: ['НДС 22%', 22] };
const SNO = { usn: 'УСН доходы', usn_ie: 'УСН доходы минус расходы', osn: 'ОСН' };
const SUBJ = { goods: 'Товар', service: 'Услуга' };
const RC_TYPE = { income: 'Приход', refund: 'Возврат прихода' };
const RC_MODE = { prepay: 'Предоплата 100%', full: 'Полный расчёт' };
const RC_PAY = { card: 'Безналичными · карта', sbp: 'Безналичными · СБП', offset: 'Зачёт предоплаты' };
/* реквизиты в прототипе условные — это не фискальные данные */
const KKT = { org: 'ООО «Этажом ниже» (демо)', inn: '0000000000', rn: '0000000000012345', fn: '9999078900001234', kkt: 'Orange Data, облачная касса', ofd: 'Контур.ОФД', acq: 'Форабанк' };

const fset = () => { const s = S.catalog.settings; if (!s.fiscal) s.fiscal = clone(DEFAULT_SETTINGS.fiscal); return s.fiscal; };
const isMarked = id => DRINK_SUB[id] === 'water';             // вода и напитки в бутылках — маркировка «Честный знак»
function hashNum(str, mod) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h % mod; }
const gtinOf = id => '0460' + String(hashNum('gtin' + id, 1e9)).padStart(9, '0') + '7';
const fpOf = seed => String(hashNum('fp' + seed, 1e10)).padStart(10, '0');
function maskContact(c) {
  if (!c) return '—'; if (c.includes('@')) return c.replace(/^(.).*?(@.*)$/, '$1***$2');
  const n = (c.match(/\d/g) || []).length; let k = 0; return c.replace(/\d/g, d => (k++ >= 1 && k <= n - 4 ? '•' : d));
}
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

function fiscalSnapshot(f) { return { scheme: f.scheme, vat: f.vat, subject: f.subject, sno: f.sno }; }
function maxFd(extra) { let m = 1200; Object.values(S.orders).forEach(o => (o.receipts || []).forEach(r => { if (r.fd > m) m = r.fd; })); (extra || []).forEach(r => { if (r.fd > m) m = r.fd; }); return m; }
function makeReceipt(o, type, mode, pay, at, fd) {
  const fs = o.fiscal || fiscalSnapshot(DEFAULT_SETTINGS.fiscal), t = at || Date.now();
  /* бонусы и скидка тренера — это скидка: распределяем её по позициям, цены в чеке уже с её учётом (письмо ФНС № ЕД-3-20/6387@) */
  const base = o.items.reduce((s, it) => s + it.price * it.q, 0), paid = o.paid != null ? o.paid : base, disc = base - paid;
  let rest = paid;
  const items = o.items.map((it, i) => {
    const full = it.price * it.q, sum = i === o.items.length - 1 ? Math.round(rest * 100) / 100 : Math.round((full - disc * full / (base || 1)) * 100) / 100;
    rest -= sum;
    return { n: it.n, q: it.q, price: Math.round(sum / it.q * 100) / 100, sum, full, mk: isMarked(it.d), gtin: isMarked(it.d) ? gtinOf(it.d) : null };
  });
  return { id: uid('r'), type, mode, pay, at: t, sum: paid, disc, bonus: o.bonus || 0, staffDisc: o.staffDisc || 0, items, vat: fs.vat, subject: fs.subject, sno: fs.sno,
    contact: o.email || o.phone, ch: o.email ? 'email' : 'pdf', fd: fd || maxFd(o.receipts) + 1, fp: fpOf(o.id + type + mode + t), ofdAt: t + 1500 + hashNum(o.id + t, 1500) };
}
function addReceipt(o, type, mode, pay) {
  o.receipts = o.receipts || [];
  const r = makeReceipt(o, type, mode, pay); o.receipts.push(r);
  const wait = r.ofdAt - Date.now() + 80; if (wait > 0) setTimeout(() => { _cache = {}; render(); }, wait);
  return r;
}
const rcInOfd = r => Date.now() >= r.ofdAt;
const rcTitle = r => `${RC_TYPE[r.type]} · ${RC_MODE[r.mode]}`;
const m2 = v => (Math.round(v * 100) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const rcVatSum = r => { const p = VAT[r.vat] ? VAT[r.vat][1] : 0; return p ? Math.round(r.sum * p / (100 + p) * 100) / 100 : 0; };
const rcQR = r => { const d = new Date(r.at), p = n => String(n).padStart(2, '0'); return `t=${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}&s=${r.sum.toFixed(2)}&fn=${KKT.fn}&i=${r.fd}&fp=${r.fp}&n=${r.type === 'income' ? 1 : 2}`; };
const rcShift = r => 40 + Math.floor((startOfDay(new Date(r.at)).getTime() - startOfDay(new Date(2026, 9, 1)).getTime()) / 864e5);

/* ----- события заказа ----- */
function fiscalOnPaid(o) {
  o.fiscal = fiscalSnapshot(fset());
  addReceipt(o, 'income', o.fiscal.scheme === 'one' ? 'full' : 'prepay', o.payMethod);
}
const needsClosing = o => o.fiscal && o.fiscal.scheme === 'two' && (o.receipts || []).some(r => r.type === 'income' && r.mode === 'prepay') && !(o.receipts || []).some(r => r.type === 'income' && r.mode === 'full') && !(o.receipts || []).some(r => r.type === 'refund');
/* вызывается при статусе «Получен»: второй чек «Полный расчёт» с зачётом предоплаты */
function fiscalOnDone(o) { if (needsClosing(o)) return addReceipt(o, 'income', 'full', 'offset'); return null; }
function fiscalOnCancel(o) {
  (o.receipts || []).filter(r => r.type === 'income').forEach(r => { if (!o.receipts.some(x => x.type === 'refund' && x.mode === r.mode)) addReceipt(o, 'refund', r.mode, r.pay); });
}
/* закрытие дня: «Полный расчёт» по заказам, которые уже доставлены, но клиент не нажал «Заказ забрал» */
function closeDeliveredReceipts() {
  let n = 0;
  Object.values(S.orders).forEach(o0 => { if (o0.status !== 'placed' || !needsClosing(o0)) return; const o = clone(o0); addReceipt(o, 'income', 'full', 'offset'); o.closedByDay = true; saveOrder(o); n++; });
  return n;
}
function seedReceipts(o, fiscalSettings, fdRef) {
  o.fiscal = fiscalSnapshot(fiscalSettings); o.receipts = [];
  const push = (type, mode, pay, at) => { const r = makeReceipt(o, type, mode, pay, at, ++fdRef.v); r.ofdAt = at + 2000; o.receipts.push(r); };
  push('income', o.fiscal.scheme === 'one' ? 'full' : 'prepay', o.payMethod, o.createdAt + 40e3);
  if (o.status === 'done' && o.fiscal.scheme === 'two') push('income', 'full', 'offset', o.history.done);
}

/* ----- эквайринг: оценка комиссии ----- */
function acquiringStats(orders) {
  const f = fset(), paid = orders.filter(o => o.status !== 'cancelled');
  const card = paid.filter(o => o.payMethod !== 'sbp').reduce((s, o) => s + paidOf(o), 0), sbp = paid.filter(o => o.payMethod === 'sbp').reduce((s, o) => s + paidOf(o), 0);
  const cardRate = f.cardFee / 100 * (1 + (f.feeVat || 0) / 100), sbpRate = f.sbpFee / 100;
  const fee = card * cardRate + sbp * sbpRate, ifAllSbp = (card + sbp) * sbpRate;
  return { card, sbp, fee, save: fee - ifAllSbp, share: card + sbp ? sbp / (card + sbp) * 100 : 0, cardN: paid.filter(o => o.payMethod !== 'sbp').length, sbpN: paid.filter(o => o.payMethod === 'sbp').length };
}

/* ----- отображение чека ----- */
function receiptRows(o) {
  const list = o.receipts || [];
  if (!list.length) return '';
  const rows = list.map(r => `<div class="rcrow"><span class="ri">🧾</span><div style="flex:1"><b>${rcTitle(r)}</b> · ${fmtRub(r.sum)}<div class="tiny muted">${rcInOfd(r) ? `принят Контур.ОФД · ${r.ch === 'email' ? 'отправлен на ' + esc(maskContact(r.contact)) : 'скачайте PDF'}` : '<span class="pulse">●</span> облачная касса формирует чек…'}</div></div><button class="btn sm" data-act="rc-open" data-id="${o.id}" data-r="${r.id}">Открыть</button>${rcInOfd(r) ? `<button class="btn sm" data-act="rc-pdf" data-id="${o.id}" data-r="${r.id}" title="Скачать чек в PDF">PDF</button>` : ''}</div>`).join('');
  const wait = needsClosing(o) && o.status !== 'cancelled' ? `<div class="tiny muted" style="margin-top:6px">Второй чек «Полный расчёт» придёт, когда вы ${o.mode === 'cafe' ? 'заберёте заказ' : 'нажмёте «Заказ забрал»'}.</div>` : '';
  return `<div class="rcbox"><div class="tiny muted" style="margin-bottom:6px">Электронные чеки</div>${rows}${wait}</div>`;
}
function receiptModal(o, r, back) {
  const vatName = VAT[r.vat] ? VAT[r.vat][0] : 'Без НДС', vs = rcVatSum(r);
  return `<div class="overlay" data-act="close-modal"><div class="modal" style="width:min(430px,100%)">
    <div class="mh">${back ? `<button class="x" data-act="track" data-id="${o.id}" title="К заказу">‹</button>` : ''}<h3>Чек №${r.fd}</h3><button class="x" data-act="close-modal">×</button></div>
    <div class="mb"><div class="paper">
      <div class="demo-stamp">ДЕМО · не является фискальным документом</div>
      <div class="c b">${esc(KKT.org)}</div><div class="c tiny">ИНН ${KKT.inn} · ${SNO[r.sno] || ''}</div>
      <div class="c tiny">Место расчётов: ${esc(SITE_URL.replace(/^https?:\/\//, '').replace(/[#?].*$/, ''))}</div>
      <div class="c b" style="margin:10px 0 2px">КАССОВЫЙ ЧЕК · ${RC_TYPE[r.type].toUpperCase()}</div>
      <div class="c tiny">${fmtDate(r.at)} ${fmtTime(r.at)} · смена №${rcShift(r)} · заказ №${o.no}</div>
      <div class="hr"></div>
      ${r.items.map((it, i) => `<div class="pl"><div class="row"><span>${i + 1}. ${esc(it.n)}</span><span class="spacer"></span><b>${m2(it.sum)}</b></div>
        <div class="tiny muted">${it.q} × ${m2(it.price)} · ${RC_MODE[r.mode]} · ${it.mk ? 'Товар' : SUBJ[r.subject]} · ${vatName}${r.disc ? ` · скидка ${m2(it.full - it.sum)}` : ''}</div>
        ${it.mk ? `<div class="tiny mk">GTIN ${it.gtin} · отраслевой реквизит 1265: mode=horeca</div>` : ''}</div>`).join('')}
      <div class="hr"></div>
      ${r.disc ? `<div class="row tiny"><span>Скидка${r.bonus ? ' бонусами ' + m2(r.bonus) : ''}${r.staffDisc ? ' сотруднику клуба ' + m2(r.staffDisc) : ''}</span><span class="spacer"></span><span>−${m2(r.disc)}</span></div>` : ''}
      <div class="row b big"><span>ИТОГ</span><span class="spacer"></span><span>${m2(r.sum)}</span></div>
      <div class="row"><span>${RC_PAY[r.pay] || 'Безналичными'}</span><span class="spacer"></span><span>${m2(r.sum)}</span></div>
      <div class="row tiny"><span>${vs ? 'Сумма ' + vatName : 'Сумма без НДС'}</span><span class="spacer"></span><span>${vs ? m2(vs) : m2(r.sum)}</span></div>
      <div class="hr"></div>
      <div class="tiny">Покупатель: ${esc(maskContact(r.contact))}</div>
      <div class="tiny">Сайт ФНС: www.nalog.gov.ru · ОФД: ${KKT.ofd}</div>
      <div class="tiny">РН ККТ ${KKT.rn} · ФН ${KKT.fn}</div>
      <div class="tiny">ФД ${r.fd} · ФП ${r.fp} · ФФД 1.2</div>
      ${qrSVG(rcQR(r), 'qr rcqr')}
    </div>
    <div class="note ${rcInOfd(r) ? 'green' : ''}" style="margin-top:12px">${rcInOfd(r) ? `Чек принят Контур.ОФД, копия ушла в ФНС. ${r.ch === 'email' ? 'Отправлен на ' + esc(maskContact(r.contact)) + '.' : 'Скачайте его в PDF.'}` : 'Облачная касса формирует чек и передаёт его в Контур.ОФД…'}</div></div>
    <div class="mf"><span class="spacer"></span>${rcInOfd(r) ? `<button class="btn primary" data-act="rc-pdf" data-id="${o.id}" data-r="${r.id}">📄 Скачать PDF</button>` : ''}</div>
  </div></div>`;
}

/* ----- чек в PDF: рисуем чек на canvas и упаковываем картинку в одностраничный PDF (без библиотек) ----- */
function receiptCanvas(o, r) {
  const W = 420, P = 22, S2 = 2, font = (w, px) => `${w} ${px}px Manrope, Arial, sans-serif`;
  const vatName = VAT[r.vat] ? VAT[r.vat][0] : 'Без НДС', vs = rcVatSum(r);
  const draw = (ctx, real) => {
    let y = P;
    const text = (t, { size = 13, weight = 400, align = 'left', color = '#1b1b1b', x = P, w = W - 2 * P, lh = 1.35 } = {}) => {
      ctx.font = font(weight, size); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top';
      const words = String(t).split(' '), lines = []; let line = '';
      words.forEach(wd => { const tr = line ? line + ' ' + wd : wd; if (ctx.measureText(tr).width > w && line) { lines.push(line); line = wd; } else line = tr; });
      if (line) lines.push(line);
      lines.forEach(l => { if (real) ctx.fillText(l, align === 'center' ? x + w / 2 : align === 'right' ? x + w : x, y); y += size * lh; });
    };
    const pair = (l, rt, opt = {}) => { const y0 = y; text(rt, Object.assign({}, opt, { align: 'right' })); const y1 = y; y = y0; text(l, Object.assign({}, opt, { w: W - 2 * P - 90 })); y = Math.max(y, y1); };
    const hr = () => { y += 4; if (real) { ctx.strokeStyle = '#999'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(W - P, y); ctx.stroke(); ctx.setLineDash([]); } y += 8; };
    if (real) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, ctx.canvas.height / S2); }
    text('ДЕМО · не является фискальным документом', { size: 10, weight: 700, align: 'center', color: '#b4232a' }); y += 4;
    text(KKT.org, { size: 14, weight: 700, align: 'center' });
    text(`ИНН ${KKT.inn} · ${SNO[r.sno] || ''}`, { size: 11, align: 'center', color: '#444' });
    text('Место расчётов: ' + SITE_URL.replace(/^https?:\/\//, '').replace(/[#?].*$/, ''), { size: 11, align: 'center', color: '#444' }); y += 6;
    text(`КАССОВЫЙ ЧЕК · ${RC_TYPE[r.type].toUpperCase()}`, { size: 14, weight: 700, align: 'center' });
    text(`${fmtDate(r.at)} ${fmtTime(r.at)} · смена №${rcShift(r)} · заказ №${o.no}`, { size: 11, align: 'center', color: '#444' });
    hr();
    r.items.forEach((it, i) => {
      pair(`${i + 1}. ${it.n}`, m2(it.sum), { size: 13, weight: 600 });
      text(`${it.q} × ${m2(it.price)} · ${RC_MODE[r.mode]} · ${it.mk ? 'Товар' : SUBJ[r.subject]} · ${vatName}${r.disc ? ` · скидка ${m2(it.full - it.sum)}` : ''}`, { size: 10.5, color: '#555' });
      if (it.mk) text(`GTIN ${it.gtin} · реквизит 1265: mode=horeca`, { size: 10, color: '#555' });
      y += 4;
    });
    hr();
    if (r.disc) pair(`Скидка${r.bonus ? ' бонусами ' + m2(r.bonus) : ''}${r.staffDisc ? ' сотруднику клуба ' + m2(r.staffDisc) : ''}`, '−' + m2(r.disc), { size: 11 });
    pair('ИТОГ', m2(r.sum), { size: 17, weight: 800 });
    pair(RC_PAY[r.pay] || 'Безналичными', m2(r.sum), { size: 12 });
    pair(vs ? 'Сумма ' + vatName : 'Сумма без НДС', vs ? m2(vs) : m2(r.sum), { size: 11, color: '#444' });
    hr();
    [`Покупатель: ${maskContact(r.contact)}`, `Сайт ФНС: www.nalog.gov.ru · ОФД: ${KKT.ofd}`, `РН ККТ ${KKT.rn} · ФН ${KKT.fn}`, `ФД ${r.fd} · ФП ${r.fp} · ФФД 1.2`, `Эквайринг: ${KKT.acq} · ${KKT.kkt}`].forEach(t => text(t, { size: 11, color: '#333' }));
    y += 8;
    try {                                                         // QR-код для проверки чека в приложении ФНС
      const q = qrcode(0, 'M'); q.addData(rcQR(r)); q.make();
      const n = q.getModuleCount(), cell = Math.floor(150 / n), size = cell * n, x0 = (W - size) / 2;
      if (real) { ctx.fillStyle = '#111'; for (let rr = 0; rr < n; rr++) for (let c = 0; c < n; c++) if (q.isDark(rr, c)) ctx.fillRect(x0 + c * cell, y + rr * cell, cell, cell); }
      y += size + 8;
    } catch (e) { }
    text('Проверить чек: приложение ФНС «Проверка чеков»', { size: 10, align: 'center', color: '#666' });
    return y + P;
  };
  const probe = document.createElement('canvas').getContext('2d');
  const H = Math.ceil(draw(probe, false));
  const cv = document.createElement('canvas'); cv.width = W * S2; cv.height = H * S2;
  const ctx = cv.getContext('2d'); ctx.scale(S2, S2); draw(ctx, true);
  return cv;
}
function pdfFromJpeg(jpeg, wpx, hpx, wpt) {
  const hpt = Math.round(wpt * hpx / wpx * 100) / 100, enc = new TextEncoder(), parts = [], off = [];
  let len = 0;
  const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, body) => { off[n] = len; push(`${n} 0 obj\n${body}\nendobj\n`); };
  push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));   // %PDF-1.4 + бинарная метка
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wpt} ${hpt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  off[4] = len; push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${wpx} /Height ${hpx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`); push(jpeg); push('\nendstream\nendobj\n');
  const cs = `q ${wpt} 0 0 ${hpt} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
  obj(6, '<< /Title (Receipt) /Producer (Etazhom nizhe demo) >>');
  const xref = len;
  push(`xref\n0 7\n0000000000 65535 f \n${[1, 2, 3, 4, 5, 6].map(i => String(off[i]).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len); let k = 0; parts.forEach(b => { out.set(b, k); k += b.length; });
  return out;
}
function receiptPdf(o, r) {
  const cv = receiptCanvas(o, r), b64 = cv.toDataURL('image/jpeg', 0.92).split(',')[1], bin = atob(b64);
  const jpeg = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) jpeg[i] = bin.charCodeAt(i);
  return pdfFromJpeg(jpeg, cv.width, cv.height, 283.46);          // ширина страницы 100 мм
}
/* сохранение файла: в опубликованной странице — через возможность downloads, иначе обычной ссылкой */
let _dl = null;
const downloadsNs = () => _dl || (_dl = (window.claude && typeof window.claude.use === 'function') ? Promise.resolve(window.claude.use('downloads')).catch(() => null) : Promise.resolve(null));
async function saveFile(filename, bytes) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const dl = await downloadsNs();
  if (dl) { await dl.save({ filename, data: blob }); return true; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return true;
}
