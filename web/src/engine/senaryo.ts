/**
 * SENARYO + BELİRSİZLİK MOTORU
 *
 * Her kriz ya stoğun dayanma süresini (TTS) kısaltır ya da tedarik süresini (TTR)
 * uzatır. Bu yüzden kriz = parametre şoku; senaryo kütüphanesi bu iki değişkeni
 * oynatır ve 5.000 parça anında yeniden hesaplanır (CLAUDE.md §7.3).
 */
import { PN, NPN, PRM, B } from '@/data/payload';
import { FL, hasF } from './flags';
import { poissonMin, poisCdf, eksikMoment, Z } from './stats';

export interface SenaryoCfg {
  /** genel talep şoku (%) */
  d: number;
  /** tedarik / TAT şoku (%) */
  l: number;
  /** servis hedefi sıkılaştırma (puan) */
  s: number;
  /** yeni nesil talep çarpanı (0 = etkisiz) */
  yeniDem: number;
  /** küçülen modeller talep çarpanı (0 = etkisiz) */
  kuculDem: number;
  /** TAT şoku yalnız dışa bağımlı parçalara uygulansın */
  disOnly: boolean;
}

export interface Preset extends SenaryoCfg {
  ad: string;
  not: string;
}

export const PRESETS: Record<string, Preset> = {
  baz: {
    d: 0,
    l: 0,
    s: 0,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: false,
    ad: 'Baz durum',
    not: 'Bugünkü parametreler. Kırmızı liste burada doğrulanır.',
  },
  motor: {
    d: 0,
    l: 30,
    s: 0,
    yeniDem: 1.5,
    kuculDem: 0,
    disOnly: true,
    ad: 'Motor ailesi krizi',
    not: "Yeni nesil talebi 1,5 kat, dış tamir süresi 1,3 kat artıyor. 2033 filosunun %64'ü beş yeni nesil modelde toplandığı için risk de yoğunlaşıyor.",
  },
  pandemi: {
    d: 20,
    l: 50,
    s: 0,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: false,
    ad: 'Pandemi tipi şok',
    not: 'Talep %20 sıçrıyor, aynı anda tamir istasyonları kapasite kaybediyor ve tedarik süresi 1,5 kat uzuyor.',
  },
  oem: {
    d: 0,
    l: 15,
    s: 0,
    yeniDem: 0,
    kuculDem: 1.25,
    disOnly: true,
    ad: 'OEM teslimat gecikmesi',
    not: 'Yeni uçaklar gecikince klasik filo geç emekli oluyor, küçülen 4 modelin talebi 1,25 kat sürüyor. Sinyale bağlı plan kendini yavaşlatır, takvime bağlı plan çökerdi.',
  },
  lojistik: {
    d: 0,
    l: 60,
    s: 0,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: true,
    ad: 'Lojistik krizi',
    not: 'Dış tamir ve satın alma kuyrukları %60 uzuyor. Satın alma süresinin 270 güne çıkabildiğini hatırlatır.',
  },
  patlama: {
    d: 40,
    l: 20,
    s: 10,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: false,
    ad: 'Talep patlaması',
    not: 'Genel talep %40 artıyor, hafif tedarik gerginliği var ve servis hedefi sıkılaştırılıyor.',
  },
};

export const BAZ_CFG: SenaryoCfg = { d: 0, l: 0, s: 0, yeniDem: 0, kuculDem: 0, disOnly: false };

export interface SenaryoSonuc {
  kir: number;
  kirAog: number;
  /** kırmızıları TTR seviyesine çıkarma maliyeti (USD) */
  kap: number;
  /** 2033 MIN seviyesinin altında kalan parça sayısı */
  acik: number;
  /** açığı kapatma maliyeti (USD) */
  ek: number;
  /** kritiklik sınıfına göre kırmızı dağılımı */
  byKr: [number, number, number];
}

/** Parça başına talep çarpanı — senaryo alt kümeleri burada ayrışır. */
function talepCarpani(i: number, cfg: SenaryoCfg): number {
  let m = 1 + cfg.d / 100;
  if (cfg.yeniDem && hasF(i, FL.YENI)) m *= cfg.yeniDem;
  if (cfg.kuculDem && hasF(i, FL.PO)) m *= cfg.kuculDem;
  return m;
}

/** Parça başına TAT çarpanı — "yalnız dışa bağımlı" seçeneği burada uygulanır. */
function tatCarpani(i: number, cfg: SenaryoCfg): number {
  const dis = PN.ato[i] === 0;
  return cfg.disOnly && !dis ? 1 : 1 + cfg.l / 100;
}

export function senaryoHesap(cfg: SenaryoCfg): SenaryoSonuc {
  let kir = 0;
  let kirAog = 0;
  let kap = 0;
  let acik = 0;
  let ek = 0;
  const byKr: [number, number, number] = [0, 0, 0];

  for (let i = 0; i < NPN; i++) {
    const mDem = talepCarpani(i, cfg);
    const mTat = tatCarpani(i, cfg);
    const t = PN.t25[i];
    if (t > 0) {
      const lam = (t * mDem) / 365;
      const tts = PN.svc[i] / lam;
      const ttr = PN.ttr[i] * mTat;
      if (tts < ttr + PRM.alarm_tamponu) {
        kir++;
        byKr[PN.kr[i]]++;
        if (PN.kr[i] === 0) kirAog++;
        kap += (ttr - tts) * lam * PN.clp[i];
      }
    }
    const mu = ((PN.rate33[i] * mDem * PN.lead[i] * mTat) / PRM.ceyrek_gun) as number;
    const min = poissonMin(mu, Math.min(0.995, PN.sh[i] + cfg.s / 100));
    if (PN.svc[i] < min) {
      acik++;
      ek += (min - PN.svc[i]) * PN.clp[i];
    }
  }
  return { kir, kirAog, kap, acik, ek, byKr };
}

/** Bir parçanın tedarik penceresi boyunca beklenen 2033 talebi (senaryo altında). */
export function senaryoMu(i: number, cfg: SenaryoCfg): number {
  return (PN.rate33[i] * talepCarpani(i, cfg) * PN.lead[i] * tatCarpani(i, cfg)) / PRM.ceyrek_gun;
}

export interface Belirsizlik {
  /** beklenen açıkta kalan parça sayısı */
  ort: number;
  sd: number;
  /** beklenen fatura (USD) */
  mal: number;
  malSd: number;
  /** kötü giden %10'un ortalaması (USD) */
  kuyruk: number;
  /** varyansın yüzde kaçı talep bandından geliyor */
  bantPayi: number;
  aralik: (g: number) => [number, number];
  cdf: (x: number) => number;
}

/**
 * BELİRSİZLİK DENEMELERİ — açıkta kalan parça sayısı bağımsız Bernoulli'lerin
 * toplamıdır (Poisson-binom): ortalama Σp, varyans Σp(1−p); yüzdelikler merkezi
 * limit yaklaşımıyla. Örnekleme yapmadan aynı sonucu verir, tarayıcıda ~2 ms.
 *
 * Talep bandı G noktalı ızgarayla taranır → belirsizliğin kaynağı ikiye ayrışır:
 * "bilmediğimiz büyüme" (bant) ve "doğası gereği rastgele arıza" (Poisson).
 */
export function belirsizlik(cfg: SenaryoCfg, G = 9): Belirsizlik {
  const uLo = B.alt / B.motor;
  const uHi = B.ust / B.motor;
  const ms: number[] = [];
  const vs: number[] = [];
  const cs: number[] = [];
  const cvs: number[] = [];

  for (let g = 0; g < G; g++) {
    const u = G === 1 ? (uLo + uHi) / 2 : uLo + (g / (G - 1)) * (uHi - uLo);
    let m = 0;
    let v = 0;
    let c = 0;
    let cv = 0;
    for (let i = 0; i < NPN; i++) {
      const mu = senaryoMu(i, cfg) * u;
      const s = PN.svc[i];
      const clp = PN.clp[i];
      const p = 1 - poisCdf(mu, s);
      m += p;
      v += p * (1 - p);
      const [e1, e2] = eksikMoment(mu, s);
      c += e1 * clp;
      cv += Math.max(0, e2 - e1 * e1) * clp * clp; // parçalar bağımsız → varyanslar toplanır
    }
    ms.push(m);
    vs.push(v);
    cs.push(c);
    cvs.push(cv);
  }

  const ort = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const mOrt = ort(ms);
  const cOrt = ort(cs);
  const vBant = ort(ms.map((x) => (x - mOrt) ** 2));
  const vPois = ort(vs);
  const cvBant = ort(cs.map((x) => (x - cOrt) ** 2));
  const cvPois = ort(cvs);
  const sd = Math.sqrt(vBant + vPois);
  const malSd = Math.sqrt(cvBant + cvPois);
  /* en kötü %10'un ortalaması: normal yaklaşımda ort + sd·φ(z90)/0,10 */
  const KUYRUK = 1.755;

  return {
    ort: mOrt,
    sd,
    mal: cOrt,
    malSd,
    kuyruk: cOrt + KUYRUK * malSd,
    bantPayi: (100 * vBant) / Math.max(vBant + vPois, 1e-9),
    aralik: (g: number) => [mOrt - Z[g] * sd, mOrt + Z[g] * sd],
    cdf: (x: number) => 0.5 * (1 + Math.tanh(Math.sqrt(Math.PI / 8) * ((x - mOrt) / sd))),
  };
}

/* ------------------------------------------------------------------ dayanıklılık */

export const TTS_KOVA = [0, 30, 60, 90, 120, 150, 180, 240, 300, 365, 1e9];
export const TTS_ET = [
  '0–30',
  '30–60',
  '60–90',
  '90–120',
  '120–150',
  '150–180',
  '180–240',
  '240–300',
  '300–365',
  '365+',
];

/** Filo kaç gün dayanır — senaryoya bağlı canlı TTS dağılımı. */
export function ttsDagilim(cfg: SenaryoCfg): number[] {
  const say = new Array(10).fill(0);
  for (let i = 0; i < NPN; i++) {
    const t = PN.t25[i];
    if (t <= 0) continue;
    const g = PN.svc[i] / ((t * talepCarpani(i, cfg)) / 365);
    for (let b = 0; b < 10; b++) {
      if (g >= TTS_KOVA[b] && g < TTS_KOVA[b + 1]) {
        say[b]++;
        break;
      }
    }
  }
  return say;
}

/* ------------------------------------------------------- canlı parametre paneli */

export interface ParamCfg {
  w0: number;
  w1: number;
  w2: number;
  ber: number;
  tampon: number;
}

export const PARAM_BAZ: ParamCfg = { w0: 3, w1: 2, w2: 1, ber: 0.65, tampon: 0 };

export interface ParamSonuc {
  kir: number;
  kirAog: number;
  kap: number;
  berN: number;
  /** risk skoruna göre ilk 10 parçanın indeksi */
  top: number[];
  risk: Float64Array;
}

/**
 * Ağırlıklar / BER eşiği / alarm tamponu değiştiğinde tüm portföyü yeniden hesaplar.
 * "Ağırlık neden 3?" sorusunun cevabı: siz söyleyin, liste jürinin gözü önünde
 * yeniden sıralansın (CLAUDE.md §4.1 — parametre > sabit).
 */
export function paramHesap(p: ParamCfg): ParamSonuc {
  const w = [p.w0, p.w1, p.w2];
  let kir = 0;
  let kirAog = 0;
  let kap = 0;
  let berN = 0;
  const risk = new Float64Array(NPN);

  for (let i = 0; i < NPN; i++) {
    risk[i] = (w[PN.kr[i]] * PN.t25[i] * PN.ttr[i]) / 365;
    const t = PN.t25[i];
    if (t > 0) {
      const lam = t / 365;
      const tts = PN.svc[i] / lam;
      if (tts < PN.ttr[i] + p.tampon) {
        kir++;
        if (PN.kr[i] === 0) kirAog++;
        kap += Math.max(0, (PN.ttr[i] - tts) * lam) * PN.clp[i];
      }
    }
    if (PN.disrep[i] / PN.clp[i] > p.ber) berN++;
  }

  const top = Array.from({ length: NPN }, (_, i) => i)
    .sort((a, b) => risk[b] - risk[a])
    .slice(0, 10);
  return { kir, kirAog, kap, berN, top, risk };
}
