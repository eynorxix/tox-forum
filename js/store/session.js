/* ===== sesion de la UI: estado navegacional en memoria ===== */
export var session = {
  currentView: "home",
  profileView: null,
  myProfileView: false,
  lastBoard: "d",
  focus: null /* { boardId, threadNo, replyNo } al navegar a una notificacion */
};