/**
 * Core suite — verifies the Shader constructor fails with a typed, catchable
 * error (not an opaque null-deref TypeError) when getContext returns null,
 * i.e. WebGL is unavailable. See issue #9.
 */
import { test, expect } from "bun:test";
import { Shader, WebGLUnavailableError } from "../../src/core";

const args = { vertShader: "v", fragShader: "f", autoStart: false };

/** A canvas whose getContext always returns null (WebGL unavailable). */
function makeNullCanvas(): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	(canvas as any).getContext = () => null;
	document.body.appendChild(canvas);
	return canvas;
}

test("constructor throws WebGLUnavailableError when getContext returns null", () => {
	const canvas = makeNullCanvas();
	expect(() => new Shader(canvas, args)).toThrow(WebGLUnavailableError);
});

test("the thrown error is a real Error with an actionable message", () => {
	const canvas = makeNullCanvas();
	try {
		new Shader(canvas, args);
		throw new Error("expected constructor to throw");
	} catch (err) {
		expect(err).toBeInstanceOf(WebGLUnavailableError);
		expect(err).toBeInstanceOf(Error);
		expect((err as Error).name).toBe("WebGLUnavailableError");
		expect((err as Error).message).toContain("WebGL");
		// Not the opaque null-deref it replaces.
		expect((err as Error).message).not.toContain("Cannot read properties of null");
	}
});

test("falls back to experimental-webgl before failing", () => {
	const canvas = document.createElement("canvas");
	const ids: string[] = [];
	(canvas as any).getContext = (id: string) => {
		ids.push(id);
		return null; // both attempts fail
	};
	document.body.appendChild(canvas);

	expect(() => new Shader(canvas, args)).toThrow(WebGLUnavailableError);
	expect(ids).toEqual(["webgl", "experimental-webgl"]);
});
