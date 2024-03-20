import { Events, Client } from 'discord.js';
import type { Event } from '.';

export default {
	name: Events.ClientReady,
	once: true,
	execute(client: Client) {
		console.log(`Ready! Logged in as ${client.user!.tag}`);
	},
} satisfies Event;
