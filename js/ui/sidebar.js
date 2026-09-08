/* ===== panel lateral: lista de colaboradores (admin aprobados + mi perfil) ===== */
import { getMe, isAnon, isCollab, postsByAuthor } from "../store/db.js";
import { getCollabs } from "../store/collabs.js";
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
        desc: "Colaborador de ForosRaiz.",
        posts: posts.map(function (x) { return x.post.comment; }),
        socials: []
      };
      openProfile(boardId, userObj);
    });
    clip.appendChild(item);
  });
  aside.appendChild(h);
  aside.appendChild(clip);
  return aside;
}