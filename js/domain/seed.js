/* ===== dominio: semilla de hilos de demostracion en /d/ ===== */
import { state, save, getBoard, nextNo } from "../store/db.js";
import { voteHashtags } from "./voting.js";

export function seedDemo() {
  if (state.demoSeeded) return;
  state.demoSeeded = true;
  var base = Date.now() - 4 * 86400000;
  var step = 1000 * 60 * 45;

  var demos = [
    { c: "¿Que universo se lleva la corona del multiverso? Yo voto por Sam Raimi y su trilogia #Tierra-96283 #MCU",
      r: ["Peter Parker 2002-2007 es inigualable, telaranas organicas y todo #Tierra-96283",
          "El Doctor Strange ya existia en esa Tierra, Jameson lo menciona #Tierra-96283",
          "Pff, el MCU puro #MCU",
          "Doomsday los borra a todos #Doom"] },
    { c: "Los X-Men siempre al margen de todo lo demás #XMen",
      r: ["La escuela del profesor Xavier es la mejor #XMen",
          "Wolverine es mi favorito #XMen",
          "Apocalipsis les llego al limite #XMen",
          "Aun asi, la #Tierra-96283 es superior"] },
    { c: "Victor Von Doom esta cocinando algo grande #Doom",
      r: ["Doom gobierna Latveria con puño de hierro #Doom",
          "El universo Fantasticos lo creo: busca a Reed Richards #Fantasticos",
          "Cuatro Fantasticos, puro clasico #Fantasticos"] },
    { c: "Venom y el simbionte, mejor antiheroe de Sony #Venom",
      r: ["Dame mas Venom, y que se cruce con la #Tierra-96283",
          "Venom vs Carnage en el #MCU por favor",
          "#Venom nivel oscuro total"] },
    { c: "El MCU esta en su etapa multiverso #MCU",
      r: ["No Way Home unio a los tres Spider-Man #MCU #Tierra-96283",
          "Secret Wars va a romper todo #MCU",
          "X-Men entrando al MCU #XMen #MCU",
          "Y Doom al mando #Doom #MCU"] },
    { c: "Los Fantasticos: la primera familia de Marvel #Fantasticos",
      r: ["Reed Richards es un genio #Fantasticos",
          "La antorcha humana arde bien #Fantasticos",
          "Una colaboracion con #XMen seria epica"] }
  ];

  demos.forEach(function (d, i) {
    var thread = {
      no: nextNo(),
      name: "Cangrejo",
      ownerType: "user",
      ownerPub: "demo-super-user",
      ownerName: "Cangrejo",
      comment: d.c,
      image: null,
      ts: base + i * step,
      replies: []
    };
    d.r.forEach(function (rc, j) {
      thread.replies.push({
        no: nextNo(),
        name: "Cangrejo",
        ownerType: "user",
        ownerPub: "demo-super-user",
        ownerName: "Cangrejo",
        comment: rc,
        image: null,
        ts: base + i * step + (j + 1) * 300000
      });
    });
    getBoard("d").push(thread);
    voteHashtags(d.c);
    d.r.forEach(voteHashtags);
  });
  save();
}