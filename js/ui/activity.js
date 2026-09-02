/* ===== actividad: inicio (seguidos), notificaciones y foros guardados ===== */
import { BOARDS } from "../config.js";
import {
  isAnon, getMe, state, getBoard, save,
  followingList, unfollowUser, isFollowing,
  notifications, markNotifsRead, clearNotifications, addNotification, unreadCount,
  savedForums, toggleSavedForum, isSaved,
  postsByAuthor, isLiked, toggleLike
} from "../store/db.js";
import { session } from "../store/session.js";
import { linksInText, fmtDate } from "../utils/text.js";
import { openImage } from "./lightbox.js";
import { openProfile } from "./appshell.js";
import { isBanned } from "../store/moderation.js";

/* ---------- Inicio (seguidos) ---------- */
export function renderFollowingFeed() {
  var wrap = document.createElement("div");
  wrap.className = "following-feed";
  wrap.id = "following-feed";

  var back = document.createElement("button");
  back.type = "button";
  back.className = "back-btn";
  back.textContent = "← Volver";
  if (session.lastBoard) back.dataset.board = session.lastBoard;
  wrap.appendChild(back);

  var title = document.createElement("div");
  title.className = "board-header";
  var h = document.createElement("h2");
  h.innerHTML = "Inicio <span>- publicaciones de tus seguidos</span>";
  title.appendChild(h);
  wrap.appendChild(title);

  if (isAnon()) {
    var notice = document.createElement("div");
    notice.className = "notice";
    notice.innerHTML = 'Para ver el Inicio (seguidos) necesitas una cuenta. <a href="#" id="reg-link">Reg&iacute;strate</a> y sigue a otros usuarios.';
    wrap.appendChild(notice);
    return wrap;
  }

  var me = getMe();
  var followers = followingList();

  if (followers.length === 0) {
    var empty = document.createElement("div");
    empty.className = "notice";
    empty.innerHTML = "Aun no sigues a nadie. Sigue a otros usuarios desde sus perfiles para ver sus publicaciones aqui (y las notificaciones de sus posts).";
    wrap.appendChild(empty);

    var suggest = document.createElement("div");
    suggest.className = "feed-suggest";
    var st = document.createElement("h4");
    st.textContent = "Usuarios del sitio";
    suggest.appendChild(st);
    objectUsers().forEach(function (u) {
      suggest.appendChild(makeUserRow(u));
    });
    wrap.appendChild(suggest);
    return wrap;
  }

  var meHex = me ? me.pubHex : null;
  var items = [];
  BOARDS.forEach(function (b) {
    var board = getBoard(b.id);
    board.forEach(function (th) {
      if (th.ownerType === "user" && followers.indexOf(th.ownerPub) >= 0 && !isBanned(th.ownerPub)) {
        items.push({ b: b, th: th, post: th, type: "thread" });
      }
      th.replies.forEach(function (r) {
        if (r.ownerType === "user" && followers.indexOf(r.ownerPub) >= 0 && !isBanned(r.ownerPub)) {
          items.push({ b: b, th: th, post: r, type: "reply" });
        }
      });
    });
  });
  items.sort(function (x, y) { return y.post.ts - x.post.ts; });

  if (items.length === 0) {
    var none = document.createElement("div");
    none.className = "notice";
    none.textContent = "Nadie a quien sigues ha publicado todavia. Los posts apareceran aqui (y en tus notificaciones) cuando lo hagan.";
    wrap.appendChild(none);
    return wrap;
  }

  var list = document.createElement("div");
  list.className = "feed-list";
  items.forEach(function (item) {
    var it = document.createElement("article");
    it.className = "feed-item";
    var head = document.createElement("div");
    head.className = "feed-head";
    var author = document.createElement("span");
    author.className = "feed-author";
    author.textContent = item.post.name;
    if (item.post.ownerType === "user" && item.post.ownerPub && item.post.ownerPub !== meHex) {
      author.title = "Ver perfil";
      author.style.cursor = "pointer";
      author.addEventListener("click", function () { openUser(item.post.ownerPub); });
    }
    head.appendChild(author);
    var forum = document.createElement("a");
    forum.className = "feed-forum";
    forum.dataset.board = item.b.id;
    forum.textContent = "/" + item.b.id + "/";
    forum.title = item.b.name;
    head.appendChild(forum);
    var kind = document.createElement("span");
    kind.className = "feed-kind";
    kind.textContent = item.type === "thread" ? "Hilo #" + item.post.no : "Respuesta a #" + item.th.no;
    head.appendChild(kind);
    var date = document.createElement("span");
    date.className = "date";
    date.textContent = " " + fmtDate(item.post.ts);
    head.appendChild(date);
    it.appendChild(head);

    if (item.post.image) {
      var fig = document.createElement("figure");
      fig.className = "feed-image";
      var img = document.createElement("img");
      img.src = item.post.image;
      img.alt = "";
      img.title = "Clic para ampliar";
      img.addEventListener("click", function () { openImage(item.post.image); });
      fig.appendChild(img);
      it.appendChild(fig);
    }
    var body = document.createElement("p");
    body.className = "comment";
    body.innerHTML = linksInText(item.post.comment);
    it.appendChild(body);
    it.appendChild(makeLikeBtn(item.b.id, item.post, item.type === "reply" ? item.th.no : null, item.type === "reply" ? item.post.no : null));
    list.appendChild(it);
  });
  wrap.appendChild(list);
  return wrap;
}

function objectUsers() {
  var out = [];
  Object.keys(state.users || {}).forEach(function (pubHex) {
    var u = state.users[pubHex];
    if (isBanned(pubHex)) return;
    if (u.pubHex && isFollowing(u.pubHex)) return;
    out.push(u);
  });
  return out;
}

function makeUserRow(u) {
  var row = document.createElement("div");
  row.className = "user-row";
  var nm = document.createElement("span");
  nm.className = "collab-name";
  nm.textContent = u.name;
  row.appendChild(nm);
  var fol = document.createElement("button");
  fol.type = "button";
  fol.className = "btn2 follow-btn";
  fol.textContent = isFollowing(u.pubHex) ? "Dejar de seguir" : "Seguir";
  fol.addEventListener("click", function () {
    if (isFollowing(u.pubHex)) {
      unfollowUser(u.pubHex);
    } else {
      follow(u);
    }
    row.remove();
    refreshFeed();
  });
  row.appendChild(fol);
  return row;
}

function follow(u) {
  var me = getMe();
  if (!me) return;
  if (u.pubHex === me.pubHex) return;
  if (!isFollowing(u.pubHex)) {
    state.following.push(u.pubHex);
    save();
    addNotification("Empezaste a seguir a " + u.name + ".");
    markNotifsRead();
  }
  syncFollowedNotifications();
}

export function followByPubHex(pubHex, displayName) {
  var me = getMe();
  if (!me || !pubHex || pubHex === me.pubHex) return false;
  if (!isFollowing(pubHex)) {
    state.following.push(pubHex);
    save();
    addNotification("Empezaste a seguir a " + (displayName || pubHex.slice(0, 6)) + ".");
    markNotifsRead();
    return true;
  }
  return false;
}

function meNameFor(pubHex) {
  var u = state.users && state.users[pubHex];
  if (u) return u.name;
  var found = postsByAuthor(pubHex)[0];
  return found ? found.post.name : pubHex.slice(0, 6);
}

function makeLikeBtn(boardId, post, threadNo, replyNo) {
  var el = document.createElement("button");
  el.type = "button";
  el.className = "like-btn";
  var key = threadNo != null && replyNo != null ? boardId + "/" + threadNo + "/" + replyNo : boardId + "/" + post.no;
  el.dataset.like = key;
  var liked = isLiked(boardId, threadNo != null ? threadNo : post.no, replyNo);
  el.classList.toggle("liked", liked);
  el.textContent = (liked ? "Me gusta" : "Like") + ((post.likes || 0) ? " (" + post.likes + ")" : "");
  el.addEventListener("click", function () {
    toggleLike(boardId, threadNo != null ? threadNo : post.no, replyNo);
    var nowLiked = isLiked(boardId, threadNo != null ? threadNo : post.no, replyNo);
    el.classList.toggle("liked", nowLiked);
    el.textContent = (nowLiked ? "Me gusta" : "Like") + ((post.likes || 0) ? " (" + post.likes + ")" : "");
  });
  return el;
}
export function likeButton(boardId, post, threadNo, replyNo) {
  return makeLikeBtn(boardId, post, threadNo, replyNo);
}

function openUser(pubHex) {
  var u = state.users && state.users[pubHex];
  var posts = postsByAuthor(pubHex);
  var boardId = posts.length ? posts[0].boardId : (session.lastBoard || "g");
  var user = u || {
    name: meNameFor(pubHex),
    icon: null,
    desc: "Usuario registrado de ForosRaiz.",
    pubHex: pubHex,
    posts: []
  };
  if (!u) user.posts = posts.map(function (p) { return p.post.comment; });
  openProfile(boardId, user);
}

function refreshFeed() {
  var host = document.getElementById("following-feed");
  if (host) {
    var wrapper = document.createElement("div");
    wrapper.appendChild(renderFollowingFeed());
    host.replaceWith(wrapper.firstChild);
  }
}

/* ---------- notificaciones ---------- */
var notifPop = null;

/* detecta posts nuevos de usuarios seguidos y genera notificaciones.
   Se llama desde el intervalo de 60s y despues de seguir. */
export function syncFollowedNotifications() {
  if (isAnon()) return;
  if (!state.followNotifTs) state.followNotifTs = {};
  var changed = false;
  followingList().forEach(function (pubHex) {
    if (isBanned(pubHex)) return;
    var last = state.followNotifTs[pubHex] || 0;
    var latest = last;
    var b = null;
    postsByAuthor(pubHex).forEach(function (item) {
      if (item.post.ts > last) {
        if (item.post.ts > latest) latest = item.post.ts;
        if (!b) {
          var bb = BOARDS.find(function (x) { return x.id === item.boardId; });
          b = item.boardId + (bb ? " - " + bb.name : "");
        }
      }
    });
    if (latest > last) {
      state.followNotifTs[pubHex] = latest;
      var nm = meNameFor(pubHex);
      addNotification(nm + " acaba de hacer un post en /" + b + ".");
      changed = true;
    }
  });
  if (changed) {
    markNotifsRead();
    save();
    refreshNotifBadge();
  }
}

export function refreshNotifBadge() {
  var badge = document.getElementById("notif-badge");
  if (!badge) return;
  var n = isAnon() ? 0 : (unreadCount());
  badge.hidden = n === 0;
  badge.textContent = n;
}

export function toggleNotifications() {
  if (notifPop) { closeNotifications(); return; }
  markNotifsRead();
  refreshNotifBadge();
  notifPop = document.createElement("div");
  notifPop.className = "notif-pop";
  var h3 = document.createElement("h3");
  h3.textContent = "Notificaciones";
  notifPop.appendChild(h3);
  var list = notifications();
  if (list.length === 0) {
    var p = document.createElement("p");
    p.className = "rp-text";
    p.textContent = "Sin notificaciones por ahora.";
    notifPop.appendChild(p);
  } else {
    var ul = document.createElement("ul");
    ul.className = "notif-list";
    list.forEach(function (x) {
      var li = document.createElement("li");
      li.className = "notif-item";
      li.textContent = x.text;
      var d = document.createElement("span");
      d.className = "date";
      d.textContent = " " + fmtDate(x.ts);
      li.appendChild(d);
      ul.appendChild(li);
    });
    notifPop.appendChild(ul);
    var clear = document.createElement("button");
    clear.type = "button";
    clear.className = "btn2 notif-clear";
    clear.textContent = "Borrar todas";
    clear.addEventListener("click", function () {
      clearNotifications();
      closeNotifications();
      refreshNotifBadge();
    });
    notifPop.appendChild(clear);
  }
  notifPop.style.top = "8px";
  notifPop.style.right = "12px";
  document.body.appendChild(notifPop);
}

export function closeNotifications() {
  if (notifPop) {
    notifPop.remove();
    notifPop = null;
  }
}

export function isNotifOpen() { return !!notifPop; }

/* ---------- foros guardados ---------- */
var savedBackdrop = null;

function savedGrid(main) {
  var grid = document.createElement("div");
  grid.className = "fo-grid";
  BOARDS.forEach(function (b) {
    var cell = document.createElement("div");
    cell.className = "fo-cell";
    if (isSaved(b.id)) cell.classList.add("saved");
    var body = document.createElement("button");
    body.type = "button";
    body.className = "fo-body";
    var nm = document.createElement("span");
    nm.className = "fo-name";
    nm.textContent = "/" + b.id + "/ " + b.name;
    var st = document.createElement("span");
    st.className = "fo-status";
    st.textContent = isSaved(b.id) ? "Guardado" : "Guardar";
    body.appendChild(nm);
    body.appendChild(st);
    body.addEventListener("click", function () {
      toggleSavedForum(b.id);
      var host = document.getElementById("saved-grid-wrap");
      if (host) {
        var fresh = savedGrid(isAnon());
        host.replaceWith(fresh);
        fresh.id = "saved-grid-wrap";
      }
    });
    cell.appendChild(body);
    grid.appendChild(cell);
  });
  grid.id = "saved-grid-wrap";
  return grid;
}

export function openSaved() {
  if (savedBackdrop) return;
  savedBackdrop = document.createElement("div");
  savedBackdrop.className = "fo-backdrop";
  var win = document.createElement("div");
  win.className = "fo-window";
  var head = document.createElement("div");
  head.className = "fo-head";
  var t = document.createElement("h3");
  t.textContent = "Foros guardados";
  var close = document.createElement("button");
  close.type = "button";
  close.className = "fo-close";
  close.textContent = "X";
  close.addEventListener("click", closeSaved);
  head.appendChild(t);
  head.appendChild(close);
  win.appendChild(head);
  var info = document.createElement("p");
  info.className = "fo-info";
  info.textContent = "Guarda los foros que quieras tener a mano. Tu lista se muestra en este modulo y acorta los muchos foros a solo los que te interesan.";
  win.appendChild(info);
  win.appendChild(savedGrid(isAnon()));
  savedBackdrop.addEventListener("click", function (ev) {
    if (ev.target === savedBackdrop) closeSaved();
  });
  savedBackdrop.appendChild(win);
  document.body.appendChild(savedBackdrop);
}

export function closeSaved() {
  if (savedBackdrop) {
    savedBackdrop.remove();
    savedBackdrop = null;
  }
}

export function isSavedOpen() { return !!savedBackdrop; }