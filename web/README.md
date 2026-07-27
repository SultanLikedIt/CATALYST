# Catalyst — web uygulaması

`catalyst.html`'in (tek dosyalık prototip) tüm özelliklerini koruyan React + TypeScript sürümü.
Amaç: sunuma hazır, geliştirilebilir bir taban — 3D harita, sahne animasyonları ve yeni
ekranlar buraya eklenir.

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # dist/          — kod bölünmüş statik site
npm run build:tek-dosya  # dist-tek-dosya/index.html — TEK DOSYA, offline (jüri demosu)
npm test                 # engine parite testleri (34 kontrol)
npm run tip              # tsc --noEmit
```

## Neden bu yığın

| Seçim | Gerekçe |
|---|---|
| **React 19 + TypeScript + Vite** | 3D için tek olgun ekosistem R3F; TS, 5.000 parçalık kolon dizilerinde alan adı hatalarını derlemede yakalıyor |
| **framer-motion** | Sahne geçişleri, sekme göstergesi, kart giriş sıralaması; 3D kamera hareketiyle aynı easing tokenlarını paylaşır |
| **Chart.js + react-chartjs-2** | 25 grafiğin yapılandırması tek dosyalık sürümden birebir taşınabildi — görsel davranış taşımada değişmedi |
| **zustand** | Ekranlar arası köprüler (Karar Merkezi → Watchlist → Harita) ve senaryo parametreleri tek mağazada; prop zinciri yok |
| **three + R3F + drei** | Kurulu ve ayrı chunk'ta bekliyor: harita 3D'ye geçtiğinde `views/harita/` altındaki render katmanı değişir |
| **vite-plugin-singlefile** | `catalyst.html`'in "internet gerektirmez, çift tıkla açılır" garantisi korunuyor |

## Mimari

```
src/
  data/        payload.json (core.py çıktısı) + TS tipleri + dünya konturu
  engine/      HESAP ÇEKİRDEĞİ — saf TS, DOM bilmez
               stats · flags · ladder · karar · oner · senaryo · format
  design/      tokens.css (THY paleti) · base.css · code.css (konsol) · motion.ts · renkler.ts
  app/         App (kabuk, sekmeler, geçiş) · store (zustand) · Sözlük
  components/  Grafik (Chart.js sarmalayıcı) · temel (Kart/Kpi/Cip/…) · KararKarti (tek karar mekanizması)
  views/       Code · Watchlist · Ongoru · Harita · Senaryo
               code/{Kure,KararKonsolu,UzunVade,icgoru,sahneVeri}
               watchlist/ParcaDetay · harita/{haritaVeri,useGorunum} · senaryo/{ParamPanel,Belirsizlik}
```

## CODE — açılış ekranı

İlk sekme, koyu operasyon konsolu temasındaki **CODE (Component Decision Engine)**; uygulamanın
geri kalanı açık THY temasında kalır (`design/code.css` yalnız bu ekranı sarar, üst bar CODE'da
koyu tona geçer).

**Karar mekanizması watchlist'ten buraya taşındı.** Kart tek bileşendir
(`components/KararKarti.tsx`): konsolda düğmeleriyle, parça detayında `saltOkunur` modunda —
oradan "CODE konsolunda karar ver" köprüsü aynı parçayı konsolda açar. Bir parça hakkında karar
tek yerde verilir, iki ekran çelişemez.

`code/Kure.tsx` — 5.000 parçanın 3D küresi. Üç tasarım kararı kayda değer:

- **Nokta ışını yerine seçim yüzeyi.** 5.000 nokta birim kürede çok sıkışık; ışın eşiği geniş
  olunca imleçten uzaktaki parça seçiliyor, dar olunca tıklama boşa gidiyordu. Görünmez küre
  yüzeyine çarpan yön ile parça yönlerinin iç çarpımı "gözle tıklanan nokta"yı verir.
- **Etiketler drei `Html` değil, kendi katmanımız.** drei her etiket için tuvali kaplayan bir
  sarmalayıcı div açıyor ve küre üzerindeki tıklamayı yutuyordu (DOM'da doğrulandı). Etiketler
  artık `.kure-etiketler` katmanında; konumları her karede 3D'den yansıtılır, küre arkasına
  geçince sönüp tıklamayı bırakırlar.
- **Tekerlek yakınlaştırması kapalı.** Sahne sayfanın ortasında; tekerlek yutulunca sayfa
  kaydırılamıyordu. Yakınlaştırma köşedeki düğmelerde, döndürme sürüklemede.

WebGL açılmazsa `SahneKalkani` hata sınırı sahneyi düşürür, konsol ve sayılar çalışmaya devam
eder — sunum durmaz.

**Kural:** hesap `engine/`de, çizim `views/`te. Bir sayı iki ekranda görünüyorsa ikisi de aynı
engine fonksiyonunu çağırır — "iki ekran çelişemez" garantisi kodun şeklinden gelir.

## Veri hattı

Tek doğruluk kaynağı hâlâ `core.py`. Web uygulaması hesaplanmış sayı üretmez, `payload.json` okur:

```bash
# Python ortamı varsa (kanonik yol) — catalyst.html + payload.json birlikte üretilir
cd .. && uv run build_dashboard.py

# Python yoksa: mevcut catalyst.html'den birebir aynı JSON ayıklanır
node scripts/veri-cikar.mjs
```

## Parite

`npm test` — 34 kontrol, hepsi CLAUDE.md §3 ve `smoke_test.js`'ten alınmış sabit değerlere karşı:
kanal dağılımı 694/641/217/3.448 · sipariş alarmı 42 · kırmızı 134/22 · motor krizi 477 ·
OEM 283 · belirsizlik 389 (%80: 371–408) · motor krizi 797 · kapalı form ↔ 800 deneme uyumu.

Testler "kod çalışıyor mu" demiyor; **taşımada tek bir sayının kaybolmadığını** kanıtlıyor.

## 3D'ye geçiş için hazırlık

Harita bilerek üçe bölündü:

- `views/harita/haritaVeri.ts` — projeksiyon, mesafe, süre, kanal yelpazesi, rota senaryoları.
  **Render'dan tamamen bağımsız**; 3D küre aynı fonksiyonları çağırır, sayılar ayrışamaz.
- `views/harita/useGorunum.ts` — 2D kaydırma/yakınlaştırma jestleri. 3D'de yerini `OrbitControls` alır.
- `views/Harita.tsx` — SVG çizimi + paneller. Yalnız çizim bloğu değişir; detay kartı, istasyon
  tablosu, rota paneli ve kriz katmanı olduğu gibi kalır.

`three`, `@react-three/fiber`, `@react-three/drei` kurulu ve `vite.config.ts` içinde ayrı chunk'a
ayrılmış durumda; 3D bileşen `lazy()` ile yüklendiğinde ilk açılış ağırlaşmaz.

## Bilinen tasarım kararı

Sekme geçişi yalnız **giriş** animasyonu kullanıyor (çıkış animasyonu yok). `AnimatePresence
mode="wait"` denendi: tembel yüklenen bir sekme askıya alındığında çıkış "tamamlandı" sayılmıyor
ve ekran eski görünümde kilitleniyor. Sunumda donan ekranın bedeli, çıkış animasyonunun
getirisinden büyük. Sekme parçaları ilk boyamadan 400 ms sonra arka planda çekiliyor, böylece
geçişte yükleme yazısı da görünmüyor.
