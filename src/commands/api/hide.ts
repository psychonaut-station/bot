import {
    type ChatInputCommandInteraction,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';

import logger from '@/logger';
import type { Command } from '@/types';
import { post } from '@/utils';

export class HideCommand implements Command {
    public builder = new SlashCommandBuilder()
        .setName('hide')
        .setDescription('Bir Byond hesabını web sitedeki arama sonuçlarından gizler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addStringOption((option) =>
            option
                .setName('ckey')
                .setDescription('Byond hesabının ckeyi')
                .setRequired(true)
        );
    public async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.user;
        const ckey = interaction.options.getString('ckey', true);

        const { statusCode } = await post<string>(
            'autocomplete/ckey/hide?ckey=' + ckey + '&hid_by=' + user.id,
            {}
        );

        if (statusCode === 200) {
            logger.info(
                `Ckey \`${ckey}\` arama sonuçlarından gizlendi`
            );

            logger.channel(
                interaction.client,
                'submission',
                `\`${ckey}\` arama sonuçlarından gizlendi.`,
                `${user.displayName} ${user.username} ${user.id} ${ckey}`
            );

            await interaction.reply({
                content: `\`${ckey}\` arama sonuçlarından başarıyla gizlendi.`,
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}

export class UnhideCommand implements Command {
    public builder = new SlashCommandBuilder()
        .setName('unhide')
        .setDescription('Bir Byond hesabının web sitedeki arama sonuçlarından gizlenmesini kaldırır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addStringOption((option) =>
            option
                .setName('ckey')
                .setDescription('Byond hesabının ckeyi')
                .setRequired(true)
        );
    public async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.user;
        const ckey = interaction.options.getString('ckey', true);

        const { statusCode } = await post<string>(
            'autocomplete/ckey/unhide?ckey=' + ckey + '&unhid_by=' + user.id,
            {}
        );

        if (statusCode === 200) {
            logger.info(
                `Ckey \`${ckey}\` arama sonuçlarında tekrar görünür hale getirildi`
            );

            logger.channel(
                interaction.client,
                'submission',
                `\`${ckey}\` arama sonuçlarında tekrar görünür hale getirildi.`,
                `${user.displayName} ${user.username} ${user.id} ${ckey}`
            );

            await interaction.reply({
                content: `\`${ckey}\` arama sonuçlarında tekrar görünür hale getirildi.`,
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}
