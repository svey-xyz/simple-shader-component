/**
 * Packaging / build-output suite.
 *
 * The core and react suites import from `src/`, so they exercise the TypeScript
 * sources directly and NEVER touch the bundled output. That blind spot shipped
 * 1.3.0: with `sideEffects:false` + minify, `Bun.build` tree-shook the
 * `MethodName` enum object and dropped the export alias for the re-exported
 * `domHandler` base class, so the published `dist/core/index.js` carried
 * dangling `export { … }` bindings that throw (or crash Bun) on import — while
 * every src-level test stayed green and the package still shipped to npm.
 *
 * This suite closes that gap: it builds the bundles (the CI test job doesn't run
 * `bun run build`, so we build here via `buildLibrary()` — NOT `bun run build`,
 * so the build-time integrity guard can't pre-empt these assertions) and checks
 * the EMITTED ESM *and* CJS artifacts of BOTH entry points expose the full
 * public API a consumer imports. Each artifact is loaded in a child process
 * (see probe.ts) so a malformed bundle fails cleanly instead of crashing the
 * runner.
 */
import { test, expect, beforeAll } from "bun:test";
import { existsSync } from "node:fs";
import { buildLibrary } from "../../build.ts";

const ROOT = new URL("../../", import.meta.url);
const PROBE = new URL("probe.ts", import.meta.url).pathname;
const distPath = (rel: string) => new URL(`dist/${rel}`, ROOT).pathname;

// The hook-stage selectors a consumer drives via `hooks[].methodName`. The
// numeric enum is the bundling-fragile part: its members get inlined, so the
// runtime object looks unused to the tree-shaker.
const METHOD_NAME_VALUES = { TOUCH: 0, INIT: 1, LOOP: 2, RENDER: 3, RESIZE: 4, INPUT: 5 } as const;

type ProbeResult =
	| { ok: true; types: Record<string, string>; methodName: Record<string, number> | null }
	| { ok: false; error: string };

/** Load a built artifact in a child process and report its export shape. */
function probe(rel: string, kind: "esm" | "cjs"): ProbeResult {
	const proc = Bun.spawnSync([process.execPath, PROBE, distPath(rel), kind]);
	const out = proc.stdout.toString().trim();
	if (proc.exitCode !== 0 || out === "") {
		const detail = proc.stderr.toString().trim() || out || "module load crashed with no output";
		return { ok: false, error: `probe(${rel}) exited ${proc.exitCode}: ${detail}` };
	}
	try {
		return JSON.parse(out) as ProbeResult;
	} catch {
		return { ok: false, error: `probe(${rel}) emitted unparseable output: ${out}` };
	}
}

beforeAll(async () => {
	await buildLibrary();
});

test("core ESM bundle loads and exposes the full public API", () => {
	const r = probe("core/index.js", "esm");
	expect(r.ok, r.ok ? "" : r.error).toBe(true);
	if (!r.ok) return;
	expect(r.types.Shader).toBe("function");
	expect(r.types.WebGLUnavailableError).toBe("function");
	expect(r.types.domHandler).toBe("function"); // dropped in 1.3.0
	expect(r.types.MethodName).toBe("object"); // dropped in 1.3.0
	expect(r.methodName).toMatchObject(METHOD_NAME_VALUES);
});

test("core CJS bundle loads and exposes the full public API", () => {
	const r = probe("core/index.cjs", "cjs");
	expect(r.ok, r.ok ? "" : r.error).toBe(true);
	if (!r.ok) return;
	expect(r.types.Shader).toBe("function");
	expect(r.types.WebGLUnavailableError).toBe("function");
	expect(r.types.domHandler).toBe("function");
	expect(r.methodName).toMatchObject(METHOD_NAME_VALUES);
});

test("react ESM bundle exposes SimpleShaderCanvas (named + default)", () => {
	const r = probe("react/index.js", "esm");
	expect(r.ok, r.ok ? "" : r.error).toBe(true);
	if (!r.ok) return;
	expect(r.types.SimpleShaderCanvas).toBe("function");
	expect(r.types.default).toBe("function");
});

test("react CJS bundle exposes SimpleShaderCanvas", () => {
	const r = probe("react/index.cjs", "cjs");
	expect(r.ok, r.ok ? "" : r.error).toBe(true);
	if (!r.ok) return;
	expect(r.types.SimpleShaderCanvas).toBe("function");
});

test("package.json exports map points its runtime conditions at real files", () => {
	// `import`/`require` are what break a consumer at runtime (the 1.3.0 class of
	// bug). `types` come from a separate `tsc` step and aren't built here, so
	// they're out of scope for this runtime-bundle suite.
	const pkg = require(new URL("package.json", ROOT).pathname);
	for (const subpath of [".", "./react"] as const) {
		for (const condition of ["import", "require"] as const) {
			const target = pkg.exports[subpath]?.[condition];
			expect(target, `exports["${subpath}"]["${condition}"] is declared`).toBeDefined();
			expect(
				existsSync(new URL(target, ROOT)),
				`exports["${subpath}"]["${condition}"] -> ${target} exists`,
			).toBe(true);
		}
	}
});
