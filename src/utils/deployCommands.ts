import { Client, REST, Routes } from 'discord.js';

export async function deployCommands(client: Client) {
	const rest = new REST().setToken(process.env.BOT_TOKEN!);

	try {
		const commands = client.commands.map((command) => command.data.toJSON());

		console.log(
			`Started refreshing ${commands.length} application (/) commands.`
		);

		const data: any = await rest.put(
			Routes.applicationGuildCommands(
				process.env.APPLICATION_ID!,
				process.env.GUILD_ID!
			),
			{ body: commands }
		);

		console.log(
			`Successfully reloaded ${data.length} application (/) commands.`
		);
	} catch (error) {
		console.error(error);
	}
}
