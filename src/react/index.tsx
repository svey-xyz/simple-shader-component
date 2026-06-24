'use client'

import { useEffect, useRef, type CanvasHTMLAttributes } from "react";
import { Shader } from "../core";
import type { ShaderArgs } from "../types";

const prefersReducedMotion = (): boolean =>
	typeof window !== "undefined" &&
	typeof window.matchMedia === "function" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type SimpleShaderCanvasProps = {
	/**
	 * Shader configuration. Changing `uniforms` is reconciled in place (no
	 * teardown); changing `vertShader`/`fragShader`/`hooks`/`loadedClass`/
	 * `autoStart` recreates the instance, so memoize those to keep them stable.
	 */
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
	// Latest args, read inside the creation effect so it can see current uniforms
	// without listing `args` as a dependency (which would recreate on any change).
	const argsRef = useRef(args);
	argsRef.current = args;

	// Create the instance and tear it down on unmount or when a *structural* part
	// of `args` changes. Structural = anything that requires recompiling the
	// program or rebinding listeners: the shader sources, hooks, and the
	// loadedClass/autoStart options. Uniform-value changes are deliberately NOT
	// here — they are reconciled in place by the effect below, so updating a
	// uniform no longer churns the WebGL context (issue #6).
	//
	// This is also the leak fix: the previous version never destroyed the
	// instance, leaking a rAF loop + window/canvas listeners on every re-render
	// (critical under Visual Editing re-renders).
	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;

		const reduce = respectReducedMotion && prefersReducedMotion();
		reduceRef.current = reduce;

		const shader = new Shader(canvas, { ...argsRef.current, autoStart: !reduce && !paused });
		shaderRef.current = shader;
		shader.init();

		return () => {
			shader.destroy();
			shaderRef.current = null;
		};
		// `paused` is handled by a dedicated effect so toggling it pauses in place
		// instead of recreating the WebGL context; `args.uniforms` is handled by
		// the reconcile effect below for the same reason.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [args.vertShader, args.fragShader, args.loadedClass, args.autoStart, args.hooks, respectReducedMotion]);

	// Reconcile uniform values in place. Runs on mount (after init, harmlessly
	// re-applying the initial set) and whenever the `uniforms` array identity
	// changes — without destroying or recompiling anything.
	useEffect(() => {
		const shader = shaderRef.current;
		if (!shader || !args.uniforms) return;
		shader.setUniforms(args.uniforms);
	}, [args.uniforms]);

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
