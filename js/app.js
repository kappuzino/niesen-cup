// Niesen Cup – App-Kern: Daten-Abos, Router, Aktionen, Admin-Automatik
import { db, DEMO, resetDemo } from './db.js';
import { DEFAULT_SETTINGS } from './config.js';
import { POOLS, teamById } from './teams.js';
import { S, settings, uid, me, present, pool, tiebreak, groupsOf, currentTournament, playerById, pname, stationName } from './state.js';
import * as L from './logic.js';
import { homeView, rulesView, hallView, liveView } from './views.js';
import { adminView } from './adminViews.js';
import { hydrateCrests, tickCountdowns, drawBracketLines, confetti, toast, esc } from './ui.js';

const app = document.getElementById('app');
const tPath = (sub = '') => 'tournaments/' + S.t.id + (sub ? '/' + sub : '');
const now = () => Date.now();

// ---------------- Start ----------------
async function start() {
  try {
    await db.init();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="fatal"><h1>Verbindung fehlgeschlagen</h1><p>${esc(e.message || e)}</p><p>Prüfe, ob in Firebase die anonyme Anmeldung aktiviert ist.</p><p><a href="?demo#/">Demo-Modus öffnen</a></p></div>`;
    return;
  }
  db.onAuth((u) => { S.user = u; subscribeUser(); schedule(); });
  db.watch('config/settings', (s) => { S.settings = { ...DEFAULT_SETTINGS, ...(s || {}) }; schedule(); });
  db.watch('tournaments', (list) => {
    S.tournaments = list;
    const cur = currentTournament(list);
    const changed = (cur ? cur.id : null) !== (S.t ? S.t.id : null);
    S.t = cur;
    if (changed) subscribeTournament();
    S.ready = true;
    schedule();
    automation();
  }, (e) => showErr(e));
  window.addEventListener('hashchange', route);
  route();
  setInterval(() => { tickCountdowns(); if (S.isAdmin) checkDeadline(); }, 1000);
  window.addEventListener('resize', () => drawBracketLines());
}

let userSubs = [];
function subscribeUser() {
  userSubs.forEach((u) => u()); userSubs = [];
  const u = S.user; if (!u) return;
  const owner = db.isOwner(u);
  S.isAdmin = owner;
  userSubs.push(db.watch('admins/' + u.uid, (doc) => {
    const was = S.isAdmin;
    S.isAdmin = owner || !!doc;
    if (S.isAdmin && !was) subscribeAdmin();
    schedule(); automation();
  }, () => {}));
  if (owner) subscribeAdmin();
  if (!u.anon) userSubs.push(db.watch('adminRequests/' + u.uid, (doc) => { S.myRequest = doc; schedule(); }, () => {}));
}
let adminSubs = [];
function subscribeAdmin() {
  adminSubs.forEach((u) => u()); adminSubs = [];
  adminSubs.push(db.watch('adminRequests', (l) => { S.adminRequests = l; schedule(); }, () => {}));
  adminSubs.push(db.watch('admins', (l) => { S.admins = l; schedule(); }, () => {}));
}
let tSubs = [];
function subscribeTournament() {
  tSubs.forEach((u) => u()); tSubs = [];
  S.players = []; S.matches = []; S.picks = []; S.draftPicks = []; S.anim = {};
  if (!S.t) return;
  const base = 'tournaments/' + S.t.id + '/';
  tSubs.push(db.watch(base + 'players', (l) => { S.players = l.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); schedule(); automation(); }));
  tSubs.push(db.watch(base + 'matches', (l) => { S.matches = l.sort((a, b) => a.order - b.order); schedule(); automation(); }));
  tSubs.push(db.watch(base + 'picks', (l) => { S.picks = l; schedule(); }));
  tSubs.push(db.watch(base + 'draftPicks', (l) => { S.draftPicks = l; schedule(); automation(); }));
}

function showErr(e) { toast(errText(e), 'err'); }
function errText(e) {
  const c = (e && e.code) || '';
  if (c.includes('permission-denied')) return 'Keine Berechtigung (oder Anmeldung bereits geschlossen).';
  if (c.includes('popup-closed')) return 'Anmeldung abgebrochen.';
  if (c.includes('wrong-password') || c.includes('invalid-credential')) return 'E-Mail oder Passwort falsch.';
  if (c.includes('email-already-in-use')) return 'Für diese E-Mail gibt es schon ein Konto – bitte „Anmelden“.';
  if (c.includes('weak-password')) return 'Passwort zu kurz (mind. 6 Zeichen).';
  if (c.includes('operation-not-allowed')) return 'Diese Anmeldemethode ist in Firebase noch nicht aktiviert.';
  return (e && e.message) || String(e);
}

// ---------------- Router / Render ----------------
function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  S.route = ['/', '/live', '/admin', '/hall', '/regeln'].includes(h) ? h : '/';
  document.body.dataset.route = S.route;
  render(true);
}

let raf = 0, pendingRender = false;
function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => render()); }

function render(force = false) {
  const ae = document.activeElement;
  if (!force && ae && app.contains(ae) && ae.matches('input:not([type=checkbox]):not([type=radio]), textarea, select')) {
    pendingRender = true; return;
  }
  pendingRender = false;
  const scroll = window.scrollY;
  let html;
  switch (S.route) {
    case '/live': html = liveView(); break;
    case '/admin': html = adminView(); break;
    case '/hall': html = hallView(L.eternalTable(S.tournaments.filter((t) => t.status === 'finished'))); break;
    case '/regeln': html = rulesView(); break;
    default: html = homeView();
  }
  app.innerHTML = html;
  if (!force) window.scrollTo(0, scroll);
  afterRender();
}
app.addEventListener('focusout', () => setTimeout(() => { if (pendingRender) render(); }, 0));

function afterRender() {
  hydrateCrests(app);
  requestAnimationFrame(() => drawBracketLines(app));
  const t = S.t;
  if (S.route === '/live' && t && t.status === 'draw' && t.draw) S.anim.reveal = t.draw.shown || 0;
  if (S.route === '/live' && t && t.status === 'finished' && S.anim.confettiFor !== t.id) { S.anim.confettiFor = t.id; confetti(9000); }
}

// ---------------- Aktionen ----------------
const actions = {
  // Spieler
  async vote(el) { await db.update(tPath('players/' + uid()), { vote: el.dataset.v }); },
  async unregister() { if (confirm('Wirklich abmelden?')) await db.del(tPath('players/' + uid())); },
  async pickTeam(el) {
    const team = el.dataset.team;
    const mine = S.picks.filter((p) => p.pid === uid());
    for (const p of mine) await db.del(tPath('picks/' + p.id));
    try { await db.create(tPath('picks/' + team), { pid: uid(), at: now() }); toast('Team gesichert!'); }
    catch (e) { toast('Zu spät – das Team ist schon weg.', 'err'); }
  },
  async draftPick(el) {
    const d = S.t.draft;
    await db.create(tPath('draftPicks/' + d.turn), { pid: uid(), teamId: el.dataset.team, turn: d.turn, at: now() });
    toast('Gewählt!');
  },
  async confirm(el) { await db.update(tPath('matches/' + el.dataset.mid), { status: 'confirmed', confirmedAt: now() }); toast('Bestätigt'); },
  async dispute(el) { await db.update(tPath('matches/' + el.dataset.mid), { status: 'disputed' }); toast('Als strittig markiert – bitte neu eintragen oder Admin holen.'); },
  fullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); },
  confetti() { confetti(7000); },

  // Admin: Login & Rechte
  async loginGoogle() { await db.loginGoogle(); toast('Angemeldet'); },
  async logout() { await db.logout(); toast('Abgemeldet'); },
  async requestAdmin() { await db.set('adminRequests/' + uid(), { email: S.user.email || '', name: S.user.name || S.user.email || '', at: now() }); toast('Anfrage gesendet'); },
  async approveAdmin(el) {
    const r = S.adminRequests.find((x) => x.id === el.dataset.id);
    await db.set('admins/' + el.dataset.id, { email: r.email || '', name: r.name || '', at: now() });
    await db.del('adminRequests/' + el.dataset.id);
    toast('Freigeschaltet');
  },
  async rejectAdmin(el) { await db.del('adminRequests/' + el.dataset.id); },
  async removeAdmin(el) { if (confirm('Admin-Rechte entziehen?')) await db.del('admins/' + el.dataset.id); },
  adminTab(el) { S.adminTab = el.dataset.tab; render(true); },
  resetDemo() { if (confirm('Alle Demo-Daten löschen?')) resetDemo(); },

  // Admin: Turnier
  async removePlayer(el) { if (confirm('Spieler entfernen?')) await db.del(tPath('players/' + el.dataset.id)); },
  async closeReg() { await closeRegistration(); },
  async togglePresent(el) { const p = playerById(el.dataset.id); await db.update(tPath('players/' + p.id), { present: !p.present }); },
  async startDraw() { await startDraw(); },
  async revealNext() { const d = S.t.draw; await db.update(tPath(), { draw: { ...d, shown: Math.min(d.reveal.length, (d.shown || 0) + 1) } }); },
  async revealAll() { const d = S.t.draw; await db.update(tPath(), { draw: { ...d, shown: d.reveal.length } }); },
  async spinRoulette() {
    const rule = L.ROULETTE[Math.floor(Math.random() * L.ROULETTE.length)];
    await db.update(tPath(), { rouletteRule: rule });
    toast('Sonderregel: ' + rule);
  },
  async joker(el) { await useJoker(el.dataset.id); },
  async draftToGroups() { await draftToGroups(); },
  async startTournament() { await startTournament(); },
  async resetMatch(el) {
    const m = S.matches.find((x) => x.id === el.dataset.mid);
    if (!confirm('Ergebnis zurücksetzen?')) return;
    await db.update(tPath('matches/' + m.id), { hg: null, ag: null, ph: null, pa: null, reportedBy: null, status: m.console ? 'live' : 'scheduled', held: false });
  },
  async stepBack() {
    const t = S.t;
    if (!confirm('Wirklich einen Schritt zurück? Dabei gehen Daten des aktuellen Schritts verloren.')) return;
    if (t.status === 'checkin') await db.update(tPath(), { status: 'open', regDeadline: Math.max(t.regDeadline, now() + 3600e3) });
    else if (t.status === 'draw') await db.update(tPath(), { status: 'checkin', draw: null, draft: null, groups: null, rouletteRule: null, jokers: null });
    else if (t.status === 'running') {
      const ops = S.matches.map((m) => ({ op: 'delete', path: tPath('matches/' + m.id) }));
      S.players.forEach((p) => { if (p.team) ops.push({ op: 'update', path: tPath('players/' + p.id), data: { team: null } }); });
      await db.batch(ops);
      await db.update(tPath(), { status: 'draw' });
    }
  },
  async deleteTournament() {
    if (!confirm('Turnier endgültig löschen? Das kann nicht rückgängig gemacht werden.')) return;
    const ops = [];
    for (const sub of ['players', 'matches', 'picks', 'draftPicks']) {
      const list = await db.get(tPath(sub));
      list.forEach((d) => ops.push({ op: 'delete', path: tPath(sub + '/' + d.id) }));
    }
    ops.push({ op: 'delete', path: tPath() });
    await db.batch(ops);
    toast('Turnier gelöscht');
  }
};

const changeActions = {
  async setGroups(el) { await db.update(tPath(), { groupsPlanned: Number(el.value) }); },
  async setDouble(el) { await db.update(tPath(), { double: el.checked }); },
  toggleAuto(el) { S.auto = el.checked; automation(); },
  async assignStation(el) {
    const m = S.matches.find((x) => x.id === el.dataset.mid);
    const v = el.value;
    if (v === '') { await db.update(tPath('matches/' + m.id), { status: 'scheduled', console: null, held: true }); toast('Spiel angehalten – wartet auf manuelle Zuordnung'); return; }
    const c = Number(v);
    const other = S.matches.find((x) => x.id !== m.id && x.console === c && ['live', 'reported', 'disputed'].includes(x.status));
    if (other) { toast('Station ist belegt.', 'err'); render(true); return; }
    const clash = S.matches.find((x) => x.id !== m.id && ['live', 'reported', 'disputed'].includes(x.status) && [x.home, x.away].some((pid) => pid === m.home || pid === m.away));
    if (clash) {
      const pid = [clash.home, clash.away].find((x) => x === m.home || x === m.away);
      toast(pname(pid) + ' spielt gerade an ' + stationName(clash.console) + ' – erst das Spiel beenden.', 'err'); render(true); return;
    }
    await db.update(tPath('matches/' + m.id), { status: 'live', console: c, held: false });
    toast(pname(m.home) + ' vs ' + pname(m.away) + ' → ' + stationName(c));
  }
};

const forms = {
  async register(f) {
    const name = f.get('name').trim().slice(0, 24);
    if (!name) return;
    if (S.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) { toast('Den Namen gibt es schon – bitte etwas eindeutiger.', 'err'); return; }
    await db.set(tPath('players/' + uid()), { name, vote: f.get('vote') || null, createdAt: now(), present: false });
    toast('Du bist dabei!');
  },
  async report(f, form) {
    const m = S.matches.find((x) => x.id === form.dataset.mid);
    const mine = Number(f.get('mine')), theirs = Number(f.get('theirs'));
    const isHome = m.home === uid();
    const hg = isHome ? mine : theirs, ag = isHome ? theirs : mine;
    let ph = null, pa = null;
    if (m.stage !== 'group' && hg === ag) {
      const pm = f.get('pmine'), pt = f.get('ptheirs');
      if (pm === '' || pt === '' || pm == null || Number(pm) === Number(pt)) { toast('K.o.-Spiel unentschieden: bitte Elfmeterschießen eintragen.', 'err'); form.querySelector('details') && (form.querySelector('details').open = true); return; }
      ph = isHome ? Number(pm) : Number(pt); pa = isHome ? Number(pt) : Number(pm);
    }
    await db.update(tPath('matches/' + m.id), { hg, ag, ph, pa, status: 'reported', reportedBy: uid(), reportedAt: now() });
    toast('Gemeldet – jetzt muss dein Gegner bestätigen.');
  },
  async loginEmail(f, form, submitter) {
    const reg = submitter && submitter.value === 'register';
    await db.loginEmail(f.get('email').trim(), f.get('pw'), reg);
    toast(reg ? 'Konto erstellt' : 'Angemeldet');
  },
  async settings(f) {
    const s = {};
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      if (typeof DEFAULT_SETTINGS[k] === 'boolean') s[k] = f.get(k) === 'on';
      else if (typeof DEFAULT_SETTINGS[k] === 'number') s[k] = Number(f.get(k)) || DEFAULT_SETTINGS[k];
      else s[k] = String(f.get(k) || '').trim();
    }
    await db.set('config/settings', s);
    toast('Gespeichert');
  },
  async newTournament(f) {
    const options = f.getAll('options');
    if (!options.length) { toast('Bitte mindestens einen Modus wählen.', 'err'); return; }
    const deadline = new Date(f.get('deadline')).getTime();
    const id = 't' + now().toString(36);
    await db.set('tournaments/' + id, {
      name: f.get('name').trim(), date: f.get('date'), time: f.get('time'), room: f.get('room').trim(),
      regDeadline: deadline, options, distribution: f.get('distribution'), tiebreak: f.get('tiebreak'), koTie: f.get('koTie'),
      thirdPlace: f.get('thirdPlace') === 'on', joker: f.get('joker') === 'on', roulette: f.get('roulette') === 'on',
      status: 'open', createdAt: now(), pool: null
    });
    toast('Turnier angelegt – Anmeldung ist offen!');
  },
  async addPlayer(f) {
    const name = f.get('name').trim().slice(0, 24);
    if (!name) return;
    const id = 'x-' + now().toString(36) + Math.random().toString(36).slice(2, 5);
    await db.set(tPath('players/' + id), { name, vote: null, createdAt: now(), present: S.t.status === 'checkin' });
    toast(name + ' hinzugefügt');
  },
  async adminDraftPick(f) {
    const d = S.t.draft;
    const pid = d.order[d.turn];
    await db.update(tPath(), { draft: { ...d, picks: { ...(d.picks || {}), [pid]: f.get('team') }, turn: d.turn + 1 } });
  },
  async adminResult(f, form) {
    const m = S.matches.find((x) => x.id === form.dataset.mid);
    const num = (k) => (f.get(k) === '' || f.get(k) == null ? null : Number(f.get(k)));
    const hg = num('hg'), ag = num('ag');
    if (hg == null || ag == null) { toast('Bitte beide Tore eintragen.', 'err'); return; }
    let ph = num('ph'), pa = num('pa');
    if (m.stage !== 'group' && hg === ag && (ph == null || pa == null || ph === pa)) { toast('K.o.-Spiel unentschieden: Elfmeterschießen eintragen.', 'err'); return; }
    if (hg !== ag) { ph = null; pa = null; }
    await db.update(tPath('matches/' + m.id), { hg, ag, ph, pa, status: 'confirmed', confirmedAt: now(), reportedBy: uid() });
    toast('Gespeichert');
  }
};

// Event-Delegation
app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  el.disabled = true;
  try { await fn(el); } catch (err) { console.error(err); showErr(err); } finally { el.disabled = false; }
});
app.addEventListener('change', async (e) => {
  const el = e.target.closest('[data-act-change]');
  if (!el) return;
  try { await changeActions[el.dataset.actChange](el); } catch (err) { showErr(err); }
});
app.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const fn = forms[form.dataset.form];
  const btns = form.querySelectorAll('button');
  btns.forEach((b) => (b.disabled = true));
  try { await fn(new FormData(form), form, e.submitter); form.reset && form.dataset.form !== 'settings' && form.reset(); }
  catch (err) { console.error(err); showErr(err); }
  finally { btns.forEach((b) => (b.disabled = false)); document.activeElement && document.activeElement.blur(); render(true); }
});
document.addEventListener('keydown', (e) => {
  if (S.route !== '/live' || !S.isAdmin || !S.t || S.t.status !== 'draw' || !S.t.draw) return;
  if (e.target.matches('input,textarea,select')) return;
  if (e.code === 'Space' || e.code === 'ArrowRight') { e.preventDefault(); actions.revealNext().catch(showErr); }
});

// ---------------- Turnier-Abläufe ----------------
async function closeRegistration() {
  const t = S.t;
  if (!t || t.status !== 'open') return;
  const { winner, count } = L.voteWinner(S.players, t.options, Math.random);
  await db.update(tPath(), { status: 'checkin', pool: winner, voteCount: count, regDeadline: Math.min(t.regDeadline, now()) });
  toast('Anmeldung geschlossen – Modus: ' + POOLS[winner].name);
}
let deadlineBusy = false;
function checkDeadline() {
  const t = S.t;
  if (deadlineBusy || !t || t.status !== 'open' || now() < t.regDeadline) return;
  deadlineBusy = true;
  closeRegistration().catch(showErr).finally(() => { deadlineBusy = false; });
}

function plannedGroups(n) { return S.t.groupsPlanned || L.suggestGroups(n); }

async function startDraw() {
  const t = S.t;
  const pl = present();
  const n = pl.length;
  const G = plannedGroups(n);
  const st = settings();
  const f = L.formatInfo(n, { groups: G, double: t.double, thirdPlace: t.thirdPlace, consoles: st.consoles, matchMinutes: st.matchMinutes });
  if (!f.ok) { toast(f.text, 'err'); return; }
  const p = pool(t);
  const rnd = L.rng(now());
  const ids = pl.map((x) => x.id);
  const base = { status: 'draw', format: { text: f.text, games: f.games, duration: f.duration, groups: G }, rouletteRule: null, jokers: {} };
  if (t.distribution === 'draft') {
    await db.update(tPath(), { ...base, draft: { order: L.shuffle(ids, rnd), turn: 0, picks: {} }, draw: null, groups: null });
    return;
  }
  let res, mode;
  if (t.distribution === 'pots') { res = L.drawPots(ids, p.teams, G, rnd); mode = 'pots'; }
  else if (t.distribution === 'random') { res = L.drawRandom(ids, p.teams, G, rnd); mode = 'random'; }
  else {
    const taken = new Set();
    const assign = [];
    ids.forEach((pid) => { const pk = S.picks.find((x) => x.pid === pid); if (pk && !taken.has(pk.id)) { taken.add(pk.id); assign.push({ pid, teamId: pk.id }); } });
    const free = L.shuffle(p.teams.filter((x) => !taken.has(x.id)).sort((a, b) => b.r - a.r).slice(0, Math.max(20, n * 2)), rnd);
    ids.forEach((pid) => { if (!assign.find((a) => a.pid === pid)) assign.push({ pid, teamId: free.pop().id }); });
    res = L.drawGroupsForTeams(assign, (id) => teamById(id).r, G, rnd); mode = 'groups';
  }
  await db.update(tPath(), { ...base, draft: null, draw: { mode, reveal: res.reveal, shown: 0, potTeams: res.potTeams }, groups: L.groupsFromReveal(res.reveal) });
}

async function draftToGroups() {
  const t = S.t;
  const d = t.draft;
  const assign = d.order.map((pid) => ({ pid, teamId: d.picks[pid] }));
  const G = plannedGroups(assign.length);
  const res = L.drawGroupsForTeams(assign, (id) => teamById(id).r, G, L.rng(now()));
  await db.update(tPath(), { draw: { mode: 'groups', reveal: res.reveal, shown: 0, potTeams: [] }, groups: L.groupsFromReveal(res.reveal) });
}

async function useJoker(pid) {
  const t = S.t;
  const d = t.draw;
  const i = d.reveal.findIndex((r) => r.pid === pid);
  const cur = teamById(d.reveal[i].teamId);
  const used = new Set(d.reveal.map((r) => r.teamId));
  const p = pool(t);
  let cand = p.teams.filter((x) => !used.has(x.id) && Math.abs(x.r - cur.r) <= 5);
  if (!cand.length) cand = p.teams.filter((x) => !used.has(x.id));
  if (!cand.length) { toast('Keine freien Teams mehr.', 'err'); return; }
  const nt = cand[Math.floor(Math.random() * cand.length)];
  const reveal = d.reveal.map((r, k) => (k === i ? { ...r, teamId: nt.id } : r));
  await db.update(tPath(), { draw: { ...d, reveal }, jokers: { ...(t.jokers || {}), [pid]: true } });
  toast('Joker! ' + playerById(pid).name + ' spielt jetzt mit ' + nt.name);
}

async function startTournament() {
  const t = S.t;
  const groups = groupsOf(t);
  const matches = L.buildMatches(groups, { double: t.double, thirdPlace: t.thirdPlace });
  const fill = L.fillConsoles(matches, settings().consoles);
  const ops = [];
  matches.forEach((m) => {
    const u = fill.find((x) => x.id === m.id);
    ops.push({ op: 'set', path: tPath('matches/' + m.id), data: { ...m, ...(u || {}), hg: null, ag: null, ph: null, pa: null } });
  });
  (t.draw.reveal || []).forEach((r) => ops.push({ op: 'update', path: tPath('players/' + r.pid), data: { team: r.teamId } }));
  await db.batch(ops);
  await db.update(tPath(), { status: 'running', startedAt: now() });
  toast('Anpfiff!');
}

// ---------------- Admin-Automatik ----------------
let autoBusy = false, autoAgain = false;
async function automation() {
  if (!S.isAdmin || !S.t) return;
  if (autoBusy) { autoAgain = true; return; }
  autoBusy = true;
  try {
    const t = S.t;
    if (t.status === 'draw' && t.draft && !t.draw) {
      const d = t.draft;
      const pk = S.draftPicks.find((x) => Number(x.id) === d.turn);
      const taken = new Set(Object.values(d.picks || {}));
      if (pk && pk.pid === d.order[d.turn] && !taken.has(pk.teamId) && teamById(pk.teamId)) {
        await db.update(tPath(), { draft: { ...d, picks: { ...(d.picks || {}), [pk.pid]: pk.teamId }, turn: d.turn + 1 } });
      } else if (pk && (pk.pid !== d.order[d.turn] || taken.has(pk.teamId))) {
        await db.del(tPath('draftPicks/' + pk.id));
      }
    }
    if (t.status === 'running' && S.auto !== false && S.matches.length) {
      let ms = S.matches.map((m) => ({ ...m }));
      const ko = L.resolveKO(ms, groupsOf(t), tiebreak(t), t.id);
      ms = ms.map((m) => { const u = ko.find((x) => x.id === m.id); return u ? { ...m, ...u } : m; });
      const fill = L.fillConsoles(ms, settings().consoles);
      const ups = new Map();
      ko.forEach((u) => ups.set(u.id, { home: u.home, away: u.away, status: u.status }));
      fill.forEach((u) => ups.set(u.id, { ...(ups.get(u.id) || {}), status: u.status, console: u.console }));
      if (ups.size) await db.batch([...ups].map(([id, data]) => ({ op: 'update', path: tPath('matches/' + id), data })));
      const fin = S.matches.find((m) => m.stage === 'final');
      const third = S.matches.find((m) => m.stage === 'third');
      if (fin && L.isDone(fin) && (!third || L.isDone(third))) {
        const players = S.players.map((p) => ({ ...p }));
        await db.update(tPath(), { status: 'finished', finishedAt: now(), summary: L.tournamentSummary(players, S.matches) });
      }
    }
  } catch (e) { console.error('automation', e); }
  finally {
    autoBusy = false;
    if (autoAgain) { autoAgain = false; setTimeout(automation, 50); }
  }
}

start();
