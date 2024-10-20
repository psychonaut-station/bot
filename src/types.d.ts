import type {
	ChatInputCommandInteraction,
	Collection,
	ModalSubmitInteraction,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export interface Command {
	builder:
		| SlashCommandBuilder
		| SlashCommandSubcommandsOnlyBuilder
		| SlashCommandOptionsOnlyBuilder
		| Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
	autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface Event {
	name: Events;
	once?: boolean;
	execute: (...args: any[]) => Promise<void>;
}

export interface PermanentButtonInteraction {
	customId: string;
	execute: (interaction: ButtonInteraction) => Promise<void>;
}

export interface ModalInteraction {
	customId: string;
	execute: (interaction: ModalSubmitInteraction) => Promise<void>;
}

declare module 'discord.js' {
	export interface Client {
		commands: Collection<string, Command>;
	}
}
