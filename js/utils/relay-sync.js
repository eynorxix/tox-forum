/* ===== sincronizacion con relays: integra posts de Nostr al tablero local =====
   Los posts de usuarios registrados se publican en relays (utils/relays.js).
   Este modulo los lee de vuelta y los fusiona en el estado local (localStorage)
   usando el 'no' local (tag d = forosraiz-post-v1:board:no) como clave.

   - syncBoard(id)     : trae los hilos/respuestas de un foro y los inserta.
   - syncMyPosts()     : restaura los posts del usuario logueado (otro dispositivo).
   - Los anonimos NO publican a relays: su ambito sigue siendo solo local. */
import { state, save, getBoard, getMe } from "../store/db.js";
import { fetchBoardPosts, fetchUserPosts, fetchNames, subscribeBoardPosts } from "./relays.js";
import { isBanned } from "../store/moderation.js";

var syncing = {};
var lastSync = {};
var namesCache = {};
var onNamesChange = null;
var SYNC_INTERVAL = 15000; /* ms minimo entre sincronizaciones de un mismo foro */

/* llamado cuando se resuelven nombres de autores desde los relays (kind 0),
   para que la UI actualice los nombres al momento */
export function setNamesRefresh(cb) { onNamesChange = cb; }

function nameFor(pubHex) {
  if (namesCache[pubHex]) return namesCache[pubHex];
  var u = state.users && state.users[pubHex];
  if (u && u.name) return u.name;
  return pubHex.slice(0, 10);
}

function buildPost(post, isThread) {
  var p = {
    no: post.no,
    name: nameFor(post.pubkey),
    ownerType: "user",
    ownerPub: post.pubkey,
    ownerName: nameFor(post.pubkey),
    comment: post.content,
    image: post.image || null,
    ts: (post.created_at || 0) * 1000
  };
  if (isThread) p.replies = [];
  return p;
}

/* fusiona posts (hilos primero, luego respuestas) dentro de un foro.
   Devuelve true si algo cambio. La fuente local gana en caso de conflicto. */
function mergeBoard(boardId, posts) {
  /* los posts de autores baneados no se fusionan (moderacion del admin) */
  posts = (posts || []).filter(function (p) { return !isBanned(p.pubkey); });
  var coll = getBoard(boardId);
  var existing = {};
  coll.forEach(function (th) { existing[th.no] = th; });
  var changed = false;
  var unknown = [];

  /* hilos */
  posts.filter(function (p) { return p.threadNo == null; }).forEach(function (p) {
    if (p.board !== boardId) return;
    if (existing[p.no]) return;
    var th = buildPost(p, true);
    coll.push(th);
    existing[p.no] = th;
    changed = true;
  });

  /* respuestas: solo si el hilo existe localmente (o se inserto arriba) */
  posts.filter(function (p) { return p.threadNo != null; }).forEach(function (p) {
    if (p.board !== boardId) return;
    var th = existing[p.threadNo];
    if (!th) return;
    if (th.replies.some(function (r) { return r.no === p.no; })) return;
    th.replies.push(buildPost(p, false));
    changed = true;
  });

  /* autores desconocidos -> intentamos resolver nombre (kind 0) mas tarde */
  posts.forEach(function (p) {
    if (p.pubkey && (!state.users || !state.users[p.pubkey]) && !namesCache[p.pubkey]) {
      if (unknown.indexOf(p.pubkey) < 0) unknown.push(p.pubkey);
    }
  });

  if (changed) {
    save();
    if (unknown.length) resolveNames(unknown, coll);
  }
  return changed;
}

function resolveNames(pubkeys, coll) {
  fetchNames(pubkeys).then(function (map) {
    Object.keys(map).forEach(function (pub) { namesCache[pub] = map[pub]; });
    var any = false;
    coll.forEach(function (th) {
      if (map[th.ownerPub] && th.ownerName !== map[th.ownerPub]) {
        th.name = map[th.ownerPub];
        th.ownerName = map[th.ownerPub];
        any = true;
      }
      th.replies.forEach(function (r) {
        if (map[r.ownerPub] && r.ownerName !== map[r.ownerPub]) {
          r.name = map[r.ownerPub];
          r.ownerName = map[r.ownerPub];
          any = true;
        }
      });
    });
    if (any) {
      save();
      if (onNamesChange) onNamesChange();
    }
  }).catch(function () { /* sin nombres, se queda el pubkey corto */ });
}

/* sincroniza un foro con los posts de Nostr. onDone(changed:boolean). */
export function syncBoard(boardId, onDone) {
  var now = Date.now();
  if (lastSync[boardId] && now - lastSync[boardId] < SYNC_INTERVAL) {
    if (onDone) onDone(false);
    return;
  }
  lastSync[boardId] = now;
  if (syncing[boardId]) {
    if (onDone) onDone(false);
    return;
  }
  syncing[boardId] = true;
  fetchBoardPosts(boardId).then(function (posts) {
    var changed = mergeBoard(boardId, posts);
    syncing[boardId] = false;
    if (onDone) onDone(changed);
  }).catch(function () {
    syncing[boardId] = false;
    if (onDone) onDone(false);
  });
}

/* restaura los posts del usuario actual desde los relays (login en otro
   dispositivo). Devuelve Promise<boolean>. */
export function syncMyPosts() {
  var me = getMe();
  if (!me) return Promise.resolve(false);
  return fetchUserPosts(me.pubHex).then(function (posts) {
    var byBoard = {};
    posts.forEach(function (p) {
      if (!byBoard[p.board]) byBoard[p.board] = [];
      byBoard[p.board].push(p);
    });
    var changed = false;
    Object.keys(byBoard).forEach(function (id) {
      changed = mergeBoard(id, byBoard[id]) || changed;
    });
    return changed;
  }).catch(function () { return false; });
}

/* ===== suscripcion en vivo =====
   Mientras un foro esta abierto, mantiene una suscripcion nostr-tools abierta
   a todos los relays: los posts que publican otros usuarios aparecen solos,
   sin esperar al sondeo. Mismo patron que subscribeBlogState del blog. */

var liveSubs = {};    /* boardId -> closer abierto y listo */
var liveCbs = {};     /* boardId -> callback onIncoming */
var livePending = {}; /* boardId -> true mientras se abre la suscripcion */

/* abre (si no esta) la suscripcion en vivo de un foro. onIncoming(changed)
   se llama cuando un post remoto fue integrado al tablero. */
export function watchBoard(boardId, onIncoming) {
  liveCbs[boardId] = onIncoming || null;
  if (liveSubs[boardId] || livePending[boardId]) return;
  livePending[boardId] = true;
  subscribeBoardPosts(boardId, function (post) {
    var changed = mergeBoard(boardId, [post]);
    if (!changed && post.threadNo != null &&
        !getBoard(boardId).some(function (th) { return th.no === post.threadNo; })) {
      /* llego una respuesta antes que su hilo: traemos el foro completo,
         el hilo llegara en la proxima sincronizacion */
      syncBoard(boardId, function () {
        if (liveCbs[boardId]) liveCbs[boardId]();
      });
      return;
    }
    if (changed && liveCbs[boardId]) liveCbs[boardId]();
  }).then(function (closer) {
    delete livePending[boardId];
    if (liveCbs[boardId]) {
      liveSubs[boardId] = closer;
    } else if (closer && closer.close) {
      /* mientras se abria, el usuario ya navego a otra vista: lo cerramos */
      try { closer.close(); } catch (e) {}
    }
  }).catch(function () {
    delete livePending[boardId];
  });
}

/* cierra la suscripcion en vivo de un foro (navegacion a otra vista). */
export function unwatchBoard(boardId) {
  delete liveCbs[boardId];
  var closer = liveSubs[boardId];
  if (closer) {
    delete liveSubs[boardId];
    try { closer.close(); } catch (e) {}
  }
}

/* true si el foro tiene una suscripcion en vivo abierta (o abriendose). */
export function isWatchingBoard(boardId) {
  return !!(liveSubs[boardId] || livePending[boardId]);
}