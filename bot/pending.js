import { randomUUID } from 'node:crypto';

/**
 * Generic in-memory registry for pending confirmations (trades, burns).
 * Each entry auto-expires after a timeout. Keyed by a short random token that
 * is embedded in the button custom IDs.
 */
const pending = new Map();

/**
 * Register a pending action.
 * @param {object} payload arbitrary data describing the action
 * @param {number} ttlMs time-to-live in ms
 * @param {(payload:object)=>void} [onExpire] callback fired if it times out
 * @returns {string} token
 */
export function createPending(payload, ttlMs, onExpire) {
  const token = randomUUID().slice(0, 8);
  const entry = { token, payload, timeout: null };
  entry.timeout = setTimeout(() => {
    if (pending.has(token)) {
      pending.delete(token);
      onExpire?.(payload);
    }
  }, ttlMs);
  pending.set(token, entry);
  return token;
}

export function getPending(token) {
  return pending.get(token)?.payload ?? null;
}

/** Remove and return a pending action (consuming it), cancelling its timer. */
export function consumePending(token) {
  const entry = pending.get(token);
  if (!entry) return null;
  clearTimeout(entry.timeout);
  pending.delete(token);
  return entry.payload;
}
