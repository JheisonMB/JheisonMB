// Self-hosted cards for the JheisonMB profile README — no third-party image
// services (capsule-render, github-readme-stats) in the rendering path.
//
// GitHub serves README SVGs as images and loads no custom fonts, so every
// piece of text is outlined to vector <path> here. Brand tokens and fonts are
// UniverLab's (UniverLab/.github scripts/build-banners.mjs).
//
//   node build-profile.mjs header            → ../assets/header.svg (static, committed)
//   node build-profile.mjs history <outdir>  → <outdir>/github-history.svg
//                                              (needs GITHUB_TOKEN; built daily by
//                                              .github/workflows/profile-cards.yml)

import opentype from 'opentype.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── Brand tokens ────────────────────────────────────────────────────────────
const BG = '#0a0b0e';
const INK = '#e8e6e1';
const INK_DIM = '#8b8a86';
const INK_FAINT = '#4a4a48';
const ACCENT = '#e6c84a';
const CELL_EMPTY = '#16181d';

const mono = opentype.loadSync(join(HERE, 'fonts', 'IBMPlexMono-500.ttf'));
const grotesk = opentype.loadSync(join(HERE, 'fonts', 'SpaceGrotesk-500.ttf'));

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
function buildHeader() {
  const W = 1280;
  const H = 300;
  const X = 72;

  const kicker = 'ELECTRONIC ENGINEER · AI ENGINEER · FOUNDER @ UNIVERLAB';
  const name = 'JHEISON MARTINEZ BOLIVAR';
  const tagline = 'Building useful tools with rigor, ethics, and wonder.';

  const nameSize = 42;
  const nameTrack = 0.1;
  const nameBase = 150;
  const nameW = measure(mono, name, nameSize, nameTrack);

  // Orbit system, right side: three tilted ellipses around a bright core.
  const cx = 1085;
  const cy = 150;
  const orbits = [
    { rx: 150, ry: 46, dur: 38, r: 4.2, op: 0.9 },
    { rx: 104, ry: 32, dur: 23, r: 3.2, op: 0.75 },
    { rx: 62, ry: 19, dur: 14, r: 2.4, op: 0.6 },
  ];
  const tilt = -16;
  const orbitSvg = orbits
    .map(({ rx, ry, dur, r, op }, i) => {
      const id = `orbit${i}`;
      const d = `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
      return `<path id="${id}" d="${d}" fill="none" stroke="${INK}" stroke-opacity="${0.1 + i * 0.03}" stroke-width="1"/>
      <circle r="${r}" fill="${ACCENT}" fill-opacity="${op}">
        <animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0"><mpath href="#${id}"/></animateMotion>
      </circle>`;
    })
    .join('\n      ');

  // Starfield, kept off the text block by the mask below.
  const rand = rng(20210201);
  const stars = [];
  for (let i = 0; i < 90; i++) {
    const x = 520 + rand() * (W - 520);
    const y = 12 + rand() * (H - 24);
    const r = 0.5 + rand() * 1.1;
    const op = 0.15 + rand() * 0.45;
    const twinkle = rand() < 0.18;
    stars.push(
      twinkle
        ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${INK}" opacity="${op.toFixed(2)}"><animate attributeName="opacity" values="${op.toFixed(2)};0.05;${op.toFixed(2)}" dur="${(3 + rand() * 4).toFixed(1)}s" repeatCount="indefinite"/></circle>`
        : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${INK}" opacity="${op.toFixed(2)}"/>`,
    );
  }

  const fadeStart = Math.min(0.6, (X + nameW + 40) / W).toFixed(3);
  const fadeFull = Math.min(0.75, Number(fadeStart) + 0.12).toFixed(3);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${name} — ${tagline}">
  <defs>
    <radialGradient id="glow" cx="14%" cy="20%" r="75%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.09"/>
      <stop offset="60%" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.55"/>
      <stop offset="35%" stop-color="${ACCENT}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="skyFadeGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="${fadeStart}" stop-color="#000"/>
      <stop offset="${fadeFull}" stop-color="#fff"/>
    </linearGradient>
    <mask id="skyFade"><rect width="${W}" height="${H}" fill="url(#skyFadeGrad)"/></mask>
  </defs>

  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <g mask="url(#skyFade)">
    ${stars.join('\n    ')}
    <circle cx="${cx}" cy="${cy}" r="70" fill="url(#core)"/>
    <circle cx="${cx}" cy="${cy}" r="5" fill="${ACCENT}"/>
    <g transform="rotate(${tilt} ${cx} ${cy})">
      ${orbitSvg}
    </g>
  </g>

  ${text(mono, kicker, X, 92, 15, ACCENT, { track: 0.18 })}
  ${text(mono, name, X, nameBase, nameSize, INK, { track: nameTrack })}
  <rect x="${X}" y="${nameBase + 18}" width="52" height="3" rx="1.5" fill="${ACCENT}"/>
  ${text(grotesk, tagline, X, nameBase + 60, 22, INK_DIM)}
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
      return `${text(grotesk, fmt(value), x, 118, 44, INK)}
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
  ${text(grotesk, label, lx + 16, legendY, 16, INK)}
  ${text(mono, pct, lx + 22 + measure(grotesk, label, 16), legendY, 13, INK_DIM)}`;
      lx += 22 + measure(grotesk, label, 16) + measure(mono, pct, 13) + 34;
      return out;
    })
    .join('\n  ');

  const updated = new Date().toISOString().slice(0, 10);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub activity of ${LOGIN} over the last 12 months">
  <rect width="${W}" height="${H}" rx="14" fill="${BG}"/>
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
