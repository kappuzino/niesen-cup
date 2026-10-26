// Niesen Cup – Turnierlogik (rein, ohne DOM/DB → testbar)

export function rng(seed) {
  let a = (typeof seed === 'number' ? seed : hashStr(String(seed))) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const GROUP_NAMES = 'ABCDEFGH'.split('');

// ---------- Format ----------
export function suggestGroups(n) {
  if (n <= 5) return 1;
  if (n <= 11) return 2;
  return 4;
}
export function groupSizes(n, g) {
  const base = Math.floor(n / g), extra = n % g;
  return Array.from({ length: g }, (_, i) => base + (i < extra ? 1 : 0));
}
const rr = (k) => (k * (k - 1)) / 2;
export function koRounds(g) {
  if (g === 1) return ['final'];
  if (g === 2) return ['sf', 'final'];
  return ['qf', 'sf', 'final'];
}
export const STAGE_NAMES = { group: 'Gruppe', qf: 'Viertelfinale', sf: 'Halbfinale', third: 'Spiel um Platz 3', final: 'Finale' };

export function formatInfo(n, opts = {}) {
  const g = opts.groups || suggestGroups(n);
  const legs = opts.double ? 2 : 1;
  const consoles = opts.consoles || 4;
  const minutes = opts.matchMinutes || 15;
  if (n < 3) return { ok: false, groups: g, text: 'Mindestens 3 Spieler nötig', games: 0, duration: 0 };
  const sizes = groupSizes(n, g);
  if (sizes.some((s) => s < 2)) return { ok: false, groups: g, text: 'Zu wenige Spieler für ' + g + ' Gruppen', games: 0, duration: 0 };
  const groupGames = sizes.reduce((s, k) => s + rr(k) * legs, 0);
  const rounds = koRounds(g);
  const koGames = { final: 1, sf: 2, qf: 4 };
  let ko = rounds.reduce((s, r) => s + koGames[r], 0) + (opts.thirdPlace && g >= 2 ? 1 : 0);
  // Gruppenspiele parallel auf den Stationen, K.o.-Runden nacheinander
  const slots = Math.ceil(groupGames / Math.min(consoles, Math.floor(n / 2))) + rounds.length;
  const duration = slots * minutes;
  const label = g === 1
    ? 'Jeder gegen jeden' + (legs === 2 ? ' (Hin & Rück)' : '') + ' → Finale'
    : g + ' Gruppen (' + sizes.join(' + ') + ') → ' + rounds.map((r) => STAGE_NAMES[r]).join(' → ');
  return { ok: true, groups: g, sizes, groupGames, koGames: ko, games: groupGames + ko, duration, text: label };
}
export function fmtDuration(min) {
  return Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0') + ' h';
}

// ---------- Spielplan ----------
export function roundRobin(ids) {
  const list = ids.slice();
  if (list.length % 2) list.push(null);
  const n = list.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i], b = list[n - 1 - i];
      if (a && b) pairs.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop());
  }
  return rounds;
}

// groups: { A: [pid,...], B: [...] } → Gruppenspiele + K.o.-Gerüst
export function buildMatches(groups, opts = {}) {
  const out = [];
  const names = Object.keys(groups).sort();
  const perGroup = names.map((g) => {
    let rounds = roundRobin(groups[g]);
    if (opts.double) rounds = rounds.concat(rounds.map((r) => r.map(([a, b]) => [b, a])));
    return rounds;
  });
  const maxR = Math.max(...perGroup.map((r) => r.length));
  let order = 0;
  for (let r = 0; r < maxR; r++) {
    names.forEach((g, gi) => {
      (perGroup[gi][r] || []).forEach(([h, a]) => {
        out.push({ id: 'g' + g + '-' + String(order).padStart(3, '0'), stage: 'group', group: g, round: r + 1, order: order++, home: h, away: a, status: 'scheduled' });
      });
    });
  }
  const G = names.length;
  const ko = [];
  const src = (group, pos) => ({ group, pos });
  const w = (id) => ({ winner: id });
  const l = (id) => ({ loser: id });
  if (G === 1) {
    ko.push({ id: 'final', stage: 'final', homeFrom: src('A', 1), awayFrom: src('A', 2) });
  } else if (G === 2) {
    ko.push({ id: 'sf1', stage: 'sf', homeFrom: src('A', 1), awayFrom: src('B', 2) });
    ko.push({ id: 'sf2', stage: 'sf', homeFrom: src('B', 1), awayFrom: src('A', 2) });
    if (opts.thirdPlace) ko.push({ id: 'third', stage: 'third', homeFrom: l('sf1'), awayFrom: l('sf2') });
    ko.push({ id: 'final', stage: 'final', homeFrom: w('sf1'), awayFrom: w('sf2') });
  } else {
    ko.push({ id: 'qf1', stage: 'qf', homeFrom: src('A', 1), awayFrom: src('B', 2) });
    ko.push({ id: 'qf2', stage: 'qf', homeFrom: src('C', 1), awayFrom: src('D', 2) });
    ko.push({ id: 'qf3', stage: 'qf', homeFrom: src('B', 1), awayFrom: src('A', 2) });
    ko.push({ id: 'qf4', stage: 'qf', homeFrom: src('D', 1), awayFrom: src('C', 2) });
    ko.push({ id: 'sf1', stage: 'sf', homeFrom: w('qf1'), awayFrom: w('qf2') });
    ko.push({ id: 'sf2', stage: 'sf', homeFrom: w('qf3'), awayFrom: w('qf4') });
    if (opts.thirdPlace) ko.push({ id: 'third', stage: 'third', homeFrom: l('sf1'), awayFrom: l('sf2') });
    ko.push({ id: 'final', stage: 'final', homeFrom: w('sf1'), awayFrom: w('sf2') });
  }
  ko.forEach((m) => out.push({ ...m, order: 1000 + order++, home: null, away: null, status: 'pending' }));
  return out;
}

// ---------- Ergebnisse ----------
export const isDone = (m) => m.status === 'confirmed';
export function winnerOf(m) {
  if (!isDone(m)) return null;
  if (m.hg > m.ag) return m.home; if (m.ag > m.hg) return m.away;
  if (m.ph != null && m.pa != null) return m.ph > m.pa ? m.home : m.away;
  return null;
}
export function loserOf(m) {
  const w = winnerOf(m); if (!w) return null;
  return w === m.home ? m.away : m.home;
}

function baseRow(pid) { return { pid, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; }
function tally(pids, matches) {
  const rows = new Map(pids.map((p) => [p, baseRow(p)]));
  for (const m of matches) {
    if (!isDone(m) || !rows.has(m.home) || !rows.has(m.away)) continue;
    const h = rows.get(m.home), a = rows.get(m.away);
    h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
    if (m.hg > m.ag) { h.w++; a.l++; h.pts += 3; } else if (m.hg < m.ag) { a.w++; h.l++; a.pts += 3; } else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  for (const r of rows.values()) r.gd = r.gf - r.ga;
  return rows;
}

// Tabelle mit Tiebreakern. tiebreak: 'gd' | 'h2h'. seed für Losentscheid.
export function standings(pids, matches, tiebreak = 'gd', seed = 'los') {
  const gm = matches.filter((m) => m.stage === 'group');
  const rows = tally(pids, gm);
  const lot = (pid) => hashStr(seed + ':' + pid);
  const cmpOverall = (a, b) => (b.gd - a.gd) || (b.gf - a.gf);
  function sortSet(set) {
    // set: Array von rows mit gleicher Punktzahl
    if (set.length < 2) return set;
    if (tiebreak === 'h2h') {
      const ids = set.map((r) => r.pid);
      const mini = tally(ids, gm);
      const groupsByKey = new Map();
      set.forEach((r) => { const m = mini.get(r.pid); const k = [m.pts, m.gd, m.gf].join('|'); if (!groupsByKey.has(k)) groupsByKey.set(k, []); groupsByKey.get(k).push(r); });
      if (groupsByKey.size > 1) {
        const keys = [...groupsByKey.keys()].sort((x, y) => { const [p1, d1, f1] = x.split('|').map(Number), [p2, d2, f2] = y.split('|').map(Number); return (p2 - p1) || (d2 - d1) || (f2 - f1); });
        return keys.flatMap((k) => sortSet(groupsByKey.get(k)));
      }
      return set.slice().sort((a, b) => cmpOverall(a, b) || (lot(a.pid) - lot(b.pid)));
    }
    // 'gd': Tordifferenz, Tore, dann direkter Vergleich, dann Los
    const byKey = new Map();
    set.forEach((r) => { const k = r.gd + '|' + r.gf; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(r); });
    const keys = [...byKey.keys()].sort((x, y) => { const [d1, f1] = x.split('|').map(Number), [d2, f2] = y.split('|').map(Number); return (d2 - d1) || (f2 - f1); });
    return keys.flatMap((k) => {
      const sub = byKey.get(k);
      if (sub.length < 2) return sub;
      const mini = tally(sub.map((r) => r.pid), gm);
      return sub.slice().sort((a, b) => { const x = mini.get(a.pid), y = mini.get(b.pid); return (y.pts - x.pts) || (y.gd - x.gd) || (y.gf - x.gf) || (lot(a.pid) - lot(b.pid)); });
    });
  }
  const all = [...rows.values()];
  const byPts = new Map();
  all.forEach((r) => { if (!byPts.has(r.pts)) byPts.set(r.pts, []); byPts.get(r.pts).push(r); });
  const sorted = [...byPts.keys()].sort((a, b) => b - a).flatMap((p) => sortSet(byPts.get(p)));
  return sorted.map((r, i) => ({ ...r, pos: i + 1 }));
}

export function groupStageDone(matches) {
  const g = matches.filter((m) => m.stage === 'group');
  return g.length > 0 && g.every(isDone);
}

// Liefert Updates {id, home, away, status} für K.o.-Spiele, deren Teilnehmer feststehen
export function resolveKO(matches, groups, tiebreak, seed) {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const tables = {};
  const gDone = groupStageDone(matches);
  if (gDone) for (const g of Object.keys(groups)) tables[g] = standings(groups[g], matches, tiebreak, seed);
  const pick = (from) => {
    if (!from) return null;
    if (from.group) return gDone ? (tables[from.group][from.pos - 1] || {}).pid || null : null;
    if (from.winner) { const m = byId.get(from.winner); return m ? winnerOf(m) : null; }
    if (from.loser) { const m = byId.get(from.loser); return m ? loserOf(m) : null; }
    return null;
  };
  const updates = [];
  for (const m of matches) {
    if (m.stage === 'group' || m.status !== 'pending') continue;
    const h = pick(m.homeFrom), a = pick(m.awayFrom);
    if (h && a) updates.push({ id: m.id, home: h, away: a, status: 'scheduled' });
  }
  return updates;
}

// Stationen füllen: freie Stationen (ohne Streamstation) mit dem nächsten spielbaren Spiel belegen
export function fillConsoles(matches, consoles = 4) {
  const live = matches.filter((m) => m.status === 'live' || m.status === 'reported' || m.status === 'disputed');
  const used = new Set(live.map((m) => m.console));
  const busy = new Set(live.flatMap((m) => [m.home, m.away]));
  const free = [];
  for (let c = 1; c <= consoles; c++) if (!used.has(c)) free.push(c);
  const queue = matches.filter((m) => m.status === 'scheduled' && m.home && m.away && !m.held).sort((a, b) => a.order - b.order);
  const updates = [];
  for (const m of queue) {
    if (!free.length) break;
    if (busy.has(m.home) || busy.has(m.away)) continue;
    const c = free.shift();
    busy.add(m.home); busy.add(m.away);
    updates.push({ id: m.id, status: 'live', console: c });
  }
  return updates;
}

// ---------- Auslosung ----------
// players: [{id}], pool: [team], G Gruppen → [{pid, teamId, pot, group}] in Aufdeck-Reihenfolge
export function drawPots(playerIds, poolTeams, G, rnd) {
  const n = playerIds.length;
  const sorted = poolTeams.slice().sort((a, b) => b.r - a.r);
  const band = sorted.slice(0, Math.min(sorted.length, Math.max(n, Math.ceil(n * 1.6))));
  const chosen = shuffle(band, rnd).slice(0, n).sort((a, b) => b.r - a.r);
  const players = shuffle(playerIds, rnd);
  const res = [];
  const potCount = Math.ceil(n / G);
  for (let p = 0; p < potCount; p++) {
    const potTeams = shuffle(chosen.slice(p * G, p * G + G), rnd);
    const groupsOrder = shuffle(GROUP_NAMES.slice(0, G), rnd);
    potTeams.forEach((t, i) => {
      res.push({ pid: players[p * G + i], teamId: t.id, pot: p + 1, group: groupsOrder[i] });
    });
  }
  return { reveal: res, potTeams: chosen.map((t, i) => ({ teamId: t.id, pot: Math.floor(i / G) + 1 })) };
}

export function drawRandom(playerIds, poolTeams, G, rnd) {
  const n = playerIds.length;
  const teams = shuffle(poolTeams, rnd).slice(0, n);
  const players = shuffle(playerIds, rnd);
  const groups = balancedGroups(n, G, rnd);
  return { reveal: players.map((pid, i) => ({ pid, teamId: teams[i].id, pot: 0, group: groups[i] })), potTeams: [] };
}

// Spieler mit bereits feststehendem Team (Wahl/Draft) in Gruppen losen, nach Teamstärke in Töpfen
export function drawGroupsForTeams(assign, teamR, G, rnd) {
  const sorted = assign.slice().sort((a, b) => (teamR(b.teamId) - teamR(a.teamId)));
  const res = [];
  for (let p = 0; p * G < sorted.length; p++) {
    const pot = shuffle(sorted.slice(p * G, p * G + G), rnd);
    const gs = shuffle(GROUP_NAMES.slice(0, G), rnd);
    pot.forEach((x, i) => res.push({ pid: x.pid, teamId: x.teamId, pot: p + 1, group: gs[i] }));
  }
  return { reveal: res, potTeams: [] };
}

function balancedGroups(n, G, rnd) {
  const sizes = groupSizes(n, G);
  const list = [];
  sizes.forEach((s, i) => { for (let k = 0; k < s; k++) list.push(GROUP_NAMES[i]); });
  return shuffle(list, rnd);
}

export function groupsFromReveal(reveal) {
  const g = {};
  reveal.forEach((r) => { (g[r.group] = g[r.group] || []).push(r.pid); });
  return g;
}

export function voteWinner(players, options, rnd) {
  const count = Object.fromEntries(options.map((o) => [o, 0]));
  players.forEach((p) => { if (p.vote in count) count[p.vote]++; });
  const max = Math.max(...Object.values(count));
  const top = options.filter((o) => count[o] === max);
  return { winner: top[Math.floor(rnd() * top.length)], count };
}

// ---------- Regel-Roulette ----------
export const ROULETTE = [
  'Golden Goal in jeder Verlängerung',
  'Der Gruppenletzte darf die Pizza aussuchen',
  'Jeder Spieler bekommt einen Joker (1× neues Team ziehen)',
  'Im Finale wird Best-of-3 gespielt',
  'Kein Elfmeterschießen – Entscheidung per Golden Goal',
  'Der Turniersieger bestimmt den Modus fürs nächste Turnier',
  'Wer zu spät zum Anpfiff kommt, startet 0:1',
  'Der Verlierer des Eröffnungsspiels holt die Getränke'
];

// ---------- Turnier-Zusammenfassung / Ewige Tabelle ----------
export function tournamentSummary(players, matches) {
  const name = (pid) => (players.find((p) => p.id === pid) || {}).name || '?';
  const stats = new Map();
  const row = (pid) => { if (!stats.has(pid)) stats.set(pid, { name: name(pid), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }); return stats.get(pid); };
  for (const m of matches) {
    if (!isDone(m)) continue;
    const h = row(m.home), a = row(m.away);
    h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
    if (m.hg > m.ag) { h.w++; a.l++; } else if (m.hg < m.ag) { a.w++; h.l++; } else { h.d++; a.d++; }
  }
  const fin = matches.find((m) => m.stage === 'final');
  const third = matches.find((m) => m.stage === 'third');
  const pl = (pid) => { const p = players.find((x) => x.id === pid); return p ? { name: p.name, team: p.team || null } : null; };
  return {
    champion: fin ? pl(winnerOf(fin)) : null,
    runnerUp: fin ? pl(loserOf(fin)) : null,
    third: third ? pl(winnerOf(third)) : null,
    table: [...stats.values()]
  };
}

export function eternalTable(finishedTournaments) {
  const map = new Map();
  for (const t of finishedTournaments) {
    const s = t.summary; if (!s) continue;
    for (const r of s.table || []) {
      const k = r.name.trim().toLowerCase();
      if (!map.has(k)) map.set(k, { name: r.name, t: 0, titles: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
      const e = map.get(k);
      e.t++; e.p += r.p; e.w += r.w; e.d += r.d; e.l += r.l; e.gf += r.gf; e.ga += r.ga;
    }
    if (s.champion) { const k = s.champion.name.trim().toLowerCase(); if (map.has(k)) map.get(k).titles++; }
  }
  return [...map.values()].map((e) => ({ ...e, pts: e.w * 3 + e.d, gd: e.gf - e.ga }))
    .sort((a, b) => (b.pts - a.pts) || (b.titles - a.titles) || (b.gd - a.gd) || (b.gf - a.gf));
}
