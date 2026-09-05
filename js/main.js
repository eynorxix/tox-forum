/* ===== punto de entrada: arranque, eventos globales y semillas ===== */
import { session } from "./store/session.js";
import { purgeExpired, myPosts } from "./store/db.js";
import { setHooks } from "./ui/appshell.js";
import { go, render, showProfile, showMyProfile } from "./ui/view.js";
import { renderNav, refreshChip } from "./ui/nav.js";
import { warmNostr } from "./utils/nostr-lib.js";
import { syncBoard, isWatchingBoard, syncAllBoards } from "./utils/relay-sync.js";
import { closeImage } from "./ui/lightbox.js";
import { closeForos, isForosOpen } from "./ui/foros.js";
import { closeAuth, isAuthOpen } from "./ui/auth.js";
import { closeSettings, isSettingsOpen } from "./ui/settings.js";
import { acHide, isAcOpen } from "./utils/autocomplete.js";
import { ensureBanInit, setBansRefresh } from "./store/moderation.js";
import {
  closeNotifications, isNotifOpen, refreshNotifBadge,
  closeSaved, isSavedOpen, syncFollowedNotifications, scanReplyNotifications
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
    } else if (session.currentView === "notificaciones") {
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

/* movil: boton "Foros" de la barra superior abre/cierra el drawer del panel
   derecho (foros, recomendados y secciones). Se rellena en render(). */
var mobileForosBtn = document.getElementById("mobile-foros-btn");
var mobileRap = document.getElementById("mobile-rap");
var mobileRapBackdrop = document.getElementById("mobile-rap-backdrop");
function setMobileRap(open) {
  if (!mobileRap || !mobileRapBackdrop) return;
  if (open && mobileRap.style.display !== "block") {
    render();
    refreshNotifBadge();
    mobileRap.style.display = "block";
    mobileRapBackdrop.style.display = "block";
    mobileRapBackdrop.classList.add("show");
    mobileRap.classList.add("open");
  } else if (!open && mobileRap.style.display !== "none") {
    mobileRap.style.display = "none";
    mobileRapBackdrop.style.display = "none";
    mobileRapBackdrop.classList.remove("show");
    mobileRap.classList.remove("open");
  }
}
if (mobileForosBtn) {
  mobileForosBtn.addEventListener("click", function () {
    setMobileRap(mobileRap.style.display === "none");
  });
}
if (mobileRapBackdrop) {
  mobileRapBackdrop.addEventListener("click", function () { setMobileRap(false); });
}
if (mobileRap) {
  mobileRap.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-board]") : null;
    if (el) { setMobileRap(false); }
  });
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
  var newReplies = scanReplyNotifications();
  refreshNotifBadge();

  /* sondear de respaldo los foros donde el usuario publico (para no esperar a
     que el foro este abierto para descubrir que alguien respondio) */
  var ownBoardIds = [];
  myPosts().forEach(function (p) {
    if (ownBoardIds.indexOf(p.boardId) < 0) ownBoardIds.push(p.boardId);
  });
  var currentIsBoard = !session.profileView && !session.myProfileView &&
    session.currentView !== "home" && session.currentView !== "seguidos" &&
    session.currentView !== "notificaciones";
  ownBoardIds.forEach(function (id) {
    if (currentIsBoard && id === session.currentView) {
      if (!isWatchingBoard(id)) {
        syncBoard(id, function (changed) {
          if (changed) {
            var more = scanReplyNotifications();
            refreshNotifBadge();
            if (more && session.currentView === id) render();
          }
        });
      }
      return;
    }
    syncBoard(id, function (changed) {
      if (changed) {
        var more = scanReplyNotifications();
        refreshNotifBadge();
        if (more && (session.currentView === "notificaciones" || session.currentView === "home")) render();
      }
    });
  });

  if (session.currentView) {
    if (removed || newReplies) {
      render();
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

/* sincroniza todos los foros con los posts de Nostr al arrancar, para que un
   visitante nuevo vea el historial de todos los foros (no solo el abierto).
   Si la vista actual es home/seguidos, re-renderiza para actualizar los
   conteos y el contenido que ya cargo. */
syncAllBoards(function (changed) {
  var newReplies = scanReplyNotifications();
  refreshNotifBadge();
  if ((changed || newReplies) &&
      (session.currentView === "home" || session.currentView === "seguidos" ||
       session.currentView === "notificaciones")) {
    render();
  }
});