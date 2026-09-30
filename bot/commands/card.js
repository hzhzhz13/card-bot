import { SlashCommandBuilder } from 'discord.js';
import { getCard, imageExists } from '../../db/cards.js';
import { buildCardEmbed, buildCardAttachment } from '../../utils/embed.js';

export const data = new SlashCommandBuilder()
  .setName('card')
  .setDescription('Inspect a card by its ID.')
  .addStringOption((opt) =>
    opt.setName('id').setDescription('The 6-character card ID').setRequired(true)
  );

export async function execute(interaction) {
  const id = interaction.options.getString('id', true).trim().toUpperCase();
  const card = getCard(id);

  if (!card) {
    return interaction.reply({
      content: `❌ No card found with ID \`${id}\`.`,
      ephemeral: true,
    });
  }

  const embed = buildCardEmbed(card);
  const payload = { embeds: [embed] };
  if (imageExists(card)) {
    payload.files = [buildCardAttachment(card)];
  }
  return interaction.reply(payload);
}
