/* ===== panel derecho: secciones retractiles (Redes, Donar, Colaborar) ===== */
import { BLOG_ASSETS } from "../config.js";

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

export function renderRightPanel() {
  var rp = document.createElement("aside");
  rp.className = "rightpanel";

  var title = document.createElement("h3");
  title.className = "rp-title";
  title.textContent = "Secciones";

  function mkSection(label, openDefault) {
    var sec = document.createElement("section");
    sec.className = "rp-section";
    var head = document.createElement("button");
    head.type = "button";
    head.className = "rp-sec-head";
    head.textContent = label;
    var body = document.createElement("div");
    body.className = "rp-sec-body";
    if (openDefault) body.classList.add("open");
    head.addEventListener("click", function () {
      body.classList.toggle("open");
      sec.classList.toggle("open", body.classList.contains("open"));
    });
    sec.appendChild(head);
    sec.appendChild(body);
    return { sec: sec, body: body };
  }

  // Redes
  var mRedes = mkSection("Redes", false);
  var secRedes = mRedes.sec;
  var pRedes = mRedes.body;
  var t1 = document.createElement("p");
  t1.className = "rp-text";
  t1.textContent = "Sigueme en mis redes para seguir mis proyectos y novedades:";
  pRedes.appendChild(t1);
  var soc = document.createElement("div");
  soc.className = "rp-social";
  var links = [
    ["X", "https://x.com/eynor_xix"],
    ["Reddit", "https://www.reddit.com/u/eynorxix/s/oZCR0PIqin"],
    ["Blog (Nostr)", "https://eynorxix.github.io/Blog/?u=npub1zdy6e00hkvpus0wwt4zhghp22cax9zf2xye6ghklhqc4mr2lnxvqkz7f0s"]
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

  // Donar
  var mDonar = mkSection("Donar", false);
  var secDonar = mDonar.sec;
  var pDonar = mDonar.body;
  var t2 = document.createElement("p");
  t2.className = "rp-text";
  t2.textContent = "Demo: tu soporte ayuda a mantener estos proyectos vivos.";
  pDonar.appendChild(t2);
  pDonar.appendChild(makeCryptoCard("Polygon (MATIC)", "qr-polygon.jpg", "0x6bDb191A11B247fDCCFFD66fe6092969Ab549378"));
  pDonar.appendChild(makeCryptoCard("Bitcoin (BTC)", "qr-bitcoin.jpg", "bc1q67aw0uuw2s4zq2cyp97qpnpf8zhusyvr5dzm2w"));

  // Colaborar
  var mCol = mkSection("Colaborar", false);
  var secCol = mCol.sec;
  var pCol = mCol.body;
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

  rp.appendChild(title);
  rp.appendChild(secRedes);
  rp.appendChild(secDonar);
  rp.appendChild(secCol);
  return rp;
}