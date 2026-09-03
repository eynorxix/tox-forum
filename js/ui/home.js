/* ===== vista inicial (home) estilo 4chan =====
   Logo "ForosRaiz" grande arriba, categorias apiladas verticalmente y, dentro
   de cada categoria, los boards repartidos en 4 columnas fijas (filas
   ilimitadas). Cada celda muestra solo "/tag/ - Nombre" sin descripcion. */
import { BOARDS, CATEGORIES } from "../config.js";
import { state, getBoard } from "../store/db.js";
import { openProfile } from "./appshell.js";
import { isBanned } from "../store/moderation.js";

export function renderHome() {
  var wrap = document.createElement("div");
  wrap.className = "home chan-home";

  /* logo grande tipo 4chan */
  var logo = document.createElement("div");
  logo.className = "chan-logo";
  logo.textContent = "ForosRaiz";
  wrap.appendChild(logo);

  /* buscador tipo navegador: foros o usuarios */
  var searchWrap = document.createElement("div");
  searchWrap.className = "home-search";
  var search = document.createElement("input");
  search.type = "text";
  search.placeholder = "Buscar foro o usuario...";
  var results = document.createElement("div");
  results.className = "search-results";
  search.addEventListener("input", function () {
    var q = search.value.trim().toLowerCase();
    results.innerHTML = "";
    if (!q) return;
    BOARDS.forEach(function (b) {
      if (("/" + b.id + "/ " + b.name).toLowerCase().indexOf(q) >= 0) {
        var row = document.createElement("a");
        row.dataset.board = b.id;
        row.className = "sr-forum";
        row.textContent = "/" + b.id + "/ - " + b.name;
        results.appendChild(row);
      }
    });
    Object.keys(state.users || {}).forEach(function (pubHex) {
      var u = state.users[pubHex];
      if (!u) return;
      if (isBanned(u.pubHex)) return;
      var hay = ((u.name || "") + " " + (u.npub || "")).toLowerCase();
      if (hay.indexOf(q) >= 0) {
        var row = document.createElement("div");
        row.className = "sr-user";
        var nm = document.createElement("span");
        nm.className = "collab-name";
        nm.textContent = u.name;
        row.appendChild(nm);
        row.addEventListener("click", function () { openUser(u); });
        results.appendChild(row);
      }
    });
  });
  searchWrap.appendChild(search);
  searchWrap.appendChild(results);
  wrap.appendChild(searchWrap);

  function openUser(u) {
    var posts = [];
    BOARDS.forEach(function (b) {
      getBoard(b.id).forEach(function (th) {
        if (th.ownerType === "user" && th.ownerPub === u.pubHex) posts.push(th.comment);
      });
    });
    var boardId = "g";
    openProfile(boardId, {
      name: u.name,
      icon: u.icon || null,
      desc: "Usuario registrado de ForosRaiz.",
      pubHex: u.pubHex,
      posts: posts
    });
  }

  /* indice de foros por categoria */
  CATEGORIES.forEach(function (cat) {
    var section = document.createElement("section");
    section.className = "chan-cat";
    var title = document.createElement("h3");
    title.className = "chan-cat-title";
    title.textContent = cat;
    section.appendChild(title);

    var grid = document.createElement("ul");
    grid.className = "cat-grid";
    (BOARDS.filter(function (b) { return b.cat === cat; })).forEach(function (b) {
      var li = document.createElement("li");
      li.className = "cat-item";
      var nThreads = getBoard(b.id).length;
      var a = document.createElement("a");
      a.dataset.board = b.id;
      a.title = b.desc;
      a.innerHTML = "<b>/" + b.id + "/</b> - " + b.name +
        (nThreads ? " <small>(" + nThreads + ")</small>" : "");
      li.appendChild(a);
      grid.appendChild(li);
    });
    section.appendChild(grid);
    wrap.appendChild(section);
  });

  return wrap;
}