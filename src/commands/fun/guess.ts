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

interface Character {
	id: number;
	icon: string;
	ckey: string;
	name: string;
	icon_data: string; // base64-encoded image
	seen_in_rounds: number;
	total_rounds: number;
}

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

class GameMemory {
	private memory: string[] = [];
	private entries = 0;

	static maxSize = 50;
	static forbidden = ['blob'];

	private remember(character: Character) {
		if (this.memory.length >= GameMemory.maxSize) {
			this.memory.shift();
		}
		this.memory.push(`${character.name}_${character.ckey}`);
	}
	private has(character: Character): boolean {
		return this.memory.includes(`${character.name}_${character.ckey}`);
	}
	private count(db: Database): number {
		if (!this.entries) {
			const query = db.query<{ count: number }, never[]>(
				'SELECT COUNT(*) AS count FROM (SELECT 1 FROM characters GROUP BY name, ckey)'
			);
			const count = query.get()?.count;

			if (!count) {
				logger.warn('No characters found in the database.');
			}

			this.entries = count ?? 0;
		}
		return this.entries;
	}
	public pickRandom(db: Database): Character | null {
		const count = this.count(db);

		if (count === 0) {
			return null;
		}

		for (let i = 0; i < count; i++) {
			const query = db.query<Character, never[]>(`
				SELECT c2.*, c1.total_rounds
				FROM (
					SELECT name, ckey, SUM(seen_in_rounds) AS total_rounds
					FROM characters
					GROUP BY name, ckey
					ORDER BY RANDOM() LIMIT 1
				) AS c1
				JOIN characters c2 ON c1.name = c2.name AND c1.ckey = c2.ckey
				ORDER BY RANDOM() LIMIT 1;
			`);
			const character = query.get();

			if (character && !this.has(character) && !this.isForbidden(character)) {
				this.remember(character);
				return character;
			}
		}

		return null;
	}
	private isForbidden(character: Character): boolean {
		const name = character.name.toLowerCase();
		return GameMemory.forbidden.some((forbidden) => name.includes(forbidden));
	}
}

let activeGame: ActiveGame | null = null;

const memory = new GameMemory();
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
				total_rounds: totalRounds,
			} = character;

			const imageBuffer = Buffer.from(
				iconData.slice('data:image/png;base64,'.length),
				'base64'
			);
			const attachment = {
				attachment: imageBuffer,
				name: icon,
			};
			const message = this.prepareMessage(name, rounds, totalRounds);

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

		const character = memory.pickRandom(this.db);

		if (!character) {
			logger.warn('Failed to pick a random character from the database.');
		}

		return character;
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
	private prepareMessage(name: string, rounds: number, totalRounds: number) {
		const conjuction = rounds === totalRounds ? 'de' : 'ama';

		let message = `Bu karakterin kime ait olduğunu tahmin et!\n\nKendisini bu görünüşüyle **${rounds}** turda, toplamda ise ${conjuction} **${totalRounds}** turda gördük.`;

		if (rounds < 5) {
			const reveal = totalRounds < 24 ? Math.max(4 - rounds, 1) : 1;
			message += `\n\n*İpucu: Karakterin ismi şuna benziyor: ${this.hintName(name, reveal)}*`;
		}

		message += `\n\nOynamak için \`/guess\` komutunu kullanıp tahminini yaz!\nTahmin etmek için ${ActiveGame.gameDuration / 1_000} saniyen var.`;

		return message;
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

			try {
				await this.reply(
					`Süre doldu! Karakter **${this.ckey}** oyuncusuna ait olan ${this.name} idi.`
				);
			} catch {}
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
