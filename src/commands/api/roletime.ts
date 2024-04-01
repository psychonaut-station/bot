import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	MessageActionRowComponentBuilder as MessageActionRow,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { get } from '../../utils/api';
import { AxiosError } from 'axios';

export class RoletimeCommand implements Command {
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
						.setDescription("Oyuncunun ckey'i")
						.setRequired(true)
						.setAutocomplete(true)
				)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		switch (interaction.options.getSubcommand()) {
			case 'top': {
				await interaction.deferReply();

				const job = interaction.options.getString('job', true);

				type Entry = { ckey: string; minutes: number };

				const { response: top } = await get<Entry[]>(
					`player/roletime/top/?job=${job}`
				);

				if (top.length === 0) {
					await interaction.editReply('Meslek bilgileri alınamadı.');
					return;
				}

				const formatEntry = (entry: Entry) => {
					const hours = Math.floor(entry.minutes / 60);

					if (hours === 0) {
						return `${entry.ckey}: ${entry.minutes} dakika`;
					}

					return `${entry.ckey}: ${hours} saat`;
				};

				await interaction.editReply(top.map(formatEntry).join('\n'));

				break;
			}
			case 'player': {
				await interaction.deferReply();

				const ckey = interaction.options.getString('ckey', true);

				type Entry = { job: string; minutes: number };

				try {
					const { response: player } = await get<Entry[]>(
						`player/roletime?ckey=${ckey}`
					);

					if (player.length === 0) {
						await interaction.editReply('Oyuncu bilgileri alınamadı.');
						return;
					}

					const formatEntry = (entry: Entry) => {
						const hours = Math.floor(entry.minutes / 60);

						if (hours === 0) {
							return `${entry.job}: ${entry.minutes} dakika`;
						}

						return `${entry.job}: ${hours} saat`;
					};

					const maxPage = Math.ceil(player.length / 15);

					const next = new ButtonBuilder()
						.setCustomId('roletimePlayerNext')
						.setLabel(`Sonraki (1/${maxPage})`)
						.setStyle(ButtonStyle.Secondary);

					const previous = new ButtonBuilder()
						.setCustomId('roletimePlayerPrevious')
						.setLabel('Önceki')
						.setStyle(ButtonStyle.Secondary);

					const row = new ActionRowBuilder<MessageActionRow>().addComponents(
						previous,
						next
					);

					let page = 1;
					let content = '';

					const updateMessage = () => {
						content = player
							.slice((page - 1) * 15, page * 15)
							.map(formatEntry)
							.join('\n');
						next.setDisabled(page === maxPage);
						next.setLabel(`Sonraki (${page}/${maxPage})`);
						previous.setDisabled(page === 1);
					};

					updateMessage();

					let response = await interaction.editReply({
						content,
						components: [row],
					});

					for (;;) {
						try {
							const pagination = await response.awaitMessageComponent({
								filter: (i) => i.user.id === interaction.user.id,
								time: 60_000,
							});

							if (pagination.customId === 'roletimePlayerNext') {
								if (page < maxPage) {
									page += 1;
								}
							} else {
								if (page > 1) {
									page -= 1;
								}
							}

							updateMessage();

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
				} catch (error) {
					const axiosError = error as AxiosError;

					if (axiosError.response?.status === 404) {
						await interaction.editReply('Oyuncu bulunamadı.');
						return;
					}

					throw axiosError;
				}

				break;
			}
		}
	}
	public jobs?: string[];
	public async autocomplete(interaction: AutocompleteInteraction) {
		const focusedValue = interaction.options.getFocused(true);

		if (focusedValue.name === 'job') {
			let jobs: string[];

			if (this.jobs) {
				jobs = this.jobs;
			} else {
				try {
					const { response } = await get<string[]>('autocomplete/job');

					jobs = response;
					this.jobs = jobs;
					setTimeout(() => delete this.jobs, 1000 * 60 * 30);
				} catch {
					interaction.respond([]);
					return;
				}
			}

			const filteredJobs = jobs
				.filter((job) =>
					job.toLowerCase().startsWith(focusedValue.value.toLowerCase())
				)
				.slice(0, 25);

			interaction.respond(
				filteredJobs.map((job) => ({ name: job, value: job }))
			);
		}
	}
}
