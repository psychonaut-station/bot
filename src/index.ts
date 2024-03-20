import { Client, GatewayIntentBits } from 'discord.js';
import { loadCommands, loadEvents, deployCommands } from './utils';
import 'dotenv/config';

async function main() {
	const client = new Client({ intents: [GatewayIntentBits.Guilds] });

	await loadCommands(client);
	await loadEvents(client);
	await deployCommands(client);

	client.login(process.env.BOT_TOKEN!);
}

main();
