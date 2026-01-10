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
	permissionRole?: string;
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

export interface Ban {
	id: number;
	bantime: string;
	round_id: number | null;
	roles: string | null;
	expiration_time: string | null;
	reason: string;
	ckey: string | null;
	a_ckey: string;
	edits: string | null;
	unbanned_datetime: string | null;
	unbanned_ckey: string | null;
}
