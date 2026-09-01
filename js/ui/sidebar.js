/* ===== panel lateral: lista de colaboradores (mi perfil solo en el foro principal) ===== */
import { getMe, isAnon, isCollab, myMainForum } from "../store/db.js";
import { getCollabs } from "../store/collabs.js";
import { openProfile, openMine } from "./appshell.js";

export function renderSidebar(boardId) {
  var collabs = getCollabs(boardId);
  var me = getMe();
  var inMain = !isAnon() && isCollab(boardId);
  var aside = document.createElement("aside");
  aside.className = "sidebar";
  var h = document.createElement("h3");
  h.innerHTML = 'Colaboradores <span class="collab-count">(' + (collabs.length + (inMain ? 1 : 0)) + ')</span>';
  var clip = document.createElement("div");
  clip.className = "collab-list";

  if (inMain) {
    var myItem = document.createElement("div");
    myItem.className = "collab-item";
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
    myItem.addEventListener("click", function () { openMine(); });
    clip.appendChild(myItem);
  }

  collabs.forEach(function (u) {
    var item = document.createElement("div");
    item.className = "collab-item";
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
    item.addEventListener("click", function () { openProfile(boardId, u); });
    clip.appendChild(item);
  });
  aside.appendChild(h);
  aside.appendChild(clip);
  return aside;
}