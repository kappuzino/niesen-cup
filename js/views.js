// Niesen Cup – Ansichten (geben HTML-Strings zurück)
import { POOLS, teamById, starText } from './teams.js';
import {
  S, STREAM, stationName, stationShort, stationList, STATUS_LABEL, DIST_LABEL, KO_TIE_LABEL, TIEBREAK_LABEL, settings, uid, me, pname, playerById, present, pool,
  tiebreak, groupNames, teamOfPlayer, tables, regOpen
} from './state.js';
import { esc, brand, flag, badge, teamLine, fmtDate, fmtDateTime, countdownHTML, qrSVG } from './ui.js';
import { formatInfo, fmtDuration, STAGE_NAMES, suggestGroups, winnerOf, isDone } from './logic.js';
import { DEMO } from './db.js';

const I = {
  trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6"/></svg>',
  ball: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 4.5h-5L8 10Z"/><path d="M12 3v4M16 10l4.5-1.5M14.5 14.5l2.5 4M9.5 14.5 7 18.5M8 10 3.5 8.5"/></svg>',
  live: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  rules: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6Z"/><path d="M9 10h6M9 14h6M9 18h4"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17l9-10"/></svg>',
  expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
};
export const icon = (n) => `<span class="ic">${I[n] || ''}</span>`;

// ---------- Layout ----------
export function shell(content) {
  const r = S.route;
  const tab = (href, ic, label) => `<a href="#${href}" class="${r === href ? 'on' : ''}">${icon(ic)}<span>${label}</span></a>`;
  return `<div class="shell">
    <header class="top">
      <a href="#/" class="top-brand" aria-label="Startseite">${brand('m')}</a>
      ${S.t ? `<span class="pill">${esc(S.t.name || '')}</span>` : ''}
      <a href="#/admin" class="top-admin ${r === '/admin' ? 'on' : ''}" aria-label="Admin">${icon('gear')}</a>
    </header>
    ${DEMO ? '<div class="demo-bar">Demo-Modus: Daten liegen nur in diesem Browser</div>' : ''}
    <main class="page">${content}</main>
    <nav class="tabs" aria-label="Navigation">
      ${tab('/', 'ball', 'Turnier')}${tab('/live', 'live', 'Live')}${tab('/regeln', 'rules', 'Regeln')}${tab('/hall', 'trophy', 'Hall of Fame')}
    </nav>
  </div>`;
}

const section = (title, body, extra = '') => `<section class="card ${extra}"><h2>${title}</h2>${body}</section>`;

function poolBadge(pid) {
  const p = POOLS[pid];
  if (!p) return '';
  if (pid === 'nations') return `<span class="poolflags">${flag('de')}${flag('it')}${flag('fr')}</span>`;
  if (pid === 'europa') return `<span class="poolflags poolstar">★</span>`;
  return `<span class="poolflags">${flag(p.flag)}</span>`;
}

function infoCard(t) {
  return `<section class="hero">
    <span class="eyebrow">${t.status === 'finished' ? 'TURNIER BEENDET' : 'NÄCHSTES TURNIER'}</span>
    <h1>${esc(fmtDate(t.date))}</h1>
    <p class="sub">${t.time ? 'ab ' + esc(t.time) + ' Uhr' : ''}${t.room ? ' · ' + esc(t.room) : ''} · ${settings().consoles} Stationen${settings().streamStation ? ' + ' + esc(settings().streamName) : ''}</p>
  </section>`;
}

// ---------- Startseite / Spieler ----------
export function homeView() {
  const t = S.t;
  if (!S.ready) return shell('<div class="empty">Lade …</div>');
  if (!t) return shell(`<section class="hero"><span class="eyebrow">NIESEN CUP</span><h1>Gerade kein Turnier geplant</h1><p class="sub">Sobald das nächste Turnier angelegt ist, kannst du dich hier anmelden.</p></section>
    <a class="btn ghost wide" href="#/hall">${icon('trophy')} Hall of Fame ansehen</a>`);
  let body = infoCard(t);
  if (t.status === 'open') body += openPlayerView(t);
  else if (t.status === 'checkin') body += checkinPlayerView(t);
  else if (t.status === 'draw') body += drawPlayerView(t);
  else if (t.status === 'running') body += runningPlayerView(t);
  else body += finishedPlayerView(t);
  return shell(body);
}

function voteCounts(t) {
  const c = Object.fromEntries((t.options || []).map((o) => [o, 0]));
  S.players.forEach((p) => { if (p.vote in c) c[p.vote]++; });
  return c;
}

function voteBars(t, interactive) {
  const c = voteCounts(t);
  const total = Object.values(c).reduce((a, b) => a + b, 0) || 1;
  const m = me();
  return `<div class="votes">${(t.options || []).map((o) => {
    const sel = m && m.vote === o;
    const pct = Math.round((c[o] / total) * 100);
    const tag = interactive && m ? 'button' : 'div';
    return `<${tag} class="vote ${sel ? 'sel' : ''}" ${tag === 'button' ? `type="button" data-act="vote" data-v="${o}"` : ''}>
      <span class="vote-top">${poolBadge(o)}<span class="vote-name">${esc(POOLS[o].name)}</span><span class="vote-n">${c[o]} ${c[o] === 1 ? 'Stimme' : 'Stimmen'}</span></span>
      <span class="bar"><span style="width:${pct}%"></span></span>
    </${tag}>`;
  }).join('')}</div>`;
}

function playerChips(list, opts = {}) {
  if (!list.length) return '<p class="muted">Noch niemand angemeldet.</p>';
  return `<div class="chips">${list.map((p) => `<span class="chip ${p.id === uid() ? 'me' : ''} ${opts.showPresent ? (p.present ? 'in' : 'out') : ''}"><span class="av">${esc(p.name.slice(0, 1).toUpperCase())}</span>${esc(p.name)}</span>`).join('')}</div>`;
}

function openPlayerView(t) {
  const m = me();
  const open = regOpen(t);
  let html = `<section class="card">
    <span class="label">${open ? 'Anmeldeschluss in' : 'Anmeldung'}</span>
    ${open ? countdownHTML(t.regDeadline) : '<p class="big-note">Anmeldung geschlossen</p>'}
    <p class="note">Die Auslosung läuft <b>live vor Ort</b>, sobald alle da sind.</p>
  </section>`;
  html += section('Was spielen wir?', `<p class="muted small">Abstimmung endet mit dem Anmeldeschluss · ${esc(fmtDateTime(t.regDeadline))}</p>${voteBars(t, open)}`);
  if (m) {
    html += `<section class="card ok">
      <h2>Du bist dabei, ${esc(m.name)}!</h2>
      <p class="muted">Deine Stimme: <b>${m.vote ? esc(POOLS[m.vote].name) : '–'}</b>${open ? ' · oben antippen zum Ändern' : ''}</p>
      ${open ? '<button class="btn ghost" data-act="unregister" type="button">Abmelden</button>' : ''}
    </section>`;
  } else if (open) {
    html += `<form class="card" data-form="register">
      <h2>Anmelden</h2>
      <label class="field">Dein Name<input name="name" maxlength="24" required placeholder="z. B. Luigi" autocomplete="nickname"></label>
      <fieldset class="field"><legend>Deine Stimme</legend>
        <div class="radios">${(t.options || []).map((o, i) => `<label class="radio">${poolBadge(o)}<input type="radio" name="vote" value="${o}" ${i === 0 ? 'checked' : ''}><span>${esc(POOLS[o].name)}</span></label>`).join('')}</div>
      </fieldset>
      <button class="btn primary wide" type="submit">Ich bin dabei</button>
    </form>`;
  }
  html += section(`Angemeldet <span class="count">${S.players.length}</span>`, playerChips(S.players));
  return html;
}

function modeLine(t) {
  const p = pool(t);
  return p ? `<div class="mode-line">${poolBadge(t.pool)}<span>Modus: <b>${esc(p.name)}</b></span><span class="muted">· ${esc(DIST_LABEL[t.distribution] || '')}</span></div>` : '';
}

function teamPicker(t, act, takenIds, myTeam) {
  const p = pool(t);
  const list = p.teams.slice().sort((a, b) => b.r - a.r);
  return `<div class="teamgrid">${list.map((tm) => {
    const taken = takenIds.has(tm.id) && tm.id !== myTeam;
    return `<button type="button" class="teambtn ${tm.id === myTeam ? 'sel' : ''}" data-act="${act}" data-team="${tm.id}" ${taken ? 'disabled' : ''}>
      ${badge(tm.id, 's')}<span class="tn">${esc(tm.name)}</span><span class="stars">${starText(tm.r)}</span>${taken ? '<span class="taken">vergeben</span>' : ''}</button>`;
  }).join('')}</div>`;
}

function checkinPlayerView(t) {
  const m = me();
  let html = `<section class="card">${modeLine(t)}<p class="note">Anmeldung geschlossen. Vor Ort wird eingecheckt, danach startet die Auslosung.</p></section>`;
  if (t.distribution === 'choice' && m) {
    const taken = new Set(S.picks.map((x) => x.id));
    const mine = S.picks.find((x) => x.pid === m.id);
    html += section('Wähle dein Team', `<p class="muted small">Wer zuerst wählt, bekommt das Team. ${mine ? 'Deine Wahl: <b>' + esc(teamById(mine.id).name) + '</b>' : ''}</p>${teamPicker(t, 'pickTeam', taken, mine ? mine.id : null)}`);
  }
  html += section('Teilnehmer', playerChips(S.players, { showPresent: true }) + '<p class="muted small">Grün = eingecheckt</p>');
  return html;
}

function drawPlayerView(t) {
  const m = me();
  let html = `<section class="card glow">${modeLine(t)}<h2>Die Auslosung läuft!</h2><p class="note">Schau auf den Beamer.</p></section>`;
  if (t.draft && !t.draw) {
    const d = t.draft;
    const cur = d.order[d.turn];
    if (m && cur === m.id) {
      const taken = new Set(Object.values(d.picks || {}));
      html += section('Du bist am Zug!', teamPicker(t, 'draftPick', taken, null), 'glow');
    } else if (cur) {
      html += section('Draft', `<p>Am Zug: <b>${esc(pname(cur))}</b></p>`);
    }
  }
  if (m) {
    const tm = teamOfPlayer(m.id, t);
    if (tm) html += section('Dein Team', `<div class="myteam">${badge(tm, 'xl')}<div><b>${esc(teamById(tm).name)}</b><span class="stars">${starText(teamById(tm).r)}</span></div></div>`);
  }
  return html;
}

function matchSide(m, pid) { return m.home === pid ? 'home' : 'away'; }

function myMatches(t) {
  const id = uid();
  return S.matches.filter((m) => m.home === id || m.away === id).sort((a, b) => a.order - b.order);
}

function reportForm(m) {
  const id = uid();
  const isHome = m.home === id;
  const opp = isHome ? m.away : m.home;
  const ko = m.stage !== 'group';
  return `<form class="report" data-form="report" data-mid="${m.id}">
    <div class="score-inputs">
      <label><span>${esc(pname(id))}</span><input name="mine" type="number" min="0" max="30" inputmode="numeric" required></label>
      <span class="colon">:</span>
      <label><span>${esc(pname(opp))}</span><input name="theirs" type="number" min="0" max="30" inputmode="numeric" required></label>
    </div>
    ${ko ? `<details class="pens"><summary>Unentschieden? Elfmeterschießen eintragen</summary>
      <div class="score-inputs small"><label><span>Elfer ${esc(pname(id))}</span><input name="pmine" type="number" min="0" max="30" inputmode="numeric"></label><span class="colon">:</span><label><span>Elfer ${esc(pname(opp))}</span><input name="ptheirs" type="number" min="0" max="30" inputmode="numeric"></label></div></details>` : ''}
    <button class="btn primary wide" type="submit">Ergebnis melden</button>
  </form>`;
}

export function scoreText(m) {
  if (m.hg == null) return '– : –';
  return `${m.hg} : ${m.ag}${m.ph != null ? ` <small>(${m.ph}:${m.pa} i.E.)</small>` : ''}`;
}

function matchHead(m) {
  const where = m.stage === 'group' ? 'Gruppe ' + m.group : STAGE_NAMES[m.stage];
  return `<div class="mhead"><span>${esc(where)}</span>${m.console === STREAM ? `<span class="onstream">● ON STREAM</span>` : m.console ? `<span class="console">${esc(stationName(m.console))}</span>` : ''}</div>`;
}
function vsLine(m) {
  return `<div class="vs">
    <span class="side">${badge(teamOfPlayer(m.home), 'm')}<b>${esc(pname(m.home))}</b></span>
    <span class="sc">${scoreText(m)}</span>
    <span class="side r"><b>${esc(pname(m.away))}</b>${badge(teamOfPlayer(m.away), 'm')}</span>
  </div>`;
}

function runningPlayerView(t) {
  const m = me();
  let html = `<section class="card">${modeLine(t)}<a class="btn ghost wide" href="#/live">${icon('live')} Live-Tabellen & Turnierbaum</a></section>`;
  if (!m) return html + section('Zuschauer', '<p class="muted">Du bist bei diesem Turnier nicht angemeldet. Verfolge alles live.</p>');
  const mine = myMatches(t);
  const tm = teamOfPlayer(m.id, t);
  if (tm) html += `<section class="card"><div class="myteam">${badge(tm, 'l')}<div><span class="label">Du spielst mit</span><b>${esc(teamById(tm).name)}</b></div></div></section>`;
  const toConfirm = mine.filter((x) => x.status === 'reported' && x.reportedBy !== m.id);
  toConfirm.forEach((x) => {
    html += `<section class="card glow">${matchHead(x)}<h2>Stimmt das Ergebnis?</h2>${vsLine(x)}
      <p class="muted small">${esc(pname(x.reportedBy))} hat das Ergebnis eingetragen.</p>
      <div class="row2"><button class="btn primary" data-act="confirm" data-mid="${x.id}" type="button">${icon('check')} Bestätigen</button>
      <button class="btn ghost" data-act="dispute" data-mid="${x.id}" type="button">Stimmt nicht</button></div></section>`;
  });
  const waiting = mine.filter((x) => x.status === 'reported' && x.reportedBy === m.id);
  waiting.forEach((x) => { html += `<section class="card">${matchHead(x)}${vsLine(x)}<p class="muted small">Warte auf Bestätigung von ${esc(pname(x.reportedBy === x.home ? x.away : x.home))} …</p></section>`; });
  const active = mine.filter((x) => x.status === 'live' || x.status === 'disputed');
  active.forEach((x) => {
    const onStream = x.console === STREAM;
    const where = x.console ? `<p class="go-station ${onStream ? 'stream' : ''}">${onStream ? 'Du spielst auf der <b>' + esc(stationName(STREAM)) + '</b> – du bist <b>live on Stream!</b>' : 'Ab an <b>' + esc(stationName(x.console)) + '</b>'}</p>` : '';
    html += `<section class="card live ${onStream ? 'stream' : ''}">${matchHead(x)}<h2>${x.status === 'disputed' ? 'Ergebnis strittig – bitte neu eintragen' : 'Jetzt spielen!'}</h2>${where}${vsLine(x)}${reportForm(x)}</section>`;
  });
  const next = mine.find((x) => x.status === 'scheduled');
  if (next && !active.length) html += `<section class="card">${matchHead(next)}<h2>Dein nächstes Spiel</h2>${vsLine(next)}<p class="muted small">Du wirst aufgerufen, sobald eine Station frei ist.</p></section>`;
  const done = mine.filter(isDone);
  if (done.length) html += section('Deine Ergebnisse', done.map((x) => `<div class="mini">${matchHead(x)}${vsLine(x)}</div>`).join(''));
  return html;
}

function finishedPlayerView(t) {
  const s = t.summary || {};
  return `<section class="card champion-card">
    <span class="eyebrow">CHAMPION</span>
    ${s.champion ? `<div class="myteam">${badge(s.champion.team, 'xl')}<div><h1>${esc(s.champion.name)}</h1>${s.champion.team ? `<span class="muted">${esc(teamById(s.champion.team).name)}</span>` : ''}</div></div>` : ''}
  </section><a class="btn ghost wide" href="#/hall">${icon('trophy')} Hall of Fame</a>`;
}

// ---------- Regeln ----------
export function rulesView() {
  const t = S.t;
  const st = settings();
  let html = '<section class="hero"><span class="eyebrow">REGELWERK</span><h1>So wird gespielt</h1></section>';
  if (t) {
    const p = pool(t);
    const n = present().length || S.players.length;
    const f = t.format || formatInfo(n, { groups: suggestGroups(n), thirdPlace: t.thirdPlace, consoles: st.consoles, matchMinutes: st.matchMinutes });
    html += section('Dieses Turnier', `<dl class="dl">
      <dt>Modus</dt><dd>${p ? esc(p.name) : 'Abstimmung läuft (' + (t.options || []).map((o) => esc(POOLS[o].name)).join(', ') + ')'}</dd>
      <dt>Teamverteilung</dt><dd>${esc(DIST_LABEL[t.distribution] || '')}${t.joker ? ' · Joker erlaubt' : ''}</dd>
      <dt>Format</dt><dd>${esc(f.text || '')}${t.thirdPlace ? ' · mit Spiel um Platz 3' : ''}</dd>
      <dt>Gleichstand in der Gruppe</dt><dd>${esc(TIEBREAK_LABEL[tiebreak(t)])}${p && (!t.tiebreak || t.tiebreak === 'auto') ? `<br><span class="muted small">nach Vorbild: ${esc(p.name)}</span>` : ''}</dd>
      <dt>K.o.-Runde</dt><dd>${p ? esc(p.koName) + ' · ' : ''}${esc(KO_TIE_LABEL[t.koTie || 'et_pen'])}</dd>
      <dt>Punkte</dt><dd>Sieg 3 · Unentschieden 1 · Niederlage 0</dd>
      ${t.rouletteRule ? `<dt>Sonderregel</dt><dd class="hl">${esc(t.rouletteRule)}</dd>` : ''}
    </dl>`);
  }
  html += section('Spiel-Einstellungen', `<dl class="dl">
    <dt>Halbzeitlänge</dt><dd>${esc(st.halfLength)}</dd>
    <dt>Schwierigkeit</dt><dd>${esc(st.difficulty)}</dd>
    <dt>Spielgeschwindigkeit</dt><dd>${esc(st.speed)}</dd>
    <dt>Verletzungen</dt><dd>${esc(st.injuries)}</dd>
    <dt>Pausen</dt><dd>${esc(st.pauseRule)}</dd>
  </dl>`);
  html += section('Fair Play', `<ul class="list">${String(st.extraRules || '').split('\n').filter(Boolean).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`);
  return shell(html);
}

// ---------- Hall of Fame ----------
export function hallView(eternal) {
  const fin = S.tournaments.filter((t) => t.status === 'finished' && t.summary).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  let html = '<section class="hero"><span class="eyebrow">HALL OF FAME</span><h1>Die Champions</h1></section>';
  html += fin.length ? `<div class="champs">${fin.map((t) => `<div class="champ">
      <span class="champ-no">${esc(t.name)}</span>
      ${badge(t.summary.champion && t.summary.champion.team, 'l')}
      <div><b>${esc(t.summary.champion ? t.summary.champion.name : '–')}</b><span class="muted small">${esc(fmtDate(t.date))}${t.pool ? ' · ' + esc(POOLS[t.pool].name) : ''}</span>
      ${t.summary.runnerUp ? `<span class="muted small">Finale gegen ${esc(t.summary.runnerUp.name)}</span>` : ''}</div>
      ${I.trophy}</div>`).join('')}</div>` : '<section class="card"><p class="muted">Noch keine Turniere beendet. Der erste Champion wird hier verewigt.</p></section>';
  if (eternal.length) {
    html += section('Ewige Tabelle', `<div class="tablewrap"><table class="tbl">
      <thead><tr><th>#</th><th class="l">Spieler</th><th title="Titel">${I.trophy}</th><th>T</th><th>Sp</th><th>S</th><th>U</th><th>N</th><th>Tore</th><th>Pkt</th></tr></thead>
      <tbody>${eternal.map((e, i) => `<tr><td>${i + 1}</td><td class="l"><b>${esc(e.name)}</b></td><td>${e.titles || ''}</td><td>${e.t}</td><td>${e.p}</td><td>${e.w}</td><td>${e.d}</td><td>${e.l}</td><td>${e.gf}:${e.ga}</td><td><b>${e.pts}</b></td></tr>`).join('')}</tbody></table></div>
      <p class="muted small">T = Turniere · Pkt = 3 pro Sieg, 1 pro Unentschieden (alle Spiele inkl. K.o.)</p>`);
  }
  return shell(html);
}

// ---------- Tabellen & Baum (gemeinsam für Handy und Beamer) ----------
export function groupTable(name, rows, compact = false) {
  const adv = S.t && S.t.groups && Object.keys(S.t.groups).length === 1 ? 2 : 2;
  return `<div class="gtable ${compact ? 'compact' : ''}">
    <div class="gt-head"><span class="gt-name">Gruppe ${name}</span><span>Sp</span><span>Diff</span><span>Pkt</span></div>
    ${rows.map((r) => `<div class="gt-row ${r.pos <= adv ? 'adv' : ''}">
      <span class="pos">${r.pos}</span>${badge(teamOfPlayer(r.pid), 's')}<span class="gt-player"><b>${esc(pname(r.pid))}</b><span class="muted">${teamOfPlayer(r.pid) ? esc(teamById(teamOfPlayer(r.pid)).name) : ''}</span></span>
      <span>${r.p}</span><span>${r.gd > 0 ? '+' : ''}${r.gd}</span><span class="pts">${r.pts}</span></div>`).join('')}
  </div>`;
}

function bracketMatch(m) {
  const lbl = (side) => {
    const pid = m[side];
    if (pid) return `${badge(teamOfPlayer(pid), 's')}<span class="bn">${esc(pname(pid))}</span>`;
    const from = m[side + 'From'] || {};
    const short = (id) => id.replace('sf', 'HF ').replace('qf', 'VF ');
    const txt = from.group ? from.pos + '. Gruppe ' + from.group : from.winner ? 'Sieger ' + short(from.winner) : from.loser ? 'Verlierer ' + short(from.loser) : '?';
    return `${badge(null, 's')}<span class="bn muted">${esc(txt)}</span>`;
  };
  const w = winnerOf(m);
  const sc = (side) => (m.hg == null ? '' : side === 'home' ? m.hg : m.ag);
  const pen = (side) => (m.ph == null ? '' : `<small>${side === 'home' ? m.ph : m.pa}</small>`);
  const from = [m.homeFrom, m.awayFrom].filter((f) => f && (f.winner)).map((f) => f.winner);
  const cls = ['bm', m.status, isDone(m) ? 'done' : '', m.stage === 'final' ? 'final' : ''].join(' ');
  return `<div class="${cls}" data-mid="${m.id}" ${from.length ? `data-from="${from.join(',')}"` : ''}>
    <div class="bm-h"><span>${esc(STAGE_NAMES[m.stage])}</span>${m.status === 'live' ? `<span class="livebadge">LIVE · ${esc(stationShort(m.console))}</span>` : m.status === 'reported' ? '<span class="muted">wartet auf Bestätigung</span>' : ''}</div>
    <div class="bm-r ${w && w === m.home ? 'win' : w ? 'lose' : ''}">${lbl('home')}<span class="bs">${sc('home')}${pen('home')}</span></div>
    <div class="bm-r ${w && w === m.away ? 'win' : w ? 'lose' : ''}">${lbl('away')}<span class="bs">${sc('away')}${pen('away')}</span></div>
  </div>`;
}

export function bracket() {
  const ko = S.matches.filter((m) => m.stage !== 'group');
  if (!ko.length) return '';
  const cols = ['qf', 'sf', 'final'].map((st) => ko.filter((m) => m.stage === st).sort((a, b) => a.id.localeCompare(b.id))).filter((c) => c.length);
  const third = ko.find((m) => m.stage === 'third');
  return `<div class="bracket">
    <svg class="bracket-lines" aria-hidden="true"></svg>
    ${cols.map((c, i) => `<div class="bcol">${c.map(bracketMatch).join('')}${i === cols.length - 1 && third ? `<div class="third-wrap">${bracketMatch(third)}</div>` : ''}</div>`).join('')}
  </div>`;
}

// ---------- Beamer / Live ----------
export function liveView() {
  const t = S.t;
  const top = `<header class="stage-top">${brand('l')}
    ${t ? `<span class="stage-title">${esc(t.name)}${t.pool ? ' · ' + esc(POOLS[t.pool].name) : ''}</span>` : ''}
    <span class="stage-actions"><a href="#/" class="btn ghost sm">Zurück</a><button class="btn ghost sm" data-act="fullscreen" type="button" aria-label="Vollbild">${icon('expand')}</button></span></header>`;
  let body;
  if (!t) body = '<div class="stage-empty"><h1>Kein Turnier geplant</h1></div>';
  else if (t.status === 'open') body = liveOpen(t);
  else if (t.status === 'checkin') body = liveCheckin(t);
  else if (t.status === 'draw') body = liveDraw(t);
  else if (t.status === 'running') body = liveRunning(t);
  else body = liveFinished(t);
  return `<div class="stage">${top}${body}</div>`;
}

function joinUrl() {
  return location.origin + location.pathname + location.search + '#/';
}

function liveOpen(t) {
  return `<div class="stage-grid open-grid">
    <div class="stage-col">
      <span class="eyebrow">NÄCHSTES TURNIER</span>
      <h1 class="mega">${esc(fmtDate(t.date))}</h1>
      <p class="sub">${t.time ? 'ab ' + esc(t.time) + ' Uhr' : ''}${t.room ? ' · ' + esc(t.room) : ''}</p>
      <span class="label">Anmeldeschluss in</span>${countdownHTML(t.regDeadline, true)}
      <div class="votes-live">${voteBars(t, false)}</div>
    </div>
    <div class="stage-col center">
      <div class="qr">${qrSVG(joinUrl())}</div>
      <p class="qr-cap">Scannen & anmelden</p>
    </div>
    <div class="stage-col">
      <h2>Angemeldet <span class="count">${S.players.length}</span></h2>
      ${playerChips(S.players)}
    </div>
  </div>`;
}

function liveCheckin(t) {
  const n = present().length;
  const st = settings();
  const f = formatInfo(n, { groups: t.groupsPlanned || suggestGroups(n), double: t.double, thirdPlace: t.thirdPlace, consoles: st.consoles, matchMinutes: st.matchMinutes });
  return `<div class="stage-grid checkin-grid">
    <div class="stage-col">
      <span class="eyebrow">CHECK-IN</span><h1 class="mega">Wer ist da?</h1>
      ${modeLine(t)}
      <div class="fmt-card"><span class="label">Format</span><b>${esc(f.text)}</b><span class="muted">${f.ok ? f.games + ' Spiele · ca. ' + fmtDuration(f.duration) : ''}</span></div>
    </div>
    <div class="stage-col wide"><h2>${n} von ${S.players.length} eingecheckt</h2>${playerChips(S.players, { showPresent: true })}</div>
  </div>`;
}

function liveDraw(t) {
  if (t.draft && !t.draw) return liveDraft(t);
  const d = t.draw || { reveal: [], shown: 0 };
  const shown = d.shown || 0;
  const cur = shown > 0 ? d.reveal[shown - 1] : null;
  const next = d.reveal[shown];
  const G = groupNames(t).length ? groupNames(t) : [...new Set(d.reveal.map((r) => r.group))].sort();
  const revealed = d.reveal.slice(0, shown);
  const isNewCur = cur && (S.anim.reveal || 0) < shown;
  const pots = {};
  (d.potTeams || []).forEach((p) => { (pots[p.pot] = pots[p.pot] || []).push(p.teamId); });
  const usedTeams = new Set(revealed.map((r) => r.teamId));
  const left = d.mode === 'pots'
    ? Object.keys(pots).map((k) => `<div class="pot"><div class="pot-h">Topf ${k}</div>${pots[k].map((id) => `<div class="pot-t ${usedTeams.has(id) ? 'used' : ''}">${teamLine(id, { stars: true })}</div>`).join('')}</div>`).join('')
    : `<div class="pot"><div class="pot-h">${d.mode === 'groups' ? 'Teams stehen fest' : 'Komplett zufällig'}</div><p class="muted">${d.mode === 'groups' ? 'Jetzt werden die Gruppen gelost.' : 'Jedes Team ist möglich.'}</p></div>`;
  const center = cur ? `<div class="spot ${isNewCur ? 'flip-in' : ''}" data-reveal="${shown}">
      <span class="eyebrow">${d.mode === 'groups' ? 'IN GRUPPE ' + esc(cur.group) : 'ES ZIEHT'}</span>
      <div class="spot-name">${esc(pname(cur.pid))}</div>
      <div class="spot-card">${badge(cur.teamId, 'xxl')}<div class="spot-team">${esc(teamById(cur.teamId).name)}</div><div class="stars big">${starText(teamById(cur.teamId).r)}${cur.pot ? ' · TOPF ' + cur.pot : ''}</div><div class="spot-group">Gruppe ${esc(cur.group)}</div></div>
    </div>` : `<div class="spot idle"><span class="eyebrow">LIVE-AUSLOSUNG</span><div class="spot-name">Gleich geht's los</div><div class="spot-ring"></div></div>`;
  const right = G.map((g) => {
    const members = d.reveal.filter((r) => r.group === g);
    return `<div class="dgroup"><div class="dgroup-h">Gruppe ${g}</div>${members.map((r) => {
      const idx = d.reveal.indexOf(r);
      const vis = idx < shown;
      const isNew = vis && idx === shown - 1 && isNewCur;
      return `<div class="slot ${vis ? 'filled' : ''} ${isNew ? 'pop' : ''}">${vis ? `${badge(r.teamId, 's')}<b>${esc(pname(r.pid))}</b><span class="muted">${esc(teamById(r.teamId).short)}</span>` : '<span class="muted">offen</span>'}</div>`;
    }).join('')}</div>`;
  }).join('');
  const done = shown >= d.reveal.length && d.reveal.length > 0;
  const footer = done
    ? `<div class="stage-foot">${t.rouletteRule ? `<span class="roulette-res">Sonderregel: <b>${esc(t.rouletteRule)}</b></span>` : '<span>Auslosung abgeschlossen – gleich ist Anpfiff!</span>'}</div>`
    : `<div class="stage-foot">${next ? `Als Nächstes: <b>${esc(pname(next.pid))}</b>` : ''} <span class="muted">${shown} / ${d.reveal.length}</span>${S.isAdmin ? '<span class="muted"> · Leertaste = nächstes Los</span>' : ''}</div>`;
  return `<div class="stage-grid draw-grid"><div class="stage-col pots">${left}</div><div class="stage-col center">${center}</div><div class="stage-col groups">${right}</div></div>${footer}`;
}

function liveDraft(t) {
  const d = t.draft;
  const cur = d.order[d.turn];
  const p = pool(t);
  const taken = new Set(Object.values(d.picks || {}));
  const avail = p.teams.filter((x) => !taken.has(x.id)).sort((a, b) => b.r - a.r).slice(0, 24);
  return `<div class="stage-grid draw-grid">
    <div class="stage-col pots"><div class="pot"><div class="pot-h">Verfügbar (Top)</div>${avail.map((x) => `<div class="pot-t">${teamLine(x.id, { stars: true })}</div>`).join('')}</div></div>
    <div class="stage-col center">${cur ? `<div class="spot"><span class="eyebrow">DRAFT · PICK ${d.turn + 1} VON ${d.order.length}</span><div class="spot-name">${esc(pname(cur))}</div><div class="spot-ring pulse"></div><p class="sub">ist am Zug</p></div>` : '<div class="spot"><div class="spot-name">Draft beendet</div><p class="sub">Gleich werden die Gruppen gelost</p></div>'}</div>
    <div class="stage-col groups"><div class="dgroup"><div class="dgroup-h">Reihenfolge</div>${d.order.map((pid, i) => `<div class="slot ${d.picks && d.picks[pid] ? 'filled' : ''} ${i === d.turn ? 'cur' : ''}"><span class="pos">${i + 1}</span><b>${esc(pname(pid))}</b>${d.picks && d.picks[pid] ? badge(d.picks[pid], 's') + `<span class="muted">${esc(teamById(d.picks[pid]).short)}</span>` : ''}</div>`).join('')}</div></div>
  </div>`;
}

function consolesBar() {
  const cells = stationList().map((c) => {
    const m = S.matches.find((x) => x.console === c && ['live', 'reported', 'disputed'].includes(x.status));
    const stream = c === STREAM;
    const badgeTxt = m ? (stream ? '● LIVE' : m.status === 'live' ? 'LIVE' : 'ERGEBNIS') : (stream ? 'BEREIT' : 'FREI');
    return `<div class="cons ${m ? 'busy' : ''} ${stream ? 'stream' : ''}"><div class="cons-h"><span>${esc(stationName(c))}</span><span class="${m ? 'livebadge' : 'muted'}">${badgeTxt}</span></div>
      ${m ? `<div class="cons-m">${badge(teamOfPlayer(m.home), 's')}<b>${esc(pname(m.home))}</b><span class="muted">vs</span><b>${esc(pname(m.away))}</b>${badge(teamOfPlayer(m.away), 's')}</div><div class="muted small">${m.stage === 'group' ? 'Gruppe ' + m.group : STAGE_NAMES[m.stage]}</div>` : `<div class="muted small">${stream ? 'Wartet auf das nächste Stream-Spiel' : 'Freies Spiel'}</div>`}</div>`;
  });
  return `<div class="consoles">${cells.join('')}</div>`;
}

function liveRunning(t) {
  const tb = tables(t);
  const names = Object.keys(tb);
  const groupDone = S.matches.filter((m) => m.stage === 'group').every(isDone);
  const recent = S.matches.filter(isDone).sort((a, b) => (b.confirmedAt || 0) - (a.confirmedAt || 0)).slice(0, 6);
  const next = S.matches.filter((m) => m.status === 'scheduled' && m.home).sort((a, b) => a.order - b.order).slice(0, 4);
  return `<div class="stage-grid run-grid g${names.length}">
    <div class="stage-col tables ${groupDone ? 'dim' : ''}">${names.map((n) => groupTable(n, tb[n], names.length > 2)).join('')}</div>
    <div class="stage-col bracket-col">${bracket()}
      ${next.length ? `<div class="upnext"><span class="label">Als Nächstes</span>${next.map((m) => `<span class="un">${esc(pname(m.home))} <span class="muted">vs</span> ${esc(pname(m.away))}</span>`).join('')}</div>` : ''}
    </div>
  </div>
  ${consolesBar()}
  ${recent.length ? `<div class="ticker"><div class="ticker-in">${recent.concat(recent).map((m) => `<span>${esc(pname(m.home))} <b>${m.hg}:${m.ag}</b>${m.ph != null ? ` (${m.ph}:${m.pa} i.E.)` : ''} ${esc(pname(m.away))}</span>`).join('')}</div></div>` : ''}`;
}

function liveFinished(t) {
  const s = t.summary || {};
  const fin = S.matches.find((m) => m.stage === 'final');
  return `<div class="winner">
    <div class="winner-rays"></div>
    <span class="eyebrow">CHAMPION · ${esc(t.name)}</span>
    <div class="trophy-big">${I.trophy}</div>
    ${s.champion ? `<div class="winner-name">${esc(s.champion.name)}</div><div class="winner-team">${badge(s.champion.team, 'xl')}<span>${s.champion.team ? esc(teamById(s.champion.team).name) : ''}</span></div>` : ''}
    ${fin ? `<div class="winner-final">Finale: ${esc(pname(fin.home))} ${scoreText(fin)} ${esc(pname(fin.away))}</div>` : ''}
    <div class="podium">
      ${s.runnerUp ? `<div class="pod p2"><span>2</span><b>${esc(s.runnerUp.name)}</b></div>` : ''}
      ${s.third ? `<div class="pod p3"><span>3</span><b>${esc(s.third.name)}</b></div>` : ''}
    </div>
    <button class="btn ghost sm" data-act="confetti" type="button">Konfetti!</button>
  </div>`;
}

// ---------- Live auch auf dem Handy: Tabellen ----------
export function liveMobileView() {
  return liveView();
}
