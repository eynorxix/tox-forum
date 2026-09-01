/* ===== settings del perfil: layout con secciones separadas =====
   Agrupa en un solo lugar: editar perfil, claves (nsec/npub) y foros.
   El perfil publico solo muestra avatar, nombre, descripcion, publicar y posts. */
import { getMe, save, logout, myMainForum, myRegistered } from "../store/db.js";
import { fileToDataURL } from "../utils/dom.js";
import { uploadImage } from "../utils/blossom.js";
import { buildGrid } from "./foros.js";
import { refreshChip } from "./nav.js";
import { refresh, navTo } from "./appshell.js";

var backdrop = null;

export function isSettingsOpen() { return !!backdrop; }

export function openSettings() {
  if (backdrop) return;
  var me = getMe();
  if (!me) return;

  backdrop = document.createElement("div");
  backdrop.className = "settings-backdrop";

  var win = document.createElement("div");
  win.className = "settings-window";

  var head = document.createElement("div");
  head.className = "settings-head";
  var t = document.createElement("h3");
  t.textContent = "Configuracion";
  var close = document.createElement("button");
  close.type = "button";
  close.className = "settings-close";
  close.textContent = "X";
  close.title = "Cerrar";
  head.appendChild(t);
  head.appendChild(close);
  win.appendChild(head);

  /* pestanas: Perfil | Claves | Foros */
  var tabs = document.createElement("div");
  tabs.className = "settings-tabs";
  var labels = [["perfil", "Editar perfil"], ["claves", "Claves"], ["foros", "Foros"]];
  var panels = {};
  labels.forEach(function (L) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "settings-tab";
    b.dataset.stab = L[0];
    b.textContent = L[1];
    tabs.appendChild(b);
  });
  win.appendChild(tabs);

  /* ----- panel: editar perfil ----- */
  var pPerfil = document.createElement("div");
  pPerfil.className = "settings-panel active";
  pPerfil.dataset.spanel = "perfil";

  var rowAv = document.createElement("label");
  rowAv.className = "settings-label";
  rowAv.textContent = "Imagen de perfil";
  var inAv = document.createElement("input");
  inAv.type = "file";
  inAv.accept = "image/*";
  rowAv.appendChild(inAv);
  pPerfil.appendChild(rowAv);

  var rowNm = document.createElement("label");
  rowNm.className = "settings-label";
  rowNm.textContent = "Nombre";
  var inNm = document.createElement("input");
  inNm.type = "text";
  inNm.className = "settings-input";
  inNm.value = me.name;
  rowNm.appendChild(inNm);
  pPerfil.appendChild(rowNm);

  var rowDesc = document.createElement("label");
  rowDesc.className = "settings-label";
  rowDesc.textContent = "Descripcion";
  var inDesc = document.createElement("textarea");
  inDesc.className = "settings-input";
  inDesc.value = me.desc;
  rowDesc.appendChild(inDesc);
  pPerfil.appendChild(rowDesc);

  var act = document.createElement("div");
  act.className = "form-actions";
  var sBtn = document.createElement("button");
  sBtn.type = "button";
  sBtn.className = "btn2";
  sBtn.textContent = "Guardar cambios";
  sBtn.addEventListener("click", function () {
    var doSave = function () {
      me.name = inNm.value.trim() || "Anonimo";
      me.desc = inDesc.value.trim();
      save();
      refreshChip();
      refresh();
    };
    if (inAv.files[0]) {
      uploadImage(inAv.files[0], null).then(function (url) {
        me.icon = url;
        doSave();
      }).catch(function () {
        fileToDataURL(inAv.files[0], function (data) {
          me.icon = data;
          doSave();
        });
      });
    } else {
      doSave();
    }
  });
  act.appendChild(sBtn);
  pPerfil.appendChild(act);
  panels.perfil = pPerfil;
  win.appendChild(pPerfil);

  /* ----- panel: claves ----- */
  var pClaves = document.createElement("div");
  pClaves.className = "settings-panel";
  pClaves.dataset.spanel = "claves";

  var keysSec = document.createElement("div");
  keysSec.className = "keys-sec";
  var keysTitle = document.createElement("h4");
  keysTitle.textContent = "Mis claves (privacidad)";
  keysSec.appendChild(keysTitle);
  var nsecRow = document.createElement("div");
  nsecRow.className = "key-row";
  var nsecLab = document.createElement("span");
  nsecLab.className = "key-label";
  nsecLab.textContent = "nsec (privada, solo tu la ves):";
  var nsecVal = document.createElement("textarea");
  nsecVal.readOnly = true;
  nsecVal.className = "key-value nsec";
  nsecVal.value = me.nsec || "No disponible";
  var nsecCopy = document.createElement("button");
  nsecCopy.type = "button";
  nsecCopy.className = "btn2";
  nsecCopy.textContent = "Copiar nsec";
  nsecCopy.addEventListener("click", function () {
    nsecVal.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(nsecVal.value);
    nsecCopy.textContent = "Copiado";
    setTimeout(function () { nsecCopy.textContent = "Copiar nsec"; }, 1200);
  });
  nsecRow.appendChild(nsecLab);
  nsecRow.appendChild(nsecVal);
  nsecRow.appendChild(nsecCopy);
  keysSec.appendChild(nsecRow);
  var npubRow = document.createElement("div");
  npubRow.className = "key-row";
  var npubLab = document.createElement("span");
  npubLab.className = "key-label";
  npubLab.textContent = "npub (publica, compartela para que te sigan):";
  var npubVal = document.createElement("input");
  npubVal.readOnly = true;
  npubVal.className = "key-value";
  npubVal.value = me.npub || "";
  var npubCopy = document.createElement("button");
  npubCopy.type = "button";
  npubCopy.className = "btn2";
  npubCopy.textContent = "Copiar npub";
  npubCopy.addEventListener("click", function () {
    npubVal.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(npubVal.value);
    npubCopy.textContent = "Copiado";
    setTimeout(function () { npubCopy.textContent = "Copiar npub"; }, 1200);
  });
  npubRow.appendChild(npubLab);
  npubRow.appendChild(npubVal);
  npubRow.appendChild(npubCopy);
  keysSec.appendChild(npubRow);
  pClaves.appendChild(keysSec);

  var logoutBtn = document.createElement("button");
  logoutBtn.type = "button";
  logoutBtn.className = "btn2 logout-btn";
  logoutBtn.textContent = "Cerrar sesion";
  logoutBtn.addEventListener("click", function () {
    logout();
    closeSettings();
    refreshChip();
    navTo("home");
  });
  pClaves.appendChild(logoutBtn);
  panels.claves = pClaves;
  win.appendChild(pClaves);

  /* ----- panel: foros ----- */
  var pForos = document.createElement("div");
  pForos.className = "settings-panel";
  pForos.dataset.spanel = "foros";

  var info = document.createElement("p");
  info.className = "fo-info";
  info.textContent = "Un foro principal es donde tu perfil aparece en la lista de colaboradores. En los foros secundarios puedes publicar igual pero no apareces en la lista.";
  pForos.appendChild(info);

  var search = document.createElement("input");
  search.type = "text";
  search.className = "fo-search";
  search.placeholder = "Buscar foro...";
  pForos.appendChild(search);

  var gwrap = document.createElement("div");
  gwrap.className = "fo-grid-wrap";
  gwrap.appendChild(buildGrid(myMainForum(), myRegistered(), ""));
  pForos.appendChild(gwrap);

  function rerenderGrid() {
    if (!backdrop) return;
    var q = search.value;
    var fresh = buildGrid(myMainForum(), myRegistered(), q);
    gwrap.innerHTML = "";
    gwrap.appendChild(fresh);
    refresh();
  }
  search.addEventListener("input", rerenderGrid);
  panels.foros = pForos;
  win.appendChild(pForos);

  /* cambio de pestana */
  tabs.addEventListener("click", function (ev) {
    var tab = ev.target.closest ? ev.target.closest(".settings-tab") : null;
    if (!tab) return;
    swapTab(tab.dataset.stab);
  });
  /* el grid de foros ejecuta sus propios handlers (toggle/promote); aqui solo
     re-renderizamos el grid de settings despues del cambio en db */
  win.addEventListener("click", function () {
    if (panels.foros.classList.contains("active")) setTimeout(rerenderGrid, 0);
  });

  function swapTab(name) {
    (tabs.querySelectorAll(".settings-tab") || []).forEach(function (b) {
      b.classList.toggle("active", b.dataset.stab === name);
    });
    (win.querySelectorAll(".settings-panel") || []).forEach(function (p) {
      p.classList.toggle("active", p.dataset.spanel === name);
    });
  }
  swapTab("perfil");

  close.addEventListener("click", closeSettings);
  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop) closeSettings();
  });

  backdrop.appendChild(win);
  document.body.appendChild(backdrop);
}

export function closeSettings() {
  if (!backdrop) {
    backdrop = null;
    return;
  }
  backdrop.remove();
  backdrop = null;
}