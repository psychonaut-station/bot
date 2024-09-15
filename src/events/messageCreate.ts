import { Events, type Message } from 'discord.js';

import type { Event } from '../types';

const GUILD_ID = Bun.env.GUILD_ID;

export class MessageCreateEvent implements Event {
	public name = Events.MessageCreate;
	public async execute(message: Message) {
		if (message.guildId === GUILD_ID) {
			const [command, token] = message.content.split(' ');
			if (command === '/verify' && /^\d{3}-\d{3}$/.test(token)) {
				try {
					await message.reply({
						content:
							'Hesabını doğrulamak için /verify yazdıkdan sonra çıkan komutu kullanman gerek, ayrıca doğrulama tokenini bir başkası ile paylaşmamalısın.',
						options: { ephemeral: true },
					});
					message.delete();
				} catch {}
			}
		}
	}
}
