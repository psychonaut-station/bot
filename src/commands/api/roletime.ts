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

				const { status, response: top } = await get<Entry[]>(
					`player/roletime/top/?job=${job}`
				);

				if (status === 1) {
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
				} else {
					await interaction.editReply('Meslek bilgileri alınamadı.');
				}

				break;
			}
			case 'player': {
				await interaction.deferReply();

				const ckey = interaction.options.getString('ckey', true);

				type Entry = { job: string; minutes: number };

				const { status, response: player } = await get<Entry[]>(
					`player/roletime?ckey=${ckey}`
				);

				if (status === 1) {
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

					const next = new ButtonBuilder()
						.setCustomId('roletimePlayerNext')
						.setLabel('Sonraki')
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
						next.setDisabled(player.length <= page * 15);
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
								if (player.length > page * 15) {
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
				} else {
					await interaction.editReply('Oyuncu bilgileri alınamadı.');
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
				const { status, response } = await get<string[]>('autocomplete/job');

				if (status === 1) {
					jobs = response;
					this.jobs = jobs;
					setTimeout(() => delete this.jobs, 1000 * 60 * 30);
				} else {
					await interaction.respond([]);
					return;
				}
			}

			const filteredJobs = jobs
				.filter((job) =>
					job.toLowerCase().startsWith(focusedValue.value.toLowerCase())
				)
				.slice(0, 25);

			await interaction.respond(
				filteredJobs.map((job) => ({ name: job, value: job }))
			);
		} else if (focusedValue.name === 'ckey') {
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
