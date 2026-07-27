#!/usr/bin/env node
/**
 * catalyst.html içine gömülü DATA paketini web uygulaması için ayıklar.
 *
 *   node scripts/veri-cikar.mjs
 *   → src/data/payload.json
 *
 * Neden var: payload'ın tek üreticisi core.py + build_dashboard.py'dir. Python
 * ortamı kurulu olmayan bir makinede (ya da CI'da) web uygulamasını çalıştırmak
 * için ayrıca Python kurmak gerekmesin diye, halihazırda üretilmiş
 * catalyst.html'den birebir aynı JSON çıkarılır.
 *
 * Python ortamı varsa kanonik yol şudur — aynı dosyayı doğrudan yazar:
 *   uv run build_dashboard.py            (catalyst.html + web/src/data/payload.json)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const KOK = join(HERE, '..', '..');
const KAYNAK = join(KOK, 'catalyst.html');
const HEDEF = join(HERE, '..', 'src', 'data', 'payload.json');

const html = readFileSync(KAYNAK, 'utf8');
const m = html.match(/<script>const DATA=([\s\S]*?);<\/script>/);
if (!m) {
  console.error('✗ catalyst.html içinde DATA bloğu bulunamadı');
  process.exit(1);
}

const payload = JSON.parse(m[1]);
mkdirSync(dirname(HEDEF), { recursive: true });
writeFileSync(HEDEF, JSON.stringify(payload), 'utf8');

const kb = Math.round(JSON.stringify(payload).length / 1024);
console.log(`✓ src/data/payload.json yazıldı — ${kb.toLocaleString('tr-TR')} KB`);
console.log(
  `  PN ${payload.kpi.pn.toLocaleString('tr-TR')} · kırmızı ${payload.kpi.kirmizi} ` +
    `(siparişsiz ${payload.kpi.siparissiz}) · envanter $${payload.kpi.fmv}M`,
);
