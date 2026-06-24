// Builds the library to both ESM (`.js`) and CJS (`.cjs`) so the `import` and
// `require` conditions in package.json#exports both resolve to real files.
// `react` / `react-dom` stay external (provided by the consumer as peers).
const entrypoints = ["./src/core/index.ts", "./src/react/index.tsx"];

const common = {
	entrypoints,
	outdir: "./dist",
	target: "browser" as const,
	external: ["react", "react-dom"],
	sourcemap: "linked" as const,
	minify: true,
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
};

/**
 * Bundle the ESM + CJS outputs for both entry points. Throws on any Bun.build
 * failure. Exported (rather than run at import) so the packaging test suite can
 * produce the artifacts it asserts against without going through the integrity
 * guard below — that suite is the independent safety net.
 */
export async function buildLibrary(): Promise<void> {
	const esm = await Bun.build({ ...common, format: "esm" });
	const cjs = await Bun.build({ ...common, format: "cjs", naming: "[dir]/[name].cjs" });

	const failures = [esm, cjs].filter((result) => !result.success);
	if (failures.length > 0) {
		console.error("Build failed");
		for (const result of failures) {
			for (const message of result.logs) console.error(message);
		}
		throw new Error("Bun.build reported a failure");
	}
}

/**
 * Public core exports that MUST survive bundling. Kept here so the build guard
 * and the packaging test assert against one list.
 */
export const EXPECTED_CORE_EXPORTS = [
	"Shader",
	"WebGLUnavailableError",
	"domHandler",
	"MethodName",
] as const;

/**
 * Import the freshly emitted ESM and throw if the bundler dropped any public
 * export. Regression guard for the 1.3.0 break, where `sideEffects:false` +
 * minify tree-shook the `MethodName` enum and dropped the export alias for the
 * re-exported `domHandler` base class, shipping an ESM bundle that threw on
 * import. The publish workflow runs `bun run build` (not the tests), so this
 * guard is the publish-time backstop; `test/package` is the PR/CI backstop.
 */
export async function assertCoreExportsIntact(): Promise<void> {
	let mod: Record<string, unknown>;
	try {
		mod = await import(new URL("./dist/core/index.js", import.meta.url).href);
	} catch (error) {
		throw new Error(`Export integrity check failed — could not import dist/core/index.js: ${error}`);
	}
	const missing = EXPECTED_CORE_EXPORTS.filter((name) => mod[name] === undefined);
	if (missing.length > 0) {
		throw new Error(`Export integrity check failed — dist/core/index.js is missing: ${missing.join(", ")}`);
	}
}

// Run the build + guard only when executed directly (`bun ./build.ts`), never
// on import (so the packaging test can call `buildLibrary()` in isolation).
if (import.meta.main) {
	await buildLibrary();
	await assertCoreExportsIntact();
}

export {};
