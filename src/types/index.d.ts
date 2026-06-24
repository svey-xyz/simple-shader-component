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
