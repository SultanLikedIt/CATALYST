/**
 * Küre paleti — SİYAH · KIRMIZI · BEYAZ (turkishairlines.com kimliği).
 *
 * Kullanıcı kararı (27 Tem 2026): haritada ve CODE'da mavi/cyan/teal/mor YOK.
 * Renk üç aileye indirildi:
 *   · siyah–gri  → zemin ve yapı (okyanus, ızgara, pasif seriler)
 *   · beyaz–açık gri → "bizim elimizde olan" (kendi depomuz, kendi atölyemiz)
 *   · kırmızı rampası → maliyet/aciliyet; ton açıldıkça değil PARLADIKÇA acil
 *
 * Ayırt edicilik hue ile değil AÇIKLIK (lightness) basamağıyla sağlanır: yedi
 * kanal beyazdan koyu bordoya tek eksende sıralanır, koyu zeminde hepsi okunur.
 * HUD panelleri de bu dosyadan beslenir ki lejant ile küre asla ayrışmasın.
 */

export const KURE_RENK = {
  uzay: '#07070a',
  okyanus: '#101014',
  kara: '#7a2b35', // bordo kara kütlesi — siyah okyanusta kırmızı dünya
  kiyi: '#ff6b78',
  izgara: '#2b2b33',
  atmosfer: '#e81932',
  yildiz: '#d6d7dc',
  metin: '#f2f3f5',
  notr: '#94969e', // tipi bilinmeyen kanal / yedek renk
} as const;

/** seçim ve odak halkaları — ekranda kırmızı halka her zaman "seçili" demek */
export const SEC_RENK = '#ff2d40';

/** depo tipi → küre rengi (ana üs kırmızı kalır, gerisi nötr basamak) */
export const DEPO_RENK_3D: Record<string, string> = {
  ana_depo: '#ff2d40',
  ileri_depo: '#ffffff',
  hat_stok: '#94969e',
  yok: '#4e5057',
};

/** tedarik kanalı → küre rengi. Nötr = kendi kaynağımız, kırmızı = dışarıya para/süre. */
export const KANAL_RENK_3D: Record<string, string> = {
  depo: '#ffffff',
  ictamir: '#c9cbd1',
  pool: '#94969e',
  distamir: '#ffc0c5',
  hizli: '#ff707c',
  sokum: '#ff1f33',
  alim: '#a10e1a',
};

/** çok parçalı AOG senaryosunda parça renkleri */
export const PRENK_3D = ['#ff2d40', '#ffffff', '#ff9aa2', '#94969e', '#b0111f'];

/** akış hızları (tur/saniye) — kanal tipine göre "bu yol ne kadar hızlı" hissi */
export const AKIS_HIZ: Record<string, number> = {
  depo: 0.34,
  pool: 0.26,
  sokum: 0.42,
  ictamir: 0.2,
  distamir: 0.1,
  hizli: 0.16,
  alim: 0.07,
};
