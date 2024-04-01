import {
	AutocompleteInteraction,
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
		.addSubcommand((subcommand) =>
			subcommand
				.setName('ckey')
				.setDescription("Oyuncunun ckey'i ile Discord hesabını gösterir.")
				.addStringOption((option) =>
					option
						.setName('ckey')
						.setDescription("Oyuncunun ckey'i")
						.setRequired(true)
						.setAutocomplete(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('user')
				.setDescription("Oyuncunun Discord hesabı ile ckey'i gösterir.")
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('Oyuncunun Discord hesabı')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('ic-name')
				.setDescription("Oyuncunun karakterinin adı ile ckey'ini gösterir.")
				.addStringOption((option) =>
					option
						.setName('ic-name')
						.setDescription('Oyuncunun karakterinin adı')
						.setRequired(true)
						.setAutocomplete(true)
				)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();

		switch (interaction.options.getSubcommand()) {
			case 'ckey': {
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

				break;
			}
			case 'user': {
				const user = interaction.options.getUser('user', true);

				try {
					const { response } = await get<string>(
						`player/discord/?discord_id=${user.id}`
					);

					await interaction.editReply(`Oyuncunun ckey'i: \`${response}\``);
				} catch (error) {
					const axiosError = error as AxiosError;

					if (axiosError.response?.status === 409) {
						await interaction.editReply('Oyuncunun hesabı bağlı değil.');
						return;
					}

					throw axiosError;
				}

				break;
			}
			case 'ic-name': {
				let icName = interaction.options.getString('ic-name', true);
				let exactMatch = false;

				if (icName.endsWith('\u00ad')) {
					icName = icName.slice(0, -1);
					exactMatch = true;
				}

				const { response } = await get<{ name: string; ckey: string }[]>(
					`autocomplete/ic_name?ic_name=${icName}`
				);

				let filteredResponse = response;

				if (exactMatch) {
					filteredResponse = response.filter((entry) => entry.name === icName);
				}

				if (filteredResponse.length === 0) {
					await interaction.editReply('Oyuncu bulunamadı.');
					return;
				}

				const formatEntry = (entry: { name: string; ckey: string }) =>
					`${entry.name} - \`${entry.ckey}\``;

				await interaction.editReply(
					filteredResponse.map(formatEntry).join('\n')
				);

				break;
			}
		}
	}
	public async autocomplete(interaction: AutocompleteInteraction) {
		const focusedValue = interaction.options.getFocused(true);

		if (focusedValue.name === 'ic-name') {
			try {
				const { response } = await get<{ name: string; ckey: string }[]>(
					`autocomplete/ic_name?ic_name=${focusedValue.value}`
				);

				if (response.length === 0) {
					interaction.respond([]);
					return;
				}

				const names = response.map(({ name }) => name);
				const uniqueNames = [...new Set(names)];

				interaction.respond(
					uniqueNames.map((name) => ({ name, value: `${name}\u00ad` }))
				);
			} catch {
				interaction.respond([]);
			}
		}
	}
}
