import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '../../types';
import { get } from '../../utils';

interface User {
	id: string;
	username: string;
	discriminator: string;
	global_name: string;
	avatar: string;
}

export class WhoCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('who')
		.setDescription('Oyuncunun Discord hesabını gösterir.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('ckey')
				.setDescription('Oyuncunun ckeyi ile Discord hesabını gösterir.')
				.addStringOption((option) =>
					option
						.setName('ckey')
						.setDescription('Oyuncunun ckeyi')
						.setRequired(true)
						.setAutocomplete(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('user')
				.setDescription('Oyuncunun Discord hesabı ile ckeyini gösterir.')
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
				.setDescription('Oyuncunun karakterinin adı ile ckeyini gösterir.')
				.addStringOption((option) =>
					option
						.setName('ic-name')
						.setDescription('Oyuncunun karakterinin adı')
						.setRequired(true)
						.setAutocomplete(true)
				)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		switch (interaction.options.getSubcommand()) {
			case 'ckey': {
				const ckey = interaction.options.getString('ckey', true);

				const { status, response: user } = await get<User>(
					`player/discord/?ckey=${ckey}`
				);

				if (status === 1) {
					interaction.reply(`Oyuncunun Discord hesabı: <@${user.id}>`);
				} else if (status === 4) {
					interaction.reply('Oyuncu bulunamadı.');
				} else if (status === 6) {
					interaction.reply('Oyuncunun Discord hesabı bağlı değil.');
				}

				break;
			}
			case 'user': {
				const user = interaction.options.getUser('user', true);

				const { status, response: ckey } = await get<string>(
					`player/discord/?discord_id=${user.id}`
				);

				if (status === 1) {
					interaction.reply(`Oyuncunun ckeyi: \`${ckey}\``);
				} else if (status === 6) {
					interaction.reply('Oyuncunun Discord hesabı bağlı değil.');
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

				let filteredResponse = response!;

				if (exactMatch) {
					filteredResponse = response!.filter((entry) => entry.name === icName);
				}

				if (filteredResponse.length === 0) {
					interaction.reply('Oyuncu bulunamadı.');
					return;
				}

				const formatEntry = (entry: { name: string; ckey: string }) =>
					`${entry.name} - \`${entry.ckey}\``;

				interaction.reply(filteredResponse.map(formatEntry).join('\n'));

				break;
			}
		}
	}
	public async autocomplete(interaction: AutocompleteInteraction) {
		const focusedValue = interaction.options.getFocused(true);

		if (focusedValue.name === 'ic-name') {
			const { response } = await get<{ name: string; ckey: string }[]>(
				`autocomplete/ic_name?ic_name=${focusedValue.value}`
			);

			if (response!.length === 0) {
				interaction.respond([]);
				return;
			}

			const names = response!.map(({ name }) => name);
			const uniqueNames = [...new Set(names)];

			interaction.respond(
				uniqueNames.map((name) => ({ name, value: `${name}\u00ad` }))
			);
		}
	}
}
