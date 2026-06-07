import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Database } from 'bun:sqlite';
import * as imgkit from 'imgkit';

const archiveRoot = process.argv[2];
const dbPath = process.argv[3] ?? 'characters.db';

if (!archiveRoot) {
	console.error('Usage: bun build-db.ts <archive-root> [output.db]');
	console.error('Example: bun build-db.ts ./archive characters.db');
	process.exit(1);
}

const charactersDir = join(archiveRoot, 'characters');
const roundsDir = join(archiveRoot, 'rounds');

if (!existsSync(charactersDir)) {
	console.error(`Error: characters directory not found → ${charactersDir}`);
	process.exit(1);
}
if (!existsSync(roundsDir)) {
	console.error(`Error: rounds directory not found → ${roundsDir}`);
	process.exit(1);
}

const db = new Database(dbPath, { create: true });
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA synchronous = NORMAL');

db.run(`
  CREATE TABLE IF NOT EXISTS characters (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    icon           TEXT NOT NULL,
    ckey           TEXT NOT NULL,
    name           TEXT NOT NULL,
    icon_data      TEXT,
    seen_in_rounds INTEGER NOT NULL DEFAULT 0,
    UNIQUE(icon, ckey, name)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS rounds (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id      TEXT NOT NULL,
    year          TEXT NOT NULL,
    month         TEXT NOT NULL,
    day           TEXT NOT NULL,
    metadata_path TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS round_characters (
    round_id TEXT NOT NULL,
    icon     TEXT NOT NULL,
    name     TEXT NOT NULL,
    ckey     TEXT NOT NULL,
    PRIMARY KEY (round_id, icon, ckey, name)
  )
`);

db.run('CREATE INDEX IF NOT EXISTS idx_char_ckey ON characters(ckey)');
db.run('CREATE INDEX IF NOT EXISTS idx_char_name ON characters(name)');
db.run('CREATE INDEX IF NOT EXISTS idx_char_icon ON characters(icon)');

function* walkMetadata(
	dir: string
): Generator<{ path: string; parts: string[] }> {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			yield* walkMetadata(full);
		} else if (entry.name === 'metadata.json') {
			const rel = full.slice(roundsDir.length + 1);
			const parts = rel.split(/[/\\]/);
			yield { path: full, parts };
		}
	}
}

console.log('📂 Scanning and encoding character icons…');
const iconData = new Map<string, string>();
for (const file of readdirSync(charactersDir)) {
	if (file.endsWith('.png')) {
		// const b64 = readFileSync(join(charactersDir, file)).toString("base64");
		// iconData.set(file, `data:image/png;base64,${b64}`);

		// const image = await new Bun.Image(join(charactersDir, file));
		// if only bun could crop :(

		const buffer = Buffer.from(
			await Bun.file(join(charactersDir, file)).arrayBuffer()
		);
		const resized = await imgkit.resize(buffer, {
			width: 1024,
			height: 1024,
			filter: 'nearest',
		});
		const cropped = await imgkit.crop(resized, {
			x: 120,
			y: 0,
			width: 256,
			height: 256,
		});
		const png = await imgkit.toPng(cropped, { compression: 9 });

		iconData.set(file, `data:image/png;base64,${png.toString('base64')}`);
	}
}
console.log(`   ${iconData.size} icons encoded.`);

console.log('📋 Processing round metadata files…');

const insertRound = db.prepare(`
  INSERT OR IGNORE INTO rounds (round_id, year, month, day, metadata_path)
  VALUES ($round_id, $year, $month, $day, $metadata_path)
`);

const insertRoundChar = db.prepare(`
  INSERT OR IGNORE INTO round_characters (round_id, icon, name, ckey)
  VALUES ($round_id, $icon, $name, $ckey)
`);

const upsertChar = db.prepare(`
  INSERT INTO characters (icon, ckey, name, icon_data, seen_in_rounds)
  VALUES ($icon, $ckey, $name, $icon_data, 1)
  ON CONFLICT(icon, ckey, name) DO UPDATE SET
    seen_in_rounds = seen_in_rounds + 1,
    icon_data = COALESCE(excluded.icon_data, icon_data)
`);

let roundCount = 0;
let entryCount = 0;

db.transaction(() => {
	for (const { path: metaPath, parts } of walkMetadata(roundsDir)) {
		// parts: ["2026", "06", "03", "round-10446", "metadata.json"]
		const [year, month, day, roundId] = parts;
		if (!year || !month || !day || !roundId) continue;

		let raw: Record<string, { name: string; ckey: string; icon: string }>;

		try {
			raw = JSON.parse(readFileSync(metaPath, 'utf8'));
		} catch {
			console.warn(`  ⚠️  Could not read: ${metaPath}`);
			continue;
		}

		insertRound.run({
			$round_id: roundId,
			$year: year,
			$month: month,
			$day: day,
			$metadata_path: metaPath,
		});

		for (const entry of Object.values(raw)) {
			const { name, ckey, icon } = entry;
			if (!icon || !name || !ckey) continue;

			insertRoundChar.run({
				$round_id: roundId,
				$icon: icon,
				$name: name,
				$ckey: ckey,
			});
			upsertChar.run({
				$icon: icon,
				$ckey: ckey,
				$name: name,
				$icon_data: iconData.get(icon) ?? null,
			});

			entryCount++;
		}

		roundCount++;
	}
})();

console.log(`   ${roundCount} rounds processed, ${entryCount} entries read.`);

// Force WAL checkpoint so data is flushed to the main DB file
db.run('PRAGMA wal_checkpoint(TRUNCATE)');

const { c: totalChars } = db
	.query('SELECT COUNT(*) as c FROM characters')
	.get() as any;
const { m: matched } = db
	.query('SELECT COUNT(*) as m FROM characters WHERE icon_data IS NOT NULL')
	.get() as any;
const { u: unmatched } = db
	.query('SELECT COUNT(*) as u FROM characters WHERE icon_data IS NULL')
	.get() as any;
const { r: totalRounds } = db
	.query('SELECT COUNT(*) as r FROM rounds')
	.get() as any;

const dbSize = Bun.file(dbPath).size;
const dbSizeMB = (dbSize / 1024 / 1024).toFixed(2);

console.log('\n✅ Done!');
console.log(`   Database    : ${resolve(dbPath)}`);
console.log(`   DB size     : ${dbSizeMB} MB`);
console.log(
	`   Characters  : ${totalChars} (${matched} with icon, ${unmatched} missing icon)`
);
console.log(`   Rounds      : ${totalRounds}`);
console.log(`   Icon pool   : ${iconData.size} files`);

db.close();
