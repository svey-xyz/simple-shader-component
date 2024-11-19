import '@testing-library/jest-dom';
import { SimpleShaderCanvas } from '../src/core';
import { setupJestCanvasMock } from 'jest-webgl-canvas-mock';

beforeEach(() => {
	jest.resetAllMocks();
	setupJestCanvasMock();
});

describe('CoreShader', () => {
	const args = { /* mock shader args */ };
	const canvas = document.createElement('canvas');
	canvas.width = 800
	canvas.height = 400

	it('initializes Shader', () => {
		const shader = new SimpleShaderCanvas(canvas, args)
		shader.init()

		expect(shader).toBeDefined()
		expect(shader.getElapsedTime()).toBeGreaterThan(0);
	});

	it('runs custom logic', () => {
		const initLogic = (shader: SimpleShaderCanvas) => {
			throw new Error("Throw to test custom logic has run")
		}

		const customLogicArgs = { 
			logic: {
				init: initLogic.toString()
			}
		 };

		const shader = new SimpleShaderCanvas(canvas, customLogicArgs)

		expect(() => { shader.init() }).toThrow("Throw to test custom logic has run")
	});

	it('uniforms are set properly', () => {
		const testVertShader = 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }'
		const testFragShader = 'precision mediump float; uniform float u_test; void main() { gl_FragColor = vec4(u_test, 0.0, 0.0, 0.0); }'

		const testUniforms: Array<UniformValue> = [
			{
				name: 'u_test',
				type: 'float',
				value: 3.0
			},
		]

		const customUniformArgs: shaderArgs = {
			uniforms: testUniforms,
			vertShader: testVertShader,
			fragShader: testFragShader
		}

		const shader = new SimpleShaderCanvas(canvas, customUniformArgs)
		shader.init()

		expect(shader.getUniform('u_test')).not.toBeNull(); // mock doesn't save and return values
	});
});