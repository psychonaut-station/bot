import { type ButtonInteraction, MessageFlags, TextChannel } from 'discord.js';

import configuration from '@/configuration';
import type { PermanentButtonInteraction } from '@/types';

export const customId = 'submissionHelpButton';

export class HelpSubmissionButton implements PermanentButtonInteraction {
	public customId = customId;
	public async execute(interaction: ButtonInteraction) {
		if (!(interaction.channel instanceof TextChannel)) return;

		const threadManager = await interaction.channel.threads.fetch();

		const thread = threadManager.threads.find(
			(thread) => thread.id === configuration.submission.helpThread
		);

		if (thread) {
			const members = await thread.members.fetch();

			if (!members.some((member) => member.id === interaction.user.id)) {
				await thread.members.add(interaction.user);

				await interaction.reply({
					content: `Yardım alt başlığına eklendin: ${thread}`,
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			await interaction.reply({
				content: `Zaten yardım alt başlığında bulunuyorsun: ${thread}`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await interaction.reply({
			content: 'Bu seçenek şu anda kullanılamıyor.',
			flags: MessageFlags.Ephemeral,
		});
	}
}
