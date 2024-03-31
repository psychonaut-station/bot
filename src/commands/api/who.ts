import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { get } from '../../utils/api';
import { AxiosError } from 'axios';

type User = {
	id: string;
	username: string;
	discriminator: string;
	global_name: string;
	avatar: string;
};

export class WhoCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('who')
		.setDescription('Oyuncunun Discord hesabını gösterir.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addStringOption((option) =>
			option
				.setName('ckey')
				.setDescription("Oyuncunun ckey'i")
				.setRequired(true)
				.setAutocomplete(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const ckey = interaction.options.getString('ckey', true);

		try {
			const { response } = await get<User>(`player/discord/?ckey=${ckey}`);

			await interaction.editReply(
				`Oyuncunun Discord hesabı: <@${response.id}>`
			);
		} catch (error) {
			const axiosError = error as AxiosError;

			if (axiosError.response?.status === 409) {
				await interaction.editReply('Oyuncunun hesabı bağlı değil.');
				return;
			} else if (axiosError.response?.status === 404) {
				await interaction.editReply('Oyuncu bulunamadı.');
				return;
			}

			throw axiosError;
		}
	}
}
