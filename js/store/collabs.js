/* ===== colaboradores de cada foro (datos semilla) ===== */
import { state, save } from "./db.js";

function imgFile() {
  /* avatares opcionales: si se despliega en la web junto a una carpeta de
     avatares en la raiz, puede apuntar a "avatars/" + nombre. Sin archivo, el
     perfil muestra la letra inicial (estilo minimalista, sin imagenes). */
  return null;
}

function U(name, icon, desc, socials, posts) {
  return { name: name, icon: icon, desc: desc, socials: socials, posts: posts };
}

export function seedCollabs() {
  if (state.collabSeeded) return;
  state.collabSeeded = true;
  state.collabs = {
    g: [
      U("NeoByte", "16758.jpg", "Entusiasta del multiverso y coleccionista de datos curiosos.",
        [["X", "https://x.com/neobyte"], ["GitHub", "https://github.com/neobyte"], ["YouTube", "https://youtube.com/@neobyte"]],
        ["Bienvenid@s al foro general, aqui compartimos de todo.", "Mi top 10 universos: 1) Tierra-96283, 2) MCU...", "Posteo estadisticas todas las semanas."]),
      U("Violeta", "lunar-tides-3840x2160-26444.jpg", "Dibujante aficionada y cinéfila."
        , [["Instagram", "https://instagram.com/violeta.art"], ["X", "https://x.com/violeta"]],
        ["Hoy vi la trilogia de Raimi otra vez, pura nostalgia.", "Comparto mis bocetos de superhéroes cada viernes.", "¿Alguien mas opina que Spider-Man 2 es la mejor? #Tierra-96283"]),
      U("Lua", "832211.jpg", "Lee cómics desde los 90 y ama debatir.",
        [["X", "https://x.com/lua.c"], ["TikTok", "https://tiktok.com/@lua"]],
        ["Debate abierto: ¿Quién gana, Doom o Strange?", "Los comics clasicos siempre ganan a las pelis.", "Terminando la run de Kraven's Last Hunt."]),
      U("Tono", "1316678.jpeg", "Meme lord oficial del foro.",
        [["Instagram", "https://instagram.com/tono"], ["TikTok", "https://tiktok.com/@tono"]],
        ["SUBIDO NUEVO MEME DEL MULTIVERSO 🔥", "No hay dia malo con memes de Doomsday.", "Compartid vuestros mejores memes."])
    ],
    t: [
      U("Rex", "3002637.jpg", "Ingeniero de hardware, arma PCs desde los 14.",
        [["GitHub", "https://github.com/rexhw"], ["X", "https://x.com/rex"]],
        ["Guia de refrigeracion liquida para novatos.", "Probando la nueva grafica, resultados en breve.", "¿Ryzen o Intel en 2026? Debatimos."]),
      U("Dyna", "310512.jpg", "Entusiasta de la IA y el software libre.",
        [["X", "https://x.com/dyna"], ["LinkedIn", "https://linkedin.com/in/dyna"]],
        ["Tutorial: monta tu propio LLM local.", "El software libre es el futuro del mundo.", "Comparativa de modelos pequenos."]),
      U("Hache", "3381389.jpg", "Hacker etico y ciberseguridad.",
        [["GitHub", "https://github.com/hache"], ["X", "https://x.com/hache"]],
        ["Mini guia de buenas contraseñas.", "Phishing: como detectarlo a tiempo.", "El 90% de los ataques son errores humanos."])
    ],
    p: [
      U("Mona", "4811008.jpg", "Frontend dev, amante del CSS puro.",
        [["GitHub", "https://github.com/mona"], ["X", "https://x.com/mona"]],
        ["¿Alguien se atreve con CSS puro para chart? 😅", "Refactor de mi portfolio, feedback bienvenido.", "Probando animaciones ligeras sin librerias."]),
      U("Neko", "970716.jpg", "Backend dev, Rust y PostgreSQL.",
        [["GitHub", "https://github.com/neko"], ["X", "https://x.com/neko"]],
        ["Rust > cualquier lenguaje, vengan de a uno.", "Microservicios: experiencias y desventuras.", "Index quireros y consultas lentas: lo basico."]),
      U("Wolf", "1038456.jpg", "DevOps y cloud engineer.",
        [["GitHub", "https://github.com/wolf"], ["LinkedIn", "https://linkedin.com/in/wolf"]],
        ["Automatiza todo, incluso este foro.", "Docker para dummies en 5 puntos.", "CI/CD bien hecha te cambia la vida."])
    ],
    a: [
      U("PixelPixie", "1399755.png", "Ilustradora digital, fan del arte neo-noir.",
        [["Instagram", "https://instagram.com/pixelpixie"], ["ArtStation", "https://artstation.com/pixelpixie"]],
        ["Nuevo splash art de Doomsday, critica welcome.", "Comisiones abiertas este mes.", "Estudiando color de pelis de Raimi."]),
      U("Poema", "reze-selfie-3840x2160-26716.jpg", "Poeta visual y fotógrafa callejera.",
        [["Instagram", "https://instagram.com/poema"], ["X", "https://x.com/poema"]],
        ["La luz de las 6pm nunca falla.", "Serie fotografica: 'Ciudades dormidas'.", "Un verso por cada universo."])
    ],
    m: [
      U("Ritmo", "971203.jpg", "Productor musical, hace beats de synthwave.",
        [["YouTube", "https://youtube.com/@ritmo"], ["SoundCloud", "https://soundcloud.com/ritmo"]],
        ["Nuevo track: 'Mar de Neón', escuchen 😎", "Mi playlist para programar 10 horas.", "Colab de remix: mandame tu pista."]),
      U("Echo", "16758.jpg", "Cantautora y melómana.",
        [["Instagram", "https://instagram.com/echo"], ["Spotify", "https://open.spotify.com/artist/echo"]],
        ["Cover de tema de Spider-Man, opiniones?", "Discos que me cambiaron la vida: los pincho aqui.", "Grabando el primer EP."])
    ],
    d: [
      U("Cronista", "1038456.jpg", "Historiador del multiverso. Documenta cada Tierra.",
        [["X", "https://x.com/cronista"], ["YouTube", "https://youtube.com/@cronista"], ["TikTok", "https://tiktok.com/@cronista"]],
        ["La Tierra-96283: trilogia de Raimi, telaranas organicas y Jameson mencionando a Strange. #Tierra-96283", "Doom conquista Latveria y nadie dice nada. #Doom", "X-Men al margen: la Tierra-10005 sigue firme. #XMen"]),
      U("Kaze", "japan-artistic-5120x2880-25406.jpg", "Traductor y friki de cultura japonesa.",
        [["Instagram", "https://instagram.com/kaze"], ["X", "https://x.com/kaze"]],
        ["Los 4 Fantasticos y su reed original. #Fantasticos", "El MCU despues de Secret Wars. #MCU", "Venom y el simbionte: mi opinion. #Venom"]),
      U("Fenix", "sasaki-yamada-5120x2880-26451.jpg", "Analista de guiones y motivador del fandom.",
        [["X", "https://x.com/fenix"], ["YouTube", "https://youtube.com/@fenix"]],
        ["Por que Tierra-96283 es EL universo de Peter. #Tierra-96283", "Wolverine vs Doom: quien se lo lleva? #XMen #Doom", "Primera familia de Marvel: los Fantasticos. #Fantasticos"]),
      U("Sombra", "lunar-tides-3840x2160-26444.jpg", "Conspiracionista amable del multiverso.",
        [["X", "https://x.com/sombra"], ["TikTok", "https://tiktok.com/@sombra"]],
        ["Y si No Way Home estaba planeado desde 2002? #MCU #Tierra-96283", "Doomsday ya esta aqui, solo hay que ver. #Doom", "Voten bien, el multiverso depende de ustedes."])
    ],
    r: [
      U("Momo", "832211.jpg", "Perrito disfrazado de persona.",
        [["Instagram", "https://instagram.com/momo"]],
        ["Me gusta el queso.", "Sali a pasear, llovia, volvi.", "Probando el foro."]),
      U("Cache", "4811008.jpg", "Colecciona contraseñas viejas.",
        [["X", "https://x.com/cache"]],
        ["123456 sigue siendo inseguro, gente.", "Este hilo random no tiene sentido.", "Random es random."])
    ],
    j: [
      U("Guild", "3381389.jpg", "Raider de MMORPG desde tiempos prehistoricos.",
        [["Discord", "https://discord.gg/guild"], ["Twitch", "https://twitch.tv/guild"]],
        ["Guild buscando miembros para raids de domingo.", "Speedrun mundial? Lo intentamos.", "Mi top 5 juegos de la decada."]),
      U("Pad", "971203.jpg", "Speedrunner y data analyst de RPGs.",
        [["Twitch", "https://twitch.tv/pad"], ["X", "https://x.com/pad"]],
        ["Nuevo record en 100% completion.", "Analizando los drop rates del new update.", "Consejos para rookie: no dejes el coop."])
    ]
  };
  save();
}

export function getCollabs(boardId) {
  return (state.collabs && state.collabs[boardId]) || [];
}