import { type Client, REST, Routes } from 'discord.js';

import { applicationId, botToken, guildId } from '@/configuration';

export async function deployCommands(client: Client) {
	const rest = new REST().setToken(botToken);
	const commands = client.commands.map((command) => command.builder.toJSON());

	await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
		body: commands,
	});
}
