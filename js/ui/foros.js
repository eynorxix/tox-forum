/* ===== ventana de foros: registro en foro principal + foros secundarios ===== */
import { BOARDS } from "../config.js";
import { myMainForum, myRegistered, toggleForum, promoteForum } from "../store/db.js";
import { refresh } from "./appshell.js";

var backdrop = null;
var gridWrap = null;

function statusOf(id, main, regs) {
  if (id === main) return "Principal";
  if (regs.indexOf(id) >= 0) return "Registrado";
  return "Registrarse";
}

export function buildGrid(main, regs, query) {
  var q = (query || "").toLowerCase().trim();
  var grid = document.createElement("div");
  grid.className = "fo-grid";
  BOARDS.forEach(function (b) {
    var st = statusOf(b.id, main, regs);
    var cell = document.createElement("div");
    cell.className = "fo-cell";
    if (b.id === main) cell.classList.add("main");
    else if (regs.indexOf(b.id) >= 0) cell.classList.add("reg");
    var hay = ("/" + b.id + "/ " + b.name).toLowerCase();
    if (q && hay.indexOf(q) < 0) cell.classList.add("hidden");

    var body = document.createElement("button");
    body.type = "button";
    body.className = "fo-body";
    var nm = document.createElement("span");
    nm.className = "fo-name";
    nm.textContent = "/" + b.id + "/ " + b.name;
    var stEl = document.createElement("span");
    stEl.className = "fo-status";
    stEl.textContent = st;
    body.appendChild(nm);
    body.appendChild(stEl);
    body.addEventListener("click", function () {
      toggleForum(b.id);
      rerender();
    });
    cell.appendChild(body);

    if (regs.indexOf(b.id) >= 0 && b.id !== main) {
      var promo = document.createElement("button");
      promo.type = "button";
      promo.className = "fo-promote";
      promo.textContent = "Hacer principal";
      promo.addEventListener("click", function () {
        promoteForum(b.id);
        rerender();
      });
      cell.appendChild(promo);
    }
    grid.appendChild(cell);
  });
  return grid;
}

function rerender() {
  if (!backdrop || !gridWrap) return;
  var search = backdrop.querySelector(".fo-search");
  var query = search ? search.value : "";
  var fresh = buildGrid(myMainForum(), myRegistered(), query);
  (gridWrap.children || []).slice().forEach(function (c) { c.remove(); });
  gridWrap.appendChild(fresh);
  refresh(); /* actualiza el sidebar, mi perfil y el foro al cambiar el registro */
}

export function openForos() {
  if (backdrop) return;
  backdrop = document.createElement("div");
  backdrop.className = "fo-backdrop";

  var win = document.createElement("div");
  win.className = "fo-window";

  var head = document.createElement("div");
  head.className = "fo-head";
  var t = document.createElement("h3");
  t.textContent = "Foros";
  var close = document.createElement("button");
  close.type = "button";
  close.className = "fo-close";
  close.textContent = "X";
  close.title = "Cerrar";
  head.appendChild(t);
  head.appendChild(close);
  win.appendChild(head);

  var info = document.createElement("p");
  info.className = "fo-info";
  info.textContent = "Un foro principal es donde tu perfil aparece en la lista de colaboradores. En los foros secundarios (registrados) puedes publicar igual pero no apareces en la lista.";
  win.appendChild(info);

  var search = document.createElement("input");
  search.type = "text";
  search.className = "fo-search";
  search.placeholder = "Buscar foro...";
  search.addEventListener("input", function () { rerender(); });
  win.appendChild(search);

  var wrap = document.createElement("div");
  wrap.className = "fo-grid-wrap";
  wrap.appendChild(buildGrid(myMainForum(), myRegistered(), ""));
  gridWrap = wrap;
  win.appendChild(wrap);

  close.addEventListener("click", closeForos);
  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop) closeForos();
  });

  backdrop.appendChild(win);
  document.body.appendChild(backdrop);
  search.focus();
}

export function closeForos() {
  if (!backdrop) return;
  backdrop.remove();
  backdrop = null;
  gridWrap = null;
}

export function isForosOpen() { return !!backdrop; }