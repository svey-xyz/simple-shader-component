'use client'

import { useEffect, useRef, type CanvasHTMLAttributes } from "react";
import { Shader } from "../core";
import type { ShaderArgs } from "../types";

const prefersReducedMotion = (): boolean =>
	typeof window !== "undefined" &&
	typeof window.matchMedia === "function" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type SimpleShaderCanvasProps = {
	/** Shader configuration. Memoize this — a new object reference recreates the instance. */
	args: ShaderArgs;
	/** Pause the render loop without unmounting. Default false. */
	paused?: boolean;
	/** Skip auto-starting the loop when the user prefers reduced motion. Default false. */
	respectReducedMotion?: boolean;
	/**
	 * Auto-pause the loop while the canvas is scrolled out of the viewport (via
	 * `IntersectionObserver`) and resume when it re-enters. Replaces the manual
	 * IO plumbing consumers used to wire up themselves. Default false.
	 */
	pauseWhenOffscreen?: boolean;
	/**
	 * Auto-pause the loop while the tab/document is hidden (Page Visibility API)
	 * and resume when it becomes visible again. Default false.
	 */
	pauseWhenHidden?: boolean;
	/** `rootMargin` for the offscreen `IntersectionObserver`. Default `'128px'`. */
	offscreenRootMargin?: string;
} & CanvasHTMLAttributes<HTMLCanvasElement>;

export const SimpleShaderCanvas = ({
	args,
	paused = false,
	respectReducedMotion = false,
	pauseWhenOffscreen = false,
	pauseWhenHidden = false,
	offscreenRootMargin = "128px",
	className,
	style,
	...rest
}: SimpleShaderCanvasProps) => {
	const ref = useRef<HTMLCanvasElement>(null);
	const shaderRef = useRef<Shader | null>(null);
	const reduceRef = useRef(false);
	// Live auto-pause state, tracked in refs so observer/visibility callbacks can
	// drive the loop without triggering a React re-render.
	const offscreenRef = useRef(false);
	const hiddenRef = useRef(false);

	// Create the instance for the current canvas + args and tear it down on
	// unmount or when `args` changes. This is the leak fix: the previous
	// version never destroyed the instance, leaking a rAF loop + window/canvas
	// listeners on every re-render (critical under Visual Editing re-renders).
	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;

		const reduce = respectReducedMotion && prefersReducedMotion();
		reduceRef.current = reduce;

		// Don't auto-start a frame while the tab is already hidden. Offscreen
		// can't be known synchronously — the IntersectionObserver in the effect
		// below corrects it within ~1 frame, with no GL context recreation.
		const hidden =
			pauseWhenHidden && typeof document !== "undefined" && document.hidden;
		hiddenRef.current = hidden;

		const shader = new Shader(canvas, {
			...args,
			autoStart: !reduce && !paused && !hidden,
		});
		shaderRef.current = shader;
		shader.init();

		return () => {
			shader.destroy();
			shaderRef.current = null;
		};
		// `paused` and the auto-pause observers are handled by the effect below so
		// toggling them pauses in place instead of recreating the WebGL context.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [args, respectReducedMotion]);

	// Drive pause/resume from `paused` plus the opt-in offscreen / tab-hidden
	// observers — all without recreating the instance. Effective paused state is
	// `paused || (pauseWhenOffscreen && offscreen) || (pauseWhenHidden && hidden)`,
	// with reduced motion forcing the loop to stay stopped.
	useEffect(() => {
		const applyPlayState = () => {
			const shader = shaderRef.current;
			if (!shader || reduceRef.current) return;
			const shouldPause =
				paused ||
				(pauseWhenOffscreen && offscreenRef.current) ||
				(pauseWhenHidden && hiddenRef.current);
			if (shouldPause) shader.stopLoop();
			else shader.startLoop();
		};

		let observer: IntersectionObserver | undefined;
		if (
			pauseWhenOffscreen &&
			ref.current &&
			typeof IntersectionObserver !== "undefined"
		) {
			observer = new IntersectionObserver(
				(entries) => {
					offscreenRef.current = !entries[entries.length - 1].isIntersecting;
					applyPlayState();
				},
				{ rootMargin: offscreenRootMargin },
			);
			observer.observe(ref.current);
		} else {
			offscreenRef.current = false;
		}

		const onVisibility = () => {
			hiddenRef.current = document.hidden;
			applyPlayState();
		};
		const trackHidden = pauseWhenHidden && typeof document !== "undefined";
		if (trackHidden) {
			hiddenRef.current = document.hidden;
			document.addEventListener("visibilitychange", onVisibility);
		} else {
			hiddenRef.current = false;
		}

		// Reconcile against the current props on mount and whenever they change.
		applyPlayState();

		return () => {
			observer?.disconnect();
			if (trackHidden) {
				document.removeEventListener("visibilitychange", onVisibility);
			}
		};
	}, [paused, pauseWhenOffscreen, pauseWhenHidden, offscreenRootMargin]);

	return (
		<canvas
			ref={ref}
			aria-hidden
			className={className}
			style={{ width: "100%", ...style }}
			{...rest}
		/>
	);
};

export default SimpleShaderCanvas;
