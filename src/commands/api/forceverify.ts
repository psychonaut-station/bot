import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { post } from '../../utils/api';
import { GenericResponse as Response } from '../../types';
import { AxiosError } from 'axios';

export class ForceVerifyCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('forceverify')
		.setDescription('Discord hesabı ile BYOND hesabını bağlar.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('Bağlanılacak Discord hesabı.')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('ckey')
				.setDescription("Bağlanılacak BYOND hesabının ckey'i.")
				.setRequired(true)
				.setAutocomplete(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		const user = interaction.options.getUser('user', true);
		const ckey = interaction.options.getString('ckey', true).toLowerCase();

		await interaction.deferReply();

		try {
			await post<string>('verify', {
				discord_id: user.id,
				ckey: ckey,
			});

			interaction.client.logger.info(
				`Force-verified user [${user.tag}](${user.id}) with ckey \`${ckey}\` by [${interaction.user.tag}](${interaction.user.id})`
			);

			await interaction.editReply(
				`<@${user.id}> adlı Discord hesabı başarıyla \`${ckey}\` adlı BYOND hesabına bağlandı!`
			);
		} catch (error) {
			const axiosError = error as AxiosError;

			if (axiosError.response?.status === 409) {
				const { response } = axiosError.response.data as Response<string>;

				if (response.startsWith('@')) {
					await interaction.editReply(
						`Bu ckey zaten <${response}> adlı Discord hesabına bağlı!`
					);
				} else {
					await interaction.editReply(
						`Bu Discord hesabı zaten \`${response}\` adlı BYOND hesabına bağlı!`
					);
				}

				return;
			} else if (axiosError.response?.status === 404) {
				await interaction.editReply('Oyuncu bulunamadı!');
				return;
			}

			throw axiosError;
		}
	}
}
