import { Client, Collection } from 'discord.js';
import { readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

import { Command } from '../commands/index.js';

export default async function loadCommands(client: Client) {
	client.commands = new Collection();

	const commandsPath = join(__dirname, '..', 'commands');
	const commands = readdirSync(commandsPath).filter(
		(entry) => !entry.startsWith('index')
	);

	for (const entry of commands) {
		const entryPath = join(commandsPath, entry);
		if (lstatSync(entryPath).isDirectory()) {
			const subcommands = readdirSync(entryPath).filter(
				(file) => file.endsWith('.ts') || file.endsWith('.js')
			);

			for (const file of subcommands) {
				const filePath = join(entryPath, file);
				const command: Command = (await import(filePath)).default;
				if ('data' in command && 'execute' in command) {
					client.commands.set(command.data.name, command);
				} else {
					console.log(
						`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
					);
				}
			}
		} else {
			const command: Command = (await import(entryPath)).default;
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.log(
					`[WARNING] The command at ${entryPath} is missing a required "data" or "execute" property.`
				);
			}
		}
	}
}
