import {
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '@/types';
import { get } from '@/utils';

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

		await interaction.deferReply();

		const { statusCode, body: characters } = await get<[string, number][]>(
			`player/characters?ckey=${ckey}`
		);

		if (statusCode === 200) {
			if (characters.length === 0) {
				await interaction.editReply(
					'Oyuncu daha önce bir karakter ile hiç oynamamış.'
				);
				return;
			}

			await interaction.editReply(
				`${characters.map(([character]) => `\`\`${character}\`\``).join(', ')}`
			);
		} else if (statusCode === 404) {
			await interaction.editReply('Oyuncu bulunamadı.');
		}
	}
}
