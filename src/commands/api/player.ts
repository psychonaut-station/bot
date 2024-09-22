import {
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '@/types';
import { get, parseDate, timestamp } from '@/utils';

interface Player {
	ckey: string;
	byond_key: string | null;
	first_seen: string;
	last_seen: string;
	first_seen_round: number | null;
	last_seen_round: number | null;
	ip: string;
	cid: string;
	byond_age: string | null;
}

interface Ban {
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
}

export class PlayerCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('player')
		.setDescription('Oyuncu hakkında bilgileri gösterir.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('info')
				.setDescription('Oyuncu hakkında bilgileri gösterir.')
				.addStringOption((option) =>
					option
						.setName('ckey')
						.setDescription('Oyuncunun ckeyi.')
						.setRequired(true)
						.setAutocomplete(true)
				)
				.addStringOption((option) =>
					option
						.setName('ephemeral')
						.setDescription('Varsayılan olarak yanıtı sadece size gösterir.')
						.setChoices(
							{ name: 'Evet', value: 'true' },
							{ name: 'Hayır', value: 'false' }
						)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('ban')
				.setDescription('Oyuncunun aktif banlarını gösterir.')
				.addStringOption((option) =>
					option
						.setName('ckey')
						.setDescription('Oyuncunun ckeyi.')
						.setRequired(true)
						.setAutocomplete(true)
				)
				.addStringOption((option) =>
					option
						.setName('ephemeral')
						.setDescription('Varsayılan olarak yanıtı sadece size gösterir.')
						.setChoices(
							{ name: 'Evet', value: 'true' },
							{ name: 'Hayır', value: 'false' }
						)
				)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		switch (interaction.options.getSubcommand()) {
			case 'info': {
				const ckey = interaction.options.getString('ckey', true);
				const ephemeral =
					interaction.options.getString('ephemeral') !== 'false';

				const { statusCode, body: player } = await get<Player>(
					`player/?ckey=${ckey}`
				);

				if (statusCode === 200) {
					const firstSeen = timestamp(parseDate(player.first_seen), 'R');
					const lastSeen = timestamp(parseDate(player.last_seen), 'R');
					const byondAge = player.byond_age
						? timestamp(parseDate(player.byond_age), 'R')
						: 'bilinmiyor';

					interaction.reply({
						content: `Ckey: ${player.ckey}\nKullanıcı Adı: ${player.byond_key}\nİlk Görülen: ${firstSeen}\nSon Görülen: ${lastSeen}\nİlk Görülen Round: ${player.first_seen_round}\nSon Görülen Round: ${player.last_seen_round}\nBYOND'a Katıldığı Tarih: ${byondAge}`,
						ephemeral,
					});
				} else if (statusCode === 404) {
					interaction.reply({
						content: 'Oyuncu bulunamadı.',
						ephemeral,
					});
				}

				break;
			}
			case 'ban': {
				const ckey = interaction.options.getString('ckey', true);
				const ephemeral =
					interaction.options.getString('ephemeral') !== 'false';

				const { statusCode, body: bans } = await get<Ban[]>(
					`player/ban/?ckey=${ckey}`
				);

				if (statusCode === 200) {
					if (bans.length === 0) {
						interaction.reply({
							content: 'Oyuncunun ban geçmişi bulunmamaktadır.',
							ephemeral,
						});
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
						interaction.reply({
							content: 'Oyuncunun aktif banı bulunmamaktadır.',
							ephemeral,
						});
						return;
					}

					const sortedBans = sortBans(activeBans);

					const formatBan = (ban: SortedBan) => {
						const bantime = timestamp(ban.bantime, 'R');
						const roundId = ban.round_id ?? 'yok';
						const roles = ban.roles.join(', ') || 'yok';
						const expirationTime = ban.expiration_time
							? timestamp(ban.expiration_time, 'R')
							: 'kalıcı';
						const edits = ban.edits ?? 'yok';

						return `Ckey: ${ban.ckey}\nBan Tarihi: ${bantime}\nRound ID: ${roundId}\nRoller: ${roles}\nBitiş Tarihi: ${expirationTime}\nSebep: ${ban.reason}\nAdmin Ckey: ${ban.admin_ckey}\nDüzenlemeler: ${edits}`;
					};

					await interaction.reply({
						content: formatBan(sortedBans.shift()!),
						ephemeral,
					});

					for (const ban of sortedBans) {
						await interaction.followUp({
							content: formatBan(ban),
							ephemeral,
						});
					}
				} else if (statusCode === 404) {
					interaction.reply({
						content: 'Oyuncu bulunamadı.',
						ephemeral,
					});
				}

				break;
			}
		}
	}
}

interface SortedBan {
	ckey: string | null;
	bantime: Date;
	round_id: number | null;
	roles: string[];
	expiration_time: Date | null;
	reason: string;
	admin_ckey: string;
	edits: string | null;
}

function sortBans(bans: Ban[]) {
	const sortedBans = new Map<string, SortedBan>();

	for (const ban of bans) {
		if (sortedBans.has(ban.bantime)) {
			const sortedBan = sortedBans.get(ban.bantime)!;

			if (ban.role && !sortedBan.roles.includes(ban.role)) {
				sortedBan.roles.push(ban.role);
			}
		} else {
			const roles = [];

			if (ban.role) {
				roles.push(ban.role);
			}

			sortedBans.set(ban.bantime, {
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

	return Array.from(sortedBans.values());
}
