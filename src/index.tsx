'use client'

import React, { useRef, useEffect } from "react";
import { Shader } from "./shader";

export const ShaderComponent = ({
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
		const myClassInstance = new Shader(ref.current, args);
	}, []);
	
	return (
		<canvas
			ref={ref}
			className={`${className} ${loadedClass}`}
			style={{ width: '100%' }}
		/>
	)
}
