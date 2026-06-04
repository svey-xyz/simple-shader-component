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

export {};
