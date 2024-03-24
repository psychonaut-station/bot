import { SlashCommandBuilder } from 'discord.js';
import axios from 'axios';
import { Command } from '..';
import { GenericResponse as Response } from '../../types';
import { endpoint } from '../../utils/endpoint';

type ServerStatus =
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

export default {
	data: new SlashCommandBuilder()
		.setName('check')
		.setDescription('Round durumunu gösterir.'),
	async execute(interaction) {
		try {
			const genericResponse = (
				await axios.get<Response<ServerStatus[]>>(endpoint('server'))
			).data;

			if (genericResponse.status === 1) {
				const server = genericResponse.response[0];

				if (server.server_status === 1) {
					await interaction.reply(
						`Round #${server.round_id}: ${server.players} oyuncu ile devam etmekte.`
					);
				} else {
					await interaction.reply('Sunucu kapalı veya yeni round başlıyor.');
				}
			} else {
				throw new Error();
			}
		} catch (_) {
			await interaction.reply(
				'Sunucu bilgileri alınamadı. Daha sonra tekrar deneyin.'
			);
		}
	},
} satisfies Command;
