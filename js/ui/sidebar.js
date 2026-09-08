/* ===== panel lateral: dos layouts =====
   Layout 1 "Colaboradores": admin aprobados + mi perfil (si soy colab del board).
   Layout 2 "Seguidos": los usuarios que sigo (boton seguir en perfiles). */
import { getMe, isAnon, isCollab, postsByAuthor, followingList } from "../store/db.js";
import { getCollabs, fetchCollabProfile } from "../store/collabs.js";
import { openProfile, openMine } from "./appshell.js";
import { isBanned, isAdmin as isAdminRole, isCollabByAdmin } from "../store/moderation.js";

export function renderSidebar(boardId) {
  var collabs = getCollabs(boardId);
  var me = getMe();
  var inMain = !isAnon() && isCollab(boardId);
  var aside = document.createElement("aside");
  aside.className = "sidebar";

  var collabsHere = collabs.filter(function (c) {
    return !isBanned(c.pubHex);
  });

  /* ===== layout 1: colaboradores ===== */
  var h = document.createElement("h3");
  h.innerHTML = 'Colaboradores <span class="collab-count">(' + (collabsHere.length + (inMain ? 1 : 0)) + ')</span>';
  var clip = document.createElement("div");
  clip.className = "collab-list";

  if (inMain) {
    var myItem = document.createElement("div");
    myItem.className = "collab-item";
    if (isAdminRole(me.pubHex)) myItem.classList.add("collab-admin");
    else if (isCollabByAdmin(me.pubHex)) myItem.classList.add("collab-collab");
    if (me.icon) {
      var myImg = document.createElement("img");
      myImg.src = me.icon;
      myImg.alt = "";
      myItem.appendChild(myImg);
    } else {
      var myPh = document.createElement("span");
      myPh.className = "collab-ph";
      myPh.textContent = (me.name || "?").charAt(0).toUpperCase();
      myItem.appendChild(myPh);
    }
    var myNm = document.createElement("span");
    myNm.className = "collab-name";
    myNm.textContent = me.name;
    myItem.appendChild(myNm);
    if (isAdminRole(me.pubHex)) {
      var aTag = document.createElement("span");
      aTag.className = "collab-tag";
      aTag.textContent = "Admin";
      myItem.appendChild(aTag);
    }
    myItem.addEventListener("click", function () { openMine(); });
    clip.appendChild(myItem);
  }

  collabsHere.forEach(function (u) {
    var item = document.createElement("div");
    item.className = "collab-item";
    if (isAdminRole(u.pubHex)) item.classList.add("collab-admin");
    else if (isCollabByAdmin(u.pubHex)) item.classList.add("collab-collab");
    var ic;
    if (u.icon) {
      ic = document.createElement("img");
      ic.src = u.icon;
      ic.alt = "";
      ic.loading = "lazy";
    } else {
      ic = document.createElement("span");
      ic.className = "collab-ph";
      ic.textContent = (u.name || "?").charAt(0).toUpperCase();
    }
    var nm = document.createElement("span");
    nm.className = "collab-name";
    nm.textContent = u.name;
    item.appendChild(ic);
    item.appendChild(nm);
    if (isAdminRole(u.pubHex)) {
      var aTag2 = document.createElement("span");
      aTag2.className = "collab-tag";
      aTag2.textContent = "Admin";
      item.appendChild(aTag2);
    }
    item.addEventListener("click", function () {
      var posts = postsByAuthor(u.pubHex);
      var userObj = {
        pubHex: u.pubHex,
        name: u.name,
        icon: u.icon || null,
        desc: u.desc || "Colaborador de ForosRaiz.",
        posts: posts.map(function (x) { return x.post.comment; }),
        socials: u.socials || []
      };
      openProfile(boardId, userObj);
    });
    clip.appendChild(item);
  });
  aside.appendChild(h);
  aside.appendChild(clip);

  /* ===== layout 2: seguidos ===== */
  var following = followingList().filter(function (ph) { return ph && ph !== (me && me.pubHex); });
  var sec = document.createElement("div");
  sec.className = "sidebar-following";
  if (following.length) {
    var h2fol = document.createElement("h3");
    h2fol.innerHTML = 'Seguidos <span class="collab-count">(' + following.length + ')</span>';
    var folClip = document.createElement("div");
    folClip.className = "collab-list";
    sec.appendChild(h2fol);
    sec.appendChild(folClip);

    var byHex = {};
    collabsHere.forEach(function (c) { byHex[c.pubHex] = c; });

    following.forEach(function (ph) {
      var known = byHex[ph];
      var item = document.createElement("div");
      item.className = "collab-item follow-item";
      if (known) {
        var icK;
        if (known.icon) {
          icK = document.createElement("img");
          icK.src = known.icon;
          icK.alt = "";
          icK.loading = "lazy";
        } else {
          icK = document.createElement("span");
          icK.className = "collab-ph";
          icK.textContent = (known.name || "?").charAt(0).toUpperCase();
        }
        var nmK = document.createElement("span");
        nmK.className = "collab-name";
        nmK.textContent = known.name;
        item.appendChild(icK);
        item.appendChild(nmK);
        var uposts = postsByAuthor(ph);
        item.addEventListener("click", function () {
          openProfile(boardId, {
            pubHex: ph,
            name: known.name,
            icon: known.icon || null,
            desc: known.desc || "Usuario registrado de ForosRaiz.",
            posts: uposts.map(function (x) { return x.post.comment; }),
            socials: known.socials || []
          });
        });
      } else {
        resolveFollowedItem(item, ph, boardId);
      }
      folClip.appendChild(item);
    });
  } else if (!isAnon()) {
    sec.innerHTML = '<h3>Seguidos</h3><p class="rp-text">En un perfil pulsa &quot;Seguir&quot; y ese usuario aparecera aqui.</p>';
  }
  aside.appendChild(sec);
  return aside;
}

/* resuelve el perfil (nombre/avatar/desc) de un seguido desde relays y rellena
   el item del sidebar. Devuelve el item para que se pueda anexar ya con datos. */
function resolveFollowedItem(item, pubHex, boardId) {
  var phEl = document.createElement("span");
  phEl.className = "collab-ph";
  phEl.textContent = (pubHex || "?").slice(0, 1).toUpperCase();
  var nmU = document.createElement("span");
  nmU.className = "collab-name";
  nmU.textContent = "…";
  item.appendChild(phEl);
  item.appendChild(nmU);
  item.addEventListener("click", function () {
    openProfile(boardId, { pubHex: pubHex, name: nmU.textContent, icon: null, desc: null, posts: [], socials: [] });
  });
  fetchCollabProfile(pubHex).then(function (p) {
    if (p) {
      nmU.textContent = p.name || pubHex.slice(0, 8);
      if (p.picture) {
        var im = document.createElement("img");
        im.src = p.picture;
        im.alt = "";
        im.loading = "lazy";
        phEl.replaceWith(im);
      }
    }
  }).catch(function () {
    nmU.textContent = pubHex.slice(0, 8);
  });
  return item;
}