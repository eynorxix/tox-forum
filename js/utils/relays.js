/* ===== relays Nostr: persistencia de posts de ForosRaiz (modelo tipo blog) =====
   Patron, portado de /home/eynor/Documents/proyectsTT/blog:

   En vez de publicar un evento por post (que fallaba porque los relays rechazan
   el filtro "#board" con "unindexed tag filter"), CADA USUARIO publica TDOOS sus
   posts de UN foro en UN solo evento addressable (kind 33033) con d-tag FIJO:

       d-tag = forosraiz-post-v1:<board>

   Como es addressable y el d-tag es fijo por (autor, board), el relay guarda el
   snapshot MAS RECIENTE de cada autor en cada board (igual que el blog guarda
   todo su estado en "bento-blog-v1"). Asi se lee con "#d" (indexado por todos
   los relays) y no hace falta un tag personalizado.

   Lectura de un board  -> { kinds:[POST_KIND], '#d':[POST_DTAG+':'+board] }
   En vivo              -> suscripcion al mismo filtro, se funde cada snapshot.
   La UI (boards 4chan) NO cambia; solo cambia como se guarda/lee el historial. */
import { loadNostrLib } from "./nostr-lib.js";
import { getActiveSec } from "./nostr.js";
import { REG_KIND, REG_DTAG, FORUM_KIND, FORUM_DTAG } from "../config.js";

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
      var confirmed = oks.filter(Boolean).length;
      var dTag = "";
      (draft.tags || []).forEach(function (t) { if (t[0] === "d") dTag = t[1]; });
      console.log("[relays] publicado snapshot " + draft.kind + " d=" + dTag + " confirmado en " + confirmed + "/" + RELAYS.length + " relays");
      return confirmed;
    });
  }).catch(function () { return 0; });
}

/* publica con un reintento: si ningun relay confirmo, espera 4s y lo intenta
   una vez mas. Asi un relay caido en ese momento no pierde el snapshot. */
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

/* publica el snapshot completo de un usuario en un board (modelo blog).
   snap = { board, posts:[{no, rt, content, image, ts}], likes:["5","5/12"] }.
   (todos los posts del usuario en ese board, hilos y respuestas, y sus likes).
   d-tag FIJO por (autor, board).
   Devuelve Promise<number> = relays que confirmaron. */
export function publishBoardSnapshot(snap) {
  var now = Math.floor(Date.now() / 1000);
  var tags = [
    ["d", POST_DTAG + ":" + snap.board],
    ["t", "forosraiz"],
    ["t", snap.board],
    ["board", snap.board]
  ];
  var content = JSON.stringify({
    posts: snap.posts || [],
    likes: snap.likes || [],
    updated_at: now
  });
  return pubWithRetry({ kind: POST_KIND, created_at: now, tags: tags, content: content });
}

/* publica la lista amistosa del usuario actual (kind 3, NIP-02): los pubkeys
   que sigue. Tags p = lista de seguidos. Devuelve Promise<number> confirmed. */
export function publishContactList(pubkeys) {
  var now = Math.floor(Date.now() / 1000);
  var tags = (pubkeys || []).map(function (pk) { return ["p", pk]; });
  return pubWithRetry({ kind: 3, created_at: now, tags: tags, content: "" });
}

/* seguidores de un pubkey: cuenta los contact lists (kind 3) de otros usuarios
   que lo incluyen. Devuelve Promise<number>. */
export function fetchFollowerCount(pubHex) {
  if (!pubHex) return Promise.resolve(0);
  return queryEvents({ kinds: [3], "#p": [pubHex], limit: 200 }, { maxWait: 4000 })
    .then(function (events) {
      var authors = {};
      events.forEach(function (ev) {
        if (ev.pubkey && ev.pubkey !== pubHex) authors[ev.pubkey] = true;
      });
      return Object.keys(authors).length;
    }).catch(function () { return 0; });
}

/* lista de pubkeys que siguen a pubHex (autores de contact lists kind 3
   que incluyen a pubHex en sus tags p). Devuelve Promise<string[]>. */
export function fetchFollowerPubkeys(pubHex) {
  if (!pubHex) return Promise.resolve([]);
  return queryEvents({ kinds: [3], "#p": [pubHex], limit: 200 }, { maxWait: 4000 })
    .then(function (events) {
      var authors = {};
      events.forEach(function (ev) {
        if (ev.pubkey && ev.pubkey !== pubHex) authors[ev.pubkey] = true;
      });
      return Object.keys(authors);
    }).catch(function () { return []; });
}

/* publica el perfil (kind 0, NIP-01) del usuario a los relays.
   input: { name, picture, desc, socials } */
export function publishProfile(input) {
  var now = Math.floor(Date.now() / 1000);
  var content = JSON.stringify({
    name: input.name,
    display_name: input.name,
    picture: input.picture || "",
    about: input.desc || "Perfil de ForosRaiz",
    socials: (input.socials || []).map(function (s) {
      return { label: s.label || s[0] || "", url: s.url || s[1] || "" };
    })
  });
  return pubWithRetry({ kind: 0, created_at: now, tags: [], content: content });
}

/* publica el registro de usuario (kind 13370, addressable por usuario).
   input: { name, npub, pubHex, icon, mainForum, forums, desc }.
   Lo lee el panel de control (Admin_forum) para saber quien se registro. */
export function publishRegistration(input) {
  var now = Math.floor(Date.now() / 1000);
  var tags = [
    ["d", REG_DTAG],
    ["t", "forosraiz"],
    ["npub", input.npub || ""]
  ];
  var content = JSON.stringify({
    v: 1,
    name: input.name || "",
    icon: input.icon || null,
    desc: input.desc || null,
    mainForum: input.mainForum || null,
    forums: input.forums || [],
    updated_at: now
  });
  return pubWithRetry({ kind: REG_KIND, created_at: now, tags: tags, content: content });
}

/* publica un foro creado por un colaborador (kind 13371, addressable por foro).
   input: { id, name, status, ownerName }. Firmado por el creador (clave activa). */
export function publishForum(input) {
  var now = Math.floor(Date.now() / 1000);
  var tags = [
    ["d", FORUM_DTAG + ":" + input.id],
    ["t", "forosraiz"],
    ["board", input.id]
  ];
  var content = JSON.stringify({
    v: 1,
    id: input.id,
    name: input.name || "",
    status: input.status || "libre",
    ownerName: input.ownerName || "",
    created_at: now
  });
  return pubWithRetry({ kind: FORUM_KIND, created_at: now, tags: tags, content: content });
}

/* ---------- consultas (lectura de vuelta) ---------- */

/* consulta eventos a los relays acumulando durante un periodo, y reintenta una
   vez si no llego nada. `querySync` (nostr-tools) resuelve al cerrarse la
   suscripcion (EOSE o timeout) y puede devolver vacio con conexion fria: por
   eso aqui se da tiempo de sobra y un segundo intento, para que un visitante
   nuevo con relays frios SI traiga el historial. Devuelve Promise<Event[]>. */
export function queryEvents(filter, opts) {
  var wait = (opts && opts.maxWait) || 12000;
  var attempts = (opts && opts.attempts) || 2;
  function once() {
    return getPool().then(function (p) {
      return Promise.race([
        p.pool.querySync(RELAYS, filter, { maxWait: wait }),
        new Promise(function (res) { setTimeout(function () { res([]); }, wait + 1500); })
      ]);
    }).catch(function () { return []; });
  }
  return once().then(function (first) {
    if (first && first.length) return first;
    if (attempts > 1) return once();
    return first;
  });
}

/* extrae los posts del snapshot addressable de un usuario en un board.
   Cada snapshot (content JSON con "posts") expone los posts de ESE autor.
   Devuelve array de {pubkey, no, threadNo, content, image, created_at}. */
function parseSnapshot(lib, ev) {
  try {
    if (!lib.verifyEvent(ev)) return [];
  } catch (e) { return []; }
  var dTag = ev.tags.find(function (t) { return t[0] === "d"; });
  var board = "g";
  if (dTag) {
    var parts = (dTag[1] || "").split(":");
    if (parts.length >= 2 && parts[0] === POST_DTAG) board = parts[1];
  }
 var data = null;
  try {
    data = (typeof ev.content === "string") ? JSON.parse(ev.content) : null;
  } catch (e) { return []; }
  var rawPosts = (data && Array.isArray(data.posts)) ? data.posts : [];
  var out = [];
  rawPosts.forEach(function (p) {
    if (!p || !p.no) return;
    out.push({
      pubkey: ev.pubkey,
      board: board,
      no: p.no,
      threadNo: (p.rt != null) ? p.rt : null,
      content: p.content || "",
      image: p.image || null,
      created_at: p.ts ? Math.floor(p.ts / 1000) : ev.created_at
    });
  });
  return out;
}

/* extrae las keys de like relativas al board desde el contenido de un snapshot.
   Devuelve array de strings como ["5", "5/12"]. */
function snapshotLikes(lib, ev) {
  try {
    if (!lib.verifyEvent(ev)) return [];
  } catch (e) { return []; }
  var data = null;
  try {
    data = (typeof ev.content === "string") ? JSON.parse(ev.content) : null;
  } catch (e) { return []; }
  var likes = (data && Array.isArray(data.likes)) ? data.likes : [];
  return likes.filter(function (k) { return typeof k === "string" && k; });
}

/* snapshots addressable de un board (los mas recientes de cada autor).
   Devuelve array de {pubkey, boardD, created_at, posts:[...]}. */
function fetchBoardSnapshots(boardId, limit) {
  var filter = { kinds: [POST_KIND], "#d": [POST_DTAG + ":" + boardId], limit: limit || 400 };
  return queryBySubscription(filter, 10000);
}

/* consulta puntual por suscripcion acumulativa: abre la misma suscripcion que
   el en vivo, deja que los relays envien la salida inicial durante unos
   segundos y luego cierra. Devuelve Promise<Event[]> sin duplicados. */
function queryBySubscription(filter, wait) {
  return getPool().then(function (p) {
    return new Promise(function (resolve) {
      var seen = {};
      var events = [];
      var timer = null;
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        try { closer.close(); } catch (e) {}
        resolve(events);
      }
      var closer = null;
      closer = p.pool.subscribeMany(RELAYS, [filter], {
        onevent: function (ev) {
          try {
            if (!p.lib.verifyEvent(ev)) return;
          } catch (e) { return; }
          if (seen[ev.id]) return;
          seen[ev.id] = true;
          events.push(ev);
        },
        maxWait: wait || 10000
      });
      timer = setTimeout(finish, (wait || 10000) + 1500);
    });
  }).catch(function () { return []; });
}

/* posts (hilos y respuestas) de un foro, ordenados por fecha. Lee los snapshots
   addressable por "#d" (indexado por todos los relays) y expande los posts de
   cada autor. NOTA: si dos snapshots del mismo autor llegan en un limit, se
   toma el mas reciente por autor para no duplicar. */
export function fetchBoardPosts(boardId, limit) {
  return fetchBoardSnapshots(boardId, limit).then(function (events) {
    return getPool().then(function (p) {
      var newestByAuthor = {};
      events.forEach(function (ev) {
        var prev = newestByAuthor[ev.pubkey];
        if (prev && ev.created_at < prev.created_at) return;
        newestByAuthor[ev.pubkey] = ev;
      });
      var out = [];
      var likesData = {};
      Object.keys(newestByAuthor).forEach(function (pub) {
        var ev = newestByAuthor[pub];
        parseSnapshot(p.lib, ev).forEach(function (post) {
          if (post.board === boardId) out.push(post);
        });
        snapshotLikes(p.lib, ev).forEach(function (relKey) {
          var fullKey = boardId + "/" + relKey;
          if (!likesData[fullKey]) likesData[fullKey] = [];
          likesData[fullKey].push(pub);
        });
      });
      out.sort(function (a, b) { return (a.created_at || 0) - (b.created_at || 0); });
      console.log("[relays] fetchBoardPosts(" + boardId + ") -> " + out.length + " posts, " + Object.keys(likesData).length + " liked keys");
      return { posts: out, likesData: likesData };
    });
  })
  .catch(function () { console.warn("[relays] error fetchBoardPosts(" + boardId + ")", arguments); return { posts: [], likesData: {} }; });
}

/* todos los posts de un usuario (pubHex) en todos los foros: lee todos sus
   snapshots (todos los d-tags de ese autor) y expande los posts. */
export function fetchUserPosts(pubkeyHex, limit) {
  return getPool().then(function (p) {
    return queryBySubscription({ kinds: [POST_KIND], authors: [pubkeyHex], limit: limit || 400 }, 10000)
      .then(function (events) {
        var newestByBoard = {};
        events.forEach(function (ev) {
          var dTag = ev.tags.find(function (t) { return t[0] === "d"; });
          var key = dTag ? dTag[1] : ("?:" + ev.created_at);
          var prev = newestByBoard[key];
          if (prev && ev.created_at < prev.created_at) return;
          newestByBoard[key] = ev;
        });
        var out = [];
        Object.keys(newestByBoard).forEach(function (key) {
          parseSnapshot(p.lib, newestByBoard[key]).forEach(function (post) { out.push(post); });
        });
        out.sort(function (a, b) { return (a.created_at || 0) - (b.created_at || 0); });
        return out;
      });
  }).catch(function () { return []; });
}

/* suscripcion en vivo a un foro: trae los snapshots (salida inicial) y los que
   publiquen otros usuarios en tiempo real. Es el MISMO filtro #d que la carga.
   onPosts(array) se llama con los posts expandidos de cada snapshot recibido.
   Devuelve Promise<closer> (con .close()). */
export function subscribeBoardPosts(boardId, onPosts) {
  return getPool().then(function (p) {
    var seen = {};
    return p.pool.subscribeMany(
      RELAYS,
      [{ kinds: [POST_KIND], "#d": [POST_DTAG + ":" + boardId] }],
      {
        onevent: function (ev) {
          try {
            if (!p.lib.verifyEvent(ev)) return;
          } catch (e) { return; }
          if (seen[ev.id]) return;
          seen[ev.id] = true;
          var posts = parseSnapshot(p.lib, ev).filter(function (post) { return post.board === boardId; });
          var likesData = {};
          snapshotLikes(p.lib, ev).forEach(function (relKey) {
            var fullKey = boardId + "/" + relKey;
            likesData[fullKey] = [ev.pubkey];
          });
          if (posts.length || Object.keys(likesData).length) onPosts({ posts: posts, likesData: likesData });
        },
        maxWait: 9000
      }
    );
  });
}

/* suscripcion en vivo generica a un tipo de evento (se usa para la lista de
   baneos del admin: kind 39000 firmado por ADMIN_NPUB). Mismo patron que
   subscribeBoardPosts. Devuelve Promise<closer> con .close(). */
export function subscribeKindEvents(filter, onEvent) {
  return getPool().then(function (p) {
    var seen = {};
    return p.pool.subscribeMany(
      RELAYS,
      [filter],
      {
        onevent: function (ev) {
          try {
            if (!p.lib.verifyEvent(ev)) return;
          } catch (e) { return; }
          if (seen[ev.id]) return;
          seen[ev.id] = true;
          onEvent(ev);
        },
        maxWait: 9000
      }
    );
  });
}

/* nombres (kind 0) para una lista de pubkeys. Devuelve Promise<map pubkey->name>. */
export function fetchNames(pubkeys) {
  return fetchProfiles(pubkeys).then(function (map) {
    var names = {};
    Object.keys(map).forEach(function (hex) { names[hex] = map[hex].name; });
    return names;
  });
}

/* perfiles (kind 0) para una lista de pubkeys.
   Devuelve Promise<map pubkey->{name, picture, desc, socials}>. */
export function fetchProfiles(pubkeys) {
  var keys = (pubkeys || []).filter(function (k) { return k; });
  if (!keys.length) return Promise.resolve({});
  var unique = [];
  keys.forEach(function (k) { if (unique.indexOf(k) < 0) unique.push(k); });
  return queryEvents({ kinds: [0], authors: unique, limit: unique.length * 2 }, { maxWait: 5000 })
    .then(function (events) {
      var newest = {};
      var out = {};
      unique.forEach(function (hex) {
        out[hex] = { name: hex.slice(0, 8), picture: null, desc: null, socials: [] };
      });
      events.forEach(function (ev) {
        var created = ev.created_at || 0;
        if (newest[ev.pubkey] !== undefined && created < newest[ev.pubkey]) return;
        newest[ev.pubkey] = created;
        var entry = out[ev.pubkey] || {
          name: ev.pubkey.slice(0, 8),
          picture: null,
          desc: null,
          socials: []
        };
        try {
          var data = (typeof ev.content === "string") ? JSON.parse(ev.content) : null;
          if (data) {
            if (data.display_name || data.name) entry.name = data.display_name || data.name;
            if (data.picture) entry.picture = data.picture;
            if (data.about) entry.desc = data.about;
            if (Array.isArray(data.socials)) {
              entry.socials = data.socials.map(function (s) {
                return {
                  label: (s && s.label) || (Array.isArray(s) && s[0]) || "",
                  url: (s && s.url) || (Array.isArray(s) && s[1]) || ""
                };
              }).filter(function (s) { return s.label && s.url; });
            }
          }
        } catch (e) { /* usa pubkey corto */ }
        out[ev.pubkey] = entry;
      });
      return out;
    })
    .catch(function () {
      var out = {};
      unique.forEach(function (hex) {
        out[hex] = { name: hex.slice(0, 8), picture: null, desc: null, socials: [] };
      });
      return out;
    });
}

/* todos los foros creados por colaboradores (kind 13371) publicados en los
   relays. Cada evento addressable tiene #d 'forosraiz-forum-v1:<id>'; se toma
   el mas reciente por foro. Devuelve Promise<array de {id,name,status,ownerName,
   ownerPub,created_at}> (los mas recientes de cada autor/foro). */
export function fetchForums() {
  return queryEvents({ kinds: [FORUM_KIND], limit: 200 }, { maxWait: 8000 })
    .then(function (events) {
      var newestPerForum = {};
      events.forEach(function (ev) {
        var dTag = (ev.tags || []).find(function (t) { return t[0] === "d"; });
        var id = dTag ? dTag[1] : null;
        if (!id || id.indexOf(FORUM_DTAG + ":") !== 0) return;
        var forumId = id.slice(FORUM_DTAG.length + 1);
        var prev = newestPerForum[forumId];
        if (prev && ev.created_at < prev.created_at) return;
        newestPerForum[forumId] = ev;
      });
      var out = [];
      Object.keys(newestPerForum).forEach(function (fid) {
        var ev = newestPerForum[fid];
        var data = null;
        try { data = JSON.parse(ev.content || "{}"); } catch (e) {}
        if (!data || !data.name) return;
        out.push({
          id: fid,
          name: data.name,
          status: data.status || "libre",
          ownerName: data.ownerName || "",
          ownerPub: ev.pubkey,
          created_at: data.created_at || ev.created_at || 0
        });
      });
      out.sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
      return out;
    })
    .catch(function () { return []; });
}
