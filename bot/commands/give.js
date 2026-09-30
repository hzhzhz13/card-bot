import { SlashCommandBuilder } from 'discord.js';
import { isAdmin } from '../config.js';
import { getCard } from '../../db/cards.js';
import { ensureUser, grantCard } from '../../db/users.js';
import { getRarity } from '../../utils/rarity.js';

export const data = new SlashCommandBuilder()
  .setName('give')
  .setDescription('[Admin] Grant a card to a user.')
  .addUserOption((opt) =>
    opt.setName('user').setDescription('Recipient').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('card_id').setDescription('The 6-character card ID').setRequired(true)
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '🚫 This command is admin-only.',
      ephemeral: true,
    });
  }

  const target = interaction.options.getUser('user', true);
  const cardId = interaction.options.getString('card_id', true).trim().toUpperCase();

  if (target.bot) {
    return interaction.reply({ content: '❌ You can\'t give cards to a bot.', ephemeral: true });
  }

  const card = getCard(cardId);
  if (!card) {
    return interaction.reply({
      content: `❌ No card found with ID \`${cardId}\`.`,
      ephemeral: true,
    });
  }

  ensureUser(target.id, target.username);
  grantCard(target.id, card.id);

  const r = getRarity(card.rarity);
  return interaction.reply({
    content: `✅ Gave ${r.emoji} **${card.name}** · *${card.series}* · ${r.label} \`${card.id}\` to ${target}.`,
  });
}
