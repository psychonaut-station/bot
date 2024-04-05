import type {
	ChatInputCommandInteraction,
	Collection,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { Logger } from 'pino';

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

declare module 'discord.js' {
	export interface Client {
		commands: Collection<string, Command>;
		logger: Logger;
	}
}

declare module 'bun' {
	export interface Env {
		BOT_TOKEN: string;
		APPLICATION_ID: string;
		GUILD_ID: string;
		API_URL: string;
		API_KEY: string;
		LOG_FILE: string;
		COLORIZE: 'true' | 'false';
	}
}
