import { getDrop, reserveCard, inPriorityWindow } from './drops.js';
import { getCard } from '../db/cards.js';
import { ensureUser, grantCard } from '../db/users.js';
import {
  claimCooldownRemaining,
  startClaimCooldown,
  formatDuration,
} from './cooldowns.js';
import { getRarity } from '../utils/rarity.js';
import { buildClaimRow } from './commands/drop.js';

/**
 * Handle a claim button press. customId format: "claim:<messageId>:<index>".
 */
export async function handleClaimButton(interaction) {
  const [, messageId, indexStr] = interaction.customId.split(':');
  const index = Number(indexStr);
  const userId = interaction.user.id;

  const drop = getDrop(messageId);
  if (!drop) {
    return interaction.reply({
      content: '❌ This drop has expired.',
      ephemeral: true,
    });
  }

  // Claim cooldown (2 min) applies to everyone, including the dropper.
  const cd = claimCooldownRemaining(userId);
  if (cd > 0) {
    return interaction.reply({
      content: `⏳ You're on claim cooldown. You can claim again in **${formatDuration(cd)}**.`,
      ephemeral: true,
    });
  }

  const result = reserveCard(drop, index, userId);
  if (!result.ok) {
    let msg;
    switch (result.reason) {
      case 'expired':
        msg = '❌ This drop has expired.';
        break;
      case 'taken':
        msg = '❌ That card has already been claimed.';
        break;
      case 'priority': {
        const left = Math.max(0, drop.priorityUntil - Date.now());
        msg = `⏳ Priority window — only the dropper can claim for **${formatDuration(left)}**.`;
        break;
      }
      default:
        msg = '❌ Unable to claim that card.';
    }
    return interaction.reply({ content: msg, ephemeral: true });
  }

  // Reservation succeeded — commit to DB and start the claimer's cooldown.
  const card = drop.cards[index];
  ensureUser(userId, interaction.user.username);
  grantCard(userId, card.id);
  startClaimCooldown(userId);

  // Record the claimer's display name for the disabled button label.
  const displayName = interaction.member?.displayName ?? interaction.user.username;
  drop.claimerNames = drop.claimerNames ?? drop.cards.map(() => null);
  drop.claimerNames[index] = displayName;

  const rarity = getRarity(card.rarity);

  // Update the drop message: rebuild buttons so the claimed one shows the name.
  await interaction.update({ components: [buildClaimRow(drop)] });

  // Public follow-up announcing the claim.
  await interaction.followUp({
    content: `${rarity.emoji} ${interaction.user} claimed **${card.name}** · *${card.series}* · **${rarity.label}**  \`${card.id}\``,
  });
  return undefined;
}
