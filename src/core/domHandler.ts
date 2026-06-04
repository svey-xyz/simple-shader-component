export enum MethodName {
	TOUCH,
	INIT,
	LOOP,
	RENDER,
	RESIZE,
	INPUT
}

export class domHandler {
	private static readonly canvasEvents = [
		'click', 'mousedown', 'mouseup', 'mouseleave', 'mouseenter',
		'mousemove', 'touchstart', 'touchend', 'touchmove'
	] as const;

	private _container: HTMLCanvasElement;
	private sectionSize: { width: number, height: number } = { width: 0, height: 0 };
	private loopActive: boolean = false;
	private destroyed: boolean = false;
	private refreshRate: number = 0;
	private timer: any;
	private touch: boolean = false;
	private ongoingTouches: Array<Touch> = [];
	private inputHandler: (e: Event) => void;
	private resizeHandler: (e: Event) => void;
	private debouncedResize: (e: Event) => void;

	// Clock properties
	private startTime: number = 0; // Time when the clock starts
	private elapsedTime: number = 0; // Time elapsed since start

	constructor(container: HTMLCanvasElement, args?: {}) {
		this._container = container;

		// initialize listeners
		this.inputHandler = this.handleInput.bind(this);
		this.resizeHandler = this.resize.bind(this);
		// Keep the debounced reference so it can be removed in destroy().
		this.debouncedResize = this.debounce(this.resizeHandler);
		this.addListeners();

		this.setSize();
	}

	private addListeners(): void {
		for (const event of domHandler.canvasEvents) {
			this.container.addEventListener(event, this.inputHandler, { passive: true });
		}
		window.addEventListener('resize', this.debouncedResize, { passive: true });
	}

	private removeListeners(): void {
		for (const event of domHandler.canvasEvents) {
			this.container.removeEventListener(event, this.inputHandler);
		}
		window.removeEventListener('resize', this.debouncedResize);
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

	/** Subclass cleanup hook. Invoked by destroy() after the loop + listeners are torn down. */
	protected onDestroy(): void { }

	protected get isDestroyed(): boolean {
		return this.destroyed;
	}

	public startLoop = (refreshRate?: number): void => {
		if (this.destroyed || this.loopActive) return;
		if (typeof refreshRate === 'number') this.refreshRate = refreshRate;
		this.loopActive = true;
		this.mainLoop(this.refreshRate);
	}

	public stopLoop = (): void => {
		this.loopActive = false;
		this.cancel();
	}

	protected mainLoop = (refreshRate: number = 0) => {
		if (!this.loopActive || this.destroyed) return;
		this.requestTimeout(() => this.mainLoop(refreshRate), refreshRate);
		this.loop();
	}

	/**
	 * Tear down the instance: stop the render loop, cancel pending frames and
	 * remove every window/canvas listener registered in the constructor.
	 * Idempotent — safe to call more than once.
	 */
	public destroy = (): void => {
		if (this.destroyed) return;
		this.destroyed = true;
		this.stopLoop();
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
		this.removeListeners();
		this.cancel();
		this.onDestroy();
	}

	protected loop(): void {
	}

	public get container(): HTMLCanvasElement {
		return this._container;
	}

	/**
	 * Returns id for touch from a list.
	 * Returns -1 if not found.
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

			// If there's a timer, cancel it
			if (timeout) {
				window.cancelAnimationFrame(timeout);
			}
			// Setup the new requestAnimationFrame()
			timeout = window.requestAnimationFrame(() => {
				this.requestTimeout(fn, delay);
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
