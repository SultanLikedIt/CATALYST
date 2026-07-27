/**
 * Harita görünüm dönüşümü (kaydırma / yakınlaştırma) ve işaretçi jestleri.
 *
 * Tek parmak veya sol tuş: sürükleyerek kaydırma.
 * İki parmak: kıstırarak yakınlaştırma + orta noktayla kaydırma.
 * Touchpad iki parmak kaydırma: haritayı kaydırır; harita tam uzaktayken sayfa
 *   kaymaya devam eder (kullanıcı haritada kilitlenmez).
 * Touchpad kıstırma ve fare tekerleği: imlecin altındaki nokta sabit kalarak zum.
 * Çift tık / çift dokunuş: yakınlaş (Shift ile uzaklaş).
 *
 * 3D küreye geçildiğinde bu dosya yerini OrbitControls'a bırakır; harita verisi
 * (haritaVeri.ts) ve panel bileşenleri aynen kalır.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { W, HG, prj } from './haritaVeri';

export interface VT {
  k: number;
  tx: number;
  ty: number;
}

export function useGorunum(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [vt, setVt] = useState<VT>({ k: 1, tx: 0, ty: 0 });
  const vtRef = useRef(vt);
  vtRef.current = vt;
  /** kaydırma/kıstırma sonrası gelen 'click' seçim yapmasın */
  const kaydiRef = useRef(false);

  const sinirla = (v: VT): VT => {
    const tasX = W * (v.k - 1);
    const tasY = HG * (v.k - 1);
    return {
      k: v.k,
      tx: Math.min(0, Math.max(-tasX, v.tx)),
      ty: Math.min(0, Math.max(-tasY, v.ty)),
    };
  };

  /** ekran → SVG kullanıcı birimi; preserveAspectRatio kenar boşluğunu hesaba katar */
  const olcek = useCallback(() => {
    const el = svgRef.current;
    if (!el) return { s: 1, ox: 0, oy: 0 };
    const r = el.getBoundingClientRect();
    const s = Math.min(r.width / W, r.height / HG);
    return { s, ox: r.left + (r.width - W * s) / 2, oy: r.top + (r.height - HG * s) / 2 };
  }, [svgRef]);

  const svgNokta = useCallback(
    (cx: number, cy: number): [number, number] => {
      const m = olcek();
      return [(cx - m.ox) / m.s, (cy - m.oy) / m.s];
    },
    [olcek],
  );

  const zoomAt = useCallback((f: number, cxp = W / 2, cyp = HG / 2) => {
    const v = vtRef.current;
    const nk = Math.max(1, Math.min(8, v.k * f));
    if (nk === v.k) return false;
    const y = sinirla({
      k: nk,
      tx: cxp - (cxp - v.tx) * (nk / v.k),
      ty: cyp - (cyp - v.ty) * (nk / v.k),
    });
    vtRef.current = y;
    setVt(y);
    return true;
  }, []);

  /** coğrafi kutuya yakınlaş — Karar Merkezi'nden gelen rota isteği bunu kullanır */
  const zoomBox = useCallback((lo1: number, la1: number, lo2: number, la2: number) => {
    const [x1, y1] = prj(lo1, la2);
    const [x2, y2] = prj(lo2, la1);
    const k = Math.min(8, Math.min(W / (x2 - x1), HG / (y2 - y1)) * 0.92);
    const y = sinirla({ k, tx: W / 2 - (k * (x1 + x2)) / 2, ty: HG / 2 - (k * (y1 + y2)) / 2 });
    vtRef.current = y;
    setVt(y);
  }, []);

  const sifirla = useCallback(() => {
    const y = { k: 1, tx: 0, ty: 0 };
    vtRef.current = y;
    setVt(y);
  }, []);

  /* ------------------------------------------------------------ jestler */
  const aktRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinchRef = useRef<{
    d: number;
    k: number;
    cx: number;
    cy: number;
    tx: number;
    ty: number;
    mx: number;
    my: number;
  } | null>(null);
  const sonBasma = useRef(0);
  const sonNokta = useRef<[number, number]>([0, 0]);

  const ikiNokta = () => {
    const [a, b] = [...aktRef.current.values()];
    return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
  };

  /* Yakalama yalnız GERÇEK sürükleme başlayınca: basma anında yakalanırsa sonraki
     'click' de SVG'ye yönlendirilir ve istasyon seçimi çalışmaz. */
  const yakala = (id: number) => {
    const el = svgRef.current;
    if (el?.setPointerCapture && !el.hasPointerCapture?.(id)) {
      try {
        el.setPointerCapture(id);
      } catch {
        /* yakalama desteklenmiyorsa sürükleme yine çalışır */
      }
    }
  };

  const ciftKontrol = (e: React.PointerEvent) => {
    const t = performance.now();
    const yakin = Math.hypot(e.clientX - sonNokta.current[0], e.clientY - sonNokta.current[1]) < 24;
    if (t - sonBasma.current < 320 && yakin) {
      sonBasma.current = 0;
      const [cx, cy] = svgNokta(e.clientX, e.clientY);
      if (zoomAt(e.shiftKey ? 1 / 1.8 : 1.8, cx, cy)) kaydiRef.current = true;
      return true;
    }
    sonBasma.current = t;
    sonNokta.current = [e.clientX, e.clientY];
    return false;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return; // yalnız sol tuş kaydırır
    aktRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (aktRef.current.size === 2) {
      const p = ikiNokta();
      const [cx, cy] = svgNokta(p.mx, p.my);
      const v = vtRef.current;
      pinchRef.current = { d: p.d, k: v.k, cx, cy, tx: v.tx, ty: v.ty, mx: p.mx, my: p.my };
      dragRef.current = null;
      yakala(e.pointerId);
    } else if (aktRef.current.size === 1) {
      const v = vtRef.current;
      dragRef.current = { x: e.clientX, y: e.clientY, tx: v.tx, ty: v.ty };
      kaydiRef.current = false;
      if (ciftKontrol(e)) dragRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (aktRef.current.has(e.pointerId))
      aktRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pinch = pinchRef.current;
    if (pinch && aktRef.current.size >= 2) {
      const p = ikiNokta();
      if (pinch.d > 8) {
        const nk = Math.max(1, Math.min(8, pinch.k * (p.d / pinch.d)));
        const o = 1 / olcek().s;
        const y = sinirla({
          k: nk,
          tx: pinch.cx - (pinch.cx - pinch.tx) * (nk / pinch.k) + (p.mx - pinch.mx) * o,
          ty: pinch.cy - (pinch.cy - pinch.ty) * (nk / pinch.k) + (p.my - pinch.my) * o,
        });
        vtRef.current = y;
        setVt(y);
        kaydiRef.current = true;
      }
      e.preventDefault();
      return true;
    }
    const drag = dragRef.current;
    if (drag) {
      const o = 1 / olcek().s;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!kaydiRef.current && Math.abs(dx) + Math.abs(dy) > 3) {
        kaydiRef.current = true;
        yakala(e.pointerId);
      }
      const y = sinirla({ k: vtRef.current.k, tx: drag.tx + dx * o, ty: drag.ty + dy * o });
      vtRef.current = y;
      setVt(y);
      return true;
    }
    return false;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    aktRef.current.delete(e.pointerId);
    if (aktRef.current.size < 2) pinchRef.current = null;
    if (aktRef.current.size === 0) dragRef.current = null;
    else if (aktRef.current.size === 1 && !pinchRef.current) {
      const [a] = [...aktRef.current.values()];
      const v = vtRef.current;
      dragRef.current = { x: a.x, y: a.y, tx: v.tx, ty: v.ty };
    }
  };

  /* Tekerlek: React'in passive listener'ı preventDefault'a izin vermiyor,
     bu yüzden doğrudan DOM'a bağlanır. */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const f = (e: WheelEvent) => {
      const [cx, cy] = svgNokta(e.clientX, e.clientY);
      const kistirma = e.ctrlKey || e.metaKey;
      const fare =
        !kistirma &&
        (e.deltaMode !== 0 ||
          (e.deltaX === 0 && Math.abs(e.deltaY) >= 100 && Number.isInteger(e.deltaY)));
      if (kistirma || fare) {
        zoomAt(Math.exp(-e.deltaY * (kistirma ? 0.012 : 0.0022)), cx, cy);
        e.preventDefault();
        return;
      }
      // düz iki parmak kaydırma → haritayı kaydır; kaydıracak yer yoksa sayfaya bırak
      const v = vtRef.current;
      if (v.k <= 1) return;
      const o = 1 / olcek().s;
      const y = sinirla({ k: v.k, tx: v.tx - e.deltaX * o, ty: v.ty - e.deltaY * o });
      if (y.tx !== v.tx || y.ty !== v.ty) {
        vtRef.current = y;
        setVt(y);
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', f, { passive: false });
    return () => el.removeEventListener('wheel', f);
  }, [svgRef, svgNokta, olcek, zoomAt]);

  return {
    vt,
    zoomAt,
    zoomBox,
    sifirla,
    kaydiRef,
    jestler: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
