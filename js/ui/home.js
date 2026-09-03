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

  /* presentacion: que es ForosRaiz y sus reglas (texto + imagen al lado derecho) */
  var about = document.createElement("div");
  about.className = "chan-about";
  var aboutBody = document.createElement("div");
  aboutBody.className = "chan-about-body";
  var aboutText = document.createElement("div");
  aboutText.className = "chan-about-textcol";
  var aboutT = document.createElement("div");
  aboutT.className = "chan-about-title";
  aboutT.textContent = "ForosRaiz";
  aboutText.appendChild(aboutT);
  var aboutP = document.createElement("p");
  aboutP.className = "chan-about-text";
  aboutP.innerHTML =
    "ForosRaiz es una red de <b>canales de foro cifrados</b> y descentralizados sobre <b>Nostr</b>. " +
    "No se recopilan datos de usuario ni se te rastrea: no hay cuentas obligatorias, no hay nube ni servidor central " +
    "sino relays neutrales donde tu mensaje es solo un evento cifrado y tuyo. Aqu&iacute; el <b>libre albedr&iacute;o</b> es esencial: " +
    "toda opini&oacute;n est&aacute; permitida, cada post responde a tu propia voluntad y tu identidad es una clave que s&oacute;lo t&uacute; posees.";
  aboutText.appendChild(aboutP);
  var aboutList = document.createElement("ul");
  aboutList.className = "chan-about-list";
  [
    "Todo foro y todo tema est\u00e1 permitido mientras no da\u00f1e a otro ser humano.",
    "La opini\u00f3n, por dura o inc\u00f3moda que sea, siempre es bienvenida; el ataque personal a una persona, jam\u00e1s.",
    "Lo \u00fanico prohibido es el acoso y los ataques contra personas."
  ].forEach(function (line) {
    var li = document.createElement("li");
    li.textContent = line;
    aboutList.appendChild(li);
  });
  aboutText.appendChild(aboutList);
  aboutBody.appendChild(aboutText);
  var aboutImg = document.createElement("img");
  aboutImg.className = "chan-about-img";
  aboutImg.src = "assets/forosraiz-logo.png";
  aboutImg.alt = "ForosRaiz";
  aboutBody.appendChild(aboutImg);
  about.appendChild(aboutBody);
  wrap.appendChild(about);

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