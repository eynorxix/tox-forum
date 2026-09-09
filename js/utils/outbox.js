/* ===== outbox: reintenta publicar a relays las actualizaciones que quedaron
   pendientes por falta de conexion (posts de foros, perfil, registro). =====
   En vez de perder un snapshot cuando ningun relay confirmo (ok === 0), se
   encola el trabajo aqui y un temporizador lo vuelve a intentar en background
   cada RETRY_MS hasta que al menos un relay lo confirme. No se muestra el
   numero de intentos: publicar/guardar se siente instantaneo y el reenvio es
   silencioso (solo un toast cuando la cola queda vacia). */

import { publishUserBoard } from "./relay-sync.js";
import { publishProfile, publishRegistration } from "./relays.js";
import { toast } from "./dom.js";

var OUT_KEY = "forosraiz-outbox";
var RETRY_MS = 20000;
var timer = null;

/* cola: { boards: {boardId:true}, profile: {...input}|null, registration: {...input}|null } */
function load() {
  try {
    var q = JSON.parse(localStorage.getItem(OUT_KEY) || "null");
    if (q && typeof q === "object") {
      if (!q.boards) q.boards = {};
      return q;
    }
  } catch (e) { /* cola corrupta: se descarta */ }
  return { boards: {}, profile: null, registration: null };
}

function save(q) {
  localStorage.setItem(OUT_KEY, JSON.stringify(q));
}

export function hasPending() {
  var q = load();
  return !!(q.boards && Object.keys(q.boards).length) || !!q.profile || !!q.registration;
}

/* encola un foro: se renviara el snapshot completo del usuario en ese board. */
export function enqueueBoard(boardId) {
  if (!boardId) return;
  var q = load();
  var fresh = !q.boards[boardId];
  q.boards[boardId] = true;
  save(q);
  if (fresh) toast("Sin conexion a relays: el post queda guardado y se reenviara solo cuando haya red", "warn");
}

/* encola el perfil (kind 0) tal cual se publico, para reintentarlo intacto. */
export function enqueueProfile(input) {
  var q = load();
  var fresh = !q.profile;
  q.profile = input || null;
  save(q);
  if (fresh) toast("Perfil guardado en tu navegador; se publicara en los relays cuando haya conexion", "warn");
}

/* encola el evento de registro (kind 13370) para que el panel del admin lo vea. */
export function enqueueRegistration(input) {
  var q = load();
  var fresh = !q.registration;
  q.registration = input || null;
  save(q);
  if (fresh) toast("Datos de registro guardados; se publicaran en los relays cuando haya conexion", "warn");
}

/* un intento de reenvio silencioso: recorre la cola y, por cada trabajo que
   consiga >=1 relay, lo descarta. Cuando la cola se vacia avisa una sola vez. */
function pump() {
  var q = load();
  var pending = hasPending();
  if (!pending) return;

  var done = [];

  Object.keys(q.boards || {}).forEach(function (id) {
    publishUserBoard(id).then(function (ok) {
      if (ok > 0) {
        delete q.boards[id];
        done.push(true);
        settle(q, pending);
      }
    }, function () { /* sin red: se reintentara en el proximo tick */ });
  });

  if (q.profile) {
    publishProfile(q.profile).then(function (ok) {
      if (ok > 0) {
        q.profile = null;
        done.push(true);
        settle(q, pending);
      }
    }, function () {});
  }

  if (q.registration) {
    publishRegistration(q.registration).then(function (ok) {
      if (ok > 0) {
        q.registration = null;
        done.push(true);
        settle(q, pending);
      }
    }, function () {});
  }

  function settle(queue, wasPending) {
    if (!wasPending) return;
    save(queue);
    if (!hasPending()) toast("Tus publicaciones pendientes se sincronizaron con los relays");
  }
}

/* arranca el reenvio en background. Idempotente. */
export function startOutbox() {
  if (timer) return;
  timer = setInterval(pump, RETRY_MS);
  setTimeout(pump, 4000);
}