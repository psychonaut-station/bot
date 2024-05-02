import {
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '../../types';
import { post } from '../../utils';

export class VerifyCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('verify')
		.setDescription('Discord hesabın ile BYOND hesabını bağlar.')
		.addStringOption((option) =>
			option
				.setName('token')
				.setDescription('Oyun içerisinden alınan tek kullanımlık token.')
				.setRequired(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		const user = interaction.user;
		const token = interaction.options.getString('token', true);

		const { status, response: ckey } = await post<string>('verify', {
			discord_id: user.id,
			one_time_token: token,
		});

		if (status === 1) {
			interaction.client.logger.info(
				`Verified user [${user.tag}](${user.id}) with ckey \`${ckey}\``
			);

			interaction.reply({
				content: `Discord hesabın \`${ckey}\` adlı BYOND hesabına bağlandı.`,
				ephemeral: true,
			});
		} else if (status === 4) {
			interaction.reply({ content: 'Token geçersiz.', ephemeral: true });
		} else if (status === 6) {
			const conflict = ckey as any as string;

			if (conflict.startsWith('@')) {
				interaction.reply({
					content: `Bu token <${conflict}> adlı Discord hesabına bağlı.`,
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

				const { status, response } = await post<string>('unverify', {
					discord_id: user.id,
				});

				if (status === 1) {
					interaction.client.logger.info(
						`Unverified user [${user.tag}](${user.id}) with ckey \`${response}\` by [${interaction.user.tag}](${interaction.user.id})`
					);

					interaction.reply(
						`<@${user.id}> adlı Discord hesabı ile \`${response}\` adlı BYOND hesabının bağlantısı kaldırıldı.`
					);
				} else if (status === 6) {
					interaction.reply('Hesap zaten bağlı değil.');
				}

				break;
			}
			case 'ckey': {
				const ckey = interaction.options.getString('ckey', true);

				const { status, response } = await post<string>('unverify', {
					ckey,
				});

				if (status === 1) {
					const userId = response.slice(1);
					const user = await interaction.client.users.fetch(userId);

					interaction.client.logger.info(
						`Unverified user [${user.tag}](${userId}) with ckey \`${ckey}\` by [${interaction.user.tag}](${interaction.user.id})`
					);

					interaction.reply(
						`\`${ckey}\` adlı BYOND hesabı ile <${response}> adlı Discord hesabının bağlantısı kaldırıldı.`
					);
				} else if (status === 4) {
					interaction.reply('Hesap bulunamadı.');
				} else if (status === 6) {
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

		const { status, response } = await post<string>('verify', {
			discord_id: user.id,
			ckey: ckey,
		});

		if (status === 1) {
			interaction.client.logger.info(
				`Force-verified user [${user.tag}](${user.id}) with ckey \`${ckey}\` by [${interaction.user.tag}](${interaction.user.id})`
			);

			interaction.reply(
				`<@${user.id}> adlı Discord hesabı \`${ckey}\` adlı BYOND hesabına bağlandı.`
			);
		} else if (status === 4) {
			interaction.reply('Oyuncu bulunamadı.');
		} else if (status === 6) {
			const conflict = response as any as string;

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
