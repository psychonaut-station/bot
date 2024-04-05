import { once } from 'events';
import pino from 'pino';
import pretty from 'pino-pretty';

import { name } from '../../package.json';

export async function createLogger() {
	const prettyStream = pretty({
		colorize: Bun.env.COLORIZE !== 'false',
		ignore: 'pid,hostname',
	});

	const fileStream = pino.destination(Bun.env.LOG_FILE);

	await once(fileStream, 'ready');

	const multistream = pino.multistream([
		{ level: 'debug', stream: prettyStream },
		{ level: 'info', stream: fileStream },
	]);

	const logger = pino({ name, level: 'debug' }, multistream);

	return logger;
}
