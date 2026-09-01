/* ===== cascara de la app: puente de navegacion/refresh para evitar ciclos ===== */
var hooks = { navTo: null, refresh: null, openProfile: null, openMine: null };

export function setHooks(h) {
  hooks.navTo = h.navTo;
  hooks.refresh = h.refresh;
  hooks.openProfile = h.openProfile;
  hooks.openMine = h.openMine;
}

export function navTo(view) { if (hooks.navTo) hooks.navTo(view); }
export function refresh() { if (hooks.refresh) hooks.refresh(); }
export function openProfile(boardId, user) { if (hooks.openProfile) hooks.openProfile(boardId, user); }
export function openMine() { if (hooks.openMine) hooks.openMine(); }