import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '../../types';
import { get } from '../../utils/api';

type Status =
	| {
			connection_info: string;
			gamestate: number;
			map: string;
			name: string;
			players: number;
			round_duration: number;
			round_id: number;
			security_level: string;
			server_status: 1;
	  }
	| {
			err_str: string;
			name: string;
			server_status: 0;
	  };

export class CheckCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('check')
		.setDescription('Round durumunu gösterir.');
	public async execute(interaction: ChatInputCommandInteraction) {
		const { status, response } = await get<Status[]>('server');

		if (status === 1) {
			const server = response[0];

			if (server.server_status === 1) {
				interaction.reply(
					`Round #${server.round_id}: ${server.players} oyuncu ile devam etmekte.`
				);
			} else {
				interaction.reply('Sunucu kapalı veya yeni round başlıyor.');
			}
		}
	}
}
