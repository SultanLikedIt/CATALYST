/**
 * Harita veri katmanı — RENDER'DAN BAĞIMSIZ.
 *
 * Buradaki hiçbir şey SVG bilmez: projeksiyon, mesafe, süre tahmini, kanal
 * yelpazesi ve rota senaryoları saf fonksiyonlar. 2D SVG görünümü de, ileride
 * eklenecek 3D küre de aynı fonksiyonları çağırır — iki görünüm arasında sayı
 * farkı doğamaz.
 *
 * TEMSİLÎ UYARISI: istasyon boyutu resmi veride YOK (CLAUDE.md §2.4). Grup
 * toplamları basılı case tablosuyla birebir; istasyon kırılımı ve depo katmanı
 * kurala bağlı temsildir. Metinlerde bu her yerde belirtilir.
 */
import { D, PN, LK, PIDX } from '@/data/payload';

export const HA = D.harita;
export const N_IST = HA.kod.length;
export const IST_I = HA.kod.indexOf('IST');

export const DEPO_RENK: Record<string, string> = {
  ana_depo: '#C1121F',
  ileri_depo: '#1A1D21',
  hat_stok: '#6E7783',
  yok: '#B6BDC7',
};
export const DEPO_AD: Record<string, string> = {
  ana_depo: 'Ana depo',
  ileri_depo: 'İleri depo',
  hat_stok: 'Hat stoğu',
  yok: 'Stok yok',
};
export const PRENK = ['#C1121F', '#2C5AA0', '#0E6B4A', '#8A6000', '#5B4B8A'];
export const KANAL_RENK: Record<string, string> = {
  depo: '#0E6B4A',
  pool: '#2C5AA0',
  sokum: '#C1121F',
  ictamir: '#3E8E6B',
  distamir: '#6E7783',
  hizli: '#8A6000',
  alim: '#5B4B8A',
};

export const GRUP: Record<string, { ad: string; u25: number; u33: number }> = {};
HA.grup.kod.forEach((k, n) => {
  GRUP[k] = { ad: HA.grup.ad[n], u25: HA.grup.u25[n], u33: HA.grup.u33[n] };
});

/* ---------------------------------------------------------------- projeksiyon */
/** SVG kullanıcı birimi çerçevesi */
export const W = 1000;
export const HG = 560;
const PAD = 34;

const mY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const lo1 = Math.min(...HA.lon) - 4;
const lo2 = Math.max(...HA.lon) + 4;
const la1 = Math.min(...HA.lat) - 3;
const la2 = Math.max(...HA.lat) + 3;
const sk = Math.min(
  (W - 2 * PAD) / (lo2 - lo1),
  ((HG - 2 * PAD) / (mY(la2) - mY(la1))) * (Math.PI / 180),
);
const cx = (lo1 + lo2) / 2;
const cyM = (mY(la1) + mY(la2)) / 2;

/** Web Mercator, istasyon sınırlarına oturtulmuş */
export const prj = (lon: number, lat: number): [number, number] => [
  W / 2 + (lon - cx) * sk,
  HG / 2 - ((mY(lat) - cyM) * sk * 180) / Math.PI,
];

/** havalimanlarının ekran koordinatları */
export const PXY: [number, number][] = HA.kod.map((_, i) => prj(HA.lon[i], HA.lat[i]));

/** iki nokta arasında yay (quadratic bezier) — k eğrilik */
export function yay(a: number, b: number, k: number): string {
  const [x1, y1] = PXY[a];
  const [x2, y2] = PXY[b];
  const mx = (x1 + x2) / 2 - (y2 - y1) * k;
  const my = (y1 + y2) / 2 + (x2 - x1) * k;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(
    1,
  )},${y2.toFixed(1)}`;
}

/* --------------------------------------------------------------- mesafe / süre */
export function hav(i: number, j: number): number {
  const R = 6371;
  const d2r = Math.PI / 180;
  const dla = (HA.lat[j] - HA.lat[i]) * d2r;
  const dlo = (HA.lon[j] - HA.lon[i]) * d2r;
  const a =
    Math.sin(dla / 2) ** 2 +
    Math.cos(HA.lat[i] * d2r) * Math.cos(HA.lat[j] * d2r) * Math.sin(dlo / 2) ** 2;
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

const HAZIR: Record<string, number> = { ana_depo: 0.5, ileri_depo: 1, hat_stok: 2, yok: 3 };

/** depo transferi süresi (saat): uçuş + elleçleme (+ gümrük payı dışarıda) */
export const eta = (src: number, dst: number): number =>
  Math.round((hav(src, dst) / 800 + (HA.yd[src] ? 4 : 1) + HAZIR[HA.depo[src]]) * 2) / 2;

/** havuzdan değişim süresi (saat): uçuş + gümrük + pool işlemi */
export const etaPool = (src: number, dst: number): number =>
  Math.round((hav(src, dst) / 800 + 4 + 8) * 2) / 2;

export const sureTxt = (s: number): string =>
  s < 48
    ? String(s).replace('.', ',') + ' saat'
    : Math.round(s / 24).toLocaleString('tr-TR') + ' gün';

/* --------------------------------------------------------------- rota verisi */
const HAVUZ_ORTAK = ['FRA', 'LHR', 'CDG', 'DXB', 'AMS', 'JFK', 'JED', 'BER', 'SIN'];
const DIS_HUB = ['FRA', 'LHR', 'AMS', 'CDG', 'DXB'];

export interface ParcaSpec {
  pn: string;
  sub: string;
  kay: string[];
  pool: string[];
  alim: number;
}

/** Watchlist'ten gelen tek parça için kaynak yelpazesi (hedef hariç). */
export const wpSpec = (i: number, hedefKod: string): ParcaSpec => ({
  pn: String(PN.id[i]),
  sub: LK.sub[PN.sub[i]],
  kay: ['IST', 'ESB', 'ADB'].filter((k) => k !== hedefKod),
  pool: [HAVUZ_ORTAK[+PN.id[i] % 9], HAVUZ_ORTAK[(+PN.id[i] + 4) % 9]].filter(
    (k) => k !== hedefKod,
  ),
  alim: PN.tsat[i],
});

export interface Kanal {
  tip: string;
  ad: string;
  kod: string;
  i: number;
  saat: number;
  mal: number | null;
  malTxt?: string;
  dash: string;
}

/**
 * Tek parça izole edilince aksiyon merdivenindeki TÜM kanallar haritaya çıkar.
 * Tamir ve satın alma süreleri parçanın GERÇEK verisinden (tic/tdis/tsat).
 */
export function kanalVeri(p: ParcaSpec, hIdx: number): Kanal[] {
  const idx = PIDX[p.pn];
  const ks: Kanal[] = [];
  p.kay.forEach((k) => {
    const i = HA.kod.indexOf(k);
    ks.push({
      tip: 'depo',
      ad: 'Depo transferi',
      kod: k,
      i,
      saat: eta(i, hIdx),
      mal: null,
      malTxt: 'iç transfer',
      dash: '',
    });
  });
  (p.pool || []).forEach((k) => {
    const i = HA.kod.indexOf(k);
    ks.push({
      tip: 'pool',
      ad: 'Havuzdan değişim',
      kod: k,
      i,
      saat: etaPool(i, hIdx),
      mal: idx != null ? 0.1 * PN.clp[idx] : null,
      dash: '1.6,4.6',
    });
  });
  if (idx != null) {
    if (PN.gay[idx] > 0)
      ks.push({
        tip: 'sokum',
        ad: 'Donörden söküm',
        kod: 'IST',
        i: IST_I,
        saat: 24,
        mal: null,
        malTxt: 'tamir borcu',
        dash: '7,3,2,3',
      });
    if (PN.ato[idx] && PN.tic[idx] != null)
      ks.push({
        tip: 'ictamir',
        ad: 'İç atölye tamiri',
        kod: 'IST',
        i: IST_I,
        saat: PN.tic[idx]! * 24,
        mal: PN.icrep[idx],
        dash: '6,4',
      });
    const dh = DIS_HUB.filter((k) => k !== HA.kod[hIdx])[+p.pn % 4];
    const di = HA.kod.indexOf(dh);
    ks.push({
      tip: 'distamir',
      ad: 'Dış tamir',
      kod: dh,
      i: di,
      saat: PN.tdis[idx] * 24,
      mal: PN.disrep[idx],
      dash: '10,5',
    });
    ks.push({
      tip: 'hizli',
      ad: 'Hızlandırılmış dış tamir',
      kod: dh,
      i: di,
      saat: Math.ceil(PN.tdis[idx] * 0.6) * 24,
      mal: PN.disrep[idx] * 1.5,
      dash: '10,5',
    });
    ks.push({
      tip: 'alim',
      ad: 'Yeni satın alma',
      kod: 'OEM · FRA',
      i: HA.kod.indexOf('FRA'),
      saat: PN.tsat[idx] * 24,
      mal: PN.clp[idx],
      dash: '2,6',
    });
  }
  return ks.sort((a, b) => a.saat - b.saat);
}

export interface RotaParcaGorunum {
  n: number;
  pn: string;
  sub: string;
  ops: { i: number; kod: string; tip: string; saat: number }[];
  alim: number;
  renk: string;
}

export interface RotaGorunum {
  sc: { ucak: string; hedef: string; parcalar: ParcaSpec[] };
  hIdx: number;
  parcalar: RotaParcaGorunum[];
  kritik: number;
  wp?: boolean;
}

/** Aktif rota: ya Watchlist'ten gelen tek parça, ya AOG senaryosu (5 parça). */
export function rotaVeri(rsen: number, wp: { i: number; hedef: number } | null): RotaGorunum {
  if (wp) {
    const spec = wpSpec(wp.i, HA.kod[wp.hedef]);
    const hIdx = wp.hedef;
    const ops = spec.kay
      .map((k) => {
        const i = HA.kod.indexOf(k);
        return { i, kod: k, tip: 'depo', saat: eta(i, hIdx) };
      })
      .concat(
        spec.pool.map((k) => {
          const i = HA.kod.indexOf(k);
          return { i, kod: k, tip: 'pool', saat: etaPool(i, hIdx) };
        }),
      )
      .sort((a, b) => a.saat - b.saat);
    return {
      sc: { ucak: 'PN-' + spec.pn, hedef: HA.kod[hIdx], parcalar: [spec] },
      hIdx,
      parcalar: [{ n: 0, pn: spec.pn, sub: spec.sub, ops, alim: spec.alim, renk: PRENK[0] }],
      kritik: ops[0].saat,
      wp: true,
    };
  }
  const sc = HA.rota[rsen];
  const hIdx = HA.kod.indexOf(sc.hedef);
  const parcalar = sc.parcalar.map((p, n) => {
    const ops = p.kay
      .map((k) => {
        const i = HA.kod.indexOf(k);
        return { i, kod: k, tip: 'depo', saat: eta(i, hIdx) };
      })
      .concat(
        (p.pool || []).map((k) => {
          const i = HA.kod.indexOf(k);
          return { i, kod: k, tip: 'pool', saat: etaPool(i, hIdx) };
        }),
      )
      .sort((a, b) => a.saat - b.saat);
    return { n, pn: p.pn, sub: p.sub, ops, alim: p.alim, renk: PRENK[n % PRENK.length] };
  });
  return {
    sc: { ucak: sc.ucak, hedef: sc.hedef, parcalar: sc.parcalar as ParcaSpec[] },
    hIdx,
    parcalar,
    kritik: Math.max(...parcalar.map((p) => p.ops[0].saat)),
  };
}
