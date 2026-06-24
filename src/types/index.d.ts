import { Shader as _Shader } from "../core"
import { MethodName as _MethodName } from "../core/domHandler";


export type Shader = _Shader;
export type MethodName = _MethodName;

export type ShaderHook = (shader: Shader, ...args: any[]) => void;

/**
 * @param logic Logic should be functions passed as strings that take the form (shader: Shader) => void
 * */
export type ShaderArgs = {
	vertShader?: string,
	fragShader?: string,
	uniforms?: Array<UniformValue>,
	hooks?: Array<{ methodName: MethodName, hook: ShaderHook }>,
	/** Default 'loaded' */
	loadedClass?: string,
	/** Start the render loop automatically inside init(). Default true. */
	autoStart?: boolean,
	/**
	 * Attributes forwarded verbatim to `canvas.getContext('webgl', contextAttributes)`.
	 *
	 * Output contract: the canvas is composited over the page using
	 * **premultiplied alpha** (`premultipliedAlpha: true`, the browser default).
	 * The color your fragment shader writes to `gl_FragColor` **must already be
	 * premultiplied** — i.e. multiply `rgb` by `a` yourself. Emitting
	 * straight (non-premultiplied) alpha produces light fringing where the
	 * canvas overlaps page content. Pass `premultipliedAlpha: false` if you'd
	 * rather output straight alpha instead.
	 *
	 * Relevant options:
	 * - `alpha` (default `true`) — set `false` for an opaque canvas (the shader
	 *   composites over an opaque black backdrop; cheaper and avoids any
	 *   premultiplied-alpha concerns).
	 * - `premultipliedAlpha` (default `true`) — see the output contract above.
	 * - `antialias` (default `true`) — multisample the drawing buffer.
	 * - `preserveDrawingBuffer` (default `false`) — keep the buffer between
	 *   frames; needed if you read it back (e.g. `toDataURL`/`readPixels`).
	 * - `depth`, `stencil`, `powerPreference`, `failIfMajorPerformanceCaveat`,
	 *   `desynchronized` — see {@link WebGLContextAttributes}.
	 */
	contextAttributes?: WebGLContextAttributes,
	/**
	 * Upper bound on the device pixel ratio used to size the drawing buffer on
	 * HiDPI / retina displays. The backing store is sized at
	 * `cssSize * min(window.devicePixelRatio, maxPixelRatio)`, so this caps fill
	 * cost on very high-DPR phones. Default 2.
	 */
	maxPixelRatio?: number
}

export type UniformValue = {
	name: string,
	type: UniformType,
	value: any
}

export type UniformType =
	| "float"
	| "vec2"
	| "vec3"
	| "vec4"
	| "int"
	| "ivec2"
	| "ivec3"
	| "ivec4"
	| "mat2"
	| "mat3"
	| "mat4";
