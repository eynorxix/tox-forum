/* ===== capa de configuracion: constantes globales del sitio ===== */

export var STORAGE_KEY = "forchan_data_v1";

/* moderacion: npub del admin (debe coincidir con la de Admin_forum/js/config.js).
   Solo los eventos de baneo (kind 39000) firmados por esta clave se aplican.
   BANNED_NPUBS = lista base de respaldo (se suma a la publicada por el panel). */
export var ADMIN_NPUB = "";
export var BANNED_NPUBS = [];

export var BOARDS = [
  { id: "g",  name: "General",      desc: "Charlas de todo tipo." },
  { id: "t",  name: "Tecnologia",   desc: "Gadgets, noticias y hardware." },
  { id: "p",  name: "Programacion", desc: "Codigo, bugs y tutoriales." },
  { id: "a",  name: "Arte",         desc: "Dibujo, musica y creatividad." },
  { id: "m",  name: "Musica",       desc: "Comparte lo que escuchas." },
  { id: "d",  name: "Domsday",      desc: "El mundo: publica y ubicate en el mapa." },
  { id: "r",  name: "Random",       desc: "Sin reglas (casi)." },
  { id: "j",  name: "Juegos",       desc: "Videojuegos y mesa." }
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