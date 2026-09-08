# Catalyst — Komponent Envanter Karar Platformu

> Turkish Technic'in komponent hizmet kapasitesi 8 yılda **1.200 → 2.000 uçağa** (+%67) çıkarken,
> envanter yönetimi için **görünürlük + öngörü + aksiyon** üreten karar destek platformu.

<p>
  <img alt="Python 3.11" src="https://img.shields.io/badge/python-3.11-3776AB?logo=python&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5%2B-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="three.js" src="https://img.shields.io/badge/three.js-r185-000000?logo=threedotjs&logoColor=white">
  <img alt="Testler" src="https://img.shields.io/badge/testler-113%20kontrol-2ea44f">
  <img alt="Lisans" src="https://img.shields.io/badge/lisans-MIT-blue">
</p>

**Ana tez:** sorun stok adedi değil (fazla + ölü stok ~$0,4M), **görünürlük ve süreç**.
Bugün 134 PN kırmızıda (TTS < TTR) ve bunların 72'sinin açık siparişi yok. Talep +%63–68
bandında büyürken üçte ikisi **yer değiştiriyor** (yeni nesil payı %34 → %65): bu bir büyüme
değil, **göç** problemi.

> **Grup 9/10** · Global Talent Bridge (Turkish Technic) MRO hackathon'u.
> Tüm veriler sentetiktir — case ile verilen dummy setlerdir; gerçek THY/AMOS verisi değildir.

---

## İçindekiler

- [Bir bakışta](#bir-bakışta)
- [Hızlı başlangıç](#hızlı-başlangıç)
- [Teslim: tek dosya, kurulum yok, internet yok](#teslim-tek-dosya-kurulum-yok-internet-yok)
- [Mimari](#mimari)
- [Ekranlar](#ekranlar)
- [Karar motoru — formüller](#karar-motoru--formüller)
- [Veri](#veri)
- [Modelleme ve doğrulama](#modelleme-ve-doğrulama)
- [Testler](#testler)
- [Klasör yapısı](#klasör-yapısı)
- [Yardımcı araçlar](#yardımcı-araçlar)
- [Sınırlar ve varsayımlar](#sınırlar-ve-varsayımlar)
- [Ekip ve lisans](#ekip-ve-lisans)

---

## Bir bakışta

Platform, 5.000 parça numarası (PN) üzerinden tek bir soruya cevap verir:
**bugün hangi parçaya, neden, hangi kanaldan aksiyon almalıyım?**

| Portföy | Değer |
|---|---|
| Parça numarası | **5.000 PN** · 48.200 adet fiziksel envanter |
| Bağlı sermaye | **$132,9M FMV** · $304,2M CLP (yeni fiyat) |
| 2025 talebi | **90.016 adet**/yıl · medyan 11 adet/PN · 1.730 PN kesikli talepli |
| 2033 talep bandı | **146.882 – 150.775 adet** (+%63,2 … +%67,5) |
| Tamir döngüsündeki stok (float) | **8.012 adet** ($23,3M) → 2033'te $39,0M |

| Risk | Değer |
|---|---|
| Kırmızı PN (TTS < TTR) | **134** (22'si AOG kritik) |
| Kırmızı + açık siparişi yok | **72** (11'i AOG kritik) |
| Açığı kapatma maliyeti | $0,73M |
| AOG kritik + atölye kabiliyeti yok | **547 PN** (AOG kritik portföyün %72,9'u) |
| Üçlü tehlike (547 ∩ yeni nesil) | **181 PN** |
| BER adayı (dış tamir / CLP > 0,65) | **338 PN** · 6.693 adet/yıl talep |
| Hurda anomalisi · havuz bağımlılığı | **159 PN** · **150 PN** |

Aksiyon dağılımı: **havuz 694 · tamir 641 · satın alma 217 · izle 3.448** — sipariş penceresi
alarmı 42 PN.

## Hızlı başlangıç

**A) Sadece ürünü görmek istiyorum (kurulum yok):**

```bash
cd web && npm install && npm run build:tek-dosya
open web/dist-tek-dosya/Catalyst.html    # çift tıkla da açılır
```

**B) Geliştirme:**

```bash
cd web
npm install
npm run dev              # http://localhost:5173
npm test                 # 113 kontrol
npm run tip              # tsc --noEmit
```

**C) Veri hattını yeniden çalıştır** (yalnız CSV veya formül değişirse gerekir):

```bash
uv sync                     # Python ortamı — https://docs.astral.sh/uv/
uv run build_dashboard.py   # veri/eski/*.csv → web/src/data/payload.json
```

Gereksinimler: Node 20+, Python 3.11 (uv otomatik kurar). TensorFlow yalnız isteğe bağlı
model eğitimi için gerekir; günlük geliştirme için kurulmasına gerek yoktur.

## Teslim: tek dosya, kurulum yok, internet yok

Sunum ve saha kullanımı için uygulama **tek bir HTML dosyasına** paketlenir:

```bash
cd web && npm run build:tek-dosya
# → web/dist-tek-dosya/Catalyst.html  (~2,4 MB)
```

Bu dosya kendi kendine yeter: JavaScript, CSS, 5.000 parçalık veri seti, 3D dünya konturu ve
grafik kütüphanelerinin tamamı içine gömülüdür. **Çift tıklanır, tarayıcıda açılır.** Kurulum,
sunucu, ağ bağlantısı ve yönetici hakkı gerekmez; şirket bilgisayarına kopyalanıp çalıştırılabilir.

Paketi her yeniden ürettiğinizde doğrulayın:

```bash
uv run --with playwright python offline_dogrula.py
```

Başsız tarayıcıyı `file://` ile açar, beş sekmeyi gezer, 3D kürenin çizildiğini kontrol eder ve
**`file://` dışına çıkan her isteği sayar** — asıl offline garantisi bu sayının sıfır olmasıdır.
Sorun varsa sıfırdan farklı çıkış kodu döner. Son çalıştırma: 5/5 sekme, canvas 1500×896,
**0 dış istek**, 0 konsol hatası.

İki uyarı:

- **Yerel diske kopyalayın.** Ağ paylaşımından (`\\sunucu\...`) doğrudan açılırsa bazı kurumsal
  tarayıcı politikaları dosyayı "İnternet bölgesi" sayıp betikleri kısıtlayabilir.
- **WebGL kapalıysa** 3D katman açılmaz; uygulama bunu yakalar ve aynı sayıları düz liste olarak
  gösterir — sayfanın geri kalanı çalışmaya devam eder.

## Mimari

İki katman, **tek doğruluk kaynağı**. Uygulama kendi başına hesaplanmış sayı üretmez;
her sayı ya `payload.json` içinden gelir ya da `core.py` formüllerini birebir tekrarlayan
TypeScript ikizinden.

```
veri/eski/*.csv
      │
      ▼
   core.py ───────────────► hesap çekirdeği (risk · float · TTS/TTR · min-max · BER · ROI)
      │                     tek doğruluk kaynağı, parametreler PARAMS içinde
      ▼
build_dashboard.py ───────► web/src/data/payload.json   (~680 KB kompakt veri paketi)
      │
      ▼
   web/  React 19 + TypeScript + Vite
      ├── src/engine/   core.py formüllerinin saf TS ikizi (DOM bilmez) — 56 parite testi
      ├── src/views/    Giriş · CODE · Watchlist · Öngörü · Harita · Senaryo
      └── src/design/   THY paleti, tokenlar, hareket tanımları
```

| Seçim | Gerekçe |
|---|---|
| **Python + pandas/numpy** çekirdek | Formüller tek yerde, jüri önünde parametre değiştirilebilir |
| **payload.json** ara katmanı | Tarayıcı 5.000 PN'yi ham CSV'den değil, sütun dizileri hâlinde okur |
| **TS engine ikizi** | Senaryo/kriz simülasyonu tarayıcıda canlı çalışır; parite testleriyle kilitli |
| **React 19 + Vite** | 3D için tek olgun ekosistem (R3F); TS 5.000 satırlık kolon dizilerinde alan hatalarını derlemede yakalar |
| **three.js + R3F** | Hangar sahnesi, karar küresi, dünya küresi, kriz arazisi — hepsi prosedürel geometri |
| **vite-plugin-singlefile** | "İnternet gerektirmez, çift tıkla açılır" teslim garantisi |

Ayrıntılı ön yüz notları: [`web/README.md`](web/README.md).

## Ekranlar

| Sekme | Ne yapar |
|---|---|
| **GİRİŞ** — dijital hangar | Beş perdelik tek çekim 3D açılış sahnesi: gece hangarı, park hâlindeki uçak, kamera kapıdan çıkıp piste bakar, dönüp motora yanaşır; kaportanın kesitinden fan · kompresör · yanma odası · türbin görünür. Son perdede parçalar dağılıp CODE ekranındaki karar küresine dönüşür |
| **CODE** — Component Decision Engine | Kararın verildiği tek yüzey. 5.000 parçalık operasyon küresi (her nokta bir PN, renk = kanal, kuzey kutbu = en yüksek risk), 12 içgörü akışı, dört kuyruklu karar konsolu, önerilen aksiyon kartı (öncesi/sonrası yetmeme riski), aksiyon merdiveni, kısa vade kanal dağılımı ve 2033 yol haritası |
| **Watchlist** | 5.000 PN risk skoruna göre sıralı; filtreler (kırmızı · siparişsiz · 547 · BER · phase-out · yeni nesil · hurda anomalisi · havuz bağımlı). PN detayında künye, risk skoru, 2033 ihtiyaç bandı, TTS/TTR, stok yeterlilik eğrisi, çeyreklik tahmin profili |
| **Öngörü & AI** | Q3 mevsimselliği, ABC×XYZ segmentasyonu, hurda kırılımı + anomali dedektörü, geriye dönük test, 14 model için yıllık talep 2025→2033, talep göçü, PN bazlı tahmin gezgini |
| **Harita** — tam ekran 3D küre | Kıtalar hazır dokudan değil, 110m kontur verisinden çalışma anında noktalanarak üretilir (internetsiz). Rotalar büyük çember yaylarında akan parçacıklarla çizilir; parçacık hızı kanal tipinden gelir. Sütun metriği seçilebilir (uçak · stok · talep · kırmızı · MIN 2033 · dışa bağımlı) |
| **Senaryo** — kriz simülatörü | **Şok gülü:** 7 eksenli radar kontrolü (talep · TAT · gümrük · atölye · havuz · kur · servis), 11 hazır senaryo. **Kriz arazisi (3D):** kategori × ay yükseklik alanı — "duvara kaçıncı ayda çarpıyoruz". **Kriz takvimi:** tırmanma → plato → toparlanma. **Alarm rayı:** 12 eşik tabanlı uyarı. **Belirsizlik:** Monte Carlo, %80/%90/%95 aralık, tornado duyarlılık, greedy bütçe tahsisi, kabiliyet ROI |

## Karar motoru — formüller

Hepsi [`core.py`](core.py) içinde; parametreler `PARAMS` sözlüğünde ve canlı değiştirilebilir.

| Büyüklük | Formül | Not |
|---|---|---|
| **Etkin TAT (TTR)** | atölye kabiliyeti VAR → yurt içi TAT, YOK → yurt dışı TAT | medyan 9 gün ↔ 43 gün |
| **TTS** (stok tükenme süresi) | `kullanılabilir stok ÷ (yıllık talep / 365)` | kullanılabilir = faal + homebase depo |
| **Kırmızı alarm** | `TTS < TTR + tampon` | tampon varsayılan 0 gün → 134 PN |
| **Risk skoru** | `kritiklik ağırlığı × yıllık talep × TTR ÷ 365` | ağırlık: AOG kritik 3,0 · kritik 2,0 · kritik değil 1,0 |
| **Float** | `yıllık talep × TTR ÷ 365` | tamir döngüsünde beklenen adet |
| **Emniyet stoğu** | servis hedefli Poisson kuantili | hedef: AOG %98 · kritik %95 · diğer %90 |
| **MIN / MAX** | `MIN = ⌈μ⌉ + SS`, `MAX = MIN + ⌈çeyreklik hız⌉`, `μ = hız × lead ÷ 91,25` | lead = tamir ya da satın almanın kısası |
| **Kesikli talep hızı** | Syntetos–Boylan (SBA), `α = 0,3` | 1.730 PN kesikli talepli |
| **BER (tamir edilemez)** | `yurt dışı tamir maliyeti ÷ CLP > 0,65` | 338 PN |
| **Kabiliyet ROI** | tasarruf `= talep × dış tamir maliyeti × (1 − 0,64)`; sermaye `= talep × (TAT_dış − 9) ÷ 365 × FMV` | hedef iç TAT 9 gün |
| **Hurda anomalisi** | `hurda > %20 × talep` ve `talep ≥ 20` | 159 PN |
| **Havuz bağımlılığı** | `havuz talebi ≥ %50 × talep` ve `talep ≥ 12` | 150 PN |

**2033 projeksiyonu bir bant olarak sunulur, nokta tahmin olarak değil:**
alt uç segment bazlı ölçekleme (THY 130,1 ve havuz 35,7 adet/uçak sabit → 146.882),
üst uç model bazlı ölçekleme (her modelin uçak başına oranı sabit → 150.775).
PN düzeyinde ikisinin ortası kullanılır.

## Veri

Üç kaynak CSV, hepsi `veri/eski/` altında ve hepsi **sentetik**:

| Dosya | Satır | İçerik |
|---|---|---|
| `dummy_pn_quarterly_data.csv` | 20.000 | 5.000 PN × 4 çeyrek: THY/havuz talebi, hurda, ATA, kritiklik, TAT (iç · dış · satın alma), atölye kabiliyeti |
| `dummy_pn_inventory_status.csv` | 5.000 | PN başına stok durumu: faal, gayrifaal, tamirde (iç/dış), açık PO, exchange in/out, depo; CLP/FMV ve tamir maliyetleri |
| `fleet_distribution.csv` | 14 | Model bazında filo: THY ve havuz için 2025 ve 2033 uçak adetleri |

Bunlardan üretilen `web/src/data/payload.json` (~680 KB) kolon dizisi formatındadır:
`kpi · band · model · kat · ceyrek · harita · pn · lookup · roi · ml · abcxyz · mc · tornado · opt · backtest · params`.

Ek olarak `veri/eski/` altında case brifingi, proje özeti, model deney notları ve eğitilmiş
model çıktıları (`demand_model.keras`, `model_results.json`) bulunur — böylece depoyu klonlayan
biri TensorFlow kurmadan payload üretebilir.

## Modelleme ve doğrulama

**Tahmin karşılaştırması** (geriye dönük test, MAE / RMSE — düşük daha iyi):

| Yöntem | MAE | RMSE |
|---|---|---|
| Naive (son çeyrek) | 2,285 | 3,488 |
| **3Q ortalama** | **1,721** | **2,461** |
| SBA (Syntetos–Boylan) | 1,732 | 2,471 |
| Derin öğrenme (MLP-Poisson) | 1,967 | 2,755 |

Sonuç dürüstçe raporlanıyor: bu veri setinde derin öğrenme basit yöntemleri geçmiyor.
Model hattı isteğe bağlı olarak durur, karar motoru SBA + 3Q üzerine kuruludur.

**Belirsizlik (Monte Carlo, 800 deneme):** baz senaryoda açık pozisyon ortalama **389 PN**
(%80 aralık 371–408). Motor krizi senaryosunda 796 PN (777–816). Kapalı form formül ile
simülasyon uyumu **%99,5**.

**Saha doğrulaması:** float formülü modelde 8.012 adet, gerçek tamir döngüsünde 7.800 adet — **%97**.

**Mutabakat:** gömülü her sayı `core.py`'den yeniden üretilebilir; 102 metrik CSV'lerden
script'le mutabakatlandı.

## Testler

```bash
cd web && npm test      # 113 kontrol
```

| Paket | Kontrol | Neyi kilitler |
|---|---|---|
| `src/engine/engine.test.ts` | 56 | Python ↔ TypeScript parite: kanal dağılımı 694/641/217/3.448 · sipariş alarmı 42 · kırmızı 134/22 · motor krizi 477 · belirsizlik 389 (%80: 371–408) |
| `src/views/hangar/hangarGeo.test.ts` | 28 | Açılış sahnesinin prosedürel uçak/motor geometrisi |
| `src/views/senaryo/araziGeo.test.ts` | 19 | Kriz arazisi yükseklik alanı |
| `src/views/harita/kure/kureGeo.test.ts` | 10 | Küre projeksiyonu ve büyük çember yayları |

Parite testlerinin sözleşmesi: yeni şok eksenleri (gümrük · atölye · havuz · kur · filo bandı)
nötrken baz durumu **birebir** vermek zorunda; kriz takviminin 0. ayı da aynı 134 kırmızıyı üretir.

## Klasör yapısı

```
core.py                 tek doğruluk kaynağı (hesap çekirdeği)
build_dashboard.py      core.py → web/src/data/payload.json
train_demand_model.py   derin öğrenme hattı (TensorFlow, isteğe bağlı)
data_explorer.py        iç veri gezgini (PyQt6)
offline_dogrula.py      tek dosya teslim paketini file:// üstünden sınar
pyproject.toml, uv.lock Python bağımlılıkları
KRIZ_SAYFASI.md         Senaryo (kriz) sayfasının sıfırdan yeniden inşa şartnamesi

web/                    React + TypeScript + Vite uygulaması (canlı ürün)
  src/engine/           hesap çekirdeği — core.py formüllerinin TS ikizi
  src/views/            ekranlar (Giris · Code · Watchlist · Ongoru · Harita · Senaryo)
  src/views/hangar/     açılış sahnesi: prosedürel uçak/motor geometrisi + koreografi
  src/design/           tasarım tokenları, THY paleti, hareket tanımları
  src/data/payload.json build_dashboard.py çıktısı (uygulamanın okuduğu veri)

veri/
  eski/                 kaynak veri + referans belgeler (mevcut sürüm)
    dummy_pn_quarterly_data.csv, dummy_pn_inventory_status.csv, fleet_distribution.csv
    model_results.json, demand_model.keras
    CASE_BRIEFING.md, PROJE_OZETI.md, model_deney_notlari.md
    sunum/              sunum üretim script'leri (pptx · grafik · el notu PDF)
  yeni/                 gelecekte üretilecek veri/belge dosyaları
```

## Yardımcı araçlar

**İç veri gezgini** — sunum için değil, ekibin ham veriyi kurcalaması için masaüstü araç.
Dört veri seti (türetilmiş PN tablosu + üç ham CSV), filtreler, PN arama, beş grafik tipi,
sıralanabilir tablo, `describe()` istatistiği, PN çift-tıkla çeyreklik kırılım, CSV dışa aktarım.

```bash
uv run --group gui python data_explorer.py
# başsız test: QT_QPA_PLATFORM=offscreen uv run --group gui python data_explorer.py --selftest
```

PyQt6 yalnız `gui` bağımlılık grubundadır; `uv sync` onu kurmaz.

**Derin öğrenme hattı** (isteğe bağlı):

```bash
uv run train_demand_model.py    # → veri/eski/demand_model.keras + model_results.json
```

Çıktı varsa `build_dashboard.py` Öngörü bölümünü otomatik doldurur; yoksa o bölümü atlar.

**Offline doğrulama:** `uv run --with playwright python offline_dogrula.py` — yukarıda anlatıldı.

## Sınırlar ve varsayımlar

- **Tüm veriler sentetiktir.** Case ile verilen dummy setlerdir; gerçek THY/AMOS verisi
  değildir. Sayılar yöntemi göstermek içindir, operasyonel karar için değildir.
- **İstasyon dağılımı temsilidir.** Havalimanı kırılımı CSV'lerde yoktur; basılı case'in
  5 satırlık istasyon tablosu ağırlıklarla açılmıştır (kontrol toplamı 1.200 → 2.000 uçak korunur).
- **2033 bir banttır**, nokta tahmin değildir; iki bağımsız ölçekleme yöntemi bandın uçlarını verir.
- **Maliyet varsayımları parametredir:** BER eşiği 0,65 · iç/dış maliyet oranı 0,64 ·
  hedef iç TAT 9 gün · alarm tamponu 0 gün. Hepsi `core.PARAMS` üzerinden değiştirilebilir.
- Talep modeli kesikli talep için SBA kullanır; çok düşük hacimli PN'lerde (medyan 11 adet/yıl)
  her yöntemin hatası mutlak olarak küçük ama oransal olarak yüksektir.

## Ekip ve lisans

Global Talent Bridge (Turkish Technic) MRO hackathon'u — **Grup 9/10**.

Bu proje [MIT Lisansı](LICENSE) ile dağıtılmaktadır. Depodaki veri setleri sentetiktir;
"Turkish Technic" ve "Turkish Airlines" markaları sahiplerine aittir ve bu proje onlarla
resmi bir ilişkiyi temsil etmez.

**Referans:** Sezenoğlu Çetin vd., *Data-Driven Predictive Maintenance for Aircraft Components
Through Sparse Event Logs*, Aerospace 2026, 13, 110.
