import { Client, GatewayIntentBits, Collection, Events, MessageFlags } from 'discord.js';
import { config } from './config.js';
import { migrate } from '../db/database.js';
import { loadCards, allCards } from '../db/cards.js';
import { loadCommandModules } from './load-commands.js';
import { routeButton } from './interactions.js';

// ── Startup: DB + catalog ──────────────────────────────────────────────
migrate();
loadCards();
console.log(`Loaded ${allCards().length} cards from catalog.`);

// ── Command registry (auto-loaded from bot/commands/) ───────────────────
const commands = new Collection();
for (const cmd of await loadCommandModules()) {
  commands.set(cmd.data.name, cmd);
}
console.log(`Loaded ${commands.size} commands: ${[...commands.keys()].join(', ')}`);

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
      await routeButton(interaction);
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
