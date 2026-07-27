/**
 * 4 · HARİTA — istasyon ağı, depo katmanı, tamir akışı ve parça rotaları.
 *
 * Render katmanı ayrıştırıldı: geometri/süre/kanal hesapları harita/haritaVeri.ts'te,
 * jestler harita/useGorunum.ts'te, çizim aşağıdaki SVG'de. 3D küreye geçerken
 * yalnız çizim değişir — paneller, tablo ve rota mantığı aynı kalır.
 */
import { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fmt, f1, mUsd, pct, vir } from '@/engine/format';
import { CC as C } from '@/design/renkler';
import { senaryoHesap, PRESETS } from '@/engine/senaryo';
import { useStore } from '@/app/store';
import { Bolum, Kart, Cip } from '@/components/temel';
import { DUNYA } from '@/data/dunya';
import {
  HA,
  IST_I,
  W,
  HG,
  prj,
  PXY,
  yay,
  eta,
  sureTxt,
  kanalVeri,
  rotaVeri,
  wpSpec,
  DEPO_AD,
  DEPO_RENK,
  KANAL_RENK,
  GRUP,
  type RotaGorunum,
} from './harita/haritaVeri';
import { useGorunum } from './harita/useGorunum';

/** dünya konturu tek sefer hesaplanır — 110m veri, ~1.500 halka */
const ZEMIN = DUNYA.map(
  (ring) =>
    'M' +
    ring
      .map((p) => {
        const q = prj(p[0], p[1]);
        return q[0].toFixed(1) + ',' + q[1].toFixed(1);
      })
      .join('L') +
    'Z',
).join(' ');

interface Katmanlar {
  kriz: boolean;
  yil33: boolean;
  akis: boolean;
  rota: boolean;
}

export default function Harita() {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { vt, zoomAt, zoomBox, sifirla, kaydiRef, jestler } = useGorunum(svgRef);

  const senaryo = useStore((s) => s.senaryo);
  const odak = useStore((s) => s.haritaOdak);

  const [kat, setKat] = useState<Katmanlar>({
    kriz: false,
    yil33: false,
    akis: false,
    rota: false,
  });
  const [sel, setSel] = useState(0);
  const [rsen, setRsen] = useState(0);
  const [rpn, setRpn] = useState<number | null>(null);
  const [rk, setRk] = useState<number | null>(null);
  const [wp, setWp] = useState<{ i: number; hedef: number } | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);

  /* ---- Karar Merkezi / Watchlist köprüsü: parçayı haritada göster ---- */
  useEffect(() => {
    if (!odak) return;
    const hedef = HA.kod.indexOf(odak.hedef);
    if (hedef < 0) return;
    setKat((k) => ({ ...k, rota: false }));
    setWp({ i: odak.parca, hedef });
    setRpn(0);
    const ks = kanalVeri(wpSpec(odak.parca, odak.hedef), hedef);
    const k = ks.findIndex((o) => o.tip === odak.mod);
    setRk(k >= 0 ? k : null);
    const is_ = ks.map((o) => o.i).concat([hedef]);
    zoomBox(
      Math.min(...is_.map((x) => HA.lon[x])) - 3,
      Math.min(...is_.map((x) => HA.lat[x])) - 2,
      Math.max(...is_.map((x) => HA.lon[x])) + 3,
      Math.max(...is_.map((x) => HA.lat[x])) + 2,
    );
  }, [odak, zoomBox]);

  const ucak = (i: number) => (kat.yil33 ? HA.u33[i] : HA.u25[i]);

  /** kriz katmanı: senaryo sekmesindeki ayarla bağlı — kırmızı yükü kaç katına çıkıyor */
  const kf = useMemo(() => {
    if (!kat.kriz || senaryo.preset === 'baz') return 1;
    return senaryoHesap(senaryo).kir / 134;
  }, [kat.kriz, senaryo]);

  const rota: RotaGorunum | null = useMemo(
    () => (kat.rota || wp ? rotaVeri(rsen, wp) : null),
    [kat.rota, wp, rsen],
  );

  const zk = vt.k; // işaretler zoom'la büyümez (maplibre davranışı)
  const uMax = Math.max(...HA.kod.map((_, i) => ucak(i)));
  const sira = HA.kod.map((_, i) => i).sort((a, b) => ucak(b) - ucak(a));

  const not = rota
    ? rota.wp
      ? `rota: ${rota.sc.ucak} → ${rota.sc.hedef} · seçili parça · en hızlı ${sureTxt(rota.kritik)}`
      : `rota: ${rota.sc.ucak} · ${rota.sc.hedef} · 5 parça · kritik yol ${vir(rota.kritik)} saat`
    : kat.kriz
      ? senaryo.preset === 'baz'
        ? 'kriz katmanı: normal durum, Senaryo sekmesinden bir kriz seçebilirsiniz'
        : `kriz katmanı: ${PRESETS[senaryo.preset]?.ad ?? 'özel senaryo'}, kırmızı ×${f1(kf)}`
      : 'temsilî dağıtım, istasyon verisi veride yok';

  const ipucuGoster = (e: React.MouseEvent, html: string) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    setTip({
      x: Math.min(r.width - 250, e.clientX - r.left + 14),
      y: Math.max(6, e.clientY - r.top - 10),
      html,
    });
  };

  const istasyonIpucu = (i: number) =>
    `<b>${HA.kod[i]} · ${HA.ad[i]}</b><br>
     Uçak ${ucak(i)} (${kat.yil33 ? 2033 : 2025}) · ${DEPO_AD[HA.depo[i]]}<br>
     Stok: <span class="tt-v">${fmt(HA.kalem[i])}</span> kalem · <span class="tt-v">${fmt(
       HA.adet[i],
     )}</span> adet<br>
     IST transfer: <span class="tt-v">${
       HA.tsaat[i] === 0 ? 'ana üs' : vir(HA.tsaat[i]) + ' saat'
     }</span> · AOG kapsam ${pct(HA.kapsam[i] * 100, 0)}${
       kat.kriz && kf > 1
         ? `<br><span style="color:${C.kritik}">kriz: kırmızı yükü ×${f1(kf)}</span>`
         : ''
     }<br><i style="color:${C.dim}">temsilî dağıtım</i>`;

  const g = GRUP[HA.grp[sel]];
  const kanallar = rota && rpn != null ? kanalVeri(rota.sc.parcalar[rpn], rota.hIdx) : null;

  return (
    <>
      <Bolum
        baslik="İstasyon ağı"
        aciklama={
          <>
            <b>
              {HA.kod.filter((_, i) => !HA.yd[i]).length} yurt içi +{' '}
              {HA.kod.filter((_, i) => HA.yd[i]).length} yurt dışı istasyon
            </b>{' '}
            · grup toplamları case tablosuyla birebir, istasyon kırılımı ve depo katmanı temsilî.
            Noktaya tıkla, rota katmanını dene.
          </>
        }
      />

      <Kart>
        <div className="ctl">
          {(
            [
              ['kriz', 'Kriz katmanı'],
              ['yil33', '2033'],
              ['akis', 'Tamir akışı'],
              ['rota', 'Parça rotası'],
            ] as [keyof Katmanlar, string][]
          ).map(([k, ad]) => (
            <Cip key={k} acik={kat[k]} onClick={() => setKat((s) => ({ ...s, [k]: !s[k] }))}>
              {ad}
            </Cip>
          ))}
          <span className="note" style={{ marginLeft: 'auto' }}>
            {not}
          </span>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div className="tmap buyuk" ref={wrapRef} style={{ background: '#E9EDF2' }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${HG}`}
              preserveAspectRatio="xMidYMid meet"
              {...jestler}
              onPointerLeave={() => setTip(null)}
              onClick={(e) => {
                if (kaydiRef.current) {
                  kaydiRef.current = false;
                  return;
                }
                const t = e.target as Element;
                const hit = t.closest?.('[data-k],[data-p]') as HTMLElement | null;
                if (hit) {
                  if (hit.dataset.k != null) {
                    const k = +hit.dataset.k;
                    setRk((v) => (v === k ? null : k));
                  } else if (hit.dataset.p != null) {
                    setRpn(+hit.dataset.p);
                    setRk(null);
                  }
                  return;
                }
                const n = t.closest?.('.wn') as HTMLElement | null;
                if (n?.dataset.s != null) setSel(+n.dataset.s);
              }}
            >
              <rect x="0" y="0" width={W} height={HG} fill="#E9EDF2" />
              <g
                transform={`translate(${vt.tx.toFixed(1)},${vt.ty.toFixed(1)}) scale(${vt.k.toFixed(3)})`}
              >
                <g fill="#F7F6F2" stroke="#D6DBE1" strokeWidth={0.7}>
                  <path d={ZEMIN} />
                </g>

                {/* tamir akışı: yurt içi istasyonlar → IST, IST → dış hub'lar */}
                <g>
                  {kat.akis &&
                    HA.kod
                      .map((_, i) => i)
                      .filter((i) => i !== IST_I && !HA.yd[i] && HA.depo[i] !== 'yok')
                      .map((i) => (
                        <path
                          key={'a' + i}
                          className="wf"
                          d={yay(i, IST_I, 0.12)}
                          strokeWidth={(1 + (4 * HA.pay25[i]) / 0.3) / zk}
                        />
                      ))}
                  {kat.akis &&
                    HA.kod
                      .map((_, i) => i)
                      .filter((i) => HA.yd[i])
                      .map((i) => (
                        <path
                          key={'b' + i}
                          className="wf dis"
                          d={yay(IST_I, i, 0.1)}
                          strokeWidth={1.4}
                        />
                      ))}
                </g>

                {/* rota katmanı */}
                <g>
                  {rota && kanallar
                    ? [
                        ...kanallar.map((o, ki) => {
                          const d = yay(o.i, rota.hIdx, 0.1 + ki * 0.055);
                          const secili = rk === ki;
                          const soluk = rk != null && !secili;
                          const ipucu = `<b>${o.ad}</b><br>${o.kod} → ${rota.sc.hedef} · ${sureTxt(
                            o.saat,
                          )} · ${o.mal == null ? o.malTxt || '—' : mUsd(o.mal)}`;
                          return (
                            <g key={'k' + ki}>
                              <path
                                d={d}
                                fill="none"
                                stroke={KANAL_RENK[o.tip]}
                                strokeWidth={(secili ? 3.6 : ki === 0 && rk == null ? 3 : 1.8) / zk}
                                strokeDasharray={o.dash || undefined}
                                opacity={soluk ? 0.13 : secili ? 0.98 : ki === 0 ? 0.95 : 0.6}
                              />
                              <path
                                data-k={ki}
                                d={d}
                                fill="none"
                                stroke="rgba(0,0,0,0)"
                                strokeWidth={12 / zk}
                                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                                onMouseMove={(e) => ipucuGoster(e, ipucu)}
                              />
                            </g>
                          );
                        }),
                        ...kanallar.map((o, ki) => (
                          <circle
                            key={'kc' + ki}
                            cx={PXY[o.i][0]}
                            cy={PXY[o.i][1]}
                            r={3.6 / zk}
                            fill={KANAL_RENK[o.tip]}
                            opacity={0.92}
                          />
                        )),
                      ]
                    : rota
                      ? rota.parcalar.flatMap((p) => [
                          ...p.ops.map((o, oi) => {
                            const d = yay(o.i, rota.hIdx, 0.16 + p.n * 0.045);
                            const ipucu = `<b>PN-${p.pn}</b> · ${
                              o.tip === 'pool' ? 'pool' : 'depo'
                            }<br>${o.kod} → ${rota.sc.hedef} · ${vir(
                              o.saat,
                            )} saat · tıkla: tüm kanallar`;
                            return (
                              <g key={`p${p.n}o${oi}`}>
                                <path
                                  d={d}
                                  fill="none"
                                  stroke={p.renk}
                                  strokeWidth={(oi === 0 ? 2.8 : 1.5) / zk}
                                  strokeDasharray={
                                    oi === 0
                                      ? undefined
                                      : o.tip === 'pool'
                                        ? `${1.6 / zk},${4.6 / zk}`
                                        : `${5 / zk},${4 / zk}`
                                  }
                                  strokeLinecap={o.tip === 'pool' && oi > 0 ? 'round' : undefined}
                                  opacity={oi === 0 ? 0.92 : 0.42}
                                />
                                <path
                                  data-p={p.n}
                                  d={d}
                                  fill="none"
                                  stroke="rgba(0,0,0,0)"
                                  strokeWidth={11 / zk}
                                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                                  onMouseMove={(e) => ipucuGoster(e, ipucu)}
                                />
                              </g>
                            );
                          }),
                          ...p.ops.map((o, oi) =>
                            o.tip === 'pool' ? (
                              <rect
                                key={`p${p.n}m${oi}`}
                                x={PXY[o.i][0] - 2.7 / zk}
                                y={PXY[o.i][1] - 2.7 / zk}
                                width={5.4 / zk}
                                height={5.4 / zk}
                                fill={p.renk}
                                opacity={0.9}
                                transform={`rotate(45 ${PXY[o.i][0]} ${PXY[o.i][1]})`}
                              />
                            ) : (
                              <circle
                                key={`p${p.n}m${oi}`}
                                cx={PXY[o.i][0]}
                                cy={PXY[o.i][1]}
                                r={3.4 / zk}
                                fill={p.renk}
                                opacity={0.9}
                              />
                            ),
                          ),
                        ])
                      : null}

                  {/* hedef uçak işareti */}
                  {rota && (
                    <g transform={`translate(${PXY[rota.hIdx][0]},${PXY[rota.hIdx][1]})`}>
                      <circle
                        r={14 / zk}
                        fill="none"
                        stroke="#1A1D21"
                        strokeWidth={1.4 / zk}
                        strokeDasharray="3,3"
                      />
                      <text y={6 / zk} textAnchor="middle" style={{ fontSize: `${15 / zk}px` }}>
                        ✈
                      </text>
                      <text
                        className="wl"
                        y={26 / zk}
                        textAnchor="middle"
                        style={{
                          fontWeight: 700,
                          fontSize: `${9.5 / zk}px`,
                          strokeWidth: `${2.6 / zk}px`,
                        }}
                      >
                        {rota.sc.ucak} · {rota.sc.hedef}
                      </text>
                    </g>
                  )}
                </g>

                {/* istasyon düğümleri */}
                <g>
                  {sira.map((i) => {
                    const [x, y] = PXY[i];
                    const rr = (5 + 13 * Math.sqrt(ucak(i) / uMax)) / zk;
                    const etiket = HA.yd[i] || rr * zk >= 7.5 || zk >= 2.2;
                    return (
                      <g
                        key={i}
                        className={'wn' + (sel === i ? ' sel' : '')}
                        data-s={i}
                        transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
                        onMouseMove={(e) => ipucuGoster(e, istasyonIpucu(i))}
                      >
                        <circle r={rr + 6 / zk} fill="transparent" />
                        {kat.kriz && kf > 1 && (
                          <circle
                            r={rr + 4 / zk}
                            fill="none"
                            stroke={C.kritik}
                            strokeWidth={1.6 / zk}
                            strokeDasharray="4,3"
                            opacity={Math.min(0.9, 0.25 + HA.pay25[i] * 3)}
                          />
                        )}
                        <circle
                          className="wc"
                          r={rr}
                          fill={DEPO_RENK[HA.depo[i]]}
                          style={{ strokeWidth: 2 / zk }}
                        />
                        {etiket && (
                          <text
                            className="wl"
                            x={rr + 4 / zk}
                            y={3.5 / zk}
                            style={{ fontSize: `${9.5 / zk}px`, strokeWidth: `${2.6 / zk}px` }}
                          >
                            {HA.kod[i]}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              </g>
            </svg>

            <div className="tzoom">
              <button onClick={() => zoomAt(1.45)}>+</button>
              <button onClick={() => zoomAt(1 / 1.45)}>−</button>
              <button title="Türkiye" onClick={() => zoomBox(24.5, 34.8, 45.5, 43.5)}>
                TR
              </button>
              <button title="tümü" onClick={sifirla}>
                ⌂
              </button>
            </div>
            <div className="tbadge">TEMSİLİ DAĞITIM · 110m dünya konturu</div>
            <div className="tbadge tjest">sürükle · kıstırarak yakınlaş · çift tık</div>
            {tip && (
              <motion.div
                className="ttip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ left: tip.x, top: tip.y }}
                dangerouslySetInnerHTML={{ __html: tip.html }}
              />
            )}
          </div>
        </div>

        {/* ---------------------------------------------- detay + tablo */}
        <div className="grid g2" style={{ marginBottom: 10 }}>
          <div className="card flush" style={{ padding: '14px 16px' }}>
            <h3 style={{ fontSize: '.9rem' }}>
              <b className="mono" style={{ color: C.teal }}>
                {HA.kod[sel]}
              </b>{' '}
              · {HA.ad[sel]}
              <span
                style={{
                  float: 'right',
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: DEPO_RENK[HA.depo[sel]],
                  border: '1.5px solid #fff',
                  marginTop: 3,
                }}
              />
            </h3>
            <div className="hint" style={{ margin: '7px 0 0' }}>
              {DEPO_AD[HA.depo[sel]]} · uçak {HA.u25[sel]} → {HA.u33[sel]},{' '}
              <b style={{ color: HA.buyume[sel] >= 70 ? C.amber : C.teal }}>
                +{pct(HA.buyume[sel], 0)}
              </b>
              .<br />
              Stok {fmt(HA.kalem[sel])} kalem · {fmt(HA.adet[sel])} adet · IST transfer{' '}
              {HA.tsaat[sel] === 0 ? 'ana üs' : vir(HA.tsaat[sel]) + ' saat'} · AOG kapsam{' '}
              {pct(HA.kapsam[sel] * 100, 0)}
              {kat.kriz && kf > 1 && (
                <>
                  {' '}
                  · <span style={{ color: C.kritik }}>kriz ×{f1(kf)}</span>
                </>
              )}
              .<br />
              <i>
                Case tablosunda "{g.ad}" grubu {g.u25}→{g.u33} uçak. Bu nokta grubun{' '}
                {pct((100 * HA.u25[sel]) / g.u25, 0)} payıyla temsil edilir. Gerçek üründe istasyon
                etiketli kayıttan gelir.
              </i>
            </div>
          </div>

          <div className="tw" style={{ maxHeight: 250 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'default' }}>Havalimanı</th>
                  <th style={{ cursor: 'default' }}>Depo</th>
                  <th className="n" style={{ cursor: 'default' }}>
                    Uçak 25→33
                  </th>
                  <th className="n" style={{ cursor: 'default' }}>
                    Stok adet
                  </th>
                </tr>
              </thead>
              <tbody>
                {sira.map((i) => (
                  <tr key={i} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                    <td>
                      <b className="mono" style={{ color: C.teal }}>
                        {HA.kod[i]}
                      </b>{' '}
                      <span style={{ color: C.dim }}>{HA.ad[i]}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          background: DEPO_RENK[HA.depo[i]],
                          border: '1px solid #fff',
                          display: 'inline-block',
                          marginRight: 6,
                        }}
                      />
                      {DEPO_AD[HA.depo[i]]}
                    </td>
                    <td className="n">
                      {HA.u25[i]} → {HA.u33[i]}{' '}
                      <span style={{ color: HA.buyume[i] >= 70 ? C.amber : C.dim }}>
                        +{pct(HA.buyume[i], 0)}
                      </span>
                    </td>
                    <td className="n">{fmt(HA.adet[i])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------------------------------------------------- lejant */}
        <div
          className="note"
          style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}
        >
          {Object.keys(DEPO_RENK).map((t) => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: DEPO_RENK[t],
                  border: '1.5px solid #fff',
                  display: 'inline-block',
                }}
              />
              {DEPO_AD[t]}
            </span>
          ))}
          <span style={{ marginLeft: 'auto' }}>
            daire alanı {kat.yil33 ? 2033 : 2025} uçak sayısıyla orantılı · {HA.kod.length} istasyon
            · temsilî
          </span>
        </div>

        {/* ---------------------------------------------------- rota paneli */}
        {rota && (
          <div
            style={{
              borderTop: '1px solid var(--ln-soft)',
              marginTop: 12,
              paddingTop: 11,
            }}
          >
            <div className="ctl" style={{ marginBottom: 8 }}>
              {rota.wp ? (
                <>
                  <Cip acik>
                    PN-{rota.sc.parcalar[0].pn} → {rota.sc.hedef} · seçili parça
                  </Cip>
                  <Cip
                    onClick={() => {
                      setWp(null);
                      setRpn(null);
                      setRk(null);
                    }}
                  >
                    ✕ kapat
                  </Cip>
                </>
              ) : (
                <>
                  {HA.rota.map((s, n) => (
                    <Cip
                      key={n}
                      acik={n === rsen}
                      onClick={() => {
                        setRsen(n);
                        setRpn(null);
                        setRk(null);
                      }}
                    >
                      {s.ucak} · {s.hedef}
                    </Cip>
                  ))}
                  <Cip
                    acik={rpn == null}
                    onClick={() => {
                      setRpn(null);
                      setRk(null);
                    }}
                  >
                    Tüm parçalar
                  </Cip>
                  {rota.parcalar.map((p) => (
                    <Cip
                      key={p.n}
                      acik={rpn === p.n}
                      onClick={() => {
                        setRpn(p.n);
                        setRk(null);
                      }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          background: p.renk,
                          display: 'inline-block',
                          marginRight: 5,
                        }}
                      />
                      PN-{p.pn}
                    </Cip>
                  ))}
                </>
              )}
            </div>

            {kanallar && rpn != null ? (
              <>
                <div className="hint" style={{ margin: '0 0 7px' }}>
                  <b style={{ color: rota.parcalar[rpn].renk }}>PN-{rota.parcalar[rpn].pn}</b>{' '}
                  {rota.parcalar[rpn].sub} — {rota.sc.hedef} istasyonuna tüm geliş kanalları, süreye
                  göre:
                </div>
                <div className="tw" style={{ maxHeight: 225 }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ cursor: 'default' }}>Kanal</th>
                        <th style={{ cursor: 'default' }}>Kaynak</th>
                        <th className="n" style={{ cursor: 'default' }}>
                          Süre
                        </th>
                        <th className="n" style={{ cursor: 'default' }}>
                          Maliyet
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kanallar.map((o, oi) => (
                        <tr
                          key={oi}
                          className={rk === oi ? 'rkOn' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setRk((v) => (v === oi ? null : oi))}
                        >
                          <td>
                            <span className="sdot" style={{ background: KANAL_RENK[o.tip] }} />{' '}
                            {o.ad}
                            {oi === 0 && <span className="bg bg-teal"> önerilen</span>}
                          </td>
                          <td className="mono">{o.kod}</td>
                          <td className="n">{sureTxt(o.saat)}</td>
                          <td className="n">{o.mal == null ? o.malTxt || '—' : mUsd(o.mal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="hint" style={{ margin: '7px 0 0' }}>
                  Satıra ya da haritadaki çizgiye tıklayınca kanal vurgulanır, üzerine gelince özet
                  görünür. Tamir ve satın alma süreleri parçanın gerçek tedarik verisi. Temsilîdir.
                </div>
              </>
            ) : (
              <div className="hint" style={{ margin: 0 }}>
                {rota.parcalar.map((p) => {
                  const alt = p.ops
                    .slice(1)
                    .map((o) => `${o.kod} ${o.tip === 'pool' ? 'pool ' : ''}${vir(o.saat)}s`)
                    .join(' · ');
                  return (
                    <div key={p.n} style={{ marginBottom: 4 }}>
                      <b style={{ color: p.renk }}>PN-{p.pn}</b> {p.sub} → önerilen{' '}
                      <b>{p.ops[0].kod}</b> {p.ops[0].tip === 'pool' ? 'pool' : 'depo'}{' '}
                      <b className="mono">{vir(p.ops[0].saat)} saat</b>
                      {alt ? ' · alternatif: ' + alt : ''} · satın alma{' '}
                      <b className="mono">{fmt(p.alim)} gün</b>
                    </div>
                  );
                })}
                <b style={{ color: C.text }}>Kritik yol: {vir(rota.kritik)} saat.</b> Uçak, en geç
                parça ulaşınca toparlanır. Bir parçaya tıklayınca o parçanın BÜTÜN geliş kanalları
                haritada açılır: depo, pool, donörden söküm, iç ve dış tamir, hızlandırılmış tamir,
                satın alma. Temsilîdir.
              </div>
            )}
          </div>
        )}
      </Kart>

      <div className="hint">
        İstasyon başına stok verisi resmi veri setlerinde yoktur; dağıtım kurala bağlı temsildir
        (grup toplamları case tablosuyla birebir tutar). Transfer süreleri büyük çember mesafesi +
        elleçleme varsayımıyla hesaplanır: {sureTxt(eta(HA.kod.indexOf('ESB'), IST_I))} ESB→IST
        örneğinde olduğu gibi.
      </div>
    </>
  );
}
