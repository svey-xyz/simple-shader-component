import { domHandler, MethodName } from "./domHandler";
import ShaderTypes from "../types"

/**
 * Thrown when a WebGL rendering context cannot be created — i.e.
 * `canvas.getContext('webgl')` (and the legacy `experimental-webgl`) both
 * return `null`. This happens when WebGL is disabled, there is no usable GPU,
 * the driver is blocklisted, or too many live contexts already exist.
 *
 * It replaces the opaque `TypeError: Cannot read properties of null` that the
 * old non-null cast produced, giving consumers a typed, catchable failure they
 * can recover from (e.g. render a static fallback).
 */
export class WebGLUnavailableError extends Error {
	constructor(
		message = "WebGL is unavailable: getContext('webgl') returned null. WebGL may be disabled, " +
			"the device may lack a usable GPU or use a blocklisted driver, or too many contexts may be live.",
	) {
		super(message);
		this.name = "WebGLUnavailableError";
		// Keep `instanceof` working when this is down-levelled past ES2015.
		Object.setPrototypeOf(this, WebGLUnavailableError.prototype);
	}
}

/** Shader Class
 * @export
 * @class Shader
 * @extends {domHandler}
 *
 */
export class Shader extends domHandler {
	private hooks: Record<string, ShaderTypes.ShaderHook[]> = {};
	private gl: WebGLRenderingContext;
	private shaderProgram: WebGLProgram;
	private vertexBuffer: WebGLBuffer;
	private uniforms: Array<ShaderTypes.UniformValue> | undefined
	private loadedClass: string = 'loaded'
	private autoStart: boolean = true
	/** Cap on devicePixelRatio used when sizing the drawing buffer. See ShaderArgs. */
	private maxPixelRatio: number = 2

	constructor(container: HTMLCanvasElement, args: ShaderTypes.ShaderArgs) {
		super(container);
		// The WebGL1 context is composited over the page with premultiplied
		// alpha (the browser default, i.e. `premultipliedAlpha: true`). Fragment
		// shaders must therefore write premultiplied colors to `gl_FragColor`
		// (rgb already multiplied by a); straight alpha causes light fringing.
		// `args.contextAttributes` is forwarded verbatim so callers can opt into
		// an opaque canvas (`alpha: false`), straight alpha
		// (`premultipliedAlpha: false`), `preserveDrawingBuffer`, etc. See
		// ShaderArgs.contextAttributes for the full contract.
		//
		// getContext() returns null when WebGL can't be initialised. Try the
		// legacy 'experimental-webgl' id before giving up (older/edge browsers),
		// then fail with a typed, catchable error instead of letting the next
		// `this.gl.*` call blow up with an opaque null-dereference TypeError.
		const gl = (container.getContext('webgl', args.contextAttributes) ??
			container.getContext('experimental-webgl' as 'webgl', args.contextAttributes)) as WebGLRenderingContext | null;
		if (!gl) throw new WebGLUnavailableError();
		this.gl = gl;
		this.shaderProgram = this.initializeShader(args.vertShader, args.fragShader);
		this.vertexBuffer = this.initBuffers();

		if (args.uniforms) this.uniforms = args.uniforms
		if (args.loadedClass) this.loadedClass = args.loadedClass
		if (args.autoStart === false) this.autoStart = false
		if (typeof args.maxPixelRatio === 'number') this.maxPixelRatio = args.maxPixelRatio
		if (args.hooks) args.hooks.forEach((hook) => {
			this.addHook(hook.methodName, hook.hook)
		})
	}

	public init() {
		super.init();
		this.runHooks(MethodName.INIT);

		// Apply initial uniforms before the first paint so that a paused /
		// reduced-motion canvas still renders a correct static frame.
		this.uniforms?.forEach((uniform) => {
			this.setUniform(uniform)
		})

		this.resize()

		if (this.autoStart) this.startLoop(60);

		this.container.classList.add(this.loadedClass)
	}

	public addHook(methodName: MethodName, hook: ShaderTypes.ShaderHook): void {
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
		if (this.isDestroyed) return;
		super.loop();
		this.runHooks(MethodName.LOOP);
		this.render();
	}

	protected render(): void {
		if (this.isDestroyed) return;
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
	public getUniform(name: string): ShaderTypes.UniformValue | undefined {
		const uLoc = this.gl.getUniformLocation(this.shaderProgram, name);
		if (!uLoc) {
			console.error(`Uniform ${name} not found.`);
			return;
		}

		return this.gl.getUniform(this.shaderProgram, uLoc)
	}

	/**  Sets a uniform value for the shader */
	public setUniform(uniform: ShaderTypes.UniformValue): void {
		if (this.isDestroyed) return;
		const { name, type, value } = uniform
		const uLoc = this.gl.getUniformLocation(this.shaderProgram, name);

		if (!uLoc) {
			console.error(`Uniform ${name} not found.`);
			return;
		}

		// gl.uniform* writes target the *currently bound* program, not the
		// program the location came from. Bind ours first; otherwise writes made
		// before the first render (init defaults) or from LOOP hooks (which run
		// before render() binds the program) are silently dropped with
		// GL_INVALID_OPERATION — the classic "u_time never updates" freeze.
		this.gl.useProgram(this.shaderProgram);

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
		if (this.isDestroyed) return;
		super.resize(e);
		const { width, height } = this.container.getBoundingClientRect();

		// Size the drawing buffer in *physical* pixels so output is crisp on
		// HiDPI / retina displays. getBoundingClientRect() reports the CSS
		// (logical) box; multiplying by the (capped) devicePixelRatio gives the
		// backing-store resolution. The CSS box stays at logical size via the
		// consumer's styling, and because both dimensions scale by the same
		// factor the displayed size is unchanged — just sampled at full
		// resolution. The cap bounds fill cost on very high-DPR phones. On 1x
		// displays dpr === 1, so this is behaviourally identical to before.
		const dpr = Math.min(this.pixelRatio(), this.maxPixelRatio);
		this.container.width = Math.max(1, Math.round(width * dpr));
		this.container.height = Math.max(1, Math.round(height * dpr));

		this.gl.viewport(0, 0, this.container.width, this.container.height);

		// Keep u_resolution (if the shader declares it) in sync with the
		// physical pixel size so gl_FragCoord-based maths stays correct.
		this.updateResolutionUniform();

		this.runHooks(MethodName.RESIZE);

		this.render(); // Render immediately on resize to avoid jitter waiting for render call
	}

	/** Current devicePixelRatio, guarded for SSR / non-DOM environments. */
	private pixelRatio(): number {
		return (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
	}

	/**
	 * Writes the physical-pixel resolution into a `u_resolution` vec2 uniform if
	 * — and only if — the active program declares one. Shaders without it are
	 * left untouched (no console noise), keeping this backward compatible.
	 */
	private updateResolutionUniform(): void {
		const uLoc = this.gl.getUniformLocation(this.shaderProgram, 'u_resolution');
		if (!uLoc) return;
		this.gl.useProgram(this.shaderProgram);
		this.gl.uniform2fv(uLoc, new Float32Array([this.container.width, this.container.height]));
	}

	// Handles input events
	protected handleInput(e: Event): void {
		if (this.isDestroyed) return;
		super.handleInput(e);
		this.runHooks(MethodName.INPUT);

	}

	// Handles touch start events
	protected touchStart(e: Event): void {
		super.touchStart(e);
		this.runHooks(MethodName.TOUCH);
	}

	// Release GL resources when the instance is destroyed.
	//
	// Deliberately does NOT call WEBGL_lose_context.loseContext(): a canvas
	// hands out ONE context for its lifetime, so losing it here permanently
	// kills the canvas for any subsequent Shader (the React wrapper reuses the
	// same <canvas> when it recreates on args change, and React Strict Mode
	// dev remounts do the same) — compileShader then no-ops and surfaces as
	// "Shader compilation error: null". Deleting the program and buffer frees
	// the GPU resources; the browser reclaims the context with the canvas.
	protected onDestroy(): void {
		const gl = this.gl;
		try {
			gl.useProgram(null);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			gl.deleteProgram(this.shaderProgram);
			gl.deleteBuffer(this.vertexBuffer);
		} catch {
			// Context may already be lost; nothing else to clean up.
		}
	}
}
