import type { Client, MessageCreateOptions } from 'discord.js';
import { once } from 'events';
import pino from 'pino';
import pretty from 'pino-pretty';

import config from '@/configuration';
import { name } from '@/package';

type Channel = 'verify' | 'submission';
type ExtendedLogger = pino.Logger & {
	channel: (
		client: Client,
		channel: Channel,
		message: string,
		subtext?: string,
		options?: MessageCreateOptions
	) => Promise<void>;
};

const channels: Record<Channel, string> = {
	verify: config.log.verifyChannel,
	submission: config.log.submissionsChannel,
};

async function createLogger() {
	const prettyStream = pretty({
		colorize: config.log.colorize,
		ignore: 'pid,hostname',
	});

	const fileStream = pino.destination(config.log.path);

	await once(fileStream, 'ready');

	const multistream = pino.multistream([
		{ level: 'debug', stream: prettyStream },
		{ level: 'info', stream: fileStream },
	]);

	const logger = pino({ name, level: 'debug' }, multistream) as ExtendedLogger;

	logger.channel = async (
		client: Client,
		channel: Channel,
		message: string,
		subtext?: string,
		options?: MessageCreateOptions
	) => {
		try {
			const textChannel = await client.channels.fetch(channels[channel]);

			if (!textChannel) {
				throw "Channel doesn't exist or is not accessible";
			}

			if (!textChannel.isSendable()) {
				throw 'Channel is not sendable';
			}

			await textChannel.send({
				content: message + (subtext ? `\n-# ${subtext}` : ''),
				allowedMentions: { parse: [] },
				...options,
			});
		} catch (error) {
			logger.error(
				`There was an error while sending a message to log channel: \`${channel}\`, message: \`${message}\`, subtext: \`${subtext}\`, error: ${error}`
			);
		}
	};

	return logger;
}

const logger = await createLogger();

export default logger;
