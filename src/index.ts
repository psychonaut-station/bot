import { Client, Collection, GatewayIntentBits } from 'discord.js';
import pino from 'pino';

import { deployCommands } from './utils/deployCommands';

import * as commands from './commands';
import * as events from './events';

import 'dotenv/config';

async function main() {
	const client = new Client({
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
	});

	client.logger = pino(
		pino.transport({
			targets: [
				{ target: 'pino-pretty', options: { colorize: true } },
				{
					target: 'pino/file',
					options: { destination: process.env.LOG_FILE!, mkdir: true },
				},
			],
		})
	);

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
