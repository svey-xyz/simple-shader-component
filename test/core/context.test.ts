/**
 * Context-selection suite — verifies the opt-in WebGL2 path and its WebGL1
 * fallback without changing behaviour for the default (WebGL1) consumers.
 */
import { test, expect } from "bun:test";
import { Shader } from "../../src/core";
import { makeGl } from "../helpers/gl";

const args = { vertShader: "v", fragShader: "f", autoStart: false };

/**
 * A canvas whose getContext records the requested context type and answers
 * from a caller-supplied map (null = unsupported), so we can assert which
 * context the Shader asks for and exercise the fallback.
 */
function makeCanvasSpy(supported: Record<string, unknown>) {
	const requested: string[] = [];
	const canvas = document.createElement("canvas");
	(canvas as any).getContext = (type: string) => {
		requested.push(type);
		return supported[type] ?? null;
	};
	document.body.appendChild(canvas);
	return { canvas, requested };
}

test("default (no webgl2) requests a 'webgl' context only", () => {
	const gl = makeGl();
	const { canvas, requested } = makeCanvasSpy({ webgl: gl });
	const shader = new Shader(canvas, args);
	shader.init();
	expect(requested).toEqual(["webgl"]);
	shader.destroy();
});

test("webgl2: true requests a 'webgl2' context", () => {
	const gl = makeGl();
	const { canvas, requested } = makeCanvasSpy({ webgl2: gl });
	const shader = new Shader(canvas, { ...args, webgl2: true });
	shader.init();
	expect(requested).toEqual(["webgl2"]);
	shader.destroy();
});

test("webgl2: true falls back to 'webgl' when WebGL2 is unavailable", () => {
	const gl = makeGl();
	const { canvas, requested } = makeCanvasSpy({ webgl: gl }); // webgl2 -> null
	const shader = new Shader(canvas, { ...args, webgl2: true });
	shader.init();
	expect(requested).toEqual(["webgl2", "webgl"]); // tried webgl2, then fell back
	shader.destroy();
});

test("throws when no context can be acquired", () => {
	const { canvas } = makeCanvasSpy({}); // neither webgl2 nor webgl supported
	expect(() => new Shader(canvas, { ...args, webgl2: true })).toThrow();
});
