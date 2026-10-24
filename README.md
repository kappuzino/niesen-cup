# Niesen Cup – Turnier-App

Firmenturnier-App mit Anmeldung, Abstimmung, Live-Auslosung, Turnierbaum und Hall of Fame.
Läuft auf GitHub Pages, die Daten liegen in Firebase (Firestore).

## Seiten
| Adresse | Für wen | Inhalt |
|---|---|---|
| `#/` | Spieler (Handy) | Anmeldung, Abstimmung, Team-Wahl, eigene Spiele melden/bestätigen |
| `#/live` | Beamer / Stream | Countdown + QR-Code, Check-in, Auslosungs-Show, Tabellen, Turnierbaum, Konsolen, Siegerehrung |
| `#/admin` | Luigi & Philipp | Turnier anlegen, Check-in, Auslosung steuern, Ergebnisse, Einstellungen, Admins |
| `#/regeln` | alle | Regelwerk des aktuellen Turniers |
| `#/hall` | alle | Champions + Ewige Tabelle |

**Demo-Modus:** `?demo` an die Adresse hängen (z. B. `https://kappuzino.github.io/niesen-cup/?demo#/admin`).
Alles läuft dann nur im eigenen Browser – perfekt zum Ausprobieren. Jeder Browser-Tab ist dort ein eigener Spieler.

## Einrichtung (einmalig)
1. **Dateien hochladen:** Im GitHub-Repo `niesen-cup` auf „uploading an existing file“ klicken und den **Inhalt** dieses Ordners
   (index.html, css, js, assets, firestore.rules, README.md) hineinziehen → „Commit changes“.
2. **GitHub Pages:** Repo → Settings → Pages → Source „Deploy from a branch“ → Branch `main`, Ordner `/ (root)` → Save.
   Nach 1–2 Minuten ist die App unter `https://kappuzino.github.io/niesen-cup/` erreichbar.
3. **Sicherheitsregeln:** Firebase-Konsole → Firestore Database → Regeln → Inhalt von `firestore.rules` komplett einfügen → Veröffentlichen.
4. **Admin-Login:** `…/niesen-cup/#/admin` öffnen → „Mit Google anmelden“ (luigi.nobile80@gmail.com ist Haupt-Admin).
5. **Philipp als Admin:** Er öffnet `#/admin`, meldet sich an (Google oder E-Mail/Passwort) und klickt „Admin-Rechte anfragen“.
   Du schaltest ihn unter Admin → Admins frei.

## Ablauf am Turniertag
1. Admin legt das Turnier an (Datum, Anmeldeschluss, Modi, Teamverteilung, Regeln) → Anmeldung ist offen.
2. Kollegen melden sich per Handy an und stimmen ab (QR-Code auf `#/live`).
3. Zum Anmeldeschluss schließt die Anmeldung automatisch (solange ein Admin-Gerät die App offen hat) – oder per Knopf.
4. Vor Ort: Check-in abhaken, Format prüfen, „Auslosung starten“.
5. Beamer zeigt `#/live`. Lose aufdecken per Knopf am Handy oder Leertaste am Beamer-Laptop (als Admin angemeldet).
6. „Turnier starten“ → Konsolen werden automatisch belegt. Spieler melden Ergebnisse, Gegner bestätigt.
   Die Automatik (Konsolen füllen, K.o.-Runde weiterführen, Sieger küren) läuft auf jedem geöffneten Admin-Gerät.

## Anpassen
- **Teams, Stärken, Farben:** `js/teams.js` (Stärke `r` 0–100 bestimmt Sterne und Lostöpfe).
- **Haupt-Admin:** `js/config.js` (`OWNER_EMAIL`) **und** `firestore.rules` (gleiche Adresse).
- **Spiel-Einstellungen:** in der App unter Admin → Einstellungen (bleiben gespeichert).
- **Wappen:** werden live von Wikipedia geladen; fehlt eins, erscheint ein Badge in Vereinsfarben. Abschaltbar in den Einstellungen.

## Technik
- Reines HTML/CSS/JavaScript (ES-Module), kein Build-Schritt.
- Firebase Web SDK 10 (Auth: anonym für Spieler, Google/E-Mail für Admins; Firestore mit Live-Updates).
- Flaggen: flag-icons (MIT-Lizenz). QR-Code: qrcode-generator (MIT-Lizenz).
