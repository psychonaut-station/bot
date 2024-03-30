import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	CommandInteraction,
	Events,
} from 'discord.js';
import { Event } from '../types';
import { get } from '../utils/api';

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
		interaction.client.logger.error(
			`No command matching ${interaction.commandName} was found.`
		);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		interaction.client.logger.error(error);
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

const genericAutocomplete: Record<
	string,
	(interaction: AutocompleteInteraction) => Promise<void>
> = {
	ckey: ckeyAutocomplete,
};

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

		await command.autocomplete?.(interaction);
	} catch (error) {
		interaction.client.logger.error(error);
	}
}

async function ckeyAutocomplete(interaction: AutocompleteInteraction) {
	const focusedValue = interaction.options.getFocused(true);

	const { status, response } = await get<string[]>(
		`autocomplete/ckey?ckey=${focusedValue.value}`
	);

	if (status === 1) {
		interaction.respond(
			response.map((ckey) => ({
				name: ckey,
				value: ckey,
			}))
		);
		return;
	}

	interaction.respond([]);
}
