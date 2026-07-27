# Catalyst — Komponent Envanter Karar Platformu

Turkish Technic'in komponent hizmet kapasitesi 8 yılda **1.200 → 2.000 uçağa** (+%67) çıkarken
envanter yönetimi için **görünürlük + öngörü + aksiyon** karar destek prototipi.

Ana tez: sorun stok adedi değil (fazla+ölü stok ~$0,4M), **görünürlük ve süreç** —
134 PN bugün kırmızıda (TTS < TTR) ve 72'sinin açık siparişi yok. Talep +%63–68 bandında
büyürken üçte ikisi **yer değiştiriyor** (yeni nesil %34 → %65): büyüme değil göç.

## Kurulum

Tek gereksinim [uv](https://docs.astral.sh/uv/) — Python sürümünü ve bağımlılıkları kendisi kurar:

```bash
uv sync
```

## Ana akış — Catalyst dashboard'u

```bash
# Tek doğruluk kaynağından (core.py) tek dosyalık dashboard üret:
uv run build_dashboard.py
# → catalyst.html  (tarayıcıda aç; internet gerektirmez, tüm veri gömülü)
```

| Sekme | İçerik |
|---|---|
| **Karar Merkezi** | 5.000 parça tek kural dizisinden geçer, her biri tek kanala düşer (havuz 694 / tamir 641 / satın alma 217 / izle 3.448 — watchlist önerisiyle aynı kod yolu); sipariş penceresi alarmı (penceresi kaçmış + siparişsiz 42 parça); planlama ufku (bugün / 0–30 / 30–90 / 90+ gün pencereleri); fazla stok dengeleme önerileri ($4,5M FMV, temsilî kaynak/hedef + harita rotası). Her satır watchlist'e, parça detayına ya da haritaya köprülü |
| **Watchlist** | 5.000 PN risk skoru sıralı; filtreler (kırmızı, siparişsiz, 547, BER, phase-out, yeni nesil, hurda anomalisi 159, pool bağımlı 150); PN detayında künye + risk skoru, 2033 ihtiyaç bandı, **önerilen aksiyon kartı** (yetmeme riski öncesi/sonrası, açık, kanal + karar düğmeleri), TTS/TTR, aksiyon merdiveni, canlı stok yeterlilik seviyesi eğrisi ve çeyreklik tahmin profili |
| **Öngörü & AI** | Q3 mevsimselliği (kritiklikte homojen), ABC×XYZ segmentasyon matrisi, hurda kategori kırılımı + anomali dedektörü (159 PN), geriye dönük test, **model bazında yıllık talep 2025→2033** (14 model, 2033'e göre sıralı; yeni nesilde çubuk ikiye katlanır, küçülen klasiklerde geriler), talep göçü, kategori ayrışması, tahmin gezgini (PN bazlı) |
| **Harita** | İki modlu etkileşimli ağ: **Türkiye haritası** (gömülü kontur, 16 yurt içi havalimanı, kaydır/yakınlaştır) + **küresel ağ** (İstanbul merkezli azimut görünümü, 9 yurt dışı hub, uzaklık halkaları) · stok/talep/kırmızı/MIN33/dışa bağımlı görünümleri · 2025↔2033 karşılaştırma · kriz etkisi katmanı (Senaryo ile bağlı) · tamir akış okları · kategori + kritiklik filtreleri · grup toplamları basılı case tablosuyla birebir (temsili dağıtım etiketli) · ATA×kritiklik risk ısı haritası |
| **Senaryo** | Kriz simülatörü: senaryo kütüphanesi (motor ailesi krizi, pandemi, OEM gecikmesi, lojistik…) → 5.000 PN canlı yeniden hesap; **model parametre paneli** (kritiklik ağırlıkları, BER eşiği, alarm tamponu); **belirsizlik denemeleri** (kümülatif olasılık eğrisi, %80/%90/%95 aralık seçici, senaryo sabitleme, beklenen fatura ↔ kötü giden %10'un ortalaması, belirsizliğin kaynağı ayrışımı, altı senaryonun karşılaştırması, formül↔deneme doğrulama tablosu); senaryoya bağlı canlı dayanıklılık dağılımı; duyarlılık; kaynak önceliklendirme; kabiliyet ROI |


## Web uygulaması (`web/`) — geliştirilebilir sürüm

`catalyst.html`'in tüm özelliklerini koruyan React + TypeScript sürümü. Tek dosyalık prototip
sunum için hazır ve **olduğu gibi duruyor**; üstüne geliştirme (3D harita, sahne animasyonları,
yeni ekranlar) web uygulamasında yapılır.

```bash
cd web
npm install
npm run dev              # geliştirme sunucusu
npm run build:tek-dosya  # dist-tek-dosya/index.html — offline tek dosya (jüri demosu)
npm test                 # 34 parite kontrolü: sayılar catalyst.html ile birebir
```

Tasarım turkishairlines.com'a göre yeniden kurgulandı (THY kırmızısı kimlik ve birincil eylem
için; veri renkleri ayrı tutuldu ki "marka" ile "alarm" karışmasın). Hesap çekirdeği `core.py`
formüllerinin TypeScript ikizidir ve `payload.json`'u aynı hattan alır — iki sürüm arasında sayı
ayrışması imkânsızdır. Ayrıntı: [`web/README.md`](web/README.md).

### CODE — Component Decision Engine (açılış ekranı)

Web sürümünün ilk sekmesi **CODE**: kararın verildiği tek yüzey, koyu operasyon konsolu
temasında (uygulamanın geri kalanı açık THY temasında kalır).

| Katman | İçerik |
|---|---|
| **Çekirdek (3D)** | 5.000 parçanın operasyon küresi — her nokta gerçek bir parça, rengi karar motorunun verdiği kanal, kürenin kuzey kutbu en yüksek riskli parçalar. Küreye tıklamak parçayı karar konsoluna düşürür; yörüngede dokuz kaynak düğümü (AMOS · TRAX · ÜPK · WMS · GÜMRÜK · POOL · OEM · TAHMİN · LLM) çekirdeğe akar |
| **İçgörü akışı** | 12 bulgu; her biri bir ekrana/kuyruğa köprülü. Cümle kalıpları sabittir, **sayılar canlı** — panelin altında bu ayrım yazıyla belirtilir |
| **Karar konsolu** | Watchlist'ten taşındı: dört kuyruk (pencere kapalı · AOG kritik · hurda adayı · risk sıralı), önerilen aksiyon kartı (yetmeme riski öncesi/sonrası, açık, kanal), Onayla / Ata / Haritada incele / Satınalma talebi / Yoksay, oturum içi karar kaydı ve aksiyon merdiveni. Parça detayı aynı kartı salt-okunur gösterir → karar tek yerde verilir |
| **Kısa vade** | Karar yönlendirici (kanal dağılımı), sipariş penceresi alarmı, planlama ufku, transfer önerileri (kaynak → hedef istasyon + harita rotası) |
| **Uzun vade** | 2033 yol haritası: dört faz, faz kapıları takvim değil metrik; her kartta kazanç, güven ve ilgili ekrana köprü |

## İç veri gezgini (`data_explorer.py`, PyQt6)

Sunum için değil, ekibin ham veriyi kurcalaması için masaüstü araç. Dört veri seti
(core.build() türetilmiş PN tablosu + üç ham CSV), filtreler + PN arama, beş grafik
tipi (histogram, kategori çubuğu, dağılım, kutu, çeyreklik zaman serisi), sıralanabilir
tablo, `describe()` istatistik sekmesi, tabloda çift tıkla tekil PN çeyreklik kırılımı,
CSV dışa aktarım. Sayılar `core.py` çekirdeğinden gelir — `catalyst.html` ile aynı.

```bash
uv run --group gui python data_explorer.py
```

PyQt6 yalnızca `gui` bağımlılık grubunda; varsayılan `uv sync` onu kurmaz (jüri/klon
dashboard'u üretmek için GUI'ye ihtiyaç duymaz). Başsız kendi testi (pencere açmaz):
`QT_QPA_PLATFORM=offscreen uv run --group gui python data_explorer.py --selftest`.

## Sunum paketi (`sunum/`)

```bash
cd sunum
# Sunum çıktıları repoda TUTULMAZ; hepsi buradan yeniden üretilir (sırayla):
uv run --with playwright playwright install chromium   # ilk seferde
uv run --with playwright python make_shots.py          # → shots/*.png (S4 ekran görüntüleri)
uv run make_charts.py                # → charts/*.png (marka grafikler; S2·S6'ya gömülür)
uv run fill_sablon.py                # → Grup9_Catalyst.pptx (RESMİ şablon, 7 slayt; grafik + ekranları gömer)
uv run make_handout.py               # → catalyst_el_notu.pdf (2 sayfa jüri el notu)
```

`sablon.pptx` organizatörün resmi şablonudur; `fill_sablon.py` tasarıma dokunmadan yalnız
metinleri doldurur (7 sayfa sınırı korunur).

`deck_data.json` sunum sayılarını `build_dashboard.build_payload()`'dan alır — slaytlar ile
dashboard aynı kaynaktan beslenir, ayrışamaz. Sunucu akışı: `sunum/SUNUM_KILAVUZU.md`.

## Diğer script'ler

```bash
uv run train_demand_model.py    # TensorFlow/Keras hibrit model → demand_model.keras + model_results.json
```

`train_demand_model.py` çıktısı varsa dashboard AI bölümünü otomatik doldurur; yoksa uyarı gösterir.

Üst bardaki **📖 Sözlük** düğmesi, ekranlardaki tüm kısaltmaların (PN, AOG, TAT, TTS/TTR, CLP, FMV,
BER, SBA, cold-start…) aranabilir Türkçe açıklamalarını açar — jüri veya ekip üyesi terim takılırsa tek tık.

## Dosyalar

| Dosya | Açıklama |
|---|---|
| `core.py` | **Tek doğruluk kaynağı** — tüm formüller (risk, float, TTS/TTR, Poisson min-max, BER, kabiliyet ROI) + parametreler (CLAUDE.md §4.1) |
| `build_dashboard.py` | core.py → JSON payload → `catalyst.html` **+ `web/src/data/payload.json`** |
| `web/` | React + TypeScript web uygulaması (aynı payload, aynı formüller, THY tasarım dili) |
| `assets/app.css`, `assets/app.js` | Dashboard tasarım sistemi ve uygulama katmanı |
| `vendor/chart.umd.js` | Chart.js 4.4.4 (gömülür — internetsiz çalışma) |
| `CLAUDE.md` | Proje bağlamı: doğrulanmış tüm sayılar, formüller, vizyon, sunum planı |
| `dummy_pn_quarterly_data.csv` | 5.000 PN × 4 çeyrek talep/scrap/TAT (resmi girdi) |
| `dummy_pn_inventory_status.csv` | PN bazlı stok kovaları + CLP/FMV/tamir maliyetleri (resmi girdi) |
| `fleet_distribution.csv` | 14 model, 2025→2033 filo projeksiyonu (resmi girdi) |
| `train_demand_model.py`, `demand_model.keras`, `model_deney_notlari.md` | Derin öğrenme hattı |
| `data_explorer.py` | İç veri gezgini (PyQt6, sunum değil) |

## Doğrulama

- Gömülü her sayı `core.py`'den yeniden üretilebilir; CLAUDE.md §3'teki 102 metrik script'le mutabakatlandı.
- Float formülü saha doğrulaması: model 8.012 ↔ gerçek tamirde 7.800 adet (**%97**).
- Risk skoru 1 numarası PN-101741, envanter verisinde fiilen kırmızı.
- **Tüm veriler sentetik/temsili** — gerçek THY/AMOS verisi değildir.

Referans: Sezenoğlu Çetin vd., *Data-Driven Predictive Maintenance for Aircraft Components
Through Sparse Event Logs*, Aerospace 2026, 13, 110.
