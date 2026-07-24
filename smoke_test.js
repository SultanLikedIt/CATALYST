/* Headless smoke test: app.js'i gerçek DATA ile, DOM+Chart stub'larıyla çalıştırır.
   Tüm view'ları, filtreleri ve senaryo motorunu tetikler. */
'use strict';
const fs = require('fs');
const ROOT = __dirname;
const html = fs.readFileSync(ROOT + '/catalyst.html', 'utf8');
const m = html.match(/<script>const DATA=([\s\S]*?);<\/script>/);
if (!m) { console.error('DATA bloğu bulunamadı'); process.exit(1); }
const DATA = JSON.parse(m[1]);

/* ---- DOM stub ---- */
const els = {};
let elSeq = 0;
function makeEl(id) {
  const listeners = {};
  const el = {
    id: id || 'anon' + (++elSeq),
    _html: '', dataset: {}, value: '', textContent: '',
    style: {}, scrollTop: 0, scrollHeight: 0, children: [],
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); },
      remove(...c) { c.forEach(x => this._s.delete(x)); },
      toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    set innerHTML(v) {
      this._html = String(v);
      if (/undefined|NaN|\[object Object\]/.test(this._html)) {
        const ctx = this._html.match(/.{0,70}(undefined|NaN|\[object Object\]).{0,40}/);
        issues.push(`innerHTML[#${this.id}] şüpheli içerik: …${ctx[0].replace(/\s+/g, ' ')}…`);
      }
    },
    get innerHTML() { return this._html; },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    _fire(t, ev) { (listeners[t] || []).forEach(fn => fn(ev)); },
    appendChild(c) { this.children.push(c); },
    insertAdjacentHTML(_, v) {
      injected.push(String(v));
      if (/undefined|NaN(?!N)/.test(v)) issues.push(`insertAdjacentHTML[#${this.id}] şüpheli içerik`);
    },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    scrollIntoView() {},
    setAttribute() {}, getAttribute() { return ''; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 468 }; },
    closest() { return null; },
    getContext() { return {}; },
  };
  return el;
}
const issues = [];
const injected = [];
global.document = {
  body: makeEl('body'),
  getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
  querySelector() { return makeEl(); },
  querySelectorAll() { return []; },
  createElement() { return makeEl(); },
  addEventListener() {},
};
global.window = global;
global.scrollTo = () => {};
global.setTimeout = fn => fn();          // zamanlanmış işleri senkron çalıştır

/* ---- Chart stub ---- */
const charts = [];
function Chart(el, cfg) {
  if (!el) issues.push('Chart: null canvas');
  if (!cfg || !cfg.data) issues.push('Chart: config.data yok');
  const walk = (o, path) => {
    if (o == null) return;
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, path + '[' + i + ']'));
    if (typeof o === 'object') return Object.entries(o).forEach(([k, v]) => walk(v, path + '.' + k));
    if (typeof o === 'number' && Number.isNaN(o)) issues.push(`Chart NaN: ${path} (canvas #${el && el.id})`);
    if (o === undefined) issues.push(`Chart undefined: ${path}`);
  };
  (cfg.data.datasets || []).forEach((d, i) => walk(d.data, `ds[${i}]${d.label ? ':' + d.label : ''}`));
  this.data = cfg.data;
  this.update = () => {}; this.destroy = () => {};
  charts.push(this);
}
Chart.defaults = { color: '', borderColor: '', font: {}, plugins: { legend: { labels: {} }, tooltip: {} } };
global.Chart = Chart;
global.DATA = DATA;

/* ---- app.js'i çalıştır ---- */
const src = fs.readFileSync(ROOT + '/assets/app.js', 'utf8');
try { eval(src + '\n;global.__APP={senaryoHesap,poissonMin,fmt,f1,W,SC,PRESETS,H,kararMotoru,kanalSec,KOVA,kmWatch,belirsizlik,senaryoMu};'); } catch (e) { console.error('✗ ÜST DÜZEY HATA:', e.stack.split('\n').slice(0, 4).join('\n')); process.exit(1); }

function step(name, fn) {
  try { fn(); console.log('✓', name); }
  catch (e) { console.error('✗', name, '→', e.stack.split('\n').slice(0, 3).join(' | ')); process.exitCode = 1; }
}

/* tüm view'lar */
step('karar merkezi (başlangıçta render)', () => {
  if (!els['v-karar']._html.includes('Karar yönlendirici')) throw new Error('açılış görünümü karar merkezi değil');
});
step('watchlist render', () => els['tabs']._fire('click', { target: { closest: () => ({ dataset: { v: 'watch' } }) } }));
step('öngörü render', () => els['tabs']._fire('click', { target: { closest: () => ({ dataset: { v: 'ongoru' } }) } }));
step('harita render', () => els['tabs']._fire('click', { target: { closest: () => ({ dataset: { v: 'harita' } }) } }));
step('senaryo render', () => els['tabs']._fire('click', { target: { closest: () => ({ dataset: { v: 'senaryo' } }) } }));

/* watchlist etkileşimleri */
step('arama filtresi (engine)', () => { els['wQ'].value = 'engine'; els['wQ']._fire('input', { target: els['wQ'] }); });
step('kritiklik filtresi (AOG)', () => { els['wKr'].value = '0'; els['wKr']._fire('change', { target: els['wKr'] }); });

/* senaryo motoru — baz 134 doğrulaması + preset'ler */
step('senaryo baz = 134 kırmızı', () => {
  const r = __APP.senaryoHesap({ d: 0, l: 0, s: 0, yeniDem: 0, disOnly: false });
  if (r.kir !== 134) throw new Error('baz kırmızı ' + r.kir + ' ≠ 134');
  if (r.kirAog !== 22) throw new Error('baz AOG ' + r.kirAog + ' ≠ 22');
  const sum = r.byKr[0] + r.byKr[1] + r.byKr[2];
  if (sum !== 134) throw new Error('byKr toplamı ' + sum);
});
step('motor krizi senaryosu artış üretir', () => {
  const r = __APP.senaryoHesap({ d: 0, l: 30, s: 0, yeniDem: 1.5, disOnly: true });
  if (!(r.kir > 134)) throw new Error('motor krizi kırmızıyı artırmadı: ' + r.kir);
  console.log('   motor krizi: kırmızı 134→' + r.kir + ' · 2033 açığı ' + r.acik + ' · ek ' + (r.ek / 1e6).toFixed(1) + 'M$');
});
step('poissonMin akıl sağlığı', () => {
  if (__APP.poissonMin(0, .95) !== 0) throw new Error('mu=0');
  const a = __APP.poissonMin(2, .90), b = __APP.poissonMin(2, .98);
  if (!(b >= a)) throw new Error('hedef sıkılaşınca MIN düşmemeli');
  const big = __APP.poissonMin(150, .95);
  if (!(big > 150 && big < 200)) throw new Error('mu=150 → ' + big);
});

/* yeni: ROI + eğri + OEM preset + PN-önekli arama */
step('W.showDetail eğri çizer (destroy dahil)', () => {
  __APP.W.showDetail(0); __APP.W.showDetail(5);   // ikincisi destroy yolunu test eder
});
step('karar merkezi — motor tutarlılığı', () => {
  const d = __APP.kararMotoru();
  const P = DATA.pn;
  /* kanal toplamları 5000'e, izle açıksız parça sayısına eşit olmalı */
  const top = d.say.izle + d.say.pool + d.say.tamir + d.say.alim;
  if (top !== 5000) throw new Error('kanal toplamı 5000 değil: ' + top);
  let izleBek = 0;
  for (let i = 0; i < P.id.length; i++) if (P.min33[i] <= P.svc[i]) izleBek++;
  if (d.say.izle !== izleBek) throw new Error(`izle ${d.say.izle} ≠ açıksız ${izleBek}`);
  /* her parçanın kovası kanalSec ile birebir — watchlist önerisiyle aynı kod yolu */
  for (let i = 0; i < P.id.length; i++) {
    const bek = P.min33[i] <= P.svc[i] ? 'izle' : __APP.KOVA[__APP.kanalSec(i).best.t];
    if (d.kanal[i] !== bek) throw new Error(`PN idx ${i}: kova ${d.kanal[i]} ≠ kanalSec ${bek}`);
  }
  /* pencere toplamı + alarm kümesi tanımı */
  const pTop = d.pen.gecmis.n + d.pen.p030.n + d.pen.p3090.n + d.pen.p90.n;
  if (pTop !== 5000) throw new Error('pencere toplamı 5000 değil: ' + pTop);
  for (const i of d.alarm) {
    if (!(d.kalan[i] < 0 && P.po[i] === 0)) throw new Error('alarm tanımı dışı parça: idx ' + i);
    if (!(P.flags[i] & 2)) throw new Error('alarm parçası SİPARİŞSİZ bayraklı değil: idx ' + i);
  }
  if (d.pen.gecmis.sip0 !== d.alarm.length) throw new Error('alarm sayısı pencereyle çelişiyor');
  /* fazla stok tanımı */
  for (const i of d.fazla.idx.slice(0, 50)) if (P.svc[i] <= P.max33[i]) throw new Error('fazla değilken listede: idx ' + i);
  console.log(`   kanallar: havuz ${d.say.pool} · tamir ${d.say.tamir} · alım ${d.say.alim} · izle ${d.say.izle} | alarm ${d.alarm.length} | fazla ${d.fazla.n}`);
});
step('karar merkezi — görünüm + köprüler', () => {
  els['tabs']._fire('click', { target: { closest: () => ({ dataset: { v: 'karar' } }) } });
  const h = els['v-karar']._html;
  for (const t of ['Karar yönlendirici', 'Sipariş penceresi alarmı', 'Planlama ufku', 'Fazla stok dengeleme',
                   'HAVUZ / EXCHANGE', 'rotayı çiz'])
    if (!h.includes(t)) throw new Error('karar görünümünde eksik: ' + t);
  const d = __APP.kararMotoru();
  /* kanal satırı → watchlist süzgeci */
  els['v-karar']._fire('click', { target: { closest: s => s === '.krow' ? { dataset: { k: 'pool' } } : null } });
  if (__APP.W.kanal !== 'pool') throw new Error('kanal köprüsü W.kanal kurmadı');
  if (!els['wNote'].textContent.includes(__APP.fmt(d.say.pool))) throw new Error('watchlist havuz sayısını süzmedi: ' + els['wNote'].textContent);
  /* pencere kartı → watchlist süzgeci */
  els['v-karar']._fire('click', { target: { closest: s => s === '.ufuk' ? { dataset: { p: 'p030' } } : null } });
  if (__APP.W.pencere !== 'p030' || __APP.W.kanal !== '') throw new Error('pencere köprüsü süzgeci değiştirmedi');
  if (!els['wNote'].textContent.includes(__APP.fmt(d.pen.p030.n))) throw new Error('watchlist 0–30 penceresini süzmedi');
  /* alarm satırı → parça detayı */
  const hedefIdx = d.alarm[0];
  els['v-karar']._fire('click', { target: { closest: s => s === '.alarmi' ? { dataset: { i: String(hedefIdx) } } : null } });
  if (__APP.W.sel !== hedefIdx) throw new Error('alarm köprüsü detay açmadı');
  /* transfer kartı → harita (depo kanalı önseçili) */
  els['v-karar']._fire('click', { target: { closest: s => s === '.tgo' ? { dataset: { i: String(d.fazla.idx[0]), h: 'TZX' } } : null } });
  if (!__APP.H.wp || __APP.H.wp.i !== d.fazla.idx[0]) throw new Error('transfer köprüsü haritayı kurmadı');
  els['v-harita']._fire('click', { target: { closest: sel => sel === '[data-wkapat]' ? {} : null } });
  /* süzgeç göstergesi temizlenebilir */
  __APP.W.kanal = 'tamir'; __APP.W.apply();
  if (!els['wKmf']._html.includes('Tamir')) throw new Error('süzgeç çipi görünmedi');
  els['v-watch']._fire('click', { target: { closest: s => s === '[data-kmf]' ? {} : null } });
  if (__APP.W.kanal !== '') throw new Error('süzgeç çipi temizlemedi');
});
step('parça detayı — önerilen aksiyon + karar kaydı', () => {
  const wclick = k => els['v-watch']._fire('click', { target: { closest: s => s === '.kbtn' ? { dataset: { k } } : null } });
  /* açığı olan bir PN bul (min33 > svc) — öneri "aksiyon gerekmiyor" değil gerçek kanal olmalı */
  const iAcik = DATA.pn.id.findIndex((_, i) => DATA.pn.min33[i] - DATA.pn.svc[i] > 3);
  if (iAcik < 0) throw new Error('açığı olan PN bulunamadı');
  __APP.W.showDetail(iAcik);
  const h = els['wDet']._html;
  for (const t of ['Önerilen aksiyon', '2033 tahmini yıllık ihtiyaç', 'Stok yetmeme riski', 'Risk skoru',
                   'Canlı stok yeterlilik seviyesi', 'karşılanma olasılığını',
                   'Tahmin: 2025 gerçekleşen ve 2033 çeyreklik profil', 'haritada göster'])
    if (!h.includes(t)) throw new Error('detayda eksik: ' + t);
  for (const t of ['Explainable', 'Neden kritik'])           // control-tower'dan alınmadı, geri gelmemeli
    if (h.includes(t)) throw new Error('kaldırılmış blok geri geldi: ' + t);
  /* öneri ile merdivendeki vurgulu satır aynı kanal olmalı — iki ekran çelişemez */
  const oneri = h.match(/<div class="ad"[^>]*>([^<]+)</)[1].trim();
  const vurgu = h.match(/class="step best"[\s\S]*?<span class="nm">([^<]+)/)[1].trim();
  if (oneri !== vurgu) throw new Error(`öneri "${oneri}" ≠ merdiven vurgusu "${vurgu}"`);
  if (!/%\d+<\/i> →/.test(h)) throw new Error('risk öncesi/sonrası yazılmadı');

  wclick('onay');
  if (!__APP.W.karar[iAcik]) throw new Error('karar kaydedilmedi');
  if (!els['wKarar']._html.includes('Karar kaydı')) throw new Error('karar satırı yazılmadı');
  wclick('talep');
  if (!/Satınalma talebi taslağı/.test(els['wKarar']._html)) throw new Error('satınalma taslağı yazılmadı');
  __APP.W.hedef = '';
  wclick('incele');                                          // hedefsiz rota çizilmemeli
  if (__APP.H.wp) throw new Error('hedef seçilmeden haritaya atladı');
  wclick('yoksay');
  if (__APP.W.karar[iAcik]) throw new Error('yoksay kaydı silmedi');

  /* açığı olmayan PN: aksiyon önerilmez, risk tek değer gösterilir */
  const iBol = DATA.pn.id.findIndex((_, i) => DATA.pn.svc[i] > DATA.pn.min33[i] + 5);
  __APP.W.showDetail(iBol);
  if (!els['wDet']._html.includes('Aksiyon gerekmiyor')) throw new Error('açıksız PN için aksiyon önerildi');
});
step('PN-önekli arama eşleşir', () => {
  __APP.W.reset(); __APP.W.apply();               // önceki adımların filtrelerini temizle
  els['wQ'].value = 'PN-101741'; els['wQ']._fire('input', { target: els['wQ'] });
  if (!els['wNote'].textContent.includes('1 parça')) throw new Error('eşleşme yok: ' + els['wNote'].textContent);
});
step('OEM preset kuculDem etkisi', () => {
  const r = __APP.senaryoHesap(__APP.PRESETS.oem);
  if (!(r.kir > 134)) throw new Error('OEM preset kırmızıyı artırmadı: ' + r.kir);
  console.log('   OEM gecikmesi: kırmızı 134→' + r.kir);
});
step('ROI payload tablosu dolu', () => {
  if (!DATA.roi || DATA.roi.id.length !== 40) throw new Error('roi eksik');
  const t = DATA.roi.tasarruf.reduce((a,b)=>a+b,0);
  if (!(t > 1e6)) throw new Error('tasarruf toplamı anlamsız: ' + t);
});

/* yeni özellikler: payload */
step('abcxyz matrisi 5000 PN', () => {
  const t = DATA.abcxyz.sayi.flat().reduce((a,b)=>a+b,0);
  if (t !== 5000) throw new Error('toplam ' + t);
});
step('159 hurda anomalisi / 150 pool bağımlı', () => {
  if (DATA.kpi.scrap_anomali !== 159) throw new Error('kpi anomali ' + DATA.kpi.scrap_anomali);
  if (DATA.kpi.pool_bagimli !== 150) throw new Error('kpi pool ' + DATA.kpi.pool_bagimli);
  const b6 = DATA.pn.flags.filter(f => f & 64).length, b7 = DATA.pn.flags.filter(f => f & 128).length;
  if (b6 !== 159 || b7 !== 150) throw new Error('bayrak bitleri ' + b6 + '/' + b7);
});
step('tahmin gezgini verisi tam', () => {
  if (DATA.pn.q4.length !== 5000) throw new Error('q4 eksik');
  const nn = DATA.pn.nn4.filter(v => v != null).length;
  if (nn !== 5000) throw new Error('nn4 dolu değil: ' + nn);
});
step('model bazında talep grafiği — payload + render', () => {
  const m = DATA.model;
  for (const k of ['ad','t25','t33','u25','u33'])
    if (!m[k] || m[k].length !== 14) throw new Error('model.' + k + ' 14 uzunlukta değil');
  /* 2033 talebine göre azalan sıralı olmalı (grafik bu sırayı varsayıyor) */
  for (let i = 1; i < m.t33.length; i++)
    if (m.t33[i] > m.t33[i-1]) throw new Error('model listesi t33 sırasında değil');
  /* yeni nesil artmalı, küçülen klasikler azalmalı */
  const yeniIdx = m.ad.map((_, i) => i).filter(i => m.yeni[i]);
  const kuculIdx = m.ad.map((_, i) => i).filter(i => m.kucul[i]);
  if (!yeniIdx.every(i => m.t33[i] > m.t25[i])) throw new Error('yeni nesilde talep artmıyor');
  if (!kuculIdx.every(i => m.t33[i] < m.t25[i])) throw new Error('küçülen klasiklerde talep azalmıyor');
  const h = els['v-ongoru']._html;
  if (!h.includes('Model bazında yıllık talep')) throw new Error('kart render edilmedi');
  if (!h.includes('cModel')) throw new Error('cModel canvas yok');
  console.log(`   14 model · en büyük ${m.ad[0]} ${__APP.fmt(m.t25[0])}→${__APP.fmt(m.t33[0])} · yeni nesil ${yeniIdx.length}, küçülen ${kuculIdx.length}`);
});
step('kaldırılan öngörü bölümleri geri gelmemiş', () => {
  const h = els['v-ongoru']._html;
  for (const t of ['Talep aralığı', 'Emekli filo planlayıcısı', 'Hata analizi', 'Cold-start'])
    if (h.includes(t)) throw new Error('kaldırılan bölüm geri gelmiş: ' + t);
  for (const k of ['coldstart', 'mlSeg', 'pareto', 'riskHist', 'ttsHist', 'fmvClpHist'])
    if (k in DATA) throw new Error('ölü payload alanı hâlâ üretiliyor: DATA.' + k);
});

/* yeni özellikler: parametre paneli (senaryo render edildi) */
step('parametre paneli varsayılanları 134 üretir', () => {
  const html = els['pK']._html;
  if (!html.includes('134')) throw new Error('kırmızı 134 görünmüyor');
  if (!html.includes('338')) throw new Error('BER 338 görünmüyor');
  if (!els['pTop']._html.includes('PN-101741')) throw new Error('top-1 PN-101741 değil');
});
step('parametre kaydırıcısı canlı yeniden hesap', () => {
  els['pTam'].value = '20'; els['pTam']._fire('input', { target: els['pTam'] });
  if (!(parseInt((els['pK']._html.match(/>([\d.]+)</) || [])[1]) !== 134 || els['pK']._html.includes('baz 134')))
    throw new Error('tampon etkisi görünmüyor');
  els['pSifirla']._fire('click', {});
  if (!els['pK']._html.includes('134')) throw new Error('sıfırlama çalışmadı');
});

/* yeni özellikler: harita */
step('harita dünya zemini + depo katmanı kuruldu', () => {
  const HA = DATA.harita;
  if (!HA.depo || HA.depo.length !== 25) throw new Error('depo katmanı yok');
  if (HA.depo[HA.kod.indexOf('IST')] !== 'ana_depo') throw new Error('IST ana depo değil');
  if (!HA.rota || HA.rota.length !== 4 || HA.rota[0].parcalar.length !== 5)
    throw new Error('rota senaryoları eksik');
  const p0 = HA.rota[0].parcalar[0];
  if (!p0.pool || !p0.pool.length || p0.alim == null) throw new Error('pool/satın alma kanalları eksik');
});
step('havalimanı mutabakatı — case tablosu birebir', () => {
  const HA = DATA.harita;
  if (HA.kod.length !== 25) throw new Error('25 havalimanı bekleniyordu: ' + HA.kod.length);
  const s25 = HA.u25.reduce((a,b)=>a+b,0), s33 = HA.u33.reduce((a,b)=>a+b,0);
  if (s25 !== 1200 || s33 !== 2000) throw new Error('filo toplamı ' + s25 + '/' + s33);
  HA.grup.kod.forEach((g, gi) => {
    const g25 = HA.kod.reduce((a,_,i)=>a+(HA.grp[i]===g?HA.u25[i]:0),0);
    const g33 = HA.kod.reduce((a,_,i)=>a+(HA.grp[i]===g?HA.u33[i]:0),0);
    if (g25 !== HA.grup.u25[gi] || g33 !== HA.grup.u33[gi])
      throw new Error(g + ' grubu tutmuyor: ' + g25 + '/' + HA.grup.u25[gi]);
  });
  const p25 = HA.pay25.reduce((a,b)=>a+b,0);
  if (Math.abs(p25 - 1) > .01) throw new Error('pay25 toplamı ' + p25);
});
step('parça rotası katmanı', () => {
  const fire = t => els['v-harita']._fire('click', { target: { closest: sel => sel === '.tg' ? { dataset: { t } } : null } });
  fire('rota'); if (!__APP.H.rota) throw new Error('rota katmanı açılmadı');
  if (!els['hRota']._html.includes('Kritik yol')) throw new Error('rota paneli dolmadı');
  fire('rota'); if (__APP.H.rota) throw new Error('rota kapanmadı');
});
step('watchlist → haritada göster köprüsü', () => {
  __APP.H._parcaGoster(0, 'AYT', 'pool');
  if (!__APP.H.wp) throw new Error('wp kurulmadı');
  if (!els['hRota']._html.includes('seçili parça')) throw new Error('wp paneli dolmadı');
  if (__APP.H.rk == null) throw new Error('kanal önseçimi yapılmadı');
  els['v-harita']._fire('click', { target: { closest: sel => sel === '[data-wkapat]' ? {} : null } });
  if (__APP.H.wp) throw new Error('kapat çalışmadı');
});
step('gezgin THY/Pool kırılımı + ATA sözlüğü', () => {
  if (DATA.pn.tq1.length !== 5000) throw new Error('tq1 eksik');
  for (const i of [0, 100, 4999]){
    const q = [DATA.pn.q1[i],DATA.pn.q2[i],DATA.pn.q3[i],DATA.pn.q4[i]];
    const t = [DATA.pn.tq1[i],DATA.pn.tq2[i],DATA.pn.tq3[i],DATA.pn.tq4[i]];
    t.forEach((v,n)=>{ if (v > q[n]) throw new Error('THY > toplam: PN idx ' + i); });
  }
  if (DATA.lookup.ata.length !== DATA.lookup.sub.length) throw new Error('ata sözlüğü eksik');
});
step('rota senaryo değişimi', () => {
  els['v-harita']._fire('click', { target: { closest: sel => sel === '.rsc' ? { dataset: { rs: '2' } } : null } });
  if (__APP.H.rsen !== 2) throw new Error('senaryo değişmedi');
  els['v-harita']._fire('click', { target: { closest: sel => sel === '.rsc' ? { dataset: { rs: '0' } } : null } });
});
step('harita kriz katmanı + 2033 + akış', () => {
  const fire = t => els['v-harita']._fire('click', { target: { closest: sel => sel === '.tg' ? { dataset: { t } } : null } });
  fire('kriz'); if (!__APP.H.kriz) throw new Error('kriz katmanı açılmadı');
  fire('yil33'); if (!__APP.H.yil33) throw new Error('2033 anahtarı açılmadı');
  fire('akis'); if (!__APP.H.akis) throw new Error('akış okları açılmadı');
  fire('kriz'); fire('yil33'); fire('akis');
});


step('derin analiz payload — MC/tornado/opt/backtest', () => {
  if (!(DATA.mc.uyum > 95)) throw new Error('MC uyumu düşük: ' + DATA.mc.uyum);
  if (!(DATA.mc.motor.acik_ort > DATA.mc.baz.acik_ort)) throw new Error('kriz MC baz altında');
  if (DATA.tornado.etiket.length !== 4) throw new Error('tornado 4 faktör değil');
  DATA.tornado.etiket.forEach((_, i) => {
    if (DATA.tornado.dusuk[i] > DATA.tornado.yuksek[i]) throw new Error('tornado ucu ters');
  });
  const son = DATA.opt.kapanan[DATA.opt.kapanan.length - 1];
  if (son !== DATA.kpi.acik33) throw new Error('opt kapanan ' + son + ' ≠ acik33 ' + DATA.kpi.acik33);
  if (DATA.opt.ilk10.length !== 10) throw new Error('ilk10 eksik');
  for (let i = 1; i < DATA.opt.butce.length; i++)
    if (DATA.opt.butce[i] < DATA.opt.butce[i-1]) throw new Error('bütçe eğrisi monoton değil');
  if (!(DATA.backtest.toplam_hata[3] < 2)) throw new Error('mevsimli toplam hata beklenenden büyük');
});
step('analiz kartları gömülü', () => {
  const all = Object.values(els).map(e => e._html).join(' ');
  if (!all.includes('Belirsizlik denemeleri')) throw new Error('belirsizlik bölümü yok');
  if (!all.includes('Kaynak önceliklendirme')) throw new Error('opt kartı yok');
  if (!all.includes('Geriye dönük test')) throw new Error('backtest kartı yok');
  if (all.includes('GERİ YAZMA YOK')) throw new Error('mimari SVG geri gelmiş — sade sürümde olmamalı');
  /* kullanıcı yasakladı: "Monte Carlo" adı hiçbir ekranda geçmemeli */
  if (/Monte\s*Carlo/i.test(all)) throw new Error('yasaklı ad "Monte Carlo" ekranda görünüyor');
  /* kesilen düşük bilgili bloklar geri gelmemeli */
  if (all.includes('Kıtlık sensörü')) throw new Error('FMV/CLP kıtlık sensörü geri gelmiş');
  if (all.includes('Filo kaydırıcısı')) throw new Error('filo kaydırıcısı geri gelmiş');
});
step('belirsizlik motoru — kapalı form payload ile tutarlı', () => {
  const b = __APP.belirsizlik(__APP.PRESETS.baz, 9);
  const d = DATA.mc.baz;
  if (Math.abs(b.ort - d.acik_ort) > 6) throw new Error(`baz ortalama ${b.ort.toFixed(1)} ≠ payload ${d.acik_ort}`);
  if (Math.abs(b.mal/1e6 - d.ek_ort) / d.ek_ort > 0.06) throw new Error(`baz maliyet ${(b.mal/1e6).toFixed(2)} ≠ payload ${d.ek_ort}`);
  const m = __APP.belirsizlik(__APP.PRESETS.motor, 9);
  if (Math.abs(m.ort - DATA.mc.motor.acik_ort) > 12) throw new Error(`motor ortalama ${m.ort.toFixed(1)} ≠ ${DATA.mc.motor.acik_ort}`);
  if (!(m.ort > b.ort * 1.7)) throw new Error('motor krizi belirsizliği yeterince büyütmüyor');
  /* aralık genişliği güven seviyesiyle artmalı */
  const [a80, b80] = b.aralik(80), [a95, b95] = b.aralik(95);
  if (!(b95 - a95 > b80 - a80)) throw new Error('%95 aralık %80’den geniş değil');
  /* belirsizliğin çoğu Poisson gürültüsünden gelmeli, talep bandından değil */
  if (!(b.bantPayi > 2 && b.bantPayi < 40)) throw new Error('bant payı beklenen aralıkta değil: ' + b.bantPayi.toFixed(1));
  /* CDF monoton ve 0–1 arası */
  let onceki = -1;
  for (let x = b.ort - 3*b.sd; x <= b.ort + 3*b.sd; x += b.sd/4) {
    const v = b.cdf(x);
    if (v < onceki - 1e-9) throw new Error('CDF monoton değil');
    if (v < 0 || v > 1) throw new Error('CDF 0–1 dışında');
    onceki = v;
  }
  console.log(`   baz ${b.ort.toFixed(0)} PN (%80 ${b.aralik(80).map(v=>v.toFixed(0)).join('–')}) · ${(b.mal/1e6).toFixed(1)}M$ · bant payı %${b.bantPayi.toFixed(0)} | motor ${m.ort.toFixed(0)} PN`);
});


step('sözlük — açılış, arama, kapanış', () => {
  els['dicBtn']._fire('click', {});
  if (!els['dicBox'].classList.contains('on')) throw new Error('sözlük açılmadı');
  if ((els['dicList']._html.match(/dic-row/g) || []).length < 30) throw new Error('terim sayısı eksik');
  els['dicQ'].value = 'toparlanma'; els['dicQ']._fire('input', { target: els['dicQ'] });
  if (!els['dicList']._html.includes('TTR')) throw new Error('arama TTR bulamadı');
  if ((els['dicList']._html.match(/dic-row/g) || []).length > 3) throw new Error('arama filtrelemedi');
  els['dicQ'].value = 'zzzz'; els['dicQ']._fire('input', { target: els['dicQ'] });
  if (!els['dicList']._html.includes('Eşleşme yok')) throw new Error('boş sonuç mesajı yok');
  els['dicX']._fire('click', {});
  if (els['dicBox'].classList.contains('on')) throw new Error('sözlük kapanmadı');
});

/* Türkçe format akıl sağlığı */
step('tr-TR sayı formatı', () => {
  if (__APP.fmt(90016) !== '90.016') throw new Error(__APP.fmt(90016));
  if (__APP.f1(63.2) !== '63,2') throw new Error(__APP.f1(63.2));
});

/* runtime string doğrulamaları */
step('render: BER virgül + $12,1M + ROI', () => {
  const all = Object.values(els).map(e => e._html).join(' ') + ' ' + injected.join(' ');
  if (!all.includes('BER eşiği 0,65')) throw new Error('footer BER eşiği 0,65 render edilmedi');
  if (!all.includes('$12,1M')) throw new Error('$12,1M render edilmedi');
  if (all.includes('12,2M')) throw new Error('12,2M hâlâ görünüyor');
  /* tr-TR iyelik eki gerçekten render ediliyor mu (eski %39,2'si kokpitteydi, kaldırıldı) */
  if (!all.includes("%14,6'ı")) throw new Error("14,6'ı eki render edilmedi");
});

console.log('\ncharts oluşturuldu:', charts.length);
if (issues.length) { console.log('\n⚠ ŞÜPHELİ İÇERİK (' + issues.length + '):'); [...new Set(issues)].slice(0, 25).forEach(s => console.log('  -', s)); process.exitCode = 1; }
else console.log('⚠ şüpheli içerik yok');
console.log(process.exitCode ? '\nSONUÇ: SORUN VAR' : '\nSONUÇ: TEMİZ');
