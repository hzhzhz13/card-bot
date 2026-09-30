import { config } from './config.js';

/**
 * In-memory registry of active drops, keyed by the drop message ID.
 * Drops are ephemeral game state; they intentionally do NOT persist across
 * restarts (a dropped-but-unclaimed card is simply lost on restart).
 *
 * Drop shape:
 * {
 *   messageId, channelId, dropperId,
 *   cards:     [card, card, card],
 *   claimedBy: [userId|null, ...],   // per-card claimer
 *   droppedAt, priorityUntil, expiresAt,
 *   timeout                          // NodeJS timer handle for auto-expiry
 * }
 */
const activeDrops = new Map();

export function createDrop({ messageId, channelId, dropperId, cards }, onExpire) {
  const now = Date.now();
  const drop = {
    messageId,
    channelId,
    dropperId,
    cards,
    claimedBy: cards.map(() => null),
    droppedAt: now,
    priorityUntil: now + config.dropPriorityMs,
    expiresAt: now + config.dropExpiryMs,
    timeout: null,
  };
  drop.timeout = setTimeout(() => {
    if (activeDrops.has(messageId)) {
      activeDrops.delete(messageId);
      onExpire?.(drop);
    }
  }, config.dropExpiryMs);
  activeDrops.set(messageId, drop);
  return drop;
}

export function getDrop(messageId) {
  return activeDrops.get(messageId) ?? null;
}

export function isExpired(drop) {
  return Date.now() >= drop.expiresAt;
}

export function inPriorityWindow(drop) {
  return Date.now() < drop.priorityUntil;
}

/** Are all cards in this drop claimed? */
export function isFullyClaimed(drop) {
  return drop.claimedBy.every((c) => c !== null);
}

/**
 * Attempt to reserve a card index for a claimer.
 * Returns { ok, reason } — reason ∈ 'expired' | 'priority' | 'taken' | 'bad_index'.
 * On success, marks the card as claimed by claimerId (caller persists to DB).
 */
export function reserveCard(drop, index, claimerId) {
  if (isExpired(drop)) return { ok: false, reason: 'expired' };
  if (index < 0 || index >= drop.cards.length) {
    return { ok: false, reason: 'bad_index' };
  }
  if (drop.claimedBy[index] !== null) return { ok: false, reason: 'taken' };
  if (inPriorityWindow(drop) && claimerId !== drop.dropperId) {
    return { ok: false, reason: 'priority' };
  }
  drop.claimedBy[index] = claimerId;

  // If everything is now claimed, close the drop early.
  if (isFullyClaimed(drop)) {
    clearTimeout(drop.timeout);
    activeDrops.delete(drop.messageId);
  }
  return { ok: true };
}

/** Remove a drop and cancel its expiry timer. */
export function removeDrop(messageId) {
  const drop = activeDrops.get(messageId);
  if (drop) {
    clearTimeout(drop.timeout);
    activeDrops.delete(messageId);
  }
}

export function activeDropCount() {
  return activeDrops.size;
}
