// Self-hosted cards for the JheisonMB profile README — no third-party image
// services (capsule-render, github-readme-stats) in the rendering path.
//
// GitHub serves README SVGs as images and loads no custom fonts, so every
// piece of text is outlined to vector <path> here. Brand tokens, fonts and the
// slate ground are UniverLab's night (UniverLab/.github scripts/build-banners.mjs):
// chalk on a slate board, Sometype Mono for the typewriter voice, Old Standard TT
// for the engraving voice.
//
//   node build-profile.mjs header            → ../assets/header.svg (static, committed)
//   node build-profile.mjs history <outdir>  → <outdir>/github-history.svg
//                                              (needs GITHUB_TOKEN; built daily by
//                                              .github/workflows/profile-cards.yml)

import opentype from 'opentype.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── Brand tokens ────────────────────────────────────────────────────────────
const BG = '#222928';
const INK = '#ecebe4';
const INK_DIM = '#b9bdb5';
const INK_FAINT = '#6f7873';
const ACCENT = '#e6c84a';
const CELL_EMPTY = '#2d3534';

const mono = opentype.loadSync(join(HERE, 'fonts', 'SometypeMono-wght.ttf'));
const serif = opentype.loadSync(join(HERE, 'fonts', 'OldStandard-Regular.ttf'));
const italic = opentype.loadSync(join(HERE, 'fonts', 'OldStandard-Italic.ttf'));
const serifBold = opentype.loadSync(join(HERE, 'fonts', 'OldStandard-Bold.ttf'));
// STIX Two for mathematics: it carries the Greek and the operators Old Standard lacks.
const mathItalic = opentype.loadSync(join(HERE, 'fonts', 'STIXTwoText-Italic.ttf'));
const mathUpright = opentype.loadSync(join(HERE, 'fonts', 'STIXTwoText.ttf'));

// The slate tile, embedded so every card stays a self-contained SVG.
const SLATE_TILE = `data:image/webp;base64,${readFileSync(join(HERE, 'assets', 'pizarra.webp')).toString('base64')}`;
const SLATE_PATTERN = `<pattern id="slate" width="341" height="341" patternUnits="userSpaceOnUse"><image href="${SLATE_TILE}" width="341" height="341"/></pattern>`;

const LOGIN = process.env.PROFILE_LOGIN || 'JheisonMB';
const ORG = process.env.PROFILE_ORG || 'UniverLab';
// Notebook JSON is mostly stored cell output: its byte count says nothing about
// the code written, and it would drown every other language.
const EXCLUDED_LANGUAGES = new Set(['Jupyter Notebook']);

// ── Text outlining ──────────────────────────────────────────────────────────
function spaced(font, text, x, y, size, trackEm = 0) {
  const track = size * trackEm;
  let cursor = x;
  const parts = [];
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    parts.push(g.getPath(cursor, y, size).toPathData(2));
    cursor += (g.advanceWidth / font.unitsPerEm) * size + track;
  }
  return { d: parts.join(' '), width: cursor - x - (text.length ? track : 0) };
}

function measure(font, text, size, trackEm = 0) {
  return spaced(font, text, 0, 0, size, trackEm).width;
}

function text(font, str, x, y, size, fill, { track = 0, anchor = 'start' } = {}) {
  const w = measure(font, str, size, track);
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return `<path d="${spaced(font, str, x0, y, size, track).d}" fill="${fill}"/>`;
}

// ── Colour helpers ──────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}
function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
/** Lift a language colour that would vanish on the dark background. */
function legible(hex) {
  const [r, g, b] = hexToRgb(hex || INK_DIM);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.35 ? mix(hex, '#ffffff', 0.35 - lum + 0.15) : hex;
}

/** Deterministic PRNG so the header's starfield is stable across builds. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const fmt = (n) => n.toLocaleString('en-US');

// ── Header ──────────────────────────────────────────────────────────────────
// A lecture board in chalk: the name block on the left; on the right, the
// thesis's denoising objective as equation (1) and Fig. 1, a star's profile as
// observed (noisy) and as recovered. Academic, like the LinkedIn banner, but
// with its own content.
function buildHeader() {
  const W = 1280;
  const H = 330;
  const X = 72;

  const kicker = 'ELECTRONIC ENGINEER · AI ENGINEER · FOUNDER @ UNIVERLAB';
  const name = 'JHEISON MARTINEZ BOLIVAR';
  const tagline = 'Building useful tools with rigor, ethics, and wonder.';

  const nameSize = 34;
  const nameTrack = 0.08;
  const nameBase = 158;

  // Right column: equation (1) on top, Fig. 1 under it, a chalk rule between.
  const RX = 790;
  const RW = W - 72 - RX;
  const eqBase = 98;
  const eqSize = 29;
  const eq = [
    [mathItalic, 'x', 0], [mathUpright, ' = arg min ', 0], [mathItalic, '‖y − x‖', 0], [mathUpright, '²', -10],
    [mathUpright, ' + ', 0], [mathItalic, 'λ', 0], [mathItalic, ' R(x)', 0],
  ];
  let ex = RX;
  const eqParts = eq.map(([font, str, dy]) => {
    const size = dy ? eqSize * 0.62 : eqSize;
    const out = text(font, str, ex, eqBase + dy, size, INK);
    ex += measure(font, str, size);
    return out;
  });
  // The hat on the estimate, and the "x" under arg min.
  const xw = measure(mathItalic, 'x', eqSize);
  const hat = `<path d="M${RX + xw * 0.18} ${eqBase - 22} L${RX + xw * 0.55} ${eqBase - 28} L${RX + xw * 0.92} ${eqBase - 22}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const argX = RX + measure(mathItalic, 'x', eqSize) + measure(mathUpright, ' = arg ', eqSize);
  const under = text(mathItalic, 'x', argX + measure(mathUpright, 'min', eqSize) / 2, eqBase + 20, eqSize * 0.5, INK, { anchor: 'middle' });
  const eqNum = text(mathUpright, '(1)', RX + RW, eqBase, 22, INK_DIM, { anchor: 'end' });

  // Fig. 1: a star's profile, observed (noisy chalk) and recovered (gold).
  const fx = RX + 8, fy = 134, fw = RW - 16, fh = 118;
  const N = 90;
  const rand = rng(20261020);
  const gauss = (t) => Math.exp(-((t - 0.5) ** 2) / (2 * 0.07 ** 2));
  const pt = (t, v) => `${(fx + t * fw).toFixed(1)} ${(fy + fh - 8 - v * (fh - 24)).toFixed(1)}`;
  let noisy = '';
  let clean = '';
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const g = gauss(t) * 0.82 + 0.08;
    noisy += `${i ? 'L' : 'M'}${pt(t, Math.max(0, Math.min(1, g + (rand() - 0.5) * 0.22)))} `;
    clean += `${i ? 'L' : 'M'}${pt(t, g)} `;
  }
  const axes = `<path d="M${fx} ${fy} V${fy + fh} H${fx + fw}" fill="none" stroke="${INK}" stroke-opacity=".75" stroke-width="1.8" stroke-linecap="round"/>`
    + [0.25, 0.5, 0.75].map((t) => `<path d="M${(fx + t * fw).toFixed(1)} ${fy + fh} v6" stroke="${INK}" stroke-opacity=".6" stroke-width="1.4"/>`).join('');
  const fig = `${axes}
  <path d="${noisy}" fill="none" stroke="${INK}" stroke-opacity=".7" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="${clean}" fill="none" stroke="${ACCENT}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
  ${text(mono, 'FLUX', fx + 8, fy + 12, 10.5, INK_DIM, { track: 0.12 })}
  ${text(mono, 'PIXEL', fx + fw, fy + fh + 20, 10.5, INK_DIM, { track: 0.12, anchor: 'end' })}`;
  const capBase = fy + fh + 34;
  const caption = `${text(serifBold, 'Fig. 1.', RX, capBase, 16, INK)}
  ${text(italic, 'A star’s profile, observed and recovered.', RX + measure(serifBold, 'Fig. 1. ', 16), capBase, 16, INK_DIM)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${name} — ${tagline}">
  <defs>
    ${SLATE_PATTERN}
    <radialGradient id="glow" cx="14%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.07"/>
      <stop offset="60%" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
    <filter id="chalk" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" rx="18" fill="${BG}"/>
  <rect width="${W}" height="${H}" rx="18" fill="url(#slate)"/>
  <rect width="${W}" height="${H}" rx="18" fill="url(#glow)"/>
  <rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="14" fill="none" stroke="${INK}" stroke-opacity=".6" stroke-width="1.6"/>
  <rect x="19" y="19" width="${W - 38}" height="${H - 38}" rx="9" fill="none" stroke="${INK}" stroke-opacity=".35" stroke-width="1"/>
  <path d="M${RX - 40} 64 V${H - 56}" stroke="${INK}" stroke-opacity=".3" stroke-width="1"/>

  ${text(mono, kicker, X, 98, 14, ACCENT, { track: 0.18 })}
  ${text(mono, name, X, nameBase, nameSize, INK, { track: nameTrack })}
  <rect x="${X}" y="${nameBase + 18}" width="52" height="3" rx="1.5" fill="${ACCENT}"/>
  ${text(italic, tagline, X, nameBase + 62, 25, INK_DIM)}

  <g filter="url(#chalk)">
  ${hat}
  ${eqParts.join('\n  ')}
  ${under}
  ${eqNum}
  ${fig}
  </g>
  ${caption}
</svg>
`;
}

// ── GitHub history card ─────────────────────────────────────────────────────
const QUERY = `query($login: String!, $org: String!) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {
      totalCount
      nodes { languages(first: 20, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } } }
    }
    repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, REPOSITORY]) { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionLevel weekday } }
      }
    }
  }
  organization(login: $org) {
    repositories(isFork: false, privacy: PUBLIC, first: 100) {
      totalCount
      nodes { languages(first: 20, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } } }
    }
  }
}`;

async function fetchStats() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required for the history card');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'jheisonmb-profile-cards' },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN, org: ORG } }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(`GitHub GraphQL failed: ${res.status} ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
}

function languageShares(data) {
  const bytes = new Map();
  const colors = new Map();
  const repos = [...data.user.repositories.nodes, ...data.organization.repositories.nodes];
  for (const repo of repos) {
    for (const { size, node } of repo.languages.edges) {
      if (EXCLUDED_LANGUAGES.has(node.name)) continue;
      bytes.set(node.name, (bytes.get(node.name) ?? 0) + size);
      colors.set(node.name, node.color);
    }
  }
  const total = [...bytes.values()].reduce((a, b) => a + b, 0);
  const sorted = [...bytes.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 6).map(([name, size]) => ({ name, share: size / total, color: legible(colors.get(name)) }));
  const rest = 1 - top.reduce((a, l) => a + l.share, 0);
  if (rest > 0.001) top.push({ name: 'Other', share: rest, color: INK_FAINT });
  return top;
}

function buildHistory(data) {
  const W = 1280;
  const H = 484;
  const X = 72;
  const innerW = W - 2 * X;
  const cc = data.user.contributionsCollection;

  // Metrics row.
  const metrics = [
    { value: cc.contributionCalendar.totalContributions, label: 'CONTRIBUTIONS' },
    { value: cc.totalCommitContributions, label: 'COMMITS' },
    { value: cc.totalPullRequestContributions, label: 'PULL REQUESTS' },
    { value: data.user.repositoriesContributedTo.totalCount, label: 'REPOS CONTRIBUTED TO' },
    { value: data.user.repositories.totalCount + data.organization.repositories.totalCount, label: 'OPEN-SOURCE REPOS' },
  ];
  const colW = innerW / metrics.length;
  const metricSvg = metrics
    .map(({ value, label }, i) => {
      const x = X + i * colW;
      return `${text(serif, fmt(value), x, 118, 46, INK)}
  ${text(mono, label, x, 146, 11.5, INK_DIM, { track: 0.12 })}`;
    })
    .join('\n  ');

  // Contribution heatmap.
  const weeks = cc.contributionCalendar.weeks;
  const pitch = innerW / weeks.length;
  const cell = Math.floor(pitch - 4);
  const top = 206;
  const level = {
    NONE: CELL_EMPTY,
    FIRST_QUARTILE: mix(BG, ACCENT, 0.28),
    SECOND_QUARTILE: mix(BG, ACCENT, 0.5),
    THIRD_QUARTILE: mix(BG, ACCENT, 0.74),
    FOURTH_QUARTILE: ACCENT,
  };
  const cells = [];
  const months = [];
  let lastMonth = -1;
  weeks.forEach((w, wi) => {
    const x = X + wi * pitch;
    for (const d of w.contributionDays) {
      const y = top + d.weekday * pitch;
      cells.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cell}" height="${cell}" rx="3" fill="${level[d.contributionLevel]}"/>`);
    }
    const first = new Date(`${w.contributionDays[0].date}T00:00:00Z`);
    const m = first.getUTCMonth();
    if (m !== lastMonth && wi < weeks.length - 2) {
      if (lastMonth !== -1 || first.getUTCDate() <= 7) {
        months.push(text(mono, first.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(), x, top - 12, 11, INK_DIM, { track: 0.1 }));
      }
      lastMonth = m;
    }
  });

  // Legend for the heatmap, right-aligned under it.
  const legendLevels = Object.values(level);
  const legendBase = top + 7 * pitch + 18;
  const moreW = measure(mono, 'MORE', 11, 0.1);
  const legendX = X + innerW - moreW - 8 - legendLevels.length * 16;
  const heatLegend = [
    text(mono, 'LESS', legendX - 8, legendBase, 11, INK_DIM, { track: 0.1, anchor: 'end' }),
    ...legendLevels.map((c, i) => `<rect x="${legendX + i * 16}" y="${legendBase - 10}" width="12" height="12" rx="2.5" fill="${c}"/>`),
    text(mono, 'MORE', X + innerW, legendBase, 11, INK_DIM, { track: 0.1, anchor: 'end' }),
  ].join('\n  ');

  // Languages: one stacked bar plus a legend.
  const langs = languageShares(data);
  const barY = top + 7 * pitch + 48;
  let bx = X;
  const bar = langs
    .map((l) => {
      const w = Math.max(l.share * innerW - 2, 1);
      const r = `<rect x="${bx.toFixed(1)}" y="${barY}" width="${w.toFixed(1)}" height="10" rx="2" fill="${l.color}"/>`;
      bx += l.share * innerW;
      return r;
    })
    .join('\n  ');
  let lx = X;
  const legendY = barY + 40;
  const langLegend = langs
    .map((l) => {
      const label = l.name;
      const pct = `${(l.share * 100).toFixed(l.share < 0.1 ? 1 : 0)}%`;
      const out = `<circle cx="${lx + 5}" cy="${legendY - 5}" r="5" fill="${l.color}"/>
  ${text(serif, label, lx + 16, legendY, 17, INK)}
  ${text(mono, pct, lx + 22 + measure(serif, label, 17), legendY, 13, INK_DIM)}`;
      lx += 22 + measure(serif, label, 17) + measure(mono, pct, 13) + 34;
      return out;
    })
    .join('\n  ');

  const updated = new Date().toISOString().slice(0, 10);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub activity of ${LOGIN} over the last 12 months">
  <defs>${SLATE_PATTERN}</defs>
  <rect width="${W}" height="${H}" rx="14" fill="${BG}"/>
  <rect width="${W}" height="${H}" rx="14" fill="url(#slate)"/>
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="10" fill="none" stroke="${INK}" stroke-opacity=".35" stroke-width="1"/>
  ${text(mono, 'LAST 12 MONTHS', X, 52, 13, ACCENT, { track: 0.2 })}
  ${text(mono, `UPDATED ${updated}`, X + innerW, 52, 11, INK_FAINT, { track: 0.12, anchor: 'end' })}
  ${metricSvg}
  ${months.join('\n  ')}
  ${heatLegend}
  ${cells.join('\n  ')}
  ${bar}
  ${langLegend}
</svg>
`;
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const [mode, outDir] = process.argv.slice(2);
if (mode === 'header') {
  const out = join(HERE, '..', 'assets');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'header.svg'), buildHeader());
  console.log('✓ assets/header.svg');
} else if (mode === 'history') {
  const out = outDir || join(HERE, '..', 'out');
  mkdirSync(out, { recursive: true });
  const svg = buildHistory(await fetchStats());
  writeFileSync(join(out, 'github-history.svg'), svg);
  console.log(`✓ ${join(out, 'github-history.svg')}`);
} else {
  console.error('usage: node build-profile.mjs header | history <outdir>');
  process.exit(2);
}
