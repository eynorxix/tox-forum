/* ===== panel derecho: foros rapidos + foros recomendados + secciones =====
   - Layout 1 "Foros": nombres completos en 4 columnas, fijo (no retractil),
     con scroll interno y buscador + autocompletar.
   - Layout 2 "Foros Recomendados": mismo estilo, limite de 4 filas, con scroll
     y buscador + autocompletar. Incluye foros creados por los usuarios.
   - Layout 3 "Secciones": retractil (Redes, Donar, Colaborar). */
import { BLOG_ASSETS, BOARDS } from "../config.js";
import { getCreatedForums } from "../store/db.js";

function copyText(text, btn) {
  function done() {
    var old = btn.textContent;
    btn.textContent = "Copiado";
    setTimeout(function () { btn.textContent = old; }, 1200);
  }
  function fallback() {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function () { fallback(); done(); });
  } else {
    fallback();
    done();
  }
}

function makeCryptoCard(name, qrFile, addr) {
  var card = document.createElement("div");
  card.className = "crypto-card";
  var nm = document.createElement("div");
  nm.className = "crypto-name";
  nm.textContent = name;
  var qa = document.createElement("a");
  qa.href = BLOG_ASSETS + qrFile;
  qa.target = "_blank";
  var qr = document.createElement("img");
  qr.className = "crypto-qr";
  qr.src = BLOG_ASSETS + qrFile;
  qr.alt = "QR " + name;
  var qrDone = false;
  qr.addEventListener("error", function () {
    if (qrDone) return;
    qrDone = true;
    qr.style.display = "none";
    var note = document.createElement("p");
    note.className = "rp-text";
    note.textContent = "(QR no disponible)\n" + name;
    card.insertBefore(note, qa);
  });
  var addrInput = document.createElement("input");
  addrInput.type = "text";
  addrInput.className = "crypto-addr";
  addrInput.value = addr;
  addrInput.readOnly = true;
  var copy = document.createElement("button");
  copy.type = "button";
  copy.className = "btn2";
  copy.textContent = "Copiar dirección";
  copy.addEventListener("click", function () { copyText(addr, copy); });
  var down = document.createElement("a");
  down.className = "qr-download";
  down.href = BLOG_ASSETS + qrFile;
  down.download = "QR_" + name;
  down.textContent = "Descargar QR";
  qa.appendChild(qr);
  card.appendChild(nm);
  card.appendChild(qa);
  card.appendChild(addrInput);
  card.appendChild(copy);
  card.appendChild(down);
  return card;
}

/* construye un layout fijo (no retractil) que lista foros en 4 columnas con
   scroll interno, con buscador + autocompletar. items = [{id, name}].
   limitFilas: si es >0, el grid se recorta a ese numero de filas (4 cols). */
function buildForosLayout(label, items, limitFilas) {
  var lay = document.createElement("section");
  lay.className = "rp-section rp-fixed";

  var head = document.createElement("div");
  head.className = "rp-head";
  head.textContent = label;
  lay.appendChild(head);

  var body = document.createElement("div");
  body.className = "rp-fixed-body open";

  /* buscador + autocompletar */
  var searchWrap = document.createElement("div");
  searchWrap.className = "rp-srch";
  var input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Buscar foro... (Tab autocompleta)";
  var acList = document.createElement("div");
  acList.className = "rp-ac";
  searchWrap.appendChild(input);
  searchWrap.appendChild(acList);
  body.appendChild(searchWrap);

  var grid = document.createElement("div");
  grid.className = "rp-grid" + (limitFilas ? " rp-grid-limit" : "");
  if (limitFilas) grid.style.setProperty("--rows", String(limitFilas));

  function renderGrid(query) {
    grid.innerHTML = "";
    var q = (query || "").toLowerCase().trim();
    items.forEach(function (b) {
      if (q && ("/" + b.id + "/ " + b.name).toLowerCase().indexOf(q) < 0) return;
      var a = document.createElement("a");
      a.dataset.board = b.id;
      a.title = b.name;
      var bEl = document.createElement("b");
      bEl.textContent = "/" + b.id + "/";
      var span = document.createElement("span");
      span.textContent = " " + b.name;
      a.appendChild(bEl);
      a.appendChild(span);
      grid.appendChild(a);
    });
  }

  /* autocompletar con Tab y navegacion por flechas */
  function doAc() {
    var q = input.value.toLowerCase().trim();
    if (!q) { acList.innerHTML = ""; return; }
    acList.innerHTML = "";
    var found = items.filter(function (b) {
      return ("/" + b.id + "/ " + b.name).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 11);
    found.forEach(function (b) {
      var row = document.createElement("a");
      row.textContent = "/" + b.id + "/ " + b.name;
      row.addEventListener("click", function () {
        goBoard(b.id);
        input.value = "";
        doAc();
      });
      acList.appendChild(row);
    });
    if (acList.firstChild) acList.firstChild.classList.add("rp-ac-sel");
  }
  function moveAc(delta) {
    var rows = acList.querySelectorAll("a");
    if (!rows.length) return;
    var idx = 0, i;
    for (i = 0; i < rows.length; i++) if (rows[i].classList.contains("rp-ac-sel")) idx = i;
    rows[idx].classList.remove("rp-ac-sel");
    idx = (idx + delta + rows.length) % rows.length;
    rows[idx].classList.add("rp-ac-sel");
    rows[idx].scrollIntoView({ block: "nearest" });
  }
  function acceptAc() {
    var sel = acList.querySelector(".rp-ac-sel");
    if (!sel) return false;
    input.value = sel.textContent;
    acList.innerHTML = "";
    return true;
  }
  function goBoard(id) {
    var el = document.createElement("a");
    el.dataset.board = id;
    document.body.appendChild(el);
    el.click();
    el.remove();
  }
  input.addEventListener("input", function () { renderGrid(input.value); doAc(); });
  input.addEventListener("keydown", function (ev) {
    if (ev.key === "Tab") {
      if (acceptAc()) { ev.preventDefault(); renderGrid(""); }
    } else if (ev.key === "ArrowDown") { ev.preventDefault(); moveAc(1); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); moveAc(-1); }
    else if (ev.key === "Enter") {
      var sel = acList.querySelector(".rp-ac-sel");
      if (sel) { acceptAc(); renderGrid(""); }
    }
  });
  input.addEventListener("blur", function () {
    setTimeout(function () { acList.innerHTML = ""; }, 150);
  });

  renderGrid("");
  body.appendChild(grid);
  lay.appendChild(body);
  return lay;
}

export function renderRightPanel() {
  var rp = document.createElement("aside");
  rp.className = "rightpanel";

  function mkLayout(label, openDefault) {
    var lay = document.createElement("section");
    lay.className = "rp-section";
    var head = document.createElement("button");
    head.type = "button";
    head.className = "rp-sec-head";
    head.textContent = label;
    var body = document.createElement("div");
    body.className = "rp-sec-body";
    if (openDefault) body.classList.add("open");
    head.addEventListener("click", function () {
      body.classList.toggle("open");
      lay.classList.toggle("open", body.classList.contains("open"));
    });
    lay.appendChild(head);
    lay.appendChild(body);
    return { lay: lay, body: body };
  }

  /* ---- 1) foros (nombres completos, 4 col, no retractil, scroll) ---- */
  var forosItems = BOARDS.map(function (b) { return { id: b.id, name: b.name }; });
  var layForos = buildForosLayout("Foros", forosItems, 0);

  /* ---- 2) foros recomendados (4 col, no retractil, limite 4 filas, scroll) ---- */
  var recItems = [
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
  /* agrega los foros creados por los usuarios del navegador */
  getCreatedForums().forEach(function (f) {
    if (!recItems.some(function (r) { return r.id === f.id; })) {
      recItems.push({ id: f.id, name: f.name });
    }
  });
  var layRec = buildForosLayout("Foros Recomendados", recItems, 4);

  /* ---- 3) secciones retractiles (Redes, Donar, Colaborar) ---- */
  var layRedes = mkLayout("Redes", false);
  var pRedes = layRedes.body;
  var t1 = document.createElement("p");
  t1.className = "rp-text";
  t1.textContent = "Sigueme en mis redes para seguir mis proyectos y novedades:";
  pRedes.appendChild(t1);
  var soc = document.createElement("div");
  soc.className = "rp-social";
  var links = [
    ["X", "https://x.com/eynor_xix"],
    ["Reddit", "https://www.reddit.com/u/eynorxix/s/oZCR0PIqin"],
    ["Blog (Nostr)", "https://eynorxix.github.io/Blog/?u=npub1zdy6e00hkvpus0wwt4zhghp22cax9zf2xye6ghklhqc4mr2lnxvqkz7f0"]
  ];
  links.forEach(function (l) {
    var a = document.createElement("a");
    a.href = l[1];
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = l[0];
    soc.appendChild(a);
  });
  pRedes.appendChild(soc);

  var layDonar = mkLayout("Donar", false);
  var pDonar = layDonar.body;
  var t2 = document.createElement("p");
  t2.className = "rp-text";
  t2.textContent = "Demo: tu soporte ayuda a mantener estos proyectos vivos.";
  pDonar.appendChild(t2);
  pDonar.appendChild(makeCryptoCard("Polygon (MATIC)", "qr-polygon.jpg", "0x6bDb191A11B247fDCCFFD66fe6092969Ab549378"));
  pDonar.appendChild(makeCryptoCard("Bitcoin (BTC)", "qr-bitcoin.jpg", "bc1q67aw0uuw2s4zq2cyp97qpnpf8zhusyvr5dzm2w"));

  var layCol = mkLayout("Colaborar", false);
  var pCol = layCol.body;
  var t3 = document.createElement("p");
  t3.className = "rp-text";
  t3.textContent = "Obten tu perfil de colaborador en este foro:";
  pCol.appendChild(t3);
  var rules = document.createElement("ul");
  rules.className = "rp-rules";
  var r1 = document.createElement("li");
  r1.textContent = "Si creas contenido y tienes una red social activa con minimo 1500 seguidores, tienes un pase gratis mientras anuncies esta pagina del foro y obtienes tu perfil de colaborador.";
  var r2 = document.createElement("li");
  r2.textContent = "Si no tienes cuenta de creador ni seguidores para promocionar, puedes aportar una donacion minima de 1.5 USD para tener tu perfil de colaborador.";
  rules.appendChild(r1);
  rules.appendChild(r2);
  pCol.appendChild(rules);
  var contact = document.createElement("a");
  contact.className = "colab-contact";
  contact.href = "https://x.com/eynor_xix";
  contact.target = "_blank";
  contact.rel = "noopener";
  contact.textContent = "Mas informacion y contacto";
  pCol.appendChild(contact);

  rp.appendChild(layForos);
  rp.appendChild(layRec);
  rp.appendChild(layRedes.lay);
  rp.appendChild(layDonar.lay);
  rp.appendChild(layCol.lay);
  return rp;
}