import {
	Collection,
	SlashCommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
	ChatInputCommandInteraction,
	AutocompleteInteraction,
	Events,
	SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import { Command } from './commands';

declare module 'discord.js' {
	export interface Client {
		commands: Collection<string, Command>;
	}
}

export interface GenericResponse<T> {
	status: number;
	reason: string;
	response: T;
}

export interface Command {
	builder:
		| SlashCommandBuilder
		| SlashCommandSubcommandsOnlyBuilder
		| SlashCommandOptionsOnlyBuilder
		| Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'>;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
	autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void;
}

export interface Event {
	name: Events;
	once?: boolean;
	execute: (...args: any[]) => Promise<void> | void;
}
