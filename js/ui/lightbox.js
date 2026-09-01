/* ===== visor de imagenes (lightbox) ===== */
export function openImage(src) {
  var backdrop = document.createElement("div");
  backdrop.className = "img-backdrop";
  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop || ev.target.className === "close-img") closeImage();
  });

  var lb = document.createElement("div");
  lb.className = "img-lightbox";
  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "close-img";
  closeBtn.textContent = "✕";
  closeBtn.title = "Cerrar";
  var img = document.createElement("img");
  img.src = src;
  img.alt = "imagen ampliada";
  lb.appendChild(closeBtn);
  lb.appendChild(img);
  backdrop.appendChild(lb);
  document.body.appendChild(backdrop);
}

export function closeImage() {
  var bd = document.querySelector(".img-backdrop");
  if (bd) bd.remove();
}