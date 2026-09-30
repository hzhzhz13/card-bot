import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsDir = join(__dirname, 'commands');

/**
 * Dynamically import every command module in bot/commands/.
 * A valid command module exports `data` (SlashCommandBuilder) and `execute`.
 * Returns an array of the loaded modules.
 */
export async function loadCommandModules() {
  const files = readdirSync(commandsDir).filter((f) => f.endsWith('.js'));
  const modules = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(commandsDir, file)).href);
    if (mod?.data?.name && typeof mod.execute === 'function') {
      modules.push(mod);
    } else {
      console.warn(`⚠️  Skipping ${file}: missing "data" or "execute" export.`);
    }
  }
  return modules;
}
