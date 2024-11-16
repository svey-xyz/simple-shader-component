import typescript from '@rollup/plugin-typescript';
import preserveDirectives from 'rollup-preserve-directives'

export default {
	input: 'src/index.tsx',
	output: [
		{
			file: 'dist/bundle.js',
			format: 'cjs',
			sourcemap: true
		},
		{
			file: 'dist/bundle.esm.js',
			format: 'esm', 
			sourcemap: true
		}
	],
	plugins: [
		typescript({
			tsconfig: './tsconfig.json',
			sourceMap: true
		}),
		preserveDirectives()
	],
	external: ['react', 'react-dom', 'react/jsx-runtime'] // external libraries to exclude from the bundle
};