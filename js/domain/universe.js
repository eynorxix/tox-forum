/* ===== dominio: visor de universos de /d/ (graficas y animacion) ===== */
import { state } from "../store/db.js";
import { UNIVERSES } from "../config.js";

var currentChart = "barras";
var anim = null;

export function getChartType() { return currentChart; }

export function cancelAnims() {
  if (anim && anim.id) cancelAnimationFrame(anim.id);
  anim = null;
}

export function makeUniverseViewer() {
  var panel = document.createElement("div");
  panel.className = "uni-panel";
  var h3 = document.createElement("h3");
  h3.innerHTML = "Visor de universos <span>/d/ Doomsday</span>";
  var hint = document.createElement("p");
  hint.className = "uni-hint";
  hint.textContent =
    "Escribe un hashtag al publicar para sumar apoyo a su barra: #Tierra-96283 · #XMen · #Doom · #Fantasticos · #Venom · #MCU";

  var tabs = document.createElement("div");
  tabs.className = "uv-tabs";
  ["barras", "lollipop", "lineas", "pastel"].forEach(function (t) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "uv-tab";
    b.dataset.chart = t;
    b.textContent = caps(t);
    if (t === currentChart) b.classList.add("active");
    b.addEventListener("click", function () { setChart(t, tabs); });
    tabs.appendChild(b);
  });

  var body = document.createElement("div");
  body.className = "uv-body";
  var bars = buildBars();
  bars.id = "uv-bars";
  var cv = document.createElement("canvas");
  cv.id = "uv-chart";
  cv.width = 720;
  cv.height = 340;
  cv.style.display = "none";
  body.appendChild(bars);
  body.appendChild(cv);

  panel.appendChild(h3);
  panel.appendChild(hint);
  panel.appendChild(tabs);
  panel.appendChild(body);
  return panel;
}

function caps(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function setChart(type, tabs) {
  currentChart = type;
  var tbs = tabs.querySelectorAll(".uv-tab");
  Array.prototype.forEach.call(tbs, function (t) {
    t.classList.toggle("active", t.dataset.chart === type);
  });
  var bars = document.getElementById("uv-bars");
  var cv = document.getElementById("uv-chart");
  if (type === "barras") {
    bars.style.display = "";
    cv.style.display = "none";
    animateBars();
    return;
  }
  bars.style.display = "none";
  cv.style.display = "";
  var ctx = cv.getContext("2d");
  var W = cv.width, H = cv.height;
  animateChart(700, function (e) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1a1b26";
    ctx.fillRect(0, 0, W, H);
    if (type === "lollipop") drawLollipop(ctx, W, H, e);
    else if (type === "lineas") drawLineas(ctx, W, H, e);
    else if (type === "pastel") drawPastel(ctx, W, H, e);
  });
}

/* ---- motor de animación (cero -> estado actual) ---- */
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function animateChart(duration, step) {
  cancelAnims();
  var start = null;
  function frame(ts) {
    if (start === null) start = ts;
    var t = Math.min(1, (ts - start) / duration);
    step(easeOut(t));
    if (t < 1) {
      anim = { id: requestAnimationFrame(frame) };
    } else {
      anim = null;
      updateBars();
    }
  }
  anim = { id: requestAnimationFrame(frame) };
}

export function animateBars() {
  var max = maxVote();
  var fills = document.querySelectorAll(".uni-fill");
  var cntEls = document.querySelectorAll(".uni-count");
  var cntMap = {};
  Array.prototype.forEach.call(cntEls, function (c) { cntMap[c.dataset.tag] = c; });
  if (!fills.length) return;

  animateChart(800, function (e) {
    Array.prototype.forEach.call(fills, function (fill) {
      var v = state.votes[fill.dataset.tag] || 0;
      fill.style.width = (max > 0 ? (v / max) * 100 * e : 0) + "%";
    });
    Array.prototype.forEach.call(fills, function (fill) {
      var c = cntMap[fill.dataset.tag];
      if (!c) return;
      var v = state.votes[fill.dataset.tag] || 0;
      c.textContent = Math.round(v * e) + " apoyo" + (Math.round(v * e) === 1 ? "" : "s");
    });
  });
}

function buildBars() {
  var wrap = document.createElement("div");
  wrap.className = "uni-bars";
  UNIVERSES.forEach(function (u) {
    var bar = document.createElement("div");
    bar.className = "uni-bar";

    var head = document.createElement("div");
    head.className = "uni-bar-head";
    var tag = document.createElement("span");
    tag.className = "uni-tag";
    tag.textContent = "#" + u.tag;
    var name = document.createElement("span");
    name.className = "uni-name";
    name.textContent = " " + u.name;
    var cnt = document.createElement("span");
    cnt.className = "uni-count";
    cnt.textContent = "0 apoyos";
    cnt.dataset.tag = u.tag;
    head.appendChild(tag);
    head.appendChild(name);
    head.appendChild(cnt);

    var track = document.createElement("div");
    track.className = "uni-track";
    var fill = document.createElement("div");
    fill.className = "uni-fill";
    fill.dataset.tag = u.tag;
    fill.style.background = u.color;
    fill.style.width = "0%";
    track.appendChild(fill);

    bar.appendChild(head);
    bar.appendChild(track);
    wrap.appendChild(bar);
  });
  return wrap;
}

function updateBars() {
  var fills = document.querySelectorAll(".uni-fill");
  var max = maxVote();
  Array.prototype.forEach.call(fills, function (fill) {
    var tag = fill.dataset.tag;
    var v = state.votes[tag] || 0;
    fill.style.width = (max > 0 ? (v / max) * 100 : 0) + "%";
    var cnt = document.querySelector('.uni-count[data-tag="' + tag + '"]');
    if (cnt) {
      var leader = v > 0 && v === max;
      cnt.textContent = v + " apoyo" + (v === 1 ? "" : "s") + (leader ? " ◆" : "");
    }
  });
}

function votesSorted() {
  return UNIVERSES
    .map(function (u) { return { u: u, v: state.votes[u.tag] || 0 }; })
    .sort(function (a, b) { return a.v - b.v; });
}

function maxVote() {
  var m = 0;
  UNIVERSES.forEach(function (u) {
    var v = state.votes[u.tag] || 0;
    if (v > m) m = v;
  });
  return m;
}

function totalVotes() {
  var t = 0;
  UNIVERSES.forEach(function (u) { t += state.votes[u.tag] || 0; });
  return t;
}

/* ---- gráfica de lollipop (como Almodóvar/IMDb) ---- */
function drawLollipop(ctx, W, H, e) {
  var data = votesSorted();
  var L = 110, R = 30, T = 20, B = 30;
  var pw = W - L - R, ph = H - T - B;
  var max = Math.max(1, maxVote());
  var n = data.length;
  var rowH = ph / n;

  ctx.strokeStyle = "#565f89";
  ctx.lineWidth = 1;
  for (var g = 0; g <= 10; g++) {
    var y = T + ph - (g / 10) * ph;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(W - R, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#a9b1d6";
  ctx.font = "13px monospace";
  ctx.textAlign = "right";
  for (var g2 = 0; g2 <= 10; g2 += 2) {
    var val = Math.round(max * g2 / 10);
    var yy = T + ph - (g2 / 10) * ph;
    ctx.fillText(String(val), L - 8, yy + 4);
  }

  data.forEach(function (d, i) {
    var yc = T + (i + 0.5) * rowH;
    var len = (d.v * e / max) * pw;
    ctx.strokeStyle = "#565f89";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(L, yc);
    ctx.lineTo(L + len, yc);
    ctx.stroke();
    ctx.fillStyle = d.u.color;
    ctx.beginPath();
    ctx.arc(L + len, yc, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c0caf5";
    ctx.font = "bold 14px Courier New";
    ctx.textAlign = "right";
    ctx.fillText("#" + d.u.tag, L - 10, yc + 4);
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#a9b1d6";
    ctx.fillText(String(Math.round(d.v * e)), L + len + 10, yc + 4);
  });
  ctx.textAlign = "center";
  ctx.fillStyle = "#a9b1d6";
  ctx.font = "13px Arial";
  ctx.fillText("Apoyos por universo (ordenado, " + Math.round(totalVotes() * e) + " en total)", W / 2, H - 6);
}

/* ---- gráfica de líneas ---- */
function drawLineas(ctx, W, H, e) {
  var L = 110, R = 30, T = 20, B = 30;
  var pw = W - L - R, ph = H - T - B;
  var max = Math.max(1, maxVote());
  var n = UNIVERSES.length;

  ctx.strokeStyle = "#565f89";
  ctx.lineWidth = 1;
  for (var g = 0; g <= 10; g++) {
    var y = T + ph - (g / 10) * ph;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(W - R, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#a9b1d6";
  ctx.font = "13px monospace";
  ctx.textAlign = "right";
  for (var g2 = 0; g2 <= 10; g2 += 2) {
    var val = Math.round(max * g2 / 10);
    var yy = T + ph - (g2 / 10) * ph;
    ctx.fillText(String(val), L - 8, yy + 4);
  }

  var xAt = function (i) { return L + (i + 0.5) * (pw / n); };
  var yAt = function (v) { return T + ph - (v / max) * ph; };

  ctx.strokeStyle = "#7dcfff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  UNIVERSES.forEach(function (u, i) {
    var v = (state.votes[u.tag] || 0) * e;
    var x = xAt(i), y = yAt(v);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  UNIVERSES.forEach(function (u, i) {
    var v = (state.votes[u.tag] || 0) * e;
    var x = xAt(i), y = yAt(v);
    ctx.fillStyle = u.color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#16161e";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#c0caf5";
    ctx.font = "17px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("#" + u.tag, x, H - B + 14);
    ctx.fillStyle = "#a9b1d6";
    ctx.font = "17px monospace";
    ctx.fillText(String(Math.round(v)), x, y - 10);
  });
  ctx.fillStyle = "#a9b1d6";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Evolución de apoyos por universo (" + Math.round(totalVotes() * e) + " en total)", W / 2, H - 4);
}

/* ---- gráfica de pastel (donut) ---- */
function drawPastel(ctx, W, H, e) {
  var total = totalVotes();
  var data = UNIVERSES
    .map(function (u) { return { u: u, v: state.votes[u.tag] || 0 }; })
    .filter(function (d) { return d.v > 0; });
  if (!total) {
    ctx.fillStyle = "#a9b1d6";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Sin apoyos todavía.", W / 2, H / 2);
    return;
  }

  var cx = W / 2 - 60, cy = H / 2, R = 120;
  var start = -Math.PI / 2;
  data.forEach(function (d) {
    var sweep = (d.v / total) * Math.PI * 2 * e;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, start, start + sweep);
    ctx.closePath();
    ctx.fillStyle = d.u.color;
    ctx.fill();
    ctx.strokeStyle = "#16161e";
    ctx.lineWidth = 2;
    ctx.stroke();
    start += sweep;
  });
  ctx.fillStyle = "#1a1b26";
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "bold 17px Courier New";
  ctx.fillStyle = "#c0caf5";
  ctx.textAlign = "center";
  ctx.fillText(String(Math.round(total * e)), cx, cy - 2);
  ctx.font = "17px Arial";
  ctx.fillStyle = "#a9b1d6";
  ctx.fillText("apoyos", cx, cy + 14);

  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  var lx = cx + R + 40, ly = cy - data.length * 13 + 6;
  data.forEach(function (d) {
    ctx.fillStyle = d.u.color;
    ctx.fillRect(lx, ly, 12, 12);
    ctx.fillStyle = "#c0caf5";
    ctx.fillText("#" + d.u.tag + " — " + Math.round(d.v * e) + " (" + Math.round(d.v / total * 100) + "%)", lx + 18, ly + 11);
    ly += 26;
  });
}