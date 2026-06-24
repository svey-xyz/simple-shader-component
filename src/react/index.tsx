'use client'

import { useEffect, useRef, useState, type CanvasHTMLAttributes, type ReactNode } from "react";
import { Shader, WebGLUnavailableError } from "../core";
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
	 * Called when the WebGL context can't be created (WebGL disabled, no GPU,
	 * blocklisted driver, too many live contexts). Receives the underlying
	 * error. Use it to log/report; the component renders `fallback` either way
	 * and never throws.
	 */
	onUnsupported?: (error: Error) => void;
	/**
	 * Rendered in place of the canvas when WebGL is unavailable — e.g. a static
	 * gradient or image. Falls back to `children` if not provided; if neither is
	 * given, nothing is rendered (the page still doesn't crash).
	 */
	fallback?: ReactNode;
} & CanvasHTMLAttributes<HTMLCanvasElement>;

export const SimpleShaderCanvas = ({
	args,
	paused = false,
	respectReducedMotion = false,
	onUnsupported,
	fallback,
	children,
	className,
	style,
	...rest
}: SimpleShaderCanvasProps) => {
	const ref = useRef<HTMLCanvasElement>(null);
	const shaderRef = useRef<Shader | null>(null);
	const reduceRef = useRef(false);
	// Flips to true when context creation fails so we render the fallback
	// instead of an unusable canvas. WebGL support doesn't change within a
	// session, so once unsupported we stay on the fallback.
	const [unsupported, setUnsupported] = useState(false);

	// Create the instance for the current canvas + args and tear it down on
	// unmount or when `args` changes. This is the leak fix: the previous
	// version never destroyed the instance, leaking a rAF loop + window/canvas
	// listeners on every re-render (critical under Visual Editing re-renders).
	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;

		const reduce = respectReducedMotion && prefersReducedMotion();
		reduceRef.current = reduce;

		let shader: Shader;
		try {
			shader = new Shader(canvas, { ...args, autoStart: !reduce && !paused });
		} catch (error) {
			// WebGL couldn't be initialised. Degrade gracefully: warn, notify the
			// consumer and render the fallback instead of crashing the page.
			const err =
				error instanceof Error ? error : new WebGLUnavailableError(String(error));
			console.warn(
				"[simple-shader-component] WebGL is unavailable; rendering fallback instead of a shader canvas.",
				err,
			);
			setUnsupported(true);
			onUnsupported?.(err);
			return;
		}

		setUnsupported(false);
		shaderRef.current = shader;
		shader.init();

		return () => {
			shader.destroy();
			shaderRef.current = null;
		};
		// `paused` is handled by the effect below so toggling it pauses in place
		// instead of recreating the WebGL context.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [args, respectReducedMotion]);

	// Pause / resume without recreating the instance.
	useEffect(() => {
		const shader = shaderRef.current;
		if (!shader || reduceRef.current) return;
		if (paused) shader.stopLoop();
		else shader.startLoop();
	}, [paused]);

	if (unsupported) {
		return <>{fallback ?? children ?? null}</>;
	}

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
