import { type Client, REST, Routes } from 'discord.js';

export async function deployCommands(client: Client) {
	const rest = new REST().setToken(Bun.env.BOT_TOKEN);
	const commands = client.commands.map((command) => command.builder.toJSON());

	await rest.put(
		Routes.applicationGuildCommands(Bun.env.APPLICATION_ID, Bun.env.GUILD_ID),
		{
			body: commands,
		}
	);
}
