/* ===== relays Nostr: publica posts (texto e imagen) de ForosRaiz =====
   Reusa el stack del repo local /home/eynor/Documents/proyectsTT/blog:
   nostr-tools SimplePool + finalizeEvent. Los posts de usuarios registrados
   se firman con su clave nsec y se guardan en los relays. */
import { loadNostrLib } from "./nostr-lib.js";
import { getActiveSec } from "./nostr.js";

export const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://nostr.mom",
  "wss://relay.ditto.pub",
];

export const POST_KIND = 33033;   /* kind propio de ForosRaiz */
export const POST_DTAG = "forosraiz-post-v1";

var pool = null;

function getPool() {
  return loadNostrLib().then(function (lib) {
    if (!pool) pool = new lib.SimplePool();
    return { lib, pool };
  });
}

/* publica un post de ForosRaiz a los relays.
   input: { board, no, content, image, replyTo } (replyTo opcional: no del hilo)
   Devuelve Promise<number> = cantidad de relays que confirmaron. */
export function publishPost(input) {
  return getPool().then(function () {
    var sec = getActiveSec();
    if (!sec) return Promise.resolve(0);
    return loadNostrLib().then(function (lib) {
      var now = Math.floor(Date.now() / 1000);
      var tags = [
        ["d", POST_DTAG + ":" + input.board + ":" + input.no],
        ["t", "forosraiz"],
        ["t", input.board],
        ["board", input.board],
      ];
      if (input.replyTo) tags.push(["e", "", "", "reply"]);
      if (input.image) tags.push(["imeta", "url " + input.image]);
      var content = input.content || "";
      if (input.image && input.content.indexOf(input.image) < 0) {
        content = content + "\n" + input.image;
      }
      var draft = { kind: POST_KIND, created_at: now, tags: tags, content: content };
      var event = lib.finalizeEvent(draft, sec);
      return Promise.all(pool.publish(RELAYS, event)).then(function (results) {
        return results.filter(Boolean).length;
      }).catch(function () { return 0; });
    });
  });
}

/* publica el perfil (kind 0, NIP-01) del usuario a los relays para que sea
   localizable por su npub. input: { name, picture } */
export function publishProfile(input) {
  return getPool().then(function () {
    var sec = getActiveSec();
    if (!sec) return Promise.resolve(0);
    return loadNostrLib().then(function (lib) {
      var now = Math.floor(Date.now() / 1000);
      var content = JSON.stringify({
        name: input.name,
        display_name: input.name,
        picture: input.picture || "",
        about: "Perfil de ForosRaiz"
      });
      var draft = { kind: 0, created_at: now, tags: [], content: content };
      var event = lib.finalizeEvent(draft, sec);
      return Promise.all(pool.publish(RELAYS, event)).then(function (results) {
        return results.filter(Boolean).length;
      }).catch(function () { return 0; });
    });
  });
}

/* busca posts de un usuario en los relays por su pubkey (limit opcional).
   Devuelve Promise<Array<{board,no,content,image,created_at,replyTo}>>. */
export function fetchUserPosts(pubkeyHex, limit) {
  return getPool().then(function () {
    return loadNostrLib().then(function (lib) {
      return pool.querySync(RELAYS, {
        kinds: [POST_KIND],
        authors: [pubkeyHex],
        limit: limit || 50
      }, { maxWait: 8000 }).catch(function () { return []; }).then(function (events) {
        var out = [];
        events.forEach(function (ev) {
          try { if (!lib.verifyEvent(ev)) return; } catch (e) { return; }
          var dTag = ev.tags.find(function (t) { return t[0] === "d"; });
          var board = "g";
          var no = ev.created_at;
          if (dTag) {
            var parts = (dTag[1] || "").split(":");
            if (parts.length >= 3 && parts[0] === POST_DTAG) {
              board = parts[1];
              no = parseInt(parts[2], 10) || ev.created_at;
            }
          }
          var boardTag = ev.tags.find(function (t) { return t[0] === "board"; });
          if (boardTag && boardTag[1]) board = boardTag[1];
          var replyTo = null;
          var eTag = ev.tags.find(function (t) { return t[0] === "e"; });
          if (eTag) replyTo = eTag[1] || null;
          var image = null;
          var im = ev.tags.find(function (t) { return t[0] === "imeta"; });
          if (im) {
            var m = /url (\S+)/.exec(im[1] || "");
            if (m) image = m[1];
          }
          out.push({
            board: board,
            no: no,
            content: ev.content,
            image: image,
            created_at: ev.created_at,
            replyTo: replyTo
          });
        });
        out.sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
        return out;
      });
    });
  });
}