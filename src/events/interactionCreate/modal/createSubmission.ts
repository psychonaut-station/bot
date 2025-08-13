import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	type MessageActionRowComponentBuilder as MessageActionRow,
	MessageFlags,
	type ModalSubmitInteraction,
	TextChannel,
	ThreadAutoArchiveDuration,
} from 'discord.js';

import { submission } from '@/configuration';
import { customId as approveButtonId } from '@/events/interactionCreate/button/approveSubmission';
import { customId as denyButtonId } from '@/events/interactionCreate/button/denySubmission';
import logger from '@/logger';
import type { ModalInteraction } from '@/types';
import { get } from '@/utils';

export const customId = 'createSubmissionModal';

export class CreateSubmissionModal implements ModalInteraction {
	public customId = customId;
	public async execute(interaction: ModalSubmitInteraction) {
		if (!(interaction.channel instanceof TextChannel)) return;

		const answers = submission.questions.map((_, i) =>
			interaction.fields.getTextInputValue(`${customId}F${i}`)
		);

		const ckey = await findCkey(answers[0]);

		if (!ckey) {
			await interaction.reply({
				content: 'BYOND hesabın bulunamadı. Lütfen doğru girdiğinden emin ol.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const thread = await interaction.channel.threads.create({
			name: `${interaction.user.username} #${interaction.user.id}`,
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
			type: ChannelType.PrivateThread,
			invitable: false,
		});

		const row = new ActionRowBuilder<MessageActionRow>().addComponents(
			new ButtonBuilder()
				.setCustomId(approveButtonId)
				.setLabel('Onayla')
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(denyButtonId)
				.setLabel('Reddet')
				.setStyle(ButtonStyle.Danger)
		);

		await thread.send({
			content: `**Başvuru:** ${interaction.user} (${ckey})\n\n${answers.map((a, i) => `${i + 1}) ${submission.questions[i]}\n${a}`).join('\n\n')}\nㅤ`,
			components: [row],
			allowedMentions: { parse: [] },
		});

		await thread.members.add(interaction.user);
		await thread.leave();

		await interaction.reply({
			content: `Başvurun için alt başlık oluşturuldu: ${thread}`,
			flags: MessageFlags.Ephemeral,
		});

		logger.info(
			`Created submission for [${interaction.user.tag}](${interaction.user.id})`
		);

		logger.channel(
			interaction.client,
			'submission',
			`${interaction.user} başvuru oluşturdu: ${thread}`,
			`${interaction.user.displayName} ${interaction.user.username} ${interaction.user.id} ${ckey}`
		);
	}
}

async function findCkey(answer: string): Promise<string | null> {
	if (answer.length === 0) return null;

	const matches = answer.match(/[A-z0-9]+/g);

	if (matches && matches.length !== 0) {
		for (const match of matches.slice(0, 5)) {
			if (match.length < 3 || match.length > 32) continue;

			const ckey = match.toLowerCase();

			const { body } = await get<{ member: boolean }>(
				`byond/member?ckey=${ckey}`
			);

			if (body && body.member) {
				return ckey;
			}
		}
	}

	return null;
}
