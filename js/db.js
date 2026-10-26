// Niesen Cup – Datenschicht: Firebase (live) oder Demo-Modus (lokal im Browser, ?demo in der URL)
import { FIREBASE_CONFIG, OWNER_EMAIL } from './config.js';

export const DEMO = new URLSearchParams(location.search).has('demo');
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

let impl = null;
const authListeners = new Set();
let currentUser = null;
function emitAuth(u) { currentUser = u; authListeners.forEach((f) => f(u)); }

export const db = {
  async init() { impl = DEMO ? demoImpl() : await firebaseImpl(); await impl.init(); },
  onAuth(cb) { authListeners.add(cb); if (currentUser) cb(currentUser); return () => authListeners.delete(cb); },
  get user() { return currentUser; },
  watch: (path, cb, onErr) => impl.watch(path, cb, onErr),
  get: (path) => impl.get(path),
  set: (path, data) => impl.set(path, data),
  create: (path, data) => impl.create(path, data),
  update: (path, data) => impl.update(path, data),
  del: (path) => impl.del(path),
  batch: (ops) => impl.batch(ops),
  loginGoogle: () => impl.loginGoogle(),
  loginEmail: (e, p, reg) => impl.loginEmail(e, p, reg),
  logout: () => impl.logout(),
  isOwner: (u) => !!u && !!u.email && u.email.toLowerCase() === OWNER_EMAIL.toLowerCase() && (u.emailVerified || DEMO)
};

// ---------------- Firebase ----------------
async function firebaseImpl() {
  const appM = await import(FB + 'firebase-app.js');
  const authM = await import(FB + 'firebase-auth.js');
  const fs = await import(FB + 'firebase-firestore.js');
  const app = appM.initializeApp(FIREBASE_CONFIG);
  const auth = authM.getAuth(app);
  const store = fs.initializeFirestore(app, { ignoreUndefinedProperties: true });
  const ref = (path) => {
    const segs = path.split('/');
    return segs.length % 2 ? fs.collection(store, path) : fs.doc(store, path);
  };
  const mapUser = (u) => u && ({ uid: u.uid, email: u.email || null, emailVerified: !!u.emailVerified, anon: u.isAnonymous, name: u.displayName || null });
  return {
    init() {
      return new Promise((resolve, reject) => {
        let first = true;
        authM.onAuthStateChanged(auth, async (u) => {
          if (!u) {
            try { await authM.signInAnonymously(auth); } catch (e) { reject(e); }
            return;
          }
          emitAuth(mapUser(u));
          if (first) { first = false; resolve(); }
        });
      });
    },
    watch(path, cb, onErr) {
      const r = ref(path);
      const isCol = path.split('/').length % 2 === 1;
      return fs.onSnapshot(r, (snap) => {
        if (isCol) cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        else cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      }, (e) => { console.error('watch', path, e); onErr && onErr(e); });
    },
    async get(path) {
      const isCol = path.split('/').length % 2 === 1;
      if (isCol) { const s = await fs.getDocs(ref(path)); return s.docs.map((d) => ({ id: d.id, ...d.data() })); }
      const s = await fs.getDoc(ref(path)); return s.exists() ? { id: s.id, ...s.data() } : null;
    },
    set: (path, data) => fs.setDoc(ref(path), data),
    create: (path, data) => fs.runTransaction(store, async (tx) => {
      const r = ref(path); const s = await tx.get(r);
      if (s.exists()) throw new Error('exists');
      tx.set(r, data);
    }),
    update: (path, data) => fs.updateDoc(ref(path), data),
    del: (path) => fs.deleteDoc(ref(path)),
    async batch(ops) {
      for (let i = 0; i < ops.length; i += 400) {
        const b = fs.writeBatch(store);
        ops.slice(i, i + 400).forEach((o) => {
          if (o.op === 'set') b.set(ref(o.path), o.data);
          else if (o.op === 'update') b.update(ref(o.path), o.data);
          else if (o.op === 'delete') b.delete(ref(o.path));
        });
        await b.commit();
      }
    },
    async loginGoogle() {
      const provider = new authM.GoogleAuthProvider();
      const cur = auth.currentUser;
      try {
        if (cur && cur.isAnonymous) await authM.linkWithPopup(cur, provider);
        else await authM.signInWithPopup(auth, provider);
      } catch (e) {
        if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
          const cred = authM.GoogleAuthProvider.credentialFromError(e);
          if (cred) await authM.signInWithCredential(auth, cred); else await authM.signInWithPopup(auth, provider);
        } else throw e;
      }
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      emitAuth(mapUser(auth.currentUser));
    },
    async loginEmail(email, pw, register) {
      const cur = auth.currentUser;
      if (register) {
        const cred = authM.EmailAuthProvider.credential(email, pw);
        if (cur && cur.isAnonymous) await authM.linkWithCredential(cur, cred);
        else await authM.createUserWithEmailAndPassword(auth, email, pw);
      } else {
        await authM.signInWithEmailAndPassword(auth, email, pw);
      }
      await auth.currentUser.getIdToken(true);
      emitAuth(mapUser(auth.currentUser));
    },
    async logout() { await authM.signOut(auth); }
  };
}

// ---------------- Demo (localStorage + BroadcastChannel) ----------------
function demoImpl() {
  const KEY = 'niesencup-demo-db';
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('niesencup-demo') : null;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  let data = load();
  const watchers = new Set();
  const save = () => { localStorage.setItem(KEY, JSON.stringify(data)); chan && chan.postMessage('x'); notify(); };
  const notify = () => watchers.forEach((w) => w.fire());
  if (chan) chan.onmessage = () => { data = load(); notify(); };
  window.addEventListener('storage', (e) => { if (e.key === KEY) { data = load(); notify(); } });
  const isCol = (p) => p.split('/').length % 2 === 1;
  const read = (path) => {
    if (isCol(path)) {
      const prefix = path + '/';
      const depth = path.split('/').length + 1;
      return Object.keys(data).filter((k) => k.startsWith(prefix) && k.split('/').length === depth)
        .map((k) => ({ id: k.split('/').pop(), ...data[k] }));
    }
    return data[path] ? { id: path.split('/').pop(), ...data[path] } : null;
  };
  let uid = sessionStorage.getItem('niesencup-demo-uid');
  if (!uid) { uid = 'demo-' + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('niesencup-demo-uid', uid); }
  let email = sessionStorage.getItem('niesencup-demo-email');
  const user = () => ({ uid, email, emailVerified: true, anon: !email, name: null });
  const clone = (x) => JSON.parse(JSON.stringify(x));
  return {
    async init() { emitAuth(user()); },
    watch(path, cb) {
      let last = '';
      const w = { fire() { const v = read(path); const s = JSON.stringify(v); if (s !== last) { last = s; cb(clone(v)); } } };
      watchers.add(w); setTimeout(() => w.fire(), 0);
      return () => watchers.delete(w);
    },
    async get(path) { return clone(read(path)); },
    async set(path, d) { data[path] = clone(d); save(); },
    async create(path, d) { if (data[path]) throw new Error('exists'); data[path] = clone(d); save(); },
    async update(path, d) {
      if (!data[path]) throw new Error('not found: ' + path);
      for (const [k, v] of Object.entries(clone(d))) {
        if (k.includes('.')) { const [a, b] = k.split('.'); data[path][a] = { ...(data[path][a] || {}), [b]: v }; }
        else data[path][k] = v;
      }
      save();
    },
    async del(path) { delete data[path]; save(); },
    async batch(ops) {
      ops.forEach((o) => {
        if (o.op === 'set') data[o.path] = clone(o.data);
        else if (o.op === 'update') Object.assign(data[o.path] || (data[o.path] = {}), clone(o.data));
        else if (o.op === 'delete') delete data[o.path];
      });
      save();
    },
    async loginGoogle() { email = OWNER_EMAIL; sessionStorage.setItem('niesencup-demo-email', email); emitAuth(user()); },
    async loginEmail(e) { email = e; sessionStorage.setItem('niesencup-demo-email', email); emitAuth(user()); },
    async logout() { email = null; sessionStorage.removeItem('niesencup-demo-email'); emitAuth(user()); }
  };
}

export function resetDemo() { localStorage.removeItem('niesencup-demo-db'); location.reload(); }
