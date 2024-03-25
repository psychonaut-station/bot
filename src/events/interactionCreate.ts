import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	CommandInteraction,
	Events,
} from 'discord.js';
import { Event } from '../types';

export class InteractionCreateEvent implements Event {
	public name = Events.InteractionCreate;
	public async execute(interaction: CommandInteraction) {
		if (interaction.isChatInputCommand()) {
			await handleChatInputCommand(interaction);
		} else if (interaction.isAutocomplete()) {
			await handleAutocomplete(interaction);
		}
	}
}

async function handleChatInputCommand(
	interaction: ChatInputCommandInteraction
) {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
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
	}
}

async function handleAutocomplete(interaction: AutocompleteInteraction) {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(
			`No autocomplete matching ${interaction.commandName} was found.`
		);
		return;
	}

	try {
		await command.autocomplete?.(interaction);
	} catch (error) {
		console.error(error);
	}
}
