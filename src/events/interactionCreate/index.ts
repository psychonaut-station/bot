import {
	ApplicationCommandType,
	type AutocompleteInteraction,
	type ButtonInteraction,
	type ChatInputCommandInteraction,
	ComponentType,
	Events,
	type Interaction,
	InteractionType,
	type ModalSubmitInteraction,
} from 'discord.js';

import logger from '@/logger';
import type { Event } from '@/types';

import autocomplete from './autocomplete';
import button from './button';
import chatInput from './chatInput';
import modal from './modal';

export class InteractionCreateEvent implements Event {
	public name = Events.InteractionCreate;
	public async execute(interaction: Interaction) {
		let feedback = '';
		try {
			switch (interaction.type) {
				case InteractionType.ApplicationCommand:
					switch (interaction.commandType) {
						case ApplicationCommandType.ChatInput: {
							const chatInputInteraction =
								interaction as ChatInputCommandInteraction;
							feedback = `${chatInputInteraction.commandName} command`;
							await chatInput(interaction);
							break;
						}
					}
					break;
				case InteractionType.ApplicationCommandAutocomplete: {
					const autocompleteInteraction =
						interaction as AutocompleteInteraction;
					feedback = `${autocompleteInteraction.commandName} autocomplete`;
					await autocomplete(autocompleteInteraction);
					break;
				}
				case InteractionType.MessageComponent:
					switch (interaction.componentType) {
						case ComponentType.Button: {
							const buttonInteraction = interaction as ButtonInteraction;
							feedback = `${buttonInteraction.customId} button`;
							await button(buttonInteraction);
							break;
						}
					}
					break;
				case InteractionType.ModalSubmit: {
					const modalInteraction = interaction as ModalSubmitInteraction;
					feedback = `${modalInteraction.customId} modal`;
					await modal(modalInteraction);
					break;
				}
			}
		} catch (error) {
			logger.error(
				`There was an error while handling interaction: \`${feedback}\`, error: ${error}`
			);
		}
	}
}
