import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { get } from '../../utils/api';
import { parseDate, timestamp } from '../../utils/date';

type Player = {
	ckey: string;
	byond_key: string | null;
	first_seen: string;
	last_seen: string;
	first_seen_round: number | null;
	last_seen_round: number | null;
	ip: string;
	cid: string;
	byond_age: string | null;
};

type Ban = {
	id: number;
	bantime: string;
	round_id: number | null;
	role: string | null;
	expiration_time: string | null;
	reason: string;
	ckey: string | null;
	a_ckey: string;
	edits: string | null;
	unbanned_datetime: string | null;
	unbanned_ckey: string | null;
};

export class PlayerCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('player')
		.setDescription('Oyuncu hakkında bilgileri gösterir.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('info')
				.setDescription('Oyuncu hakkında bilgileri gösterir.')
				.addStringOption((option) =>
					option
						.setName('ckey')
						.setDescription("Oyuncunun ckey'i")
						.setRequired(true)
				)
				.addBooleanOption((option) =>
					option
						.setName('public')
						.setDescription('Mesajı size özel yerine herkese açık yapar.')
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('ban')
				.setDescription('Oyuncunun aktif banlarını gösterir.')
				.addStringOption((option) =>
					option
						.setName('ckey')
						.setDescription("Oyuncunun ckey'i")
						.setRequired(true)
				)
				.addBooleanOption((option) =>
					option
						.setName('public')
						.setDescription('Mesajı size özel yerine herkese açık yapar.')
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('top')
				.setDescription(
					'Bir meslekte en fazla süreye sahip olan 15 oyuncuyu gösterir.'
				)
				.addStringOption((option) =>
					option
						.setName('job')
						.setDescription('Mesleğin adı')
						.setRequired(true)
						.setAutocomplete(true)
				)
		);
	public jobs?: string[];
	public async execute(interaction: ChatInputCommandInteraction) {
		switch (interaction.options.getSubcommand()) {
			case 'info': {
				const ephemeral = !interaction.options.getBoolean('public');
				await interaction.deferReply({ ephemeral });

				const ckey = interaction.options.getString('ckey');

				try {
					const { status, response } = await get<Player>(
						`player/?ckey=${ckey}`
					);

					if (status === 1) {
						const firstSeen = parseDate(response.first_seen);
						const lastSeen = parseDate(response.last_seen);
						const byondAge = response.byond_age
							? parseDate(response.byond_age)
							: null;

						await interaction.editReply(
							`Ckey: ${response.ckey}\nByond Adı: ${response.byond_key}\nİlk Görülen: ${timestamp(firstSeen, 'R')}\nSon Görülen: ${timestamp(lastSeen, 'R')}\nİlk Görülen Round: ${response.first_seen_round}\nSon Görülen Round: ${response.last_seen_round}\nIP: gösterilmiyor\nCID: gösterilmiyor\nByond'a Katılma Tarihi: ${byondAge ? timestamp(byondAge, 'R') : 'bilinmiyor'}`
						);
					} else {
						await interaction.editReply('Oyuncu bilgileri alınamadı.');
					}
				} catch (error) {
					await interaction.editReply('Oyuncu bilgileri alınamadı.');
				}

				break;
			}
			case 'ban': {
				const ephemeral = !interaction.options.getBoolean('public');
				await interaction.deferReply({ ephemeral });

				const ckey = interaction.options.getString('ckey');

				const { status, response: bans } = await get<Ban[]>(
					`player/ban/?ckey=${ckey}`
				);

				if (status === 1) {
					if (bans.length === 0) {
						await interaction.editReply(
							'Oyuncunun ban geçmişi bulunmamaktadır.'
						);
						return;
					}

					const activeBans = bans.filter(
						(ban) =>
							ban.unbanned_datetime === null &&
							(ban.expiration_time
								? parseDate(ban.expiration_time) > new Date()
								: true)
					);

					if (activeBans.length === 0) {
						await interaction.editReply(
							'Oyuncunun aktif bir banı bulunmamaktadır.'
						);
						return;
					}

					const simplified = simplifyBans(activeBans);

					const formatBan = (ban: SimplifiedBan) =>
						`Ckey: ${ban.ckey}\nBan Tarihi: ${timestamp(ban.bantime, 'R')}\nRound ID: ${ban.round_id ?? 'yok'}\nRoller: ${ban.roles.join(', ') || 'yok'}\nBitiş Tarihi: ${ban.expiration_time ? timestamp(ban.expiration_time, 'R') : 'kalıcı'}\nSebep: ${ban.reason}\nAdmin Ckey: ${ban.admin_ckey}\nDüzenlemeler: ${ban.edits ?? 'yok'}`;

					await interaction.editReply(formatBan(simplified.shift()!));

					for (const ban of simplified) {
						await interaction.followUp({
							ephemeral: true,
							content: formatBan(ban),
						});
					}
				} else {
					await interaction.editReply('Oyuncunun ban bilgileri alınamadı.');
				}

				break;
			}
			case 'top': {
				await interaction.deferReply();
				const job = interaction.options.getString('job');

				type Entry = { ckey: string; minutes: number };

				const { status, response: top } = await get<Entry[]>(
					`player/top/?job=${job}`
				);

				if (status === 1) {
					const formatEntry = (entry: Entry) => {
						const hours = Math.floor(entry.minutes / 60);

						if (hours === 0) {
							return `${entry.ckey}: ${entry.minutes} dakika`;
						}

						return `${entry.ckey}: ${hours} saat`;
					};

					await interaction.editReply(
						top.map(formatEntry).join('\n') || 'Meslek bilgileri alınamadı.'
					);
				} else {
					await interaction.editReply('Meslek bilgileri alınamadı.');
				}

				break;
			}
		}
	}
	public async autocomplete(interaction: AutocompleteInteraction) {
		const focusedValue = interaction.options.getFocused(true);

		if (focusedValue.name === 'job') {
			let jobs: string[];

			if (this.jobs) {
				jobs = this.jobs;
			} else {
				const { status, response } = await get<string[]>('player/top');

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
		}
	}
}

type SimplifiedBan = {
	ckey: string | null;
	bantime: Date;
	round_id: number | null;
	roles: string[];
	expiration_time: Date | null;
	reason: string;
	admin_ckey: string;
	edits: string | null;
};

function simplifyBans(bans: Ban[]): SimplifiedBan[] {
	const simplifiedBans = new Map<string, SimplifiedBan>();

	for (const ban of bans) {
		if (simplifiedBans.has(ban.bantime)) {
			const simpleBan = simplifiedBans.get(ban.bantime)!;

			if (ban.role && !simpleBan.roles.includes(ban.role)) {
				simpleBan.roles.push(ban.role);
			}
		} else {
			const roles = [];

			if (ban.role) {
				roles.push(ban.role);
			}

			simplifiedBans.set(ban.bantime, {
				ckey: ban.ckey,
				bantime: parseDate(ban.bantime),
				round_id: ban.round_id,
				roles,
				expiration_time: ban.expiration_time
					? parseDate(ban.expiration_time)
					: null,
				reason: ban.reason,
				admin_ckey: ban.a_ckey,
				edits: ban.edits,
			});
		}
	}

	return Array.from(simplifiedBans.values());
}
