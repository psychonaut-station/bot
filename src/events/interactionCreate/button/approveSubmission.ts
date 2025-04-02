import {
	type ButtonInteraction,
	type GuildMember,
	PermissionFlagsBits,
	type PermissionsBitField,
} from 'discord.js';

import configuration from '@/configuration';
import logger from '@/logger';
import type { PermanentButtonInteraction } from '@/types';

export const customId = 'submissionApproveButton';

export class ApproveSubmissionButton implements PermanentButtonInteraction {
	public customId = customId;
	public async execute(interaction: ButtonInteraction) {
		if (!interaction.inGuild() || !interaction.channel?.isThread()) return;

		const permissions = interaction.member.permissions as PermissionsBitField;

		if (!permissions.has(PermissionFlagsBits.ManageRoles)) return;

		// const submitter = interaction.message.mentions.users.first(); // this just does not work

		const messageContent = interaction.message.content;

		const submitterId = messageContent.slice(
			messageContent.indexOf('<@') + 2,
			messageContent.indexOf('>')
		);

		let submitter: GuildMember;

		try {
			submitter = await interaction.guild!.members.fetch(submitterId);
		} catch {
			try {
				await interaction.client.users.fetch(submitterId);
			} catch {
				await interaction.reply({
					content: 'Başvuru sahibinin hesabı bulunamadı.',
					ephemeral: true,
				});
				return;
			}
			await interaction.reply({
				content: 'Başvuru sahibi sunucudan ayrılmış.',
				ephemeral: true,
			});
			return;
		}

		await interaction.reply('Başvuru onaylandı.');

		try {
			await submitter.roles.add(configuration.submission.role);
		} catch {
			await interaction.editReply('Başvuru sahibine rol verilemedi.');
			return;
		}

		try {
			await interaction.channel.setLocked(true);
			await interaction.channel.setArchived(true);
		} catch {
			await interaction.followUp('Alt başlık arşivlenemedi.');
		}

		logger.info(
			`Approved submission of [${submitter.user.tag}](${submitter.user.id}) by [${interaction.user.tag}](${interaction.user.id})`
		);

		logger.channel(
			interaction.client,
			'submission',
			`${submitter.user} hesabının başvurusu ${interaction.user} tarafından onaylandı: ${interaction.channel}`,
			`${submitter.user.displayName} ${submitter.user.username} ${submitter.user.id} ${interaction.user.displayName} ${interaction.user.username} ${interaction.user.id}`
		);
	}
}
