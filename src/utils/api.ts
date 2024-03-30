import axios from 'axios';
import { GenericResponse as Response } from '../types';

export async function get<T>(
	endpoint: string,
	secret = true
): Promise<Response<T>> {
	const result = await axios.get(
		`${process.env.API_URL}/v${process.env.API_VERSION}/${endpoint}`,
		{
			headers: secret ? { 'X-API-KEY': process.env.API_KEY } : undefined,
		}
	);

	return result.data;
}

export async function post<T>(
	endpoint: string,
	data: any,
	secret = true
): Promise<Response<T>> {
	const result = await axios.post(
		`${process.env.API_URL}/v${process.env.API_VERSION}/${endpoint}`,
		data,
		{
			headers: secret ? { 'X-API-KEY': process.env.API_KEY } : undefined,
		}
	);

	return result.data;
}
