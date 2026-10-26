// Niesen Cup – Konfiguration
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDM_yvVbzzBKNg1pFIeKAVGDYh6L_THabM',
  authDomain: 'niesen-cup.firebaseapp.com',
  projectId: 'niesen-cup',
  storageBucket: 'niesen-cup.firebasestorage.app',
  messagingSenderId: '574515675156',
  appId: '1:574515675156:web:e50366244da7c93d8ce701'
};

// Haupt-Admin (kann weitere Admins freischalten). Muss auch in firestore.rules stehen.
export const OWNER_EMAIL = 'luigi.nobile80@gmail.com';

// Standard-Spieleinstellungen (werden in den Admin-Einstellungen gespeichert und können dort geändert werden)
export const DEFAULT_SETTINGS = {
  consoles: 4,
  streamStation: true,
  streamName: 'Streamstation',
  matchMinutes: 15,
  halfLength: '6 Minuten',
  difficulty: 'Weltklasse',
  speed: 'Normal',
  injuries: 'Aus',
  pauseRule: 'Pause nur bei Ball im Aus · max. 3 Taktik-Pausen',
  crests: true,
  extraRules: 'Absturz/Controller-Ausfall: Neustart mit aktuellem Spielstand und Restzeit.\nNichtantreten wird 3:0 gewertet.\nErgebnis direkt nach dem Spiel eintragen und vom Gegner bestätigen lassen.'
};
