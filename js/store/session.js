/* ===== sesion de la UI: estado navegacional en memoria ===== */
export var session = {
  currentView: "home",
  profileView: null,
  myProfileView: false,
  lastBoard: "d",
  focus: null /* { boardId, threadNo, replyNo } al navegar a una notificacion */
};

/* parsea un hash tipo "#perfil/<pubHex>" y devuelve el pubHex o null */
export function parseProfileHash(hash) {
  var m = /^#perfil\/([0-9a-f]{64})/i.exec(hash || "");
  return m ? m[1].toLowerCase() : null;
}