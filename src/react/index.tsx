'use client'

import { useRef, useEffect } from "react";
import { Shader } from "../core";
import { ShaderArgs } from "../types";

export const SimpleShaderCanvas = ({
	args,
	className
}: {
	args: ShaderArgs,
	className?: string
}) => {

	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!ref.current) return

		const ShaderInstance = new Shader(ref.current, args);
		ShaderInstance.init()

		// return () => ShaderInstance. // TODO: ShaderInstance should be destroyed on return 
	}, [args]);

	return (
		<canvas
			ref={ref}
			className={`${className}`}
			style={{ width: '100%' }}
		/>
	)
}
