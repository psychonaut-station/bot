import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
	input: 'src/index.ts',
	output: {
		file: 'dist/bundle.js',
		format: 'cjs',
	},
	external: ['discord.js'],
	plugins: [
		json(),
		nodeResolve(),
		typescript({ outputToFilesystem: false }),
		commonjs(),
		terser(),
	],
};

export default config;
