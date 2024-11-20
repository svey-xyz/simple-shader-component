# Simple Shader Component
*by [svey](https://svey.xyz)*

[![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/tag/svey-xyz/simple-shader-component?include_prereleases&sort=semver)](https://GitHub.com/svey-xyz/simple-shader-component/tags/)
[![GitHub commits](https://badgen.net/github/commits/svey-xyz/simple-shader-component)](https://GitHub.com/svey-xyz/simple-shader-component/commit/)
[![GNU license v3.0](https://img.shields.io/badge/License-GNU-green.svg)](https://github.com/svey-xyz/simple-shader-component/LICENSE)
[![Bundle size](https://img.shields.io/bundlejs/size/simple-shader-component)](https://github.com/svey-xyz/simple-shader-component)

## Description
This library provides a simple to use webgl shader component, with included framework wrappers and strong typing. Shaders are powerful tools and can be used to add a lot of visual interest to your web project. However, setting-up many shader tools can be complicated and add a large bundle to your project, this library provides a simple core package to make rendering a shader in your DOM incredibly easy.

## Core Concepts
### Why
While libraries like [three.js](https://threejs.org/) are amazing, not every project requires the level of depth provided. This is a zero-dependency library that provides a simple to use component for rendering GLSL shaders on the web.

## Installation & Usage
```zsh
bun i simple-shader-component
```

The base class and types are all exported from the root of the package.
```ts
import { Shader } from 'simple-shader-component'
```

Framework wrappers are available under sub exports.
```ts
import { SimpleShaderCanvas } from 'simple-shader-component/react'
```
***Note**: Right now only the React wrapper is included. If there's interest, or if my workflow requires it, I will add additional wrappers.*

### Basic Usage
'use client' directive is required to set hooks. If you're not using hooks it can be done in a server component.

```tsx
'use client'

import { SimpleShaderCanvas } from 'simple-shader-component/react'
import { Shader, UniformValue } from 'simple-shader-component'

// Define shaders as strings, or import from a glsl file with a loader
import { frag, vert } from '.your-custom-shaders'

// Example uniform to track elapsed time in the shader
const uniforms: Array<UniformValue> = [
	{
		name: 'u_time',
		type: "float",
		value: 0.0
	}
]

export const Test = () => {
	// Simple hook to update a uniform
	const loopLogic = (shader: Shader) => {
		const uTime: UniformValue = {
			name: 'u_time',
			type: 'float',
			value: shader.getElapsedTime() // Uses exposed method of shader
		}
		shader.setUniform(uTime)
	}

	// Define which method to attach the hook to
	const loopHook = {
		methodName: MethodName.LOOP,
		hook: loopLogic
	}

	// Render component with args
	return <SimpleShaderCanvas args={{ uniforms: uniforms, fragShader: frag, vertShader: vert, hooks: [loopHook] }} />
}
```

*More coming soon*
