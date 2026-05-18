const { REST, Routes } = require("discord.js");
const { commands } = require("./commands");
const { config, assertConfig } = require("./config");

async function main() {
  assertConfig();

  const rest = new REST({ version: "10" }).setToken(config.token);
  const body = commands.map((command) => command.data.toJSON());
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  console.log(`Deploying ${body.length} command(s)...`);
  await rest.put(route, { body });
  console.log("Slash commands deployed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
