import { Client, IntentsBitField, Message } from "discord.js";
import { Ollama } from "ollama";
import type { OllamaMessage } from "./system/types";

const client = new Client({
  intents: [
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
  ],
});

const ollama = new Ollama({ host: process.env.OLLAMA_API_ENDPOINT });

const brain: Map<string, OllamaMessage[]> = new Map();

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
  if (!brain.has(message.channelId)) {
    brain.set(message.channelId, [
      {
        persistent: true,
        role: "system",
        content:
          "You are called Homonculus, you know nothing and should speak like a little homonculus.",
      },
    ]);
  }

  const brainMessages = brain.get(message.channelId)!;

  brainMessages.push({
    persistent: false,
    role: "user",
    content: `${message.author.displayName} said: ${message.content}`,
  });

  if (brainMessages.length > 25) {
    const indexToRemove = brainMessages.findIndex((msg) => !msg.persistent);
    if (indexToRemove !== -1) {
      brainMessages.splice(indexToRemove, 1);
    }
  }

  if (message.mentions.has(client.user!.id)) {
    await message.channel.sendTyping();
    const response = await ollama.chat({
      model: process.env.OLLAMA_MODEL!,
      messages: [...brainMessages],
    });

    brainMessages.push({
      persistent: false,
      role: "assistant",
      content: response.message.content,
    });
    await message.reply(response.message.content.trim().slice(0, 2000));
  }
});

client.login(process.env.DISCORD_TOKEN);
