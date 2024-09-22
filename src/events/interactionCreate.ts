import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	Events,
} from 'discord.js';

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
			interaction.client.logger.error(error);
		}
	}
}

async function handleChatInputCommand(
	interaction: ChatInputCommandInteraction
) {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		interaction.client.logger.error(
			`No command matching ${interaction.commandName} was found.`
		);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		interaction.client.logger.error(error);
		try {
			if (interaction.replied || interaction.deferred) {
				interaction.followUp({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			} else {
				interaction.reply({
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
		interaction.client.logger.error(
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
		interaction.client.logger.error(error);
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
