import typescript from '@rollup/plugin-typescript';
import preserveDirectives from 'rollup-preserve-directives'

export default {
	input: 'src/index.tsx',
	output: [
		{
			file: 'dist/bundle.js',
			format: 'cjs',         // CommonJS format for Node.js
			sourcemap: true        // Enable source maps for easier debugging
		},
		{
			file: 'dist/bundle.esm.js',
			format: 'esm',         // ES Module format for browsers
			sourcemap: true
		}
	],
	plugins: [
		typescript({           // Configure the TypeScript plugin
			tsconfig: './tsconfig.json',  // Point to your tsconfig.json
			sourceMap: true               // Enable source maps
		}),
		preserveDirectives()
	],
	external: ['react', 'react-dom', 'react/jsx-runtime'] // Example: external libraries to exclude from the bundle
};