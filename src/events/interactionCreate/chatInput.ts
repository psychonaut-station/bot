import { type ChatInputCommandInteraction, MessageFlags } from 'discord.js';

export default async function chatInput(
	interaction: ChatInputCommandInteraction
) {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		throw `No command matching ${interaction.commandName} command was found.`;
	}

	try {
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
