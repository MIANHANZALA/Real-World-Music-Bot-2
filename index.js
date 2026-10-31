const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { distubeOptions } = require('./src/config/config.js');
const fs = require('fs');
const path = require('path');
const PlayerManager = require('./src/player/PlayerManager.js');
const { printWatermark } = require('./src/config/type.js');
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages
];

const client = new Client({ intents });
printWatermark();
client.commands = new Collection();
client.playerManager = new PlayerManager(client, distubeOptions);
client.playerManager.distube.setMaxListeners(20);
const commandsPath = path.join(__dirname, './src/commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}


const eventsPath = path.join(__dirname, './src/events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}


const express = require("express");
const app = express();

const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
    const imagePath = path.join(__dirname, 'index.html');
    res.sendFile(imagePath);
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Web server running on port ${port}`);
});


// Discord connection diagnostics

const token = process.env.TOKEN?.trim();

console.log("Discord token available:", Boolean(token));

client.once("ready", () => {
    console.log("================================");
    console.log("✅ DISCORD BOT IS ONLINE");
    console.log("Bot:", client.user.tag);
    console.log("Bot ID:", client.user.id);
    console.log("Servers:", client.guilds.cache.size);
    console.log("================================");
});

client.on("shardReady", shardId => {
    console.log(`✅ Discord Gateway connected. Shard: ${shardId}`);
});

client.on("shardError", (error, shardId) => {
    console.error(`❌ Gateway error on shard ${shardId}:`, error);
});

client.on("shardDisconnect", (event, shardId) => {
    console.error(
        `❌ Gateway disconnected. Shard: ${shardId}, Code: ${event.code}`
    );
});

client.on("error", error => {
    console.error("❌ Discord client error:", error);
});

client.on("warn", warning => {
    console.warn("Discord warning:", warning);
});

if (!token) {
    console.error("❌ TOKEN is missing from Render Environment!");
    process.exit(1);
}

console.log("Connecting to Discord Gateway...");

client.login(token)
    .then(() => {
        console.log("Discord login request completed.");
    })
    .catch(error => {
        console.error("❌ DISCORD LOGIN FAILED:", error);
        process.exit(1);
    });
