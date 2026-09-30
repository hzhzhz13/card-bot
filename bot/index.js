import { Client, GatewayIntentBits, Collection, Events, MessageFlags } from 'discord.js';
import { config } from './config.js';
import { migrate } from '../db/database.js';
import { loadCards, allCards } from '../db/cards.js';
import * as dropCommand from './commands/drop.js';
import * as collectionCommand from './commands/collection.js';
import * as cardCommand from './commands/card.js';
import * as cooldownsCommand from './commands/cooldowns.js';
import * as statsCommand from './commands/stats.js';
import * as spawnCommand from './commands/spawn.js';
import * as giveCommand from './commands/give.js';
import { handleClaimButton } from './interactions.js';

// ── Startup: DB + catalog ──────────────────────────────────────────────
migrate();
loadCards();
console.log(`Loaded ${allCards().length} cards from catalog.`);

// ── Command registry ───────────────────────────────────────────────────
const commands = new Collection();
for (const cmd of [
  dropCommand,
  collectionCommand,
  cardCommand,
  cooldownsCommand,
  statsCommand,
  spawnCommand,
  giveCommand,
]) {
  commands.set(cmd.data.name, cmd);
}

// ── Client ─────────────────────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('claim:')) {
        await handleClaimButton(interaction);
      }
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const payload = {
      content: '⚠️ Something went wrong handling that action.',
      flags: MessageFlags.Ephemeral,
    };
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  }
});

if (!config.token) {
  console.error('❌ DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

client.login(config.token);
