import {
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
				.addStringOption((option) =>
					option
						.setName('ephemeral')
						.setDescription(
							'Mesajı sadece siz görebilirsiniz. Varsayılan: Evet'
						)
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
						.setDescription("Oyuncunun ckey'i")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('ephemeral')
						.setDescription(
							'Mesajı sadece siz görebilirsiniz. Varsayılan: Evet'
						)
						.setChoices(
							{ name: 'Evet', value: 'true' },
							{ name: 'Hayır', value: 'false' }
						)
				)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		switch (interaction.options.getSubcommand()) {
			case 'info': {
				const ephemeral =
					interaction.options.getString('ephemeral') !== 'false';
				await interaction.deferReply({ ephemeral });

				const ckey = interaction.options.getString('ckey');

				try {
					const { status, response: player } = await get<Player>(
						`player/?ckey=${ckey}`
					);

					if (status === 1) {
						const firstSeen = parseDate(player.first_seen);
						const lastSeen = parseDate(player.last_seen);
						const byondAge = player.byond_age
							? parseDate(player.byond_age)
							: null;

						await interaction.editReply(
							`Ckey: ${player.ckey}\nByond Adı: ${player.byond_key}\nİlk Görülen: ${timestamp(firstSeen, 'R')}\nSon Görülen: ${timestamp(lastSeen, 'R')}\nİlk Görülen Round: ${player.first_seen_round}\nSon Görülen Round: ${player.last_seen_round}\nByond'a Katıldığı Tarih: ${byondAge ? timestamp(byondAge, 'R') : 'bilinmiyor'}`
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
				const ephemeral =
					interaction.options.getString('ephemeral') !== 'false';
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
