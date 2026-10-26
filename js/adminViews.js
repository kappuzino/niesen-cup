// Niesen Cup – Admin-Ansichten
import { POOLS, teamById } from './teams.js';
import { S, STREAM, stationName, stationList, ACTIVE, STATUS_LABEL, DIST_LABEL, KO_TIE_LABEL, settings, present, pname, pool, teamOfPlayer, groupNames } from './state.js';
import { esc, badge, fmtDate, fmtDateTime } from './ui.js';
import { formatInfo, fmtDuration, suggestGroups, STAGE_NAMES, isDone } from './logic.js';
import { shell, scoreText, icon } from './views.js';
import { db, DEMO } from './db.js';

const card = (title, body, cls = '') => `<section class="card ${cls}">${title ? `<h2>${title}</h2>` : ''}${body}</section>`;

export function adminView() {
  const u = S.user;
  if (!u) return shell('<div class="empty">Lade …</div>');
  if (u.anon) return shell(loginView());
  if (!S.isAdmin) return shell(requestView());
  const tabs = [['turnier', 'Turnier'], ['einstellungen', 'Einstellungen'], ['admins', 'Admins']];
  const head = `<div class="admin-head"><div><span class="eyebrow">ADMIN</span><div class="muted small">${esc(u.email || '')}</div></div><button class="btn ghost sm" data-act="logout" type="button">Abmelden</button></div>
    <div class="seg">${tabs.map(([k, l]) => `<button type="button" class="${S.adminTab === k ? 'on' : ''}" data-act="adminTab" data-tab="${k}">${l}${k === 'admins' && S.adminRequests.length ? ` <span class="dot">${S.adminRequests.length}</span>` : ''}</button>`).join('')}</div>`;
  let body = '';
  if (S.adminTab === 'einstellungen') body = settingsView();
  else if (S.adminTab === 'admins') body = adminsView();
  else body = tournamentAdmin();
  return shell(head + body);
}

function loginView() {
  return `<section class="hero"><span class="eyebrow">ADMIN-BEREICH</span><h1>Anmelden</h1><p class="sub">Nur für die Organisatoren. Spieler brauchen keinen Login.</p></section>
  ${card('', `<button class="btn primary wide" data-act="loginGoogle" type="button">Mit Google anmelden</button>`)}
  <form class="card" data-form="loginEmail">
    <h2>Oder mit E-Mail</h2>
    <label class="field">E-Mail<input name="email" type="email" required autocomplete="email"></label>
    <label class="field">Passwort<input name="pw" type="password" minlength="6" required autocomplete="current-password"></label>
    <div class="row2"><button class="btn primary" type="submit" name="mode" value="login">Anmelden</button><button class="btn ghost" type="submit" name="mode" value="register">Konto erstellen</button></div>
  </form>`;
}

function requestView() {
  const r = S.myRequest;
  return `<section class="hero"><span class="eyebrow">ADMIN-BEREICH</span><h1>Noch kein Admin</h1><p class="sub">Angemeldet als ${esc(S.user.email || '')}</p></section>
  ${card('', r ? '<p>Deine Anfrage ist raus. Sobald sie bestätigt ist, siehst du hier den Admin-Bereich.</p>' : '<p>Frag die Admin-Rechte an. Der Haupt-Admin bestätigt sie mit einem Klick.</p><button class="btn primary wide" data-act="requestAdmin" type="button">Admin-Rechte anfragen</button>')}
  <button class="btn ghost wide" data-act="logout" type="button">Abmelden</button>`;
}

// ---------- Einstellungen ----------
function settingsView() {
  const s = settings();
  const inp = (k, label, type = 'text', extra = '') => `<label class="field">${label}<input name="${k}" type="${type}" value="${esc(s[k])}" ${extra}></label>`;
  return `<form class="card" data-form="settings">
    <h2>Grundeinstellungen</h2>
    <p class="muted small">Gelten für jedes neue Turnier, bis du sie änderst.</p>
    <div class="grid2">${inp('consoles', 'Anzahl Stationen', 'number', 'min="1" max="12"')}${inp('matchMinutes', 'Minuten pro Spiel (inkl. Wechsel)', 'number', 'min="5" max="60"')}</div>
    ${inp('halfLength', 'Halbzeitlänge')}${inp('difficulty', 'Schwierigkeit')}${inp('speed', 'Spielgeschwindigkeit')}${inp('injuries', 'Verletzungen')}${inp('pauseRule', 'Pausen-Regel')}
    <label class="field">Fair-Play-Regeln (eine pro Zeile)<textarea name="extraRules" rows="4">${esc(s.extraRules)}</textarea></label>
    <label class="check"><input type="checkbox" name="streamStation" ${s.streamStation ? 'checked' : ''}> Zusätzliche Streamstation (wird nur von Hand belegt)</label>
    ${inp('streamName', 'Name der Streamstation')}
    <label class="check"><input type="checkbox" name="crests" ${s.crests ? 'checked' : ''}> Vereinswappen anzeigen (werden von Wikipedia geladen)</label>
    <button class="btn primary wide" type="submit">Speichern</button>
  </form>
  ${DEMO ? card('Demo', '<button class="btn ghost wide" data-act="resetDemo" type="button">Demo-Daten löschen</button>') : ''}`;
}

// ---------- Admins ----------
function adminsView() {
  const isOwner = db.isOwner(S.user);
  return card('Offene Anfragen', S.adminRequests.length ? S.adminRequests.map((r) => `<div class="lrow"><div><b>${esc(r.name || r.email || r.id)}</b><div class="muted small">${esc(r.email || '')}</div></div>
      <div class="lrow-a"><button class="btn primary sm" data-act="approveAdmin" data-id="${r.id}" type="button">Freischalten</button><button class="btn ghost sm" data-act="rejectAdmin" data-id="${r.id}" type="button">Ablehnen</button></div></div>`).join('') : '<p class="muted">Keine offenen Anfragen.</p>')
    + card('Admins', `<div class="lrow"><div><b>Haupt-Admin</b><div class="muted small">festgelegt in der Konfiguration</div></div></div>${S.admins.map((a) => `<div class="lrow"><div><b>${esc(a.name || a.email || a.id)}</b><div class="muted small">${esc(a.email || '')}</div></div>${isOwner ? `<button class="btn ghost sm" data-act="removeAdmin" data-id="${a.id}" type="button">Entfernen</button>` : ''}</div>`).join('')}
      <p class="muted small">So kommt jemand dazu: Er öffnet die Admin-Seite, meldet sich an und klickt „Admin-Rechte anfragen“.</p>`);
}

// ---------- Turnier ----------
function pipeline(t) {
  const order = ['open', 'checkin', 'draw', 'running', 'finished'];
  const i = order.indexOf(t.status);
  return `<ol class="pipe">${order.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'on' : ''}">${STATUS_LABEL[s]}</li>`).join('')}</ol>`;
}

function tournamentAdmin() {
  const t = S.t;
  const active = t && t.status !== 'finished';
  let html = '';
  if (!active) html += newTournamentForm();
  if (t) {
    html += `<section class="card"><div class="t-head"><div><span class="eyebrow">${esc(t.name)}</span><h2>${esc(fmtDate(t.date))}${t.time ? ' · ' + esc(t.time) : ''}</h2></div></div>${pipeline(t)}</section>`;
    if (t.status === 'open') html += adminOpen(t);
    else if (t.status === 'checkin') html += adminCheckin(t);
    else if (t.status === 'draw') html += adminDraw(t);
    else if (t.status === 'running') html += adminRunning(t);
    else html += adminFinished(t);
    html += `<details class="card danger"><summary>Gefahrenzone</summary>
      ${t.status !== 'open' && t.status !== 'finished' ? '<button class="btn ghost wide" data-act="stepBack" type="button">Einen Schritt zurück</button>' : ''}
      <button class="btn danger wide" data-act="deleteTournament" type="button">Turnier löschen</button></details>`;
  }
  const others = S.tournaments.filter((x) => !t || x.id !== t.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (others.length) html += card('Frühere Turniere', others.map((x) => `<div class="lrow"><div><b>${esc(x.name)}</b><div class="muted small">${esc(fmtDate(x.date))} · ${esc(STATUS_LABEL[x.status] || '')}${x.summary && x.summary.champion ? ' · Sieger: ' + esc(x.summary.champion.name) : ''}</div></div></div>`).join(''));
  return html;
}

function newTournamentForm() {
  const no = S.tournaments.length + 1;
  const d = new Date(); const add = (5 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + add);
  const iso = d.toISOString().slice(0, 10);
  return `<form class="card" data-form="newTournament">
    <h2>Neues Turnier anlegen</h2>
    <label class="field">Name<input name="name" value="Niesen Cup #${no}" required maxlength="40"></label>
    <div class="grid2"><label class="field">Datum<input name="date" type="date" value="${iso}" required></label><label class="field">Uhrzeit<input name="time" type="time" value="17:30"></label></div>
    <label class="field">Raum<input name="room" placeholder="z. B. Pausenraum" maxlength="40"></label>
    <label class="field">Anmeldeschluss<input name="deadline" type="datetime-local" value="${iso}T12:00" required></label>
    <fieldset class="field"><legend>Modi zur Abstimmung</legend><div class="checks">${Object.values(POOLS).map((p) => `<label class="check"><input type="checkbox" name="options" value="${p.id}" ${['nations', 'europa', 'bundesliga'].includes(p.id) ? 'checked' : ''}> ${esc(p.name)} <span class="muted small">(${p.teams.length} Teams)</span></label>`).join('')}</div></fieldset>
    <label class="field">Teamverteilung<select name="distribution">${Object.entries(DIST_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <label class="field">Gleichstand in der Gruppe<select name="tiebreak"><option value="auto">Automatisch nach Modus-Vorbild</option><option value="gd">Tordifferenz zuerst</option><option value="h2h">Direkter Vergleich zuerst</option></select></label>
    <label class="field">K.o.-Runde bei Unentschieden<select name="koTie">${Object.entries(KO_TIE_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" name="thirdPlace" checked> Spiel um Platz 3</label>
    <label class="check"><input type="checkbox" name="joker"> Joker erlaubt (1× neues Team ziehen)</label>
    <label class="check"><input type="checkbox" name="roulette"> Regel-Roulette bei der Auslosung</label>
    <button class="btn primary wide" type="submit">Turnier anlegen & Anmeldung öffnen</button>
  </form>`;
}

function adminOpen(t) {
  const c = Object.fromEntries((t.options || []).map((o) => [o, 0]));
  S.players.forEach((p) => { if (p.vote in c) c[p.vote]++; });
  return card(`Anmeldungen <span class="count">${S.players.length}</span>`, `
      <p class="muted small">Anmeldeschluss: ${esc(fmtDateTime(t.regDeadline))} · danach schließt die Anmeldung automatisch.</p>
      <div class="kv">${Object.entries(c).map(([k, v]) => `<span>${esc(POOLS[k].name)}: <b>${v}</b></span>`).join('')}</div>
      ${S.players.map((p) => `<div class="lrow"><div><b>${esc(p.name)}</b><div class="muted small">${p.vote ? esc(POOLS[p.vote].name) : 'keine Stimme'}</div></div><button class="btn ghost sm" data-act="removePlayer" data-id="${p.id}" type="button">Entfernen</button></div>`).join('')}
      <form class="inline" data-form="addPlayer"><input name="name" placeholder="Spieler nachtragen" maxlength="24" required><button class="btn ghost sm" type="submit">+</button></form>
      <button class="btn primary wide" data-act="closeReg" type="button">Anmeldung jetzt schließen</button>`);
}

function adminCheckin(t) {
  const st = settings();
  const n = present().length;
  const G = t.groupsPlanned || suggestGroups(n);
  const f = formatInfo(n, { groups: G, double: t.double, thirdPlace: t.thirdPlace, consoles: st.consoles, matchMinutes: st.matchMinutes });
  const p = pool(t);
  let picks = '';
  if (t.distribution === 'choice') {
    picks = card('Team-Wahl', S.players.filter((x) => x.present).map((x) => { const tm = teamOfPlayer(x.id); return `<div class="lrow"><span>${esc(x.name)}</span><span>${tm ? badge(tm, 's') + ' ' + esc(teamById(tm).name) : '<span class="muted">noch keins – bekommt ein zufälliges</span>'}</span></div>`; }).join(''));
  }
  return card('Check-in', `
      <div class="mode-line">Modus: <b>${p ? esc(p.name) : '?'}</b> · ${esc(DIST_LABEL[t.distribution])}</div>
      <p class="muted small">Antippen = da / nicht da</p>
      <div class="checkin">${S.players.map((x) => `<button type="button" class="ci ${x.present ? 'in' : ''}" data-act="togglePresent" data-id="${x.id}" aria-pressed="${!!x.present}">
        <span class="box">${x.present ? icon('check') : ''}</span><span class="ci-n">${esc(x.name)}</span><span class="ci-s">${x.present ? 'DA' : 'FEHLT'}</span></button>`).join('')}</div>
      <form class="inline" data-form="addPlayer"><input name="name" placeholder="Spontan dabei? Name" maxlength="24" required><button class="btn ghost sm" type="submit">+</button></form>`)
    + picks
    + card('Format', `
      <div class="grid2"><label class="field">Gruppen<select data-act-change="setGroups">${[1, 2, 4].map((g) => `<option value="${g}" ${g === G ? 'selected' : ''}>${g === 1 ? '1 Gruppe (jeder gegen jeden)' : g + ' Gruppen'}</option>`).join('')}</select></label>
      <label class="check" style="align-self:end"><input type="checkbox" data-act-change="setDouble" ${t.double ? 'checked' : ''}> Hin- und Rückspiel</label></div>
      <div class="fmt-card"><b>${esc(f.text)}</b><span class="muted">${f.ok ? f.games + ' Spiele auf ' + st.consoles + ' Stationen · ca. ' + fmtDuration(f.duration) : ''}</span></div>
      <button class="btn primary wide xl" data-act="startDraw" type="button" ${f.ok ? '' : 'disabled'}>Auslosung starten</button>
      <p class="muted small center">Startet die Show auf dem Beamer (Seite „Live“).</p>`);
}

function adminDraw(t) {
  let html = '';
  if (t.draft && !t.draw) {
    const d = t.draft;
    const cur = d.order[d.turn];
    const taken = new Set(Object.values(d.picks || {}));
    const p = pool(t);
    html += card('Draft', `
      ${d.order.map((pid, i) => `<div class="lrow ${i === d.turn ? 'cur' : ''}"><span>${i + 1}. ${esc(pname(pid))}</span><span>${d.picks && d.picks[pid] ? badge(d.picks[pid], 's') + ' ' + esc(teamById(d.picks[pid]).name) : i === d.turn ? '<b>am Zug</b>' : ''}</span></div>`).join('')}
      ${cur ? `<form class="inline" data-form="adminDraftPick"><select name="team">${p.teams.filter((x) => !taken.has(x.id)).sort((a, b) => b.r - a.r).map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select><button class="btn primary sm" type="submit">Für ${esc(pname(cur))} wählen</button></form>
        <p class="muted small">Spieler können auch selbst auf ihrem Handy wählen.</p>` : '<button class="btn primary wide" data-act="draftToGroups" type="button">Gruppen auslosen</button>'}`);
    return html;
  }
  const d = t.draw || { reveal: [], shown: 0 };
  const done = (d.shown || 0) >= d.reveal.length;
  html += card('Auslosung', `
      <p class="big-note">${d.shown || 0} / ${d.reveal.length} aufgedeckt</p>
      <div class="row2"><button class="btn primary" data-act="revealNext" type="button" ${done ? 'disabled' : ''}>Nächstes Los</button><button class="btn ghost" data-act="revealAll" type="button" ${done ? 'disabled' : ''}>Alle aufdecken</button></div>
      ${t.roulette ? `<button class="btn ghost wide" data-act="spinRoulette" type="button">Regel-Roulette drehen</button>${t.rouletteRule ? `<p class="hl">Sonderregel: ${esc(t.rouletteRule)}</p>` : ''}` : ''}
      ${done ? '<button class="btn primary wide xl" data-act="startTournament" type="button">Turnier starten</button>' : ''}`);
  if (t.joker && ['pots', 'random'].includes(d.mode)) {
    const used = t.jokers || {};
    html += card('Joker', d.reveal.slice(0, d.shown || 0).map((r) => `<div class="lrow"><span>${esc(pname(r.pid))} · ${badge(r.teamId, 's')} ${esc(teamById(r.teamId).name)}</span>${used[r.pid] ? '<span class="muted small">Joker benutzt</span>' : `<button class="btn ghost sm" data-act="joker" data-id="${r.pid}" type="button">Joker</button>`}</div>`).join('') || '<p class="muted">Erst aufdecken.</p>');
  }
  return html;
}

function adminMatchRow(m) {
  const ko = m.stage !== 'group';
  const where = m.stage === 'group' ? 'Gr. ' + m.group : STAGE_NAMES[m.stage];
  const stLabel = { scheduled: 'geplant', live: 'läuft' + (m.console ? ' · ' + stationName(m.console) : ''), reported: 'gemeldet', disputed: 'STRITTIG', confirmed: 'fertig', pending: 'wartet' }[m.status];
  if (!m.home || !m.away) return `<div class="amatch pending"><span class="muted small">${esc(where)}</span><span class="muted">Teilnehmer stehen noch nicht fest</span></div>`;
  return `<form class="amatch ${m.status}" data-form="adminResult" data-mid="${m.id}">
    <div class="am-top"><span class="muted small">${esc(where)}</span><span class="st st-${m.status}">${esc(stLabel)}</span></div>
    <div class="am-row"><span class="am-n">${esc(pname(m.home))}</span>
      <input name="hg" type="number" min="0" max="30" value="${m.hg ?? ''}" aria-label="Tore ${esc(pname(m.home))}"><span>:</span><input name="ag" type="number" min="0" max="30" value="${m.ag ?? ''}" aria-label="Tore ${esc(pname(m.away))}">
      <span class="am-n r">${esc(pname(m.away))}</span></div>
    ${ko ? `<div class="am-row small"><span class="am-n muted">Elfer</span><input name="ph" type="number" min="0" max="30" value="${m.ph ?? ''}" aria-label="Elfer Heim"><span>:</span><input name="pa" type="number" min="0" max="30" value="${m.pa ?? ''}" aria-label="Elfer Gast"><span class="am-n"></span></div>` : ''}
    ${['scheduled', 'live'].includes(m.status) ? stationSelect(m) : ''}
    <div class="am-act"><button class="btn primary sm" type="submit">${m.status === 'confirmed' ? 'Korrigieren' : 'Eintragen'}</button>${m.status !== 'scheduled' && m.status !== 'pending' ? `<button type="button" class="btn ghost sm" data-act="resetMatch" data-mid="${m.id}">Zurücksetzen</button>` : ''}</div>
  </form>`;
}

function stationSelect(m) {
  const busy = new Map(S.matches.filter((x) => ACTIVE.includes(x.status) && x.console && x.id !== m.id).map((x) => [x.console, x]));
  const cur = m.status === 'live' ? m.console : '';
  const opts = [`<option value="" ${cur === '' ? 'selected' : ''}>${m.held ? 'Wartet (angehalten)' : 'Warteschlange'}</option>`]
    .concat(stationList().map((c) => `<option value="${c}" ${cur === c ? 'selected' : ''} ${busy.has(c) ? 'disabled' : ''}>${c === STREAM ? '● ' : ''}${esc(stationName(c))}${busy.has(c) ? ' (belegt)' : ''}</option>`));
  return `<label class="station-sel ${m.console === STREAM && m.status === 'live' ? 'stream' : ''}"><span>Station</span><select data-act-change="assignStation" data-mid="${m.id}">${opts.join('')}</select></label>`;
}

function adminRunning(t) {
  const att = S.matches.filter((m) => ['disputed', 'reported'].includes(m.status));
  const live = S.matches.filter((m) => m.status === 'live');
  const sched = S.matches.filter((m) => m.status === 'scheduled').sort((a, b) => a.order - b.order);
  const pend = S.matches.filter((m) => m.status === 'pending');
  const done = S.matches.filter(isDone).sort((a, b) => (b.confirmedAt || 0) - (a.confirmedAt || 0));
  const total = S.matches.length, nDone = done.length;
  return card('Turnier läuft', `<p class="big-note">${nDone} / ${total} Spiele fertig</p>
      <label class="check"><input type="checkbox" data-act-change="toggleAuto" ${S.auto !== false ? 'checked' : ''}> Automatik: Stationen füllen & K.o.-Runde weiterführen (auf diesem Gerät, Streamstation nur von Hand)</label>
      <a class="btn ghost wide" href="#/live">${icon('live')} Beamer-Ansicht öffnen</a>`)
    + (att.length ? card('Braucht Aufmerksamkeit', att.map(adminMatchRow).join(''), 'glow') : '')
    + (live.length ? card('Läuft gerade', live.map(adminMatchRow).join('')) : '')
    + (sched.length ? card('Warteschlange', sched.map(adminMatchRow).join('')) : '')
    + (pend.length ? card('K.o.-Runde (wartet)', pend.map(adminMatchRow).join('')) : '')
    + (done.length ? `<details class="card"><summary>Fertige Spiele (${done.length})</summary>${done.map(adminMatchRow).join('')}</details>` : '');
}

function adminFinished(t) {
  const s = t.summary || {};
  return card('Turnier beendet', `<p>Champion: <b>${s.champion ? esc(s.champion.name) : '–'}</b></p><p class="muted">Das Ergebnis steht in der Hall of Fame. Du kannst jetzt das nächste Turnier anlegen.</p>`);
}
