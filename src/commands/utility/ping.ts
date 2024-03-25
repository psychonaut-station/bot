import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../types';

export class PingCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
	public async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply('Pong!');
	}
}
