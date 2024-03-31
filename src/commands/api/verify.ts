import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { AxiosError } from 'axios';
import { Command, GenericResponse as Response } from '../../types';
import { post } from '../../utils/api';

export class VerifyCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('verify')
		.setDescription('Discord hesabın ile BYOND hesabını bağlar.')
		.addStringOption((option) =>
			option
				.setName('token')
				.setDescription('Oyun içerisinden alınan tek kullanımlık token.')
				.setRequired(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		const user = interaction.user;
		const token = interaction.options.getString('token', true);

		await interaction.deferReply({ ephemeral: true });

		try {
			const { response: ckey } = await post<string>('verify', {
				discord_id: user.id,
				one_time_token: token,
			});

			interaction.client.logger.info(
				`Verified user [${user.tag}](${user.id}) with ckey \`${ckey}\``
			);

			await interaction.editReply(
				`Discord hesabın başarıyla \`${ckey}\` adlı BYOND hesabına bağlandı!`
			);
		} catch (error) {
			const axiosError = error as AxiosError;

			if (axiosError.response?.status === 409) {
				const { response } = axiosError.response.data as Response<string>;

				if (response.startsWith('@')) {
					await interaction.editReply(
						`Bu token <${response}> adlı Discord hesabına bağlı!`
					);
				} else {
					await interaction.editReply(
						`Discord hesabın zaten \`${response}\` adlı BYOND hesabına bağlı!`
					);
				}

				return;
			} else if (axiosError.response?.status === 404) {
				await interaction.editReply('Token geçersiz!');
				return;
			}

			throw axiosError;
		}
	}
}
