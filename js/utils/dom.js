/* ===== utilidades de documento ===== */

export function fileToDataURL(file, cb) {
  var reader = new FileReader();
  reader.onload = function () { cb(reader.result); };
  reader.readAsDataURL(file);
}

/* ---- notificacion visual en pantalla (misma idea que el toast del blog) ---- */
export function toast(message, type) {
  var wrap = document.getElementById("toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toast-wrap";
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  var el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(function () {
    el.classList.add("out");
    setTimeout(function () { el.remove(); }, 350);
  }, 3800);
}