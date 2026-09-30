import { SlashCommandBuilder } from 'discord.js';
import { isAdmin } from '../config.js';
import { ensureUser } from '../../db/users.js';
import { postDrop } from './drop.js';

export const data = new SlashCommandBuilder()
  .setName('spawn')
  .setDescription('[Admin] Force-spawn a drop, bypassing cooldown.');

export async function execute(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '🚫 This command is admin-only.',
      ephemeral: true,
    });
  }

  ensureUser(interaction.user.id, interaction.user.username);
  await interaction.deferReply();
  // Admin is the dropper (gets priority), but no cooldown is started.
  return postDrop(interaction, interaction.user.id);
}
