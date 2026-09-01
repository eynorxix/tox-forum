/* ===== vista inicial (home) ===== */
import { BOARDS } from "../config.js";
import { state, getBoard } from "../store/db.js";
import { openProfile } from "./appshell.js";

export function renderHome() {
  var wrap = document.createElement("div");
  wrap.className = "home";

  var intro = document.createElement("div");
  intro.className = "home-intro";
  var h = document.createElement("h2");
  h.textContent = "Bienvenido a ForosRaiz";
  var p = document.createElement("p");
  p.textContent = "Un imageboard minimalista. Los usuarios anónimos solo pueden ver y responder lo justo; para publicar texto e imagen debes registrarte.";
  intro.appendChild(h);
  intro.appendChild(p);
  wrap.appendChild(intro);

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
      var qq = q;
      var hay = ((u.name || "") + " " + (u.npub || "")).toLowerCase();
      if (hay.indexOf(qq) >= 0) {
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

  var stats = document.createElement("div");
  stats.className = "notice";
  stats.textContent =
    "Ahora mismo hay " + state.counter + " hilos y posts publicados en total.";
  wrap.appendChild(stats);

  var list = document.createElement("ol");
  list.className = "board-list";
  BOARDS.forEach(function (b) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.dataset.board = b.id;
    var nThreads = getBoard(b.id).length;
    var bEl = document.createElement("b");
    bEl.textContent = "/" + b.id + "/ - " + b.name;
    var small = document.createElement("small");
    small.innerHTML = " &mdash; " + b.desc + " (" + nThreads + " hilos)";
    a.appendChild(bEl);
    a.appendChild(small);
    li.appendChild(a);
    list.appendChild(li);
  });
  wrap.appendChild(list);
  return wrap;
}