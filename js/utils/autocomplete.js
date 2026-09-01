/* ===== autocompletado de hashtags (widget de la capa de utilidades) ===== */
import { UNIVERSES } from "../config.js";

var acVisible = false;
var acItems = [];
var acIndex = 0;
var acTarget = null;
var acUl = null;

export function isAcOpen() { return acVisible; }

function findTagAt(text, caret) {
  var before = text.slice(0, caret);
  var m = /(^|\n|\s)#([A-Za-z0-9-]*)$/.exec(before);
  if (!m) return null;
  return { start: caret - m[2].length - 1, fragment: m[2] };
}

export function acHide() {
  acVisible = false;
  acUl = null;
  acItems = [];
  var pops = document.querySelectorAll(".ac-pop");
  Array.prototype.forEach.call(pops, function (p) { p.style.display = "none"; });
}

function showAC(pop, ul, anchor, items) {
  acVisible = true;
  acItems = items;
  acIndex = 0;
  acUl = ul;
  ul.innerHTML = "";
  items.forEach(function (u, i) {
    var li = document.createElement("li");
    li.textContent = "#" + u.tag;
    li.title = u.name;
    if (i === 0) li.classList.add("active");
    li.addEventListener("click", function () { acCommit(u.tag); });
    ul.appendChild(li);
  });
  var fr = pop.parentNode.getBoundingClientRect();
  var ar = anchor.getBoundingClientRect();
  pop.style.top = (ar.bottom - fr.top + 3) + "px";
  pop.style.left = (Math.max(ar.left - fr.left, 0)) + "px";
  pop.style.display = "block";
  highlightAC();
}

function highlightAC() {
  if (!acUl) return;
  var lis = acUl.querySelectorAll("li");
  Array.prototype.forEach.call(lis, function (li, i) {
    li.classList.toggle("active", i === acIndex);
  });
  if (lis[acIndex]) lis[acIndex].scrollIntoView({ block: "nearest" });
}

function acCommit(tag) {
  var t = acTarget;
  if (!t) { acHide(); return; }
  var caret = t.selectionStart || t.value.length;
  var f = findTagAt(t.value, caret);
  var nc;
  if (f) {
    var rep = "#" + tag + " ";
    t.value = t.value.slice(0, f.start) + rep + t.value.slice(caret);
    nc = f.start + rep.length;
  } else {
    var ins = (caret > 0 && t.value.charAt(caret - 1) !== " " ? " " : "") + "#" + tag + " ";
    t.value = t.value.slice(0, caret) + ins + t.value.slice(caret);
    nc = caret + ins.length;
  }
  t.focus();
  t.setSelectionRange(nc, nc);
  acHide();
}

function acKey(ev) {
  if (!acVisible || !acItems.length) return;
  if (ev.key === "Tab") { ev.preventDefault(); acCommit(acItems[acIndex].tag); }
  else if (ev.key === "ArrowDown") { ev.preventDefault(); acIndex = (acIndex + 1) % acItems.length; highlightAC(); }
  else if (ev.key === "ArrowUp") { ev.preventDefault(); acIndex = (acIndex - 1 + acItems.length) % acItems.length; highlightAC(); }
  else if (ev.key === "Enter") { ev.preventDefault(); acCommit(acItems[acIndex].tag); }
  else if (ev.key === "Escape") { acHide(); }
}

export function bindTagAC(form, ta, opt) {
  form.classList.add("ac-host");
  var pop = document.createElement("div");
  pop.className = "ac-pop";
  pop.style.display = "none";
  var ul = document.createElement("ul");
  pop.appendChild(ul);
  form.appendChild(pop);

  ta.classList.add("ac-anchor");
  ta.addEventListener("input", function () {
    var caret = ta.selectionStart || 0;
    var f = findTagAt(ta.value, caret);
    if (!f) { acHide(); return; }
    var items = UNIVERSES.filter(function (u) {
      return u.tag.toLowerCase().indexOf(f.fragment.toLowerCase()) === 0;
    });
    if (!items.length) { acHide(); return; }
    acTarget = ta;
    showAC(pop, ul, ta, items);
  });
  ta.addEventListener("keydown", acKey);

  if (opt) {
    opt.classList.add("ac-anchor");
    var openAll = function () {
      var q = (opt.value || "").trim();
      var items = q
        ? UNIVERSES.filter(function (u) { return u.tag.toLowerCase().indexOf(q.toLowerCase()) === 0; })
        : UNIVERSES.slice();
      acTarget = ta;
      showAC(pop, ul, opt, items);
    };
    opt.addEventListener("input", openAll);
    opt.addEventListener("click", openAll);
    opt.addEventListener("keydown", acKey);
  }
}