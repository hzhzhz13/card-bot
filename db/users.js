import { db } from './database.js';

/**
 * Prepared statements are created lazily and cached, so this module can be
 * imported before migrate() has created the tables (ESM import hoisting means
 * top-level db.prepare() calls would otherwise run against a schema-less DB).
 */
const cache = new Map();
function stmt(sql) {
  let s = cache.get(sql);
  if (!s) {
    s = db.prepare(sql);
    cache.set(sql, s);
  }
  return s;
}

/** Ensure a user row exists (and refresh their username). */
export function ensureUser(id, username) {
  stmt(`
    INSERT INTO users (id, username)
    VALUES (@id, @username)
    ON CONFLICT(id) DO UPDATE SET username = excluded.username
  `).run({ id, username });
}

export function getUser(id) {
  return stmt('SELECT * FROM users WHERE id = ?').get(id);
}

export function setLastDrop(id, epochMs) {
  stmt('UPDATE users SET last_drop_at = ? WHERE id = ?').run(epochMs, id);
}

export function setLastClaim(id, epochMs) {
  stmt('UPDATE users SET last_claim_at = ? WHERE id = ?').run(epochMs, id);
}

/** Grant a card to a user, incrementing quantity if already owned. */
export function grantCard(userId, cardId) {
  stmt(`
    INSERT INTO user_cards (user_id, card_id, quantity)
    VALUES (@userId, @cardId, 1)
    ON CONFLICT(user_id, card_id) DO UPDATE SET quantity = quantity + 1
  `).run({ userId, cardId });
}

export function getCollection(userId) {
  return stmt(`
    SELECT card_id, quantity, obtained_at
    FROM user_cards
    WHERE user_id = ?
    ORDER BY obtained_at DESC
  `).all(userId);
}

export function countCards(userId) {
  return stmt(
    'SELECT COALESCE(SUM(quantity), 0) AS total FROM user_cards WHERE user_id = ?'
  ).get(userId).total;
}

// ── Server-wide stats ────────────────────────────────────────────────────

/** Total number of users who have interacted with the bot. */
export function countUsers() {
  return stmt('SELECT COUNT(*) AS n FROM users').get().n;
}

/** Total cards owned across everyone (sum of quantities). */
export function countAllCards() {
  return stmt('SELECT COALESCE(SUM(quantity), 0) AS n FROM user_cards').get().n;
}

/** Total distinct (user, card) rows — i.e. unique ownerships. */
export function countUniqueOwnerships() {
  return stmt('SELECT COUNT(*) AS n FROM user_cards').get().n;
}

/** Top collectors by total cards owned. */
export function topCollectors(limit = 5) {
  return stmt(`
    SELECT u.id, u.username, COALESCE(SUM(uc.quantity), 0) AS total
    FROM users u
    LEFT JOIN user_cards uc ON uc.user_id = u.id
    GROUP BY u.id
    HAVING total > 0
    ORDER BY total DESC
    LIMIT ?
  `).all(limit);
}

/** How many distinct users own each card_id (for rarity/popularity stats). */
export function ownershipByCard() {
  return stmt(`
    SELECT card_id, COUNT(DISTINCT user_id) AS owners, SUM(quantity) AS copies
    FROM user_cards
    GROUP BY card_id
  `).all();
}

// ── Coins / economy ──────────────────────────────────────────────────────

export function getCoins(userId) {
  const row = stmt('SELECT coins FROM users WHERE id = ?').get(userId);
  return row?.coins ?? 0;
}

export function addCoins(userId, amount) {
  stmt('UPDATE users SET coins = coins + ? WHERE id = ?').run(amount, userId);
}

// ── Daily reward ─────────────────────────────────────────────────────────

/** Read daily-related state for a user. */
export function getDailyState(userId) {
  const row = stmt(
    'SELECT last_daily_at, daily_streak FROM users WHERE id = ?'
  ).get(userId);
  return {
    lastDailyAt: row?.last_daily_at ?? null,
    streak: row?.daily_streak ?? 0,
  };
}

/** Persist a claimed daily: award coins, set streak and timestamp atomically. */
export const claimDaily = db.transaction((userId, coins, streak, nowMs) => {
  stmt(
    'UPDATE users SET coins = coins + ?, daily_streak = ?, last_daily_at = ? WHERE id = ?'
  ).run(coins, streak, nowMs, userId);
});

// ── Card ownership helpers (for trade / burn) ──────────────────────────────

/** Quantity of a specific card a user owns (0 if none). */
export function getCardQuantity(userId, cardId) {
  const row = stmt(
    'SELECT quantity FROM user_cards WHERE user_id = ? AND card_id = ?'
  ).get(userId, cardId);
  return row?.quantity ?? 0;
}

/**
 * Remove one copy of a card from a user. Decrements quantity, deleting the row
 * when it hits zero. Returns true if a copy was removed.
 */
function removeOneCardInternal(userId, cardId) {
  const qty = getCardQuantity(userId, cardId);
  if (qty <= 0) return false;
  if (qty === 1) {
    stmt('DELETE FROM user_cards WHERE user_id = ? AND card_id = ?').run(userId, cardId);
  } else {
    stmt(
      'UPDATE user_cards SET quantity = quantity - 1 WHERE user_id = ? AND card_id = ?'
    ).run(userId, cardId);
  }
  return true;
}

export function removeOneCard(userId, cardId) {
  return removeOneCardInternal(userId, cardId);
}

/** Burn a card for coins, atomically. Returns true on success. */
export const burnCard = db.transaction((userId, cardId, coinValue) => {
  const removed = removeOneCardInternal(userId, cardId);
  if (!removed) return false;
  stmt('UPDATE users SET coins = coins + ? WHERE id = ?').run(coinValue, userId);
  return true;
});

/**
 * Atomically swap one card between two users:
 * userA gives cardA (and receives cardB), userB gives cardB (receives cardA).
 * Returns true on success, false if either party no longer owns their card.
 */
export const swapCards = db.transaction((userA, cardA, userB, cardB) => {
  if (getCardQuantity(userA, cardA) <= 0) return false;
  if (getCardQuantity(userB, cardB) <= 0) return false;
  removeOneCardInternal(userA, cardA);
  removeOneCardInternal(userB, cardB);
  // grantCard is defined earlier in this module
  grantCard(userA, cardB);
  grantCard(userB, cardA);
  return true;
});
