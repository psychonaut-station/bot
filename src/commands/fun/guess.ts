import { join } from 'node:path';

import { Database } from 'bun:sqlite';
import {
	type ChatInputCommandInteraction,
	type InteractionCallbackResponse,
	type MessagePayload,
	type MessageReplyOptions,
	SlashCommandBuilder,
} from 'discord.js';

import { dataDir } from '@/configuration';
import logger from '@/logger';
import type { Command } from '@/types';
class Lock {
	private locked = false;

	tryAcquire() {
		if (this.locked) {
			return null;
		}

		this.locked = true;

		return () => {
			this.locked = false;
		};
	}
}

let activeGame: ActiveGame | null = null;
const gameLock = new Lock();

export class GuessWhoCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('guess-who')
		.setDescription('Kim olduğumu tahmin et!');
	private db: Database | null = null;
	public async execute(interaction: ChatInputCommandInteraction) {
		const release = gameLock.tryAcquire();

		if (!release) {
			await interaction.reply('Oyun başlıyor. Lütfen biraz bekle.');
			return;
		}

		try {
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

			activeGame = new ActiveGame(name, ckey, response, interaction.user.id);
			activeGame.startTimeout();
		} finally {
			release();
		}
	}
	private pickRandomCharacter() {
		if (!this.db) {
			try {
				this.db = new Database(join(dataDir, 'guesswho.db'), {
					readonly: true,
				});
			} catch (error) {
				logger.error(`Failed to open guesswho.db: ${error}`);
				return null;
			}
		}

		interface CountRow {
			count: number;
		}

		interface Row {
			id: number;
			icon: string;
			ckey: string;
			name: string;
			icon_data: string; // base64-encoded image
			seen_in_rounds: number;
		}

		const count = this.db
			.query<CountRow, never[]>('SELECT COUNT(*) AS count FROM characters')
			.get()?.count;

		if (!count) {
			logger.warn('No characters found in the database.');
			return null;
		}

		const offset = Math.floor(Math.random() * count);

		const row = this.db
			.query('SELECT * FROM characters ORDER BY id LIMIT 1 OFFSET ?')
			.get(offset) as Row | null;

		if (!row) {
			logger.warn('Failed to retrieve a character from the database.');
			return null;
		}

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
			activeGame.clearTimeout();

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

export class GuessSkipCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('guess-skip')
		.setDescription('Aktif oyunu atla ve cevabı gör');
	public async execute(interaction: ChatInputCommandInteraction) {
		if (!activeGame || activeGame.finished()) {
			await interaction.reply('Aktif bir oyun yok.');
			return;
		}

		if (activeGame.startedBy !== interaction.user.id) {
			await interaction.reply(
				'Sadece oyunu başlatan kişi bu komutu kullanabilir.'
			);
			return;
		}

		activeGame.guessed = true;
		activeGame.clearTimeout();

		await interaction.reply(
			`Oyun atlandı! Karakter **${activeGame.ckey}** oyuncusuna ait olan ${activeGame.name} idi.`
		);
	}
}

class ActiveGame {
	name: string;
	ckey: string;
	response: InteractionCallbackResponse;
	timestamp: number;
	guessed = false;
	startedBy: string;
	private timeout: NodeJS.Timeout | null = null;

	static gameDuration = 60_000; // 60 seconds

	constructor(
		name: string,
		ckey: string,
		response: InteractionCallbackResponse,
		startedBy: string
	) {
		this.name = name;
		this.ckey = ckey.toLowerCase();
		this.response = response;
		this.timestamp = Date.now();
		this.startedBy = startedBy;
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
	startTimeout() {
		this.timeout = setTimeout(async () => {
			if (activeGame !== this || this.guessed) {
				return;
			}

			await this.reply(
				`Süre doldu! Karakter **${this.ckey}** oyuncusuna ait olan ${this.name} idi.`
			);
		}, ActiveGame.gameDuration + 500);
	}
	clearTimeout() {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}
	async reply(content: string | MessagePayload | MessageReplyOptions) {
		try {
			await this.response.resource?.message?.reply(content);
		} catch {}
	}
}
