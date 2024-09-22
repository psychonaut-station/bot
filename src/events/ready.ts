import { type Client, Events } from 'discord.js';

import logger from '@/logger';
import type { Event } from '@/types';

export class ReadyEvent implements Event {
	public name = Events.ClientReady;
	public once = true;
	public async execute(client: Client) {
		logger.info(`Logged in as ${client.user?.tag}!`);
	}
}
