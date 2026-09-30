import sharp from 'sharp';
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getRarity } from './rarity.js';
import { imagePath } from '../db/cards.js';

// Target height each card is scaled to when composing the side-by-side strip.
const CARD_HEIGHT = 600;
const GAP = 24; // horizontal gap between cards (transparent)

/**
 * Compose N card PNGs side-by-side into a single PNG buffer.
 * Cards are numbered via the claim buttons and embed text, so no text is
 * rendered onto the image (avoids a font dependency in libvips). Returns a
 * PNG Buffer.
 */
export async function composeDropImage(cards) {
  // Resize each card to a uniform height, keeping aspect ratio.
  const resized = await Promise.all(
    cards.map((c) =>
      sharp(imagePath(c))
        .resize({ height: CARD_HEIGHT })
        .png()
        .toBuffer({ resolveWithObject: true })
    )
  );

  const widths = resized.map((r) => r.info.width);
  const totalWidth =
    widths.reduce((a, b) => a + b, 0) + GAP * (cards.length - 1);

  const composites = [];
  let x = 0;
  for (let i = 0; i < resized.length; i++) {
    composites.push({ input: resized[i].data, left: x, top: 0 });
    x += widths[i] + GAP;
  }

  return sharp({
    create: {
      width: totalWidth,
      height: CARD_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

/** Build the drop message embed + combined-image attachment. */
export async function buildDropMessage(cards, dropperTag) {
  const buffer = await composeDropImage(cards);
  const attachment = new AttachmentBuilder(buffer, { name: 'drop.png' });

  const lines = cards.map((c, i) => {
    const r = getRarity(c.rarity);
    return `**${i + 1}.** ${r.emoji} **${c.name}** · *${c.series}* · ${r.label}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('🎴 A wild drop appeared!')
    .setDescription(
      `${dropperTag} dropped **${cards.length}** cards!\n\n${lines.join('\n')}`
    )
    .setImage('attachment://drop.png')
    .setColor(0x5865f2)
    .setFooter({ text: 'Click a number to claim. Dropper has priority for 10s.' });

  return { embed, attachment };
}

/** Build a single-card embed (for /card and claim confirmations). */
export function buildCardEmbed(card, { ownerTag } = {}) {
  const r = getRarity(card.rarity);
  const embed = new EmbedBuilder()
    .setTitle(`${r.emoji} ${card.name}`)
    .addFields(
      { name: 'Series', value: card.series, inline: true },
      { name: 'Rarity', value: r.label, inline: true },
      { name: 'Card ID', value: `\`${card.id}\``, inline: true }
    )
    .setColor(r.color)
    .setImage(`attachment://${card.id}.png`);
  if (ownerTag) embed.setFooter({ text: `Owned by ${ownerTag}` });
  return embed;
}

/** Attachment for a single card's artwork, named to match buildCardEmbed. */
export function buildCardAttachment(card) {
  return new AttachmentBuilder(imagePath(card), { name: `${card.id}.png` });
}
