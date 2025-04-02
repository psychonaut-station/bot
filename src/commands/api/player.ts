import {
	type ChatInputCommandInteraction,
	MessageFlags,
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
	roles: string | null;
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
				.addBooleanOption((option) =>
					option
						.setName('permanent')
						.setDescription('Sadece kalıcı banları gösterir.')
				)
				.addStringOption((option) =>
					option
						.setName('since')
						.setDescription(
							'Belirli bir tarihten sonra olan banları gösterir. YYYY-MM-DD formatında olmalıdır.'
						)
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

					await interaction.reply({
						content: `Ckey: ${player.ckey}\nKullanıcı Adı: ${player.byond_key}\nİlk Görülen: ${firstSeen}\nSon Görülen: ${lastSeen}\nİlk Görülen Round: ${player.first_seen_round}\nSon Görülen Round: ${player.last_seen_round}\nBYOND'a Katıldığı Tarih: ${byondAge}`,
						flags: ephemeral ? MessageFlags.Ephemeral : undefined,
					});
				} else if (statusCode === 404) {
					await interaction.reply({
						content: 'Oyuncu bulunamadı.',
						flags: ephemeral ? MessageFlags.Ephemeral : undefined,
					});
				}

				break;
			}
			case 'ban': {
				const ckey = interaction.options.getString('ckey', true);
				const permanent = interaction.options.getBoolean('permanent');
				const since = interaction.options.getString('since');
				const ephemeral =
					interaction.options.getString('ephemeral') !== 'false';

				if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
					await interaction.reply({
						content: 'Tarih formatı YYYY-MM-DD şeklinde olmalıdır.',
						flags: ephemeral ? MessageFlags.Ephemeral : undefined,
					});
					return;
				}

				const { statusCode, body: bans } = await get<Ban[]>(
					`player/ban/?ckey=${ckey}${permanent ? '&permanent=true' : ''}${since ? `&since=${since}%2023:59:59` : ''}`
				);

				if (statusCode === 200) {
					if (bans.length === 0) {
						await interaction.reply({
							content: `Oyuncunun${since ? ` ${timestamp(parseDate(since), 'D')} tarihinden itibaren` : ''}${permanent ? ' kalıcı' : ''} ban geçmişi bulunmamaktadır.`,
							flags: ephemeral ? MessageFlags.Ephemeral : undefined,
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
						await interaction.reply({
							content: `Oyuncunun${since ? ` ${timestamp(parseDate(since), 'D')} tarihinden itibaren` : ''} aktif${permanent ? ' kalıcı' : ''} banı bulunmamaktadır.`,
							flags: ephemeral ? MessageFlags.Ephemeral : undefined,
						});
						return;
					}

					const formatBan = (ban: Ban) => {
						const bantime = timestamp(parseDate(ban.bantime), 'R');
						const roundId = ban.round_id ?? 'yok';
						const roles = ban.roles || 'yok';
						const expirationTime = ban.expiration_time
							? timestamp(parseDate(ban.expiration_time), 'R')
							: 'kalıcı';
						const edits = ban.edits ?? 'yok';

						return `Ckey: ${ban.ckey}\nBan Tarihi: ${bantime}\nRound ID: ${roundId}\nRoller: ${roles}\nBitiş Tarihi: ${expirationTime}\nSebep: ${ban.reason}\nAdmin Ckey: ${ban.a_ckey}\nDüzenlemeler: ${edits}`;
					};

					await interaction.reply({
						content: formatBan(activeBans.shift()!),
						flags: ephemeral ? MessageFlags.Ephemeral : undefined,
					});

					for (const ban of activeBans) {
						await interaction.followUp({
							content: formatBan(ban),
							flags: ephemeral ? MessageFlags.Ephemeral : undefined,
						});
					}
				} else if (statusCode === 404) {
					await interaction.reply({
						content: 'Oyuncu bulunamadı.',
						flags: ephemeral ? MessageFlags.Ephemeral : undefined,
					});
				}

				break;
			}
		}
	}
}
