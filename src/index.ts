import { Client, Collection, GatewayIntentBits } from 'discord.js';

import { createLogger, deployCommands } from './utils';

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.logger = await createLogger();

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

client.login(Bun.env.BOT_TOKEN);
