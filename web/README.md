# Catalyst — web uygulaması

`catalyst.html`'in (tek dosyalık prototip) tüm özelliklerini koruyan React + TypeScript sürümü.
Amaç: sunuma hazır, geliştirilebilir bir taban — 3D harita, sahne animasyonları ve yeni
ekranlar buraya eklenir.

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # dist/          — kod bölünmüş statik site
npm run build:tek-dosya  # dist-tek-dosya/index.html — TEK DOSYA, offline (jüri demosu)
npm test                 # parite + geometri testleri (44 kontrol)
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
  design/      tokens.css (THY paleti) · base.css · code.css (konsol) · kure.css (harita HUD)
               motion.ts · renkler.ts
  app/         App (kabuk, sekmeler, geçiş) · store (zustand) · Sözlük
  components/  Grafik (Chart.js sarmalayıcı) · temel (Kart/Kpi/Cip/…) · KararKarti (tek karar mekanizması)
  views/       Code · Watchlist · Ongoru · Harita · Senaryo
               code/{Kure,KararKonsolu,UzunVade,icgoru,sahneVeri}
               watchlist/ParcaDetay · senaryo/{ParamPanel,Belirsizlik}
               harita/haritaVeri · harita/kure/{kureGeo,kureStil,KureSahne}
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

`npm test` — **44 kontrol**. 34'ü sayı paritesi, hepsi CLAUDE.md §3 ve `smoke_test.js`'ten alınmış
sabit değerlere karşı: kanal dağılımı 694/641/217/3.448 · sipariş alarmı 42 · kırmızı 134/22 ·
motor krizi 477 · OEM 283 · belirsizlik 389 (%80: 371–408) · motor krizi 797 · kapalı form ↔ 800
deneme uyumu.

Kalan 10'u küre geometrisi (`kureGeo.test.ts`): dünyanın ayna görüntüsü olmadığı (Atlantik'ten
bakınca İstanbul sağda, JFK solda), yayların iki havalimanını gerçekten birleştirdiği ve kara
ızgarasının karayı karada, denizi denizde bulduğu kilitlenir.

Testler "kod çalışıyor mu" demiyor; **taşımada tek bir sayının kaybolmadığını** kanıtlıyor.

## HARİTA — tam ekran 3D küre

2D SVG harita yerini **ekranın tamamını kaplayan operasyon küresine** bıraktı; paneller kürenin
üstünde cam HUD olarak durur. Seam işe yaradı: `haritaVeri.ts` (süre/kanal/rota/metrik) tek satır
değişmeden kaldı, yalnız çizim katmanı değişti. `useGorunum.ts` (2D jestler) silindi, yerini
`OrbitControls` aldı.

| Dosya | İş |
|---|---|
| `harita/kure/kureGeo.ts` | Saf matematik: lon/lat → küre, büyük çember yayı + örnekleyici, kara noktası ızgarası, kıyı/meridyen çizgileri, kamera çerçevesi. three.js **bilmez**, testleri node'da koşar |
| `harita/kure/kureStil.ts` | Koyu zemin paleti — depo/kanal renklerinin anlamı 2D ile birebir, yalnız parlaklık taşındı; akış hızları kanal tipine bağlı |
| `harita/kure/KureSahne.tsx` | R3F sahnesi: küre, yıldızlar, atmosfer, istasyon sütunları, akan parçacıklı yaylar, kamera uçuşu, etiket katmanı |
| `design/kure.css` | Tam ekran yerleşim + cam paneller (`.kure` yalnız bu ekranı sarar) |

**Kıtalar dosyadan değil, hesaptan.** Hazır `earth.jpg` yok (uygulama internetsiz açılmak
zorunda): kara noktaları aynı 110m kontur verisinden, çalışma anında nokta-içinde-poligon testiyle
üretiliyor. Boylam adımı `1/cos(lat)` ile açılır, noktalar kutuplarda sıkışmaz.

**Akış = süre.** Yay üzerindeki parçacıkların hızı kanal tipinden gelir (`AKIS_HIZ`): havuzdan
değişim akıp giderken satın alma yolu sürünür. "Hangi yol hızlı" sorusu tabloya bakmadan, hareketten
okunur. Kanal satırına tıklamak kamerayı o yola uçurur — kısa depo transferi Türkiye'ye yaklaşır,
OEM satın alma Avrupa'ya açılır.

Ölçülen üç karar:

- **Kadraj bütün kanalları birden çerçevelemez.** Denendi: tek bir JFK havuz seçeneği kamerayı
  dünyaya kadar geri çekiyor ve asıl konu (AOG istasyonu) kenarda kalıyordu. Kural artık "hedef +
  konuşulan kaynak".
- **İşaretler zoom'la büyümez** (2D'deki maplibre davranışı korundu): halka/nabız ölçeği kamera
  uzaklığıyla çarpılır. Aksi hâlde Türkiye'ye yaklaşınca tek halka ekranı kaplıyordu. Sütun boyu
  ise coğrafi veridir, dünya ölçeğinde kalır.
- **Yay çizgisinde toplamsal karışım yok.** Yaylar hedefte demet hâlinde birleşiyor ve toplamsal
  karışım demeti beyaza doyurup kanal rengini yok ediyordu; ışıma yalnız parçacıklarda.

Açılış kadrajı animasyonla değil doğrudan kurulur (`baslangic`): sekmeye geçildiğinde küre ilk
karede doğru yere bakar, CODE'dan "haritada göster" ile gelindiğinde doğrudan o rotanın kadrajında
doğar. Etiketler drei `Html` değil kendi katmanımız (bkz. CODE küresi) ve çakışanlar önem sırasına
göre elenir — Türkiye kümesinde 16 nokta üst üste binmesin.

`three`, `@react-three/fiber`, `@react-three/drei` ayrı chunk'ta ve sahne `lazy()`; ilk açılış
ağırlaşmaz. WebGL açılmazsa `SahneKalkani` sınırı sayıları düz listeyle gösterir, bağlam kaybında
sahne kendini geri yükler.

## Bilinen tasarım kararı

Sekme geçişi yalnız **giriş** animasyonu kullanıyor (çıkış animasyonu yok). `AnimatePresence
mode="wait"` denendi: tembel yüklenen bir sekme askıya alındığında çıkış "tamamlandı" sayılmıyor
ve ekran eski görünümde kilitleniyor. Sunumda donan ekranın bedeli, çıkış animasyonunun
getirisinden büyük. Sekme parçaları ilk boyamadan 400 ms sonra arka planda çekiliyor, böylece
geçişte yükleme yazısı da görünmüyor.
