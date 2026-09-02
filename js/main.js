/* ===== punto de entrada: arranque, eventos globales y semillas ===== */
import { session } from "./store/session.js";
import { purgeExpired } from "./store/db.js";
import { setHooks } from "./ui/appshell.js";
import { go, render, showProfile, showMyProfile } from "./ui/view.js";
import { renderNav, refreshChip } from "./ui/nav.js";
import { warmNostr } from "./utils/nostr-lib.js";
import { syncBoard, isWatchingBoard } from "./utils/relay-sync.js";
import { closeImage } from "./ui/lightbox.js";
import { closeForos, isForosOpen } from "./ui/foros.js";
import { closeAuth, isAuthOpen } from "./ui/auth.js";
import { closeSettings, isSettingsOpen } from "./ui/settings.js";
import { acHide, isAcOpen } from "./utils/autocomplete.js";
import { ensureBanInit, setBansRefresh } from "./store/moderation.js";
import {
  toggleNotifications, closeNotifications, isNotifOpen, refreshNotifBadge,
  openSaved, closeSaved, isSavedOpen, syncFollowedNotifications
} from "./ui/activity.js";

/* el controlador de presentacion inyecta sus acciones a los componentes */
setHooks({ navTo: go, refresh: render, openProfile: showProfile, openMine: showMyProfile });

document.addEventListener("keydown", function (ev) {
  if (ev.key === "Escape") {
    if (document.querySelector(".img-backdrop")) {
      closeImage();
    } else if (isSettingsOpen()) {
      closeSettings();
    } else if (isAuthOpen()) {
      closeAuth();
    } else if (isForosOpen()) {
      closeForos();
    } else if (isSavedOpen()) {
      closeSaved();
    } else if (isNotifOpen()) {
      closeNotifications();
    } else if (session.myProfileView) {
      go(session.lastBoard);
    } else if (session.profileView) {
      go(session.profileView.boardId);
    } else if (session.currentView === "seguidos") {
      go(session.lastBoard);
    } else if (isAcOpen()) {
      acHide();
    }
  }
});

document.addEventListener("click", function (ev) {
  var el = ev.target.closest("[data-board]");
  if (el) go(el.dataset.board);
  if (ev.target.closest && ev.target.closest("#reg-link")) {
    showMyProfile();
  }
  if (!isAcOpen()) return;
  var inPop = ev.target.closest(".ac-pop");
  var inAnchor = ev.target.closest(".ac-anchor");
  if (!inPop && !inAnchor) acHide();
});

var mpBtn = document.getElementById("my-profile-btn");
if (mpBtn) {
  mpBtn.addEventListener("click", function () {
    if (session.myProfileView) {
      go(session.lastBoard);
    } else {
      showMyProfile();
    }
  });
}

var notifBtn = document.getElementById("notif-btn");
if (notifBtn) {
  notifBtn.addEventListener("click", function () { toggleNotifications(); });
}
var inicioBtn = document.getElementById("inicio-seguidos-btn");
if (inicioBtn) {
  inicioBtn.addEventListener("click", function () { go("seguidos"); });
}
var savedBtn = document.getElementById("saved-btn");
if (savedBtn) {
  savedBtn.addEventListener("click", function () { openSaved(); });
}

/* cierra la ventana de notificaciones al hacer click fuera de ella */
document.addEventListener("click", function (ev) {
  if (!isNotifOpen()) return;
  if (ev.target.closest && !ev.target.closest(".notif-pop") && !ev.target.closest("#notif-btn")) {
    closeNotifications();
  }
});

/* los posts anonimos expiran a los 10 minutos. Solo re-renderiza si de verdad
   cambio algo: así la lectura no se interrumpe cada minuto. */
setInterval(function () {
  var removed = purgeExpired();
  syncFollowedNotifications();
  refreshNotifBadge();
  if (session.currentView) {
    if (removed) {
      render();
    } else if (session.currentView !== "home" && session.currentView !== "seguidos" &&
               !session.profileView && !session.myProfileView) {
      var bid = session.currentView;
      /* la suscripcion en vivo ya trae posts nuevos: solo sondeamos de respaldo
         por si la conexion a los relays se cayo sin deteccion */
      if (!isWatchingBoard(bid)) {
        syncBoard(bid, function (changed) { if (changed && session.currentView === bid) render(); });
      }
    }
  }
}, 60000);

/* precarga nostr-tools desde el CDN en segundo plano para que registrar/
   publicar no tarde (la primera vez era donde se veia el "Generando claves...") */
warmNostr();

/* moderacion: al aplicar una lista de baneos (o baneos nuevos del admin),
   se purgan los posts guardados y se re-renderiza la vista actual */
setBansRefresh(render);
ensureBanInit();

renderNav();
refreshChip();
refreshNotifBadge();
render();