import { Client } from 'discord.js';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';

import { Event } from '../events/index.js';

export default async function loadEvents(client: Client) {
	const eventsPath = join(__dirname, '..', 'events');
	const eventFiles = readdirSync(eventsPath).filter(
		(entry) =>
			(entry.endsWith('.ts') || entry.endsWith('.js')) &&
			!entry.startsWith('index')
	);

	for (const file of eventFiles) {
		const filePath = join(eventsPath, file);
		const event: Event = (await import(filePath)).default;
		if ('name' in event && 'execute' in event) {
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args));
			} else {
				client.on(event.name, (...args) => event.execute(...args));
			}
		} else {
			console.log(
				`[WARNING] The event at ${filePath} is missing a required "name" or "execute" property.`
			);
		}
	}
}
