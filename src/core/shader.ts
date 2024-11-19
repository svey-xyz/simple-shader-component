import { ShaderArgs, UniformValue, ShaderHook } from "../types";
import { domHandler, MethodName } from "./domHandler";


/** Shader Class
 * @export
 * @class Shader
 * @extends {domHandler}
 *
 */
export class Shader extends domHandler {
	private hooks: Record<string, ShaderHook[]> = {};
	private gl: WebGLRenderingContext;
	private shaderProgram: WebGLProgram;
	private vertexBuffer: WebGLBuffer;
	private uniforms: Array<UniformValue> | undefined
	private loadedClass: string = 'loaded'

	constructor(container: HTMLCanvasElement, args: ShaderArgs) {
		super(container);
		this.gl = container.getContext('webgl') as WebGLRenderingContext;
		this.shaderProgram = this.initializeShader(args.vertShader, args.fragShader);
		this.vertexBuffer = this.initBuffers();

		if (args.uniforms) this.uniforms = args.uniforms
		if (args.loadedClass) this.loadedClass = args.loadedClass
		if (args.hooks) args.hooks.forEach((hook) => {
			this.addHook(hook.methodName, hook.hook)
		})
	}

	public init() {
		super.init();
		this.runHooks(MethodName.INIT);

		this.resize()
		this.startLoop(60);

		this.uniforms?.forEach((uniform) => {
			this.setUniform(uniform)
		})
		this.container.classList.add(this.loadedClass)
	}

	public addHook(methodName: MethodName, hook: ShaderHook): void {
		if (!this.hooks[methodName]) this.hooks[methodName] = [];
		this.hooks[methodName].push(hook);
	}

	protected runHooks(method: MethodName, ...args: any[]) {
		if (this.hooks[method]) {
			this.hooks[method].forEach((hook) => hook(this, ...args));
		}
	}

	private initBuffers(): WebGLBuffer {
		const vertices = new Float32Array([
			-1.0, 1.0,  // Top-left
			-1.0, -1.0,  // Bottom-left
			1.0, -1.0,  // Bottom-right

			-1.0, 1.0,  // Top-left
			1.0, -1.0,  // Bottom-right
			1.0, 1.0   // Top-right
		]);

		const vertexBuffer = this.gl.createBuffer();
		if (!vertexBuffer) throw new Error('Failed to create vertex buffer');

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

		return vertexBuffer;
	}

	private loadShader(gl: WebGLRenderingContext, type: GLenum, source: string = ''): WebGLShader | null {
		const shader = gl.createShader(type);
		if (!shader) return null;

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	private initializeShader(vertShader?: string, fragShader?: string): WebGLProgram {
		const vertexShader = this.loadShader(this.gl, this.gl.VERTEX_SHADER, vertShader);
		const fragmentShader = this.loadShader(this.gl, this.gl.FRAGMENT_SHADER, fragShader);
		if (!vertexShader || !fragmentShader) throw new Error('Shader compilation failed');

		const shaderProgram = this.gl.createProgram();
		if (!shaderProgram) throw new Error('Failed to create shader program');

		this.gl.attachShader(shaderProgram, vertexShader);
		this.gl.attachShader(shaderProgram, fragmentShader);
		this.gl.linkProgram(shaderProgram);

		if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
			console.error('Shader program link error:', this.gl.getProgramInfoLog(shaderProgram));
			throw new Error('Unable to initialize the shader program');
		}
		return shaderProgram;
	}

	// Main render loop
	protected loop(): void {
		super.loop();
		this.runHooks(MethodName.LOOP);
		this.render();
	}

	protected render(): void {
		const gl = this.gl;
		this.runHooks(MethodName.RENDER);

		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.clear(gl.DEPTH_BUFFER_BIT);
		gl.clear(gl.STENCIL_BUFFER_BIT);

		const vertexPosition = gl.getAttribLocation(this.shaderProgram, 'a_position');
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vertexPosition);

		gl.useProgram(this.shaderProgram);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	/**  Gets a uniform value from the shader */
	public getUniform(name: string): UniformValue | undefined {
		const uLoc = this.gl.getUniformLocation(this.shaderProgram, name);
		if (!uLoc) {
			console.error(`Uniform ${name} not found.`);
			return;
		}

		return this.gl.getUniform(this.shaderProgram, uLoc)
	}

	/**  Sets a uniform value for the shader */
	public setUniform(uniform: UniformValue): void {
		const { name, type, value } = uniform
		const uLoc = this.gl.getUniformLocation(this.shaderProgram, name);

		if (!uLoc) {
			console.error(`Uniform ${name} not found.`);
			return;
		}

		switch (type) {
			case "float":
				this.gl.uniform1f(uLoc, value as number);
				break;
			case "vec2":
				this.gl.uniform2fv(uLoc, value as Float32Array);
				break;
			case "vec3":
				this.gl.uniform3fv(uLoc, value as Float32Array);
				break;
			case "vec4":
				this.gl.uniform4fv(uLoc, value as Float32Array);
				break;
			case "int":
				this.gl.uniform1i(uLoc, value as number);
				break;
			case "ivec2":
				this.gl.uniform2iv(uLoc, value as Int32Array);
				break;
			case "ivec3":
				this.gl.uniform3iv(uLoc, value as Int32Array);
				break;
			case "ivec4":
				this.gl.uniform4iv(uLoc, value as Int32Array);
				break;
			case "mat2":
				this.gl.uniformMatrix2fv(uLoc, false, value as Float32Array);
				break;
			case "mat3":
				this.gl.uniformMatrix3fv(uLoc, false, value as Float32Array);
				break;
			case "mat4":
				this.gl.uniformMatrix4fv(uLoc, false, value as Float32Array);
				break;
			default:
				console.error(`Unsupported uniform type: ${type}`);
		}
	}

	// Resize handler
	protected resize(e?: Event): void {
		super.resize(e);
		const { width, height } = this.container.getBoundingClientRect();
		this.container.width = width;
		this.container.height = height;
		this.gl.viewport(0, 0, width, height);
		this.runHooks(MethodName.RESIZE);

		this.render(); // Render immediately on resize to avoid jitter waiting for render call
	}

	// Handles input events
	protected handleInput(e: Event): void {
		super.handleInput(e);
		this.runHooks(MethodName.INPUT);

	}

	// Handles touch start events
	protected touchStart(e: Event): void {
		super.touchStart(e);
		this.runHooks(MethodName.TOUCH);
	}
}