import {
	ActionRowBuilder,
	type ButtonInteraction,
	MessageFlags,
	type ModalActionRowComponentBuilder as ModalActionRow,
	ModalBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';

import { submission } from '@/configuration';
import { customId as modalId } from '@/events/interactionCreate/modal/createSubmission';
import type { PermanentButtonInteraction } from '@/types';

export const customId = 'submissionCreateButton';

export class CreateSubmissionButton implements PermanentButtonInteraction {
	public customId = customId;
	public async execute(interaction: ButtonInteraction) {
		if (!(interaction.channel instanceof TextChannel)) return;

		const threadManager = await interaction.channel.threads.fetch();

		const thread = threadManager.threads.find(
			(thread) => thread.name.endsWith(interaction.user.id) && !thread.locked
		);

		if (thread) {
			if (thread.archived) {
				await thread.setArchived(false);
			}

			const members = await thread.members.fetch();

			if (!members.some((member) => member.id === interaction.user.id)) {
				await thread.members.add(interaction.user);

				await interaction.reply({
					content: `Mevcut alt başlığına geri eklendin: ${thread}`,
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			await interaction.reply({
				content: `Mevcut bir alt başlığına sahipsin: ${thread}`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const modal = new ModalBuilder()
			.setCustomId(modalId)
			.setTitle('Başvuru Formu');

		for (const question in submission.questions) {
			const input = new TextInputBuilder()
				.setCustomId(`${modalId}F${question}`)
				.setLabel(`Soru ${Number(question) + 1}`)
				.setPlaceholder(submission.questions[question])
				.setStyle(TextInputStyle.Short)
				.setRequired(true);

			if (submission.questions[question].length >= 60) {
				input.setStyle(TextInputStyle.Paragraph);
			}

			const row = new ActionRowBuilder<ModalActionRow>().addComponents(input);

			modal.addComponents(row);
		}

		await interaction.showModal(modal);
	}
}
