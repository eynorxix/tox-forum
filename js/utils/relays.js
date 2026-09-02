/* ===== relays Nostr: publicacion y consulta de posts de ForosRaiz =====
   Basado en el stack del repo local /home/eynor/Documents/proyectsTT/blog:
   nostr-tools SimplePool + finalizeEvent (portado).

   Cambios respecto a la version anterior:
   - La publicacion confirma cada relay por separado (un relay caido ya no
     tumba la publicacion completa), con timeout, como hace el blog.
   - Los posts se pueden LEER de vuelta de los relays (fetchBoardPosts /
     fetchUserPosts / fetchNames), de modo que Nostr actua como capa de
     persistencia de las publicaciones de usuarios registrados.
   - Las respuestas llevan la etiqueta "rt" = numero local del hilo para
     poder reconstruirlas en esta y otras instancias. */
import { loadNostrLib } from "./nostr-lib.js";
import { getActiveSec } from "./nostr.js";

export const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://nostr.mom",
  "wss://relay.ditto.pub",
  "wss://antiprimal.net",
];

export const POST_KIND = 33033;   /* kind propio de ForosRaiz */
export const POST_DTAG = "forosraiz-post-v1";

var pool = null;

function getPool() {
  return loadNostrLib().then(function (lib) {
    if (!pool) pool = new lib.SimplePool();
    return { lib: lib, pool: pool };
  });
}

/* firma (si hay clave activa) y publica un evento a los relays.
   Devuelve Promise<number> = cuantos relays confirmaron. */
function doPublish(draft) {
  var sec = getActiveSec();
  if (!sec) return Promise.resolve(0);
  return getPool().then(function (p) {
    var event = p.lib.finalizeEvent(draft, sec);
    var promises = p.pool.publish(RELAYS, event).map(function (pr) {
      return new Promise(function (resolve) {
        var settled = false;
        var timer = setTimeout(function () {
          if (!settled) { settled = true; resolve(false); }
        }, 9000);
        pr.then(function (ok) {
          if (!settled) { settled = true; clearTimeout(timer); resolve(!!ok); }
        }).catch(function () {
          if (!settled) { settled = true; clearTimeout(timer); resolve(false); }
        });
      });
    });
    return Promise.all(promises).then(function (oks) {
      return oks.filter(Boolean).length;
    });
  }).catch(function () { return 0; });
}

/* publica con un reintento: si ningun relay confirmo, espera 4s y lo intenta
   una vez mas. Asi un relay caido en ese momento no pierde el post. */
function pubWithRetry(draft) {
  var attempt = 0;
  var tx = function () {
    return doPublish(draft).then(function (ok) {
      if (ok === 0 && attempt < 1) {
        attempt++;
        return new Promise(function (res) {
          setTimeout(function () { res(tx()); }, 4000);
        });
      }
      return ok;
    });
  };
  return tx();
}

/* sal por instalacion: hace el d-tag unico por navegador aunque el contador
   de 'no' coincida en dos dispositivos de la misma cuenta. Sin esto, los
   relays (kind 33033 = addressable) REMPLAZAN el post publicado desde el
   otro navegador y los posts se "eliminan" solos. */
var PUB_SALT = null;
function pubSalt() {
  if (PUB_SALT) return PUB_SALT;
  try {
    PUB_SALT = localStorage.getItem("forosraiz_pub_salt");
    if (!PUB_SALT) {
      PUB_SALT = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("forosraiz_pub_salt", PUB_SALT);
    }
  } catch (e) {
    PUB_SALT = Math.random().toString(36).slice(2);
  }
  return PUB_SALT;
}

/* publica un post de ForosRaiz a los relays.
   input: { board, no, content, image, replyTo } (replyTo opcional: no del hilo)
   Devuelve Promise<number> = relays que confirmaron (0 = ninguno). */
export function publishPost(input) {
  var now = Math.floor(Date.now() / 1000);
  var tags = [
    ["d", POST_DTAG + ":" + input.board + ":" + input.no + ":" + pubSalt()],
    ["t", "forosraiz"],
    ["t", input.board],
    ["board", input.board]
  ];
  if (input.replyTo) tags.push(["rt", String(input.replyTo)]);
  if (input.image) tags.push(["imeta", "url " + input.image]);
  var content = input.content || "";
  if (input.image && content.indexOf(input.image) < 0) {
    content = content + "\n" + input.image;
  }
  return pubWithRetry({ kind: POST_KIND, created_at: now, tags: tags, content: content });
}

/* publica el perfil (kind 0, NIP-01) del usuario a los relays.
   input: { name, picture } */
export function publishProfile(input) {
  var now = Math.floor(Date.now() / 1000);
  var content = JSON.stringify({
    name: input.name,
    display_name: input.name,
    picture: input.picture || "",
    about: "Perfil de ForosRaiz"
  });
  return pubWithRetry({ kind: 0, created_at: now, tags: [], content: content });
}

/* ---------- consultas (lectura de vuelta) ---------- */

function queryEvents(filter, opts) {
  return getPool().then(function (p) {
    return p.pool.querySync(RELAYS, filter, { maxWait: (opts && opts.maxWait) || 7000 });
  });
}

/* valida un evento POST_KIND y lo deja en forma util para el tablero. */
function parsePostEvent(lib, ev) {
  try {
    if (!lib.verifyEvent(ev)) return null;
  } catch (e) { return null; }
  var dTag = ev.tags.find(function (t) { return t[0] === "d"; });
  var board = "g";
  var no = 0;
  if (dTag) {
    var parts = (dTag[1] || "").split(":");
    if (parts.length >= 3 && parts[0] === POST_DTAG) {
      board = parts[1];
      no = parseInt(parts[2], 10);
    }
  }
  if (!no) return null;
  var bTag = ev.tags.find(function (t) { return t[0] === "board"; });
  if (bTag && bTag[1]) board = bTag[1];
  var threadNo = null;
  var rt = ev.tags.find(function (t) { return t[0] === "rt"; });
  if (rt && rt[1]) threadNo = parseInt(rt[1], 10) || null;
  var image = null;
  var im = ev.tags.find(function (t) { return t[0] === "imeta"; });
  if (im) {
    var m = /url (\S+)/.exec(im[1] || "");
    if (m) image = m[1];
  }
  var content = ev.content || "";
  if (image && content.indexOf(image) >= 0) {
    content = content.split("\n").filter(function (l) { return l.trim() !== image; }).join("\n").trim();
  }
  return {
    id: ev.id,
    pubkey: ev.pubkey,
    board: board,
    no: no,
    threadNo: threadNo,
    content: content,
    image: image,
    created_at: ev.created_at
  };
}

/* posts (hilos y respuestas) de un foro, ordenados por fecha. */
export function fetchBoardPosts(boardId, limit) {
  return queryEvents({ kinds: [POST_KIND], "#board": [boardId], limit: limit || 200 })
    .then(function (events) {
      return getPool().then(function (p) {
        var out = [];
        events.forEach(function (ev) {
          var post = parsePostEvent(p.lib, ev);
          if (post && post.board === boardId) out.push(post);
        });
        out.sort(function (a, b) { return (a.created_at || 0) - (b.created_at || 0); });
        return out;
      });
    })
    .catch(function () { return []; });
}

/* todos los posts de un usuario (pubHex) en todos los foros. */
export function fetchUserPosts(pubkeyHex, limit) {
  return queryEvents({ kinds: [POST_KIND], authors: [pubkeyHex], limit: limit || 100 })
    .then(function (events) {
      return getPool().then(function (p) {
        var out = [];
        events.forEach(function (ev) {
          var post = parsePostEvent(p.lib, ev);
          if (post) out.push(post);
        });
        out.sort(function (a, b) { return (a.created_at || 0) - (b.created_at || 0); });
        return out;
      });
    })
    .catch(function () { return []; });
}

/* suscripcion en vivo a un foro: trae los posts que ya estan en los relays
   (salida inicial) y los que otros usuarios publiquen en tiempo real.
   Devuelve Promise<closer> (con .close()). Mismo patron que subscribeBlogState
   del blog: con esto los foros conectan a mucha gente a traves de los relays. */
export function subscribeBoardPosts(boardId, onEvent) {
  return getPool().then(function (p) {
    var seen = {};
    return p.pool.subscribeMany(
      RELAYS,
      [{ kinds: [POST_KIND], "#board": [boardId] }],
      {
        onevent: function (ev) {
          try {
            if (!p.lib.verifyEvent(ev)) return;
          } catch (e) { return; }
          if (seen[ev.id]) return;
          seen[ev.id] = true;
          var post = parsePostEvent(p.lib, ev);
          if (post && post.board === boardId) onEvent(post);
        },
        maxWait: 9000
      }
    );
  });
}

/* nombres (kind 0) para una lista de pubkeys. Devuelve Promise<map pubkey->name>. */
export function fetchNames(pubkeys) {
  var keys = pubkeys || [];
  if (!keys.length) return Promise.resolve({});
  return queryEvents({ kinds: [0], authors: keys, limit: keys.length * 2 }, { maxWait: 5000 })
    .then(function (events) {
      var newest = {};
      var names = {};
      events.forEach(function (ev) {
        var created = ev.created_at || 0;
        if (newest[ev.pubkey] !== undefined && created < newest[ev.pubkey]) return;
        newest[ev.pubkey] = created;
        names[ev.pubkey] = ev.pubkey.slice(0, 8);
        try {
          var data = (typeof ev.content === "string") ? JSON.parse(ev.content) : null;
          if (data && (data.display_name || data.name)) {
            names[ev.pubkey] = data.display_name || data.name;
          }
        } catch (e) { /* usa pubkey corto */ }
      });
      return names;
    })
    .catch(function () { return {}; });
}