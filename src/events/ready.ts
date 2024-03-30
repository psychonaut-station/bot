import { Events, Client } from 'discord.js';
import { Event } from '../types';

export class ReadyEvent implements Event {
	public name = Events.ClientReady;
	public once = true;
	public execute(client: Client) {
		client.logger.info(`Ready! Logged in as ${client.user!.tag}`);
	}
}
