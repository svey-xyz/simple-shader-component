/**
 * Auto-pause suite — verifies the opt-in offscreen (IntersectionObserver) and
 * tab-hidden (Page Visibility API) behaviour added in #5. These props default
 * off, so the existing component suite already covers the unchanged path.
 *
 * Observability trick: a stopped loop paints nothing (even if a stray rAF fires,
 * the loop body early-returns), so a redundant pause event leaves the draw count
 * flat. Resuming calls `startLoop()`, which paints at least one synchronous frame
 * (plus possibly an rAF tick), so the count strictly grows. That lets us assert
 * start/stop deterministically without having to drive rAF precisely.
 */
import { test, expect, beforeEach, afterEach } from "bun:test";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SimpleShaderCanvas } from "../../src/react";
import { makeGl, type RecordingGl } from "../helpers/gl";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let gl: RecordingGl;
(HTMLCanvasElement.prototype as any).getContext = function () {
	return gl;
};

const args = { vertShader: "v", fragShader: "f" };

// --- Mock IntersectionObserver: capture instances so tests can fire entries. ---
type IOInstance = {
	cb: IntersectionObserverCallback;
	options?: IntersectionObserverInit;
	observed: Element[];
	disconnected: boolean;
	fire(isIntersecting: boolean): void;
};
let observers: IOInstance[] = [];
class MockIO {
	cb: IntersectionObserverCallback;
	options?: IntersectionObserverInit;
	observed: Element[] = [];
	disconnected = false;
	constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		this.cb = cb;
		this.options = options;
		observers.push(this as unknown as IOInstance);
	}
	observe(el: Element) {
		this.observed.push(el);
	}
	unobserve() {}
	disconnect() {
		this.disconnected = true;
	}
	takeRecords() {
		return [];
	}
	fire(isIntersecting: boolean) {
		this.cb([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
	}
}

// --- Mutable document.hidden / visibilityState backing. ---
let hiddenValue = false;
function setHidden(v: boolean) {
	hiddenValue = v;
}

let root: Root;
let host: HTMLDivElement;
let originalIO: typeof IntersectionObserver;

beforeEach(() => {
	gl = makeGl();
	observers = [];
	hiddenValue = false;
	originalIO = (globalThis as any).IntersectionObserver;
	(globalThis as any).IntersectionObserver = MockIO as unknown as typeof IntersectionObserver;
	Object.defineProperty(document, "hidden", { configurable: true, get: () => hiddenValue });
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		get: () => (hiddenValue ? "hidden" : "visible"),
	});
	document.body.innerHTML = "";
	host = document.createElement("div");
	document.body.appendChild(host);
	root = createRoot(host);
});

afterEach(() => {
	(globalThis as any).IntersectionObserver = originalIO;
});

const render = (ui: ReactNode) => act(async () => root.render(ui));
const unmount = () => act(async () => root.unmount());
const countDraw = () => gl.calls.filter((c) => c === "drawArrays").length;

test("pauseWhenOffscreen observes the canvas with the default rootMargin", async () => {
	await render(<SimpleShaderCanvas args={args} pauseWhenOffscreen />);
	expect(observers.length).toBe(1);
	expect(observers[0].observed[0]).toBe(host.querySelector("canvas"));
	expect(observers[0].options?.rootMargin).toBe("128px");
	await unmount();
});

test("offscreenRootMargin overrides the IntersectionObserver rootMargin", async () => {
	await render(<SimpleShaderCanvas args={args} pauseWhenOffscreen offscreenRootMargin="256px" />);
	expect(observers[0].options?.rootMargin).toBe("256px");
	await unmount();
});

test("no IntersectionObserver is created unless pauseWhenOffscreen is set", async () => {
	await render(<SimpleShaderCanvas args={args} />);
	expect(observers.length).toBe(0);
	await unmount();
});

test("leaving the viewport stops the loop; re-entering resumes it", async () => {
	await render(<SimpleShaderCanvas args={args} pauseWhenOffscreen />);
	const io = observers[0];

	// Leaving the viewport stops the loop.
	await act(async () => io.fire(false));
	const stopped = countDraw();

	// While stopped, a redundant offscreen event must not paint.
	await act(async () => io.fire(false));
	expect(countDraw()).toBe(stopped);

	// Re-entering resumes: startLoop() paints at least one frame, which only
	// happens because the loop had actually been stopped.
	await act(async () => io.fire(true));
	expect(countDraw()).toBeGreaterThan(stopped);

	await unmount();
});

test("tab hidden stops the loop; becoming visible resumes it", async () => {
	await render(<SimpleShaderCanvas args={args} pauseWhenHidden />);

	setHidden(true);
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
	const stopped = countDraw();

	// Still hidden: a redundant event must not paint.
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
	expect(countDraw()).toBe(stopped);

	setHidden(false);
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
	// Becoming visible resumes → the loop had genuinely been stopped.
	expect(countDraw()).toBeGreaterThan(stopped);

	await unmount();
});

test("mounting while the tab is hidden does not auto-start the loop", async () => {
	setHidden(true);
	await render(<SimpleShaderCanvas args={args} pauseWhenHidden />);
	// init() paints one static frame via resize(), but the loop never starts.
	const initial = countDraw();

	// Still hidden: a redundant visibility event must not paint.
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
	expect(countDraw()).toBe(initial);

	// Becoming visible starts the loop → count grows.
	setHidden(false);
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
	expect(countDraw()).toBeGreaterThan(initial);
	await unmount();
});

test("auto-pause never recreates the instance (no GL context churn)", async () => {
	await render(<SimpleShaderCanvas args={args} pauseWhenOffscreen pauseWhenHidden />);
	const io = observers[0];

	await act(async () => io.fire(false));
	setHidden(true);
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
	setHidden(false);
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
	await act(async () => io.fire(true));

	// No teardown happened while toggling visibility/intersection.
	expect(gl.calls).not.toContain("deleteProgram");
	await unmount();
});

test("explicit paused overrides becoming visible / on-screen", async () => {
	await render(<SimpleShaderCanvas args={args} paused pauseWhenOffscreen pauseWhenHidden />);
	const io = observers[0];
	const baseline = countDraw(); // paused: init paints one static frame, loop never ran

	// Coming on-screen / visible must NOT start the loop while paused is true.
	await act(async () => io.fire(true));
	setHidden(false);
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
	expect(countDraw()).toBe(baseline);

	await unmount();
});

test("disconnects the observer and removes the visibility listener on unmount", async () => {
	await render(<SimpleShaderCanvas args={args} pauseWhenOffscreen pauseWhenHidden />);
	const io = observers[0];
	await unmount();

	expect(io.disconnected).toBe(true);

	// A post-unmount visibility event must not paint (listener removed, and the
	// shader is destroyed regardless).
	const after = countDraw();
	setHidden(true);
	document.dispatchEvent(new Event("visibilitychange"));
	expect(countDraw()).toBe(after);
});
