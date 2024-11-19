// import '@testing-library/jest-dom';

import { render } from '@testing-library/react';
import { SimpleShaderCanvas } from '../src/react';
// import React from 'react';
// import { setupJestCanvasMock } from 'jest-webgl-canvas-mock';
import { describe, expect, test, beforeAll } from "bun:test";
// beforeEach(() => {
// 	jest.resetAllMocks();
// 	setupJestCanvasMock();
// });

describe('ReactSimpleShaderComponent', () => {
	const args = { /* mock shader args */ };

	test('renders the canvas and initializes Shader', () => {
		const screen = render(<SimpleShaderCanvas args={args} />);
		const canvas = screen.container.querySelector('canvas')

		expect(canvas).toBeInTheDocument();
		expect(canvas).toHaveClass('loaded'); // default loadedClass
	});

	test('applies custom className and loadedClass', () => {
		const screen = render(<SimpleShaderCanvas args={args} className="test-class" loadedClass="custom-loaded" />);
		const canvas = screen.container.querySelector('canvas')

		expect(canvas).toHaveClass('test-class');
		expect(canvas).toHaveClass('custom-loaded');
	});
});