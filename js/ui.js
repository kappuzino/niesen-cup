// Niesen Cup – UI-Helfer
import { teamById, starText } from './teams.js';
import { S, settings } from './state.js';

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const LOGO = 'assets/niesen-logo-rot.svg';
export function brand(size = 'm') {
  return `<span class="brand brand-${size}"><img src="${LOGO}" alt="Niesen"><span>CUP</span></span>`;
}

export function flag(code, cls = '') {
  return code ? `<img class="flag ${cls}" src="assets/flags/${code}.svg" alt="" loading="lazy">` : '';
}

// Team-Abzeichen: Flagge (Nation) oder Wappen/Badge (Club)
export function badge(teamId, size = 'm') {
  const t = teamById(teamId);
  if (!t) return `<span class="badge badge-${size} badge-empty" aria-hidden="true"></span>`;
  if (t.flag) return `<span class="badge badge-${size} badge-flag">${flag(t.flag)}</span>`;
  const [c1, c2] = t.colors || ['#22306A', '#FFFFFF'];
  const fg = contrastText(c1, c2);
  const crest = settings().crests && t.wiki ? ` data-wiki="${esc(t.wiki)}"` : '';
  return `<span class="badge badge-${size} badge-club"${crest} style="--c1:${c1};--c2:${c2};--fg:${fg}"><b>${esc(t.short)}</b></span>`;
}
export function teamLine(teamId, opts = {}) {
  const t = teamById(teamId);
  if (!t) return '<span class="muted">noch offen</span>';
  return `${badge(teamId, opts.size || 's')}<span class="tname">${esc(t.name)}</span>${opts.stars ? `<span class="stars">${starText(t.r)}</span>` : ''}`;
}

function lum(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastText(bg, alt) {
  const L = lum(bg);
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  if (alt && ratio(L, lum(alt)) >= 3) return alt;
  return L > 0.4 ? '#000000' : '#FFFFFF';
}

// ---- Wappen über die Wikipedia-API nachladen (mit Cache) ----
const CREST_KEY = 'niesencup-crests-v1';
let crestCache = {};
try { crestCache = JSON.parse(localStorage.getItem(CREST_KEY)) || {}; } catch { crestCache = {}; }
const pending = new Set();
let timer = null;
export function hydrateCrests(root = document) {
  if (!settings().crests) return;
  const els = root.querySelectorAll('.badge-club[data-wiki]:not([data-done])');
  const need = [];
  els.forEach((el) => {
    const w = el.dataset.wiki;
    if (w in crestCache) apply(el, crestCache[w]);
    else if (!pending.has(w)) need.push(w);
  });
  if (!need.length) return;
  need.forEach((w) => pending.add(w));
  clearTimeout(timer);
  timer = setTimeout(() => fetchCrests([...pending]), 50);
}
function apply(el, url) {
  el.dataset.done = '1';
  if (!url) return;
  const img = new Image();
  img.alt = '';
  img.onload = () => { el.classList.add('has-crest'); el.innerHTML = ''; el.appendChild(img); };
  img.src = url;
}
async function fetchCrests(titles) {
  for (let i = 0; i < titles.length; i += 40) {
    const chunk = titles.slice(i, i + 40);
    const url = 'https://de.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=160&titles=' + encodeURIComponent(chunk.map((t) => t.replace(/_/g, ' ')).join('|'));
    try {
      const res = await fetch(url);
      const js = await res.json();
      const q = js.query || {};
      const map = {};
      chunk.forEach((t) => { map[t.replace(/_/g, ' ')] = t; });
      (q.normalized || []).forEach((n) => { if (map[n.from]) map[n.to] = map[n.from]; });
      (q.redirects || []).forEach((r) => { if (map[r.from]) map[r.to] = map[r.from]; });
      Object.values(q.pages || {}).forEach((p) => {
        const orig = map[p.title];
        if (orig) crestCache[orig] = p.thumbnail ? p.thumbnail.source : '';
      });
      chunk.forEach((t) => { if (!(t in crestCache)) crestCache[t] = ''; pending.delete(t); });
      try { localStorage.setItem(CREST_KEY, JSON.stringify(crestCache)); } catch { /* voll */ }
    } catch (e) {
      chunk.forEach((t) => pending.delete(t));
    }
  }
  hydrateCrests();
}
export function clearCrestCache() { crestCache = {}; try { localStorage.removeItem(CREST_KEY); } catch { /* */ } }

// ---- Zeit ----
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return `${WD[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
export function fmtDateTime(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${WD[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}., ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} Uhr`;
}
export function countdownParts(ms) {
  const diff = Math.max(0, ms - Date.now());
  const s = Math.floor(diff / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, done: diff <= 0 };
}
export function countdownHTML(ms, big = false) {
  return `<div class="countdown ${big ? 'countdown-big' : ''}" data-countdown="${ms}">${countdownInner(ms)}</div>`;
}
function countdownInner(ms) {
  const c = countdownParts(ms);
  const cells = c.d > 0 ? [[c.d, c.d === 1 ? 'TAG' : 'TAGE'], [c.h, 'STD'], [c.m, 'MIN']] : [[c.h, 'STD'], [c.m, 'MIN'], [c.s, 'SEK']];
  return cells.map(([v, l]) => `<div class="cd-cell"><span class="cd-v">${String(v).padStart(2, '0')}</span><span class="cd-l">${l}</span></div>`).join('');
}
export function tickCountdowns() {
  document.querySelectorAll('[data-countdown]').forEach((el) => { el.innerHTML = countdownInner(Number(el.dataset.countdown)); });
}

// ---- QR-Code ----
export function qrSVG(text) {
  if (!window.qrcode) return '';
  const q = window.qrcode(0, 'M');
  q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

// ---- Konfetti ----
let fxRun = null;
export function confetti(duration = 6000) {
  const cv = document.getElementById('fx');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = (cv.width = innerWidth * devicePixelRatio), H = (cv.height = innerHeight * devicePixelRatio);
  const colors = ['#F5C84B', '#E30713', '#FFFFFF', '#3EE0FF', '#FFE08A'];
  const parts = Array.from({ length: 260 }, () => ({
    x: Math.random() * W, y: -Math.random() * H * 0.6, r: (4 + Math.random() * 7) * devicePixelRatio,
    vy: (2 + Math.random() * 4) * devicePixelRatio, vx: (Math.random() - 0.5) * 3 * devicePixelRatio,
    rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)]
  }));
  const end = performance.now() + duration;
  cancelAnimationFrame(fxRun);
  const step = (now) => {
    ctx.clearRect(0, 0, W, H);
    parts.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y > H && now < end) { p.y = -20; p.x = Math.random() * W; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
    });
    if (now < end + 4000) fxRun = requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
  };
  fxRun = requestAnimationFrame(step);
}

// ---- Turnierbaum-Linien ----
export function drawBracketLines(root = document) {
  const wrap = root.querySelector('.bracket');
  if (!wrap) return;
  const svg = wrap.querySelector('svg.bracket-lines');
  if (!svg) return;
  const box = wrap.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  let paths = '';
  wrap.querySelectorAll('[data-from]').forEach((el) => {
    const target = el.getBoundingClientRect();
    el.dataset.from.split(',').forEach((src) => {
      const s = wrap.querySelector(`[data-mid="${src}"]`);
      if (!s) return;
      const a = s.getBoundingClientRect();
      const x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top;
      const x2 = target.left - box.left, y2 = target.top + target.height / 2 - box.top;
      const mx = (x1 + x2) / 2;
      const done = s.classList.contains('done');
      paths += `<path d="M${x1},${y1} H${mx} V${y2} H${x2}" class="${done ? 'lit' : ''}"/>`;
    });
  });
  svg.innerHTML = paths;
}

export function toast(msg, kind = '') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.className = 'show ' + kind;
  el.textContent = msg;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ''; }, 3200);
}
