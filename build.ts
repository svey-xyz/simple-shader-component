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

const esm = await Bun.build({ ...common, format: "esm" });
const cjs = await Bun.build({ ...common, format: "cjs", naming: "[dir]/[name].cjs" });

let failed = false;
for (const result of [esm, cjs]) {
	if (!result.success) {
		failed = true;
		console.error("Build failed");
		for (const message of result.logs) {
			console.error(message);
		}
	}
}

if (failed) process.exit(1);

// --- Post-build export integrity guard ------------------------------------
// Regression guard for the bug that shipped in 1.3.0: with `sideEffects:false`
// + minify, Bun.build tree-shook the `MethodName` enum and dropped the export
// alias for the re-exported `domHandler` base class, leaving the published ESM
// with dangling `export { … }` bindings that throw on import. Fail the build
// loudly if any public core export is missing from the emitted ESM.
const EXPECTED_CORE_EXPORTS = ["Shader", "WebGLUnavailableError", "domHandler", "MethodName"] as const;
try {
	const mod: Record<string, unknown> = await import(new URL("./dist/core/index.js", import.meta.url).href);
	const missing = EXPECTED_CORE_EXPORTS.filter((name) => mod[name] === undefined);
	if (missing.length > 0) {
		console.error(`Export integrity check failed — dist/core/index.js is missing: ${missing.join(", ")}`);
		process.exit(1);
	}
} catch (error) {
	console.error("Export integrity check failed — could not import dist/core/index.js:", error);
	process.exit(1);
}

export {};
