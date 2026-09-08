/* ===== colaboradores por foro: usuarios aprobados por el admin =====
   La lista se llena con los colabs que el admin (Admin_forum) marca como
   'collab' o 'admin' en el evento kind 39001. El nombre y avatar se traen
   desde los relays (kind 0). Los usuarios registrados que eligen un foro
   principal (db.js isCollab/mainForum) siguen apareciendo en su foro. */
import { collabsByAdmin, adminsByAdmin } from "./moderation.js";
import { fetchProfiles } from "../utils/relays.js";

var profileCache = {};            /* pubHex -> { name, picture, desc, socials } */
var loadedHexes = [];             /* hexes cuyos perfiles ya se pidieron */
var onLoad = null;                /* callback cuando llegan perfiles */

export function setCollabsLoaded(cb) { onLoad = cb; }

/* los pubkeys de colaboradores y admins aprobados por el admin */
export function approvedPubkeys() {
  var out = [];
  var seen = {};
  collabsByAdmin().concat(adminsByAdmin()).forEach(function (hex) {
    if (!seen[hex]) { seen[hex] = true; out.push(hex); }
  });
  return out;
}

/* perfiles en cache o placeholders; pide los que falten a los relays */
function resolve(pubHex) {
  if (profileCache[pubHex]) return profileCache[pubHex];
  profileCache[pubHex] = { name: pubHex.slice(0, 10), picture: null, desc: null, socials: [] };
  if (loadedHexes.indexOf(pubHex) < 0) {
    loadedHexes.push(pubHex);
    fetchProfiles([pubHex]).then(function (map) {
      var p = map[pubHex];
      if (p) {
        profileCache[pubHex] = {
          name: p.name || pubHex.slice(0, 10),
          picture: p.picture || null,
          desc: p.desc || null,
          socials: p.socials || []
        };
      }
      if (onLoad) onLoad();
    }).catch(function () {});
  }
  return profileCache[pubHex];
}

/* colaboradores de un board: los aprobados por el admin (todos) + el propio
   usuario si tiene ese board como principal. */
export function getCollabs(boardId) {
  var out = [];
  approvedPubkeys().forEach(function (hex) {
    var p = resolve(hex);
    out.push({
      pubHex: hex,
      name: p.name || hex.slice(0, 10),
      icon: p.picture || null,
      desc: p.desc || null,
      socials: p.socials || []
    });
  });
  return out;
}

/* publica el perfil KIND 0 con redes y descripcion para que los demas
   usuarios vean el modulo /publico/ del perfil. */
export function publishCollabProfile() {
  import("./db.js").then(function (db) {
    var me = db.getMe();
    if (!me) return;
    import("../utils/relays.js").then(function (r) {
      r.publishProfile({ name: me.name, picture: me.icon || null, desc: me.desc, socials: me.socials || [] });
    }).catch(function () {});
  }).catch(function () {});
}

/* devuelve todos los perfiles ya resueltos (para re-render rapido) */
export function collabProfile(hex) {
  return resolve(hex);
}

/* fetch completo por Promise: espera a que el perfil llegue de relays y
   devuelve {name, picture, desc, socials} (con valores de cache si falla). */
export function fetchCollabProfile(hex) {
  return new Promise(function (res) {
    var snapshot = function () {
      res(JSON.parse(JSON.stringify(collabProfile(hex))));
    };
    if (loadedHexes.indexOf(hex) < 0) {
      loadedHexes.push(hex);
      fetchProfiles([hex]).then(function (map) {
        var p = map[hex];
        if (p) {
          profileCache[hex] = {
            name: p.name || hex.slice(0, 10),
            picture: p.picture || null,
            desc: p.desc || null,
            socials: p.socials || []
          };
        }
        snapshot();
        if (onLoad) onLoad();
      }).catch(function () { snapshot(); });
    } else {
      snapshot();
    }
  });
}