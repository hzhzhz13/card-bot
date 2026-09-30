import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getCollection, countCards, ensureUser } from '../../db/users.js';
import { getCard } from '../../db/cards.js';
import { getRarity, RARITY_ORDER } from '../../utils/rarity.js';

export const data = new SlashCommandBuilder()
  .setName('collection')
  .setDescription('View your card collection (or another user\'s).')
  .addUserOption((opt) =>
    opt.setName('user').setDescription('Whose collection to view').setRequired(false)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser('user') ?? interaction.user;
  ensureUser(target.id, target.username);

  const rows = getCollection(target.id);
  const total = countCards(target.id);

  if (rows.length === 0) {
    return interaction.reply({
      content:
        target.id === interaction.user.id
          ? "You don't have any cards yet. Use `/drop` to get started!"
          : `**${target.username}** hasn't collected any cards yet.`,
      ephemeral: true,
    });
  }

  // Group by rarity for a tidy display.
  const byRarity = new Map();
  for (const row of rows) {
    const card = getCard(row.card_id);
    if (!card) continue; // card removed from catalog
    if (!byRarity.has(card.rarity)) byRarity.set(card.rarity, []);
    byRarity.get(card.rarity).push({ card, qty: row.quantity });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎴 ${target.username}'s Collection`)
    .setColor(0x5865f2)
    .setFooter({
      text: `${rows.length} unique · ${total} total cards`,
    });

  for (const rarity of RARITY_ORDER) {
    const items = byRarity.get(rarity);
    if (!items || items.length === 0) continue;
    const r = getRarity(rarity);
    const value = items
      .map(
        ({ card, qty }) =>
          `\`${card.id}\` **${card.name}** · *${card.series}*${qty > 1 ? ` ×${qty}` : ''}`
      )
      .join('\n');
    embed.addFields({ name: `${r.emoji} ${r.label}`, value });
  }

  return interaction.reply({ embeds: [embed] });
}
