import {
	SlashCommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
	ChatInputCommandInteraction,
	AutocompleteInteraction,
} from 'discord.js';

import ping from './utility/ping';
import check from './api/check';
import player from './api/player';

export const commands: Command[] = [ping, check, player];

export interface Command {
	data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
	autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void;
}
