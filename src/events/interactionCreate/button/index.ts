import type { ButtonInteraction } from 'discord.js';

import type { PermanentButtonInteraction } from '@/types';

import * as approveSubmission from './approveSubmission';
import * as createApplication from './createSubmission';
import * as denySubmission from './denySubmission';
import * as helpSubmission from './helpSubmission';

const buttonInteractions = new Map<string, PermanentButtonInteraction>();

for (const ButtonInteraction of Object.values({
	...approveSubmission,
	...createApplication,
	...denySubmission,
	...helpSubmission,
})) {
	if (typeof ButtonInteraction === 'function') {
		const buttonInteraction = new ButtonInteraction();
		buttonInteractions.set(buttonInteraction.customId, buttonInteraction);
	}
}

export default async function button(interaction: ButtonInteraction) {
	const buttonInteraction = buttonInteractions.get(interaction.customId);

	if (buttonInteraction) {
		try {
			await buttonInteraction.execute(interaction);
		} catch (error) {
			throw `Permanent button interaction failed: ${error}`;
		}
	}
}
