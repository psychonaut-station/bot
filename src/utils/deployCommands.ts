import { Client, REST, Routes } from 'discord.js';

export async function deployCommands(client: Client) {
	const rest = new REST().setToken(process.env.BOT_TOKEN!);

	try {
		const commands = client.commands.map((command) => command.builder.toJSON());

		await rest.put(
			Routes.applicationGuildCommands(
				process.env.APPLICATION_ID!,
				process.env.GUILD_ID!
			),
			{ body: commands }
		);
	} catch (error) {
		client.logger.error(error);
	}
}
