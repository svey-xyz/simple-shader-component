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
} & CanvasHTMLAttributes<HTMLCanvasElement>;

export const SimpleShaderCanvas = ({
	args,
	paused = false,
	respectReducedMotion = false,
	className,
	style,
	...rest
}: SimpleShaderCanvasProps) => {
	const ref = useRef<HTMLCanvasElement>(null);
	const shaderRef = useRef<Shader | null>(null);
	const reduceRef = useRef(false);

	// Create the instance for the current canvas + args and tear it down on
	// unmount or when `args` changes. This is the leak fix: the previous
	// version never destroyed the instance, leaking a rAF loop + window/canvas
	// listeners on every re-render (critical under Visual Editing re-renders).
	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;

		const reduce = respectReducedMotion && prefersReducedMotion();
		reduceRef.current = reduce;

		const shader = new Shader(canvas, { ...args, autoStart: !reduce && !paused });
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
