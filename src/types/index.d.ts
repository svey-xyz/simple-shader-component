import { Shader } from "../core"
import { MethodName } from "../core/domHandler";

declare namespace simpleShaderComponent {

	type ShaderHook = (shader: Shader, ...args: any[]) => void;

	/** 
	 * @param logic Logic should be functions passed as strings that take the form (shader: Shader) => void
	 * */
	type ShaderArgs = {
		vertShader?: string,
		fragShader?: string,
		uniforms?: Array<UniformValue>,
		hooks?: Array<{ methodName: MethodName, hook: ShaderHook }>
	}

	type UniformValue = {
		name: string,
		type: UniformType,
		value: any
	}

	type UniformType =
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
}

export = simpleShaderComponent;
export as namespace simpleShaderComponent;
