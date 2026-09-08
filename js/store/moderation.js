/* ===== moderacion: consumo de roles y baneos publicados por el admin =====
   El panel de control (repo Admin_forum/) publica el estado de cada usuario
   (rol + status) como un evento kind 39001, #d 'forosraiz-roles-v1',
   FIRMADO por ADMIN_NPUB. Tambien puede publicar la lista antigua de baneos
   (kind 39000 'forosraiz-banlist-v1').
   Este modulo:
   - combina 3 fuentes: BANNED_NPUBS (config), overrides locales y los eventos
     publicados por el admin (suscripcion en vivo),
   - expone isBanned(pubHex), getRole(pubHex), isCollabByAdmin(pubHex),
     isAdmin(pubHex) y collabsByAdmin() para que la UI filtre y muestre,
   - purga del estado local los posts ya guardados de autores baneados. */
import { ADMIN_NPUB, BANNED_NPUBS, ROLE_KIND, ROLE_DTAG, BAN_KIND, BAN_DTAG } from "../config.js";
import { getNip19 } from "../utils/nostr-lib.js";
import { queryEvents, subscribeKindEvents } from "../utils/relays.js";
import { state, save } from "./db.js";

export { BAN_KIND, BAN_DTAG, ROLE_KIND, ROLE_DTAG };
var LOCAL_KEY = "forosraiz_roles";

var baseSet = {};   /* hex de config BANNED_NPUBS + overrides locales (baneados) */
var pubSet = {};    /* hex baneados segun el ultimo evento publicado por el admin */
var rolesMap = {};  /* hex -> { role, status } segun el ultimo evento 39001 */
var lastPubTs = 0;
var lastRoleTs = 0;

var onBans = null;
export function setBansRefresh(cb) { onBans = cb; }
function notify() { if (onBans) onBans(); }

export function isBanned(pubHex) {
  if (!pubHex) return false;
  if (baseSet[pubHex] || pubSet[pubHex]) return true;
  var r = rolesMap[pubHex];
  return !!(r && r.status === "banned");
}

/* roles desde el evento 39001 */
export function getRole(pubHex) {
  var r = rolesMap[pubHex];
  return r ? r.role : null;
}
export function isCollabByAdmin(pubHex) {
  return getRole(pubHex) === "collab";
}
export function isAdmin(pubHex) {
  return getRole(pubHex) === "admin";
}
/* todos los colaboradores aprobados por el admin (role collab, no baneados).
   Devuelve array de { role, status } con pubkeys. */
export function collabsByAdmin() {
  return Object.keys(rolesMap).filter(function (hex) {
    var r = rolesMap[hex];
    return r && r.role === "collab" && r.status !== "banned";
  });
}
export function adminsByAdmin() {
  return Object.keys(rolesMap).filter(function (hex) {
    var r = rolesMap[hex];
    return r && r.role === "admin" && r.status !== "banned";
  });
}
export function allRoles() { return rolesMap; }

export function bannedPubkeys() {
  var out = [];
  var seen = {};
  [Object.keys(baseSet), Object.keys(pubSet), Object.keys(rolesMap)].forEach(function (arr) {
    arr.forEach(function (hex) {
      if (!seen[hex] && isBanned(hex)) { seen[hex] = true; out.push(hex); }
    });
  });
  return out;
}

/* quita del estado local los posts de autores baneados (threads y respuestas).
   Devuelve true si borro algo. */
export function pruneBanned() {
  var changed = false;
  Object.keys(state.boards || {}).forEach(function (boardId) {
    var coll = state.boards[boardId];
    var out = [];
    coll.forEach(function (th) {
      if (th.ownerType === "user" && isBanned(th.ownerPub)) { changed = true; return; }
      var keepReplies = [];
      th.replies.forEach(function (r) {
        if (r.ownerType === "user" && isBanned(r.ownerPub)) { changed = true; return; }
        keepReplies.push(r);
      });
      if (keepReplies.length !== th.replies.length) th.replies = keepReplies;
      out.push(th);
    });
    state.boards[boardId] = out;
  });
  if (changed) save();
  return changed;
}

/* aplica el evento de baneo legacy (39000) si es el mas reciente */
function applyBanEvent(ev) {
  if (ev.kind !== BAN_KIND) return;
  if ((ev.created_at || 0) <= lastPubTs) return;
  lastPubTs = ev.created_at || 0;
  pubSet = {};
  (ev.tags || []).forEach(function (t) {
    if (t[0] === "p" && t[1] && /^[0-9a-f]{64}$/.test(t[1])) pubSet[t[1]] = true;
  });
  pruneBanned();
  notify();
}

/* aplica el evento de roles (39001) si es el mas reciente */
function applyRoleEvent(ev) {
  if (ev.kind !== ROLE_KIND) return;
  if ((ev.created_at || 0) <= lastRoleTs) return;
  lastRoleTs = ev.created_at || 0;
  rolesMap = {};
  (ev.tags || []).forEach(function (t) {
    if (t[0] !== "p" || !t[1] || !/^[0-9a-f]{64}$/.test(t[1])) return;
    /* formato: ["p", hex, "role", <rol>, "status", <estado>] */
    rolesMap[t[1]] = { role: tagVal(t, "role") || "comun", status: tagVal(t, "status") || "activo" };
  });
  pruneBanned();
  notify();
}

/* extrae el valor de una etiqueta con su valor (p. ej. "role", "collab") */
function tagVal(tag, label) {
  for (var i = 2; i < tag.length - 1; i++) {
    if (tag[i] === label && tag[i + 1]) return tag[i + 1];
  }
  return null;
}

function decodeNpubToHex(np) {
  return getNip19().then(function (nip19) {
    var d = nip19.decode(np);
    return (d && d.type === "npub") ? d.data : null;
  }).catch(function () { return null; });
}

function loadLocalOverrides() {
  try {
    var map = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
    Object.keys(map).forEach(function (hex) {
      if (/^[0-9a-f]{64}$/.test(hex)) {
        var r = map[hex];
        if (r && r.status === "banned") baseSet[hex] = true;
      }
    });
  } catch (e) {}
}

/* cliente hex (npub) de ADMIN_NPUB, calculado una vez en ensureBanInit().
   Se usa para (re)consultar los eventos de roles/baneos del admin. */
var adminHex = null;

/* consulta el/los eventos 39001 (roles) y 39000 (bans legacy) MAS RECIENTES
   del admin y los aplica solo si son nuevos (lastRoleTs/lastPubTs lo filtran).
   Reentrante e idempotente; sirve como arranque y como re-sync periodico. */
function resyncAdminEvents() {
  if (!adminHex) return Promise.resolve();
  var qRole = queryEvents({ kinds: [ROLE_KIND], authors: [adminHex], "#d": [ROLE_DTAG], limit: 10 }, { maxWait: 7000 })
    .then(function (roleEvents) {
      var newestRole = null;
      roleEvents.forEach(function (ev) {
        if (ev.pubkey !== adminHex) return;
        if (!newestRole || ev.created_at > newestRole.created_at) newestRole = ev;
      });
      if (newestRole) applyRoleEvent(newestRole);
    }).catch(function () {});
  var qBan = queryEvents({ kinds: [BAN_KIND], authors: [adminHex], "#d": [BAN_DTAG], limit: 10 }, { maxWait: 7000 })
    .then(function (banEvents) {
      var newestBan = null;
      banEvents.forEach(function (ev) {
        if (ev.pubkey !== adminHex) return;
        if (!newestBan || ev.created_at > newestBan.created_at) newestBan = ev;
      });
      if (newestBan) applyBanEvent(newestBan);
    }).catch(function () {});
  return Promise.all([qRole, qBan]);
}

/* arranca la moderacion: bases + eventos publicados del admin + suscripcion
   en vivo. Idempotente; se llama una vez al cargar el sitio. */
var _init = null;
export function ensureBanInit() {
  if (_init) return _init;
  _init = (async function () {
    loadLocalOverrides();
    for (var i = 0; i < BANNED_NPUBS.length; i++) {
      var hex = /^[0-9a-f]{64}$/.test(BANNED_NPUBS[i])
        ? BANNED_NPUBS[i]
        : await decodeNpubToHex(BANNED_NPUBS[i]);
      if (hex) baseSet[hex] = true;
    }
    if (ADMIN_NPUB) {
      adminHex = /^[0-9a-f]{64}$/.test(ADMIN_NPUB)
        ? ADMIN_NPUB
        : await decodeNpubToHex(ADMIN_NPUB);
    }
    if (adminHex) {
      await resyncAdminEvents();
      try {
        subscribeKindEvents({ kinds: [ROLE_KIND], authors: [adminHex], "#d": [ROLE_DTAG] }, function (ev) {
          if (!ev || ev.pubkey !== adminHex) return;
          applyRoleEvent(ev);
        }).catch(function () {});
      } catch (e) {}
      try {
        subscribeKindEvents({ kinds: [BAN_KIND], authors: [adminHex], "#d": [BAN_DTAG] }, function (ev) {
          if (!ev || ev.pubkey !== adminHex) return;
          applyBanEvent(ev);
        }).catch(function () {});
      } catch (e) {}
      /* la suscripcion en vivo la cierra el pool a los ~maxWait (9s si el relay
         no emite): con este re-sync cada 20s un baneo/rol nuevo publica igual
         se aplica a quien ya tiene la pagina abierta. */
      setInterval(function () { resyncAdminEvents(); }, 20000);
    }
    pruneBanned();
  })();
  return _init;
}