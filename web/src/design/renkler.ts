/**
 * Grafik renk paleti — tokens.css'teki değerlerin JS ikizi (Chart.js somut değer ister).
 *
 * KURAL: marka kırmızısı (C.marka) hiçbir veri serisinde kullanılmaz. Bir çubuk
 * kırmızıysa "alarm" demektir, "Turkish Airlines" demek değil. Kimlik ile durumu
 * ayırmak, sunumdaki tek renkli vurgunun gücünü koruyor.
 */
export const C = {
  bg: '#F7F8F9',
  panel: '#FFFFFF',
  panel2: '#F0F2F4',
  panel3: '#E7EAED',
  line: '#E2E5E9',
  lineSoft: '#ECEFF2',
  axis: '#CBD1D8',
  text: '#1A1D21',
  muted: '#57616F',
  dim: '#949CA7',

  marka: '#E81932', // yalnız kimlik / birincil eylem
  navy: '#16233A',

  iyi: '#0E6B4A',
  uyari: '#8A6000',
  kritik: '#C1121F',
  bilgi: '#2C5AA0',
  mor: '#5B4B8A',
  gri: '#6E7783',
  altin: '#C6A26B',
} as const;

/** anlamsal takma adlar — port edilen çağrı noktaları tek satır değişmeden çalışır */
export const CC = {
  ...C,
  teal: C.iyi,
  amber: C.uyari,
  red: C.kritik,
  blue: C.bilgi,
  violet: C.mor,
};

/**
 * Grafik DOLGU paleti — C'den ayrı, çünkü iki farklı iş yapıyorlar.
 *
 * C metin için kurulu: açık zeminde okunması gerektiğinden tonlar koyu. Aynı
 * tonlar bir çubuğun tamamını boyayınca ekran ağırlaşıyor, C.uyari gibi koyu
 * sarılar da haki/hardal görünüyordu. Dolgular ayrı bir rampadan gelir.
 *
 * KURAL — "ne kadar?" sorusunu yanıtlayan her seri tek hue ailesinden (çelik
 * mavisi, THY lacivertinin açılmış hâli) beslenir; koyuluk büyüklüğü kodlar.
 * Renk yalnız ANLAM taşıdığında değişir: yeşil = tutan/büyüyen, kırmızı =
 * alarm, gri = referans. Böylece grafik gökkuşağına dönmüyor ve tek bir renkli
 * çubuk gördüğümüzde bunun bir şey söylediğini biliyoruz.
 */
export const S = {
  s1: '#14314E',
  s2: '#235682',
  s3: '#4580B4',
  s4: '#85AACD',
  s5: '#C0D4E6',
  s6: '#E4ECF4',

  yesil: '#17845F',
  yesilAcik: '#B7DCCC',
  notr: '#C7CDD4',
  notrKoyu: '#95A0AD',
  alarm: '#C1121F',
  alarmAcik: '#EFC4C8',
} as const;

/** kritiklik sınıfı renkleri: AOG KRİTİK / KRİTİK / KRİTİK DEĞİL */
export const KR_RENK = ['#C1121F', '#B87500', '#8A929C'] as const;

/**
 * Opak tonlama: açık zeminde alfa rengi soldurur, ton ile hiyerarşi kurulur.
 * k = 1 → tam renk, k = 0 → beyaz.
 */
export function tint(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const m = (v: number) => Math.round(v + (255 - v) * (1 - k));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/**
 * 0..1 → tek hue ısı rampası (açık çelik → koyu lacivert).
 *
 * Eskisi gri → bej → kırmızı geçiyordu: bej ara ton çamurlanıyordu ve en yoğun
 * hücre "alarm" gibi okunuyordu — oysa orada yalnızca "en çok talep buradan
 * geliyor" yazıyor. Tek hue'da sıralama gözle anında kuruluyor, kırmızı da
 * gerçekten alarm demek istediğimiz yerlere kalıyor.
 */
export function isiRenk(t: number): string {
  const stops = [
    [240, 244, 249],
    [133, 170, 205],
    [20, 49, 78],
  ];
  const u = Math.max(0, Math.min(1, t));
  const seg = u < 0.5 ? 0 : 1;
  const v = (u - seg * 0.5) / 0.5;
  const a = stops[seg];
  const b = stops[seg + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * v)},${Math.round(
    a[1] + (b[1] - a[1]) * v,
  )},${Math.round(a[2] + (b[2] - a[2]) * v)})`;
}

/** Isı hücresinin yazı rengi — koyu tonda mürekkep okunmaz, beyaza döner. */
export function isiMetin(t: number): string | undefined {
  return t > 0.52 ? '#FFFFFF' : undefined;
}
