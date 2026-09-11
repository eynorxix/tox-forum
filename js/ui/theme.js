/* ===== selector de tema de color (Tokyo Night dark / Dark+blanco / Tokyo Light) =====
   El tema se aplica en <html data-theme="..."> y se recuerda entre sesiones. */
var STORAGE_KEY = "tox.theme";

var THEME_META = {
  dark: { name: "Tokyo Night (oscuro)", themeColor: "#1a1b26" },
  mono: { name: "Oscuro con blanco", themeColor: "#0d0d0d" },
  light: { name: "Tokyo claro", themeColor: "#e1e2e7" }
};

function applyTheme(name) {
  var doc = document.documentElement;
  if (!THEME_META[name]) name = "dark";
  if (name === "dark") doc.removeAttribute("data-theme");
  else doc.setAttribute("data-theme", name);
  try { localStorage.setItem(STORAGE_KEY, name); }
  catch (e) { /* almacenamiento no disponible */ }
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_META[name].themeColor;
  var cs = document.querySelector('meta[name="color-scheme"]');
  if (cs) cs.content = (name === "light") ? "light" : "dark";
  var opts = document.querySelectorAll("#theme-switch .theme-opt");
  opts.forEach(function (o) {
    o.classList.toggle("active", o.dataset.theme === name);
  });
}

export function initTheme() {
  var saved = "dark";
  try { saved = localStorage.getItem(STORAGE_KEY) || "dark"; }
  catch (e) { /* almacenamiento no disponible */ }
  applyTheme(saved);
  document.getElementById("theme-switch").addEventListener("click", function (ev) {
    var opt = ev.target.closest(".theme-opt");
    if (!opt || !opt.dataset.theme) return;
    applyTheme(opt.dataset.theme);
  });
}

export function currentTheme() {
  var d = document.documentElement.getAttribute("data-theme");
  return d || "dark";
}