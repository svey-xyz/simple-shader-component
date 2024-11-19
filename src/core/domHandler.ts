export const enum MethodName {
	TOUCH,
	INIT,
	LOOP,
	RENDER,
	RESIZE,
	INPUT
}

export class domHandler {
	private _container: HTMLCanvasElement;
	private sectionSize: { width: number, height: number } = { width: 0, height: 0 };
	private loopActive: boolean = false;
	private timer: any;
	private touch: boolean = false;
	private ongoingTouches: Array<Touch> = [];
	private inputHandler: (e: Event) => void;
	private resizeHandler: (e: Event) => void;

	// Clock properties
	private startTime: number = 0; // Time when the clock starts
	private elapsedTime: number = 0; // Time elapsed since start

	constructor(container: HTMLCanvasElement, args?: {}) {
		this._container = container;

		// initialize listeners
		this.inputHandler = this.handleInput.bind(this);
		this.container.addEventListener('click', this.inputHandler, { passive: true });
		this.container.addEventListener('mousedown', this.inputHandler, { passive: true });
		this.container.addEventListener('mouseup', this.inputHandler, { passive: true });
		this.container.addEventListener('mouseleave', this.inputHandler, { passive: true });
		this.container.addEventListener('mouseenter', this.inputHandler, { passive: true });
		this.container.addEventListener('mousemove', this.inputHandler, { passive: true });
		this.container.addEventListener('touchstart', this.inputHandler, { passive: true });
		this.container.addEventListener('touchend', this.inputHandler, { passive: true });
		this.container.addEventListener('touchmove', this.inputHandler, { passive: true });

		this.resizeHandler = this.resize.bind(this);
		window.addEventListener('resize', this.debounce(this.resizeHandler), { passive: true });

		this.setSize();
	}

	// Start the clock
	protected startClock() {
		this.startTime = performance.now(); // Use performance.now() for high-precision time
	}

	// Get the elapsed time in seconds
	public getElapsedTime(): number {
		this.elapsedTime = (performance.now() - this.startTime) / 1000; // Convert to seconds
		return this.elapsedTime;
	}

	protected init(): void { }

	protected handleInput(e: Event): void { };
	protected click(e: Event): void { };
	protected holdTouch(e: Event): void { };
	protected touchMove(e: Event): void { };
	protected touchStart(e: Event): void {
		this.timer = setInterval(() => {
			this.holdTouch(e)
		}, 100);
		this.touch = true;
	}

	protected touchEnd(e: Event) {
		if (this.timer) clearInterval(this.timer);
		this.touch = false;
	}

	protected resize(e?: Event): void { };

	protected setSize(): void {
		this.sectionSize.height = this.container.offsetHeight;
		this.sectionSize.width = document.documentElement.clientWidth || document.body.clientWidth;
	}

	protected startLoop = (refreshRate: number = 0) => {
		this.loopActive = true;
		this.mainLoop(refreshRate);
	}

	protected mainLoop = (refreshRate: number = 0) => {
		if (this.loopActive) {
			this.requestTimeout(() => this.mainLoop(refreshRate), refreshRate);
			this.loop();
		}
	}

	protected loop(): void {
	}

	public get container(): HTMLCanvasElement {
		return this._container;
	}

	/**
	 * Returns id for touch from a list.
	 * Returns -1 if not found.
	 *
	 * @param {number} idToFind
	 * @param {Array<Touch>} ongoingTouches
	 * @return {*}  {number}
	 * @memberof domUtils
	 */
	protected ongoingTouchIndexById(idToFind: number, ongoingTouches: Array<Touch>): number {
		for (var i = 0; i < ongoingTouches.length; i++) {
			var id = ongoingTouches[i].identifier;

			if (id == idToFind) {
				return i;
			}
		}
		return -1;    // not found
	}

	/**
	 * Debounce functions for better performance
	 * (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
	 * @param  {Function} fn The function to debounce
	 */
	protected debounce(this: any, fn: any, delay: number = 0) {

		// Setup a timer
		let timeout: number;

		// Return a function to run debounced
		return () => {

			// Setup the arguments
			let context: any = this;
			let args: any = arguments;

			// If there's a timer, cancel it
			if (timeout) {
				window.cancelAnimationFrame(timeout);
			}
			// Setup the new requestAnimationFrame()
			timeout = window.requestAnimationFrame(() => {
				this._ScriptUtils.requestTimeout(fn, delay);
			});

		}
	};

	protected noop = () => { };

	protected requestTimeout = (fn: () => void, delay: number, registerCancel: any = this.registerCancel) => {
		const start = new Date().getTime();

		const loop = () => {
			const delta = new Date().getTime() - start;

			if (delta >= delay) {
				fn();
				registerCancel(this.noop);
				return;
			}

			const raf = requestAnimationFrame(loop);
			registerCancel(() => cancelAnimationFrame(raf));
		};

		const raf = requestAnimationFrame(loop);
		registerCancel(() => cancelAnimationFrame(raf));
	};

	protected cancel = this.noop;
	protected registerCancel = (fn: () => void) => this.cancel = fn;
}


