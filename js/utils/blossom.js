/* ===== subida de imagenes a Blossom (NIP-98) =====
   Portado del repo local /home/eynor/Documents/proyectsTT/blog.
   Firma la autorizacion con la nsec del usuario activo y sube la imagen a
   servidores Blossom, devolviendo la URL publica (asi persiste en la red). */
import { loadNostrLib } from "./nostr-lib.js";
import { getActiveSec } from "./nostr.js";

export const BLOSSOM_SERVERS = [
  "https://blossom.primal.net",
  "https://blossom.nostr.build",
  "https://blossom.band",
  "https://nostr.download",
  "https://cdn.nostrcheck.me",
];

function sha256Hex(bytes) {
  return crypto.subtle.digest("SHA-256", bytes).then(function (digest) {
    return Array.prototype.slice.call(new Uint8Array(digest))
      .map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  });
}

function b64Utf8(str) {
  var bytes = new TextEncoder().encode(str);
  var binary = "";
  bytes.forEach(function (b) { binary += String.fromCharCode(b); });
  return btoa(binary);
}

/* fetch con timeout: si un servidor Blossom se cuelga, aborta rapido y la
   cadena pasa al siguiente servidor en vez de quedarse esperando para siempre. */
function fetchTimeout(url, options, ms) {
  if (typeof AbortController === "undefined") return fetch(url, options);
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, ms);
  return fetch(url, options).then(function (res) {
    clearTimeout(timer);
    return res;
  }, function (err) {
    clearTimeout(timer);
    throw err;
  });
}

/* sube una imagen a Blossom. devuelve Promise<url> */
export function uploadImage(file, onProgress) {
  return loadNostrLib().then(function (lib) {
    var sec = getActiveSec();
    if (!sec) throw new Error("sesion no iniciada");
    return file.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      if (bytes.length > 20 * 1024 * 1024) throw new Error("archivo mayor a 20 MB");
      return sha256Hex(bytes).then(function (hash) {
        var now = Math.floor(Date.now() / 1000);
        var draft = {
          kind: 24242,
          created_at: now,
          tags: [
            ["t", "upload"],
            ["x", hash],
            ["expiration", String(now + 3600)]
          ],
          content: "Subida de imagen para ForosRaiz"
        };
        var signed = lib.finalizeEvent(draft, sec);
        var auth = "Nostr " + b64Utf8(JSON.stringify(signed));
        var contentType = file.type || "application/octet-stream";
        var lastError = null;
        var chain = BLOSSOM_SERVERS.reduce(function (acc, server) {
          return acc.catch(function (err) {
            lastError = err;
            if (onProgress) onProgress("Subiendo a " + server.replace("https://", "") + "...");
            return fetchTimeout(server + "/upload", {
              method: "PUT",
              headers: { Authorization: auth, "Content-Type": contentType },
              body: bytes
            }, 15000).then(function (res) {
              if (!res.ok) throw new Error(server + " respondio " + res.status);
              return res.json().then(function (data) {
                if (data.url) return data.url;
                return server + "/" + hash;
              });
            });
          });
        }, Promise.reject(lastError));
        return chain.catch(function () {
          throw lastError || new Error("ningun servidor Blossom disponible");
        });
      });
    });
  });
}