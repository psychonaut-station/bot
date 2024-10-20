import { Events, type Message } from 'discord.js';

import { guildId } from '@/configuration';
import { verifyRegex } from '@/constants';
import type { Event } from '@/types';

export class MessageCreateEvent implements Event {
	public name = Events.MessageCreate;
	public async execute(message: Message) {
		if (message.guildId === guildId) {
			const [command, token] = message.content.split(' ');
			if (command === '/verify' && verifyRegex.test(token)) {
				try {
					await message.reply(
						'Hesabını doğrulamak için /verify yazdıkdan sonra çıkan komutu kullanman gerek, ayrıca doğrulama kodunu bir başkası ile paylaşmamalısın.'
					);
					await message.delete();
				} catch {}
			}
		}
	}
}
