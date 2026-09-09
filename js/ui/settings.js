/* ===== settings del perfil: layout con secciones separadas =====
   Agrupa en un solo lugar: editar perfil, claves (nsec/npub) y foros.
   El perfil publico solo muestra avatar, nombre, descripcion, publicar y posts. */
import { getMe, save, logout, createForum, renameForum, setForumStatus, deleteForum, getCreatedForums, mySocials, setSocials } from "../store/db.js";
import { isStaff, isBanned } from "../store/moderation.js";
import { session } from "../store/session.js";
import { fileToDataURL, toast, createDropzone } from "../utils/dom.js";
import { uploadImage } from "../utils/blossom.js";
import { publishProfile } from "../utils/relays.js";
import { enqueueProfile } from "../utils/outbox.js";
import { refreshChip } from "./nav.js";
import { refresh, navTo } from "./appshell.js";

var backdrop = null;

export function isSettingsOpen() { return !!backdrop; }

export function openSettings(startTab) {
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

  /* pestanas: Perfil | Claves | Redes | Foros (Redes y Foros solo para colaboradores/admin) */
  var canCollab = !!(me && isStaff(me.pubHex) && !isBanned(me.pubHex));
  var canForos = canCollab;
  var tabs = document.createElement("div");
  tabs.className = "settings-tabs";
  var labels = [["perfil", "Editar perfil"], ["claves", "Claves"]];
  if (canCollab) labels.push(["redes", "Redes"]);
  if (canForos) labels.push(["foros", "Foros"]);
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

  var rowAv = document.createElement("div");
  rowAv.className = "settings-label-wrap";
  var labAv = document.createElement("label");
  labAv.className = "settings-label";
  labAv.textContent = "Imagen de perfil";
  rowAv.appendChild(labAv);
  var inAv = document.createElement("input");
  inAv.name = "avatar";
  var dzAv = createDropzone(inAv, {
    html: '<span class="dz-icon">&#8595;</span> Arrastra tu icono de perfil' +
      '<small>o haz clic para elegir el icono desde tu equipo</small>',
    maxWidth: "96px",
    maxHeight: "96px",
    className: "dropzone-avatar",
    onPick: function () { /* el archivo queda en inAv.files[0] al guardar */ }
  });
  rowAv.appendChild(dzAv);
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
      /* el nombre/perfil se publica a relays (kind 0) para que todos los
         usuarios vean el mismo nombre al conectarse por npub */
      publishProfile({ name: me.name, picture: me.icon || null, desc: me.desc, socials: mySocials() }).then(function (ok) {
        if (ok > 0) toast("Perfil actualizado y publicado");
        else enqueueProfile({ name: me.name, picture: me.icon || null, desc: me.desc, socials: mySocials() });
      });
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

  /* cerrar sesion directamente desde editar perfil */
  var logoutPerfil = document.createElement("div");
  logoutPerfil.className = "form-actions logout-perfil-act";
  var logoutBtnPerfil = document.createElement("button");
  logoutBtnPerfil.type = "button";
  logoutBtnPerfil.className = "btn2 logout-btn";
  logoutBtnPerfil.textContent = "Cerrar sesion";
  logoutBtnPerfil.addEventListener("click", function () {
    logout();
    closeSettings();
    refreshChip();
    navTo("home");
  });
  logoutPerfil.appendChild(logoutBtnPerfil);
  pPerfil.appendChild(logoutPerfil);

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

  /* ----- panel: redes (colaboradores: titulo + url visibles en /publico/) ----- */
  var pRedes = document.createElement("div");
  pRedes.className = "settings-panel";
  pRedes.dataset.spanel = "redes";

  var redesInfo = document.createElement("p");
  redesInfo.className = "fo-info";
  redesInfo.textContent = "Aqui agregas tus redes sociales: cada red lleva un titulo (ej: GitHub, NOSTR, Twitter) y su enlace. Se muestran en tu perfil (modulo /publico/) para que los demas usuarios puedan comunicarse contigo.";
  pRedes.appendChild(redesInfo);

  /* formulario de creacion: titulo + enlace + boton agregar */
  var redesCreateRow = document.createElement("div");
  redesCreateRow.className = "settings-create-forum";
  var redTitleIn = document.createElement("input");
  redTitleIn.type = "text";
  redTitleIn.className = "settings-input";
  redTitleIn.placeholder = "Titulo...";
  var redUrlIn = document.createElement("input");
  redUrlIn.type = "text";
  redUrlIn.className = "settings-input";
  redUrlIn.placeholder = "Enlace (https://)...";
  var redAddBtn = document.createElement("button");
  redAddBtn.type = "button";
  redAddBtn.className = "btn2 create-forum-btn";
  redAddBtn.textContent = "Agregar";
  redAddBtn.addEventListener("click", function () {
    var t = redTitleIn.value.trim();
    var u = redUrlIn.value.trim();
    if (!t || !/^https?:\/\//i.test(u)) {
      toast("Escribe un titulo y un enlace valido (https://...)", "warn");
      return;
    }
    setSocials(currentRedes().concat([{ label: t, url: u }]));
    saveRedesArch();
    redTitleIn.value = "";
    redUrlIn.value = "";
    renderRedesList();
  });
  redesCreateRow.appendChild(redTitleIn);
  redesCreateRow.appendChild(redUrlIn);
  redesCreateRow.appendChild(redAddBtn);
  pRedes.appendChild(redesCreateRow);

  /* lista de redes agregadas con edicion (igual que la lista de foros) */
  var redesWrap = document.createElement("div");
  redesWrap.className = "created-forums";
  pRedes.appendChild(redesWrap);

  var redesAct = document.createElement("div");
  redesAct.className = "form-actions";
  var redSaveBtn = document.createElement("button");
  redSaveBtn.type = "button";
  redSaveBtn.className = "btn2";
  redSaveBtn.textContent = "Guardar redes";
  redSaveBtn.addEventListener("click", function () {
    saveRedesArch();
  });
  redesAct.appendChild(redSaveBtn);
  pRedes.appendChild(redesAct);

  function saveRedesArch() {
    setSocials(currentRedes());
    save();
    refreshChip();
    refresh();
    publishProfile({ name: me.name, picture: me.icon || null, desc: me.desc, socials: mySocials() }).then(function (ok) {
      if (ok > 0) toast("Redes actualizadas y publicadas");
      else enqueueProfile({ name: me.name, picture: me.icon || null, desc: me.desc, socials: mySocials() });
    });
  }

  function currentRedes() {
    return mySocials().slice();
  }

  function renderRedesList() {
    redesWrap.innerHTML = "";
    var list = mySocials();
    if (!list.length) {
      var noR = document.createElement("p");
      noR.className = "rp-text";
      noR.textContent = "Aun no has agregado ninguna red.";
      redesWrap.appendChild(noR);
      return;
    }
    var listEl = document.createElement("div");
    listEl.className = "created-list";
    list.forEach(function (s, idx) {
      var item = document.createElement("div");
      item.className = "created-item";

      var head = document.createElement("div");
      head.className = "created-head";
      var tag = document.createElement("span");
      tag.className = "created-tag";
      tag.textContent = s.label;
      head.appendChild(tag);
      var nm = document.createElement("span");
      nm.className = "created-name";
      nm.textContent = s.url;
      head.appendChild(nm);
      item.appendChild(head);

      /* editar titulo y enlace */
      var editRow = document.createElement("div");
      editRow.className = "created-edit";
      var editTitle = document.createElement("input");
      editTitle.type = "text";
      editTitle.className = "settings-input";
      editTitle.value = s.label;
      var editUrl = document.createElement("input");
      editUrl.type = "text";
      editUrl.className = "settings-input";
      editUrl.value = s.url;
      var saveRed = document.createElement("button");
      saveRed.type = "button";
      saveRed.className = "btn2";
      saveRed.textContent = "Guardar";
      saveRed.addEventListener("click", function () {
        var t = editTitle.value.trim();
        var u = editUrl.value.trim();
        if (!t || !/^https?:\/\//i.test(u)) {
          toast("Escribe un titulo y un enlace valido (https://...)", "warn");
          return;
        }
        var arr = currentRedes();
        arr[idx] = { label: t, url: u };
        setSocials(arr);
        saveRedesArch();
      });
      editRow.appendChild(editTitle);
      editRow.appendChild(editUrl);
      editRow.appendChild(saveRed);
      item.appendChild(editRow);

      /* quitar */
      var delRed = document.createElement("button");
      delRed.type = "button";
      delRed.className = "btn2 danger";
      delRed.textContent = "Quitar";
      delRed.addEventListener("click", function () {
        setSocials(currentRedes().filter(function (_, i) { return i !== idx; }));
        saveRedesArch();
      });
      item.appendChild(delRed);

      listEl.appendChild(item);
    });
    redesWrap.appendChild(listEl);
  }
  renderRedesList();

  panels.redes = pRedes;
  win.appendChild(pRedes);

  /* ----- panel: foros (administrador de foros creados) ----- */
  var pForos = document.createElement("div");
  pForos.className = "settings-panel";
  pForos.dataset.spanel = "foros";

  var info = document.createElement("p");
  info.className = "fo-info";
  info.textContent = "Aqui administras tus foros creados: puedes crear un foro, editar su nombre, cambiar su estado (libre o restringido) o eliminarlo. Maximo 3 foros por usuario. Los foros se publican en relays para que todos los visitantes los vean.";
  pForos.appendChild(info);

  /* formulario de creacion */
  var createRow = document.createElement("div");
  createRow.className = "settings-create-forum";
  var nameIn = document.createElement("input");
  nameIn.type = "text";
  nameIn.className = "settings-input";
  nameIn.placeholder = "Nombre de tu nuevo foro...";
  var createBtn = document.createElement("button");
  createBtn.type = "button";
  createBtn.className = "btn2 create-forum-btn";
  createBtn.textContent = "Crear foro";
  createBtn.addEventListener("click", function () {
    if (!getMe()) {
      toast("Debes tener una cuenta para crear foros.", "warn");
      return;
    }
    if (!isStaff(getMe().pubHex)) {
      toast("Solo los colaboradores aprobados por el administrador pueden crear foros.", "warn");
      return;
    }
    var mine = getCreatedForums().filter(function (f) { return getMe() && f.ownerPub === getMe().pubHex; });
    if (mine.length >= 3) {
      toast("Ya tienes el maximo de 3 foros", "warn");
      return;
    }
    var name = nameIn.value.trim();
    if (!name) { toast("Escribe un nombre para el foro", "warn"); return; }
    var f = createForum(name);
    if (!f) { toast("No se pudo crear: solo los colaboradores aprobados pueden crear foros.", "err"); return; }
    nameIn.value = "";
    toast("Foro /" + f.id + "/ creado, publicado y disponible para todos");
    refreshForumList();
    refresh();
  });
  createRow.appendChild(nameIn);
  createRow.appendChild(createBtn);
  pForos.appendChild(createRow);

  /* lista de foros creados por el usuario actual con edicion */
  var createdWrap = document.createElement("div");
  createdWrap.className = "created-forums";
  pForos.appendChild(createdWrap);

  function refreshForumList() {
    createdWrap.innerHTML = "";
    var me = getMe();
    var mine = getCreatedForums().filter(function (f) { return me && f.ownerPub === me.pubHex; });
    if (!mine.length) {
      var noC = document.createElement("p");
      noC.className = "rp-text";
      noC.textContent = "Aun no has creado ningun foro.";
      createdWrap.appendChild(noC);
    } else {
      var list = document.createElement("div");
      list.className = "created-list";
      mine.forEach(function (f) {
        var item = document.createElement("div");
        item.className = "created-item";

        var head = document.createElement("div");
        head.className = "created-head";
        var tag = document.createElement("span");
        tag.className = "created-tag";
        tag.textContent = "/" + f.id + "/";
        head.appendChild(tag);
        var nm = document.createElement("span");
        nm.className = "created-name";
        nm.textContent = f.name;
        head.appendChild(nm);
        item.appendChild(head);

        /* editar nombre */
        var editRow = document.createElement("div");
        editRow.className = "created-edit";
        var editIn = document.createElement("input");
        editIn.type = "text";
        editIn.className = "settings-input";
        editIn.value = f.name;
        var saveName = document.createElement("button");
        saveName.type = "button";
        saveName.className = "btn2";
        saveName.textContent = "Guardar nombre";
        saveName.addEventListener("click", function () {
          if (renameForum(f.id, editIn.value.trim())) {
          toast("Nombre actualizado");
          refreshForumList();
          refresh();
        }
      });
      editRow.appendChild(editIn);
      editRow.appendChild(saveName);
      item.appendChild(editRow);

      /* switch estado libre/restringido */
      var stateRow = document.createElement("div");
      stateRow.className = "created-state";
      var swLab = document.createElement("label");
      swLab.className = "switch";
      var sw = document.createElement("input");
      sw.type = "checkbox";
      sw.checked = f.status === "restringido";
      var swSpan = document.createElement("span");
      swSpan.className = "slider";
      swLab.appendChild(sw);
      swLab.appendChild(swSpan);
      sw.addEventListener("change", function () {
        var st = sw.checked ? "restringido" : "libre";
        setForumStatus(f.id, st);
        stateDesc.textContent = st === "libre"
          ? "Libre: cualquier usuario puede postear dentro del foro."
          : "Restringido: solo el creador puede postear dentro del foro.";
        toast("Estado: " + (st === "libre" ? "libre" : "restringido"));
        refresh();
      });
      var stateDesc = document.createElement("span");
      stateDesc.className = "state-desc";
      stateDesc.textContent = f.status === "libre"
        ? "Libre: cualquier usuario puede postear dentro del foro."
        : "Restringido: solo el creador puede postear dentro del foro.";
      var stateVal = document.createElement("span");
      stateVal.className = "state-val";
      stateVal.textContent = "/" + f.id + "/ " + (f.status === "libre" ? "libre" : "restringido");
      stateRow.appendChild(swLab);
      stateRow.appendChild(stateDesc);
      stateRow.appendChild(stateVal);
      item.appendChild(stateRow);

      /* eliminar */
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn2 danger";
      del.textContent = "Eliminar foro";
      del.addEventListener("click", function () {
        if (!window.confirm("Eliminar el foro /" + f.id + "/ ?")) return;
        if (deleteForum(f.id)) {
          toast("Foro eliminado");
          refreshForumList();
          if (session.currentView === f.id) navTo("home");
          else refresh();
        }
      });
      item.appendChild(del);

      list.appendChild(item);
      });
      createdWrap.appendChild(list);
    }

    /* footer: responsabilidad del creador */
    var foot = document.createElement("p");
    foot.className = "created-foot";
    foot.textContent = "Los foros creados con el fin que tenga seran responsabilidad del creador.";
    createdWrap.appendChild(foot);

    /* pie de reglas libre/restringido */
    var rules = document.createElement("p");
    rules.className = "created-rules";
    rules.innerHTML = "<b>/libre/</b> los usuarios pueden postear &middot; <b>/restringido/</b> solo pueden ver pero no postear.";
    createdWrap.appendChild(rules);
  }
  if (canForos) {
    refreshForumList();
    panels.foros = pForos;
    win.appendChild(pForos);
  }

  /* cambio de pestana */
  tabs.addEventListener("click", function (ev) {
    var tab = ev.target.closest ? ev.target.closest(".settings-tab") : null;
    if (!tab) return;
    swapTab(tab.dataset.stab);
  });
  /* el grid de foros ejecuta sus propios handlers (toggle/promote); aqui solo
     re-renderizamos el grid de settings despues del cambio en db */
  win.addEventListener("click", function () {
    if (canForos && panels.foros.classList.contains("active")) setTimeout(refreshForumList, 0);
  });

  function swapTab(name) {
    (tabs.querySelectorAll(".settings-tab") || []).forEach(function (b) {
      b.classList.toggle("active", b.dataset.stab === name);
    });
    (win.querySelectorAll(".settings-panel") || []).forEach(function (p) {
      p.classList.toggle("active", p.dataset.spanel === name);
    });
  }
  swapTab(startTab && panels[startTab] ? startTab : "perfil");

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