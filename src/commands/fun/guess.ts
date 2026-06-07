import { Database } from 'bun:sqlite';
import {
	type ChatInputCommandInteraction,
	type InteractionCallbackResponse,
	type MessagePayload,
	type MessageReplyOptions,
	SlashCommandBuilder,
} from 'discord.js';

import logger from '@/logger';
import type { Command } from '@/types';

let activeGame: ActiveGame | null = null;

export class GuessWhoCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('guess-who')
		.setDescription('Kim olduğumu tahmin et!');
	private db: Database | null = null;
	public async execute(interaction: ChatInputCommandInteraction) {
		if (activeGame && !activeGame.finished()) {
			await interaction.reply(
				`Zaten aktif bir oyun var. Lütfen ${activeGame.leftSecs().toFixed(1)} saniye bekle.`
			);
			return;
		}

		const character = this.pickRandomCharacter();

		if (!character) {
			await interaction.reply('Veritabanında hiç karakter bulunamadı.');
			return;
		}

		const {
			icon,
			name,
			ckey,
			icon_data: iconData,
			seen_in_rounds: rounds,
		} = character;

		const imageBuffer = Buffer.from(
			iconData.slice('data:image/png;base64,'.length),
			'base64'
		);
		const attachment = {
			attachment: imageBuffer,
			name: icon,
		};

		let message = `Bu karakterin kime ait olduğunu tahmin et!\nBu karakteri ${rounds} turda gördük.`;

		if (rounds < 5) {
			message += `\n\n*İpucu: Karakterin ismi şuna benziyor: ${this.hintName(name, Math.max(4 - rounds, 1))}*`;
		}

		message += `\n\nOynamak için \`/guess\` komutunu kullanıp tahminini yaz!\nTahmin etmek için ${ActiveGame.gameDuration / 1_000} saniyen var.`;

		const response = await interaction.reply({
			content: message,
			files: [attachment],
			withResponse: true,
		});

		const timeout = setTimeout(async () => {
			if (activeGame && !activeGame.guessed) {
				await activeGame.reply(
					`Süre doldu! Karakter **${ckey}** oyuncusuna ait olan ${name} idi.`
				);
			}
		}, ActiveGame.gameDuration + 500);

		activeGame = new ActiveGame(name, ckey, response, timeout);
	}
	private pickRandomCharacter() {
		if (!this.db) {
			try {
				this.db = new Database('guesswho.db', { readonly: true });
			} catch (error) {
				logger.error(`Failed to open guesswho.db: ${error}`);
				return null;
			}
		}

		interface Row {
			id: number;
			icon: string;
			ckey: string;
			name: string;
			icon_data: string; // base64-encoded image
			seen_in_rounds: number;
		}

		const row = this.db
			.query<Row, never[]>('SELECT * FROM characters ORDER BY RANDOM() LIMIT 1')
			.get();

		return row;
	}
	private hintName(name: string, reveal: number) {
		if (reveal === 0) {
			return name;
		}

		let hint = '';

		for (const part of name.trim().split(' ')) {
			if (part.length <= reveal) {
				hint += `${part} `;
			} else {
				hint += `${part.slice(0, reveal)}${'\\*'.repeat(part.length - reveal)} `;
			}
		}

		return hint.slice(0, -1);
	}
}

export class GuessCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('guess')
		.setDescription('Aktif oyunda karakterin sahibini tahmin et')
		.addStringOption((option) =>
			option
				.setName('ckey')
				.setDescription('Oyuncunun ckeyi')
				.setRequired(true)
				.setAutocomplete(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		if (!activeGame || activeGame.finished()) {
			await interaction.reply('Aktif bir oyun yok.');
			return;
		}

		const guess = interaction.options.getString('ckey', true);

		if (activeGame.guess(guess)) {
			clearTimeout(activeGame.timeout);

			await interaction.reply('Doğru! Karakteri tahmin ettin!');
			await activeGame.reply({
				content: `Karakter **${activeGame.ckey}** oyuncusuna ait olan ${activeGame.name} idi.\n**${interaction.user}** doğru tahmin etti!`,
				allowedMentions: { parse: [] },
			});
		} else {
			await interaction.reply('Yanlış tahmin!');
		}
	}
}

class ActiveGame {
	name: string;
	ckey: string;
	response: InteractionCallbackResponse;
	timestamp: number;
	guessed = false;
	timeout: NodeJS.Timeout;

	static gameDuration = 60_000; // 60 seconds

	constructor(
		name: string,
		ckey: string,
		response: InteractionCallbackResponse,
		timeout: NodeJS.Timeout
	) {
		this.name = name;
		this.ckey = ckey.toLowerCase();
		this.response = response;
		this.timestamp = Date.now();
		this.timeout = timeout;
	}

	guess(ckey: string) {
		return (this.guessed = ckey.toLowerCase() === this.ckey);
	}
	elapsed() {
		return Date.now() - this.timestamp;
	}
	finished() {
		return this.guessed || this.elapsed() > ActiveGame.gameDuration;
	}
	leftSecs() {
		return Math.max(0, (ActiveGame.gameDuration - this.elapsed()) / 1_000);
	}
	async reply(content: string | MessagePayload | MessageReplyOptions) {
		try {
			await this.response.resource?.message?.reply(content);
		} catch {}
	}
}
