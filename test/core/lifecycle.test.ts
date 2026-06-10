/**
 * Vanilla HTML/JS suite — exercises the core Shader class against a real DOM
 * (happy-dom): element creation, event listeners, hooks and teardown, the way
 * a framework-less consumer would use it.
 */
import { test, expect } from "bun:test";
import { Shader, MethodName } from "../../src/core";
import { makeGl, makeCanvas } from "../helpers/gl";

const args = { vertShader: "v", fragShader: "f", autoStart: false };

test("init applies initial uniforms, renders a first frame and marks the canvas loaded", () => {
	const gl = makeGl();
	const canvas = makeCanvas(gl);
	const shader = new Shader(canvas, {
		...args,
		uniforms: [{ name: "u_time", type: "float", value: 0 }],
	});
	shader.init();

	expect(gl.calls).toContain("uniform1f"); // initial uniform applied pre-paint
	expect(gl.calls).toContain("viewport"); // resized
	expect(gl.calls).toContain("drawArrays"); // first frame rendered
	expect(canvas.classList.contains("loaded")).toBe(true);
	shader.destroy();
});

test("a custom loadedClass is honoured", () => {
	const gl = makeGl();
	const canvas = makeCanvas(gl);
	const shader = new Shader(canvas, { ...args, loadedClass: "shader-ready" });
	shader.init();
	expect(canvas.classList.contains("shader-ready")).toBe(true);
	expect(canvas.classList.contains("loaded")).toBe(false);
	shader.destroy();
});

test("INIT and RESIZE hooks run during init, INPUT hooks on real DOM events", () => {
	const gl = makeGl();
	const canvas = makeCanvas(gl);
	const ran: string[] = [];
	const shader = new Shader(canvas, {
		...args,
		hooks: [
			{ methodName: MethodName.INIT, hook: () => ran.push("init") },
			{ methodName: MethodName.RESIZE, hook: () => ran.push("resize") },
			{ methodName: MethodName.INPUT, hook: () => ran.push("input") },
		],
	});
	shader.init();
	expect(ran).toEqual(["init", "resize"]);

	canvas.dispatchEvent(new Event("click"));
	canvas.dispatchEvent(new Event("mousemove"));
	expect(ran).toEqual(["init", "resize", "input", "input"]);
	shader.destroy();
});

test("hooks receive the shader instance", () => {
	const gl = makeGl();
	const canvas = makeCanvas(gl);
	let received: unknown;
	const shader = new Shader(canvas, {
		...args,
		hooks: [{ methodName: MethodName.INIT, hook: (s: unknown) => (received = s) }],
	});
	shader.init();
	expect(received).toBe(shader);
	shader.destroy();
});

test("destroy removes DOM listeners, releases GL resources and is idempotent", () => {
	const gl = makeGl();
	const canvas = makeCanvas(gl);
	const ran: string[] = [];
	const shader = new Shader(canvas, {
		...args,
		hooks: [{ methodName: MethodName.INPUT, hook: () => ran.push("input") }],
	});
	shader.init();
	shader.destroy();

	canvas.dispatchEvent(new Event("click"));
	expect(ran).toEqual([]); // listener gone
	expect(gl.calls).toContain("deleteProgram");
	expect(gl.calls).toContain("deleteBuffer");

	shader.destroy(); // second call must not throw
});

test("destroy keeps the canvas's context usable — a new Shader on the same canvas works", () => {
	const gl = makeGl();
	const canvas = makeCanvas(gl);

	const first = new Shader(canvas, args);
	first.init();
	first.destroy();

	// destroy() must not lose the context: the same canvas always returns the
	// same context, so a lost context would permanently kill every subsequent
	// instance (React wrapper recreations, Strict Mode dev remounts).
	expect(gl.calls).not.toContain("loseContext");

	gl.calls.length = 0;
	const second = new Shader(canvas, args);
	second.init();
	expect(gl.calls).toContain("drawArrays"); // renders again on the reused context
	second.destroy();
});
