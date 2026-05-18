const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const { commands } = require("./commands");
const { config, assertConfig } = require("./config");
const { closeStore, connectStore } = require("./economyStore");

assertConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers]
});

client.commands = new Collection();

for (const command of commands) {
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}.`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    await interaction.reply({ content: "Unknown command.", ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    const response = {
      content: "Something broke while running that command.",
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response);
    } else {
      await interaction.reply(response);
    }
  }
});

async function main() {
  const storePath = await connectStore();
  console.log(`Using economy data file "${storePath}".`);
  await client.login(config.token);
}

process.on("SIGINT", async () => {
  await closeStore();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeStore();
  process.exit(0);
});

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
