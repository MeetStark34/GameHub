// Bakes filtered SCOWL word lists (via the wordlist-english package) into
// src/games/words/data so puzzle generation is reproducible and independent
// of the npm package at runtime. Re-run only deliberately: changing these
// files changes future Unlimited puzzles (stored Daily puzzles are immutable).
//   node scripts/build-wordlists.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'node_modules/wordlist-english';
const OUT = 'src/games/words/data';
const load = (variant, level) =>
  JSON.parse(fs.readFileSync(path.join(SRC, `${variant}-words-${level}.json`), 'utf8'));

const collect = (levels) => {
  const set = new Set();
  for (const level of levels) {
    for (const variant of ['english', 'american']) {
      for (const w of load(variant, level)) if (/^[a-z]+$/.test(w)) set.add(w);
    }
  }
  return set;
};

// Words that should never be a puzzle answer (still accepted as guesses).
const ANSWER_BLOCKLIST = new Set(
  'sex sexy nazi rape raped kill killed dead death drug drugs gun guns bomb slut damn hell crap piss shit fuck bitch whore pussy penis vagina porn nude naked suicide murder abuse abort jew jews gay gays negro slave slaves queer dick cock tits boob boobs anal ass arse bastard wank'.split(' '),
);

const looksInflected = (w) =>
  (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) ||
  w.endsWith('ed');

const common = collect([10, 20]);
const dictionary = collect([10, 20, 35, 40, 50, 55, 60, 70]);

const result = { attribution: 'SCOWL word lists, Copyright 2000-2016 Kevin Atkinson (see THIRD_PARTY_NOTICES.md)' };
for (const len of [3, 4, 5, 6, 7]) {
  const answers = [...common]
    .filter((w) => w.length === len && !ANSWER_BLOCKLIST.has(w) && !looksInflected(w))
    .sort();
  const dict = [...dictionary].filter((w) => w.length === len).sort();
  result[len] = { answers: answers.length, dictionary: dict.length };
  fs.writeFileSync(path.join(OUT, `answers-${len}.json`), JSON.stringify(answers));
  fs.writeFileSync(path.join(OUT, `dictionary-${len}.json`), JSON.stringify(dict));
}
console.log(result);
