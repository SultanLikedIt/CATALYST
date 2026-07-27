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

/** 0..1 → açık zemin → uyarı → kritik rampası (ısı haritası) */
export function lerpColor(t: number): string {
  const stops = [
    [240, 242, 244],
    [226, 199, 150],
    [193, 18, 31],
  ];
  const seg = t < 0.5 ? 0 : 1;
  const u = (t - seg * 0.5) / 0.5;
  const a = stops[seg];
  const b = stops[seg + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(
    a[1] + (b[1] - a[1]) * u,
  )},${Math.round(a[2] + (b[2] - a[2]) * u)})`;
}
