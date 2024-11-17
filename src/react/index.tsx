'use client'

import React, { useRef, useEffect } from "react";
import { SimpleShader } from "../core";

export const ReactSimpleShader = ({
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
		
		const ShaderInstance = new SimpleShader(ref.current, args);
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
