import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ensureUser } from '../../db/users.js';
import {
  dropCooldownRemaining,
  claimCooldownRemaining,
  formatDuration,
} from '../cooldowns.js';

export const data = new SlashCommandBuilder()
  .setName('cooldowns')
  .setDescription('Check your remaining drop and claim cooldowns.');

export async function execute(interaction) {
  const userId = interaction.user.id;
  ensureUser(userId, interaction.user.username);

  const drop = dropCooldownRemaining(userId);
  const claim = claimCooldownRemaining(userId);

  const embed = new EmbedBuilder()
    .setTitle('⏳ Your Cooldowns')
    .setColor(0x5865f2)
    .addFields(
      {
        name: '🎴 Drop',
        value: drop > 0 ? `Ready in **${formatDuration(drop)}**` : '✅ Ready now',
        inline: true,
      },
      {
        name: '✋ Claim',
        value: claim > 0 ? `Ready in **${formatDuration(claim)}**` : '✅ Ready now',
        inline: true,
      }
    );

  return interaction.reply({ embeds: [embed], ephemeral: true });
}
