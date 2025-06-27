import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	type MessageActionRowComponentBuilder as MessageActionRow,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '@/types';
import { get } from '@/utils';

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

const CONNECT_URL = 'https://play.ss13.tr';

export class CheckCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('check')
		.setDescription('Round durumunu gösterir.');
	public async execute(interaction: ChatInputCommandInteraction) {
		const { statusCode, body: servers } = await get<Status[]>('server');

		if (statusCode === 200) {
			const server = servers[0];

			const row = new ActionRowBuilder<MessageActionRow>().addComponents(
				new ButtonBuilder()
					.setLabel('Bağlan')
					.setStyle(ButtonStyle.Link)
					.setURL(CONNECT_URL)
			);

			if (server.server_status === 1) {
				const gameState =
					server.gamestate <= 2
						? 'başlıyor'
						: server.gamestate === 3
							? 'devam etmekte'
							: 'bitmek üzere';

				await interaction.reply({
					content: `Round #${server.round_id}: ${server.players} oyuncu ile ${server.map} haritasında ${gameState}.`,
					components: [row],
				});
			} else {
				await interaction.reply('Sunucu kapalı veya yeni round başlıyor.');
			}
		}
	}
}
