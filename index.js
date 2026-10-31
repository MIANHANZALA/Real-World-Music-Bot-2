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
const port = 3000;
app.get('/', (req, res) => {
    const imagePath = path.join(__dirname, 'index.html');
    res.sendFile(imagePath);
});
app.listen(port, () => {
    console.log(`🔗 Listening to GlaceYT : http://localhost:${port}`);
});


client.login(process.env.TOKEN);
