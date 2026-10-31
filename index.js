
'use strict';

// ============================================
// 1. LOAD ENVIRONMENT VARIABLES
// ============================================

require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Collection
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const express = require('express');

const { distubeOptions } = require('./src/config/config.js');
const PlayerManager = require('./src/player/PlayerManager.js');
const { printWatermark } = require('./src/config/type.js');


// ============================================
// 2. DISCORD BOT CONFIGURATION
// ============================================

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
];

const client = new Client({
    intents: intents
});

printWatermark();

client.commands = new Collection();


// ============================================
// 3. INITIALIZE MUSIC PLAYER
// ============================================

console.log('[STARTUP] Initializing DisTube player...');

client.playerManager = new PlayerManager(
    client,
    distubeOptions
);

client.playerManager.distube.setMaxListeners(20);

console.log('[STARTUP] DisTube player initialized.');


// ============================================
// 4. LOAD BOT COMMANDS
// ============================================

console.log('[STARTUP] Loading commands...');

const commandsPath = path.join(__dirname, 'src/commands');

if (!fs.existsSync(commandsPath)) {
    throw new Error('Commands directory not found: ' + commandsPath);
}

const commandFiles = fs.readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if (!command.data || !command.data.name) {
            throw new Error('Command is missing data.name');
        }

        client.commands.set(command.data.name, command);

        console.log(`[COMMAND] Loaded: ${command.data.name}`);

    } catch (error) {
        console.error(`[COMMAND ERROR] ${file}:`, error);
        throw error;
    }
}

console.log(`[STARTUP] Loaded ${client.commands.size} commands.`);


// ============================================
// 5. LOAD BOT EVENTS
// ============================================

console.log('[STARTUP] Loading events...');

const eventsPath = path.join(__dirname, 'src/events');

if (!fs.existsSync(eventsPath)) {
    throw new Error('Events directory not found: ' + eventsPath);
}

const eventFiles = fs.readdirSync(eventsPath)
    .filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    try {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);

        if (!event.name || typeof event.execute !== 'function') {
            throw new Error('Invalid event file: ' + file);
        }

        const listener = (...args) => {
            try {
                const result = event.execute(...args, client);

                if (result && typeof result.catch === 'function') {
                    result.catch(error => {
                        console.error(
                            `[EVENT ERROR] ${event.name}:`,
                            error
                        );
                    });
                }

            } catch (error) {
                console.error(
                    `[EVENT ERROR] ${event.name}:`,
                    error
                );
            }
        };

        if (event.once) {
            client.once(event.name, listener);
        } else {
            client.on(event.name, listener);
        }

        console.log(`[EVENT] Loaded: ${event.name}`);

    } catch (error) {
        console.error(`[EVENT LOAD ERROR] ${file}:`, error);
        throw error;
    }
}

console.log(`[STARTUP] Loaded ${eventFiles.length} events.`);


// ============================================
// 6. EXPRESS SERVER FOR RENDER
// ============================================

const app = express();

const PORT = Number(process.env.PORT) || 10000;

app.get('/', (req, res) => {
    const imagePath = path.join(__dirname, 'index.html');

    res.sendFile(imagePath, error => {
        if (error) {
            console.error('[WEB SERVER] Failed to send index.html:', error);

            if (!res.headersSent) {
                res.status(500).send('Music bot server is running.');
            }
        }
    });
});

app.get('/healthz', (req, res) => {
    res.status(200).json({
        status: 'running',
        discord: client.isReady() ? 'connected' : 'disconnected'
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('================================');
    console.log('[WEB SERVER] Running successfully.');
    console.log(`[WEB SERVER] Port: ${PORT}`);
    console.log('================================');
});

server.on('error', error => {
    console.error('[WEB SERVER ERROR]:', error);
});


// ============================================
// 7. DISCORD CONNECTION EVENTS
// ============================================

client.once('ready', () => {
    console.log('');
    console.log('================================');
    console.log('       DISCORD BOT ONLINE');
    console.log('================================');

    console.log('BOT NAME:', client.user.tag);
    console.log('BOT ID:', client.user.id);
    console.log('SERVERS:', client.guilds.cache.size);
    console.log('STATUS: CONNECTED');

    console.log('================================');
    console.log('');
});

client.on('error', error => {
    console.error('[DISCORD CLIENT ERROR]:', error);
});

client.on('warn', warning => {
    console.warn('[DISCORD WARNING]:', warning);
});

client.on('shardReady', shardId => {
    console.log(`[DISCORD] Gateway connected. Shard: ${shardId}`);
});

client.on('shardReconnecting', shardId => {
    console.warn(`[DISCORD] Reconnecting shard: ${shardId}`);
});

client.on('shardResume', (shardId, replayedEvents) => {
    console.log(
        `[DISCORD] Shard ${shardId} resumed. Replayed events: ${replayedEvents}`
    );
});

client.on('shardError', (error, shardId) => {
    console.error(`[DISCORD] Shard ${shardId} error:`, error);
});

client.on('shardDisconnect', (event, shardId) => {
    console.error('[DISCORD] Gateway disconnected:', {
        shardId: shardId,
        code: event.code,
        reason: String(event.reason || '')
    });
});


// ============================================
// 8. DISCORD API CONNECTIVITY TEST
// ============================================

async function checkDiscordAPI() {

    console.log('[API TEST] Checking Discord API...');

    try {

        const response = await fetch(
            'https://discord.com/api/v10/gateway',
            {
                signal: AbortSignal.timeout(15000)
            }
        );

        const body = await response.text();

        console.log('[API TEST] HTTP STATUS:', response.status);

        console.log(
            '[API TEST] CONTENT TYPE:',
            response.headers.get('content-type')
        );

        console.log('[API TEST] RESPONSE URL:', response.url);

        if (response.ok) {

            try {

                const data = JSON.parse(body);

                console.log('[API TEST] Discord API accessible.');
                console.log('[API TEST] Gateway URL:', data.url);
                console.log('[API TEST] Recommended shards:', data.shards);

            } catch (error) {

                console.error(
                    '[API TEST] Response was not valid JSON.'
                );

                console.error(
                    '[API TEST] RESPONSE PREVIEW:',
                    body.slice(0, 300).replace(/\s+/g, ' ')
                );
            }

        } else {

            console.error(
                '[API TEST] Discord returned an unsuccessful response.'
            );

            console.error(
                '[API TEST] RESPONSE PREVIEW:',
                body.slice(0, 300).replace(/\s+/g, ' ')
            );
        }

    } catch (error) {

        console.error('[API TEST] CONNECTION FAILED:', {
            name: error.name,
            message: error.message,
            code: error.cause?.code
        });

    }

}


// ============================================
// 9. DISCORD TOKEN VALIDATION
// ============================================

const token = process.env.TOKEN?.trim();

if (!token) {

    console.error('================================');
    console.error('[FATAL] DISCORD TOKEN IS MISSING!');
    console.error('================================');

    process.exit(1);
}

console.log('[DISCORD] Token environment variable detected.');


// ============================================
// 10. CONNECTION WATCHDOG
// ============================================

const connectionWatchdog = setTimeout(() => {

    if (!client.isReady()) {

        console.error('================================');

        console.error('[DISCORD] BOT NOT READY AFTER 30 SECONDS.');

        console.error(
            '[DISCORD] WebSocket status:',
            client.ws.status
        );

        console.error('[DISCORD] Check Gateway and API errors above.');

        console.error('================================');

    }

}, 30000);

connectionWatchdog.unref();

client.once('ready', () => {
    clearTimeout(connectionWatchdog);
});


// ============================================
// 11. CONNECT TO DISCORD
// ============================================

console.log('[DISCORD] Starting connection...');

// Run the API test independently.
// An API test failure MUST NOT prevent bot login.

checkDiscordAPI();

// Actual Discord authentication
client.login(token)
    .then(() => {

        console.log(
            '[DISCORD] Login request completed successfully.'
        );

        console.log(
            '[DISCORD] Waiting for the ready event...'
        );

    })
    .catch(error => {

        console.error('================================');

        console.error('[DISCORD LOGIN FAILED]');

        console.error('ERROR NAME:', error.name);
        console.error('ERROR MESSAGE:', error.message);
        console.error('ERROR CODE:', error.code);

        console.error('================================');

    });
