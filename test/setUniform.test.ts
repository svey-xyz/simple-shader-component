import { test, expect } from "bun:test";
import { Shader } from "../src/core";

// Minimal GL mock that records call order.
function makeGl(calls: string[]) {
  const loc = {};
  return {
    createShader: () => ({}), shaderSource() {}, compileShader() {},
    getShaderParameter: () => true, createProgram: () => ({ id: "prog" }),
    attachShader() {}, linkProgram() {}, getProgramParameter: () => true,
    createBuffer: () => ({}), bindBuffer() {}, bufferData() {},
    getUniformLocation: () => loc,
    useProgram(p: unknown) { calls.push("useProgram"); },
    uniform1f() { calls.push("uniform1f"); },
    getAttribLocation: () => 0, vertexAttribPointer() {}, enableVertexAttribArray() {},
    drawArrays() {}, clear() {}, viewport() {}, getExtension: () => null,
    deleteProgram() {}, deleteBuffer() {},
    ARRAY_BUFFER: 0, STATIC_DRAW: 0, VERTEX_SHADER: 0, FRAGMENT_SHADER: 0,
    COMPILE_STATUS: 0, LINK_STATUS: 0, COLOR_BUFFER_BIT: 0, DEPTH_BUFFER_BIT: 0,
    STENCIL_BUFFER_BIT: 0, FLOAT: 0, TRIANGLES: 0,
  };
}

function makeCanvas(gl: unknown) {
  return {
    getContext: () => gl,
    addEventListener() {}, removeEventListener() {},
    classList: { add() {} },
    getBoundingClientRect: () => ({ width: 100, height: 100 }),
    offsetHeight: 100,
  } as unknown as HTMLCanvasElement;
}

test("setUniform binds the program before writing", () => {
  const calls: string[] = [];
  const gl = makeGl(calls);
  // domHandler touches window/document — stub the bits it needs.
  (globalThis as any).window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
  (globalThis as any).document = { documentElement: { clientWidth: 100 }, body: { clientWidth: 100 } };
  const shader = new Shader(makeCanvas(gl), { vertShader: "v", fragShader: "f" });
  shader.setUniform({ name: "u_time", type: "float", value: 1.5 });
  expect(calls).toEqual(["useProgram", "uniform1f"]);
});

test("setUniform after destroy is a no-op", () => {
  const calls: string[] = [];
  const gl = makeGl(calls);
  (globalThis as any).window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
  (globalThis as any).document = { documentElement: { clientWidth: 100 }, body: { clientWidth: 100 } };
  const shader = new Shader(makeCanvas(gl), { vertShader: "v", fragShader: "f" });
  shader.destroy();
  calls.length = 0;
  shader.setUniform({ name: "u_time", type: "float", value: 1.5 });
  expect(calls).toEqual([]);
});
