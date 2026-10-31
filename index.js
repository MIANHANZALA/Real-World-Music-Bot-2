const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { distubeOptions } = require('./src/config/config.js');
const fs = require('fs');
const path = require('path');
const PlayerManager = require('./src/player/PlayerManager.js');
const { printWatermark } = require('./src/config/type.js');
const intents = [
  GatewayIntentBits.Guilds,
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

client.on("debug", message => {
    console.log("[DISCORD DEBUG]", message);
});

client.on("error", error => {
    console.error("[DISCORD ERROR]", error);
});

client.on("shardError", error => {
    console.error("[SHARD ERROR]", error);
});

client.on("shardDisconnect", (event, id) => {
    console.error("[SHARD DISCONNECTED]", {
        id,
        code: event.code,
        reason: event.reason
    });
});

setTimeout(() => {
    console.log("[30 SECOND CHECK]", {
        ready: client.isReady(),
        username: client.user?.tag || "Not connected",
        websocketStatus: client.ws.status
    });
}, 30000);

async function connectDiscord() {
    // Test Discord's public Gateway API first
    try {
        console.log("[TEST 1] Checking Discord API...");

        const response = await fetch(
            "https://discord.com/api/v10/gateway",
            { signal: AbortSignal.timeout(15000) }
        );

        const data = await response.json();

        console.log("[TEST 1] HTTP STATUS:", response.status);

        if (!response.ok) {
            console.error("[TEST 1] Discord API response:", data);
            return;
        }

        console.log("[TEST 1] Gateway URL:", data.url);
        console.log("[TEST 1] Recommended shards:", data.shards);

    } catch (error) {
        console.error("[TEST 1] CONNECTION FAILED:", {
            name: error.name,
            message: error.message,
            code: error.cause?.code
        });

        return;
    }

    // If Discord API is reachable, attempt bot login
    console.log("[TEST 2] Connecting bot to Discord...");

    try {
        await client.login(token);
        console.log("[TEST 2] Login request completed.");
    } catch (error) {
        console.error("[TEST 2] LOGIN FAILED:", error);
    }
}

connectDiscord();
