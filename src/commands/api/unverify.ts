import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { post } from '../../utils/api';
import { AxiosError } from 'axios';

export class UnverifyCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('unverify')
		.setDescription('Discord hesabı ile BYOND hesabı bağlantısını kaldırır.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('user')
				.setDescription(
					'Discord hesabı ile BYOND hesabı bağlantısını kaldırır.'
				)
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('Bağlantısı kaldırılacak Discord hesabı.')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('ckey')
				.setDescription(
					'BYOND hesabı ile Discord hesabı bağlantısını kaldırır.'
				)
				.addStringOption((option) =>
					option
						.setName('ckey')
						.setDescription("Bağlantısı kaldırılacak BYOND hesabının ckey'i.")
						.setRequired(true)
						.setAutocomplete(true)
				)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();

		try {
			switch (interaction.options.getSubcommand()) {
				case 'user': {
					const user = interaction.options.getUser('user', true);

					const { response } = await post('unverify', {
						discord_id: user.id,
					});

					interaction.client.logger.info(
						`Unverified user [${user.tag}](${user.id}) with ckey \`${response}\` by [${interaction.user.tag}](${interaction.user.id})`
					);

					await interaction.editReply(
						`<@${user.id}> adlı Discord hesabı ile \`${response}\` adlı BYOND hesabının bağlantısı kaldırıldı!`
					);

					break;
				}
				case 'ckey': {
					const ckey = interaction.options.getString('ckey', true);

					const { response } = await post<string>('unverify', {
						ckey,
					});

					const userId = response.substring(1);
					const user = await interaction.client.users.fetch(userId);

					interaction.client.logger.info(
						`Unverified user [${user.tag}](${userId}) with ckey \`${ckey}\` by [${interaction.user.tag}](${interaction.user.id})`
					);

					await interaction.editReply(
						`\`${ckey}\` adlı BYOND hesabı ile <${response}> adlı Discord hesabının bağlantısı kaldırıldı!`
					);

					break;
				}
			}
		} catch (error) {
			const axiosError = error as AxiosError;

			if (axiosError.response?.status === 409) {
				await interaction.editReply('Hesap zaten bağlı değil!');
				return;
			} else if (axiosError.response?.status === 404) {
				await interaction.editReply('Hesap bulunamadı!');
				return;
			}

			throw axiosError;
		}
	}
}
