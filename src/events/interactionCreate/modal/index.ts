import type { ModalSubmitInteraction } from 'discord.js';

import type { ModalInteraction } from '@/types';

import * as createApplication from './createSubmission';

const modalInteractions = new Map<string, ModalInteraction>();

for (const ModalInteraction of Object.values(
	Object.assign({}, createApplication)
)) {
	if (typeof ModalInteraction === 'function') {
		const modalInteraction = new ModalInteraction();
		modalInteractions.set(modalInteraction.customId, modalInteraction);
	}
}

export default async function modal(interaction: ModalSubmitInteraction) {
	const modalInteraction = modalInteractions.get(interaction.customId);

	if (!modalInteraction) {
		throw `No command matching ${interaction.customId} modal was found.`;
	}

	try {
		await modalInteraction.execute(interaction);
	} catch (error) {
		throw `Modal submit interaction failed: ${error}`;
	}
}
