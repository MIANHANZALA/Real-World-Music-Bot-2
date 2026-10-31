
const {
    REST,
    Routes,
    ActivityType
} = require('discord.js');

const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {

        console.log('================================');
        console.log('[BOT] Connected:', client.user.tag);
        console.log('[COMMANDS] Starting registration...');
        console.log('================================');

        // Set bot activity
        client.user.setActivity('music | /play', {
            type: ActivityType.Listening
        });

        // Get target Discord server
        const guildId = process.env.GUILD_ID?.trim();

        if (!guildId) {
            console.error('[COMMANDS] GUILD_ID is missing in Render!');
            return;
        }

        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            console.error('[COMMANDS] Bot is not in the specified server.');
            console.error('[COMMANDS] GUILD_ID:', guildId);
            return;
        }

        // Load slash command files
        const commandsPath = path.join(
            __dirname,
            '../commands'
        );

        const commandFiles = fs.readdirSync(commandsPath)
            .filter(file => file.endsWith('.js'));

        const commands = [];

        for (const file of commandFiles) {

            try {

                const command = require(
                    path.join(commandsPath, file)
                );

                if (!command.data || !command.execute) {
                    throw new Error('Invalid command: ' + file);
                }

                commands.push(command.data.toJSON());

            } catch (error) {

                console.error(
                    '[COMMAND LOAD ERROR]',
                    file,
                    error
                );

                return;
            }
        }

        console.log(
            `[COMMANDS] Loaded ${commands.length} commands.`
        );

        // Register commands directly to your Discord server
        const rest = new REST({
            version: '10'
        }).setToken(process.env.TOKEN);

        try {

            const registered = await rest.put(
                Routes.applicationGuildCommands(
                    client.user.id,
                    guildId
                ),
                {
                    body: commands
                }
            );

            console.log('================================');
            console.log('[SUCCESS] SLASH COMMANDS REGISTERED');
            console.log('[SERVER]', guild.name);
            console.log('[SERVER ID]', guild.id);
            console.log('[REGISTERED COMMANDS]', registered.length);

            for (const command of registered) {
                console.log(`[SLASH COMMAND] /${command.name}`);
            }

            console.log('================================');

        } catch (error) {

            console.error('[COMMAND REGISTRATION FAILED]', error);

        }
    }
};
