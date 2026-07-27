/**
 * Sahne sabitleri — three.js'e DOKUNMAZ.
 *
 * Bilerek ayrı dosya: Code.tsx bu sabitleri (efsane renkleri, kaynak listesi)
 * doğrudan kullanır; küreyi ise lazy() ile çeker. Sabitler Kure.tsx içinde
 * kalsaydı statik import three chunk'ını ilk boyamaya bağlar ve açılış ~300 KB
 * ağırlaşırdı (rollup bunu INEFFECTIVE_DYNAMIC_IMPORT diye uyarıyor).
 */

/** Koyu zeminde okunan sahne paleti — code.css sinyal renkleriyle aynı aile. */
export const SC = {
  alarm: '#ff5666',
  kirmizi: '#e0a53a',
  aksiyon: '#4a8fe0',
  izle: '#2d4a6b',
  cyan: '#45c8e0',
  teal: '#33b788',
  cizgi: '#1e3350',
} as const;

/** Dağınık kaynaklar — yörüngedeki düğümler (CLAUDE.md §1.3 saha haritası). */
export const KAYNAKLAR = [
  { kod: 'AMOS', ad: 'bakım kayıtları', tip: 'kayıt' },
  { kod: 'TRAX', ad: 'komponent geçmişi', tip: 'kayıt' },
  { kod: 'ÜPK', ad: 'üretim planlama', tip: 'kayıt' },
  { kod: 'WMS', ad: 'depo · bin/raf', tip: 'kayıt' },
  { kod: 'GÜMRÜK', ad: 'antrepo · transit', tip: 'kayıt' },
  { kod: 'POOL', ad: 'havuz ortakları', tip: 'dış' },
  { kod: 'OEM', ad: 'vendor · fiyat', tip: 'dış' },
  { kod: 'TAHMİN', ad: 'talep motoru', tip: 'motor' },
  { kod: 'LLM', ad: 'dil katmanı', tip: 'motor' },
] as const;

export const TIP_RENK: Record<string, string> = {
  kayıt: SC.aksiyon,
  dış: SC.teal,
  motor: SC.cyan,
};
