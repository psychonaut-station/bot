import { Collection } from 'discord.js';
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
