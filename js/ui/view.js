/* ===== vista: composicion del layout y navegacion (controlador de presentacion) ===== */
import { session } from "../store/session.js";
import { isAnon } from "../store/db.js";
import { renderNav, refreshChip } from "./nav.js";
import { renderHome } from "./home.js";
import { renderFollowingFeed } from "./activity.js";
import { renderSidebar } from "./sidebar.js";
import { renderBoard, bindQuotelinks } from "./board.js";
import { renderProfile, renderMyProfile } from "./profile.js";
import { renderRightPanel } from "./rightpanel.js";
import { openAuth } from "./auth.js";
import { cancelAnims, getChartType, animateBars, setChart } from "../domain/universe.js";

export function go(view) {
  session.myProfileView = false;
  session.profileView = null;
  session.currentView = view;
  refreshChip();
  renderNav();
  render();
}

export function render() {
  cancelAnims();
  var main = document.getElementById("content");
  main.innerHTML = "";
  if (session.currentView === "home" && !session.profileView && !session.myProfileView) {
    main.classList.remove("wide");
    main.appendChild(renderHome());
  } else {
    main.classList.add("wide");
    var layout = document.createElement("div");
    layout.className = "layout";
    var pvBoard = session.profileView ? session.profileView.boardId : session.currentView;
    if (session.myProfileView) pvBoard = session.lastBoard;
    if (session.currentView === "seguidos") pvBoard = session.lastBoard;
    layout.appendChild(renderSidebar(pvBoard));
    var col = document.createElement("div");
    col.className = "main";
    if (session.myProfileView) {
      col.appendChild(renderMyProfile());
    } else if (session.profileView) {
      col.appendChild(renderProfile(session.profileView.boardId, session.profileView.user));
    } else if (session.currentView === "seguidos") {
      col.appendChild(renderFollowingFeed());
    } else {
      col.appendChild(renderBoard(pvBoard));
    }
    layout.appendChild(col);
    layout.appendChild(renderRightPanel());
    main.appendChild(layout);
  }
  bindQuotelinks(main);
  if (session.currentView === "d" && !session.profileView && !session.myProfileView && session.currentView !== "home") {
    if (getChartType() === "barras") {
      animateBars();
    } else {
      var tbs = document.querySelector(".uv-tabs");
      if (tbs) setChart(getChartType(), tbs);
    }
  }
  window.scrollTo(0, 0);
}

export function showProfile(boardId, user) {
  session.profileView = { boardId: boardId, user: user };
  session.currentView = boardId;
  renderNav();
  render();
}

export function showMyProfile() {
  /* los anonimos no tienen perfil propio: se abren el registro/login */
  if (isAnon()) {
    openAuth();
    return;
  }
  if (session.currentView !== "home") session.lastBoard = session.currentView;
  session.myProfileView = true;
  session.profileView = null;
  refreshChip();
  renderNav();
  render();
}