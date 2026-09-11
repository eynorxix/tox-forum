/* ===== loader ascii: animacion de carga para acciones de publicacion =====
   Muestra la secuencia "c-o-o-o-o-" (una C que avanza dejando guiones) al lado
   IZQUIERDO del boton mientras la publicacion/actualizacion esta en curso.

   Se posiciona con position:fixed flotando junto a la posicion del boton, de
   forma que sobrevive al re-render de refresh() (que reconstruye el DOM y
   borraria un loader insertado dentro del layout del boton). Al terminar
   muestra brevemente la barra completa "-------------" y desaparece. */

var FRAMES = [
  "c-o-o-o-o-o-o",
  "-Co-o-o-o-o-o",
  "--c-o-o-o-o-o",
  "---Co-o-o-o-o",
  "----c-o-o-o-o",
  "-----Co-o-o-o",
  "------c-o-o-o",
  "-------Co-o-o",
  "--------C-o-o",
  "---------Co-o",
  "----------C-o",
  "-----------Co",
  "------------C",
  "-------------"
];

/* crea un loader controlable: { start(nearEl), stop() }.
   start(nearEl): coloca el loader a la izquierda del boton y anima.
   stop(): muestra el frame final (barra completa) y lo quita al rato. */
export function asciiLoader() {
  var el = document.createElement("span");
  el.className = "ascii-loader";
  el.textContent = FRAMES[0];
  var i = 0;
  var timer = null;
  var hideTimer = null;
  var startedAt = 0;
  var MIN_VISIBLE = 750; /* ms minimos para que el usuario alcance a verla */

  function place(nearEl) {
    var r = nearEl.getBoundingClientRect();
    el.style.position = "fixed";
    el.style.top = (r.top + r.height / 2) + "px";
    el.style.transform = "translateY(-50%)";
    el.style.visibility = "hidden";
    document.body.appendChild(el);
    var w = el.offsetWidth;
    var left = r.left - w - 8;
    if (left < 4) left = r.right + 8; /* no cabe a la izquierda: a la derecha */
    el.style.left = left + "px";
    el.style.visibility = "visible";
  }

  return {
    el: el,
    start: function (nearEl) {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      if (timer) { clearInterval(timer); timer = null; }
      place(nearEl);
      i = 0;
      el.textContent = FRAMES[0];
      startedAt = Date.now();
      timer = setInterval(function () {
        i = (i + 1) % FRAMES.length;
        el.textContent = FRAMES[i];
      }, 120);
    },
    stop: function () {
      if (timer) { clearInterval(timer); timer = null; }
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      var elapsed = Date.now() - startedAt;
      var wait = Math.max(0, MIN_VISIBLE - elapsed);
      setTimeout(function () {
        el.textContent = FRAMES[FRAMES.length - 1];
        hideTimer = setTimeout(function () { el.remove(); }, 450);
      }, wait);
    }
  };
}