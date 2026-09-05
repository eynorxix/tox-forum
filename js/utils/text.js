/* ===== utilidades de texto ===== */

export function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unesc(s) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function ytId(href) {
  var m = href.match(/youtu\.be\/([\w-]{11})/);
  if (m) return m[1];
  m = href.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function embedInfo(href) {
  var id = ytId(href);
  if (id) return { kind: "yt", src: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg", href: href };
  if (/\.(gif|jpe?g|png|webp|bmp|apng|avif)(\?.*)?$/i.test(href)) return { kind: "img", src: href, href: href };
  return null;
}

/* inserta la miniatura/multimedia de cada .auto-link despues del parrafo del
   comentario que lo contiene (un <figure> no puede vivir dentro de un <p>) */
export function attachAutoEmbeds(root) {
  if (!root || !root.querySelectorAll) return;
  var links = root.querySelectorAll("a.auto-link");
  Array.prototype.forEach.call(links, function (a) {
    if (a.hasAttribute("data-embed")) return;
    var info = embedInfo(a.href || "");
    if (!info) return;
    a.setAttribute("data-embed", "1");
    var fig = document.createElement("figure");
    fig.className = "embed " + (info.kind === "yt" ? "yt-embed" : "img-embed");
    var al = document.createElement("a");
    al.className = "embed-link";
    al.href = info.href;
    al.target = "_blank";
    al.rel = "noopener nofollow";
    var img = document.createElement("img");
    img.className = info.kind === "yt" ? "embed-thumb" : "embed-img";
    img.src = info.src;
    img.loading = "lazy";
    img.alt = info.kind === "yt" ? "Miniatura de YouTube" : "";
    al.appendChild(img);
    if (info.kind === "yt") {
      var play = document.createElement("span");
      play.className = "embed-play";
      play.textContent = "▶";
      al.appendChild(play);
    }
    fig.appendChild(al);
    var p = a.closest("p");
    var host = p && p.parentNode ? p.parentNode : root;
    host.insertBefore(fig, p && p.nextSibling ? p.nextSibling : null);
  });
}

export function linksInText(text) {
  // 1) escapa el texto
  // 2) convierte >>n a quotelinks hacia el post
  // 3) convierte URLs (http/https/www.) en enlaces rosa .auto-link
  //    (las miniaturas se agregan con attachAutoEmbeds)
  var out = esc(text).replace(/&gt;&gt;(\d+)/g, function (m, n) {
    return '<span class="quotelink" data-quote="' + n + '">&gt;&gt;' + n + '</span>';
  });
  out = out.replace(/(?:https?:\/\/|www\.)[^\s<>"']+/g, function (m) {
    var display = m.trim().replace(/[.,:!?)\]}"']+$/, "");
    var href = unesc(display);
    if (!/^https?:\/\//i.test(href)) href = "https://" + href;
    return '<a class="auto-link" href="' + esc(href) + '" target="_blank" rel="noopener nofollow">' + display + '</a>';
  });
  return out;
}

export function fmtDate(ts) {
  var d = new Date(ts);
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  return (
    d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
    " " + pad(d.getHours()) + ":" + pad(d.getMinutes())
  );
}