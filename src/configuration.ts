import { existsSync, readFileSync } from 'node:fs';

import { TOML } from 'bun';

const configFile = process.env.CONFIG_FILE || 'config.toml';

if (!existsSync(configFile)) {
	throw `Config: ${configFile} does not exist`;
}

const toml = TOML.parse(readFileSync(configFile, 'utf8')) as {
	bot_token: string;
	application_id: string;
	guild_id: string;
	log: {
		path: string;
		colorize: boolean;
		verify_channel: string;
		submissions_channel: string;
	};
	api: {
		url: string;
		token: string;
	};
	submission: {
		questions: string[];
		role: string;
	};
};

const configuration = {
	botToken: toml.bot_token,
	applicationId: toml.application_id,
	guildId: toml.guild_id,
	log: {
		path: toml.log.path,
		colorize: toml.log.colorize,
		verifyChannel: toml.log.verify_channel,
		submissionsChannel: toml.log.submissions_channel,
	},
	api: {
		url: toml.api.url,
		token: toml.api.token,
	},
	submission: {
		questions: toml.submission.questions,
		role: toml.submission.role,
	},
};

// Export for easy use

export const botToken = configuration.botToken;
export const applicationId = configuration.applicationId;
export const guildId = configuration.guildId;
export const log = configuration.log;
export const api = configuration.api;
export const submission = configuration.submission;
export default configuration;

// Validation

if (
	typeof configuration.botToken !== 'string' ||
	configuration.botToken.length === 0
) {
	throw 'Config: bot_token is required';
}

if (
	typeof configuration.applicationId !== 'string' ||
	configuration.applicationId.length === 0
) {
	throw 'Config: application_id is required';
}

if (
	typeof configuration.guildId !== 'string' ||
	configuration.guildId.length === 0
) {
	throw 'Config: guild_id is required';
}

if (
	typeof configuration.log.path !== 'string' ||
	configuration.log.path.length === 0
) {
	throw 'Config: log.path is required';
}

if (typeof configuration.log.colorize !== 'boolean') {
	throw 'Config: log.colorize is required';
}

if (
	typeof configuration.log.verifyChannel !== 'string' ||
	configuration.log.verifyChannel.length === 0
) {
	throw 'Config: log.verify_channel is required';
}

if (
	typeof configuration.log.submissionsChannel !== 'string' ||
	configuration.log.submissionsChannel.length === 0
) {
	throw 'Config: log.submission_channel is required';
}

if (
	typeof configuration.api.url !== 'string' ||
	configuration.api.url.length === 0
) {
	throw 'Config: api.url is required';
}

if (
	typeof configuration.api.token !== 'string' ||
	configuration.api.token.length === 0
) {
	throw 'Config: api.token is required';
}

if (
	!Array.isArray(configuration.submission.questions) ||
	configuration.submission.questions.length === 0
) {
	throw 'Config: application.questions is required';
}

if (
	typeof configuration.submission.role !== 'string' ||
	configuration.submission.role.length === 0
) {
	throw 'Config: application.role is required';
}
