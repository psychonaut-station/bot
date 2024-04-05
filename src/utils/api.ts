import { request } from 'undici';

interface Generic<T> {
	status: number;
	reason: string;
	response: T;
}

interface Failure extends Generic<null> {
	status: 0;
	reason: 'failure';
	response: null;
}

interface Success<T> extends Generic<T> {
	status: 1;
	reason: 'success';
	response: T;
}

interface Forbidden extends Generic<null> {
	status: 2;
	reason: 'forbidden';
	response: null;
}

interface Unauthorized extends Generic<null> {
	status: 3;
	reason: 'unauthorized';
	response: null;
}

interface NotFound extends Generic<null> {
	status: 4;
	reason: 'not found';
	response: null;
}

interface BadRequest extends Generic<null> {
	status: 5;
	reason: 'bad request';
	response: null;
}

interface Conflict extends Generic<null> {
	status: 6;
	reason: 'conflict';
	response: null;
}

type Response<T> =
	| Failure
	| Success<T>
	| Forbidden
	| Unauthorized
	| NotFound
	| BadRequest
	| Conflict;

export async function get<T>(endpoint: string) {
	const response = await request(`${Bun.env.API_URL}/${endpoint}`, {
		headers: {
			'X-API-KEY': Bun.env.API_KEY,
		},
	});

	if (response.statusCode === 500) {
		throw new Error('Internal server error');
	}

	return (await response.body.json()) as Response<T>;
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

	return (await response.body.json()) as Response<T>;
}
