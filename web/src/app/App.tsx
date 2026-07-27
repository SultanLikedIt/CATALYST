import { lazy, Suspense, useEffect } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { useStore, SEKMELER, type Sekme } from './store';
import Sozluk from './Sozluk';
import { K, B, PRM } from '@/data/payload';
import { fmt, pct, vir } from '@/engine/format';
import { sahne } from '@/design/motion';

/* Sekmeler ayrı parçalara bölünür: ilk açılış hafif kalır, harita sekmesi
   3D katmanına geçtiğinde three.js yalnız o sekmeye girildiğinde yüklenir. */
const Code = lazy(() => import('@/views/Code'));
const Watchlist = lazy(() => import('@/views/Watchlist'));
const Ongoru = lazy(() => import('@/views/Ongoru'));
const Harita = lazy(() => import('@/views/Harita'));
const Senaryo = lazy(() => import('@/views/Senaryo'));

const GORUNUM: Record<Sekme, React.ComponentType> = {
  karar: Code,
  watch: Watchlist,
  ongoru: Ongoru,
  harita: Harita,
  senaryo: Senaryo,
};

/** Sunumda sekme geçişinde yükleme yazısı görünmesin: ilk boyamadan sonra hepsi arka planda çekilir. */
const YUKLEYICILER = [
  () => import('@/views/Watchlist'),
  () => import('@/views/Ongoru'),
  () => import('@/views/Harita'),
  () => import('@/views/Senaryo'),
];

/** Marka işareti — THY kırmızısında yükseliş rotası. */
function MarkaIsaret() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 20 C7 20 10 15 12 10 C14 5 17 3 22 3"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="12" cy="10" r="2.6" fill="currentColor" />
    </svg>
  );
}

function UstBar() {
  const sekme = useStore((s) => s.sekme);
  const git = useStore((s) => s.git);
  const bas = useStore((s) => s.sozlugeBas);

  // CODE sekmesinde üst bar da konsol tonuna geçer: ilk sayfa baştan sona CODE'undur.
  return (
    <nav className={'topbar' + (sekme === 'karar' ? ' koyu' : '')}>
      <div className="topbar-in">
        <span className="brand">
          <MarkaIsaret />
          <b>CATALYST</b> · 2033
        </span>
        <span className="synth">SENTETİK / TEMSİLİ VERİ</span>
        <button className="dic-btn" onClick={() => bas()} title="Kısaltmalar sözlüğü">
          📖 SÖZLÜK
        </button>
        <LayoutGroup id="sekmeler">
          <div className="tabs" role="tablist">
            {SEKMELER.map((s) => (
              <button
                key={s.k}
                role="tab"
                aria-selected={sekme === s.k}
                className={'tab' + (sekme === s.k ? ' on' : '')}
                onClick={() => git(s.k)}
              >
                {s.ad}
                {sekme === s.k && (
                  <motion.span
                    className="tab-ind"
                    layoutId="sekme-gostergesi"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            ))}
          </div>
        </LayoutGroup>
      </div>
    </nav>
  );
}

function Yukleniyor() {
  return (
    <div style={{ padding: '60px 0', color: 'var(--tx-3)', fontSize: '.85rem' }}>
      <motion.div
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 1.1, repeat: Infinity }}
      >
        hesaplanıyor…
      </motion.div>
    </div>
  );
}

export default function App() {
  const sekme = useStore((s) => s.sekme);
  const yon = useStore((s) => s.yon);
  const Gorunum = GORUNUM[sekme];

  useEffect(() => {
    const t = setTimeout(() => YUKLEYICILER.forEach((f) => void f()), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <UstBar />
      <div className="wrap">
        {/* CODE kendi dev başlığını taşır — genel hero yalnız diğer sekmelerde çıkar. */}
        {sekme !== 'karar' && (
          <header className="hero">
            <h1>
              Catalyst · Komponent Envanter <em>Karar Desteği</em>
            </h1>
            <p>
              {fmt(K.pn)} parça · 1.200 → 2.000 uçak projeksiyonu · tüm sayılar üç resmi veri
              setinden <span className="mono">core.py</span> ile hesaplanır.
            </p>
          </header>
        )}

        {/* Sekme geçişi BİLEREK yalnız giriş animasyonu (AnimatePresence + çıkış yok).
            Çıkış animasyonu denendi: tembel yüklenen sekme askıya alındığında
            AnimatePresence çıkışı tamamlanmış saymıyor ve ekran eski görünümde
            kilitleniyor. Sunumda donan ekranın bedeli, çıkış animasyonunun
            getirisinden büyük. key ile yeniden mount + giriş animasyonu yeterli. */}
        <motion.main key={sekme} initial={sahne(yon).initial} animate={sahne(yon).animate}>
          <Suspense fallback={<Yukleniyor />}>
            <Gorunum />
          </Suspense>
        </motion.main>

        <div className="foot">
          <b>Varsayımlar.</b> Kullanılabilir stok = FAAL + HOMEBASE. Harita temsilî dağıtım,
          mevsimsellik tek yıla dayanır. Projeksiyon aralıktır: +{pct(B.alt_pct)} ile +
          {pct(B.ust_pct)} arası. Kritiklik ağırlıkları, BER eşiği {vir(PRM.ber_esigi)} ve servis
          hedefleri Senaryo sekmesinden ayarlanabilir. Tüm veriler resmi sentetik case setleridir,
          gerçek THY/AMOS verisi değildir.
        </div>
      </div>
      <Sozluk />
    </>
  );
}
