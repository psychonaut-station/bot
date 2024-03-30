import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { get, post } from '../../utils/api';
import { AxiosError } from 'axios';

export class UnverifyCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('unverify')
		.setDescription('Discord hesabı ile BYOND hesabı bağlantısını kaldırır.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('discord')
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
				case 'discord': {
					const user = interaction.options.getUser('user', true);

					const { status, response } = await post('unverify', {
						discord_id: user.id,
					});

					if (status === 1) {
						await interaction.editReply(
							`<@${user.id}> adlı Discord hesabı ile \`${response}\` adlı BYOND hesabının bağlantısı kaldırıldı!`
						);
					}

					break;
				}
				case 'ckey': {
					const ckey = interaction.options.getString('ckey', true);

					const { status, response } = await post('unverify', {
						ckey,
					});

					if (status === 1) {
						await interaction.editReply(
							`\`${ckey}\` adlı BYOND hesabı ile <${response}> adlı Discord hesabının bağlantısı kaldırıldı!`
						);
					}

					break;
				}
			}
		} catch (error) {
			const axiosError = error as AxiosError;

			if (axiosError.response?.status === 404) {
				await interaction.editReply('Hesap zaten bağlı değil!');
				return;
			}

			throw error;
		}
	}
	public async autocomplete(interaction: AutocompleteInteraction) {
		const focusedValue = interaction.options.getFocused(true);

		if (focusedValue.name === 'ckey') {
			const { status, response } = await get<string[]>(
				`autocomplete/ckey?ckey=${focusedValue.value}`
			);

			if (status === 1) {
				await interaction.respond(
					response.map((ckey) => ({ name: ckey, value: ckey }))
				);
			} else {
				await interaction.respond([]);
			}
		}
	}
}
