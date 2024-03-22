export function endpoint(endpoint: string) {
	return `${process.env.API_URL}/v${process.env.API_VERSION}/${endpoint}`;
}
