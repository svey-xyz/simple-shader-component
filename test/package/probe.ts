/**
 * Out-of-process module probe used by exports.test.ts.
 *
 * A bundle with dangling `export { … }` bindings (the 1.3.0 break) doesn't just
 * throw on import — it can hard-crash Bun's module loader (segfault). Loading it
 * in the test runner's own process would take the whole suite down. So the
 * suite spawns THIS script per artifact: it loads the module, touches every
 * export (so a broken lazy getter throws here), and prints a one-line JSON
 * report. A clean load exits 0 with `{ok:true,…}`; a throw exits 1 with
 * `{ok:false,…}`; a loader crash just kills this child with a non-zero code —
 * all three read as "broken bundle" to the parent, none crash the runner.
 *
 * Usage: bun probe.ts <absolute-file> <esm|cjs>
 */
const [file, kind] = process.argv.slice(2);

async function main(): Promise<void> {
	let mod: Record<string, unknown>;
	if (kind === "cjs") {
		const { createRequire } = await import("node:module");
		mod = createRequire(import.meta.url)(file) as Record<string, unknown>;
	} else {
		mod = (await import(file)) as Record<string, unknown>;
	}

	// Touch every own export so a broken/lazy getter throws now, not lazily.
	const types: Record<string, string> = {};
	for (const key of Object.keys(mod)) types[key] = typeof mod[key];

	const methodName =
		mod.MethodName && typeof mod.MethodName === "object"
			? Object.fromEntries(Object.entries(mod.MethodName as Record<string, unknown>))
			: null;

	process.stdout.write(JSON.stringify({ ok: true, types, methodName }));
}

main().catch((error: unknown) => {
	process.stdout.write(JSON.stringify({ ok: false, error: String(error) }));
	process.exit(1);
});
