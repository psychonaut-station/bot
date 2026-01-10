import {
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import type { Ban, Command } from '@/types';
import { formatBan, get } from '@/utils';

export class BanCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Numarası ile banı gösterir.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.addIntegerOption((option) =>
			option.setName('id').setDescription('Banın numarası.').setRequired(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		const id = interaction.options.getInteger('id', true);

		const { statusCode, body: ban } = await get<Ban>(`ban/?id=${id}`);

		if (statusCode === 200) {
			await interaction.reply(formatBan(ban));
		} else if (statusCode === 404) {
			await interaction.reply('Ban bulunamadı.');
		}
	}
}
