// LinkedIn profile banner — an academic page rather than a poster.
//
// 1584×396 (LinkedIn's 4:1 profile background), rendered at 2× for a crisp
// upload. The profile photo covers the lower-left corner on desktop and phones
// crop ~190 px per side, so the left third is decorative sky and everything
// that must be read sits between x≈600 and x≈1390.
//
//   node build-linkedin.mjs   → ../assets/linkedin-banner.png     (1584×396, exact size)
//                                ../assets/linkedin-banner@2x.png  (3168×792)
//
// LinkedIn shows the banner at ~44 % on a laptop and re-compresses it, so
// nothing here is thinner than 1.4 px or set smaller than ~15 px.
//
// Needs google-chrome on PATH. Fonts are vendored in ./fonts (STIX Two Text:
// SIL OFL, see STIXTwoText-OFL.txt).

import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'out');
const ASSETS = join(HERE, '..', 'assets');

const W = 1584;
const H = 396;

// Journal paper, iron-gall ink, one deep blue for the figures, one vermilion
// reserved for the single thing that failed.
const PAPER = '#fbfaf6';
const INK = '#18181c';
const INK_DIM = '#5f5d58';
const INK_FAINT = '#b8b4aa';
const RULE = '#d9d5cb';
const BLUE = '#23466f';
const VERMILION = '#b4452e';

// ── Deterministic sky ───────────────────────────────────────────────────────
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** A faint star chart: curved declination arcs, hour lines, seeded stars. */
function skyChart() {
  const rand = rng(1969);
  const cx = 300;
  const cy = 980; // pole far below the page: arcs read as a chart's parallels
  const parallels = [640, 710, 780, 850, 920]
    .map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${RULE}" stroke-width="1.4"/>`)
    .join('');
  const meridians = [-0.4, -0.2, 0, 0.2]
    .map((a) => {
      const x1 = cx + Math.sin(a) * 600;
      const y1 = cy - Math.cos(a) * 600;
      const x2 = cx + Math.sin(a) * 1000;
      const y2 = cy - Math.cos(a) * 1000;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${RULE}" stroke-width="1.4"/>`;
    })
    .join('');
  const stars = Array.from({ length: 70 }, () => {
    const x = 30 + rand() * 540;
    const y = 70 + rand() * 300;
    const m = rand() ** 3; // few bright, many faint
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.1 + m * 2.6).toFixed(2)}" fill="${INK}" opacity="${(0.22 + m * 0.5).toFixed(2)}"/>`;
  }).join('');
  return `${parallels}${meridians}${stars}`;
}

/** A bright star with its Airy rings — a point source seen through an aperture. */
function airyStar(x, y) {
  const rings = [
    { r: 13, op: 0.55 },
    { r: 24, op: 0.3 },
    { r: 35, op: 0.16 },
    { r: 46, op: 0.08 },
  ]
    .map(({ r, op }) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${BLUE}" stroke-width="1.6" opacity="${op}"/>`)
    .join('');
  return `${rings}<circle cx="${x}" cy="${y}" r="5" fill="${BLUE}"/>
    <line x1="${x - 50}" y1="${y - 10}" x2="${x - 74}" y2="${y - 24}" stroke="${INK_FAINT}" stroke-width="1.4"/>
    <text x="${x - 80}" y="${y - 20}" class="tag">h(x, y) — point spread</text>`;
}

// ── Fig. 1: an agentic graph G = (V, E) ─────────────────────────────────────
// Drawn like a figure in a graph-theory paper: vertices carry italic symbols.
function agentGraph() {
  const y = 56;
  const step = 57;
  const R = 13;
  // The drafts are the sources: every spec fans out to them first.
  const V = {
    d1: [R, y - 44], d2: [R, y], d3: [R, y + 44],
    q: [R + step, y], i: [R + 2 * step, y], g: [R + 3 * step, y], c: [R + 4 * step, y],
  };
  const edge = (a, b, ra = R, rb = R) => {
    const [x1, y1] = V[a];
    const [x2, y2] = V[b];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    return `<line x1="${(x1 + ux * ra).toFixed(1)}" y1="${(y1 + uy * ra).toFixed(1)}" x2="${(x2 - ux * (rb + 2)).toFixed(1)}" y2="${(y2 - uy * (rb + 2)).toFixed(1)}" stroke="${INK}" stroke-width="1.6" marker-end="url(#tip)"/>`;
  };
  const label = (k, sym, sub = '', fill = INK) =>
    `<text x="${V[k][0]}" y="${V[k][1] + 6}" class="v" fill="${fill}">${sym}${sub ? `<tspan class="vsub" dy="3">${sub}</tspan>` : ''}</text>`;
  const circle = (k, fill = PAPER, stroke = INK) =>
    `<circle cx="${V[k][0]}" cy="${V[k][1]}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>`;
  const [qx, qy] = V.q;
  const [gx, gy] = V.g;
  const [ix, iy] = V.i;
  const Q = 14;
  return `
    ${['d1', 'd2', 'd3'].map((d) => edge(d, 'q', R, Q)).join('')}
    ${edge('q', 'i', Q)}${edge('i', 'g', R, 12)}${edge('g', 'c', 12)}
    <path d="M ${gx} ${gy + 13} C ${gx} ${gy + 48}, ${ix} ${iy + 48}, ${ix} ${iy + R + 3}" fill="none" stroke="${VERMILION}" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#tipFail)"/>
    ${['d1', 'd2', 'd3'].map((d, n) => circle(d, PAPER, BLUE) + label(d, 'd', String(n + 1), BLUE)).join('')}
    <path d="M ${qx} ${qy - Q} L ${qx + Q} ${qy} L ${qx} ${qy + Q} L ${qx - Q} ${qy} Z" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/>
    ${label('q', 'q')}
    ${circle('i')}${label('i', 'i')}
    <rect x="${gx - 12}" y="${gy - 12}" width="24" height="24" fill="${INK}"/>${label('g', 'g', '', PAPER)}
    ${circle('c', BLUE, BLUE)}${label('c', 'c', '', PAPER)}`;
}

// ── Page ────────────────────────────────────────────────────────────────────
const font = (name, file, style = 'normal') =>
  `@font-face{font-family:'${name}';src:url('${pathToFileURL(join(HERE, 'fonts', file))}');font-style:${style};}`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${font('STIX', 'STIXTwoText.ttf')}
${font('STIX', 'STIXTwoText-Italic.ttf', 'italic')}
${font('Plex', 'IBMPlexMono-500.ttf')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;background:${PAPER};color:${INK};overflow:hidden}
.page{position:relative;width:${W}px;height:${H}px}
svg{position:absolute;inset:0}
.run{position:absolute;top:20px;font-family:'Plex';font-size:16px;letter-spacing:.16em;text-transform:uppercase;color:${INK_DIM}}
.kicker{position:absolute;left:602px;top:76px;font-family:'Plex';font-size:15px;letter-spacing:.2em;color:${BLUE}}
.lede{position:absolute;left:600px;top:100px;width:540px;font-family:'STIX';font-size:39px;line-height:1.12;letter-spacing:-.005em}
.lede em{font-style:italic;color:${BLUE}}
.eqs{position:absolute;left:602px;top:212px;width:498px;font-family:'STIX'}
.eq{display:flex;align-items:baseline;justify-content:space-between;height:56px;padding-top:7px;border-top:1.5px solid ${RULE}}
.eq:last-child{border-bottom:1.5px solid ${RULE}}
.math{font-style:italic;font-size:30px;white-space:nowrap}
.math .up{font-style:normal}
.no{font-size:20px;color:${INK_DIM}}
sub{font-size:62%;vertical-align:-.3em;line-height:0}
.fig{position:absolute;left:1138px;top:74px;font-family:'STIX';font-size:17px;color:${INK_DIM}}
.fig b{font-weight:600;color:${INK}}
.fig i{color:${INK}}
.listing{position:absolute;left:1138px;top:262px;width:256px;padding:8px 0 8px 10px;border-left:3px solid ${RULE};background:#f1eee6;font-family:'Plex';font-size:15.5px;line-height:1.5;color:${INK}}
.listing .k{color:${INK}}
.listing .s{color:${BLUE}}
.listing .f{color:${VERMILION}}
text.tag{font-family:'STIX';font-style:italic;font-size:16px;fill:${INK_DIM};text-anchor:end}
text.v{font-family:'STIX';font-style:italic;font-size:19px;text-anchor:middle}
tspan.vsub{font-size:12px;font-style:normal}
</style></head><body><div class="page">
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="tip" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="${INK}"/></marker>
    <marker id="tipFail" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="${VERMILION}"/></marker>
    <linearGradient id="skyFade" gradientUnits="userSpaceOnUse" x1="380" x2="590" y1="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="sky"><rect width="${W}" height="${H}" fill="url(#skyFade)"/></mask>
    <clipPath id="skyClip"><rect x="0" y="58" width="${W}" height="${H - 86}"/></clipPath>
  </defs>
  <line x1="40" y1="52" x2="${W - 40}" y2="52" stroke="${INK}" stroke-width="2"/>
  <line x1="40" y1="${H - 26}" x2="${W - 40}" y2="${H - 26}" stroke="${RULE}" stroke-width="1.5"/>
  <g mask="url(#sky)" clip-path="url(#skyClip)">${skyChart()}</g>
  ${airyStar(470, 136)}
  <line x1="1118" y1="78" x2="1118" y2="356" stroke="${RULE}" stroke-width="1.5"/>
  <g transform="translate(1138 108)">${agentGraph()}</g>
</svg>
<div class="run" style="left:40px">Computational notes · Vol. 01</div>
<div class="run" style="right:40px">univerlab.org</div>
<div class="kicker">ABSTRACT</div>
<div class="lede">Useful tools, built with rigor,<br>ethics — and a little <em>wonder</em>.</div>
<div class="eqs">
  <div class="eq"><span class="math">y = σ(<span class="up">Σ</span><sub>i</sub> w<sub>i</sub>&#8201;x<sub>i</sub> + b)</span><span class="no">(1)</span></div>
  <div class="eq"><span class="math"><span class="up">cos</span> θ = q <span class="up">·</span> d / ‖q‖ ‖d‖</span><span class="no">(2)</span></div>
</div>
<div class="fig"><b>Fig. 1.</b> <i>G</i> = (<i>V</i>, <i>E</i>)</div>
<pre class="listing">{ <span class="k">"from_node"</span>: <span class="s">"g"</span>,
  <span class="k">"to_node"</span>: <span class="s">"i"</span>,
  <span class="k">"condition"</span>: <span class="f">"fail"</span> }</pre>
</div></body></html>
`;

mkdirSync(OUT_DIR, { recursive: true });
const page = join(OUT_DIR, 'linkedin-banner.html');
writeFileSync(page, html);
for (const [scale, name] of [[1, 'linkedin-banner.png'], [2, 'linkedin-banner@2x.png']]) {
  execFileSync('google-chrome', [
    '--headless=new', '--hide-scrollbars', '--disable-gpu',
    `--window-size=${W},${H}`, `--force-device-scale-factor=${scale}`,
    '--virtual-time-budget=3000', `--screenshot=${join(ASSETS, name)}`, pathToFileURL(page).href,
  ], { stdio: 'ignore', timeout: 60_000 });
  console.log(`✓ ${join(ASSETS, name)} (${W * scale}×${H * scale})`);
}
