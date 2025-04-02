import {
	ActionRowBuilder,
	ButtonBuilder,
	type ChatInputCommandInteraction,
	type MessageActionRowComponentBuilder as MessageActionRow,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '@/types';

export class ButtonCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('button')
		.setDescription('Buton ekli bir mesaj oluşturur.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addStringOption((option) =>
			option
				.setName('message')
				.setDescription('Butonun ekleneceği mesajın içeriği.')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('button')
				.setDescription('Buton oluşturmak için gereken özel söz dizimi.')
				.setRequired(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		const message = interaction.options.getString('message', true);
		const token = interaction.options.getString('button', true);

		if (!interaction.channel?.isSendable()) {
			await interaction.reply({
				content: 'Bu kanala mesaj gönderemiyorum.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const buttons = token.split(';');

		if (buttons.length === 0) {
			await interaction.reply({
				content: 'Buton oluşturmak için en az bir buton gereklidir.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const row = new ActionRowBuilder<MessageActionRow>();

		for (const button of buttons) {
			const [label, style, customId] = button.split(':');

			const styleNumber = Number(style);

			if (isNaN(styleNumber) || styleNumber < 1 || styleNumber > 5) {
				await interaction.reply({
					content: 'Geçersiz buton stili.',
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			row.addComponents(
				new ButtonBuilder()
					.setCustomId(customId)
					.setLabel(label)
					.setStyle(styleNumber)
			);
		}

		await interaction.channel.send({
			content: message,
			components: [row],
		});

		await interaction.reply({
			content: 'Mesaj oluşturuldu.',
			flags: MessageFlags.Ephemeral,
		});
	}
}
