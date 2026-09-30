import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import {
  countUsers,
  countAllCards,
  countUniqueOwnerships,
  topCollectors,
} from '../../db/users.js';
import { allCards } from '../../db/cards.js';
import { activeDropCount } from '../drops.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Show server-wide collection statistics.');

export async function execute(interaction) {
  const users = countUsers();
  const totalCards = countAllCards();
  const unique = countUniqueOwnerships();
  const catalogSize = allCards().length;
  const leaders = topCollectors(5);

  const embed = new EmbedBuilder()
    .setTitle('📊 Collection Stats')
    .setColor(0x5865f2)
    .addFields(
      { name: '👥 Collectors', value: `${users}`, inline: true },
      { name: '🎴 Cards owned', value: `${totalCards}`, inline: true },
      { name: '🗂️ Catalog size', value: `${catalogSize}`, inline: true },
      { name: '🔗 Unique ownerships', value: `${unique}`, inline: true },
      { name: '💥 Active drops', value: `${activeDropCount()}`, inline: true }
    );

  if (leaders.length > 0) {
    const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
    const board = leaders
      .map((u, i) => `${medals[i]} **${u.username ?? u.id}** — ${u.total} cards`)
      .join('\n');
    embed.addFields({ name: '🏆 Top Collectors', value: board });
  }

  return interaction.reply({ embeds: [embed] });
}
