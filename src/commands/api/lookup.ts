import {
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '@/types';
import { get } from '@/utils';

export class LookupCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('lookup')
		.setDescription(
			'Verilen ckey, IP veya computer id ile eşleşen oyuncuları gösterir.'
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('ckey')
				.setDescription('Verilen ckey ile eşleşen oyuncuları gösterir.')
				.addStringOption((option) =>
					option
						.setName('ckey')
						.setDescription('Oyuncunun ckeyi')
						.setRequired(true)
						.setAutocomplete(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('ip')
				.setDescription('Verilen IP ile eşleşen oyuncuları gösterir.')
				.addStringOption((option) =>
					option
						.setName('ip')
						.setDescription('Oyuncunun IP adresi')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('computerid')
				.setDescription('Verilen computer id ile eşleşen oyuncuları gösterir.')
				.addStringOption((option) =>
					option
						.setName('computerid')
						.setDescription("Oyuncunun computer id'si")
						.setRequired(true)
				)
		);
	public permissionRole = '1265385893733204138'; // this should be in config later
	public async execute(interaction: ChatInputCommandInteraction) {
		let rows: [string, string, string][] = [];

		switch (interaction.options.getSubcommand()) {
			case 'ckey': {
				const ckey = interaction.options.getString('ckey', true);
				const { body } = await get<[string, string, string][]>(
					`player/lookup?ckey=${ckey}`
				);
				rows = body!;
				break;
			}
			case 'ip': {
				const ip = interaction.options.getString('ip', true);
				const { body } = await get<[string, string, string][]>(
					`player/lookup?ip=${ip}`
				);
				rows = body!;
				break;
			}
			case 'computerid': {
				const computerId = interaction.options.getString('computerid', true);
				const { body } = await get<[string, string, string][]>(
					`player/lookup?cid=${computerId}`
				);
				rows = body!;
				break;
			}
		}

		const longestCkey = rows.reduce(
			(max, row) => Math.max(max, row[2].length),
			0
		);

		// :tf:
		const message =
			'```md\n' +
			`|    CID     |       IP        | ${' '.repeat(Math.floor(longestCkey / 2) - 2)}CKEY${' '.repeat(Math.ceil(longestCkey / 2) - 2)} |\n` +
			`|------------|-----------------|-${'-'.repeat(longestCkey)}-|\n` +
			rows
				.map(
					([cid, ip, ckey]) =>
						`| ${cid} | ${ip.padEnd(15, ' ')} | ${ckey.padEnd(longestCkey, ' ')} |\n`
				)
				.join('') +
			'```';

		await interaction.reply(message);
	}
}
