import {
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import { verifyRegex } from '@/constants';
import type { Command } from '@/types';
import { post } from '@/utils';

export class VerifyCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('verify')
		.setDescription('Discord hesabın ile BYOND hesabını bağlar.')
		.addStringOption((option) =>
			option
				.setName('code')
				.setDescription('Oyun içerisinden alınan tek kullanımlık kod.')
				.setRequired(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		const user = interaction.user;
		const code = interaction.options.getString('code', true);

		const { statusCode, body: ckey } = await post<string>('verify', {
			discord_id: user.id,
			one_time_token: code,
		});

		if (statusCode === 200) {
			interaction.client.logger.info(
				`Verified user [${user.tag}](${user.id}) with ckey \`${ckey}\``
			);

			interaction.reply({
				content: `Discord hesabın \`${ckey}\` adlı BYOND hesabına bağlandı.`,
				ephemeral: true,
			});
		} else if (statusCode === 404) {
			if (!verifyRegex.test(code)) {
				interaction.reply({
					content:
						'Kod şekille uyuşmuyor, lütfen kodu şekle uygun girin.\nÖrneğin: `/verify 123-456`',
					ephemeral: true,
				});
				return;
			}

			interaction.reply({ content: 'Kod geçersiz.', ephemeral: true });
		} else if (statusCode === 409) {
			const conflict = ckey as any as string;

			if (conflict.startsWith('@')) {
				interaction.reply({
					content: `Bu kod <${conflict}> adlı Discord hesabına bağlı.`,
					ephemeral: true,
				});
			} else {
				interaction.reply({
					content: `Discord hesabın zaten \`${conflict}\` adlı BYOND hesabına bağlı.`,
					ephemeral: true,
				});
			}
		}
	}
}

export class UnverifyCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('unverify')
		.setDescription('Discord hesabı ile BYOND hesabının bağlantısını kaldırır.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('user')
				.setDescription(
					'Discord hesabı ile BYOND hesabının bağlantısını kaldırır.'
				)
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('Bağlantısı kaldırılacak Discord hesabı.')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('ckey')
				.setDescription(
					'BYOND hesabı ile Discord hesabının bağlantısını kaldırır.'
				)
				.addStringOption((option) =>
					option
						.setName('ckey')
						.setDescription('Bağlantısı kaldırılacak BYOND hesabının ckeyi.')
						.setRequired(true)
						.setAutocomplete(true)
				)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		switch (interaction.options.getSubcommand()) {
			case 'user': {
				const user = interaction.options.getUser('user', true);

				const { statusCode, body: ckey } = await post<string>('unverify', {
					discord_id: user.id,
				});

				if (statusCode === 200) {
					interaction.client.logger.info(
						`Unverified user [${user.tag}](${user.id}) with ckey \`${ckey}\` by [${interaction.user.tag}](${interaction.user.id})`
					);

					interaction.reply(
						`<@${user.id}> adlı Discord hesabı ile \`${ckey}\` adlı BYOND hesabının bağlantısı kaldırıldı.`
					);
				} else if (statusCode === 409) {
					interaction.reply('Hesap zaten bağlı değil.');
				}

				break;
			}
			case 'ckey': {
				const ckey = interaction.options.getString('ckey', true);

				const { statusCode, body: discordId } = await post<string>('unverify', {
					ckey,
				});

				if (statusCode === 200) {
					const userId = discordId.slice(1);
					const user = await interaction.client.users.fetch(userId);

					interaction.client.logger.info(
						`Unverified user [${user.tag}](${userId}) with ckey \`${ckey}\` by [${interaction.user.tag}](${interaction.user.id})`
					);

					interaction.reply(
						`\`${ckey}\` adlı BYOND hesabı ile <${discordId}> adlı Discord hesabının bağlantısı kaldırıldı.`
					);
				} else if (statusCode === 404) {
					interaction.reply('Hesap bulunamadı.');
				} else if (statusCode === 409) {
					interaction.reply('Hesap zaten bağlı değil.');
				}

				break;
			}
		}
	}
}

export class ForceVerifyCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('force-verify')
		.setDescription('Discord hesabı ile BYOND hesabını bağlar.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('Bağlanılacak Discord hesabı.')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('ckey')
				.setDescription('Bağlanılacak BYOND hesabının ckeyi.')
				.setRequired(true)
				.setAutocomplete(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		const user = interaction.options.getUser('user', true);
		const ckey = interaction.options.getString('ckey', true).toLowerCase();

		const { statusCode, body } = await post<string>('verify', {
			discord_id: user.id,
			ckey: ckey,
		});

		if (statusCode === 200) {
			interaction.client.logger.info(
				`Force-verified user [${user.tag}](${user.id}) with ckey \`${ckey}\` by [${interaction.user.tag}](${interaction.user.id})`
			);

			interaction.reply(
				`<@${user.id}> adlı Discord hesabı \`${ckey}\` adlı BYOND hesabına bağlandı.`
			);
		} else if (statusCode === 404) {
			interaction.reply('Oyuncu bulunamadı.');
		} else if (statusCode === 409) {
			const conflict = body as any as string;

			if (conflict.startsWith('@')) {
				interaction.reply(
					`Bu ckey zaten <${conflict}> adlı Discord hesabına bağlı!`
				);
			} else {
				interaction.reply(
					`Bu Discord hesabı zaten \`${conflict}\` adlı BYOND hesabına bağlı!`
				);
			}
		}
	}
}
