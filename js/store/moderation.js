/* ===== moderacion: consumo de la lista de baneados publicada por el admin =====
   El panel de control (repo Admin_forum/) publica la lista de baneados como
   un evento kind 39000, #d 'forosraiz-banlist-v1', FIRMADO por ADMIN_NPUB.
   Este modulo:
   - combina 3 fuentes: BANNED_NPUBS (config), overrides locales y el evento
     publicado por el admin (con suscripcion en vivo),
   - expone isBanned(pubHex) para que la UI y el merge oculten a los baneados,
   - purga del estado local los posts ya guardados de autores baneados. */
import { ADMIN_NPUB, BANNED_NPUBS } from "../config.js";
import { getNip19 } from "../utils/nostr-lib.js";
import { queryEvents, subscribeKindEvents } from "../utils/relays.js";
import { state, save } from "./db.js";

export var BAN_KIND = 39000;
export var BAN_DTAG = "forosraiz-banlist-v1";
var LOCAL_KEY = "forosraiz_bans";

var baseSet = {};  /* hex de config BANNED_NPUBS + overrides locales */
var pubSet = {};   /* hex del ultimo evento publicado por el admin */
var lastPubTs = 0;

var onBans = null;
export function setBansRefresh(cb) { onBans = cb; }
function notify() { if (onBans) onBans(); }

export function isBanned(pubHex) {
  return !!(pubHex && (baseSet[pubHex] || pubSet[pubHex]));
}

export function bannedPubkeys() {
  return Object.keys(baseSet).concat(Object.keys(pubSet));
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

/* aplica el evento de baneo si es el mas reciente publicado por el admin */
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

function decodeNpubToHex(np) {
  return getNip19().then(function (nip19) {
    var d = nip19.decode(np);
    return (d && d.type === "npub") ? d.data : null;
  }).catch(function () { return null; });
}

function loadLocalOverrides() {
  try {
    JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]").forEach(function (hex) {
      if (/^[0-9a-f]{64}$/.test(hex)) baseSet[hex] = true;
    });
  } catch (e) {}
}

/* arranca la moderacion: bases + evento publicado + suscripcion en vivo.
   Idempotente; se llama una vez al cargar el sitio. */
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
    var adminHex = null;
    if (ADMIN_NPUB) {
      adminHex = /^[0-9a-f]{64}$/.test(ADMIN_NPUB)
        ? ADMIN_NPUB
        : await decodeNpubToHex(ADMIN_NPUB);
    }
    if (adminHex) {
      try {
        var events = await queryEvents({ kinds: [BAN_KIND], authors: [adminHex], "#d": [BAN_DTAG], limit: 10 }, { maxWait: 7000 });
        var newest = null;
        events.forEach(function (ev) {
          if (ev.pubkey !== adminHex) return;
          if (!newest || ev.created_at > newest.created_at) newest = ev;
        });
        if (newest) applyBanEvent(newest);
      } catch (e) {}
      try {
        subscribeKindEvents({ kinds: [BAN_KIND], authors: [adminHex], "#d": [BAN_DTAG] }, function (ev) {
          if (!ev || ev.pubkey !== adminHex) return;
          applyBanEvent(ev);
        }).catch(function () {});
      } catch (e) {}
    }
    pruneBanned();
  })();
  return _init;
}