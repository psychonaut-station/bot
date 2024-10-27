import {
	ActionRowBuilder,
	type AutocompleteInteraction,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	type MessageActionRowComponentBuilder as MessageActionRow,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '@/types';
import { get } from '@/utils';

interface JobPlaytime {
	ckey: string;
	minutes: number;
}

interface PlayerPlaytime {
	job: string;
	minutes: number;
}

export class PlaytimeCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('playtime')
		.setDescription('Oyuncuların rollere ne kadar süre harcadığını gösterir.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('top')
				.setDescription(
					'Bir mesleğe en çok süre harcayan 15 oyuncuyu gösterir.'
				)
				.addStringOption((option) =>
					option
						.setName('job')
						.setDescription('Mesleğin adı')
						.setRequired(true)
						.setAutocomplete(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('player')
				.setDescription(
					'Bir oyuncunun hangi mesleğe ne kadar süre harcadığını gösterir.'
				)
				.addStringOption((option) =>
					option
						.setName('ckey')
						.setDescription('Oyuncunun ckeyi')
						.setRequired(true)
						.setAutocomplete(true)
				)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		switch (interaction.options.getSubcommand()) {
			case 'top': {
				const job = interaction.options.getString('job', true);

				const { body: top } = await get<JobPlaytime[]>(
					`player/roletime/top/?job=${job}`
				);

				if (top!.length === 0) {
					await interaction.reply('Meslek bulunamadı.');
					return;
				}

				const formatEntry = (entry: JobPlaytime) => {
					const hours = Math.floor((entry.minutes / 60) * 10) / 10;
					const hoursString = hours.toString().replace('.', ',');

					return `${entry.ckey}: ${hoursString} saat`;
				};

				await interaction.reply(
					`**${job}**\n` + top!.map(formatEntry).join('\n')
				);

				break;
			}
			case 'player': {
				const ckey = interaction.options.getString('ckey', true);

				const { statusCode, body: player } = await get<PlayerPlaytime[]>(
					`player/roletime/?ckey=${ckey}`
				);

				if (statusCode === 200) {
					await handlePlaytimePlayerReply(ckey, player, interaction);
				} else if (statusCode === 404) {
					await interaction.reply('Oyuncu bulunamadı.');
				}

				break;
			}
		}
	}
	public async autocomplete(interaction: AutocompleteInteraction) {
		const focusedValue = interaction.options.getFocused(true);

		if (focusedValue.name === 'job') {
			const { body: jobs } = await get<string[]>(
				`autocomplete/job?job=${focusedValue.value}`
			);

			if (jobs!.length === 0) {
				await interaction.respond([]);
				return;
			}

			await interaction.respond(
				jobs!.map((job) => ({ name: job, value: job }))
			);
		}
	}
}

export class ViewPlaytimeCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('view-playtime')
		.setDescription('Hangi mesleğe ne kadar süre harcadığını gösterir.');
	public async execute(interaction: ChatInputCommandInteraction) {
		const { statusCode, body: ckey } = await get<string>(
			`player/discord/?discord_id=${interaction.user.id}`
		);

		if (statusCode === 200) {
			const { statusCode, body: player } = await get<PlayerPlaytime[]>(
				`player/roletime/?ckey=${ckey}`
			);

			if (statusCode === 200) {
				await handlePlaytimePlayerReply(ckey, player, interaction);
			} else if (statusCode === 404) {
				// unreachable
				await interaction.reply('Oyuncu bulunamadı.');
			}
		} else if (statusCode === 409) {
			await interaction.reply('Discord hesabın bağlı değil.');
			await interaction.followUp({
				content:
					"Hesabını bağlamak için oyun içerisinden `OOC` sekmesindeki `Verify Discord Account`'u kullan.",
				ephemeral: true,
			});
		}
	}
}

async function handlePlaytimePlayerReply(
	ckey: string,
	player: PlayerPlaytime[],
	interaction: ChatInputCommandInteraction
) {
	if (player.length === 0) {
		await interaction.reply('Oyuncu daha önce hiçbir meslek oynamamış.');
		return;
	}

	const maxPage = Math.ceil(player.length / 15);

	const next = new ButtonBuilder()
		.setCustomId('playtimeNext')
		.setLabel(`Sonraki (1/${maxPage})`)
		.setStyle(ButtonStyle.Secondary);

	const previous = new ButtonBuilder()
		.setCustomId('playtimePrevious')
		.setLabel('Önceki')
		.setStyle(ButtonStyle.Secondary);

	const row = new ActionRowBuilder<MessageActionRow>().addComponents(
		previous,
		next
	);

	let page = 1;
	let content = '';

	const formatEntry = (entry: PlayerPlaytime) => {
		const hours = Math.floor((entry.minutes / 60) * 10) / 10;
		const hoursString = hours.toString().replace('.', ',');

		return `${entry.job}: ${hoursString} saat`;
	};

	const updateReply = () => {
		content = `**${ckey}**\n`;
		content += player
			.slice((page - 1) * 15, page * 15)
			.map(formatEntry)
			.join('\n');
		next.setLabel(`Sonraki (${page}/${maxPage})`);
		next.setDisabled(page === maxPage);
		previous.setDisabled(page === 1);
	};

	updateReply();

	let response = await interaction.reply({
		content,
		fetchReply: true,
		components: [row],
	});

	for (;;) {
		try {
			const pagination = await response.awaitMessageComponent({
				filter: (i) => i.user.id === interaction.user.id,
				time: 60_000,
			});

			if (pagination.customId === 'playtimeNext') {
				if (page < maxPage) {
					page += 1;
				}
			} else {
				if (page > 1) {
					page -= 1;
				}
			}

			updateReply();

			response = await pagination.update({
				content,
				fetchReply: true,
				components: [row],
			});
		} catch {
			next.setDisabled(true);
			previous.setDisabled(true);

			await interaction.editReply({
				content,
				components: [row],
			});

			break;
		}
	}
}
