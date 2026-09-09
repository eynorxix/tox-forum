/* ===== utilidades de documento ===== */

export function fileToDataURL(file, cb) {
  var reader = new FileReader();
  reader.onload = function () { cb(reader.result); };
  reader.readAsDataURL(file);
}

/* ---- Drag and Drop API: area de arrastrar/soltar o elegir imagen con preview ----
   Convierte un <input type="file"> en un layout arrastrable (se reutiliza para
   subir imagenes en los posts y para el icono de perfil):
   - si no hay archivo muestra el mensaje "arrastra tu imagen desde una carpeta...",
   - al soltar (o elegir con clic) muestra el preview de la imagen dentro del area,
   - el boton "Quitar" vacia la seleccion.
   opts: { label (por defecto el mensaje estandar), maxWidth, maxHeight,
           onPick(selectedFile) callback opcional } */
export function createDropzone(fileInput, opts) {
  opts = opts || {};
  fileInput.type = "file";
  fileInput.accept = "image/*";
  var zone = document.createElement("div");
  zone.className = "dropzone" + (opts.className ? " " + opts.className : "");

  var body = document.createElement("div");
  body.className = "dropzone-body";

  var empty = document.createElement("div");
  empty.className = "dropzone-empty";
  empty.innerHTML = opts.html
    ? opts.html
    : '<span class="dz-icon">&#8595;</span> ' + (opts.label || "Arrastra tu imagen desde una carpeta") +
      '<small>' + (opts.hint || "o haz clic para elegir un archivo de imagen desde tu equipo") + '</small>';

  var preview = document.createElement("div");
  preview.className = "dropzone-preview";
  preview.style.display = "none";
  var img = document.createElement("img");
  if (opts.maxWidth) img.style.maxWidth = opts.maxWidth;
  if (opts.maxHeight) img.style.maxHeight = opts.maxHeight;
  var clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "dropzone-clear";
  clearBtn.textContent = "Quitar";
  preview.appendChild(img);
  preview.appendChild(clearBtn);

  body.appendChild(empty);
  body.appendChild(preview);
  zone.appendChild(fileInput);
  zone.appendChild(body);

  function setEmpty() {
    preview.style.display = "none";
    empty.style.display = "block";
    zone.classList.remove("has-file");
  }
  function showFile(f) {
    if (!f) { setEmpty(); return; }
    var url = URL.createObjectURL(f);
    img.src = url;
    preview.style.display = "inline-block";
    empty.style.display = "none";
    zone.classList.add("has-file");
    if (typeof opts.onPick === "function") opts.onPick(f);
  }
  function pickFromInput() {
    showFile(fileInput.files && fileInput.files[0]);
  }

  fileInput.addEventListener("change", pickFromInput);
  body.addEventListener("click", function () { fileInput.click(); });

  clearBtn.addEventListener("click", function (ev) {
    ev.stopPropagation();
    fileInput.value = "";
    setEmpty();
    if (typeof opts.onPick === "function") opts.onPick(null);
  });

  body.addEventListener("dragover", function (ev) {
    ev.preventDefault();
    zone.classList.add("dragover");
  });
  body.addEventListener("dragleave", function () {
    zone.classList.remove("dragover");
  });
  body.addEventListener("drop", function (ev) {
    ev.preventDefault();
    zone.classList.remove("dragover");
    var dt = ev.dataTransfer;
    var f = dt && dt.files && dt.files[0];
    if (!f) return;
    if (f.type && f.type.indexOf("image/") !== 0) {
      toast("Solo se aceptan imagenes", "warn");
      return;
    }
    /* asigna el archivo soltado al input para que el submit lo lea igual */
    var d = new DataTransfer();
    d.items.add(f);
    fileInput.files = d.files;
    showFile(f);
  });

  return zone;
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