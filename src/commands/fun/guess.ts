import { Database } from 'bun:sqlite';
import {
	type ChatInputCommandInteraction,
	type InteractionCallbackResponse,
	SlashCommandBuilder,
} from 'discord.js';

import type { Command } from '@/types';

let activeGame: ActiveGame | null = null;

export class GuessWhoCommand implements Command {
	public builder = new SlashCommandBuilder()
		.setName('guess-who')
		.setDescription('Guess who I am!');
	private db = new Database('guesswho.db', { readonly: true });
	public async execute(interaction: ChatInputCommandInteraction) {
		if (activeGame && !activeGame.finished()) {
			await interaction.reply(
				`There is already an active game. Please wait ${activeGame.leftSecs().toFixed(1)}s.`
			);
			return;
		}

		const character = this.pickRandomCharacter();

		if (!character) {
			await interaction.reply('No characters found in the database.');
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

		let message = `Guess who this character belongs to!\nWe have seen this character in ${rounds} round(s).`;

		if (rounds < 5) {
			message += `\n\n*Hint: The character's name looks like: ${this.hintName(name, Math.max(4 - rounds, 1))}*`;
		}

		message += `\n\nType \`/guess\` followed by your guess to play!\nYou have ${ActiveGame.gameDuration / 1_000} seconds to guess.`;

		const response = await interaction.reply({
			content: message,
			files: [attachment],
			withResponse: true,
		});

		activeGame = new ActiveGame(name, ckey, response);

		setTimeout(async () => {
			if (activeGame && !activeGame.guessed) {
				try {
					await activeGame.response.resource?.message?.reply(
						`Time's up! The character was ${name}, belonging to **${ckey}**.`
					);
				} catch {}
			}
		}, ActiveGame.gameDuration + 500);
	}
	private pickRandomCharacter() {
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
		.setDescription('Replies with Pong!')
		.addStringOption((option) =>
			option
				.setName('ckey')
				.setDescription('Oyuncunun ckeyi')
				.setRequired(true)
				.setAutocomplete(true)
		);
	public async execute(interaction: ChatInputCommandInteraction) {
		if (!activeGame || activeGame.finished()) {
			await interaction.reply('There is no active game.');
			return;
		}

		const guess = interaction.options.getString('ckey', true);

		if (activeGame.guess(guess)) {
			const message = activeGame.response.resource?.message;

			await interaction.reply('Correct! You guessed the character!');

			try {
				await message?.reply({
					content: `The character was ${activeGame.name}, belonging to **${activeGame.ckey}**.\nIt was guessed correctly by **${interaction.user}**!`,
					allowedMentions: { parse: [] },
				});
			} catch {}
		} else {
			await interaction.reply('Wrong guess!');
		}
	}
}

class ActiveGame {
	name: string;
	ckey: string;
	response: InteractionCallbackResponse;
	timestamp: number;
	guessed = false;

	static gameDuration = 60_000; // 60 seconds

	constructor(
		name: string,
		ckey: string,
		response: InteractionCallbackResponse
	) {
		this.name = name;
		this.ckey = ckey.toLowerCase();
		this.response = response;
		this.timestamp = Date.now();
	}

	guess(ckey: string) {
		return (this.guessed = ckey.toLowerCase() === this.ckey);
	}
	elapsed() {
		return Date.now() - this.timestamp;
	}
	finished() {
		return this.elapsed() > ActiveGame.gameDuration;
	}
	leftSecs() {
		return Math.max(0, (ActiveGame.gameDuration - this.elapsed()) / 1_000);
	}
}
