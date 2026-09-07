/* ===== selector de GIFs (GIPHY) para postear stickers ===== */
import { GIPHY_KEY } from "../config.js";
import { toast } from "../utils/dom.js";

var backdrop = null;
var state = null;

var CATS = [
  { label: "Random", q: null },
  { label: "Anime", q: "anime" },
  { label: "Feliz", q: "feliz" },
  { label: "Triste", q: "triste" },
  { label: "Enojado", q: "enojado" },
  { label: "Sorpresa", q: "sorpresa" },
  { label: "Amor", q: "amor" },
  { label: "Baile", q: "baile" },
  { label: "Reaccion", q: "reaccion" },
  { label: "Memes", q: "memes" },
  { label: "Animales", q: "animales" }
];

const LIMIT = 40;

export function isGifPickerOpen() { return !!backdrop; }

export function closeGifPicker() {
  if (backdrop) {
    backdrop.remove();
    backdrop = null;
    state = null;
  }
}

/* inserta el gif en el textarea que se paso al abrir, oculto dentro de [...] */
function pickGif(src) {
  var ta = state.ta;
  var text = "[" + src + "] ";
  if (!ta) return;
  if (ta.selectionStart != null) {
    var s = ta.selectionStart;
    var e = ta.selectionEnd != null ? ta.selectionEnd : s;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
    var pos = s + text.length;
    ta.setSelectionRange(pos, pos);
  } else {
    ta.value = (ta.value ? ta.value + "\n" : "") + text;
  }
  ta.focus();
  closeGifPicker();
}

function giphyUrl(q, offset) {
  var endpoint = q ? "search" : "trending";
  var params = "api_key=" + encodeURIComponent(GIPHY_KEY) +
    "&limit=" + LIMIT + "&offset=" + offset + "&rating=g" +
    (q ? "&q=" + encodeURIComponent(q) : "");
  return "https://api.giphy.com/v1/gifs/" + endpoint + "?" + params;
}

function fetchPage() {
  if (!state || state.loading || state.done) return;
  state.loading = true;
  var stamp = state.stamp;
  fetch(giphyUrl(state.q, state.offset))
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
    .then(function (d) {
      if (!backdrop || stamp !== state.stamp) return;
      var items = (d && d.data) || [];
      if (items.length < LIMIT) state.done = true;
      items.forEach(function (it) { addGifCard(it); });
      state.offset += items.length;
      state.loading = false;
      if (!items.length) maybeShowEmpty();
    })
    .catch(function (err) {
      if (!backdrop) return;
      state.loading = false;
      toast("Error al cargar GIFs: " + err.message, "err");
    });
}

function maybeShowEmpty() {
  var grid = backdrop.querySelector(".gifpicker-grid");
  if (grid && !grid.children.length) {
    var p = document.createElement("p");
    p.className = "gifpicker-empty";
    p.textContent = "No se encontraron GIFs. Prueba otra categoria.";
    grid.appendChild(p);
  }
}

function addGifCard(it) {
  var img = (it.images && (it.images.fixed_width || it.images.fixed_height || it.images.original)) || null;
  if (!img || !img.url) return;
  var cell = document.createElement("button");
  cell.type = "button";
  cell.className = "gifpicker-cell";
  var im = document.createElement("img");
  im.loading = "lazy";
  im.src = img.url;
  im.alt = it.title || "gif";
  im.title = it.title || "gif";
  cell.appendChild(im);
  cell.addEventListener("click", function () { pickGif(it.images.original ? it.images.original.url : img.url); });
  var grid = backdrop.querySelector(".gifpicker-grid");
  grid.appendChild(cell);
}

function buildGrid() {
  var grid = document.createElement("div");
  grid.className = "gifpicker-grid";
  return grid;
}

function startSearch(q) {
  state.q = q;
  state.offset = 0;
  state.done = false;
  state.loading = false;
  state.stamp = (state.stamp || 0) + 1;
  var grid = backdrop.querySelector(".gifpicker-grid");
  if (grid) grid.innerHTML = "";
  var bar = backdrop.querySelector(".gifpicker-cats");
  if (bar) bar.querySelectorAll(".gifpicker-cat").forEach(function (x) { x.classList.remove("active"); });
  fetchPage();
}

function buildSearch() {
  var wrap = document.createElement("div");
  wrap.className = "gifpicker-search";
  var input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Buscar GIFs... (ej. pizza, gato, fiesta)";
  input.maxLength = 80;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "gifpicker-search-btn";
  btn.textContent = "Buscar";
  function run() {
    var val = input.value.trim();
    if (val) startSearch(val);
  }
  btn.addEventListener("click", run);
  input.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") { ev.preventDefault(); run(); }
  });
  wrap.appendChild(input);
  wrap.appendChild(btn);
  return wrap;
}

function buildCats(win, grid) {
  var bar = document.createElement("div");
  bar.className = "gifpicker-cats";
  CATS.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "gifpicker-cat";
    b.textContent = c.label;
    var activeQ = state.q;
    b.classList.toggle("active", activeQ === c.q);
    b.addEventListener("click", function () {
      bar.querySelectorAll(".gifpicker-cat").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      startSearch(c.q);
    });
    bar.appendChild(b);
  });
  return bar;
}

export function openGifPicker(ta) {
  if (backdrop) closeGifPicker();
  backdrop = document.createElement("div");
  backdrop.className = "gifpicker-backdrop";

  var win = document.createElement("div");
  win.className = "gifpicker-win";

  var head = document.createElement("div");
  head.className = "gifpicker-head";
  var title = document.createElement("span");
  title.textContent = "GIFs / stickers";
  var close = document.createElement("button");
  close.type = "button";
  close.className = "gifpicker-close";
  close.textContent = "X";
  close.title = "Cerrar";
  close.addEventListener("click", closeGifPicker);
  head.appendChild(title);
  head.appendChild(close);

  var grid = buildGrid();
  state = { ta: ta, q: null, offset: 0, done: false, loading: false, stamp: 0 };

  var volver = document.createElement("button");
  volver.type = "button";
  volver.className = "gifpicker-back";
  volver.textContent = "← Volver sin GIF";
  volver.addEventListener("click", closeGifPicker);

  win.appendChild(head);
  win.appendChild(buildSearch());
  win.appendChild(buildCats(win, grid));
  win.appendChild(grid);
  win.appendChild(volver);
  backdrop.appendChild(win);

  /* scroll infinito sobre la ventana del modal */
  win.addEventListener("scroll", function () {
    if (win.scrollTop + win.clientHeight >= win.scrollHeight - 240) fetchPage();
  }, { passive: true });

  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop) closeGifPicker();
  });

  document.body.appendChild(backdrop);
  fetchPage();
}