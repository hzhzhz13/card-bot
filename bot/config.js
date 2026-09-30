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
};

export function isAdmin(userId) {
  return config.adminIds.includes(userId);
}
