/* ===== claves Nostr reales: generacion e importacion con nostr-tools (NIP-19) =====
   Usa la misma libreria que el repo local /home/eynor/Documents/proyectsTT/blog
   (nostr-tools cargado por CDN). Genera/decodifica claves nsec/npub reales. */
import { loadNostrLib, getNip19 } from "./nostr-lib.js";

/* cache de la clave secreta del usuario (para firmar posts a relays) */
var activeSec = null;   /* Uint8Array (32 bytes) de la clave privada actual */
var activeHex = null;   /* pubHex correspondiente */

function bytesToB64(bytes) {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export function getActiveSec() { return activeSec; }

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

export function getActivePubHex() { return activeHex; }

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