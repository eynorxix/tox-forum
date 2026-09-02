/* ===== perfiles: vista de colaborador y mi perfil editable ===== */
import { BOARDS } from "../config.js";
import { state, getBoard, nextNo, save, getMe, myPosts, myMainForum, isAnon, ownPost, isFollowing, unfollowUser } from "../store/db.js";
import { session } from "../store/session.js";
import { voteHashtags } from "../domain/voting.js";
import { bindTagAC } from "../utils/autocomplete.js";
import { linksInText, fmtDate } from "../utils/text.js";
import { fileToDataURL } from "../utils/dom.js";
import { uploadImage } from "../utils/blossom.js";
import { publishPost, RELAYS } from "../utils/relays.js";
import { toast } from "../utils/dom.js";
import { openImage } from "./lightbox.js";
import { refresh, navTo } from "./appshell.js";
import { followByPubHex } from "./activity.js";
import { openSettings } from "./settings.js";

export function renderProfile(boardId, user) {
  var b = BOARDS.find(function (x) { return x.id === boardId; }) || { name: boardId };
  var wrap = document.createElement("div");
  wrap.className = "profile-view";

  var back = document.createElement("button");
  back.type = "button";
  back.className = "back-btn";
  back.textContent = "← Volver a /" + boardId + "/";
  back.addEventListener("click", function () { navTo(boardId); });

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
    var fbtn = document.createElement("button");
    fbtn.type = "button";
    fbtn.className = "btn2 follow-btn";
    fbtn.textContent = isFollowing(user.pubHex) ? "Dejar de seguir" : "Seguir";
    fbtn.addEventListener("click", function () {
      if (isFollowing(user.pubHex)) {
        unfollowUser(user.pubHex);
        fbtn.textContent = "Seguir";
      } else {
        followByPubHex(user.pubHex, user.name);
        fbtn.textContent = "Dejar de seguir";
      }
    });
    followRow.appendChild(fbtn);
  }

  var desc = document.createElement("p");
  desc.className = "profile-desc";
  desc.textContent = user.desc;

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

  var postsSec = document.createElement("div");
  postsSec.className = "profile-posts";
  var title = document.createElement("h4");
  title.textContent = "Publicaciones en /" + boardId + "/";
  postsSec.appendChild(title);
  user.posts.forEach(function (p) {
    var div = document.createElement("div");
    div.className = "profile-post";
    div.innerHTML = linksInText(p);
    postsSec.appendChild(div);
  });

  wrap.appendChild(back);
  wrap.appendChild(head);
  if (followRow) wrap.appendChild(followRow);
  wrap.appendChild(desc);
  wrap.appendChild(socials);
  wrap.appendChild(postsSec);
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
  var settingsBtn = document.createElement("button");
  settingsBtn.type = "button";
  settingsBtn.className = "btn2 settings-btn";
  settingsBtn.textContent = "Configuracion";
  settingsBtn.title = "Editar perfil, claves y foros";
  settingsBtn.addEventListener("click", function () { openSettings(); });
  backRow.appendChild(back);
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
  head.appendChild(info);

  var desc = document.createElement("p");
  desc.className = "profile-desc";
  desc.textContent = me.desc;

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
  var qBtn = document.createElement("button");
  qBtn.type = "button";
  qBtn.textContent = "Publicar desde mi perfil";
  qAct.appendChild(qBtn);
  qWrap.appendChild(qTa);
  qWrap.appendChild(qImg);
  qWrap.appendChild(qAct);
  bindTagAC(qWrap, qTa, null);
  qBtn.addEventListener("click", function () {
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
      publishPost({ board: dest, no: thr.no, content: qtext, image: image || null }).then(function (ok) {
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

  wrap.appendChild(backRow);
  wrap.appendChild(head);
  wrap.appendChild(desc);
  wrap.appendChild(qWrap);
  wrap.appendChild(postsSec);

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