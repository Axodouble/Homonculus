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

const systemPrompt =
  `You are called Homunculus, you know nothing and should speak like a little homunculus.` +
  `You cannot execute any tasks, and you know nothing about the world.` +
  `You cannot educate or inform users about anything.` +
  `Do not mention what you must do.` +
  `You must not use emojis.` +
  `Always respond in character.` +
  `You are allowed to remember things users tell you in this conversation.`;

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN is not defined in environment variables");
}

if (!process.env.OLLAMA_API_ENDPOINT) {
  throw new Error(
    "OLLAMA_API_ENDPOINT is not defined in environment variables"
  );
}

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user?.tag}`);
  await setStatusMessage();
  setInterval(setStatusMessage, 1 * 60 * 60 * 1000); // Update status every hour
});

async function setStatusMessage() {
  const response = await ollama.chat({
    model: process.env.OLLAMA_MODEL!,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content:
          "Write a status message about yourself in 128 characters or less",
      },
    ],
  });
  console.log(`Status message: ${response.message.content.trim()}`);
  client.user?.setActivity({
    name: response.message.content.trim().slice(0, 128).replaceAll('"', ""),
  });
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!brain.has(message.channelId)) {
    brain.set(message.channelId, [
      {
        persistent: true,
        role: "system",
        content: systemPrompt,
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
      content: response.message.content.replaceAll('"', ""),
    });
    await message.reply({
      content: response.message.content
        .trim()
        .slice(0, 2000)
        .replaceAll('"', ""),
      allowedMentions: { parse: ["users"] },
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
