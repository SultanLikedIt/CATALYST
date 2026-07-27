/**
 * PARİTE TESTİ — web uygulamasının hesap çekirdeği, catalyst.html'in ürettiği
 * sayıların birebir aynısını vermeli. Beklenen değerler CLAUDE.md §3 ve
 * smoke_test.js'ten alındı; hiçbiri bu dosyada türetilmiyor, hepsi sabit.
 *
 * Bu testin amacı "kod çalışıyor mu" değil: taşıma sırasında tek bir sayının
 * kayıp gitmediğini kanıtlamak.
 */
import { describe, it, expect } from 'vitest';
import { D, K, PN, NPN } from '@/data/payload';
import { kararMotoru } from './karar';
import {
  senaryoHesap,
  belirsizlik,
  paramHesap,
  PRESETS,
  PARAM_BAZ,
  BAZ_CFG,
  ttsDagilim,
} from './senaryo';
import { poisCdf, poissonMin, eksikMoment, invNorm } from './stats';
import { kanalSec, ladderOps } from './ladder';
import { FL, hasF, DURUM } from './flags';
import { fmt, mM, pct, f1, foldTr } from './format';

describe('veri paketi — CLAUDE.md §3 mutabakatı', () => {
  it('çekirdek sayılar', () => {
    expect(K.pn).toBe(5000);
    expect(NPN).toBe(5000);
    expect(K.talep25).toBe(90016);
    expect(K.svc_adet).toBe(27275);
    expect(K.tamirde_adet).toBe(7800);
    expect(K.toplam_adet).toBe(48200);
    expect(K.gayrifaal_adet).toBe(4803);
    expect(K.kirmizi).toBe(134);
    expect(K.siparissiz).toBe(72);
    expect(K.siparissiz_aog).toBe(11);
    expect(K.risk_listesi).toBe(547);
    expect(K.uclu).toBe(181);
    expect(K.scrap_anomali).toBe(159);
    expect(K.pool_bagimli).toBe(150);
    expect(K.ber_pn).toBe(338);
  });

  it('para muslukları ve float doğrulaması', () => {
    expect(K.fmv).toBe(132.9);
    expect(K.clp).toBe(304.2);
    expect(K.scrap_butce).toBe(67.8);
    expect(K.phaseout).toBe(52);
    expect(K.kab_tasarruf).toBe(12.1);
    expect(K.kab_sermaye).toBe(4);
    // float formülü ↔ gerçek tamirde adedi: %97 isabet (sunumun en güçlü kozu)
    expect(K.float_adet).toBe(8012);
    expect(K.float_adet / K.tamirde_adet).toBeCloseTo(1.027, 2);
  });

  it('2033 projeksiyonu bant olarak sunulur, nokta tahmin yok', () => {
    expect(D.band.alt_pct).toBeCloseTo(63.2, 1);
    expect(D.band.ust_pct).toBeCloseTo(67.5, 1);
    expect(D.band.alt).toBeLessThan(D.band.ust);
  });

  it('pn dizileri risk skoruna göre azalan sıralı', () => {
    for (let i = 1; i < NPN; i++) expect(PN.risk[i]).toBeLessThanOrEqual(PN.risk[i - 1]);
    expect(PN.id[0]).toBe('101741'); // risk skoru 1 numarası, envanterde fiilen kırmızı
    expect(hasF(0, FL.KIRMIZI)).toBe(true);
  });
});

describe('karar motoru — 5.000 parça tek kanala düşer', () => {
  const d = kararMotoru();

  it('kanal dağılımı watchlist önerisiyle aynı kod yolundan gelir', () => {
    expect(d.say.pool).toBe(694);
    expect(d.say.tamir).toBe(641);
    expect(d.say.alim).toBe(217);
    expect(d.say.izle).toBe(3448);
    expect(d.say.pool + d.say.tamir + d.say.alim + d.say.izle).toBe(NPN);
  });

  it('sipariş penceresi alarmı: penceresi geçmiş + siparişsiz', () => {
    expect(d.alarm.length).toBe(42);
    expect(d.pen.gecmis.sip0).toBe(42);
    // en geciken önce sıralı
    for (let i = 1; i < d.alarm.length; i++)
      expect(d.kalan[d.alarm[i]]).toBeGreaterThanOrEqual(d.kalan[d.alarm[i - 1]]);
    // alarmdaki her parçanın açık siparişi gerçekten yok
    d.alarm.forEach((i) => expect(PN.po[i]).toBe(0));
  });

  it('planlama ufku pencereleri tüm portföyü kapsar', () => {
    const t = d.pen.gecmis.n + d.pen.p030.n + d.pen.p3090.n + d.pen.p90.n;
    expect(t).toBe(NPN);
  });

  it('fazla stok dengeleme — şişkinlik miti (adet sorunu değil)', () => {
    expect(d.fazla.n).toBeGreaterThan(0);
    expect(d.fazla.deger / 1e6).toBeCloseTo(4.5, 0);
  });
});

describe('senaryo motoru — kriz = parametre şoku', () => {
  it('baz durum kırmızı listeyi yeniden üretir', () => {
    const r = senaryoHesap(BAZ_CFG);
    expect(r.kir).toBe(134);
    expect(r.kirAog).toBe(22);
    expect(r.byKr.reduce((a, b) => a + b, 0)).toBe(134);
  });

  it('motor ailesi krizi: 134 → 477', () => {
    expect(senaryoHesap(PRESETS.motor).kir).toBe(477);
  });

  it('OEM gecikmesi küçülen modellerin talebini sürdürür: 134 → 283', () => {
    expect(senaryoHesap(PRESETS.oem).kir).toBe(283);
  });

  it('her senaryo baz durumdan daha kötü ya da eşit', () => {
    const baz = senaryoHesap(BAZ_CFG).kir;
    Object.values(PRESETS).forEach((p) => expect(senaryoHesap(p).kir).toBeGreaterThanOrEqual(baz));
  });

  it('dayanıklılık dağılımı tüm aktif parçaları kapsar', () => {
    const t = ttsDagilim(BAZ_CFG).reduce((a, b) => a + b, 0);
    expect(t).toBe(K.aktif_pn);
  });
});

describe('belirsizlik motoru — kapalı form ↔ build sırasındaki denemeler', () => {
  const b = belirsizlik(BAZ_CFG);

  it('baz durum: beklenen açık parça sayısı ve fatura', () => {
    expect(Math.round(b.ort)).toBe(389);
    expect(b.mal / 1e6).toBeCloseTo(9.8, 1);
    // kötü giden %10 her zaman ortalamadan pahalı
    expect(b.kuyruk).toBeGreaterThan(b.mal);
  });

  it('%80 aralığı', () => {
    const [lo, hi] = b.aralik(80);
    expect(Math.round(lo)).toBe(371);
    expect(Math.round(hi)).toBe(408);
  });

  it('belirsizliğin kaynağı ayrışıyor: talep bandı vs rastgele arıza', () => {
    expect(b.bantPayi).toBeGreaterThan(5);
    expect(b.bantPayi).toBeLessThan(25);
  });

  it('motor krizinde açık parça sayısı iki katına çıkar', () => {
    expect(Math.round(belirsizlik(PRESETS.motor).ort)).toBe(797);
  });

  it('numpy ile koşulan 800 denemeye yakınsıyor (payload.mc)', () => {
    // build sırasında ayrı kodla (numpy) hesaplanan uyum skoru
    expect(D.mc.uyum).toBeGreaterThan(99);
    // kapalı formun ortalaması, denemelerin ortalamasının ±%10 bandında
    const fark = Math.abs(b.ort - D.mc.baz.acik_ort) / D.mc.baz.acik_ort;
    expect(fark).toBeLessThan(0.1);
  });

  it('cdf monoton ve 0–1 arasında', () => {
    const xs = [200, 300, 389, 450, 600];
    let onceki = 0;
    xs.forEach((x) => {
      const v = b.cdf(x);
      expect(v).toBeGreaterThanOrEqual(onceki);
      expect(v).toBeLessThanOrEqual(1);
      onceki = v;
    });
  });
});

describe('canlı parametre paneli', () => {
  it('varsayılanlar baz sonucu verir', () => {
    const r = paramHesap(PARAM_BAZ);
    expect(r.kir).toBe(134);
    expect(r.kirAog).toBe(22);
    expect(r.berN).toBe(K.ber_pn);
    expect(r.top[0]).toBe(0); // risk 1 numarası = PN-101741
  });

  it('alarm tamponu büyüdükçe kırmızı sayısı artar', () => {
    const a = paramHesap({ ...PARAM_BAZ, tampon: 0 }).kir;
    const b = paramHesap({ ...PARAM_BAZ, tampon: 14 }).kir;
    expect(b).toBeGreaterThan(a);
  });

  it('AOG ağırlığı artınca liste yeniden sıralanır', () => {
    const baz = paramHesap(PARAM_BAZ).top;
    const agir = paramHesap({ ...PARAM_BAZ, w0: 6 }).top;
    expect(agir).not.toEqual(baz);
  });

  it('BER eşiği düşünce aday sayısı artar', () => {
    expect(paramHesap({ ...PARAM_BAZ, ber: 0.4 }).berN).toBeGreaterThan(
      paramHesap({ ...PARAM_BAZ, ber: 0.9 }).berN,
    );
  });
});

describe('aksiyon merdiveni', () => {
  it('süreye göre sıralı ve en hızlı gerçek kanal seçilir', () => {
    const { ops, best } = kanalSec(0);
    for (let i = 1; i < ops.length; i++) expect(ops[i].gun).toBeGreaterThanOrEqual(ops[i - 1].gun);
    expect(best.t).not.toBe('sokum'); // söküm kanal değil, köprü
  });

  it('BER adayında tamir kanalları elenir', () => {
    const i = PN.id.findIndex((_, ix) => hasF(ix, FL.BER) && PN.ato[ix] === 1);
    expect(i).toBeGreaterThan(-1);
    const { best } = kanalSec(i);
    expect(['ictamir', 'distamir', 'hizli']).not.toContain(best.t);
  });

  it('her parçada en az bir seçenek var', () => {
    for (let i = 0; i < NPN; i += 137) expect(ladderOps(i).length).toBeGreaterThan(0);
  });

  it('durum önceliği: siparişsiz > kırmızı > 547 > BER', () => {
    for (let i = 0; i < NPN; i += 211) {
      const d = DURUM[i];
      if (hasF(i, FL.SIP)) expect(d).toBe(4);
      else if (hasF(i, FL.KIRMIZI)) expect(d).toBe(3);
    }
  });
});

describe('olasılık çekirdeği', () => {
  it('poisCdf sınırlar', () => {
    expect(poisCdf(0, 0)).toBe(1);
    expect(poisCdf(5, -1)).toBe(0);
    expect(poisCdf(3, 0)).toBeCloseTo(Math.exp(-3), 6);
    expect(poisCdf(2, 100)).toBeCloseTo(1, 6);
  });

  it('poissonMin servis hedefini karşılar', () => {
    [0.9, 0.95, 0.98].forEach((h) => {
      [0.5, 2, 8, 40].forEach((mu) => {
        expect(poisCdf(mu, poissonMin(mu, h))).toBeGreaterThanOrEqual(h - 1e-9);
      });
    });
  });

  it('yüksek hacimde normal yaklaşıma geçer (taşma yok)', () => {
    expect(Number.isFinite(poissonMin(500, 0.98))).toBe(true);
    expect(Number.isFinite(poisCdf(500, 480))).toBe(true);
  });

  it('eksikMoment: E[(D−s)+] beklenen davranış', () => {
    expect(eksikMoment(5, 100)[0]).toBeCloseTo(0, 6);
    const [e1, e2] = eksikMoment(10, 0);
    expect(e1).toBeCloseTo(10, 3); // s=0 → E[D] = mu
    expect(e2).toBeGreaterThan(e1);
  });

  it('invNorm bilinen kuantiller', () => {
    expect(invNorm(0.975)).toBeCloseTo(1.96, 3);
    expect(invNorm(0.5)).toBeCloseTo(0, 6);
  });
});

describe('tr-TR biçimleme', () => {
  it('ondalık virgül, binlik nokta', () => {
    expect(fmt(90016)).toBe('90.016');
    expect(f1(23.3)).toBe('23,3');
    expect(mM(132.9)).toBe('$132,9M');
    expect(pct(67.5)).toBe('%67,5');
  });

  it('Türkçe arama katlaması', () => {
    expect(foldTr('Şasi Bağlantısı')).toBe('sasi baglantisi');
    expect(foldTr('İÇ TAMİR')).toBe('ic tamir');
  });
});
