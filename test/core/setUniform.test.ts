import { test, expect } from "bun:test";
import { Shader } from "../../src/core";
import { makeGl, makeCanvas } from "../helpers/gl";

test("setUniform binds the program before writing", () => {
	const gl = makeGl();
	const shader = new Shader(makeCanvas(gl), { vertShader: "v", fragShader: "f" });
	shader.setUniform({ name: "u_time", type: "float", value: 1.5 });
	expect(gl.calls).toEqual(["useProgram", "uniform1f"]);
	shader.destroy();
});

test("setUniform dispatches every uniform type to the right gl call", () => {
	const gl = makeGl();
	const shader = new Shader(makeCanvas(gl), { vertShader: "v", fragShader: "f" });
	const f32 = new Float32Array(4);
	const i32 = new Int32Array(4);
	const cases = [
		["float", 1, "uniform1f"],
		["vec2", f32, "uniform2fv"],
		["vec3", f32, "uniform3fv"],
		["vec4", f32, "uniform4fv"],
		["int", 1, "uniform1i"],
		["ivec2", i32, "uniform2iv"],
		["ivec3", i32, "uniform3iv"],
		["ivec4", i32, "uniform4iv"],
		["mat2", f32, "uniformMatrix2fv"],
		["mat3", f32, "uniformMatrix3fv"],
		["mat4", f32, "uniformMatrix4fv"],
	] as const;
	for (const [type, value, expected] of cases) {
		gl.calls.length = 0;
		shader.setUniform({ name: "u", type, value } as any);
		expect(gl.calls).toEqual(["useProgram", expected]);
	}
	shader.destroy();
});

test("setUniforms writes every uniform in place without recompiling", () => {
	const gl = makeGl();
	const shader = new Shader(makeCanvas(gl), { vertShader: "v", fragShader: "f" });
	gl.calls.length = 0;
	shader.setUniforms([
		{ name: "u_a", type: "float", value: 1 },
		{ name: "u_b", type: "vec2", value: new Float32Array(2) },
	]);
	// Two uniform writes, no program/buffer teardown or recompile.
	expect(gl.calls).toEqual(["useProgram", "uniform1f", "useProgram", "uniform2fv"]);
	expect(gl.calls).not.toContain("deleteProgram");
	expect(gl.calls).not.toContain("createProgram");
	shader.destroy();
});

test("setUniforms after destroy is a no-op", () => {
	const gl = makeGl();
	const shader = new Shader(makeCanvas(gl), { vertShader: "v", fragShader: "f" });
	shader.destroy();
	gl.calls.length = 0;
	shader.setUniforms([{ name: "u_a", type: "float", value: 1 }]);
	expect(gl.calls).toEqual([]);
});

test("setUniform after destroy is a no-op", () => {
	const gl = makeGl();
	const shader = new Shader(makeCanvas(gl), { vertShader: "v", fragShader: "f" });
	shader.destroy();
	gl.calls.length = 0;
	shader.setUniform({ name: "u_time", type: "float", value: 1.5 });
	expect(gl.calls).toEqual([]);
});
