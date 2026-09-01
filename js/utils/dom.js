/* ===== utilidades de documento ===== */

export function fileToDataURL(file, cb) {
  var reader = new FileReader();
  reader.onload = function () { cb(reader.result); };
  reader.readAsDataURL(file);
}