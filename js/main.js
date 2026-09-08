/* ===== punto de entrada: arranque, eventos globales y semillas ===== */
import { session, parseProfileHash } from "./store/session.js";
import { purgeExpired, myPosts } from "./store/db.js";
import { setHooks } from "./ui/appshell.js";
import { go, render, showProfile, showMyProfile, openProfileByPubHex } from "./ui/view.js";
import { renderNav, refreshChip } from "./ui/nav.js";
import { warmNostr } from "./utils/nostr-lib.js";
import { syncBoard, isWatchingBoard, syncAllBoards } from "./utils/relay-sync.js";
import { closeImage } from "./ui/lightbox.js";
import { closeForos, isForosOpen } from "./ui/foros.js";
import { closeAuth, isAuthOpen } from "./ui/auth.js";
import { closeSettings, isSettingsOpen } from "./ui/settings.js";
import { acHide, isAcOpen } from "./utils/autocomplete.js";
import { closeGifPicker, isGifPickerOpen } from "./ui/gifpicker.js";
import { ensureBanInit, setBansRefresh } from "./store/moderation.js";
import { setCollabsLoaded } from "./store/collabs.js";
import { mergeRemoteForums } from "./store/db.js";
import { fetchForums } from "./utils/relays.js";
import { BOARDS } from "./config.js";
import {
  closeNotifications, isNotifOpen, refreshNotifBadge,
  closeSaved, isSavedOpen, syncFollowedNotifications, scanReplyNotifications
} from "./ui/activity.js";

/* el controlador de presentacion inyecta sus acciones a los componentes */
setHooks({ navTo: go, refresh: render, openProfile: showProfile, openMine: showMyProfile });

document.addEventListener("keydown", function (ev) {
  if (ev.key === "Escape") {
    if (isGifPickerOpen()) {
      closeGifPicker();
    } else if (document.querySelector(".img-backdrop")) {
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

/* movil: botones "Colab" (panel izquierdo) y "Foros" (panel derecho) abren y
   cierran sus drawers. Cada drawer se rellena en render(). Abrir uno cierra
   el otro. */
function bindMobileDrawer(btnId, drawerId, backdropId, otherDrawerId) {
  var btn = document.getElementById(btnId);
  var drawer = document.getElementById(drawerId);
  var backdrop = document.getElementById(backdropId);
  var other = document.getElementById(otherDrawerId);
  if (!btn || !drawer || !backdrop) return;

  function setOpen(open) {
    var isOpen = drawer.style.display === "block";
    if (open && !isOpen) {
      if (other && other.style.display === "block") {
        var otherBack = document.getElementById(otherDrawerId === "mobile-rap" ? "mobile-rap-backdrop" : "mobile-colab-backdrop");
        other.style.display = "none";
        if (otherBack) { otherBack.style.display = "none"; otherBack.classList.remove("show"); }
      }
      render();
      drawer.style.display = "block";
      backdrop.style.display = "block";
      backdrop.classList.add("show");
      drawer.classList.add("open");
    } else if (!open && isOpen) {
      drawer.style.display = "none";
      backdrop.style.display = "none";
      backdrop.classList.remove("show");
      drawer.classList.remove("open");
    }
  }

  btn.addEventListener("click", function () {
    setOpen(drawer.style.display !== "block");
  });
  backdrop.addEventListener("click", function () { setOpen(false); });
  drawer.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-board]") : null;
    if (el) setOpen(false);
  });
}

bindMobileDrawer("mobile-colab-btn", "mobile-colab", "mobile-colab-backdrop", "mobile-rap");
bindMobileDrawer("mobile-foros-btn", "mobile-rap", "mobile-rap-backdrop", "mobile-colab");

/* al navegar a una seccion distinta se cierran los drawers del movil */
document.addEventListener("click", function (ev) {
  var nav = ev.target.closest ? ev.target.closest("[data-board], #notif-btn, .my-profile-chip, #nav-home") : null;
  if (!nav) return;
  var colab = document.getElementById("mobile-colab");
  var rap = document.getElementById("mobile-rap");
  if (colab && colab.style.display === "block") {
    colab.style.display = "none";
    var cBack = document.getElementById("mobile-colab-backdrop");
    if (cBack) { cBack.style.display = "none"; cBack.classList.remove("show"); }
  }
  if (rap && rap.style.display === "block") {
    rap.style.display = "none";
    var rBack = document.getElementById("mobile-rap-backdrop");
    if (rBack) { rBack.style.display = "none"; rBack.classList.remove("show"); }
  }
});

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

/* cuando llegan los perfiles (avatar/nombre) de los colaboradores aprobados
   por el admin, se re-renderiza el sidebar para mostrarlos */
setCollabsLoaded(render);

/* foros creados por colaboradores (kind 13371): se traen de los relays para
   que TODOS los visitantes (aunque sea ventana privada) los vean en
   "Foros Recomendados" y en la navegacion. Si llegan nuevos, re-renderiza. */
fetchForums().then(function (list) {
  if (!list || !list.length) return;
  var before = BOARDS.length;
  mergeRemoteForums(list);
  if (BOARDS.length !== before) {
    render();
    refreshChip();
  }
}).catch(function () {});

renderNav();
refreshChip();
refreshNotifBadge();
render();

/* URL publico de perfil: #perfil/<pubHex> (por ejemplo al compartir tu perfil).
   Si la pagina se abre con ese hash (o cambia de hash), se muestra el perfil
   publico de ese usuario en vez de la vista por defecto. */
function routeProfileHash() {
  var hex = parseProfileHash(location.hash);
  if (hex) openProfileByPubHex(hex);
}
window.addEventListener("hashchange", routeProfileHash);
routeProfileHash();

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