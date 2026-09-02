/* ===== claves Nostr reales: generacion e importacion con nostr-tools (NIP-19) =====
   Usa la misma libreria que el repo local /home/eynor/Documents/proyectsTT/blog
   (nostr-tools cargado por CDN). Genera/decodifica claves nsec/npub reales. */
import { loadNostrLib, getNip19 } from "./nostr-lib.js";

/* cache de la clave secreta del usuario (para firmar posts a relays) */
var activeSec = null;   /* Uint8Array (32 bytes) de la clave privada actual */
var activeHex = null;   /* pubHex correspondiente */

/* identidad anonima persistente por dispositivo: sin login de usuario, igual se
   puede publicar y persistir a los relays. Se genera una sola vez por navegador. */
var ANON_KEY = "forosraiz_anon_keys";

function bytesToB64(bytes) {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function b64ToBytes(b64) {
  try {
    return new Uint8Array(atob(b64).split("").map(function (c) { return c.charCodeAt(0); }));
  } catch (e) { return null; }
}

/* prepara (o restaura) las claves anonimas de este dispositivo. Devuelve
   Promise<boolean>. No es un login: es solo la identidad anonima local. */
export function ensureAnonKeys() {
  return loadNostrLib().then(function (lib) {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(ANON_KEY) || "null"); } catch (e) {}
    if (raw && raw.secB64 && raw.pubHex) {
      var sk = b64ToBytes(raw.secB64);
      if (sk && sk.length === 32) {
        activeSec = sk;
        activeHex = raw.pubHex;
        return true;
      }
    }
    var sk2 = lib.generateSecretKey();
    var pub = lib.getPublicKey(sk2);
    activeSec = sk2;
    activeHex = pub;
    try {
      localStorage.setItem(ANON_KEY, JSON.stringify({
        secB64: bytesToB64(sk2),
        pubHex: pub
      }));
    } catch (e) {}
    return true;
  }).catch(function () { return false; });
}

export function getActiveSec() {
  return activeSec || null;
}

export function getActivePubHex() { return activeHex || null; }

/* al arrancar, si el usuario es anonimo (sin sesion) preparamos su
   identidad anonima local para que pueda publicar y persistir. */
export function activateAnonIfNoUser() {
  if (activeSec) return Promise.resolve(true);
  return ensureAnonKeys();
}

/* genera un par de claves reales: { nsec, npub, pubHex } */
export function generateKeys() {
  return loadNostrLib().then(function (lib) {
    var sk = lib.generateSecretKey();
    var pub = lib.getPublicKey(sk);
    activeSec = sk;
    activeHex = pub;
    return getNip19().then(function (nip19) {
      return {
        nsec: nip19.nsecEncode(sk),
        npub: nip19.npubEncode(pub),
        pubHex: pub,
        sec: bytesToB64(sk)
      };
    });
  });
}

/* importa una clave nsec real (devuelve { nsec, npub, pubHex }) o lanza error */
export function importNsec(nsecStr) {
  return loadNostrLib().then(function (lib) {
    return getNip19().then(function (nip19) {
      var decoded = nip19.decode(nsecStr.trim().toLowerCase());
      if (!decoded || decoded.type !== "nsec") throw new Error("clave nsec no valida");
      var sk = decoded.data;
      var pub = lib.getPublicKey(sk);
      activeSec = sk;
      activeHex = pub;
      return {
        nsec: nip19.nsecEncode(sk),
        npub: nip19.npubEncode(pub),
        pubHex: pub,
        sec: bytesToB64(sk)
      };
    });
  });
}

/* marca la clave activa a partir de una ya conocida (para firmar posteos) */
export function setActiveKeys(sec, pubHex) {
  activeSec = sec;
  activeHex = pubHex;
}

/* al cerrar sesion la clave activa de usuario se descarta; el siguiente posteo
   anonimo volvera a usar (o a preparar) la identidad anonima del dispositivo. */
export function clearActiveKeys() {
  activeSec = null;
  activeHex = null;
}

/* restaura la clave activa desde base64 almacenada (para sesiones persistentes) */
export function activateFromB64(b64, pubHex) {
  try {
    if (!b64) return false;
    var bytes = new Uint8Array(atob(b64).split("").map(function (c) { return c.charCodeAt(0); }));
    if (bytes.length !== 32) return false;
    activeSec = bytes;
    activeHex = pubHex || null;
    return true;
  } catch (e) {
    return false;
  }
}

export { bytesToB64 };