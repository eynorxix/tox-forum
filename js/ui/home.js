/* ===== vista inicial (home) estilo 4chan =====
   Logo "ForosRaiz" grande arriba, categorias apiladas verticalmente y, dentro
   de cada categoria, los boards repartidos en 4 columnas fijas (filas
   ilimitadas). Cada celda muestra solo "/tag/ - Nombre" sin descripcion. */
import { BOARDS, CATEGORIES } from "../config.js";
import { state, getBoard, getCreatedForums } from "../store/db.js";
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
  aboutImg.src = "https://images.pexels.com/photos/38241066/pexels-photo-38241066.jpeg";
  aboutImg.alt = "ForosRaiz";
  aboutImg.loading = "eager";
  aboutImg.decoding = "async";
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

  /* ---- Recomendaciones: debajo de los foros principales, misma lista que
     "Foros Recomendados" del panel derecho (incluye foros creados por
     usuarios) pero en grande con su propio buscador ---- */
  var recom = document.createElement("section");
  recom.className = "chan-cat chan-recom";
  var recomTitle = document.createElement("h3");
  recomTitle.className = "chan-cat-title";
  recomTitle.textContent = "Recomendaciones";
  recom.appendChild(recomTitle);

  var items = [
    { id: "or", name: "Origen y Misterio" },
    { id: "gz", name: "Gamer Zone" },
    { id: "ch", name: "Cocina en Casa" },
    { id: "mo", name: "Moda Urbana" },
    { id: "ca", name: "Cafe y Radar" },
    { id: "mu", name: "Musica Independiente" },
    { id: "de", name: "Diseño y Pixel" },
    { id: "pa", name: "Paranormal" },
    { id: "ci", name: "Ciencia y Futuro" },
    { id: "an2", name: "Anime Retro" },
    { id: "fo", name: "Fotografia" },
    { id: "de2", name: "Deep Web y Ciber" },
    { id: "re", name: "Relatos y Cuentos" },
    { id: "mi", name: "Minerales y Rocas" },
    { id: "ga", name: "Gatitos" },
    { id: "ho", name: "Hogar y DIY" },
    { id: "es", name: "Espiritualidad" },
    { id: "na", name: "Naturaleza" }
  ];
  /* agrega los foros creados por los usuarios del navegador (misma fuente
     que el panel derecho "Foros Recomendados") */
  getCreatedForums().forEach(function (f) {
    if (!items.some(function (r) { return r.id === f.id; })) {
      items.push({ id: f.id, name: f.name });
    }
  });

  /* buscador que filtra la grilla de recomendaciones */
  var recomSearch = document.createElement("div");
  recomSearch.className = "home-search recom-search";
  var recomInput = document.createElement("input");
  recomInput.type = "text";
  recomInput.placeholder = "Buscar en Recomendaciones...";
  recomSearch.appendChild(recomInput);
  recom.appendChild(recomSearch);

  var recomGrid = document.createElement("div");
  recomGrid.className = "recom-grid";
  function renderRecom(q) {
    recomGrid.innerHTML = "";
    var fq = (q || "").toLowerCase().trim();
    items.forEach(function (b) {
      if (fq && ("/" + b.id + "/ " + b.name).toLowerCase().indexOf(fq) < 0) return;
      var a = document.createElement("a");
      a.dataset.board = b.id;
      a.title = b.name;
      var bel = document.createElement("b");
      bel.textContent = "/" + b.id + "/";
      var span = document.createElement("span");
      span.textContent = " " + b.name;
      a.appendChild(bel);
      a.appendChild(span);
      recomGrid.appendChild(a);
    });
  }
  recomInput.addEventListener("input", function () { renderRecom(recomInput.value); });
  renderRecom("");
  recom.appendChild(recomGrid);

  wrap.appendChild(recom);

  return wrap;
}