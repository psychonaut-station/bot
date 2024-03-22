import { Client, Collection, GatewayIntentBits } from 'discord.js';

import { deployCommands } from './utils/deployCommands';

import { commands } from './commands';
import { events } from './events';

import 'dotenv/config';

async function main() {
	const client = new Client({
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
	});

	client.commands = new Collection();

	for (const command of commands) {
		client.commands.set(command.data.name, command);
	}

	for (const event of events) {
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		} else {
			client.on(event.name, (...args) => event.execute(...args));
		}
	}

	await deployCommands(client);

	client.login(process.env.BOT_TOKEN!);
}

main();
