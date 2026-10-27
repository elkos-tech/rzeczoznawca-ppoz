/* Przesiew: czy cytat potwierdza zaznaczoną odpowiedź? */
const fs = require("fs");
const P = "C:/Users/kose9456/Documents/CLAUDE/RzeczoznawcaPPOZ/";
global.window = {};
eval(fs.readFileSync(P + "questions.js", "utf8"));
eval(fs.readFileSync(P + "answers.js", "utf8"));
eval(fs.readFileSync(P + "questions-new.js", "utf8"));
eval(fs.readFileSync(P + "quotes.js", "utf8"));
const { QUESTIONS, ANSWERS, QUESTIONS_NEW, QUOTES } = window;

const Q = {};
QUESTIONS.forEach(q => Q[q.id] = { ...q, ...(ANSWERS[q.id] || {}) });
QUESTIONS_NEW.forEach(q => Q[q.id] = { ...q });

// tokeny rozróżniające: klasy odporności + liczby (pomijamy jednocyfrowe bez przecinka)
function toks(s) {
  const out = new Set();
  (s.match(/\b(?:REI|EI|RE|R|E)\s?\d{2,3}\b/gi) || [])
    .forEach(t => out.add(t.toUpperCase().replace(/\s+/g, "")));
  (s.match(/\d+(?:[.,]\d+)?/g) || []).forEach(n => {
    const v = n.replace(".", ",");
    if (v.includes(",") || v.length >= 2) out.add(v);
  });
  return [...out];
}
function hasTok(hay, t) {
  if (/^(REI|EI|RE|R|E)\d/.test(t)) {
    const m = t.match(/^([A-Z]+)(\d+)$/);
    return new RegExp("\\b" + m[1] + "\\s?" + m[2] + "\\b").test(hay);
  }
  const esc = t.replace(/,/g, "[.,]");
  return new RegExp("(?<![\\d,.])" + esc + "(?![\\d,])").test(hay);
}

const rows = [];
for (const [id, qts] of Object.entries(QUOTES)) {
  const q = Q[id];
  if (!q || !q.answer) continue;
  const quote = qts.filter(x => x.kind === "akt").map(x => x.text).join(" ");
  if (!quote) continue;
  const score = {};
  for (const k of ["a", "b", "c"]) {
    const t = toks(q.options[k] || "");
    score[k] = { n: t.length, hit: t.filter(x => hasTok(quote, x)).length, toks: t };
  }
  const correct = q.answer;
  const others = ["a", "b", "c"].filter(k => k !== correct);
  const bestOther = Math.max(...others.map(k => score[k].hit));
  // podejrzane: odpowiedź nie potwierdzona, a inny wariant tak
  if (score[correct].n > 0 && score[correct].hit === 0 && bestOther > 0) {
    const winner = others.filter(k => score[k].hit === bestOther);
    rows.push({ id: +id, correct, winner, score, q, quote });
  }
}
rows.sort((a, b) => a.id - b.id);
console.log("PODEJRZANE:", rows.length);
fs.writeFileSync("suspects.json", JSON.stringify(rows.map(r => ({
  id: r.id, correct: r.correct, winner: r.winner,
  verified: !!r.q.verified,
  question: r.q.q,
  options: r.q.options,
  answerTok: r.score[r.correct].toks,
  winnerTok: r.winner.map(k => r.score[k].toks),
  quote: r.quote.slice(0, 700)
})), null, 1), "utf8");
rows.forEach(r => console.log(` #${r.id} ${r.q.verified ? "✔" : "△"} klucz=${r.correct} ale w cytacie pasuje: ${r.winner.join("/")}`));
