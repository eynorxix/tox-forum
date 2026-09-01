/* ===== dominio: votos de universos por hashtag ===== */
import { state, save } from "../store/db.js";
import { UNIVERSES } from "../config.js";

export function voteHashtags(comment) {
  var changed = false;
  UNIVERSES.forEach(function (u) {
    var re = new RegExp("#" + u.tag, "i");
    if (re.test(comment)) {
      state.votes[u.tag] = (state.votes[u.tag] || 0) + 1;
      changed = true;
    }
  });
  if (changed) save();
}