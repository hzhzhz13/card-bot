import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { loadCommandModules } from './load-commands.js';

const modules = await loadCommandModules();
const commands = modules.map((c) => c.data.toJSON());

if (!config.token || !config.clientId) {
  console.error('❌ DISCORD_TOKEN and CLIENT_ID must be set in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.token);

try {
  if (config.guildId) {
    // Guild-scoped: updates instantly — ideal for development.
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log(`✅ Registered ${commands.length} commands to guild ${config.guildId}.`);
  } else {
    // Global: can take up to 1 hour to propagate.
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log(`✅ Registered ${commands.length} global commands.`);
  }
  console.log(`Commands: ${modules.map((c) => c.data.name).join(', ')}`);
} catch (err) {
  console.error('Failed to register commands:', err);
  process.exit(1);
}
