import type { AutocompleteInteraction } from 'discord.js';

import type { Command } from '@/types';
import { get } from '@/utils';

const globalAutocomplete: Record<
	string,
	NonNullable<Command['autocomplete']>
> = {
	ckey,
};

export default async function autocomplete(
	interaction: AutocompleteInteraction
) {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		throw `No autocomplete matching ${interaction.commandName} was found.`;
	}

	try {
		const focusedValue = interaction.options.getFocused(true);

		if (focusedValue.name in globalAutocomplete) {
			await globalAutocomplete[focusedValue.name](interaction);
			return;
		}

		await command.autocomplete!(interaction);
	} catch (error) {
		try {
			await interaction.respond([]);
		} catch {}
		throw error;
	}
}

async function ckey(interaction: AutocompleteInteraction) {
	const focusedValue = interaction.options.getFocused(true);

	const { body } = await get<string[]>(
		`autocomplete/ckey?ckey=${focusedValue.value}`
	);

	await interaction.respond(
		body!.map((ckey) => ({
			name: ckey,
			value: ckey,
		}))
	);
}
