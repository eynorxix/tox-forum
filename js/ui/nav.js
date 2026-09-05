/* ===== barra superior: navegacion por foros y chip de identidad ===== */
import { BOARDS } from "../config.js";
import { getMe, isAnon, isRegistered, unreadCount } from "../store/db.js";
import { session } from "../store/session.js";

export function renderNav() {
  var nav = document.getElementById("board-nav");
  nav.innerHTML = "";
  var a = document.createElement("a");
  a.textContent = "[ inicio ]";
  a.dataset.board = "home";
  if (session.currentView === "home" && !session.myProfileView) a.className = "active";
  nav.appendChild(a);
  var n = document.createElement("a");
  n.textContent = "[ notif ]";
  n.title = "Notificaciones: respuestas a tus posts";
  n.dataset.board = "notificaciones";
  if (session.currentView === "notificaciones") n.className = "active";
  var badge = document.createElement("span");
  badge.className = "notif-badge-nav";
  badge.id = "notif-badge";
  badge.textContent = unreadCount();
  badge.hidden = isAnon() || unreadCount() === 0;
  n.appendChild(badge);
  nav.appendChild(n);
  // Unicamentale usuarios registrados ven sus foros (principales + secundarios);
  var listed = [];
  BOARDS.forEach(function (b) {
    if (isRegistered(b.id)) listed.push(b);
  });
  listed.forEach(function (b) {
    var link = document.createElement("a");
    link.textContent = "[" + b.id + "]";
    link.title = b.name;
    link.dataset.board = b.id;
    if (session.currentView === b.id) link.className = "active";
    nav.appendChild(link);
  });
}

export function refreshChip() {
  var btn = document.getElementById("my-profile-btn");
  if (!btn) return;
  var av = document.getElementById("mp-avatar");
  var lb = document.getElementById("mp-label");
  if (session.myProfileView) {
    if (lb) lb.textContent = "← Foro";
    if (av) {
      av.style.backgroundImage = "";
      av.className = "";
      av.textContent = "F";
    }
    return;
  }
  if (isAnon()) {
    if (lb) lb.textContent = "Registrar";
    if (av) {
      av.style.backgroundImage = "";
      av.className = "";
      av.textContent = "+";
    }
    return;
  }
  var me = getMe();
  if (lb) lb.textContent = me.name || "Mi perfil";
  if (!av) return;
  av.className = "has-avatar";
  av.textContent = "";
  if (me.icon) {
    av.style.backgroundImage = "url(" + me.icon + ")";
  } else {
    av.style.backgroundImage = "";
    av.className = "";
    av.textContent = (me.name || "?").charAt(0).toUpperCase();
  }
}