import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { config } from '../config.js';
import { rollDrop } from '../../db/cards.js';
import { ensureUser } from '../../db/users.js';
import {
  dropCooldownRemaining,
  startDropCooldown,
  formatDuration,
} from '../cooldowns.js';
import { buildDropMessage } from '../../utils/embed.js';
import { createDrop } from '../drops.js';

export const data = new SlashCommandBuilder()
  .setName('drop')
  .setDescription('Drop 3 random cards — claim one! (5 min cooldown)');

// Number emojis for the claim buttons.
const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

/** Build the claim button row for a drop (used on post and on updates). */
export function buildClaimRow(drop, { disableAll = false } = {}) {
  const row = new ActionRowBuilder();
  drop.cards.forEach((card, i) => {
    const claimedBy = drop.claimedBy[i];
    const btn = new ButtonBuilder()
      .setCustomId(`claim:${drop.messageId}:${i}`)
      .setStyle(claimedBy ? ButtonStyle.Secondary : ButtonStyle.Primary);

    if (claimedBy) {
      // Disabled + shows the claimer's display name (truncated to fit).
      const name = (drop.claimerNames?.[i] ?? 'claimed').slice(0, 70);
      btn.setLabel(`✔ ${name}`).setDisabled(true);
    } else {
      btn.setEmoji(NUM_EMOJI[i]).setDisabled(disableAll);
    }
    row.addComponents(btn);
  });
  return row;
}

/**
 * Roll and post a drop. Shared by /drop and the admin /spawn command.
 * Assumes interaction has already been deferred (deferReply).
 */
export async function postDrop(interaction, dropperId) {
  const cards = rollDrop(config.cardsPerDrop);
  const { embed, attachment } = await buildDropMessage(
    cards,
    `<@${dropperId}>`
  );

  // We need the message ID to key the drop + build button custom IDs, so send
  // first with a placeholder, then attach buttons keyed by the real message ID.
  const message = await interaction.editReply({
    embeds: [embed],
    files: [attachment],
  });

  const drop = createDrop(
    {
      messageId: message.id,
      channelId: interaction.channelId,
      dropperId,
      cards,
    },
    // onExpire: disable any still-active buttons.
    async (expiredDrop) => {
      try {
        const ch = await interaction.client.channels.fetch(expiredDrop.channelId);
        const msg = await ch.messages.fetch(expiredDrop.messageId);
        await msg.edit({ components: [buildClaimRow(expiredDrop, { disableAll: true })] });
      } catch {
        /* message may have been deleted; ignore */
      }
    }
  );
  // Track claimer display names for button labels.
  drop.claimerNames = cards.map(() => null);

  await interaction.editReply({ components: [buildClaimRow(drop)] });
  return undefined;
}

export async function execute(interaction) {
  const userId = interaction.user.id;
  ensureUser(userId, interaction.user.username);

  // Enforce the 5-minute drop cooldown.
  const remaining = dropCooldownRemaining(userId);
  if (remaining > 0) {
    return interaction.reply({
      content: `⏳ You're on drop cooldown. Try again in **${formatDuration(remaining)}**.`,
      ephemeral: true,
    });
  }

  // Start the cooldown immediately (before async work) to prevent double-drops.
  startDropCooldown(userId);

  await interaction.deferReply();
  return postDrop(interaction, userId);
}
