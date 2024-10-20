import { readdirSync } from 'node:fs';

const commands = (await import('@/commands')) as Record<string, any>;

for (const subdirectory of readdirSync('./src/commands')) {
	if (subdirectory === 'index.ts') {
		continue;
	}

	for (const file of readdirSync(`./src/commands/${subdirectory}`)) {
		if (file.endsWith('.ts')) {
			const command = await import(`@/commands/${subdirectory}/${file}`);

			for (const [name, func] of Object.entries(command)) {
				if (typeof func === 'function') {
					if (!commands[name]) {
						console.warn(
							`Command ${name} is defined in src/commands/${subdirectory}/${file} but not exported in the commands index.`
						);
					}
				}
			}
		}
	}
}
