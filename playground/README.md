# Playground

Self-contained, interactive test harness for the merged `integration/all-fixes`
branch. It mounts the real React `<SimpleShaderCanvas>` and wires every merged
fix to a control:

| Control | Fix |
| --- | --- |
| pause / pauseWhenOffscreen / pauseWhenHidden / respectReducedMotion | #5 auto-pause |
| Uniform manager — **+ Add** (name + type), per-type value editors, **×** remove (reconciled in place — watch the "instances created" counter stay put) | #6 uniforms without teardown |
| alpha / premultipliedAlpha toggles | #7 contextAttributes |
| maxPixelRatio slider + live backing-store readout + automatic `u_resolution` | #8 HiDPI / devicePixelRatio |
| "Force WebGL unavailable" → `onUnsupported` + `fallback` | #9 graceful degradation |
| WebGL2 toggle (with GLSL ES 3.00 sample + automatic WebGL1 fallback) | #10 WebGL2 |
| `sideEffects:false` | #11 (build-time; nothing to toggle) |

## Open it
Just open `index.html` in a browser — everything (React + the component + UI)
is inlined, no dev server or network needed.

## Rebuild after changing the component
```sh
# from the repo root (needs react, react-dom, esbuild available)
node playground/build.mjs
```
`build.mjs` bundles `main.tsx` (which imports the component from `../src`) into
the single self-contained `index.html`.

## It never ships
The playground is excluded from the published npm package: `package.json`'s
`files` whitelist only publishes `dist/`, and `playground/` is also listed in
`.npmignore`.
