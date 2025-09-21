import { Client, IntentsBitField } from "discord.js";
import { Ollama } from "ollama";

const client = new Client({
  intents: [
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
  ],
});

const ollama = new Ollama({ host: process.env.OLLAMA_API_ENDPOINT });

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN is not defined in environment variables");
}

if (!process.env.OLLAMA_API_ENDPOINT) {
  throw new Error(
    "OLLAMA_API_ENDPOINT is not defined in environment variables"
  );
}

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.mentions.has(client.user!.id)) {
    await message.channel.sendTyping();
    const response = await ollama.chat({
      model: process.env.OLLAMA_MODEL!,
      messages: [
        {
          role: "system",
          content:
            "You are called Homonculus, you know nothing and should speak like a little homonculus.",
        },
        {
          role: "user",
          content: `${message.author.displayName} said: ${message.content}`,
        },
      ],
    });

    await message.reply(response.message.content.trim().slice(0, 2000));
  }
});

client.login(process.env.DISCORD_TOKEN);
