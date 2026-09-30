import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ensureUser, getCoins, getDailyState } from '../../db/users.js';

export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('Check your coin balance and daily streak.')
  .addUserOption((opt) =>
    opt.setName('user').setDescription('Whose balance to view').setRequired(false)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser('user') ?? interaction.user;
  ensureUser(target.id, target.username);

  const coins = getCoins(target.id);
  const { streak } = getDailyState(target.id);

  const embed = new EmbedBuilder()
    .setTitle(`💰 ${target.username}'s Wallet`)
    .setColor(0xf1c40f)
    .addFields(
      { name: 'Coins', value: `${coins}`, inline: true },
      { name: '🔥 Daily Streak', value: `${streak} day${streak === 1 ? '' : 's'}`, inline: true }
    );

  return interaction.reply({ embeds: [embed], ephemeral: target.id === interaction.user.id });
}
