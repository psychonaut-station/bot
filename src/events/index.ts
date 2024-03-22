import type { ClientEvents } from 'discord.js';

import interactionCreate from './interactionCreate.js';
import ready from './ready.js';

export const events: Event[] = [interactionCreate, ready];

export interface Event {
	name: keyof ClientEvents;
	once?: boolean;
	execute: (...args: any[]) => Promise<void> | void;
}
