import { config } from './config.js';
import { getUser, setLastDrop, setLastClaim } from '../db/users.js';

/**
 * Returns the remaining cooldown in ms (0 if ready).
 * @param {number|null} lastAt epoch ms of the last action
 * @param {number} windowMs cooldown window length
 */
function remaining(lastAt, windowMs) {
  if (!lastAt) return 0;
  const elapsed = Date.now() - lastAt;
  return Math.max(0, windowMs - elapsed);
}

export function dropCooldownRemaining(userId) {
  const user = getUser(userId);
  return remaining(user?.last_drop_at, config.dropCooldownMs);
}

export function claimCooldownRemaining(userId) {
  const user = getUser(userId);
  return remaining(user?.last_claim_at, config.claimCooldownMs);
}

export function startDropCooldown(userId) {
  setLastDrop(userId, Date.now());
}

export function startClaimCooldown(userId) {
  setLastClaim(userId, Date.now());
}

/** Format a ms duration as a friendly "1m 5s" / "42s" string. */
export function formatDuration(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}
