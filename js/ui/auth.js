/* ===== autenticacion: registro y login de usuarios (modales) ===== */
import { registerUser, login, logout } from "../store/db.js";
import { generateKeys } from "../utils/nostr.js";
import { publishProfile } from "../utils/relays.js";
import { openMine, refresh, navTo } from "./appshell.js";
import { refreshChip } from "./nav.js";

var backdrop = null;

const TERMS = [
  "No se recopila informacion ni se almacenan tus publicaciones en ningun servidor (se guardan de forma local y cifrada).",
  "No se permite a menores de edad: debes tener al menos 18 anos para registrarte.",
  "Los foros que los creadores etiqueten como sensibles o para adultos no permiten el acceso de menores.",
  "Los creadores de foros son responsables del contenido de su foro y de marcar audiencia sensible/adulto cuando corresponda.",
  "Los foros que no cumplan las reglas de servicio seran baneados (incluidos los foros de sus creadores).",
  "Los usuarios jovenes que se hayan registrado no hacen responsable a la pagina ni a los desarrolladores bajo ninguna circunstancia."
];

export function isAuthOpen() { return !!backdrop; }

export function openAuth() {
  if (backdrop) return;
  backdrop = document.createElement("div");
  backdrop.className = "auth-backdrop";

  var win = document.createElement("div");
  win.className = "auth-window";

  var tabs = document.createElement("div");
  tabs.className = "auth-tabs";
  var tReg = document.createElement("button");
  tReg.type = "button";
  tReg.className = "auth-tab active";
  tReg.textContent = "Registrarse";
  var tLog = document.createElement("button");
  tLog.type = "button";
  tLog.className = "auth-tab";
  tLog.textContent = "Iniciar sesion";
  tabs.appendChild(tReg);
  tabs.appendChild(tLog);

  var panelReg = document.createElement("div");
  panelReg.className = "auth-panel active";
  panelReg.appendChild(buildRegister());
  var panelLog = document.createElement("div");
  panelLog.className = "auth-panel";
  panelLog.appendChild(buildLogin());

  tReg.addEventListener("click", function () {
    tReg.classList.add("active"); tLog.classList.remove("active");
    panelReg.classList.add("active"); panelLog.classList.remove("active");
  });
  tLog.addEventListener("click", function () {
    tLog.classList.add("active"); tReg.classList.remove("active");
    panelLog.classList.add("active"); panelReg.classList.remove("active");
  });

  var close = document.createElement("button");
  close.type = "button";
  close.className = "auth-close";
  close.textContent = "X";
  close.title = "Cerrar";
  close.addEventListener("click", closeAuth);

  win.appendChild(close);
  win.appendChild(tabs);
  win.appendChild(panelReg);
  win.appendChild(panelLog);

  backdrop.appendChild(win);
  document.body.appendChild(backdrop);
}

function buildRegister() {
  var box = document.createElement("div");
  var intro = document.createElement("p");
  intro.className = "auth-info";
  intro.textContent = "Crea tu cuenta. Tu clave privada nsec es tu contrasena: guardala en un lugar seguro. El publicador generara tus claves al crear la cuenta.";
  box.appendChild(intro);

  var lblName = document.createElement("label");
  lblName.className = "auth-label";
  lblName.textContent = "Nombre de usuario:";
  var name = document.createElement("input");
  name.type = "text";
  name.className = "auth-input";
  name.placeholder = "Tu nombre";
  box.appendChild(lblName);
  box.appendChild(name);

  var lblAge = document.createElement("label");
  lblAge.className = "auth-label";
  lblAge.textContent = "Edad (minimo 18):";
  var age = document.createElement("input");
  age.type = "number";
  age.min = "1";
  age.className = "auth-input";
  age.placeholder = "Tu edad";
  box.appendChild(lblAge);
  box.appendChild(age);

  var terms = document.createElement("div");
  terms.className = "auth-terms";
  var termsTitle = document.createElement("h4");
  termsTitle.textContent = "Servicios y condiciones";
  terms.appendChild(termsTitle);
  var ul = document.createElement("ul");
  TERMS.forEach(function (t) {
    var li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });
  terms.appendChild(ul);
  var readWrap = document.createElement("label");
  readWrap.className = "auth-check";
  var chk = document.createElement("input");
  chk.type = "checkbox";
  var chkSpan = document.createElement("span");
  chkSpan.textContent = "He leido los terminos y condiciones.";
  readWrap.appendChild(chk);
  readWrap.appendChild(chkSpan);
  terms.appendChild(readWrap);
  box.appendChild(terms);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn2 auth-submit";
  btn.textContent = "Aceptar y crear cuenta";
  btn.disabled = true;
  box.appendChild(btn);

  var status = document.createElement("p");
  status.className = "auth-status";
  box.appendChild(status);

  function update() {
    if (!chk.checked || name.value.trim().length < 2 || parseInt(age.value, 10) < 18) {
      btn.disabled = true;
    } else {
      btn.disabled = false;
    }
  }
  name.addEventListener("input", update);
  age.addEventListener("input", update);
  chk.addEventListener("change", update);

  btn.addEventListener("click", function () {
    if (parseInt(age.value, 10) < 18) {
      status.textContent = "Debes tener al menos 18 anos para registrarte.";
      status.style.color = "var(--accent)";
      return;
    }
    btn.disabled = true;
    status.textContent = "Generando tus claves...";
    status.style.color = "";
    generateKeys().then(function (keys) {
      var user = registerUser(name.value.trim(), keys, parseInt(age.value, 10));
      publishProfile({ name: user.name, picture: null });
      status.textContent = "";
      showKeysModal(user.nsec, keys.npub);
    }).catch(function () {
      status.textContent = "Error generando claves. Intenta de nuevo.";
      status.style.color = "var(--accent)";
      btn.disabled = false;
    });
  });

  return box;
}

function showKeysModal(nsec, npub) {
  /* pantalla tras el registro: copiar nsec (bloqueada 10s), luego aviso y va a mi perfil */
  backdrop.innerHTML = "";
  var win = document.createElement("div");
  win.className = "auth-window";

  var title = document.createElement("h3");
  title.className = "auth-title";
  title.textContent = "GUARDA TU LLAVE PRIVADA (nsec)";
  win.appendChild(title);

  var warn = document.createElement("p");
  warn.className = "auth-info warn";
  warn.textContent = "Esta es tu contrasena. Si la pierdes, no podras recuperar tu cuenta. Nadie mas puede verla.";
  win.appendChild(warn);

  var nsecBox = document.createElement("textarea");
  nsecBox.readOnly = true;
  nsecBox.className = "auth-nsec";
  nsecBox.value = nsec;
  win.appendChild(nsecBox);

  var buttons = document.createElement("div");
  buttons.className = "form-actions";
  var copy = document.createElement("button");
  copy.type = "button";
  copy.className = "btn2";
  copy.textContent = "Copiar nsec";
  var go = document.createElement("button");
  go.type = "button";
  go.className = "btn2 auth-submit";
  go.textContent = "Continuar";
  go.disabled = true;
  buttons.appendChild(copy);
  buttons.appendChild(go);
  win.appendChild(buttons);

  var count = document.createElement("p");
  count.className = "auth-status";
  count.textContent = "La clave estara disponible despues de 10 segundos (ya puedes copiarla).";
  win.appendChild(count);

  copy.addEventListener("click", function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(nsec).then(function () {
        copy.textContent = "Copiada";
      });
    } else {
      copy.textContent = "Selecciona y copia";
    }
  });

  var t0 = Date.now();
  var iv = setInterval(function () {
    var left = Math.max(0, 10 - Math.floor((Date.now() - t0) / 1000));
    if (left > 0) {
      count.textContent = "El boton Continuar se habilita en " + left + "s. Ya puedes copiar tu nsec.";
    } else {
      clearInterval(iv);
      go.disabled = false;
      count.textContent = "Listo. Continua para entrar a tu perfil.";
    }
  }, 300);

  go.addEventListener("click", function () {
    clearInterval(iv);
    backdrop.remove();
    backdrop = null;
    /* aviso de privacidad antes de entrar */
    showNotice();
  });

  backdrop.appendChild(win);
}

function showNotice() {
  /* mensaje de privacidad/condiciones antes de entrar al perfil */
  backdrop = null;
  var nb = document.createElement("div");
  nb.className = "auth-backdrop";
  var win = document.createElement("div");
  win.className = "auth-window";
  var h = document.createElement("h3");
  h.className = "auth-title";
  h.textContent = "Privacidad y condiciones";
  var p = document.createElement("p");
  p.className = "auth-info";
  p.textContent = "No se recopila informacion ni posts de los usuarios; tu contenido se guarda localmente y esta cifrado. Al continuar aceptas los terminos que acabas de leer, incluido el tema de menores de edad y la responsabilidad del creador de cada foro.";
  win.appendChild(h);
  win.appendChild(p);
  var ok = document.createElement("button");
  ok.type = "button";
  ok.className = "btn2 auth-submit";
  ok.textContent = "Aceptar";
  ok.addEventListener("click", function () {
    nb.remove();
    backdrop = null;
    refreshChip();
    openMine();
    refresh();
  });
  win.appendChild(ok);
  nb.appendChild(win);
  backdrop = nb;
  document.body.appendChild(nb);
}

function buildLogin() {
  var box = document.createElement("div");
  var info = document.createElement("p");
  info.className = "auth-info";
  info.textContent = "Inicia sesion con tu clave privada nsec.";
  box.appendChild(info);

  var lbl = document.createElement("label");
  lbl.className = "auth-label";
  lbl.textContent = "Clave nsec:";
  var nsec = document.createElement("input");
  nsec.type = "password";
  nsec.className = "auth-input";
  nsec.placeholder = "nsec1...";
  box.appendChild(lbl);
  box.appendChild(nsec);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn2 auth-submit";
  btn.textContent = "Iniciar sesion";
  box.appendChild(btn);

  var status = document.createElement("p");
  status.className = "auth-status";
  box.appendChild(status);

  btn.addEventListener("click", function () {
    btn.disabled = true;
    status.textContent = "Verificando clave...";
    login(nsec.value.trim()).then(function (ok) {
      btn.disabled = false;
      if (ok) {
        backdrop.remove();
        backdrop = null;
        refreshChip();
        openMine();
        refresh();
        navTo("home");
      } else {
        status.textContent = "Clave nsec no valida.";
        status.style.color = "var(--accent)";
      }
    });
  });
  return box;
}

export function closeAuth() {
  if (!backdrop) return;
  backdrop.remove();
  backdrop = null;
}

export { TERMS };