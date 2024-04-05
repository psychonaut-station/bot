export function parseDate(date: string): Date {
	const [datePart, timePart] = date.split(' ');
	const [year, month, day] = datePart.split('-').map(Number);

	if (!timePart) {
		return new Date(year, month - 1, day);
	}

	const [hour, minute, second] = timePart.split(':').map(Number);

	return new Date(year, month - 1, day, hour, minute, second);
}

type Format = 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R';

export function timestamp(date: Date, format?: Format): string {
	return `<t:${date.getTime().toString().slice(0, 10)}${
		format ? ':' + format : ''
	}>`;
}
