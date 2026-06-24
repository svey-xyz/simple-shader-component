/**
 * Builds the self-contained playground/index.html (React + the merged
 * component + the playground UI, all inlined — open it directly, no server).
 * Run:  node playground/build.mjs
 */
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

const res = await build({
  entryPoints: [join(dir, "main.tsx")],
  bundle: true,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  minify: true,
  write: false,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});
const js = res.outputFiles[0].text;

const css = `
*{box-sizing:border-box}
:root{--bg:#0c0c10;--panel:#15151c;--panel2:#1b1b24;--line:#272733;--fg:#e8e8f0;--mut:#9a9ab0;--acc:#7c5cff;--acc2:#28c2a0}
html,body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1160px;margin:0 auto;padding:28px 22px 0}
header h1{margin:0;font-size:20px;font-weight:650;letter-spacing:-.01em}
.branch{font-size:11px;font-weight:600;color:var(--acc2);background:rgba(40,194,160,.12);border:1px solid rgba(40,194,160,.3);padding:2px 8px;border-radius:999px;vertical-align:middle;margin-left:8px}
.sub{color:var(--mut);margin:.3em 0 0}
.grid{display:grid;grid-template-columns:1.35fr 1fr;gap:20px;margin-top:22px}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
.stage{min-width:0}
.canvasFrame{border:1px solid var(--line);border-radius:12px;padding:8px;overflow:hidden}
.fallback{display:flex;align-items:center;justify-content:center;height:360px;color:var(--mut);background:#0a0a0e;border:1px dashed var(--line);border-radius:10px;text-align:center;padding:0 24px}
.fallback code{color:var(--acc2)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:9px 11px;display:flex;flex-direction:column;gap:2px}
.stat span{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.stat b{font-size:15px;font-variant-numeric:tabular-nums}
.err{margin-top:10px;color:#ff8c8c;background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.25);border-radius:8px;padding:8px 11px;font-size:13px}
.hint{color:var(--mut);font-size:12.5px;margin:12px 2px 0}
.warn{color:#ffcf7a;font-size:12.5px;margin:8px 2px 0}
.panel{display:flex;flex-direction:column;gap:14px}
.group{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 15px}
.group h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--acc)}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:5px 0}
.row label{color:var(--fg);font-size:13px}
.group textarea{width:100%;background:var(--panel2);color:#d8e0ff;border:1px solid var(--line);border-radius:9px;padding:11px;font:12.5px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;margin-top:4px}
.btns{display:flex;gap:8px;margin:10px 0 4px}
button{background:var(--acc);color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer}
button.ghost{background:transparent;color:var(--fg);border:1px solid var(--line)}
button:hover{filter:brightness(1.08)}
input[type=range]{width:55%;accent-color:var(--acc)}
input[type=checkbox]{width:17px;height:17px;accent-color:var(--acc)}
input[type=color]{width:46px;height:28px;background:none;border:1px solid var(--line);border-radius:6px;cursor:pointer}
code{font:12px ui-monospace,Menlo,monospace;color:var(--acc2)}
.uniforms{display:flex;flex-direction:column;gap:9px}
.uniform{background:var(--panel2);border:1px solid var(--line);border-radius:9px;padding:9px 10px}
.uhead{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.uname{color:#d8e0ff;font-size:13px}
.utype{font-size:10.5px;color:var(--acc2);background:rgba(40,194,160,.1);border:1px solid rgba(40,194,160,.25);padding:1px 7px;border-radius:999px}
.rm{margin-left:auto;background:transparent;border:1px solid var(--line);color:var(--mut);width:24px;height:24px;border-radius:6px;font-size:16px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer}
.rm:hover{color:#ff8c8c;border-color:rgba(255,80,80,.4)}
.veditor{display:flex;align-items:center;gap:9px}
.ucolor{width:38px;height:30px;flex:none;background:none;border:1px solid var(--line);border-radius:6px;cursor:pointer}
.vgrid{display:grid;gap:6px;flex:1;min-width:0}
.vgrid input{width:100%;background:var(--bg);color:#e8e8f0;border:1px solid var(--line);border-radius:6px;padding:6px 7px;font:12px ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
.addrow{display:flex;gap:7px;margin-top:11px}
.uinput{flex:1;min-width:0;background:var(--panel2);color:#e8e8f0;border:1px solid var(--line);border-radius:7px;padding:7px 9px;font:12.5px ui-monospace,Menlo,monospace}
.uselect{background:var(--panel2);color:#e8e8f0;border:1px solid var(--line);border-radius:7px;padding:7px 8px}
.add{flex:none}
.spacer{margin:30px 0 60px;min-height:130vh;border-top:1px dashed var(--line);padding-top:18px;color:var(--mut)}
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>simple-shader-component · playground</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>`;

writeFileSync(join(dir, "index.html"), html);
console.log("wrote playground/index.html (" + (html.length / 1024).toFixed(1) + " kb)");
