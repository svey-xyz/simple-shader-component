import { render, screen } from '@testing-library/react';
import { ShaderComponent } from '../src';
import React from 'react';

import { setupJestCanvasMock } from 'jest-webgl-canvas-mock';

beforeEach(() => {
	jest.resetAllMocks();
	setupJestCanvasMock();
});
// Mock Shader class since it's not fully defined
// jest.mock('../src', () => ({
// 	Shader: jest.fn().mockImplementation(() => ({
// 		init: jest.fn(),
// 	})),
// }));

describe('ShaderComponent', () => {
	const args = { /* mock shader args */ };

	it('renders the canvas and initializes Shader', () => {
		const screen = render(<ShaderComponent data-testid='canvas' args={args} />);
		const canvas = screen.container.querySelector('canvas')
		// const canvas = screen.getByTestId('canvas');
		expect(canvas).toBeInTheDocument();
		expect(canvas).toHaveClass('loaded'); // default loadedClass
	});

	it('applies custom className and loadedClass', () => {
		const screen = render(<ShaderComponent data-testid='canvas' args={args} className="test-class" loadedClass="custom-loaded" />);
		const canvas = screen.container.querySelector('canvas')

		// const canvas = screen.getByTestId('canvas');
		expect(canvas).toHaveClass('test-class');
		expect(canvas).toHaveClass('custom-loaded');
	});
});