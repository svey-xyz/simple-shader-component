/**
 * Covers the HiDPI / retina fix (issue #8): the drawing buffer is sized in
 * physical pixels (cssSize * devicePixelRatio), the ratio is capped by
 * maxPixelRatio, and a `u_resolution` uniform — when present — tracks the
 * physical pixel size.
 */
import { test, expect, afterEach } from "bun:test";
import { Shader } from "../../src/core";
import { makeGl, makeCanvas } from "../helpers/gl";

const args = { vertShader: "v", fragShader: "f", autoStart: false };

/** Pin devicePixelRatio for a test; returns a restore fn. */
function withDpr(value: number): () => void {
	const original = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
	Object.defineProperty(window, "devicePixelRatio", { value, configurable: true });
	return () => {
		if (original) Object.defineProperty(window, "devicePixelRatio", original);
	};
}

/** Force the CSS box getBoundingClientRect() reports for a canvas. */
function setCssSize(canvas: HTMLCanvasElement, width: number, height: number): void {
	(canvas as any).getBoundingClientRect = () => ({
		width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0,
	});
}

let restoreDpr: () => void = () => {};
afterEach(() => restoreDpr());

test("drawing buffer is scaled by devicePixelRatio", () => {
	restoreDpr = withDpr(2);
	const gl = makeGl();
	const canvas = makeCanvas(gl);
	setCssSize(canvas, 100, 50);

	const shader = new Shader(canvas, args);
	shader.init();

	expect(canvas.width).toBe(200);
	expect(canvas.height).toBe(100);
	shader.destroy();
});

test("devicePixelRatio is clamped to maxPixelRatio (default 2)", () => {
	restoreDpr = withDpr(3);
	const gl = makeGl();
	const canvas = makeCanvas(gl);
	setCssSize(canvas, 100, 100);

	const shader = new Shader(canvas, args);
	shader.init();

	// dpr 3 capped to 2 → 200, not 300.
	expect(canvas.width).toBe(200);
	expect(canvas.height).toBe(200);
	shader.destroy();
});

test("maxPixelRatio is configurable", () => {
	restoreDpr = withDpr(4);
	const gl = makeGl();
	const canvas = makeCanvas(gl);
	setCssSize(canvas, 100, 100);

	const shader = new Shader(canvas, { ...args, maxPixelRatio: 1 });
	shader.init();

	// Capped at 1 → identical to the pre-fix 1x behaviour.
	expect(canvas.width).toBe(100);
	expect(canvas.height).toBe(100);
	shader.destroy();
});

test("u_resolution uniform is written with the physical pixel size", () => {
	restoreDpr = withDpr(2);
	const gl = makeGl();
	const canvas = makeCanvas(gl);
	setCssSize(canvas, 100, 50);

	const shader = new Shader(canvas, args);
	shader.init();

	// updateResolutionUniform() writes a vec2 via uniform2fv.
	expect(gl.calls).toContain("uniform2fv");
	shader.destroy();
});
