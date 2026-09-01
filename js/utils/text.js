/* ===== utilidades de texto ===== */

export function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function linksInText(text) {
  // convierte >>n a quotelinks hacia el post
  var out = esc(text).replace(/&gt;&gt;(\d+)/g, '<span class="quotelink" data-quote="$1">&gt;&gt;$1</span>');
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