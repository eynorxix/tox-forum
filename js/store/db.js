/* ===== capa de datos: estado persistente, identidad y acceso al almacen ===== */
import { STORAGE_KEY, BOARDS } from "../config.js";
import { importNsec, activateFromB64, clearActiveKeys } from "../utils/nostr.js";
import { fetchNames, publishProfile } from "../utils/relays.js";
import { isBanned } from "./moderation.js";

export var state = load();
if (!state || !state.counter) state = { counter: 1, boards: {} };
if (!state.votes) state.votes = {};
if (!state.users) state.users = {};          /* registrados indexados por pubHex */
if (!state.usersByNsec) state.usersByNsec = {};
if (!state.me) state.me = null;              /* identidad actual (null = anonimo) */
if (!state.me || !state.me.npub) {
  /* por defecto el visitante es anonimo */
  state.me = null;
}
/* limpia los datos de demostracion que ya no se generan: hilos demo, votos y
   colaboradores ficticios. Solo se ejecuta si existian. */
if (state.demoSeeded || state.collabSeeded) {
  BOARDS.forEach(function (b) {
    var coll = state.boards[b.id];
    if (coll) state.boards[b.id] = coll.filter(function (th) { return !th.demo; });
  });
  delete state.demoSeeded;
  delete state.collabSeeded;
  delete state.collabs;
  delete state.votes;
  state.votes = {};
  save();
}
if (state.me && state.me.sec) {
  activateFromB64(state.me.sec, state.me.pubHex);
}
/* sesiones ya iniciadas con el nombre por defecto "Usuario xxxx": se corrige
   al momento con el nombre publicado en relays (kind 0) para esa npub */
if (state.me && state.me.pubHex && /^Usuario /.test(state.me.name || "")) {
  (function () {
    var pub = state.me.pubHex;
    fetchNames([pub]).then(function (map) {
      if (map[pub] && state.me && state.me.pubHex === pub) {
        state.me.name = map[pub];
        save();
      }
    }).catch(function () {});
  })();
}
if (!state.anonName) state.anonName = "";    /* ultimo nombre anonimo usado */
if (!state.following) state.following = [];  /* pubHex que el usuario actual sigue */
if (!state.notifications) state.notifications = [];
if (!state.notifSeen) state.notifSeen = [];   /* claves de respuestas ya notificadas */
if (!state.savedForums) state.savedForums = []; /* foros guardados */
if (!state.likes) state.likes = [];          /* ids de posts con like del usuario actual */
if (!state.createdForums) state.createdForums = []; /* foros creados por usuarios del navegador */
syncBoardsFromCreated();

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
  catch (e) { return null; }
}

export function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { /* dato demasiado grande */ }
}

export function getBoard(id) {
  if (!state.boards[id]) state.boards[id] = [];
  return state.boards[id];
}

export function nextNo() { return state.counter++; }

/* ---------- identidad ---------- */
export function isAnon() { return !state.me; }

export function getMe() { return state.me; }

export function meName() {
  return state.me ? state.me.name : (state.anonName || "Anonimo");
}

/* registro de un nuevo usuario (desde anonimo) */
export function registerUser(name, keys, age) {
  var user = {
    name: name,
    nsec: keys.nsec,
    npub: keys.npub,
    pubHex: keys.pubHex,
    sec: keys.sec || null,   /* clave privada en base64 (para firmar a relays) */
    icon: null,
    desc: "Mi perfil en ForosRaiz: edita tu imagen y descripcion desde aqui.",
    age: age,
    mainForum: null,
    forums: [],
    links: [],
    createdAt: Date.now()
  };
  state.users[user.pubHex] = user;
  state.usersByNsec[user.nsec] = user.pubHex;
  state.me = user;
  save();
  return user;
}

/* iniciar sesion con una clave nsec real (acepta cualquier nsec valido).
   Devuelve Promise<boolean>. Si la clave no estaba registrada localmente,
   crea la cuenta local a partir de la identidad decodificada. */
export function loginHooks(onLogin) { _onLogin = onLogin; }
var _onLogin = null;

export function login(nsec) {
  return importNsec(nsec).then(function (keys) {
    var pub = keys.pubHex;
    if (!state.users[pub]) {
      /* usuario no registrado en este navegador: creamos cuenta local */
      var user = {
        name: (state.anonName || "Usuario") + " " + pub.slice(0, 4),
        nsec: keys.nsec,
        npub: keys.npub,
        pubHex: pub,
        sec: keys.sec || null,
        icon: null,
        desc: "Mi perfil en ForosRaiz.",
        age: 18,
        mainForum: null,
        forums: [],
        links: [],
        createdAt: Date.now()
      };
      state.users[pub] = user;
      state.usersByNsec[keys.nsec] = pub;
    }
    state.me = state.users[pub];
    save();
    /* identidad POR NPUB: adoptamos el nombre que este usuario tiene publicado
       en los relays (kind 0) si el local es el tiron por defecto, y publicamos
       el perfil por si esta cuenta nunca lo habia hecho (asi todos ven el
       mismo nombre). El nsec solo firma, nunca se comparte. */
    return fetchNames([pub]).then(function (map) {
      var real = map[pub];
      if (real && /^Usuario /.test(state.me.name || "")) {
        state.me.name = real;
        save();
      }
      publishProfile({ name: state.me.name, picture: state.me.icon || null });
      if (_onLogin) _onLogin();
      return true;
    }).catch(function () {
      publishProfile({ name: state.me.name, picture: state.me.icon || null });
      if (_onLogin) _onLogin();
      return true;
    });
  }).catch(function () {
    return false;
  });
}

export function logout() {
  state.me = null;
  clearActiveKeys();
  save();
}

export function isRegisteredUser() { return !!state.me; }

/* ---------- foros del usuario ---------- */
export function myMainForum() { return state.me ? state.me.mainForum : null; }

export function myRegistered() { return state.me ? state.me.forums.slice() : []; }

export function isRegistered(id) {
  if (!state.me) return false;
  return id === state.me.mainForum || state.me.forums.indexOf(id) >= 0;
}

export function toggleForum(id) {
  if (!state.me) return;
  if (id === state.me.mainForum) {
    state.me.mainForum = null;
  } else if (state.me.forums.indexOf(id) >= 0) {
    state.me.forums = state.me.forums.filter(function (f) { return f !== id; });
  } else if (!state.me.mainForum) {
    state.me.mainForum = id;
  } else {
    state.me.forums.push(id);
  }
  save();
}

export function promoteForum(id) {
  if (!state.me) return;
  if (id === state.me.mainForum) return;
  if (state.me.mainForum) state.me.forums.push(state.me.mainForum);
  state.me.forums = state.me.forums.filter(function (f) { return f !== id; });
  state.me.mainForum = id;
  save();
}

/* un usuario registrado: el perfil aparece en colaboradores del foro principal */
export function isCollab(id) {
  if (!state.me || !state.me.mainForum) return false;
  return state.me.mainForum === id;
}

/* ---------- seguir usuarios ---------- */
export function followUser(pubHex) {
  if (!state.me || !pubHex || pubHex === state.me.pubHex) return false;
  if (state.following.indexOf(pubHex) < 0) {
    state.following.push(pubHex);
    save();
    return true;
  }
  return false;
}

export function unfollowUser(pubHex) {
  var i = state.following.indexOf(pubHex);
  if (i >= 0) {
    state.following.splice(i, 1);
    save();
    return true;
  }
  return false;
}

export function isFollowing(pubHex) {
  return !!pubHex && state.following.indexOf(pubHex) >= 0;
}

export function followingList() {
  return state.following.slice();
}

/* ---------- notificaciones ---------- */
export function addNotification(text) {
  state.notifications.unshift({ text: text, ts: Date.now(), read: false });
  if (state.notifications.length > 60) state.notifications.length = 60;
  save();
}

/* clave unica de una respuesta (board + no de hilo + no de respuesta) usada
   para no duplicar notificaciones cuando el mismo reply llega por sondeo y por
   la suscripcion en vivo. */
export function replyNotifKey(boardId, threadNo, replyNo) {
  return boardId + "/" + threadNo + "/" + replyNo;
}

export function wasReplyNotified(boardId, threadNo, replyNo) {
  return (state.notifSeen || []).indexOf(replyNotifKey(boardId, threadNo, replyNo)) >= 0;
}

export function markReplyNotified(boardId, threadNo, replyNo) {
  if (!state.notifSeen) state.notifSeen = [];
  var key = replyNotifKey(boardId, threadNo, replyNo);
  if (state.notifSeen.indexOf(key) < 0) state.notifSeen.push(key);
  if (state.notifSeen.length > 400) state.notifSeen = state.notifSeen.slice(-400);
  save();
}

/* notificacion estructurada: alguien respondio a un post tuyo. v:
   { boardId, threadNo, replyNo, fromName, fromPub, text } */
export function addReplyNotification(v) {
  state.notifications.unshift({
    type: "reply",
    boardId: v.boardId,
    threadNo: v.threadNo,
    replyNo: v.replyNo,
    fromName: v.fromName || "Anonimo",
    fromPub: v.fromPub || null,
    text: v.text || "",
    ts: Date.now(),
    read: false
  });
  if (state.notifications.length > 60) state.notifications.length = 60;
  save();
}

export function notifications() { return state.notifications.slice(); }

export function unreadCount() {
  var n = 0;
  state.notifications.forEach(function (x) { if (!x.read) n++; });
  return n;
}

export function markNotifsRead() {
  state.notifications.forEach(function (x) { x.read = true; });
  save();
}

export function clearNotifications() {
  state.notifications = [];
  save();
}

/* ---------- foros guardados (suscripcion) ---------- */
export function toggleSavedForum(id) {
  var i = state.savedForums.indexOf(id);
  if (i >= 0) state.savedForums.splice(i, 1);
  else state.savedForums.push(id);
  save();
}

export function isSaved(id) { return state.savedForums.indexOf(id) >= 0; }

export function savedForums() { return state.savedForums.slice(); }

/* ---------- likes ---------- */
function likeKey(boardId, threadNo, replyNo) {
  return boardId + "/" + threadNo + (replyNo ? "/" + replyNo : "");
}

export function toggleLike(boardId, threadNo, replyNo) {
  var key = likeKey(boardId, threadNo, replyNo);
  var target = null;
  getBoard(boardId).forEach(function (th) {
    if (th.no === threadNo) {
      target = replyNo
        ? (th.replies.find(function (r) { return r.no === replyNo; }) || null)
        : th;
    }
  });
  if (!target) return;
  var i = state.likes.indexOf(key);
  if (i >= 0) {
    state.likes.splice(i, 1);
    target.likes = Math.max(0, (target.likes || 0) - 1);
  } else {
    state.likes.push(key);
    target.likes = (target.likes || 0) + 1;
  }
  save();
  return true;
}

export function isLiked(boardId, threadNo, replyNo) {
  return state.likes.indexOf(likeKey(boardId, threadNo, replyNo)) >= 0;
}

/* todos los posts de un autor (pubHex) en todos los foros */
export function postsByAuthor(pubHex) {
  var out = [];
  if (isBanned(pubHex)) return out;
  BOARDS.forEach(function (b) {
    getBoard(b.id).forEach(function (th) {
      if (th.ownerType === "user" && th.ownerPub === pubHex) {
        out.push({ boardId: b.id, threadNo: th.no, post: th, type: "thread" });
      }
      th.replies.forEach(function (r) {
        if (r.ownerType === "user" && r.ownerPub === pubHex) {
          out.push({ boardId: b.id, threadNo: th.no, post: r, type: "reply" });
        }
      });
    });
  });
  return out;
}

/* ---------- publicaciones ---------- */
function postAuthor(post) {
  return post.ownerType === "user" ? post.ownerName : "Anonimo";
}

function ownPost(post) {
  if (state.me) return post.ownerPub === state.me.pubHex;
  return false;
}

function isExpired(post) {
  /* sin modo anonimo ya no hay posts que caduquen por TTL. Los posts viejos
     guardados localmente se conservan. */
  return false;
}

/* limpia posts anonimos expirados (y sus respuestas expiradas).
   Devuelve true si elimino algo (para decidir si hace falta re-renderizar). */
export function purgeExpired() {
  var changedAny = false;
  BOARDS.forEach(function (b) {
    var coll = getBoard(b.id);
    for (var i = coll.length - 1; i >= 0; i--) {
      var th = coll[i];
      if (th.ownerType !== "user" && isExpired(th)) {
        coll.splice(i, 1);
        changedAny = true;
        continue;
      }
      for (var j = th.replies.length - 1; j >= 0; j--) {
        var r = th.replies[j];
        if (r.ownerType !== "user" && isExpired(r)) {
          th.replies.splice(j, 1);
          changedAny = true;
        }
      }
    }
  });
  return changedAny;
}

export function myPosts() {
  purgeExpired();
  var out = [];
  BOARDS.forEach(function (b) {
    getBoard(b.id).forEach(function (th) {
      if (ownPost(th)) out.push({ boardId: b.id, threadNo: th.no, post: th, type: "thread" });
      th.replies.forEach(function (r) {
        if (ownPost(r)) out.push({ boardId: b.id, threadNo: th.no, post: r, type: "reply" });
      });
    });
  });
  return out;
}

/* ===== foros creados por el usuario (max 3) =====
   state.createdForums = [{ id, name, status, ownerPub, createdAt }]
   status: "libre" (todos postean) | "restringido" (solo el creador postea).
   Estos foros se sincronizan a BOARDS (cat "Otros") para poder navegarlos. */

export function getCreatedForums() {
  syncBoardsFromCreated();
  return state.createdForums.slice();
}

function catOfCreated() { return "Otros"; }

function syncBoardsFromCreated() {
  var created = state.createdForums || [];
  created.forEach(function (f) {
    var exists = BOARDS.some(function (b) { return b.id === f.id; });
    if (!exists) {
      BOARDS.push({ id: f.id, name: f.name, desc: "Foro creado por un usuario.", cat: catOfCreated() });
    } else {
      var b = BOARDS.find(function (x) { return x.id === f.id; });
      if (b && b.name !== f.name) b.name = f.name;
    }
  });
}

function createdIdUsed(id) {
  return BOARDS.some(function (b) { return b.id === id; });
}

export function createForum(name) {
  var me = state.me;
  if (!me || !me.pubHex) return null;
  var mine = state.createdForums.filter(function (f) { return f.ownerPub === me.pubHex; });
  if (mine.length >= 3) return null; /* maximo 3 foros por usuario */
  var n = state.createdForums.length + 1 + Math.floor(Math.random() * 100);
  var id = "u" + n;
  while (createdIdUsed(id)) id = "u" + (++n);
  var f = {
    id: id,
    name: (name || "Mi foro").trim() || "Mi foro",
    status: "libre",
    ownerPub: me.pubHex,
    createdAt: Date.now()
  };
  state.createdForums.push(f);
  save();
  syncBoardsFromCreated();
  return f;
}

export function renameForum(id, name) {
  var f = findCreated(id);
  if (!f) return false;
  f.name = (name || "").trim() || f.name;
  save();
  syncBoardsFromCreated();
  return true;
}

export function setForumStatus(id, status) {
  var f = findCreated(id);
  if (!f) return false;
  f.status = (status === "restringido") ? "restringido" : "libre";
  save();
  return true;
}

export function deleteForum(id) {
  var me = state.me;
  var idx = -1;
  state.createdForums.forEach(function (f, i) {
    if (f.id === id && (!me || f.ownerPub === me.pubHex)) idx = i;
  });
  if (idx < 0) return false;
  state.createdForums.splice(idx, 1);
  var bIdx = -1;
  BOARDS.forEach(function (b, i) { if (b.id === id) bIdx = i; });
  if (bIdx >= 0) BOARDS.splice(bIdx, 1);
  delete state.boards[id];
  save();
  return true;
}

function findCreated(id) {
  return (state.createdForums || []).find(function (f) { return f.id === id; });
}

export function isForumOwner(id) {
  var f = findCreated(id);
  return !!f && !!state.me && f.ownerPub === state.me.pubHex;
}

export function forumStatus(id) {
  var f = findCreated(id);
  return f ? f.status : "libre";
}

export function forumOwnerPub(id) {
  var f = findCreated(id);
  return f ? f.ownerPub : null;
}

export function isCreatedForum(id) {
  return (state.createdForums || []).some(function (f) { return f.id === id; });
}

/* guard para postear: en un foro creado restringido solo puede postear el creador */
export function canPostBoard(id) {
  var f = (state.createdForums || []).find(function (x) { return x.id === id; });
  if (!f) return true; /* foro normal del sitio, siempre se puede postear */
  if (f.status !== "restringido") return true; /* libre: todos postean */
  return !!state.me && f.ownerPub === state.me.pubHex; /* restringido: solo creador */
}

export { postAuthor, isExpired, ownPost };