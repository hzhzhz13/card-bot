import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { config } from '../config.js';
import { getCard } from '../../db/cards.js';
import { ensureUser, getCardQuantity, swapCards } from '../../db/users.js';
import { getRarity } from '../../utils/rarity.js';
import { createPending, consumePending } from '../pending.js';

export const data = new SlashCommandBuilder()
  .setName('trade')
  .setDescription('Offer a card-for-card trade with another user.')
  .addUserOption((opt) =>
    opt.setName('user').setDescription('Who to trade with').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('your_card').setDescription('The card ID you are giving').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('their_card').setDescription('The card ID you want from them').setRequired(true)
  );

function cardLine(card) {
  const r = getRarity(card.rarity);
  return `${r.emoji} **${card.name}** · *${card.series}* · ${r.label} \`${card.id}\``;
}

export async function execute(interaction) {
  const initiator = interaction.user;
  const target = interaction.options.getUser('user', true);
  const yourCardId = interaction.options.getString('your_card', true).trim().toUpperCase();
  const theirCardId = interaction.options.getString('their_card', true).trim().toUpperCase();

  if (target.id === initiator.id) {
    return interaction.reply({ content: "❌ You can't trade with yourself.", ephemeral: true });
  }
  if (target.bot) {
    return interaction.reply({ content: "❌ You can't trade with a bot.", ephemeral: true });
  }

  const yourCard = getCard(yourCardId);
  const theirCard = getCard(theirCardId);
  if (!yourCard) {
    return interaction.reply({ content: `❌ No card found with ID \`${yourCardId}\`.`, ephemeral: true });
  }
  if (!theirCard) {
    return interaction.reply({ content: `❌ No card found with ID \`${theirCardId}\`.`, ephemeral: true });
  }

  ensureUser(initiator.id, initiator.username);
  ensureUser(target.id, target.username);

  // Validate ownership up front (re-validated atomically on accept).
  if (getCardQuantity(initiator.id, yourCard.id) <= 0) {
    return interaction.reply({ content: `❌ You don't own **${yourCard.name}** \`${yourCard.id}\`.`, ephemeral: true });
  }
  if (getCardQuantity(target.id, theirCard.id) <= 0) {
    return interaction.reply({
      content: `❌ ${target} doesn't own **${theirCard.name}** \`${theirCard.id}\`.`,
      ephemeral: true,
    });
  }

  const token = createPending(
    { initiatorId: initiator.id, targetId: target.id, yourCardId: yourCard.id, theirCardId: theirCard.id },
    config.confirmTimeoutMs
  );

  const embed = new EmbedBuilder()
    .setTitle('🤝 Trade Offer')
    .setColor(0x5865f2)
    .setDescription(
      `${initiator} wants to trade with ${target}:\n\n` +
        `**${initiator.username} gives:**\n${cardLine(yourCard)}\n\n` +
        `**${target.username} gives:**\n${cardLine(theirCard)}`
    )
    .setFooter({ text: `${target.username} must accept within ${Math.round(config.confirmTimeoutMs / 1000)}s.` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`trade:${token}:accept`).setStyle(ButtonStyle.Success).setLabel('✅ Accept'),
    new ButtonBuilder().setCustomId(`trade:${token}:decline`).setStyle(ButtonStyle.Danger).setLabel('❌ Decline')
  );

  return interaction.reply({ content: `${target}`, embeds: [embed], components: [row] });
}

/** customId: "trade:<token>:<accept|decline>" */
export async function handleTradeButton(interaction) {
  const [, token, choice] = interaction.customId.split(':');
  const payload = consumePending(token);

  if (!payload) {
    return interaction.update({
      content: '⏳ This trade offer has expired.',
      embeds: [],
      components: [],
    });
  }

  // Only the target may accept/decline.
  if (interaction.user.id !== payload.targetId) {
    return interaction.reply({
      content: '🚫 Only the person being offered the trade can respond.',
      ephemeral: true,
    });
  }

  if (choice === 'decline') {
    return interaction.update({ content: '❌ Trade declined.', embeds: [], components: [] });
  }

  // Atomic swap; re-checks ownership inside the transaction.
  const ok = swapCards(payload.initiatorId, payload.yourCardId, payload.targetId, payload.theirCardId);
  if (!ok) {
    return interaction.update({
      content: '❌ Trade failed — one of the cards is no longer owned by its holder.',
      embeds: [],
      components: [],
    });
  }

  const yourCard = getCard(payload.yourCardId);
  const theirCard = getCard(payload.theirCardId);
  return interaction.update({
    content:
      `✅ Trade complete!\n<@${payload.initiatorId}> received ${cardLine(theirCard)}\n` +
      `<@${payload.targetId}> received ${cardLine(yourCard)}`,
    embeds: [],
    components: [],
  });
}
