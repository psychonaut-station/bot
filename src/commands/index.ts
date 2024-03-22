import { SlashCommandBuilder, CommandInteraction } from 'discord.js';

import ping from './utility/ping';
import check from './api/check';

export const commands: Command[] = [ping, check];

export interface Command {
	data: SlashCommandBuilder;
	execute: (interaction: CommandInteraction) => Promise<void> | void;
}
