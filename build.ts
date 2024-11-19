const ESM = await Bun.build({
	entrypoints: ["./src/core/index.ts", "./src/react/index.tsx"],
	outdir: "./dist/esm",
	target: "browser",
	format: "esm",
	external: ["react"],
	sourcemap: "linked",
	minify: true
});

const CJS = await Bun.build({
	entrypoints: ["./src/core/index.ts", "./src/react/index.tsx"],
	outdir: "./dist/cjs",
	target: "browser",
	format: "cjs",
	external: ["react"],
	sourcemap: "linked",
	minify: true
});

if (!ESM.success || !CJS.success) {
	console.error("Build failed");
	for (const message of [...ESM.logs, ...CJS.logs]) {
		// Bun will pretty print the message object
		console.error(message);
	}
}

export {  }