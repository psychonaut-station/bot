export function parseDate(date: string): Date {
	// eg 2023-03-04 17:01:02
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
	return `<t:${date.getTime().toString().slice(0, 10)}${format ? ':' + format : ''}>`;
}
