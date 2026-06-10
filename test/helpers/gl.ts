/**
 * Minimal WebGL mock shared by every suite. happy-dom has no WebGL
 * implementation, so canvases are patched to return this. It records the
 * calls the library makes (program binds, uniform writes, draws, cleanup)
 * so tests can assert on behaviour and call order.
 */
export type RecordingGl = WebGLRenderingContext & { calls: string[] };

export function makeGl(): RecordingGl {
	const calls: string[] = [];
	const record =
		(name: string) =>
		(..._args: unknown[]) => {
			calls.push(name);
		};
	const loc = {};

	return {
		calls,
		// program / shader setup
		createShader: () => ({}),
		shaderSource() {},
		compileShader() {},
		getShaderParameter: () => true,
		getShaderInfoLog: () => "",
		deleteShader() {},
		createProgram: () => ({ id: "prog" }),
		attachShader() {},
		linkProgram() {},
		getProgramParameter: () => true,
		getProgramInfoLog: () => "",
		// buffers
		createBuffer: () => ({}),
		bindBuffer() {},
		bufferData() {},
		// uniforms
		getUniformLocation: () => loc,
		getUniform: () => 0,
		useProgram: record("useProgram"),
		uniform1f: record("uniform1f"),
		uniform1i: record("uniform1i"),
		uniform2fv: record("uniform2fv"),
		uniform3fv: record("uniform3fv"),
		uniform4fv: record("uniform4fv"),
		uniform2iv: record("uniform2iv"),
		uniform3iv: record("uniform3iv"),
		uniform4iv: record("uniform4iv"),
		uniformMatrix2fv: record("uniformMatrix2fv"),
		uniformMatrix3fv: record("uniformMatrix3fv"),
		uniformMatrix4fv: record("uniformMatrix4fv"),
		// drawing
		getAttribLocation: () => 0,
		vertexAttribPointer() {},
		enableVertexAttribArray() {},
		drawArrays: record("drawArrays"),
		clear() {},
		viewport: record("viewport"),
		// teardown — expose a recording WEBGL_lose_context so suites can assert
		// destroy() never loses the context (the canvas/context gets reused).
		getExtension: (name: string) =>
			name === "WEBGL_lose_context" ? { loseContext: record("loseContext") } : null,
		deleteProgram: record("deleteProgram"),
		deleteBuffer: record("deleteBuffer"),
		// enums
		ARRAY_BUFFER: 0,
		STATIC_DRAW: 0,
		VERTEX_SHADER: 1,
		FRAGMENT_SHADER: 2,
		COMPILE_STATUS: 0,
		LINK_STATUS: 0,
		COLOR_BUFFER_BIT: 0,
		DEPTH_BUFFER_BIT: 0,
		STENCIL_BUFFER_BIT: 0,
		FLOAT: 0,
		TRIANGLES: 0,
	} as unknown as RecordingGl;
}

/** Real happy-dom canvas patched to hand out the recording GL context. */
export function makeCanvas(gl: RecordingGl): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	(canvas as any).getContext = () => gl;
	document.body.appendChild(canvas);
	return canvas;
}
