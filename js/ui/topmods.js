/* ===== layouts emergentes de la barra superior =====
   - "Foros": foros principales + foros creados por colaboradores, con un
     unico buscador para ambos.
   - "Colab": colaboradores o seguidos en grilla de 4 columnas; barra de
     tabs COLAB / SEGUIDOS; "Ver más" muestra 4 filas mas. */
import { BOARDS } from "../config.js";
import { getMe, followingList, postsByAuthor, getCreatedForums } from "../store/db.js";
import { getCollabs, fetchCollabProfile } from "../store/collabs.js";
import { session } from "../store/session.js";
import { isBanned } from "../store/moderation.js";
import { openProfile } from "./appshell.js";

var backdrop = null;

export function isTopModOpen() { return !!backdrop; }

export function closeTopMod() {
  if (backdrop) {
    backdrop.remove();
    backdrop = null;
  }
}

function shell(title) {
  backdrop = document.createElement("div");
  backdrop.className = "topmod-backdrop";
  var win = document.createElement("div");
  win.className = "topmod-win";
  var head = document.createElement("div");
  head.className = "topmod-head";
  var t = document.createElement("span");
  t.textContent = title;
  var x = document.createElement("button");
  x.type = "button";
  x.className = "topmod-close";
  x.textContent = "X";
  x.addEventListener("click", closeTopMod);
  head.appendChild(t);
  head.appendChild(x);
  win.appendChild(head);
  backdrop.appendChild(win);
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop) closeTopMod();
  });
  return win;
}

/* foro con el que abrir los perfiles desde el modal */
function currentBoard() {
  var v = session.currentView;
  if (v && v !== "home" && v !== "seguidos" && v !== "notificaciones" &&
      !session.profileView && !session.myProfileView) return v;
  return session.lastBoard || "d";
}

/* ============ modal FOROS ============ */
function foroLink(b, onClick) {
  var a = document.createElement("a");
  a.dataset.board = b.id;
  a.title = b.name;
  var bEl = document.createElement("b");
  bEl.textContent = "/" + b.id + "/";
  var span = document.createElement("span");
  span.textContent = " " + b.name;
  a.appendChild(bEl);
  a.appendChild(span);
  if (onClick) a.addEventListener("click", onClick);
  return a;
}

export function openForosModal() {
  closeTopMod();
  var win = shell("Foros");
  var body = document.createElement("div");
  body.className = "topmod-body";

  var search = document.createElement("input");
  search.type = "text";
  search.className = "topmod-search";
  search.placeholder = "Buscar foro...";
  body.appendChild(search);

  var primarios = BOARDS.map(function (b) { return { id: b.id, name: b.name }; });
  var creados = [];
  getCreatedForums().forEach(function (f) {
    if (!creados.some(function (r) { return r.id === f.id; })) {
      creados.push({ id: f.id, name: f.name });
    }
  });

  var layers = [
    buildForosLayer("Foros principales", primarios),
    buildForosLayer("Foros de colaboradores", creados)
  ];
  layers.forEach(function (l) { body.appendChild(l.wrap); });
  win.appendChild(body);

  search.addEventListener("input", function () {
    var q = search.value.trim().toLowerCase();
    layers.forEach(function (l) { filterLayer(l, q); });
  });
  search.focus();
}

function buildForosLayer(label, items) {
  var wrap = document.createElement("div");
  wrap.className = "topmod-layer";
  var h = document.createElement("h4");
  h.textContent = label;
  wrap.appendChild(h);
  var grid = document.createElement("div");
  grid.className = "topmod-foros";
  items.forEach(function (b) {
    grid.appendChild(foroLink(b, closeTopMod));
  });
  wrap.appendChild(grid);
  return { wrap: wrap, grid: grid, items: items };
}

function filterLayer(l, q) {
  var any = false;
  l.grid.querySelectorAll("a").forEach(function (a, i) {
    var it = l.items[i];
    var hay = ("/" + it.id + "/ " + it.name).toLowerCase();
    var keep = !q || hay.indexOf(q) >= 0;
    a.style.display = keep ? "" : "none";
    if (keep) any = true;
  });
  l.wrap.style.display = any ? "" : "none";
}

/* ============ modal COLAB ============ */
export function openColabModal() {
  closeTopMod();
  var boardId = currentBoard();
  var win = shell("Colaboradores");
  var body = document.createElement("div");
  body.className = "topmod-body";

  var tabs = document.createElement("div");
  tabs.className = "topmod-tabs";
  var bColab = mkTab("COLAB", true);
  var bSeg = mkTab("SEGUIDOS", false);
  tabs.appendChild(bColab);
  tabs.appendChild(bSeg);
  body.appendChild(tabs);

  var pane = document.createElement("div");
  pane.className = "topmod-pane";
  body.appendChild(pane);

  function switchPane(which) {
    bColab.classList.toggle("active", which === "colab");
    bSeg.classList.toggle("active", which === "seguidos");
    pane.innerHTML = "";
    if (which === "colab") renderColabs(pane, boardId);
    else renderSeguidos(pane, boardId);
  }
  bColab.addEventListener("click", function () { switchPane("colab"); });
  bSeg.addEventListener("click", function () { switchPane("seguidos"); });
  switchPane("colab");
  win.appendChild(body);
}

function mkTab(label, active) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = "topmod-tab" + (active ? " active" : "");
  b.textContent = label;
  return b;
}

function renderColabs(pane, boardId) {
  var collabs = getCollabs(boardId).filter(function (c) {
    return !isBanned(c.pubHex);
  });
  var cells = collabs.map(function (u) { return colabCell(u, boardId); });
  pane.appendChild(buildGridPane(cells, "Todavia no hay colaboradores."));
}

function renderSeguidos(pane, boardId) {
  var me = getMe();
  var following = followingList().filter(function (ph) { return ph && ph !== (me && me.pubHex); });
  if (!following.length) {
    var p = document.createElement("p");
    p.className = "rp-text";
    p.textContent = "En un perfil pulsa \"Seguir\" y ese usuario aparecera aqui.";
    pane.appendChild(p);
    return;
  }
  var collabs = getCollabs(boardId);
  var byHex = {};
  collabs.forEach(function (c) { byHex[c.pubHex] = c; });
  var cells = following.map(function (ph) {
    var known = byHex[ph];
    if (known) return colabCell(known, boardId);
    return followCell(ph, boardId);
  });
  pane.appendChild(buildGridPane(cells, ""));
}

function buildGridPane(cells, emptyMsg) {
  var wrap = document.createElement("div");
  if (!cells.length) {
    var p = document.createElement("p");
    p.className = "rp-text";
    p.textContent = emptyMsg;
    wrap.appendChild(p);
    return wrap;
  }
  var grid = document.createElement("div");
  grid.className = "topmod-grid";
  var more = document.createElement("button");
  more.type = "button";
  more.className = "btn2 topmod-more";
  more.textContent = "Ver mas";
  wrap.appendChild(grid);
  var shown = 0;
  const PAGE = 16; /* 4 columnas x 4 filas */
  function render() {
    var end = Math.min(cells.length, shown + PAGE);
    for (var i = shown; i < end; i++) grid.appendChild(cells[i]);
    shown = end;
    more.style.display = shown < cells.length ? "inline-block" : "none";
  }
  more.addEventListener("click", render);
  wrap.appendChild(more);
  render();
  return wrap;
}

function colabCell(u, boardId) {
  var cell = document.createElement("button");
  cell.type = "button";
  cell.className = "topmod-cell";
  var icon = document.createElement("div");
  icon.className = "topmod-ic";
  if (u.icon) {
    var im = document.createElement("img");
    im.src = u.icon;
    im.alt = "";
    im.loading = "lazy";
    icon.appendChild(im);
  } else {
    icon.classList.add("ph");
    icon.textContent = (u.name || "?").charAt(0).toUpperCase();
  }
  var nm = document.createElement("div");
  nm.className = "topmod-name";
  nm.textContent = u.name;
  cell.appendChild(icon);
  cell.appendChild(nm);
  cell.addEventListener("click", function () {
    closeTopMod();
    var posts = postsByAuthor(u.pubHex);
    openProfile(boardId, {
      pubHex: u.pubHex,
      name: u.name,
      icon: u.icon || null,
      desc: u.desc || "Colaborador de ForosRaiz.",
      posts: posts.map(function (x) { return x.post.comment; }),
      socials: u.socials || []
    });
  });
  return cell;
}

/* celda de un seguido aun no resuelto: placeholder que se completa desde relays */
function followCell(pubHex, boardId) {
  var cell = document.createElement("button");
  cell.type = "button";
  cell.className = "topmod-cell";
  var icon = document.createElement("div");
  icon.className = "topmod-ic ph";
  icon.textContent = (pubHex || "?").slice(0, 1).toUpperCase();
  var nm = document.createElement("div");
  nm.className = "topmod-name";
  nm.textContent = "…";
  cell.appendChild(icon);
  cell.appendChild(nm);
  cell.addEventListener("click", function () {
    closeTopMod();
    openProfile(boardId, {
      pubHex: pubHex,
      name: nm.textContent,
      icon: null,
      desc: null,
      posts: [],
      socials: []
    });
  });
  fetchCollabProfile(pubHex).then(function (p) {
    if (!p) return;
    nm.textContent = p.name || pubHex.slice(0, 8);
    if (p.picture) {
      var im = document.createElement("img");
      im.src = p.picture;
      im.alt = "";
      im.loading = "lazy";
      icon.textContent = "";
      icon.classList.remove("ph");
      icon.appendChild(im);
    }
  }).catch(function () {
    nm.textContent = pubHex.slice(0, 8);
  });
  return cell;
}