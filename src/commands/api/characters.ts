import {
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '../../types';
import { get } from '../../utils';

export class CharactersCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('characters')
		.setDescription('Oyuncunun şimdiye kadar oynadığı karakterleri gösterir.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.addStringOption((option) =>
			option
				.setName('ckey')
				.setDescription('Oyuncunun ckeyi')
				.setRequired(true)
				.setAutocomplete(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		const ckey = interaction.options.getString('ckey', true);

		const { status, response: characters } = await get<string[]>(
			`player/characters?ckey=${ckey}`
		);

		if (status === 1) {
			if (characters.length === 0) {
				interaction.reply(
					'Oyuncu daha önce bir karakter ile ya hiç ya da 2 seferden fazla oynamamış.'
				);
				return;
			}

			interaction.reply(
				`${characters.map((character) => `\`\`${character}\`\``).join(', ')}`
			);
		} else if (status === 4) {
			interaction.reply('Oyuncu bulunamadı.');
		}
	}
}
