import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { ensureUser, getDailyState, claimDaily, getCoins } from '../../db/users.js';
import { formatDuration } from '../cooldowns.js';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Claim your daily coin reward (once every 24h). Build a streak for bonuses!');

export async function execute(interaction) {
  const userId = interaction.user.id;
  ensureUser(userId, interaction.user.username);

  const now = Date.now();
  const { lastDailyAt, streak } = getDailyState(userId);

  // Still on cooldown?
  if (lastDailyAt) {
    const elapsed = now - lastDailyAt;
    if (elapsed < config.dailyCooldownMs) {
      const remaining = config.dailyCooldownMs - elapsed;
      return interaction.reply({
        content: `⏳ You've already claimed today. Come back in **${formatDuration(remaining)}**.`,
        ephemeral: true,
      });
    }
  }

  // Determine new streak: continue if claimed within 48h of last claim, else reset.
  let newStreak;
  if (lastDailyAt && now - lastDailyAt < 2 * config.dailyCooldownMs) {
    newStreak = streak + 1;
  } else {
    newStreak = 1;
  }

  // Reward = base + capped streak bonus. Streak bonus applies from day 2 onward.
  const bonus = Math.min(
    (newStreak - 1) * config.dailyStreakBonus,
    config.dailyStreakMaxBonus
  );
  const reward = config.dailyBaseReward + bonus;

  claimDaily(userId, reward, newStreak, now);
  const balance = getCoins(userId);

  const embed = new EmbedBuilder()
    .setTitle('🪙 Daily Reward Claimed!')
    .setColor(0xf1c40f)
    .setDescription(
      `You received **${reward}** coins${bonus > 0 ? ` (base ${config.dailyBaseReward} + ${bonus} streak bonus)` : ''}!`
    )
    .addFields(
      { name: '🔥 Streak', value: `${newStreak} day${newStreak === 1 ? '' : 's'}`, inline: true },
      { name: '💰 Balance', value: `${balance} coins`, inline: true }
    )
    .setFooter({ text: 'Come back within 48h to keep your streak alive!' });

  return interaction.reply({ embeds: [embed] });
}
