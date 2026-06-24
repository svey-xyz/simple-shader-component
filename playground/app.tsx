/**
 * Interactive playground for @svey-xyz/simple-shader-component.
 *
 * Exercises every fix merged into `integration/all-fixes`:
 *   #5  pauseWhenOffscreen / pauseWhenHidden            (auto-pause)
 *   #6  uniforms reconciled in place (no context teardown)
 *   #7  contextAttributes (alpha / premultipliedAlpha)
 *   #8  maxPixelRatio + automatic u_resolution (HiDPI)
 *   #9  onUnsupported + fallback (graceful WebGL-unavailable)
 *   #10 webgl2 (GLSL ES 3.00) with WebGL1 fallback
 *   #11 sideEffects:false (build-time; nothing to toggle)
 *
 * This file is bundled (with React) into a single self-contained index.html
 * by build.mjs — it is NOT part of the shipped package.
 */
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { SimpleShaderCanvas } from "../src/react";
import { MethodName } from "../src/core";
import type { ShaderArgs, ShaderHook, UniformType } from "../src/types";

const VERT1 = `attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const FRAG1 = `precision highp float;
uniform float u_time;
uniform vec2  u_resolution;   // auto-populated (physical px) — fix #8
uniform vec2  u_mouse;        // 0..1, set from an INPUT hook
uniform vec3  u_color;        // add/remove uniforms in the panel — fix #6

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float wave = 0.5 + 0.5 * sin(u_time * 1.5 + uv.x * 10.0 + uv.y * 8.0);
  float d = distance(uv, u_mouse);
  vec3 col = mix(u_color, vec3(uv, wave), 0.5);
  col *= smoothstep(0.7, 0.0, d) * 0.5 + 0.6;
  gl_FragColor = vec4(col, 1.0);   // premultiplied alpha (a = 1)
}`;

const VERT2 = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const FRAG2 = `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform vec3  u_color;
out vec4 fragColor;          // user-declared output — required in ES 3.00

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float wave = 0.5 + 0.5 * sin(u_time * 2.0 + uv.x * 12.0);
  float d = distance(uv, u_mouse);
  vec3 col = mix(u_color, vec3(uv, wave), 0.5);
  col *= smoothstep(0.7, 0.0, d) * 0.5 + 0.6;
  fragColor = vec4(col, 1.0);
}`;

// ---- uniform metadata -------------------------------------------------------
const UNIFORM_TYPES: UniformType[] = [
  "float", "vec2", "vec3", "vec4", "int", "ivec2", "ivec3", "ivec4", "mat2", "mat3", "mat4",
];
const SIZE: Record<UniformType, number> = {
  float: 1, vec2: 2, vec3: 3, vec4: 4, int: 1, ivec2: 2, ivec3: 3, ivec4: 4, mat2: 4, mat3: 9, mat4: 16,
};
const isIntType = (t: UniformType) => t === "int" || t.startsWith("ivec");
const isMatType = (t: UniformType) => t.startsWith("mat");
const isColorType = (t: UniformType) => t === "vec3" || t === "vec4";

type UniformDef = { id: string; name: string; type: UniformType; value: number[] };
let uid = 0;
const newId = () => `u${++uid}`;

/** Sensible defaults: identity for matrices, zeros otherwise. */
function initialValue(type: UniformType): number[] {
  if (isMatType(type)) {
    const n = Math.sqrt(SIZE[type]); // 2 | 3 | 4
    return Array.from({ length: SIZE[type] }, (_, i) => (i % (n + 1) === 0 ? 1 : 0));
  }
  return Array(SIZE[type]).fill(0);
}

const hexToRgb = (hex: string): number[] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const rgbToHex = (v: number[]): string => {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round((x ?? 0) * 255))).toString(16).padStart(2, "0");
  return `#${c(v[0])}${c(v[1])}${c(v[2])}`;
};

const webgl2Supported = (() => {
  try { return !!document.createElement("canvas").getContext("webgl2"); }
  catch { return false; }
})();

type Stats = { instances: number; fps: number; w: number; h: number; running: boolean };

export default function App() {
  // ---- controls ----
  const [webgl2, setWebgl2] = useState(false);
  const [frag, setFrag] = useState(FRAG1);
  const [appliedFrag, setAppliedFrag] = useState(FRAG1);
  const [maxPixelRatio, setMaxPixelRatio] = useState(2);
  const [alpha, setAlpha] = useState(true);
  const [premultipliedAlpha, setPremultipliedAlpha] = useState(true);
  const [paused, setPaused] = useState(false);
  const [pauseWhenOffscreen, setPauseWhenOffscreen] = useState(false);
  const [pauseWhenHidden, setPauseWhenHidden] = useState(false);
  const [respectReducedMotion, setRespectReducedMotion] = useState(false);
  const [forceUnsupported, setForceUnsupported] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // ---- dynamic uniforms ----
  const [defs, setDefs] = useState<UniformDef[]>([
    { id: newId(), name: "u_color", type: "vec3", value: hexToRgb("#7c5cff") },
  ]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<UniformType>("float");
  const [addError, setAddError] = useState<string | null>(null);

  const addUniform = () => {
    const name = newName.trim();
    if (!/^[A-Za-z_]\w*$/.test(name)) return setAddError("Name must start with a letter/underscore (e.g. u_speed).");
    if (defs.some((d) => d.name === name)) return setAddError(`"${name}" already exists.`);
    setDefs((d) => [...d, { id: newId(), name, type: newType, value: initialValue(newType) }]);
    setNewName(""); setAddError(null);
  };
  const removeUniform = (id: string) => setDefs((d) => d.filter((u) => u.id !== id));
  const setComponent = (id: string, i: number, val: number) =>
    setDefs((d) => d.map((u) => (u.id === id ? { ...u, value: u.value.map((c, j) => (j === i ? val : c)) } : u)));
  const setColor = (id: string, hex: string) =>
    setDefs((d) => d.map((u) => {
      if (u.id !== id) return u;
      const rgb = hexToRgb(hex);
      return { ...u, value: u.value.map((c, j) => (j < 3 ? rgb[j] : c)) };
    }));

  // ---- live stats (written by hooks via refs, sampled into state @4Hz) ----
  const instancesRef = useRef(0);
  const framesRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const runningRef = useRef(false);
  const mouseRef = useRef<[number, number]>([0.5, 0.5]);
  const [stats, setStats] = useState<Stats>({ instances: 0, fps: 0, w: 0, h: 0, running: false });

  useEffect(() => {
    let prev = performance.now(), prevFrames = 0;
    const id = setInterval(() => {
      const now = performance.now();
      const fps = Math.round(((framesRef.current - prevFrames) * 1000) / (now - prev));
      prev = now; prevFrames = framesRef.current;
      setStats({ instances: instancesRef.current, fps, w: sizeRef.current.w, h: sizeRef.current.h, running: runningRef.current });
    }, 250);
    return () => clearInterval(id);
  }, []);

  // ---- stable hooks (identity must not change, or the instance recreates) ----
  const hooks = useMemo<{ methodName: MethodName; hook: ShaderHook }[]>(() => {
    const readSize: ShaderHook = (s) => { sizeRef.current = { w: s.container.width, h: s.container.height }; };
    return [
      { methodName: MethodName.INIT, hook: (s) => {
          instancesRef.current += 1;
          runningRef.current = true;
          readSize(s);
          const c = s.container;
          const move = (e: Event) => {
            const r = c.getBoundingClientRect();
            const p = (e as TouchEvent).touches?.[0] ?? (e as MouseEvent);
            const x = ((p.clientX - r.left) / r.width);
            const y = 1 - ((p.clientY - r.top) / r.height); // flip to gl_FragCoord space
            mouseRef.current = [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
          };
          c.addEventListener("mousemove", move, { passive: true });
          c.addEventListener("touchmove", move, { passive: true });
        } },
      { methodName: MethodName.RESIZE, hook: readSize },
      { methodName: MethodName.LOOP, hook: (s) => {
          framesRef.current += 1;
          runningRef.current = true;
          s.setUniform({ name: "u_time", type: "float", value: s.getElapsedTime() });
          s.setUniform({ name: "u_mouse", type: "vec2", value: new Float32Array(mouseRef.current) });
        } },
    ];
  }, []);

  // uniforms identity changes whenever a def is added / removed / edited ->
  // reconciled in place (#6), never recreating the WebGL context.
  const uniforms = useMemo(
    () => defs.map((u) => ({
      name: u.name,
      type: u.type,
      value: u.type === "float" || u.type === "int"
        ? u.value[0]
        : isIntType(u.type)
          ? new Int32Array(u.value)
          : new Float32Array(u.value),
    })),
    [defs]
  );

  const vert = webgl2 ? VERT2 : VERT1;
  const args: ShaderArgs = useMemo(
    () => ({ vertShader: vert, fragShader: appliedFrag, uniforms, hooks, webgl2, maxPixelRatio,
             contextAttributes: { alpha, premultipliedAlpha } }),
    [vert, appliedFrag, uniforms, hooks, webgl2, maxPixelRatio, alpha, premultipliedAlpha]
  );

  // Force a clean remount for constructor-only options the component doesn't
  // track in its creation effect (webgl2 / maxPixelRatio / contextAttributes),
  // and for the forceUnsupported test.
  const remountKey = `${webgl2}|${maxPixelRatio}|${alpha}|${premultipliedAlpha}|${forceUnsupported}`;

  // forceUnsupported: globally stub getContext->null so the next instance fails,
  // proving the #9 graceful path (onUnsupported + fallback). Restored on toggle.
  const origGetContext = useRef<typeof HTMLCanvasElement.prototype.getContext | null>(null);
  useEffect(() => {
    if (forceUnsupported) {
      if (!origGetContext.current) origGetContext.current = HTMLCanvasElement.prototype.getContext;
      // @ts-ignore test stub: override the readonly overloaded getContext
      HTMLCanvasElement.prototype.getContext = function () { return null; };
    } else if (origGetContext.current) {
      HTMLCanvasElement.prototype.getContext = origGetContext.current;
      origGetContext.current = null;
    }
    return () => {
      if (origGetContext.current) {
        HTMLCanvasElement.prototype.getContext = origGetContext.current;
        origGetContext.current = null;
      }
    };
  }, [forceUnsupported]);

  const onUnsupported = useCallback((e: Error) => setLastError(e.name + ": " + e.message), []);
  const applyFrag = () => { setLastError(null); setAppliedFrag(frag); };
  const loadSample = () => { const f = webgl2 ? FRAG2 : FRAG1; setFrag(f); setAppliedFrag(f); setLastError(null); };

  const usingWebgl2 = webgl2 && webgl2Supported && !forceUnsupported;

  return (
    <div className="wrap">
      <header>
        <h1>simple-shader-component <span className="branch">integration/all-fixes</span></h1>
        <p className="sub">Live playground — every merged fix is wired to a control below.</p>
      </header>

      <div className="grid">
        <section className="stage">
          <div className="canvasFrame" style={{ background: alpha ? "repeating-conic-gradient(#1b1b22 0% 25%, #14141a 0% 50%) 50% / 22px 22px" : "#000" }}>
            <SimpleShaderCanvas
              key={remountKey}
              args={args}
              paused={paused}
              pauseWhenOffscreen={pauseWhenOffscreen}
              pauseWhenHidden={pauseWhenHidden}
              respectReducedMotion={respectReducedMotion}
              onUnsupported={onUnsupported}
              fallback={<div className="fallback">WebGL unavailable — rendering <code>fallback</code> (fix #9)</div>}
              style={{ display: "block", width: "100%", height: 360, borderRadius: 10 }}
            />
          </div>

          <div className="stats">
            <Stat label="context">{forceUnsupported ? "—" : usingWebgl2 ? "webgl2 / ES 3.00" : "webgl / ES 1.00"}</Stat>
            <Stat label="backing store">{stats.w}×{stats.h}px</Stat>
            <Stat label="devicePixelRatio">{typeof window !== "undefined" ? window.devicePixelRatio : 1} (cap {maxPixelRatio})</Stat>
            <Stat label="fps">{forceUnsupported ? "—" : stats.fps}</Stat>
            <Stat label="loop">{forceUnsupported ? "fallback" : stats.running && !paused ? "running" : "paused"}</Stat>
            <Stat label="instances created">{stats.instances}</Stat>
          </div>
          {lastError && <div className="err">onUnsupported → {lastError}</div>}
          <p className="hint">The <b>instances created</b> counter is the proof for fix #6: adding, removing or editing a uniform updates the program <i>without</i> incrementing it, while changing the shader / WebGL2 / DPR cap does recreate. Scroll down with <b>pauseWhenOffscreen</b> on to see the loop stop.</p>
        </section>

        <section className="panel">
          <Group title="Shading">
            <Row><label>WebGL2 (GLSL ES 3.00) — fix #10</label>
              <input type="checkbox" checked={webgl2} onChange={(e) => { const on = e.target.checked; setWebgl2(on); const f = on ? FRAG2 : FRAG1; setFrag(f); setAppliedFrag(f); }} /></Row>
            {webgl2 && !webgl2Supported && <p className="warn">This browser has no WebGL2 — the component falls back to WebGL1 automatically.</p>}
            <textarea spellCheck={false} value={frag} onChange={(e) => setFrag(e.target.value)} rows={12} />
            <div className="btns"><button onClick={applyFrag}>Apply shader</button><button className="ghost" onClick={loadSample}>Reset sample</button></div>
          </Group>

          <Group title="Uniforms — reconciled in place (fix #6)">
            {defs.length === 0 && <p className="hint" style={{ marginTop: 0 }}>No uniforms. Add one below.</p>}
            <div className="uniforms">
              {defs.map((u) => (
                <div className="uniform" key={u.id}>
                  <div className="uhead">
                    <code className="uname">{u.name}</code>
                    <span className="utype">{u.type}</span>
                    <button className="rm" title="Remove uniform" aria-label={`Remove ${u.name}`} onClick={() => removeUniform(u.id)}>×</button>
                  </div>
                  <ValueEditor def={u} onComponent={(i, v) => setComponent(u.id, i, v)} onColor={(hex) => setColor(u.id, hex)} />
                </div>
              ))}
            </div>
            <div className="addrow">
              <input className="uinput" placeholder="u_name" value={newName} spellCheck={false}
                     onChange={(e) => { setNewName(e.target.value); setAddError(null); }}
                     onKeyDown={(e) => { if (e.key === "Enter") addUniform(); }} />
              <select className="uselect" value={newType} onChange={(e) => setNewType(e.target.value as UniformType)}>
                {UNIFORM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="add" onClick={addUniform} aria-label="Add uniform">+ Add</button>
            </div>
            {addError && <p className="warn" style={{ marginTop: 6 }}>{addError}</p>}
            <p className="hint">Declare a matching <code>uniform</code> in the shader to see it take effect. Removing one stops updating it (its last value lingers until the program is rebuilt).</p>
          </Group>

          <Group title="HiDPI — fix #8">
            <Row><label>maxPixelRatio: <b>{maxPixelRatio}</b></label>
              <input type="range" min={0.5} max={4} step={0.5} value={maxPixelRatio} onChange={(e) => setMaxPixelRatio(parseFloat(e.target.value))} /></Row>
            <p className="hint">Backing store = cssSize × min(devicePixelRatio, maxPixelRatio). Watch <b>backing store</b> above change. On a 1× display this is a no-op by design.</p>
          </Group>

          <Group title="Context attributes — fix #7">
            <Row><label>alpha</label><input type="checkbox" checked={alpha} onChange={(e) => setAlpha(e.target.checked)} /></Row>
            <Row><label>premultipliedAlpha</label><input type="checkbox" checked={premultipliedAlpha} onChange={(e) => setPremultipliedAlpha(e.target.checked)} /></Row>
            <p className="hint">Turn <b>alpha</b> off for an opaque canvas (checkerboard backdrop disappears).</p>
          </Group>

          <Group title="Auto-pause — fix #5">
            <Row><label>paused</label><input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} /></Row>
            <Row><label>pauseWhenOffscreen</label><input type="checkbox" checked={pauseWhenOffscreen} onChange={(e) => setPauseWhenOffscreen(e.target.checked)} /></Row>
            <Row><label>pauseWhenHidden (switch tabs to test)</label><input type="checkbox" checked={pauseWhenHidden} onChange={(e) => setPauseWhenHidden(e.target.checked)} /></Row>
            <Row><label>respectReducedMotion</label><input type="checkbox" checked={respectReducedMotion} onChange={(e) => setRespectReducedMotion(e.target.checked)} /></Row>
          </Group>

          <Group title="Graceful degradation — fix #9">
            <Row><label>Force WebGL unavailable</label><input type="checkbox" checked={forceUnsupported} onChange={(e) => setForceUnsupported(e.target.checked)} /></Row>
            <p className="hint">Stubs <code>getContext</code> → null so the component catches the failure, calls <code>onUnsupported</code> and renders <code>fallback</code> instead of crashing.</p>
          </Group>
        </section>
      </div>

      <div className="spacer">
        <p>↑ Scroll the canvas out of view with <b>pauseWhenOffscreen</b> enabled — the loop stops (watch fps drop to 0), then resumes when it re-enters.</p>
      </div>
    </div>
  );
}

function ValueEditor({ def, onComponent, onColor }: {
  def: UniformDef;
  onComponent: (i: number, v: number) => void;
  onColor: (hex: string) => void;
}) {
  const size = SIZE[def.type];
  const cols = isMatType(def.type) ? Math.sqrt(size) : Math.min(size, 4);
  const step = isIntType(def.type) ? 1 : "any";
  const parse = isIntType(def.type) ? (s: string) => Math.trunc(Number(s) || 0) : (s: string) => Number(s) || 0;
  return (
    <div className="veditor">
      {isColorType(def.type) && (
        <input className="ucolor" type="color" value={rgbToHex(def.value)} onChange={(e) => onColor(e.target.value)} title="Set RGB components" />
      )}
      <div className="vgrid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {def.value.map((c, i) => (
          <input key={i} type="number" step={step as any} value={c}
                 onChange={(e) => onComponent(i, parse(e.target.value))} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="stat"><span>{label}</span><b>{children}</b></div>;
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="group"><h3>{title}</h3>{children}</div>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="row">{children}</div>;
}
