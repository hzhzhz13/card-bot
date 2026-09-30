/**
 * One-off / re-runnable script to (re)build data/cards.json from the source
 * card definitions below, assigning each card a random 6-char alphanumeric ID.
 *
 * Re-running regenerates IDs. If cards.json already exists, existing IDs are
 * preserved per (series+name) so collections don't break — new cards get new IDs.
 *
 * Usage: node scripts/build-catalog.js
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateUniqueId } from '../utils/id.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogPath = join(__dirname, '..', 'data', 'cards.json');

// Source definitions: name, series, rarity, image filename (must exist in data/images/)
const SOURCE = [
  { name: 'KARINA',   series: 'BLACK MAMBA',   rarity: 'COMMON',    image: '02C K.png' },
  { name: 'GISELLE',  series: 'BLACK MAMBA',   rarity: 'COMMON',    image: '02C G.png' },
  { name: 'WINTER',   series: 'BLACK MAMBA',   rarity: 'COMMON',    image: '02C W.png' },
  { name: 'NINGNING', series: 'BLACK MAMBA',   rarity: 'COMMON',    image: '02C N.png' },

  { name: 'KARINA',   series: 'SPICY',         rarity: 'UNCOMMON',  image: '07C K.png' },
  { name: 'GISELLE',  series: 'SPICY',         rarity: 'UNCOMMON',  image: '07C G.png' },
  { name: 'WINTER',   series: 'SPICY',         rarity: 'UNCOMMON',  image: '07C W.png' },
  { name: 'NINGNING', series: 'SPICY',         rarity: 'UNCOMMON',  image: '07C N.png' },

  { name: 'KARINA',   series: 'BETTER THINGS', rarity: 'RARE',      image: '08C K.png' },
  { name: 'GISELLE',  series: 'BETTER THINGS', rarity: 'RARE',      image: '08C G.png' },
  { name: 'WINTER',   series: 'BETTER THINGS', rarity: 'RARE',      image: '08C W.png' },
  { name: 'NINGNING', series: 'BETTER THINGS', rarity: 'RARE',      image: '08C N.png' },

  { name: 'KARINA',   series: 'DIRTY WORK',    rarity: 'EPIC',      image: '013C K.png' },
  { name: 'GISELLE',  series: 'DIRTY WORK',    rarity: 'EPIC',      image: '013C G.png' },
  { name: 'WINTER',   series: 'DIRTY WORK',    rarity: 'EPIC',      image: '013C W.png' },
  { name: 'NINGNING', series: 'DIRTY WORK',    rarity: 'EPIC',      image: '013C N.png' },

  { name: 'KARINA',   series: 'RICH MAN',      rarity: 'LEGENDARY', image: '014C K.png' },
  { name: 'GISELLE',  series: 'RICH MAN',      rarity: 'LEGENDARY', image: '014C G.png' },
  { name: 'WINTER',   series: 'RICH MAN',      rarity: 'LEGENDARY', image: '014C W.png' },
  { name: 'NINGNING', series: 'RICH MAN',      rarity: 'LEGENDARY', image: '014C N.png' },
];

// Preserve existing IDs keyed by "series|name" so re-runs don't orphan collections.
const existingIds = new Set();
const keyToId = new Map();
if (existsSync(catalogPath)) {
  try {
    const prev = JSON.parse(readFileSync(catalogPath, 'utf8'));
    for (const c of prev) {
      if (c.id) {
        existingIds.add(c.id);
        keyToId.set(`${c.series}|${c.name}`, c.id);
      }
    }
  } catch {
    // ignore malformed previous catalog
  }
}

const catalog = SOURCE.map((c) => {
  const key = `${c.series}|${c.name}`;
  const id = keyToId.get(key) ?? generateUniqueId(existingIds);
  return { id, name: c.name, series: c.series, rarity: c.rarity, image: c.image };
});

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Wrote ${catalog.length} cards to ${catalogPath}`);
for (const c of catalog) {
  console.log(`  ${c.id}  ${c.name.padEnd(9)} ${c.series.padEnd(14)} ${c.rarity}`);
}
