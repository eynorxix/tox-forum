/* ===== capa de configuracion: constantes globales del sitio ===== */

export var STORAGE_KEY = "forchan_data_v1";

/* API Key de GIPHY para el selector de GIFs/stickers al postear */
export var GIPHY_KEY = "TUPHKPnj37i4cDV0aACuWKdcaxYQQSzY";

/* moderacion: npub del admin (debe coincidir con la de Admin_forum/js/config.js).
   Solo los eventos de roles (kind 39001) y baneo (kind 39000) firmados por esta
   clave se aplican. BANNED_NPUBS = lista base de respaldo.
   ADMIN_NPUB coincide con la del panel: se usa para confiar en los eventos
   publicados por el admin y mostrarlo como colaborador/admin en el sidebar. */
export var ADMIN_NPUB = "npub1ehuggfkcre09tw8xcvkvg8mq69569a4fxyapxfcdtm6zq5pnnlrqzpw33z";
export var BANNED_NPUBS = [];

/* kinds del contrato con Admin_forum (ver CONTROL_PANEL.md en esa repo) */
export var REG_KIND = 13370;   /* registro de usuario */
export var REG_DTAG = "forosraiz-user-v1";
export var ROLE_KIND = 39001;  /* roles y baneos del admin */
export var ROLE_DTAG = "forosraiz-roles-v1";
export var BAN_KIND = 39000;   /* lista de baneados legacy */
export var BAN_DTAG = "forosraiz-banlist-v1";

/* kind de foros creados por colaboradores: cada foro se publica como evento
   addressable #d 'forosraiz-forum-v1:<id>' firmado por su creador, para que
   aparezca en "Foros Recomendados" y en la navegacion de TODOS los visitantes
   (no solo en el navegador donde se creo). */
export var FORUM_KIND = 13371;
export var FORUM_DTAG = "forosraiz-forum-v1";

export var CATEGORIES = [
  "General",
  "Tecnologia",
  "Creativo",
  "Entretenimiento",
  "Otros",
  "Adult"
];

export var BOARDS = [
  { id: "g",  name: "General",      desc: "Charlas de todo tipo.",          cat: "General" },
  { id: "r",  name: "Random",       desc: "Sin reglas (casi).",             cat: "General" },
  { id: "t",  name: "Tecnologia",   desc: "Gadgets, noticias y hardware.",  cat: "Tecnologia" },
  { id: "p",  name: "Programacion", desc: "Codigo, bugs y tutoriales.",     cat: "Tecnologia" },
  { id: "h",  name: "Hardware",     desc: "Componentes, consolas y DIY.",   cat: "Tecnologia" },
  { id: "so", name: "Software",     desc: "Apps, sistemas y utilidades.",   cat: "Tecnologia" },
  { id: "a",  name: "Arte",         desc: "Dibujo, musica y creatividad.",  cat: "Creativo" },
  { id: "m",  name: "Musica",       desc: "Comparte lo que escuchas.",      cat: "Creativo" },
  { id: "d",  name: "Domsday",      desc: "El mundo: publica y ubicate.",   cat: "Creativo" },
  { id: "j",  name: "Juegos",       desc: "Videojuegos y mesa.",            cat: "Entretenimiento" },
  { id: "an", name: "Anime",        desc: "Series, peliculas y videos.",    cat: "Entretenimiento" },
  { id: "ml", name: "Manga",        desc: "Manga, comics y novelas ligeras.", cat: "Entretenimiento" },
  { id: "tv", name: "TV y Cine",    desc: "Series, peliculas y videos.",    cat: "Entretenimiento" },
  { id: "q",  name: "Preguntas",    desc: "Dudas, consejos y FAQ.",         cat: "Otros" },
  { id: "s",  name: "Social",       desc: "Presentaciones y comunidad.",    cat: "Otros" },
  { id: "c",  name: "Charla",       desc: "Temas libres y opiniones.",      cat: "Otros" },
  { id: "b",  name: "Adulto",       desc: "NSFW: contenido adulto explicito.", cat: "Adult" },
  { id: "ec", name: "Ecchi",        desc: "NSFW: arte sugerente y softcore.", cat: "Adult" },
  { id: "yn", name: "Yuri",         desc: "NSFW: relaciones y arte femenino.", cat: "Adult" },
  { id: "fet", name: "Fetiches",    desc: "NSFW: fetiches y practicas.",     cat: "Adult" }
];

export var BLOG_ASSETS = "blog/assets/";

export var UNIVERSES = [
  { tag: "Tierra-96283", name: "Spider-Man (Raimi)",              color: "#f7768e" },
  { tag: "XMen",         name: "Universo X-Men",                  color: "#7aa2f7" },
  { tag: "Doom",         name: "Doctor Doom / Doomsday",          color: "#9ece6a" },
  { tag: "Fantasticos",  name: "Los 4 Fantasticos",               color: "#ff9e64" },
  { tag: "Venom",        name: "Venom (Sony)",                    color: "#7dcfff" },
  { tag: "MCU",          name: "Universo Cinematografico Marvel", color: "#bb9af7" }
];