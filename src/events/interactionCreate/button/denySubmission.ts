import {
	type ButtonInteraction,
	MessageFlags,
	PermissionFlagsBits,
	type PermissionsBitField,
	type User,
} from 'discord.js';

import logger from '@/logger';
import type { PermanentButtonInteraction } from '@/types';

export const customId = 'submissionDenyButton';

export class DenySubmissionButton implements PermanentButtonInteraction {
	public customId = customId;
	public async execute(interaction: ButtonInteraction) {
		if (!interaction.inGuild() || !interaction.channel?.isThread()) return;

		const permissions = interaction.member.permissions as PermissionsBitField;

		if (!permissions.has(PermissionFlagsBits.ManageRoles)) {
			await interaction.reply({
				content: 'Başvuruyu yetkililerin reddetmesi gerekiyor.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const messageContent = interaction.message.content;
		const firstLine = messageContent.slice(0, messageContent.indexOf('\n') + 1);

		const [submitterId, ckey] =
			firstLine.match(/((?<=<@)[0-9]+(?=>)+|(?<=\()[A-z0-9?]+(?=\)))/g) ?? []; // remove ? later

		if (!submitterId || !ckey) return;

		let submitter: User | null = null;

		try {
			submitter = await interaction.client.users.fetch(submitterId);
		} catch {}

		await interaction.reply('Başvuru reddedildi.');

		try {
			await interaction.channel.setLocked(true);
			await interaction.channel.setArchived(true);
		} catch {
			await interaction.followUp('Alt başlık arşivlenemedi.');
		}

		logger.info(
			`Denied submission of [${submitter?.tag ?? 'unknown-user'}](${submitterId}) by [${interaction.user.tag}](${interaction.user.id})`
		);

		logger.channel(
			interaction.client,
			'submission',
			`<@${submitterId}> hesabının başvurusu ${interaction.user} tarafından reddedildi: ${interaction.channel}`,
			`${submitter?.displayName ?? 'unknown-user'} ${submitter?.username ?? 'unknown-user'} ${submitterId} ${ckey} ${interaction.user.displayName} ${interaction.user.username} ${interaction.user.id}`
		);
	}
}
