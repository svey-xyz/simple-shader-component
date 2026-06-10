# Simple Shader Component
*by [svey](https://svey.xyz)*

[![npm](https://img.shields.io/npm/v/@svey-xyz/simple-shader-component)](https://www.npmjs.com/package/@svey-xyz/simple-shader-component)
[![GitHub commits](https://badgen.net/github/commits/svey-xyz/simple-shader-component)](https://GitHub.com/svey-xyz/simple-shader-component/commit/)
[![GPL-3.0 license](https://img.shields.io/badge/License-GPL--3.0-green.svg)](https://github.com/svey-xyz/simple-shader-component/blob/main/LICENSE)
[![Core Tests](https://github.com/svey-xyz/simple-shader-component/actions/workflows/test-core.yml/badge.svg?branch=main)](https://github.com/svey-xyz/simple-shader-component/actions/workflows/test-core.yml)
[![React Tests](https://github.com/svey-xyz/simple-shader-component/actions/workflows/test-react.yml/badge.svg?branch=main)](https://github.com/svey-xyz/simple-shader-component/actions/workflows/test-react.yml)

## Description
A simple to use WebGL shader component, with included framework wrappers and strong typing. Shaders are powerful tools and can add a lot of visual interest to a web project, but most shader tooling is complicated and adds a large bundle. This library is a tiny, zero-dependency core for rendering a GLSL shader straight into the DOM.

## Core Concepts
### Why
While libraries like [three.js](https://threejs.org/) are amazing, not every project needs all of those features. `simple-shader-component` is a zero-dependency library that provides a simple component for rendering GLSL shaders on the web.

### What it gives you (and what it doesn't)
This package is a **primitive, not a kit** — it renders a full-screen quad and runs a render loop. It deliberately ships **no shaders** and **no automatic uniforms**; you provide the GLSL and feed any uniforms yourself via hooks.

The GLSL contract:

- **WebGL1 / GLSL ES 1.00.** The context is created with `getContext('webgl')`.
- The vertex shader **must** declare the attribute `attribute vec2 a_position;` — geometry is a hardcoded full-screen quad (two triangles in clip space). No other attributes are provided.
- There are **no automatic uniforms.** Common ones like `u_time` and `u_resolution` are *not* injected — declare them in your shader and update them from hooks (see below). `u_time` is typically driven from a `LOOP` hook via `shader.getElapsedTime()`; `u_resolution` from a `RESIZE` hook.

## Installation
```sh
npm install @svey-xyz/simple-shader-component
# or: bun add @svey-xyz/simple-shader-component
# or: pnpm add @svey-xyz/simple-shader-component
```

`react` is a peer dependency (`^17 || ^18 || ^19`). The package ships both ESM and CJS builds with type declarations.

The core class and types are exported from the package root; framework wrappers live under sub-paths:
```ts
import { Shader, MethodName, type UniformValue } from '@svey-xyz/simple-shader-component'
import { SimpleShaderCanvas } from '@svey-xyz/simple-shader-component/react'
```

## React usage
`'use client'` is required when you pass hooks (hooks are functions, so they can't cross the server/client boundary).

```tsx
'use client'

import { SimpleShaderCanvas } from '@svey-xyz/simple-shader-component/react'
import { MethodName, type Shader, type UniformValue } from '@svey-xyz/simple-shader-component'
import { useMemo } from 'react'

// Provide your own GLSL. The vertex attribute MUST be `a_position` (vec2).
import { frag, vert } from './your-custom-shaders'

export const Background = () => {
	// Memoize args — a new object reference recreates the WebGL instance.
	const args = useMemo(() => {
		const uniforms: UniformValue[] = [{ name: 'u_time', type: 'float', value: 0 }]

		// Drive u_time every frame from a LOOP hook.
		const loopHook = {
			methodName: MethodName.LOOP,
			hook: (shader: Shader) => {
				shader.setUniform({ name: 'u_time', type: 'float', value: shader.getElapsedTime() })
			},
		}

		return { vertShader: vert, fragShader: frag, uniforms, hooks: [loopHook] }
	}, [])

	return <SimpleShaderCanvas args={args} />
}
```

### `<SimpleShaderCanvas>` props
| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `args` | `ShaderArgs` | — | Shader configuration (see below). **Memoize it** — a new reference tears down and recreates the instance. |
| `paused` | `boolean` | `false` | Pause/resume the render loop **without unmounting**. Toggling it does not recreate the WebGL context. Useful for pausing offscreen or on tab-hidden. |
| `respectReducedMotion` | `boolean` | `false` | When `true`, the loop won't auto-start if the user has `prefers-reduced-motion: reduce` (a single static frame is still rendered). |

All other `<canvas>` attributes (`className`, `style`, `aria-hidden`, `id`, …) are forwarded to the canvas. The canvas defaults to `width: 100%` and `aria-hidden` (it's decorative); pass `aria-hidden={false}` to override. The component is unstyled beyond that — size it with your own CSS.

### `args` (`ShaderArgs`)
| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `vertShader` | `string` | — | Vertex shader source (GLSL ES 1.00). Must declare `attribute vec2 a_position;`. |
| `fragShader` | `string` | — | Fragment shader source (GLSL ES 1.00). |
| `uniforms` | `UniformValue[]` | — | Initial uniforms, applied before the first paint. |
| `hooks` | `{ methodName, hook }[]` | — | Lifecycle hooks (see below). |
| `loadedClass` | `string` | `'loaded'` | Class added to the canvas once initialized. |
| `autoStart` | `boolean` | `true` | Start the render loop inside `init()`. Set `false` to render a single static frame and start the loop later via `shader.startLoop()`. |

## Hooks
Hooks attach logic to a lifecycle method. Pass them on construction (via `args.hooks`) or add them later with `shader.addHook(...)`.

```ts
import { MethodName, type Shader } from '@svey-xyz/simple-shader-component'

const hook = {
	methodName: MethodName.RENDER,
	hook: (shader: Shader) => { /* ... */ },
}
```

`MethodName`: `INIT`, `LOOP`, `RENDER`, `RESIZE`, `INPUT`, `TOUCH`.

## Imperative API (`Shader`)
The `Shader` instance (and its `domHandler` base) expose:

- `init()` — compile, size, render and (unless `autoStart` is `false`) start the loop.
- `startLoop(refreshRate?)` / `stopLoop()` — start or pause the render loop without tearing anything down.
- `destroy()` — stop the loop, cancel pending frames, remove the window/canvas listeners and release GL resources. **Idempotent.** The React wrapper calls this automatically on unmount and when `args` change.
- `getElapsedTime()` — seconds since the loop started.
- `getUniform(name)` / `setUniform({ name, type, value })`.

## Lifecycle & cleanup
The React wrapper owns the instance lifecycle: it creates a `Shader` on mount, calls `destroy()` on unmount or when `args` change, and pauses/resumes via the `paused` prop. If you use the core `Shader` class directly, **call `destroy()`** when you're done — otherwise the render loop and event listeners leak.

## License
GPL-3.0 — see [LICENSE](./LICENSE).
