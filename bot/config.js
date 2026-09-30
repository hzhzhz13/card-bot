import 'dotenv/config';

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  adminIds: (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),

  // Gameplay tuning
  dropCooldownMs: num(process.env.DROP_COOLDOWN_MS, 5 * 60 * 1000),
  claimCooldownMs: num(process.env.CLAIM_COOLDOWN_MS, 2 * 60 * 1000),
  dropPriorityMs: num(process.env.DROP_PRIORITY_MS, 10 * 1000),
  dropExpiryMs: num(process.env.DROP_EXPIRY_MS, 30 * 1000),

  cardsPerDrop: 3,

  // Economy
  dailyBaseReward: num(process.env.DAILY_BASE_REWARD, 100),
  dailyStreakBonus: num(process.env.DAILY_STREAK_BONUS, 10), // per consecutive day
  dailyStreakMaxBonus: num(process.env.DAILY_STREAK_MAX_BONUS, 100), // cap
  dailyCooldownMs: num(process.env.DAILY_COOLDOWN_MS, 24 * 60 * 60 * 1000),

  // How long a trade/burn confirmation stays valid.
  confirmTimeoutMs: num(process.env.CONFIRM_TIMEOUT_MS, 60 * 1000),
};

export function isAdmin(userId) {
  return config.adminIds.includes(userId);
}
