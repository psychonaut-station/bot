import { request } from 'undici';

type Response<T> =
	| { statusCode: 200; body: T }
	| { statusCode: 404; body: undefined }
	| { statusCode: 409; body: undefined };

export async function get<T>(endpoint: string) {
	const response = await request(`${Bun.env.API_URL}/${endpoint}`, {
		headers: {
			'X-API-KEY': Bun.env.API_KEY,
		},
	});

	if (response.statusCode === 500) {
		throw new Error('Internal server error');
	}

	let body;

	if (response.headers['content-type'] === 'application/json') {
		body = await response.body.json();
	}

	return {
		statusCode: response.statusCode,
		body: body as T,
	} as Response<T>;
}

export async function post<T>(endpoint: string, body: any) {
	const response = await request(`${Bun.env.API_URL}/${endpoint}`, {
		method: 'POST',
		headers: {
			'X-API-KEY': Bun.env.API_KEY,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	if (response.statusCode === 500) {
		throw new Error('Internal server error');
	}

	let body_;

	if (response.headers['content-type'] === 'application/json') {
		body_ = await response.body.json();
	}

	return {
		statusCode: response.statusCode,
		body: body_ as T,
	} as Response<T>;
}
