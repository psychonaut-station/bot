import { Client, Collection, GatewayIntentBits } from 'discord.js';

import { deployCommands } from './utils/deployCommands';

import * as commands from './commands';
import * as events from './events';

import 'dotenv/config';

async function main() {
	const client = new Client({
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
	});

	client.commands = new Collection();

	for (const Command of Object.values(commands)) {
		const command = new Command();
		client.commands.set(command.builder.name, command);
	}

	for (const Event of Object.values(events)) {
		const event = new Event();
		if ('once' in event && event.once) {
			// @ts-ignore
			client.once(event.name, (...args) => event.execute(...args));
		} else {
			// @ts-ignore
			client.on(event.name, (...args) => event.execute(...args));
		}
	}

	await deployCommands(client);

	client.login(process.env.BOT_TOKEN!);
}

main();
