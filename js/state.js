// Niesen Cup – globaler Zustand + abgeleitete Werte
import { POOLS, teamById } from './teams.js';
import { DEFAULT_SETTINGS } from './config.js';
import { standings, GROUP_NAMES } from './logic.js';

export const S = {
  ready: false,
  user: null,
  isAdmin: false,
  settings: { ...DEFAULT_SETTINGS },
  tournaments: [],
  t: null,
  players: [],
  matches: [],
  picks: [],
  draftPicks: [],
  adminRequests: [],
  admins: [],
  myRequest: null,
  route: '/',
  adminTab: 'turnier',
  error: null,
  anim: {}
};

export const STATUS_LABEL = { open: 'Anmeldung', checkin: 'Check-in', draw: 'Auslosung', running: 'Turnier läuft', finished: 'Beendet' };
export const DIST_LABEL = { pots: 'Lostöpfe nach Stärke', random: 'Komplett zufällig', choice: 'Freie Wahl', draft: 'Draft' };
export const KO_TIE_LABEL = { et_pen: 'Verlängerung, dann Elfmeterschießen', pen: 'Direkt Elfmeterschießen', gg: 'Golden Goal in der Verlängerung, dann Elfmeterschießen' };
export const TIEBREAK_LABEL = {
  gd: 'Punkte → Tordifferenz → geschossene Tore → direkter Vergleich → Los',
  h2h: 'Punkte → direkter Vergleich (Punkte, Tordifferenz, Tore) → Tordifferenz → geschossene Tore → Los'
};

export const settings = () => ({ ...DEFAULT_SETTINGS, ...(S.settings || {}) });
export const STREAM = 99;
export const stationName = (c) => (c === STREAM ? (settings().streamName || 'Streamstation') : 'Station ' + c);
export const stationShort = (c) => (c === STREAM ? 'STREAM' : 'St. ' + c);
export function stationList() {
  const st = settings();
  const l = []; for (let c = 1; c <= st.consoles; c++) l.push(c);
  if (st.streamStation) l.push(STREAM);
  return l;
}
export const ACTIVE = ['live', 'reported', 'disputed'];
export const uid = () => (S.user ? S.user.uid : null);
export const me = () => S.players.find((p) => p.id === uid()) || null;
export const playerById = (id) => S.players.find((p) => p.id === id) || null;
export const pname = (id) => { const p = playerById(id); return p ? p.name : '–'; };
export const present = () => S.players.filter((p) => p.present);
export const pool = (t = S.t) => (t && t.pool ? POOLS[t.pool] : null);
export const tiebreak = (t = S.t) => {
  if (!t) return 'gd';
  if (t.tiebreak && t.tiebreak !== 'auto') return t.tiebreak;
  const p = pool(t); return p ? p.tiebreak : 'gd';
};
export const groupsOf = (t = S.t) => (t && t.groups) || {};
export const groupNames = (t = S.t) => Object.keys(groupsOf(t)).sort();

// Team eines Spielers: nach Turnierstart steht es im Spieler, vorher in der Auslosung
export function teamOfPlayer(pid, t = S.t) {
  const p = playerById(pid);
  if (p && p.team) return p.team;
  if (t && t.draw && t.draw.reveal) {
    const i = t.draw.reveal.findIndex((r) => r.pid === pid);
    if (i >= 0 && (t.draw.shown || 0) > i) return t.draw.reveal[i].teamId;
  }
  if (t && t.draft && t.draft.picks && t.draft.picks[pid]) return t.draft.picks[pid];
  const pk = S.picks.find((x) => x.pid === pid);
  if (pk) return pk.id;
  return null;
}
export const team = (id) => teamById(id);

export function tables(t = S.t) {
  const g = groupsOf(t);
  const out = {};
  for (const name of Object.keys(g).sort()) out[name] = standings(g[name], S.matches, tiebreak(t), t ? t.id : 'x');
  return out;
}

export function currentTournament(list) {
  const sorted = list.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return sorted.find((t) => t.status !== 'finished') || sorted[0] || null;
}

export function regOpen(t = S.t) {
  return !!t && t.status === 'open' && Date.now() < (t.regDeadline || 0);
}

export { GROUP_NAMES };
