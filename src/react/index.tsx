'use client'

import React, { useRef, useEffect } from "react";
import { SimpleShaderCanvas as SimpleShaderCore } from "../core";
import { shaderArgs } from "../types";

export const SimpleShaderCanvas = ({
		args,
		className,
		loadedClass = 'loaded'
	}: {
		args: shaderArgs,
		className?: string,
		loadedClass?: string
	}) => {

	const ref = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		if (!ref.current) return
		
		const ShaderInstance = new SimpleShaderCore(ref.current, args);
		ShaderInstance.init()

		// return () => ShaderInstance. // TODO: ShaderInstance should be destroyed on return 
	}, [args]);
	
	return (
		<canvas
			ref={ref}
			className={`${className} ${loadedClass}`}
			style={{ width: '100%' }}
		/>
	)
}
