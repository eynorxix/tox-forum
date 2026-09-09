/* ===== barra superior: navegacion por foros y chip de identidad ===== */
import { BOARDS } from "../config.js";
import { getMe, isAnon, isRegistered } from "../store/db.js";
import { session } from "../store/session.js";

export function renderNav() {
  var nav = document.getElementById("board-nav");
  nav.innerHTML = "";
  /* "Inicio" y "Notif" son botones fijos del HTML (`#nav-home`, `#notif-btn`);
     aqui solo se marca la pestaña activa segun la vista actual. */
  var home = document.getElementById("nav-home");
  if (home) home.classList.toggle("active", session.currentView === "home" && !session.myProfileView);
  var notif = document.getElementById("notif-btn");
  if (notif) notif.classList.toggle("active", session.currentView === "notificaciones");
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