import type { Ban } from '@/types';
import { parseDate, timestamp } from '@/utils';

export const formatBan = (ban: Ban) => {
	const bantime = timestamp(parseDate(ban.bantime), 'R');
	const roundId = ban.round_id ?? 'yok';
	const roles = ban.roles || 'yok';
	const expirationTime = ban.expiration_time
		? timestamp(parseDate(ban.expiration_time), 'R')
		: 'kalıcı';
	const edits = ban.edits ?? 'yok';

	return `Ckey: ${ban.ckey}\nBan Tarihi: ${bantime}\nRound ID: ${roundId}\nRoller: ${roles}\nBitiş Tarihi: ${expirationTime}\nSebep: ${ban.reason}\nAdmin Ckey: ${ban.a_ckey}\nDüzenlemeler: ${edits}`;
};
