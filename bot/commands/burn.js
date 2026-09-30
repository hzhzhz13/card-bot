import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { config } from '../config.js';
import { getCard } from '../../db/cards.js';
import { ensureUser, getCardQuantity, burnCard, getCoins } from '../../db/users.js';
import { getRarity } from '../../utils/rarity.js';
import { createPending, consumePending } from '../pending.js';

export const data = new SlashCommandBuilder()
  .setName('burn')
  .setDescription('Destroy a card in exchange for coins.')
  .addStringOption((opt) =>
    opt.setName('card_id').setDescription('The 6-character card ID to burn').setRequired(true)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  ensureUser(userId, interaction.user.username);

  const cardId = interaction.options.getString('card_id', true).trim().toUpperCase();
  const card = getCard(cardId);
  if (!card) {
    return interaction.reply({ content: `❌ No card found with ID \`${cardId}\`.`, ephemeral: true });
  }

  if (getCardQuantity(userId, card.id) <= 0) {
    return interaction.reply({ content: `❌ You don't own **${card.name}** \`${card.id}\`.`, ephemeral: true });
  }

  const rarity = getRarity(card.rarity);
  const value = rarity.burnValue;

  // Register a pending burn keyed by a token embedded in the button IDs.
  const token = createPending({ userId, cardId: card.id, value }, config.confirmTimeoutMs);

  const embed = new EmbedBuilder()
    .setTitle('🔥 Confirm Burn')
    .setColor(rarity.color)
    .setDescription(
      `Burn ${rarity.emoji} **${card.name}** · *${card.series}* · ${rarity.label} \`${card.id}\` for **${value}** coins?\n\n*This permanently removes one copy.*`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`burn:${token}:yes`).setStyle(ButtonStyle.Danger).setLabel('🔥 Burn'),
    new ButtonBuilder().setCustomId(`burn:${token}:no`).setStyle(ButtonStyle.Secondary).setLabel('Cancel')
  );

  return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/** customId: "burn:<token>:<yes|no>" */
export async function handleBurnButton(interaction) {
  const [, token, choice] = interaction.customId.split(':');

  // Only the initiator may press (ephemeral message, but double-guard).
  const payload = consumePending(token);
  if (!payload) {
    return interaction.update({
      content: '⏳ This burn confirmation has expired.',
      embeds: [],
      components: [],
    });
  }

  if (interaction.user.id !== payload.userId) {
    // Re-register so the real owner can still act; reject this presser.
    return interaction.reply({ content: '🚫 This isn\'t your burn to confirm.', ephemeral: true });
  }

  if (choice === 'no') {
    return interaction.update({ content: '❌ Burn cancelled.', embeds: [], components: [] });
  }

  const ok = burnCard(payload.userId, payload.cardId, payload.value);
  if (!ok) {
    return interaction.update({
      content: '❌ Burn failed — you no longer own that card.',
      embeds: [],
      components: [],
    });
  }

  const card = getCard(payload.cardId);
  const rarity = getRarity(card.rarity);
  const balance = getCoins(payload.userId);

  return interaction.update({
    content: `🔥 Burned ${rarity.emoji} **${card.name}** \`${card.id}\` for **${payload.value}** coins. Balance: **${balance}**.`,
    embeds: [],
    components: [],
  });
}
