/**
 * React suite — mounts SimpleShaderCanvas with react-dom under happy-dom and
 * verifies the wrapper's contract: instance creation on mount, teardown on
 * unmount (the rAF/listener leak fix), and pause/resume without recreation.
 */
import { test, expect, beforeEach } from "bun:test";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MethodName } from "../../src/core";
import { SimpleShaderCanvas } from "../../src/react";
import { makeGl, type RecordingGl } from "../helpers/gl";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// React creates the canvas itself, so hand out the mock from the prototype.
let gl: RecordingGl;
(HTMLCanvasElement.prototype as any).getContext = function () {
	return gl;
};

const args = { vertShader: "v", fragShader: "f" };

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
	gl = makeGl();
	document.body.innerHTML = "";
	host = document.createElement("div");
	document.body.appendChild(host);
	root = createRoot(host);
});

const render = (ui: ReactNode) => act(async () => root.render(ui));
const unmount = () => act(async () => root.unmount());

test("mounts a canvas and initializes the shader", async () => {
	await render(<SimpleShaderCanvas args={args} paused data-testid="shader" />);

	const canvas = host.querySelector("canvas")!;
	expect(canvas).not.toBeNull();
	expect(canvas.getAttribute("aria-hidden")).toBe("true");
	expect(canvas.classList.contains("loaded")).toBe(true);
	expect(gl.calls).toContain("drawArrays"); // paused still paints one frame

	await unmount();
});

test("applies initial uniforms before first paint", async () => {
	await render(
		<SimpleShaderCanvas
			args={{ ...args, uniforms: [{ name: "u_time", type: "float", value: 0 }] }}
			paused
		/>,
	);
	const firstDraw = gl.calls.indexOf("drawArrays");
	const firstUniform = gl.calls.indexOf("uniform1f");
	expect(firstUniform).toBeGreaterThanOrEqual(0);
	expect(firstUniform).toBeLessThan(firstDraw);

	await unmount();
});

test("unmount destroys the shader and releases GL resources", async () => {
	await render(<SimpleShaderCanvas args={args} paused />);
	expect(gl.calls).not.toContain("deleteProgram");

	await unmount();
	expect(gl.calls).toContain("deleteProgram");
	expect(gl.calls).toContain("deleteBuffer");
});

test("unmount removes canvas listeners (no leaked input handlers)", async () => {
	const ran: unknown[] = [];
	await render(
		<SimpleShaderCanvas
			args={{ ...args, hooks: [{ methodName: MethodName.INPUT, hook: () => ran.push(1) }] }}
			paused
		/>,
	);
	const canvas = host.querySelector("canvas")!;
	canvas.dispatchEvent(new Event("click"));
	expect(ran.length).toBe(1);

	await unmount();
	canvas.dispatchEvent(new Event("click"));
	expect(ran.length).toBe(1); // unchanged after unmount
});

test("changing only uniform values updates in place without teardown (#6)", async () => {
	await render(
		<SimpleShaderCanvas
			args={{ ...args, uniforms: [{ name: "u_c", type: "float", value: 0 }] }}
			paused
		/>,
	);
	gl.calls.length = 0;

	// New args object, same shader sources, different uniform value.
	await render(
		<SimpleShaderCanvas
			args={{ ...args, uniforms: [{ name: "u_c", type: "float", value: 1 }] }}
			paused
		/>,
	);

	expect(gl.calls).not.toContain("deleteProgram"); // no teardown
	expect(gl.calls).toContain("uniform1f"); // value written in place

	await unmount();
});

test("changing the shader source recreates the instance (#6)", async () => {
	await render(<SimpleShaderCanvas args={{ vertShader: "v", fragShader: "f" }} paused />);
	expect(gl.calls).not.toContain("deleteProgram");

	await render(<SimpleShaderCanvas args={{ vertShader: "v2", fragShader: "f" }} paused />);
	expect(gl.calls).toContain("deleteProgram"); // old instance torn down

	await unmount();
});

test("toggling paused does not recreate the instance", async () => {
	await render(<SimpleShaderCanvas args={args} paused />);
	const programsCreated = () => gl.calls.filter((c) => c === "deleteProgram").length;

	await render(<SimpleShaderCanvas args={args} paused={false} />);
	await render(<SimpleShaderCanvas args={args} paused />);
	// Same args reference → effect must not re-run → nothing destroyed yet.
	expect(programsCreated()).toBe(0);

	await unmount();
});

test("renders fallback and calls onUnsupported when WebGL is unavailable (#9)", async () => {
	gl = null as unknown as RecordingGl; // getContext now returns null

	let received: Error | undefined;
	await render(
		<SimpleShaderCanvas
			args={args}
			paused
			onUnsupported={(err) => (received = err)}
			fallback={<div data-testid="fallback">no webgl</div>}
		/>,
	);

	// No crash; fallback rendered instead of a canvas.
	expect(host.querySelector("canvas")).toBeNull();
	expect(host.querySelector('[data-testid="fallback"]')?.textContent).toBe("no webgl");
	// Consumer notified with a real Error.
	expect(received).toBeInstanceOf(Error);
	expect(received?.name).toBe("WebGLUnavailableError");

	await unmount();
});

test("falls back to children when no fallback prop is given (#9)", async () => {
	gl = null as unknown as RecordingGl;

	await render(
		<SimpleShaderCanvas args={args} paused>
			<div data-testid="child-fallback">static</div>
		</SimpleShaderCanvas>,
	);

	expect(host.querySelector("canvas")).toBeNull();
	expect(host.querySelector('[data-testid="child-fallback"]')?.textContent).toBe("static");

	await unmount();
});
