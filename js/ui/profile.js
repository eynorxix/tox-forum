/* ===== perfiles: vista de colaborador y mi perfil editable =====
   El perfil tiene una barra con /Publico/ y /Mis-publicaciones/:
   - /Publico/  -> lo que ve cualquier usuario: descripcion, redes sociales y
                   los foros creados por el usuario (en cuadricula).
   - /Mis-publicaciones/ -> solo el dueno (quien inicio sesion) ve sus posts. */
import { BOARDS } from "../config.js";
import { state, getBoard, nextNo, save, getMe, myPosts, myMainForum, isAnon, ownPost, isFollowing, unfollowUser, canPostBoard, forumsOf, mySocials, setSocials } from "../store/db.js";
import { session } from "../store/session.js";
import { voteHashtags } from "../domain/voting.js";
import { bindTagAC } from "../utils/autocomplete.js";
import { linksInText, fmtDate, attachAutoEmbeds } from "../utils/text.js";
import { fileToDataURL } from "../utils/dom.js";
import { uploadImage } from "../utils/blossom.js";
import { RELAYS, fetchFollowerCount } from "../utils/relays.js";
import { publishUserBoard } from "../utils/relay-sync.js";
import { toast } from "../utils/dom.js";
import { openImage } from "./lightbox.js";
import { refresh, navTo } from "./appshell.js";
import { followByPubHex } from "./activity.js";
import { openSettings } from "./settings.js";
import { openGifPicker } from "./gifpicker.js";
import { isBanned, isStaff } from "../store/moderation.js";

function socialsEl(user) {
  var socials = document.createElement("div");
  socials.className = "socials";
  (user.socials || []).forEach(function (s) {
    var label = s && (Array.isArray(s) ? s[0] : s.label);
    var url = s && (Array.isArray(s) ? s[1] : s.url);
    if (!label || !url) return;
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    socials.appendChild(a);
  });
  if (!(user.socials || []).length) {
    var hint = document.createElement("p");
    hint.className = "rp-text";
    hint.textContent = "Este usuario no ha agregado redes sociales.";
    socials.appendChild(hint);
  }
  return socials;
}

/* los foros creados por un pubkey, en cuadricula (para /publico/) */
function createdForumsGrid(pubHex) {
  var wrap = document.createElement("div");
  wrap.className = "profile-forums";
  var t = document.createElement("h4");
  t.textContent = "Foros creados";
  wrap.appendChild(t);
  var mine = forumsOf(pubHex);
  if (!mine.length) {
    var none = document.createElement("p");
    none.className = "rp-text";
    none.textContent = "Este usuario no ha creado foros.";
    wrap.appendChild(none);
    return wrap;
  }
  var grid = document.createElement("div");
  grid.className = "fo-grid";
  mine.forEach(function (f) {
    var cell = document.createElement("div");
    cell.className = "fo-cell";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fo-body";
    var nm = document.createElement("span");
    nm.className = "fo-name";
    nm.textContent = "/" + f.id + "/ " + f.name;
    var st = document.createElement("span");
    st.className = "fo-status";
    st.textContent = f.status === "restringido" ? "Restringido" : "Libre";
    btn.appendChild(nm);
    btn.appendChild(st);
    btn.addEventListener("click", function () {
      navTo(f.id);
    });
    cell.appendChild(btn);
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);
  return wrap;
}

/* modulo /publico/ del perfil: descripcion + redes + foros creados
   (el avatar del usuario se muestra arriba en el head del perfil) */
function publicoPanel(user) {
  var panel = document.createElement("div");
  panel.className = "profile-publico";

  var desc = document.createElement("p");
  desc.className = "profile-desc";
  desc.textContent = user.desc || "Sin descripcion.";
  panel.appendChild(desc);

  panel.appendChild(socialsEl(user));
  panel.appendChild(createdForumsGrid(user.pubHex));
  return panel;
}

/* modal para compartir el perfil publico de un usuario (URL #perfil/<pubHex>) */
function openShareProfile(pubHex) {
  var url = location.origin + location.pathname + "#perfil/" + pubHex;
  var box = document.createElement("div");
  box.className = "share-backdrop";
  var win = document.createElement("div");
  win.className = "share-window";
  var t = document.createElement("h3");
  t.textContent = "Compartir perfil";
  win.appendChild(t);
  var p = document.createElement("p");
  p.className = "share-info";
  p.textContent = "Este enlace muestra el perfil publico del usuario: sus redes sociales, descripcion y foros creados. Puedes compartirlo donde quieras.";
  win.appendChild(p);
  var row = document.createElement("div");
  row.className = "share-row";
  var inp = document.createElement("input");
  inp.type = "text";
  inp.className = "settings-input";
  inp.readOnly = true;
  inp.value = url;
  row.appendChild(inp);
  var copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "btn2";
  copyBtn.textContent = "Copiar";
  copyBtn.addEventListener("click", function () {
    inp.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        copyBtn.textContent = "Copiado";
        setTimeout(function () { copyBtn.textContent = "Copiar"; }, 1500);
      }).catch(function () { copyBtn.textContent = "Copiar"; });
    } else {
      copyBtn.textContent = "Copiado";
      setTimeout(function () { copyBtn.textContent = "Copiar"; }, 1500);
    }
  });
  row.appendChild(copyBtn);
  win.appendChild(row);
  var openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "btn2";
  openBtn.textContent = "Abrir en otra pestana";
  openBtn.addEventListener("click", function () {
    window.open(url, "_blank", "noopener");
  });
  win.appendChild(openBtn);
  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn2 share-close";
  closeBtn.textContent = "Cerrar";
  closeBtn.addEventListener("click", function () { box.remove(); });
  win.appendChild(closeBtn);
  box.appendChild(win);
  box.addEventListener("click", function (ev) {
    if (ev.target === box) box.remove();
  });
  document.body.appendChild(box);
}

/* boton "Compartir" del perfil: solo si el perfil tiene pubHex */
function shareButton(pubHex) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = "btn2 share-btn";
  b.textContent = "Compartir";
  b.title = "Compartir el enlace publico de este perfil";
  b.addEventListener("click", function () { openShareProfile(pubHex); });
  return b;
}

export function renderProfile(boardId, user) {
  var b = BOARDS.find(function (x) { return x.id === boardId; }) || { name: boardId };
  var wrap = document.createElement("div");
  wrap.className = "profile-view";

  var back = document.createElement("button");
  back.type = "button";
  back.className = "back-btn";
  back.textContent = "← Volver a /" + boardId + "/";
  back.addEventListener("click", function () { navTo(boardId); });
  wrap.appendChild(back);

  var banned = isBanned(user.pubHex);
  if (banned) {
    var banHead = document.createElement("div");
    banHead.className = "profile-head";
    var icon0 = document.createElement("div");
    icon0.className = "avatar-placeholder";
    icon0.textContent = "!";
    var info0 = document.createElement("div");
    var h0 = document.createElement("h3");
    h0.textContent = user.name + " (baneado)";
    var sub0 = document.createElement("p");
    sub0.className = "collab-count";
    sub0.textContent = "Este usuario ha sido baneado por el administrador.";
    info0.appendChild(h0);
    info0.appendChild(sub0);
    banHead.appendChild(icon0);
    banHead.appendChild(info0);
    wrap.appendChild(banHead);
    var notice0 = document.createElement("div");
    notice0.className = "notice";
    notice0.textContent = "Sus publicaciones estan ocultas. Sera activado cuando el administrador lo permita.";
    wrap.appendChild(notice0);
    return wrap;
  }

  var head = document.createElement("div");
  head.className = "profile-head";
  var icon;
  if (user.icon) {
    icon = document.createElement("img");
    icon.src = user.icon;
    icon.alt = user.name;
    icon.title = "Clic para ampliar";
    icon.addEventListener("click", function () { openImage(user.icon); });
  } else {
    icon = document.createElement("div");
    icon.className = "avatar-placeholder";
    icon.textContent = (user.name || "?").charAt(0).toUpperCase();
  }
  var info = document.createElement("div");
  var h3 = document.createElement("h3");
  h3.textContent = user.name;
  var sub = document.createElement("p");
  sub.className = "collab-count";
  sub.textContent = "Colaborador de /" + boardId + "/ - " + b.name;
  info.appendChild(h3);
  info.appendChild(sub);
  head.appendChild(icon);
  head.appendChild(info);

  var me = getMe();
  var isOwnPub = me && user.pubHex && user.pubHex === me.pubHex;
  var followRow = null;
  if (user.pubHex && !isOwnPub) {
    followRow = document.createElement("div");
    followRow.className = "profile-follow";
    if (user.pubHex) followRow.appendChild(shareButton(user.pubHex));
    var fbtn = document.createElement("button");
    fbtn.type = "button";
    fbtn.className = "btn2 follow-btn";
    fbtn.textContent = isFollowing(user.pubHex) ? "Dejar de seguir" : "Seguir";
    var fcounter = document.createElement("span");
    fcounter.className = "follower-count";
    fcounter.textContent = "…";
    followRow.appendChild(fcounter);
    fbtn.addEventListener("click", function () {
      if (isFollowing(user.pubHex)) {
        unfollowUser(user.pubHex);
        fbtn.textContent = "Seguir";
        updateFcount();
        refresh();
      } else {
        followByPubHex(user.pubHex, user.name);
        fbtn.textContent = "Dejar de seguir";
        updateFcount();
        refresh();
      }
    });
    var updateFcount = function () {
      fetchFollowerCount(user.pubHex).then(function (n) {
        fcounter.textContent = n + " " + (n === 1 ? "seguidor" : "seguidores");
      }).catch(function () {});
    };
    updateFcount();
    followRow.appendChild(fbtn);
  }

  wrap.appendChild(head);
  if (followRow) wrap.appendChild(followRow);

  /* los demas usuarios SOLO ven /publico/ (desc, redes, foros creados) */
  wrap.appendChild(publicoPanel(user));
  return wrap;
}

/* ---- mi perfil (editable) ---- */
function myAvatar(me) {
  if (me.icon) {
    var img = document.createElement("img");
    img.src = me.icon;
    img.alt = me.name;
    img.title = "Clic para ampliar";
    img.addEventListener("click", function () { openImage(me.icon); });
    return img;
  }
  var ph = document.createElement("div");
  ph.className = "avatar-placeholder";
  ph.textContent = (me.name || "?").charAt(0).toUpperCase();
  return ph;
}

export function renderMyProfile() {
  var me = getMe();
  var wrap = document.createElement("div");
  wrap.className = "profile-view mine";
  wrap.id = "my-profile";

  if (!me) {
    var noAcc = document.createElement("div");
    noAcc.className = "notice";
    noAcc.textContent = "Debes iniciar sesion para ver tu perfil.";
    wrap.appendChild(noAcc);
    return wrap;
  }

  var backRow = document.createElement("div");
  backRow.className = "back-row";
  var back = document.createElement("button");
  back.type = "button";
  back.className = "back-btn";
  back.textContent = "← Volver al foro";
  back.addEventListener("click", function () { navTo(session.lastBoard); });
  var settingsBtn = document.createElement("a");
  settingsBtn.className = "btn2 settings-btn";
  settingsBtn.textContent = "Configuracion";
  settingsBtn.title = "Editar perfil, claves, redes y foros";
  settingsBtn.href = "#";
  settingsBtn.addEventListener("click", function (ev) {
    ev.preventDefault();
    openSettings();
  });
  backRow.appendChild(back);
  if (me.pubHex) backRow.appendChild(shareButton(me.pubHex));
  backRow.appendChild(settingsBtn);

  var head = document.createElement("div");
  head.className = "profile-head";
  head.appendChild(myAvatar(me));
  var info = document.createElement("div");
  var h3 = document.createElement("h3");
  h3.textContent = me.name;
  var sub = document.createElement("p");
  sub.className = "collab-count";
  sub.textContent = myMainForum()
    ? "Mi perfil · Colaborador de /" + myMainForum() + "/"
    : "Mi perfil";
  info.appendChild(h3);
  info.appendChild(sub);
  var folMe = document.createElement("p");
  folMe.className = "follower-count";
  folMe.textContent = "… seguidores";
  info.appendChild(folMe);
  fetchFollowerCount(me.pubHex).then(function (n) {
    folMe.textContent = n + " " + (n === 1 ? "seguidor" : "seguidores");
  }).catch(function () {});
  head.appendChild(info);

  if (isBanned(me.pubHex)) {
    var banMine = document.createElement("div");
    banMine.className = "notice";
    banMine.textContent = "Tu cuenta ha sido baneada por el administrador: tus publicaciones estan ocultas. Sera activada cuando el administrador lo permita.";
    wrap.appendChild(banMine);
  }

  wrap.appendChild(backRow);
  wrap.appendChild(head);

  /* ---- barra /Publico/ | /Mis-publicaciones/ (las publicaciones solo las ve el dueno) ---- */
  var tabs = document.createElement("div");
  tabs.className = "profile-tabs";
  var tabPub = document.createElement("button");
  tabPub.type = "button";
  tabPub.className = "profile-tab";
  tabPub.textContent = "/Publico/";
  var tabMine = document.createElement("button");
  tabMine.type = "button";
  tabMine.className = "profile-tab";
  tabMine.textContent = "/Mis-publicaciones/";
  tabs.appendChild(tabPub);
  tabs.appendChild(tabMine);

  var pPub = document.createElement("div");
  pPub.className = "profile-tabpanel active";
  var pMine = document.createElement("div");
  pMine.className = "profile-tabpanel";

  /* --- /Publico/: desc, redes (titulo+url) y foros creados, todo lo que ven los demas --- */
  var publico = publicoPanel({
    pubHex: me.pubHex,
    name: me.name,
    desc: me.desc,
    socials: mySocials()
  });
  pPub.appendChild(publico);
  var editRedes = document.createElement("button");
  editRedes.type = "button";
  editRedes.className = "btn2";
  editRedes.textContent = "Editar redes sociales";
  editRedes.addEventListener("click", function () {
    openSettings(isStaff(me.pubHex) && !isBanned(me.pubHex) ? "redes" : undefined);
  });
  pPub.appendChild(editRedes);

  /* --- /Mis-publicaciones/: publicar y listar mis posts (privado) --- */
  var dest = myMainForum() || "d";
  var qWrap = document.createElement("div");
  qWrap.className = "my-quick";
  var qTa = document.createElement("textarea");
  qTa.placeholder = "Escribe una publicacion: se creara en /" + dest + "/.";
  var qImg = document.createElement("input");
  qImg.type = "file";
  qImg.accept = "image/*";
  var qAct = document.createElement("div");
  qAct.className = "form-actions";
  var qGif = document.createElement("button");
  qGif.type = "button";
  qGif.className = "gif-btn";
  qGif.textContent = "Gifs";
  qGif.title = "Buscar y agregar GIFs como stickers";
  qGif.addEventListener("click", function () {
    openGifPicker(qTa);
  });
  qAct.appendChild(qGif);
  var qBtn = document.createElement("button");
  qBtn.type = "button";
  qBtn.textContent = "Publicar desde mi perfil";
  qAct.appendChild(qBtn);
  qWrap.appendChild(qTa);
  qWrap.appendChild(qImg);
  qWrap.appendChild(qAct);
  bindTagAC(qWrap, qTa, null);
  qBtn.addEventListener("click", function () {
    if (!canPostBoard(dest)) {
      toast("Foro restringido: solo el creador puede postear aqui.", "warn");
      return;
    }
    if (isBanned(getMe().pubHex)) {
      toast("Tu cuenta esta baneada: no puedes publicar.", "err");
      return;
    }
    var qtext = qTa.value.trim();
    var qfile = qImg.files ? qImg.files[0] : null;
    if (!qtext && !qfile) return;
    voteHashtags(qtext);
    var finishQ = function (image) {
      var thr = {
        no: nextNo(),
        name: me.name,
        ownerType: "user",
        ownerPub: me.pubHex,
        ownerName: me.name,
        comment: qtext,
        image: image || null,
        ts: Date.now(),
        replies: []
      };
      getBoard(dest).push(thr);
      save();
      publishUserBoard(dest).then(function (ok) {
        if (ok >= RELAYS.length / 2) toast("Publicado en /" + dest + "/ (" + ok + "/" + RELAYS.length + " relays)");
        else toast("Sin conexion a relays: el post quedo solo local", "err");
      });
      refresh();
    };
    if (qfile) {
      uploadImage(qfile, null).then(finishQ).catch(function () {
        try { fileToDataURL(qfile, finishQ); } catch (e) { finishQ(null); }
      });
    } else {
      finishQ(null);
    }
  });
  pMine.appendChild(qWrap);

  var postsSec = document.createElement("div");
  postsSec.className = "my-posts";
  var pt = document.createElement("h4");
  pt.textContent = "Mis publicaciones";
  postsSec.appendChild(pt);
  var items = myPosts();
  if (items.length === 0) {
    var empty = document.createElement("p");
    empty.className = "rp-text";
    empty.textContent = "Todavia no has publicado nada. Publica un hilo en cualquier foro y aparecera aqui, dirigido a /d/.";
    postsSec.appendChild(empty);
  } else {
    items.forEach(function (item) {
      var div = document.createElement("div");
      div.className = "my-post";
      var headp = document.createElement("div");
      headp.className = "my-post-head";
      var badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "/" + item.boardId + "/";
      var kind = document.createElement("span");
      kind.className = "kind";
      kind.textContent = item.type === "thread" ? "Hilo #" + item.post.no : "Respuesta #" + item.post.no + " a #" + item.threadNo;
      headp.appendChild(badge);
      headp.appendChild(kind);
      var date = document.createElement("span");
      date.className = "date";
      date.textContent = " " + fmtDate(item.post.ts);
      headp.appendChild(date);
      div.appendChild(headp);
      if (item.post.image) {
        var mfig = document.createElement("figure");
        mfig.className = "my-post-image";
        var mimg = document.createElement("img");
        mimg.src = item.post.image;
        mimg.alt = "imagen adjunta";
        mimg.title = "Clic para ampliar";
        mimg.addEventListener("click", function () { openImage(item.post.image); });
        mfig.appendChild(mimg);
        div.appendChild(mfig);
      }
      var body = document.createElement("div");
      body.className = "my-post-body";
      body.innerHTML = linksInText(item.post.comment);
      div.appendChild(body);
      attachAutoEmbeds(div);
      var del = document.createElement("button");
      del.type = "button";
      del.textContent = "Eliminar";
      del.className = "del-post";
      del.addEventListener("click", function () {
        deleteOwnPost(item);
      });
      div.appendChild(del);
      postsSec.appendChild(div);
    });
  }
  pMine.appendChild(postsSec);

  wrap.appendChild(tabs);
  wrap.appendChild(pPub);
  wrap.appendChild(pMine);

  function swap(which) {
    tabPub.classList.toggle("active", which === "pub");
    tabMine.classList.toggle("active", which === "mine");
    pPub.classList.toggle("active", which === "pub");
    pMine.classList.toggle("active", which === "mine");
  }
  tabPub.addEventListener("click", function () { swap("pub"); });
  tabMine.addEventListener("click", function () { swap("mine"); });
  swap("pub");

  return wrap;
}

function deleteOwnPost(item) {
  if (!ownPost(item.post)) return;
  if (item.type === "reply") {
    var th0 = getBoard(item.boardId).find(function (t) { return t.no === item.threadNo; });
    if (th0) th0.replies = th0.replies.filter(function (r) { return r.no !== item.post.no; });
  } else {
    state.boards[item.boardId] = state.boards[item.boardId].filter(function (t) { return t.no !== item.post.no; });
  }
  save();
  refresh();
}