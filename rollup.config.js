import typescript from '@rollup/plugin-typescript';
import preserveDirectives from 'rollup-preserve-directives';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
	// Core Build
	{
		input: 'src/core/index.ts',
		output: [
			{
				file: 'dist/core/index.js',
				format: 'cjs',
				sourcemap: true,
			},
			{
				file: 'dist/core/index.esm.js',
				format: 'esm',
				sourcemap: true,
			},
		],
		plugins: [
			typescript({
				tsconfig: './tsconfig.json',
				sourceMap: true,
			}),
			preserveDirectives(),
			nodeResolve(), 
			commonjs(), 
		],
		external: ['react', 'react-dom', 'react/jsx-runtime'],
	},

	// React Wrapper Build
	{
		input: 'src/react/index.tsx', 
		output: [
			{
				file: 'dist/react/index.js',
				format: 'cjs',
				sourcemap: true,
			},
			{
				file: 'dist/react/index.esm.js',
				format: 'esm',
				sourcemap: true,
			},
		],
		plugins: [
			typescript({
				tsconfig: './tsconfig.json',
				sourceMap: true,
			}),
			preserveDirectives(),
			nodeResolve(),
			commonjs(),
		],
		external: ['react', 'react-dom', 'react/jsx-runtime'], // React-specific external dependencies
	},

	// (Optional) Additional Wrappers (e.g., Vue, Svelte, etc.) can be added similarly
];