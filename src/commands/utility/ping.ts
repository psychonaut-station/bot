import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '@/types';

export class PingCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!');
	public async execute(interaction: ChatInputCommandInteraction) {
		interaction.reply('Pong!');
	}
}
