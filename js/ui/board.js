/* ===== tablero: listado de hilos, posteo y respuestas ===== */
import { BOARDS } from "../config.js";
import { getBoard, nextNo, save, isAnon, meName, getMe, purgeExpired, canPostBoard } from "../store/db.js";
import { voteHashtags } from "../domain/voting.js";
import { bindTagAC } from "../utils/autocomplete.js";
import { linksInText, fmtDate } from "../utils/text.js";
import { fileToDataURL } from "../utils/dom.js";
import { uploadImage } from "../utils/blossom.js";
import { RELAYS } from "../utils/relays.js";
import { publishUserBoard } from "../utils/relay-sync.js";
import { toast } from "../utils/dom.js";
import { makeUniverseViewer } from "../domain/universe.js";
import { openImage } from "./lightbox.js";
import { refresh } from "./appshell.js";
import { likeButton } from "./activity.js";
import { isBanned } from "../store/moderation.js";

/* sube una imagen: prefiere Blossom (persiste en la red); si falla, usa
   dataURL local como respaldo para que el post funcione igual. */
function handleImageUpload(file, onDone, onErr) {
  uploadImage(file, null).then(onDone).catch(function () {
    try { fileToDataURL(file, onDone); } catch (e) { onErr(); }
  });
}

/* informa al usuario cuantos relays confirmaron el post (0 = solo local) */
function reportPublish(ok) {
  if (ok >= RELAYS.length / 2) {
    toast("Publicado en " + ok + "/" + RELAYS.length + " relays");
  } else if (ok > 0) {
    toast("Solo " + ok + "/" + RELAYS.length + " relays recibieron el post", "warn");
  } else {
    toast("Sin conexion a relays: el post quedo solo en este navegador y se reintentara solo", "err");
  }
}

export function renderBoard(id) {
  purgeExpired();
  var b = BOARDS.find(function (x) { return x.id === id; });
  var threads = getBoard(id);

  var wrap = document.createElement("div");

  var header = document.createElement("div");
  header.className = "board-header";
  var h = document.createElement("h2");
  h.innerHTML = "/" + id + "/ <span>- " + b.name + "</span>";
  var desc = document.createElement("p");
  desc.textContent = b.desc + " — Escribe tu publicacion abajo.";
  header.appendChild(h);
  header.appendChild(desc);
  wrap.appendChild(header);

  if (id === "d") wrap.appendChild(makeUniverseViewer());

  wrap.appendChild(makePostForm(id));

  /* autores baneados: no se muestran (moderacion del admin) */
  var visible = threads.filter(function (th) {
    return !(th.ownerType === "user" && isBanned(th.ownerPub));
  });

  visible.slice().reverse().forEach(function (thread) {
    wrap.appendChild(renderThread(id, thread));
  });

  var foot = document.createElement("div");
  foot.className = "board-foot";
  foot.textContent = visible.length === 0
    ? "Este tablero esta vacio — se el primero en publicar."
    : visible.length + " hilo(s) en /" + id + "/.";
  wrap.appendChild(foot);

  return wrap;
}

function makePostForm(boardId) {
  var anon = isAnon();
  var form = document.createElement("form");
  form.className = "post-form";

  /* para publicar hay que estar registrado/logueado: los anonimos solo leen. */
  if (anon) {
    var blocked = document.createElement("p");
    blocked.className = "notice";
    blocked.innerHTML = 'Para publicar reg&iacute;strate o inicia sesi&oacute;n. <a href="#" id="reg-link">Crear cuenta / entrar</a>.';
    form.appendChild(blocked);
    return form;
  }

  var tbl = document.createElement("table");
  var rows = [
    ["Archivo", '<input type="file" name="file" accept="image/*">'],
    ["Comentario", '<textarea name="comment" placeholder="Escribe tu publicacion..." required></textarea>']
  ];
  rows.forEach(function (r) {
    var tr = document.createElement("tr");
    var td1 = document.createElement("td");
    td1.className = "row-title";
    var lab = document.createElement("label");
    lab.textContent = r[0];
    td1.appendChild(lab);
    var td2 = document.createElement("td");
    td2.innerHTML = r[1];
    tr.appendChild(td1);
    tr.appendChild(td2);
    tbl.appendChild(tr);
  });
  var trAct = document.createElement("tr");
  var tdAct = document.createElement("td");
  tdAct.colSpan = 2;
  tdAct.className = "form-actions";
  var btn = document.createElement("button");
  btn.type = "submit";
  btn.textContent = "Publicar hilo";
  tdAct.appendChild(btn);
  trAct.appendChild(tdAct);
  tbl.appendChild(trAct);

  form.appendChild(tbl);

  bindTagAC(form, form.querySelector('textarea[name="comment"]'), null);

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!canPostBoard(boardId)) {
      toast("Foro restringido: solo el creador puede postear aqui.", "warn");
      return;
    }
    var comment = form.elements.comment.value.trim();
    var file = form.elements.file.files[0];
    if (!comment && !file) return;
    voteHashtags(comment);

    var subBtn = form.querySelector('button[type="submit"]');
    if (subBtn) { subBtn.disabled = true; }

    var me = getMe();
    var finish = function (image) {
      var thread = {
        no: nextNo(),
        name: meName(),
        ownerType: "user",
        ownerPub: me ? me.pubHex : null,
        ownerName: me ? me.name : null,
        comment: comment,
        image: image || null,
        ts: Date.now(),
        replies: []
      };
      getBoard(boardId).push(thread);
      save();
      publishUserBoard(boardId).then(reportPublish);
      refresh();
    };

    if (file) {
      handleImageUpload(file, finish, function () {
        if (subBtn) subBtn.disabled = false;
        finish(null);
      });
    } else {
      finish(null);
    }
  });
  return form;
}

/* ---- hilo individual ---- */
function renderThread(boardId, thread) {
  var wrap = document.createElement("div");
  wrap.className = "thread";
  wrap.id = "thread-" + thread.no;

  var op = document.createElement("div");
  op.className = "post-block thread-op";
  op.appendChild(postHead(thread));

  if (thread.image) {
    var fig = document.createElement("figure");
    fig.className = "thread-image";
    var img = document.createElement("img");
    img.src = thread.image;
    img.alt = "imagen adjunta";
    img.title = "Clic para ampliar";
    img.addEventListener("click", function () { openImage(thread.image); });
    fig.appendChild(img);
    op.appendChild(fig);
  }

  var cmt = document.createElement("p");
  cmt.className = "comment";
  cmt.innerHTML = linksInText(thread.comment);
  op.appendChild(cmt);
  op.appendChild(likeButton(boardId, thread, null, null));

  wrap.appendChild(op);

  var replies = document.createElement("div");
  replies.className = "replies";
  thread.replies.forEach(function (r) {
    if (r.ownerType === "user" && isBanned(r.ownerPub)) return;
    replies.appendChild(renderReply(boardId, thread, r));
  });

  var rf = makeReplyForm(boardId, thread);
  replies.appendChild(rf);
  wrap.appendChild(replies);

  var toggle = document.createElement("button");
  toggle.className = "toggle-reply";
  toggle.textContent = "Responder";
  toggle.addEventListener("click", function () {
    var open = rf.style.display === "block";
    rf.style.display = open ? "none" : "block";
    toggle.textContent = open ? "Responder" : "Ocultar";
    if (!open) rf.querySelector("textarea").focus();
  });
  wrap.appendChild(toggle);

  return wrap;
}

function postHead(post) {
  var head = document.createElement("p");
  head.className = "post-head";
  var name = document.createElement("span");
  name.className = "name";
  name.textContent = post.name;
  var no = document.createElement("span");
  no.className = "no";
  no.textContent = " No." + post.no;
  var date = document.createElement("span");
  date.className = "date";
  date.textContent = " " + fmtDate(post.ts);
  head.appendChild(name);
  head.appendChild(no);
  head.appendChild(date);
  return head;
}

function renderReply(boardId, thread, reply) {
  var div = document.createElement("div");
  div.className = "reply";
  div.id = "reply-" + reply.no;
  if (reply.image) {
    var fig = document.createElement("figure");
    fig.className = "reply-image";
    var img = document.createElement("img");
    img.src = reply.image;
    img.alt = "";
    img.title = "Clic para ampliar";
    img.addEventListener("click", function () { openImage(reply.image); });
    fig.appendChild(img);
    div.appendChild(fig);
  }
  div.appendChild(postHead(reply));
  var cmt = document.createElement("p");
  cmt.className = "comment";
  cmt.innerHTML = linksInText(reply.comment);
  div.appendChild(cmt);
  div.appendChild(likeButton(boardId, reply, thread.no, reply.no));
  return div;
}

function makeReplyForm(boardId, thread) {
  var anon = isAnon();
  var form = document.createElement("form");
  form.className = "reply-form";
  form.style.display = "none";

  /* para responder hay que estar registrado/logueado: los anonimos solo leen. */
  if (anon) {
    var blocked = document.createElement("p");
    blocked.className = "notice";
    blocked.innerHTML = 'Para responder reg&iacute;strate o inicia sesi&oacute;n. <a href="#" id="reg-link">Crear cuenta / entrar</a>.';
    form.appendChild(blocked);
    return form;
  }

  var rImg = document.createElement("div");
  rImg.className = "row";
  var inpImg = document.createElement("input");
  inpImg.type = "file";
  inpImg.accept = "image/*";
  rImg.appendChild(inpImg);
  form.appendChild(rImg);

  var rTxt = document.createElement("div");
  rTxt.className = "row";
  var ta = document.createElement("textarea");
  ta.placeholder = "Escribe tu respuesta...";
  rTxt.appendChild(ta);

  var rAct = document.createElement("div");
  rAct.className = "row form-actions";
  var btn = document.createElement("button");
  btn.type = "submit";
  btn.textContent = "Enviar respuesta";
  rAct.appendChild(btn);

  form.appendChild(rTxt);
  form.appendChild(rAct);

  bindTagAC(form, ta, null);

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!canPostBoard(boardId)) {
      toast("Foro restringido: solo el creador puede postear aqui.", "warn");
      return;
    }
    var comment = ta.value.trim();
    var file = inpImg.files[0];
    if (!comment && !file) return;
    voteHashtags(comment);
    var subBtn = form.querySelector('button[type="submit"]');
    if (subBtn) { subBtn.disabled = true; }
    var me = getMe();
    var finish = function (image) {
      var reply = {
        no: nextNo(),
        name: meName(),
        ownerType: "user",
        ownerPub: me ? me.pubHex : null,
        ownerName: me ? me.name : null,
        comment: comment,
        image: image || null,
        ts: Date.now()
      };
      thread.replies.push(reply);
      save();
      publishUserBoard(boardId).then(reportPublish);
      refresh();
    };
    if (file) {
      handleImageUpload(file, finish, function () {
        if (subBtn) subBtn.disabled = false;
        finish(null);
      });
    } else {
      finish(null);
    }
  });
  return form;
}

/* ---- quotelinks: al hacer click va al post ---- */
export function bindQuotelinks(root) {
  var els = root.querySelectorAll(".quotelink");
  Array.prototype.forEach.call(els, function (el) {
    el.addEventListener("click", function () {
      highlightPost(el.dataset.quote);
    });
  });
}

/* resalta y lleva al hilo (o respuesta) indicado por su No. */
function highlightPost(no) {
  var el = document.getElementById("thread-" + no) || document.getElementById("reply-" + no);
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.style.boxShadow = "0 0 0 3px var(--accent)";
  setTimeout(function () { el.style.boxShadow = ""; }, 1500);
}