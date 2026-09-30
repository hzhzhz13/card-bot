/**
 * Rarity definitions: display order, drop weight, embed color, and emoji.
 * Weights are relative; they don't need to sum to 100 but here they do for clarity.
 */
export const RARITIES = {
  COMMON: { label: 'Common', weight: 40, color: 0x95a5a6, emoji: '⚪', burnValue: 10 },
  UNCOMMON: { label: 'Uncommon', weight: 27, color: 0x2ecc71, emoji: '🟢', burnValue: 25 },
  RARE: { label: 'Rare', weight: 18, color: 0x3498db, emoji: '🔵', burnValue: 60 },
  EPIC: { label: 'Epic', weight: 10, color: 0x9b59b6, emoji: '🟣', burnValue: 150 },
  LEGENDARY: { label: 'Legendary', weight: 5, color: 0xf1c40f, emoji: '🟡', burnValue: 400 },
};

export const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'];

export function getRarity(key) {
  return RARITIES[key?.toUpperCase()] ?? null;
}

/**
 * Pick a rarity key using weighted random selection.
 * @returns {string} rarity key, e.g. "RARE"
 */
export function rollRarity() {
  const entries = Object.entries(RARITIES);
  const total = entries.reduce((sum, [, r]) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const [key, r] of entries) {
    roll -= r.weight;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0]; // fallback (floating point edge)
}
