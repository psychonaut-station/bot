import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '..';
import axios from 'axios';
import { GenericResponse as Response } from '../../types';
import { endpoint } from '../../utils/endpoint';
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

export default {
	data: new SlashCommandBuilder()
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
		),
	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
			case 'info': {
				await interaction.deferReply({ ephemeral: true });
				const ckey = interaction.options.getString('ckey');

				try {
					const genericResponse = (
						await axios.get<Response<Player>>(
							endpoint(`player/?ckey=${ckey}`),
							{
								headers: { 'X-API-KEY': process.env.API_KEY },
							}
						)
					).data;

					if (genericResponse?.status === 1) {
						const response = genericResponse.response;

						const firstSeen = parseDate(response.first_seen);
						const lastSeen = parseDate(response.last_seen);
						const byondAge = response.byond_age
							? parseDate(response.byond_age)
							: null;

						await interaction.editReply(
							`Ckey: ${response.ckey}\nByond Key: ${response.byond_key}\nİlk Görülen: ${timestamp(firstSeen) + ' ' + timestamp(firstSeen, 'R')}\nSon Görülen: ${timestamp(lastSeen) + ' ' + timestamp(lastSeen, 'R')}\nİlk Görülen Round: ${response.first_seen_round}\nSon Görülen Round: ${response.last_seen_round}\nIP: ||${response.ip}||\nCID: ||${response.cid}||\nByond'a Katılma Tarihi: ${byondAge ? timestamp(byondAge, 'D') + ' ' + timestamp(byondAge, 'R') : 'Bilinmiyor'}`
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
				await interaction.deferReply({ ephemeral: true });
				const ckey = interaction.options.getString('ckey');

				const genericResponse = (
					await axios.get<Response<Ban[]>>(
						endpoint(`player/ban/?ckey=${ckey}`),
						{
							headers: { 'X-API-KEY': process.env.API_KEY },
						}
					)
				).data;

				if (genericResponse?.status === 1) {
					const bans = genericResponse.response;

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
						`Ckey: ${ban.ckey}\nBan Zamanı: ${timestamp(ban.bantime) + ' ' + timestamp(ban.bantime, 'R')}\nRound ID: ${ban.round_id ?? 'Yok'}\nRoller: ${ban.roles.join(', ') || 'Yok'}\nBiteceği Zaman: ${ban.expiration_time ? timestamp(ban.expiration_time) + ' ' + timestamp(ban.expiration_time, 'R') : 'Kalıcı'}\nSebep: ${ban.reason}\nAdmin Ckey: ${ban.admin_ckey}\nDeğiştirmeler: ${ban.edits ?? 'Yok'}`;

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

				const genericResponse = (
					await axios.get<Response<{ ckey: string; minutes: number }[]>>(
						endpoint(`player/top/?job=${job}`),
						{
							headers: { 'X-API-KEY': process.env.API_KEY },
						}
					)
				).data;

				if (genericResponse?.status === 1) {
					const top = genericResponse.response;

					const formatEntry = (top: { ckey: string; minutes: number }) =>
						`${top.ckey}: ${Math.floor(top.minutes / 60)} saat`;

					await interaction.editReply(
						top.map(formatEntry).join('\n') || 'Meslek bilgileri alınamadı.'
					);
				} else {
					await interaction.editReply('Meslek bilgileri alınamadı.');
				}

				break;
			}
		}
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);

		if (focusedValue.name === 'job') {
			const cache = interaction.client.autocompleteCache.get('job');

			let jobs: string[] = [];

			if (cache && cache.timestamp > Date.now() - 1000 * 60 * 30) {
				jobs = cache.values;
			} else {
				const genericResponse = (
					await axios.get<Response<string[]>>(endpoint('player/top'), {
						headers: { 'X-API-KEY': process.env.API_KEY },
					})
				).data;

				if (genericResponse?.status === 1) {
					jobs = genericResponse.response;
					interaction.client.autocompleteCache.set('job', {
						values: jobs,
						timestamp: Date.now(),
					});
				} else if (cache) {
					jobs = cache.values;
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
	},
} satisfies Command;

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
