import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getRarity, rollRarity } from '../utils/rarity.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogPath = join(__dirname, '..', 'data', 'cards.json');
export const imagesDir = join(__dirname, '..', 'data', 'images');

/** @type {Array<{id,name,series,rarity,image}>} */
let CARDS = [];
/** @type {Map<string, object>} */
let byId = new Map();
/** @type {Map<string, object[]>} rarity key -> cards */
let byRarity = new Map();

export function loadCards() {
  const raw = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const seen = new Set();

  CARDS = raw.map((c, i) => {
    if (!c.id) throw new Error(`Card at index ${i} is missing an "id"`);
    if (seen.has(c.id)) throw new Error(`Duplicate card id: ${c.id}`);
    seen.add(c.id);
    if (!getRarity(c.rarity)) {
      throw new Error(`Card ${c.id} has invalid rarity "${c.rarity}"`);
    }
    return {
      id: c.id,
      name: c.name,
      series: c.series,
      rarity: c.rarity.toUpperCase(),
      image: c.image,
    };
  });

  byId = new Map(CARDS.map((c) => [c.id, c]));
  byRarity = new Map();
  for (const card of CARDS) {
    if (!byRarity.has(card.rarity)) byRarity.set(card.rarity, []);
    byRarity.get(card.rarity).push(card);
  }

  return CARDS;
}

export function allCards() {
  return CARDS;
}

export function getCard(id) {
  return byId.get(id) ?? null;
}

export function imagePath(card) {
  return join(imagesDir, card.image);
}

export function imageExists(card) {
  return existsSync(imagePath(card));
}

/**
 * Roll a single random card: first pick a rarity by weight, then a uniform-random
 * card within that rarity. If a rarity has no cards defined, re-roll rarity.
 */
export function rollCard() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const rarity = rollRarity();
    const pool = byRarity.get(rarity);
    if (pool && pool.length) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  // Fallback: uniform across all cards
  return CARDS[Math.floor(Math.random() * CARDS.length)];
}

/** Roll N cards for a drop. Cards may repeat across the N (independent rolls). */
export function rollDrop(n) {
  return Array.from({ length: n }, () => rollCard());
}
