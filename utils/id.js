import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a random 6-character uppercase alphanumeric ID (e.g. "K7Q2ZP").
 * @param {number} len length of the code (default 6)
 */
export function generateId(len = 6) {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/**
 * Generate a unique ID not present in the provided Set of existing IDs.
 * Mutates the set by adding the new ID.
 */
export function generateUniqueId(existing, len = 6) {
  let id;
  do {
    id = generateId(len);
  } while (existing.has(id));
  existing.add(id);
  return id;
}
