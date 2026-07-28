/**
 * 5 · SENARYO — kriz simülatörü, canlı parametre paneli, belirsizlik denemeleri,
 * dayanıklılık, duyarlılık, kaynak önceliklendirme ve kabiliyet ROI kapanışı.
 *
 * Vizyon çerçevesinin (CLAUDE.md §7.3) ekran karşılığı: her kriz ya TTS'yi kısaltır
 * ya TTR'yi uzatır → kriz bir parametre şoku → stres testi projeksiyon motorunun
 * üstünde bir düğme.
 */
import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { D, K, LK, PIDX } from '@/data/payload';
import {
  senaryoHesap,
  ttsDagilim,
  PRESETS,
  BAZ_CFG,
  TTS_ET,
  type SenaryoCfg,
} from '@/engine/senaryo';
import { fmt, f1, mM, mUsd, vir } from '@/engine/format';
import { CC as C, S, tint } from '@/design/renkler';
import { useStore } from '@/app/store';
import { Bolum, Kart, Izgara, Kaydirici, Cip, Yigin } from '@/components/temel';
import Grafik from '@/components/Grafik';
import ParamPanel from './senaryo/ParamPanel';
import Belirsizlik from './senaryo/Belirsizlik';

function Stat({ l, v, d, ton = '' }: { l: string; v: string; d: React.ReactNode; ton?: string }) {
  return (
    <div className={'kpi ' + ton} style={{ padding: '12px 14px' }}>
      <div className="l">{l}</div>
      <div className="v" style={{ fontSize: '1.3rem' }}>
        {v}
      </div>
      <div className="d">{d}</div>
    </div>
  );
}

export default function Senaryo() {
  const sc = useStore((s) => s.senaryo);
  const senaryoDegis = useStore((s) => s.senaryoDegis);
  const parcaAc = useStore((s) => s.parcaAc);
  const watchAc = useStore((s) => s.watchAc);

  const cfg: SenaryoCfg = sc;
  const BAZ = useMemo(() => senaryoHesap(BAZ_CFG), []);
  const r = useMemo(() => senaryoHesap(cfg), [cfg]);

  const presetSec = (k: string) => {
    const p = PRESETS[k];
    if (!p) return;
    senaryoDegis({
      d: p.d,
      l: p.l,
      s: p.s,
      yeniDem: p.yeniDem,
      kuculDem: p.kuculDem,
      disOnly: p.disOnly,
      preset: k,
    });
  };

  /** kaydırıcı elle oynatılınca senaryo "özel" olur, alt küme çarpanları düşer */
  const elleDegis = (y: Partial<SenaryoCfg>) =>
    senaryoDegis({ ...y, preset: 'ozel', yeniDem: 0, kuculDem: 0, disOnly: false });

  /* ------------------------------------------------- kırmızı dağılımı grafiği */
  const scenCfg = useMemo<ChartConfiguration>(
    () =>
      ({
        type: 'bar',
        data: {
          labels: LK.kr,
          datasets: [
            {
              label: 'Kırmızı, baz durum',
              data: BAZ.byKr,
              backgroundColor: tint(C.gri, 0.36),
              borderRadius: 4,
            },
            {
              label: 'Kırmızı, senaryo',
              data: r.byKr,
              backgroundColor: tint(C.kritik, 0.72),
              borderRadius: 4,
            },
          ],
        },
        options: {
          animation: { duration: 250 },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      }) as ChartConfiguration,
    [r, BAZ],
  );

  /* ------------------------------------------------------------ dayanıklılık */
  const ttsCfg = useMemo<ChartConfiguration>(() => {
    const baz = ttsDagilim(BAZ_CFG);
    const d = ttsDagilim(cfg);
    return {
      type: 'bar',
      data: {
        labels: TTS_ET,
        datasets: [
          {
            label: 'Baz durum',
            data: baz,
            backgroundColor: tint(C.gri, 0.34),
            borderColor: C.gri,
            borderWidth: 1,
            borderSkipped: false,
          },
          {
            label: 'Senaryo',
            data: d,
            hidden: sc.preset === 'baz',
            backgroundColor: tint(C.kritik, 0.5),
            borderColor: C.kritik,
            borderWidth: 1,
            borderSkipped: false,
          },
        ],
      },
      options: {
        animation: { duration: 200 },
        plugins: {
          legend: { labels: { boxWidth: 9, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              title: (it) => it[0].label + ' gün',
              label: (c) => ` ${c.dataset.label}: ${fmt(Number(c.parsed.y))} parça`,
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'eldeki stokla dayanma süresi (gün)' },
            ticks: { font: { size: 9 } },
          },
          y: { beginAtZero: true, title: { display: true, text: 'parça sayısı' } },
        },
      },
    } as ChartConfiguration;
  }, [cfg, sc.preset]);

  /* ------------------------------------------------------- tornado duyarlılık */
  const tornadoCfg = useMemo<ChartConfiguration>(() => {
    const td = D.tornado;
    return {
      type: 'bar',
      data: {
        labels: td.etiket,
        datasets: [
          {
            label: 'aralık ($M)',
            data: td.etiket.map((_, i) => [td.dusuk[i], td.yuksek[i]]),
            backgroundColor: S.s4,
            borderColor: S.s2,
            borderWidth: 1.2,
            borderRadius: 3,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => {
                const v = c.raw as number[];
                return ` ${mM(v[0])} – ${mM(v[1])}  ·  baz ${mM(td.baz)}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: '2033 açığını kapatma maliyeti, baz: ' + mM(td.baz) },
            ticks: { callback: (v) => '$' + v + 'M' },
          },
          y: { ticks: { font: { size: 9.5 }, autoSkip: false } },
        },
      },
    } as ChartConfiguration;
  }, []);

  /* ------------------------------------------------ önceliklendirme sınır eğrisi */
  const optCfg = useMemo<ChartConfiguration>(() => {
    const od = D.opt;
    return {
      type: 'line',
      data: {
        datasets: [
          {
            type: 'line',
            label: 'Kapanan açık PN',
            data: od.butce.map((b, i) => ({ x: b, y: od.kapanan[i] })),
            borderColor: C.teal,
            backgroundColor: C.teal,
            pointRadius: 0,
            borderWidth: 2,
            tension: 0.15,
          },
          {
            type: 'line',
            label: 'Risk azaltım kazanımı (%)',
            yAxisID: 'y1',
            data: od.butce.map((b, i) => ({ x: b, y: od.kazanc[i] })),
            borderColor: C.violet,
            backgroundColor: C.violet,
            pointRadius: 0,
            borderWidth: 2,
            borderDash: [5, 4],
            tension: 0.15,
          },
        ],
      },
      options: {
        plugins: {
          legend: { labels: { boxWidth: 9, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              title: (it) => 'bütçe ' + mM(Number(it[0].parsed.x)),
              label: (c) =>
                ` ${c.dataset.label}: ${
                  c.datasetIndex ? '%' + f1(Number(c.parsed.y)) : fmt(Number(c.parsed.y)) + ' PN'
                }`,
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'kümülatif bütçe ($M)' },
            ticks: { callback: (v) => '$' + v + 'M' },
          },
          y: { beginAtZero: true, title: { display: true, text: 'kapanan PN' } },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 102,
            grid: { drawOnChartArea: false },
            ticks: { callback: (v) => '%' + v },
          },
        },
      },
    } as ChartConfiguration;
  }, []);

  const dK = r.kir - BAZ.kir;
  const dA = r.acik - BAZ.acik;
  const notMetni = PRESETS[sc.preset]
    ? PRESETS[sc.preset].not
    : 'Özel senaryo, kaydırıcılarla tanımlandı.';

  return (
    <>
      <Bolum
        baslik="Kriz ve dayanıklılık simülatörü"
        aciklama="Her kriz ya stoğun dayanma süresini kısaltır ya da tedarik süresini uzatır. Senaryo bu iki değişkeni değiştirir, 5.000 parça anında yeniden hesaplanır."
      />

      <Izgara tip="g12">
        <Kart baslik="Şok parametreleri" ipucu={notMetni}>
          <Kaydirici
            etiket="Talep şoku"
            deger={cfg.d}
            min={0}
            max={80}
            adim={5}
            bicim={(v) => '+%' + v}
            onDegis={(v) => elleDegis({ d: v })}
          />
          <Kaydirici
            etiket="Tedarik / TAT şoku"
            deger={cfg.l}
            min={0}
            max={100}
            adim={5}
            bicim={(v) => '+%' + v}
            onDegis={(v) => elleDegis({ l: v })}
          />
          <Kaydirici
            etiket="Servis hedefi sıkılaştırma"
            deger={cfg.s}
            min={0}
            max={20}
            adim={5}
            bicim={(v) => '+' + v + ' pp'}
            onDegis={(v) => elleDegis({ s: v })}
          />
          <div className="ctl" style={{ margin: '4px 0 0' }}>
            {Object.entries(PRESETS).map(([k, p]) => (
              <Cip key={k} acik={sc.preset === k} onClick={() => presetSec(k)}>
                {p.ad}
              </Cip>
            ))}
          </div>
          <div className="hint" style={{ marginTop: 12 }}>
            Her senaryo farklı bir alt kümeyi vurur: motor krizi yeni nesil talebini, lojistik dışa
            bağımlı tedarik sürelerini, OEM gecikmesi küçülen modellerin talebini.
          </div>
        </Kart>

        <Kart baslik="Etki: 5.000 parça canlı yeniden hesaplanıyor">
          <div className="grid g3" style={{ margin: '12px 0 4px' }}>
            <Stat
              l="Kırmızı parça (bugün)"
              v={fmt(r.kir)}
              ton="red"
              d={
                dK ? (
                  <>
                    baz {BAZ.kir} · <b style={{ color: C.red }}>+{fmt(dK)}</b>
                  </>
                ) : (
                  'baz durum, saha ile birebir'
                )
              }
            />
            <Stat
              l="AOG kritik kırmızı"
              v={fmt(r.kirAog)}
              d={`baz ${BAZ.kirAog}`}
              ton={r.kirAog > BAZ.kirAog ? 'red' : ''}
            />
            <Stat
              l="Kapatma maliyeti"
              v={mM(r.kap / 1e6)}
              d={`baz ${mM(BAZ.kap / 1e6)}`}
              ton="amber"
            />
            <Stat
              l="2033 MIN altında PN"
              v={fmt(r.acik)}
              d={dA ? `baz ${fmt(BAZ.acik)} · +${fmt(dA)}` : 'önerilen plana göre'}
            />
            <Stat
              l="Ek stok yatırımı"
              v={mM(r.ek / 1e6)}
              d="2033 MIN'e tamamlama (CLP)"
              ton="amber"
            />
            <Stat
              l="Şok profili"
              v={PRESETS[sc.preset] ? PRESETS[sc.preset].ad : 'Özel'}
              d={`talep +%${cfg.d} · TAT +%${cfg.l} · hedef +${cfg.s}pp`}
            />
          </div>
          <Grafik cfg={scenCfg} h={210} />
        </Kart>
      </Izgara>

      <ParamPanel />

      <Bolum
        baslik="Belirsizlik denemeleri: plan kaç farklı gelecekte tutuyor?"
        aciklama='Talep kesin bir sayı değil, bir dağılım. Her parça için tedarik süresi boyunca gelen talebin stoğu aşma olasılığı hesaplanır; bunların toplamı "kaç parça açıkta kalır" sorusunun tek bir cevabını değil, bütün bir aralığını verir. Aşağıdaki her sayı soldaki senaryo ayarlarına bağlıdır ve anında yeniden hesaplanır.'
      />
      <Belirsizlik cfg={cfg} preset={sc.preset} onPreset={presetSec} />

      <Yigin stil={{ marginTop: 12 }}>
        <Kart
          baslik="Dayanıklılık: filo kaç gün dayanır?"
          ipucu="Her parçanın eldeki stokla kaç gün dayanacağı. Senaryo değiştikçe dağılım canlı kayar; baz durum arkada gri olarak kalır. Soldaki parçalar bir tedarik şokunda ilk düşecek olanlar."
        >
          <Grafik cfg={ttsCfg} h={215} />
        </Kart>
      </Yigin>

      <Izgara tip="g21" stil={{ marginTop: 12 }}>
        <Kart
          baslik="Duyarlılık: 2033 açığını kapatma maliyetini ne oynatır?"
          ipucu={
            <>
              Temel maliyet <b>{mM(D.tornado.baz)}</b>. Çubuklar her etkenin iki ucunu gösteriyor.
              En büyük etken <b>tedarik süreleri</b>. Kabiliyet yatırımı çubuğu ise 547 parçayı iç
              tamire almanın açığı ne kadar küçülttüğünü gösteriyor.
            </>
          }
        >
          <Grafik cfg={tornadoCfg} h={200} />
        </Kart>
      </Izgara>

      <Yigin stil={{ marginTop: 14 }}>
        <Kart
          baslik="Kaynak önceliklendirme: kısıtlı bütçeyle önce ne alınır?"
          ipucu={
            <>
              Bir parçaya eklenecek her adet için "harcanan para başına ne kadar risk azalıyor"
              hesaplanıyor ve {fmt(D.opt.toplam_adim)} alım adımının hepsi bu ölçüye göre
              sıralanıyor. Eğri, sınırlı bir bütçenin nereye kadar gittiğini gösteriyor. Tamamı{' '}
              {mM(D.opt.toplam_butce)} ama{' '}
              <b>ilk birkaç milyon dolar kazancın büyük bölümünü sağlıyor</b>.
            </>
          }
        >
          <div className="grid g21" style={{ margin: 0 }}>
            <Grafik cfg={optCfg} h={235} />
            <div className="tw" style={{ maxHeight: 235 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ cursor: 'default' }}>#</th>
                    <th style={{ cursor: 'default' }}>PN</th>
                    <th style={{ cursor: 'default' }}>Kategori</th>
                    <th style={{ cursor: 'default' }}>Kritiklik</th>
                    <th className="n" style={{ cursor: 'default' }}>
                      Adet
                    </th>
                    <th className="n" style={{ cursor: 'default' }}>
                      Maliyet
                    </th>
                    <th className="n" style={{ cursor: 'default' }}>
                      Stok-out olasılığı
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {D.opt.ilk10.map((o, n) => (
                    <tr
                      key={o.pn}
                      style={{ cursor: 'pointer' }}
                      onClick={() => PIDX[o.pn] != null && parcaAc(PIDX[o.pn])}
                    >
                      <td className="n">{n + 1}</td>
                      <td className="pn-link mono">PN-{o.pn}</td>
                      <td>{o.sub}</td>
                      <td>
                        {o.krit === 'AOG KRİTİK' ? (
                          <span className="bg bg-aog">AOG</span>
                        ) : o.krit === 'KRİTİK' ? (
                          <span className="bg bg-kri">KRİTİK</span>
                        ) : (
                          <span className="bg bg-nk">DEĞİL</span>
                        )}
                      </td>
                      <td className="n">{fmt(o.adet)}</td>
                      <td className="n">{mUsd(o.maliyet)}</td>
                      <td className="n" style={{ color: o.stokout > 60 ? C.red : C.muted }}>
                        %{vir(o.stokout)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Kart>
      </Yigin>

      <Yigin stil={{ marginTop: 14 }}>
        <Kart
          stil={{ borderColor: 'var(--st-teal-line)' }}
          baslik={
            <h3 style={{ color: C.teal }}>Kabiliyet yatırımı: öncelik sırasına göre ilk 40 aday</h3>
          }
          ipucu={
            <>
              {K.risk_listesi} parça kritik ve iç tamiri yok, dış tamire yılda{' '}
              <b>{mM(K.kab_bugun)}</b> gidiyor. İç tamir yılda{' '}
              <b style={{ color: C.teal }}>
                {mM(K.kab_tasarruf)} tasarruf + {mM(K.kab_sermaye)} serbesti
              </b>{' '}
              getirir. Bu, duyarlılık grafiğindeki "kabiliyet yatırımı" çubuğunun kaynağıdır.{' '}
              <span className="bg bg-warn">ÜÇLÜ</span> = kritik + tamirsiz + geçmişsiz. Aşağıda ilk
              8 aday var;{' '}
              <Cip
                onClick={() => watchAc({ flag: 'R547' })}
                stil={{ padding: '1px 9px', fontSize: '.66rem' }}
              >
                tam listeyi watchlist'te aç
              </Cip>
            </>
          }
        >
          <div className="tw" style={{ maxHeight: 290 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'default' }}>#</th>
                  <th style={{ cursor: 'default' }}>PN</th>
                  <th style={{ cursor: 'default' }}>Kategori</th>
                  <th style={{ cursor: 'default' }}>Model</th>
                  <th className="n" style={{ cursor: 'default' }}>
                    Yıllık talep
                  </th>
                  <th className="n" style={{ cursor: 'default' }}>
                    Dış TAT
                  </th>
                  <th className="n" style={{ cursor: 'default' }}>
                    Dış harcama /yıl
                  </th>
                  <th className="n" style={{ cursor: 'default' }}>
                    Tasarruf /yıl
                  </th>
                  <th className="n" style={{ cursor: 'default' }}>
                    Serbesti
                  </th>
                  <th style={{ cursor: 'default' }} />
                </tr>
              </thead>
              <tbody>
                {D.roi.id.slice(0, 8).map((id, n) => (
                  <tr
                    key={id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => PIDX[id] != null && parcaAc(PIDX[id])}
                  >
                    <td className="n">{n + 1}</td>
                    <td className="pn-link mono">PN-{id}</td>
                    <td>{D.roi.sub[n]}</td>
                    <td>{D.roi.mdl[n]}</td>
                    <td className="n">{fmt(D.roi.t25[n])}</td>
                    <td className="n">{fmt(D.roi.tdis[n])} g</td>
                    <td className="n">{mUsd(D.roi.harcama[n])}</td>
                    <td className="n" style={{ color: C.teal }}>
                      {mUsd(D.roi.tasarruf[n])}
                    </td>
                    <td className="n">{mUsd(D.roi.sermaye[n])}</td>
                    <td>{D.roi.uclu[n] && <span className="bg bg-warn">ÜÇLÜ</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kart>
      </Yigin>

      <div className="foot" style={{ marginTop: 14 }}>
        Motor: TTS' = SVC/(λ·şok) &lt; TTR·şok → kırmızı · MIN' = ⌈λ'L'⌉ + Poisson emniyet stoğu
        (servis hedefi kritiklikle) · kapatma = Σ eksik gün-talebi × CLP. Formüller core.py ile
        birebir; baz değerler saha verisiyle doğrulandı.
      </div>
    </>
  );
}
