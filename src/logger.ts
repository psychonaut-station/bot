import { once } from 'events';
import pino from 'pino';
import pretty from 'pino-pretty';

import config from '@/config';
import { name } from '@/package';

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

	const logger = pino({ name, level: 'debug' }, multistream);

	return logger;
}

const logger = await createLogger();

export default logger;
