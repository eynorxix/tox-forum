/* ===== punto de entrada: arranque, eventos globales y semillas ===== */
import { session } from "./store/session.js";
import { purgeExpired } from "./store/db.js";
import { setHooks } from "./ui/appshell.js";
import { go, render, showProfile, showMyProfile } from "./ui/view.js";
import { renderNav, refreshChip } from "./ui/nav.js";
import { seedDemo } from "./domain/seed.js";
import { seedCollabs } from "./store/collabs.js";
import { closeImage } from "./ui/lightbox.js";
import { closeForos, isForosOpen } from "./ui/foros.js";
import { closeAuth, isAuthOpen } from "./ui/auth.js";
import { closeSettings, isSettingsOpen } from "./ui/settings.js";
import { acHide, isAcOpen } from "./utils/autocomplete.js";
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

/* los posts anonimos expiran a los 10 minutos */
setInterval(function () {
  purgeExpired();
  syncFollowedNotifications();
  refreshNotifBadge();
  if (session.currentView) render();
}, 60000);

renderNav();
refreshChip();
refreshNotifBadge();
seedDemo();
seedCollabs();
render();