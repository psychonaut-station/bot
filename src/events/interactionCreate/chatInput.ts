import { type ChatInputCommandInteraction, MessageFlags } from 'discord.js';

export default async function chatInput(
	interaction: ChatInputCommandInteraction
) {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		throw `No command matching ${interaction.commandName} command was found.`;
	}

	try {
		if (command.permissionRole) {
			const member = await interaction.guild?.members.fetch(
				interaction.user.id
			);

			if (!member?.roles.cache.has(command.permissionRole)) {
				await interaction.reply({
					content: 'Bu komutu kullanmak için gerekli yetkiye sahip değilsin.',
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		}

		await command.execute(interaction);
	} catch (error) {
		try {
			if (interaction.replied) {
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					flags: interaction.ephemeral ? MessageFlags.Ephemeral : undefined,
				});
			} else if (interaction.deferred) {
				await interaction.editReply(
					'There was an error while executing this command!'
				);
			} else {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					flags: interaction.ephemeral ? MessageFlags.Ephemeral : undefined,
				});
			}
		} catch {}
		throw error;
	}
}
