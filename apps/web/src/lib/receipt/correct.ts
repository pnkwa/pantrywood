// No "@/" imports: scripts/receipt-correct.test.mjs runs this file directly with Node.

// Thai letters that receipt fonts (narrow dot-matrix especially) print almost alike, so OCR swaps them.
const LOOK_ALIKE = [
  "ดอ", "สพ", "ยอ", "คด", "คส", "ขช", "ผน", "ฟท", "ทพ", "สศ", "ฟศ", "ฟช", "บป", "ลอ", "รธ", "กธ", "ซช", "ฮฮ", "ภก", "ถก", "ฎฏ", "ฑท", "หพ", "ธอ",
];
const lookAlike = new Set(LOOK_ALIKE.flatMap(([first = "", second = ""]) => [first + second, second + first]));

// Vowel and tone marks above or below the line: the easiest strokes for OCR to drop or swap.
const MARK = /[ัิ-ฺ็-๎]/;

const SWAP_COST = 0.35;
const MARK_COST = 0.3;
// Keeping a letter as read costs this much, so a real word wins only when it explains the letters cheaply.
const KEEP_COST = 0.42;
// A word is only taken when its edits stay under this share of its length. Short words fit almost anything,
// so under 3 letters they must match exactly and up to 4 letters only cheap look-alike or mark edits count.
const MAX_WORD_COST = 0.34;
const maxCost = (length: number) => (length < 3 ? 0 : length < 5 ? 2 * SWAP_COST : MAX_WORD_COST * length);

// The recognizer itself considered this letter here, so swapping to it is nearly free.
const ALTERNATIVE_COST = 0.12;
// Your own products and fixes are the likeliest words on your receipts.
const PREFERRED_FACTOR = 0.7;

type Word = { letters: readonly string[]; factor: number };

// Latin letters the OCR puts in place of the Thai letters they resemble, first choice first.
const LATIN_LOOK_ALIKE: Record<string, readonly string[]> = {
  D: ["อ", "ด"],
  O: ["อ"],
  o: ["อ"],
  n: ["ก", "ท"],
  u: ["น", "บ"],
  U: ["บ", "ป"],
  a: ["ล"],
  l: ["า"],
};
// Stray punctuation inside a Thai word ("มDนศ:ตอร์") is a misread stroke, cheap to drop.
const STRAY = /[:;'`\s]/;

const substitution = (read: string, real: string, alternatives: readonly string[]) => {
  if (read === real) return 0;
  if (alternatives.includes(real)) return ALTERNATIVE_COST;
  if (LATIN_LOOK_ALIKE[read]?.includes(real)) return SWAP_COST;
  if (MARK.test(read) && MARK.test(real)) return MARK_COST;
  return lookAlike.has(read + real) ? SWAP_COST : 1;
};
const indel = (letter: string) => (MARK.test(letter) || STRAY.test(letter) ? MARK_COST : 1);

/**
 * Rewrites a run of Thai letters as the most plausible real words: the cheapest way to cover it with words
 * (look-alike swaps and mark slips are cheap), keeping any letters no word explains. Each word is scored once
 * per start position, across all its possible ends, and dropped as soon as it can no longer fit.
 */
const correctRun = (run: string, alternatives: readonly (readonly string[])[], words: readonly Word[]) => {
  const letters = [...run];
  const best: { cost: number; text: string }[] = letters.map(() => ({ cost: Infinity, text: "" }));
  best.unshift({ cost: 0, text: "" });
  const relax = (end: number, cost: number, text: string) => {
    const current = best[end];
    if (current && cost < current.cost) best[end] = { cost, text };
  };
  for (let start = 0; start < letters.length; start++) {
    const from = best[start];
    if (!from || from.cost === Infinity) continue;
    relax(start + 1, from.cost + KEEP_COST, from.text + (letters[start] ?? ""));
    for (const { letters: word, factor } of words) {
      const limit = maxCost(word.length);
      // Edit distance from letters[start…] to the word, one read letter per row.
      let previous = [0];
      for (const letter of word) previous.push((previous.at(-1) ?? 0) + indel(letter));
      const lastEnd = Math.min(letters.length, start + word.length + 2);
      for (let end = start + 1; end <= lastEnd; end++) {
        const readLetter = letters[end - 1] ?? "";
        const readAlternatives = alternatives[end - 1] ?? [];
        const current = [(previous[0] ?? 0) + indel(readLetter)];
        let rowMin = current[0] ?? Infinity;
        for (let column = 1; column <= word.length; column++) {
          const cell = Math.min(
            (previous[column] ?? Infinity) + indel(readLetter),
            (current[column - 1] ?? Infinity) + indel(word[column - 1] ?? ""),
            (previous[column - 1] ?? Infinity) + substitution(readLetter, word[column - 1] ?? "", readAlternatives),
          );
          current.push(cell);
          rowMin = Math.min(rowMin, cell);
        }
        if (rowMin > limit) break;
        const edits = current[word.length] ?? Infinity;
        if (end - start >= word.length - 2 && edits <= limit) relax(end, from.cost + edits * factor, from.text + word.join(""));
        previous = current;
      }
    }
  }
  return best[letters.length] ?? { cost: Infinity, text: run };
};

// Two letters OCR reads as one: "อี" comes out as "ธ".
const MERGED = [["ธ", "อี"]] as const;
const MERGED_COST = 0.2;

/** Corrects the Thai parts of an item name; Latin letters, digits and spaces stay as read. */
type CorrectOptions = {
  /** Per letter of `text`, the other letters the recognizer thought likely there. */
  alternatives?: readonly (readonly string[])[];
  /** Words to prefer: your product names and earlier fixes. */
  preferred?: readonly string[];
};

/** Thai runs in a name, split into the words they're likely made of: "นมสด รสจืด" → นมสด, รสจืด. */
export const thaiWordsIn = (names: readonly string[]) => [...new Set(names.flatMap((name) => name.match(/[ก-๎]{2,}/g) ?? []))];

// The OCR worker corrects every text box of a receipt with the same two lists; build the words once.
let prepared: { dictionary: readonly string[]; preferred: readonly string[]; words: Word[] } | null = null;

const wordsFor = (dictionary: readonly string[], preferred: readonly string[]) => {
  if (prepared?.dictionary === dictionary && prepared.preferred === preferred) return prepared.words;
  const words: Word[] = [
    ...thaiWordsIn(preferred).map((word) => ({ letters: [...word], factor: PREFERRED_FACTOR })),
    ...dictionary.map((word) => ({ letters: [...word], factor: 1 })),
  ];
  prepared = { dictionary, preferred, words };
  return words;
};

const NO_WORDS: readonly string[] = [];

export const correctThai = (text: string, dictionary: readonly string[], { alternatives = [], preferred = NO_WORDS }: CorrectOptions = {}) => {
  const words = wordsFor(dictionary, preferred);
  // Thai letters are single UTF-16 units, so a run's offset is also its index into `alternatives`.
  // A Thai run may hold a single Latin letter or stray mark between Thai letters: those are misreads too.
  return text.replace(/[ก-๎]+(?:(?:[A-Za-z]{1,2}|[:;'`]\s?)[ก-๎]+)*/g, (run, offset: number) => {
    const runAlternatives = alternatives.slice(offset, offset + run.length);
    const readings = [
      { reading: run, extra: 0, runAlternatives },
      ...MERGED.filter(([read]) => run.includes(read)).map(([read, real]) => ({
        reading: run.replaceAll(read, real),
        extra: MERGED_COST,
        runAlternatives: [],
      })),
    ];
    return readings
      .map(({ reading, extra, runAlternatives: readingAlternatives }) => {
        const corrected = correctRun(reading, readingAlternatives, words);
        return { text: corrected.text, cost: corrected.cost + extra };
      })
      .reduce((best, next) => (next.cost < best.cost ? next : best))
      .text.replace(/(?<=[ก-๎])([A-Za-z]{1,2}|[:;'`]\s?)(?=[ก-๎])/g, (letters: string) =>
        STRAY.test(letters) ? "" : [...letters].map((letter) => LATIN_LOOK_ALIKE[letter]?.[0] ?? letter).join(""),
      );
  });
};
