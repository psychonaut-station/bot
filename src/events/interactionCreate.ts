import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	Events,
} from 'discord.js';

import logger from '@/logger';
import type { Command, Event } from '@/types';
import { get } from '@/utils';

export class InteractionCreateEvent implements Event {
	public name = Events.InteractionCreate;
	public async execute(interaction: CommandInteraction) {
		try {
			if (interaction.isChatInputCommand()) {
				await handleChatInputCommand(interaction);
			} else if (interaction.isAutocomplete()) {
				await handleAutocomplete(interaction);
			}
		} catch (error) {
			logger.error(`There was an error while handling InteractionCreateEvent event.`, error);
		}
	}
}

async function handleChatInputCommand(
	interaction: ChatInputCommandInteraction
) {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		logger.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		logger.error(`There was an error while executing ${interaction.commandName} command.`, error);
		try {
			if (interaction.deferred) {
				await interaction.editReply(
					'There was an error while executing this command!'
				);
			} else if (interaction.replied) {
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			} else {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			}
		} catch {}
	}
}

const genericAutocomplete: Record<
	string,
	NonNullable<Command['autocomplete']>
> = { ckey };

async function handleAutocomplete(interaction: AutocompleteInteraction) {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		logger.error(
			`No autocomplete matching ${interaction.commandName} was found.`
		);
		return;
	}

	try {
		const focusedValue = interaction.options.getFocused(true);

		if (focusedValue.name in genericAutocomplete) {
			const autocomplete = genericAutocomplete[focusedValue.name];
			await autocomplete(interaction);
			return;
		}

		await command.autocomplete!(interaction);
	} catch (error) {
		logger.error(`There was an error while responding to ${interaction.commandName} autocomplete.`, error);
		try {
			interaction.respond([]);
		} catch {}
	}
}

async function ckey(interaction: AutocompleteInteraction) {
	const focusedValue = interaction.options.getFocused(true);

	const { body } = await get<string[]>(
		`autocomplete/ckey?ckey=${focusedValue.value}`
	);

	interaction.respond(
		body!.map((ckey) => ({
			name: ckey,
			value: ckey,
		}))
	);
}
