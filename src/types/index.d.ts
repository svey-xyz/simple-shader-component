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
	 * Opt in to a WebGL2 context (GLSL ES 3.00). Default false (WebGL1 /
	 * GLSL ES 1.00 — unchanged for existing consumers).
	 *
	 * When true the context is created with `getContext('webgl2')`, falling
	 * back to `getContext('webgl')` if WebGL2 is unavailable — so a WebGL1
	 * shader keeps rendering even on a browser without WebGL2.
	 *
	 * GLSL ES 3.00 shaders **must** declare `#version 300 es` on the very first
	 * line, and use `in`/`out` instead of `attribute`/`varying` and a
	 * user-declared `out vec4` colour instead of `gl_FragColor`. The full-screen
	 * quad `a_position` (vec2) attribute contract is unchanged.
	 */
	webgl2?: boolean
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
