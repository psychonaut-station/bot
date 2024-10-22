import { Client, Collection, GatewayIntentBits } from 'discord.js';

import { botToken } from '@/config';
import logger from '@/logger';
import { deployCommands } from '@/utils';

process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled rejection:', promise, 'reason:', reason);
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
	console.error('Unhandled exception:', error, error.stack, 'origin:', origin);
});

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.commands = new Collection();

for (const Command of Object.values(await import('./commands'))) {
	const command = new Command();
	client.commands.set(command.builder.name, command);
}

for (const Event of Object.values(await import('./events'))) {
	const event = new Event();
	if ('once' in event && event.once) {
		client.once(event.name as string, event.execute.bind(event));
	} else {
		client.on(event.name as string, event.execute.bind(event));
	}
}

await deployCommands(client);

client.login(botToken);
