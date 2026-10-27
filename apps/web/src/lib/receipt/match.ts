// No "@/" imports: scripts/receipt-match.test.mjs runs this file directly with Node.

export type MatchableProduct = { id: number; name: string; thaiName: string };

export type MatchHow = "remembered" | "name" | "guess" | "none";

export type LineMatch = {
  productId: number | null;
  how: MatchHow;
  /** Other likely products, best first, for the "Which item is this?" cards. */
  candidateIds: number[];
};

const GUESS_THRESHOLD = 0.35;
// Below this a "suggestion" shares a letter pair or two by chance and only adds noise.
const CANDIDATE_THRESHOLD = 0.2;
const CANDIDATE_COUNT = 3;
const MIN_NAME_LENGTH = 2;
const MIN_COVERAGE = 0.5;
// OCR misreads the same print a little differently each time: two reads of one line score about 0.65–0.9,
// while different products from one brand mostly stay under 0.6.
const REMEMBERED_SIMILARITY = 0.65;
// A saved fix rewrites the name you see, so it needs a closer reading: different flavours of one product
// scored up to 0.82 in testing, while repeat misreads of one print scored 0.84 and above.
const SAVED_FIX_SIMILARITY = 0.83;

// "มาม่า ต้มยำกุ้ง" contains "กุ้ง" (shrimp) but isn't shrimp. Thai puts the head noun first, so a name
// counts when the line starts with it or it covers most of the line.
const namesTheLine = (name: string, text: string) =>
  name.includes(text) ||
  (text.includes(name) && (text.startsWith(name) || name.length / text.length >= MIN_COVERAGE));

// Pack sizes and counts ("1L", "5kg", "6 ม้วน", "x2") say nothing about which product it is.
const SIZE_PATTERN =
  /\d+([.,]\d+)?\s*(kg|g|ml|l|pcs|x|กก\.?|กรัม|มล\.?|ลิตร|ม้วน|ชิ้น|ซอง|ขวด|แพ็ค|ห่อ)?/giu;

export const normalizeReceiptName = (text: string) =>
  text
    .normalize("NFC")
    .toLowerCase()
    .replace(SIZE_PATTERN, " ")
    .replace(/[^\p{L}\p{M}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const bigramsOf = (text: string) => {
  const compact = text.replace(/\s/g, "");
  const bigrams: string[] = [];
  for (let index = 0; index < compact.length - 1; index++) {
    bigrams.push(compact.slice(index, index + 2));
  }
  return bigrams;
};

/** Dice coefficient over character pairs: 1 = same letters, 0 = nothing shared. */
const similarity = (first: string, second: string) => {
  const firstPairs = bigramsOf(first);
  const secondPairs = bigramsOf(second);
  if (firstPairs.length === 0 || secondPairs.length === 0) return 0;
  const remaining = [...secondPairs];
  let shared = 0;
  for (const pair of firstPairs) {
    const found = remaining.indexOf(pair);
    if (found !== -1) {
      shared++;
      remaining.splice(found, 1);
    }
  }
  return (2 * shared) / (firstPairs.length + secondPairs.length);
};

const namesOf = (product: MatchableProduct) =>
  [product.name, product.thaiName]
    .map(normalizeReceiptName)
    .filter((name) => name.length >= MIN_NAME_LENGTH);

/**
 * Finds the Grocy product for one receipt line: a remembered match first, then a product
 * whose name appears in the printed text (or the other way round), then the closest spelling.
 */
export const matchReceiptLine = (
  printedName: string,
  englishName: string | null,
  products: readonly MatchableProduct[],
  remembered: ReadonlyMap<string, number>,
): LineMatch => {
  const texts = [printedName, englishName ?? ""]
    .map(normalizeReceiptName)
    .filter((text) => text.length >= MIN_NAME_LENGTH);
  const scored = products
    .map((product) => ({
      id: product.id,
      score: Math.max(
        0,
        // A small word inside the line shares all its letter pairs, which would make it a confident guess.
        ...namesOf(product).flatMap((name) =>
          texts.map((text) =>
            text.includes(name) && !namesTheLine(name, text)
              ? Math.min(similarity(name, text), CANDIDATE_THRESHOLD)
              : similarity(name, text),
          ),
        ),
      ),
    }))
    .sort((first, second) => second.score - first.score);
  const candidatesBesides = (productId: number | null) =>
    scored
      .filter((entry) => entry.id !== productId && entry.score >= CANDIDATE_THRESHOLD)
      .slice(0, CANDIDATE_COUNT)
      .map((entry) => entry.id);

  const printed = normalizeReceiptName(printedName);
  const exists = (productId: number) => products.some((product) => product.id === productId);
  const rememberedId = remembered.get(printed);
  if (rememberedId !== undefined && exists(rememberedId)) {
    return { productId: rememberedId, how: "remembered", candidateIds: candidatesBesides(rememberedId) };
  }

  // The longest name for the line wins, so "ข้าวหอมมะลิ" beats a product called just "ข้าว".
  const byName = products
    .flatMap((product) =>
      namesOf(product)
        .filter((name) => texts.some((text) => namesTheLine(name, text)))
        .map((name) => ({ id: product.id, length: name.length })),
    )
    .sort((first, second) => second.length - first.length)[0];
  if (byName) {
    return { productId: byName.id, how: "name", candidateIds: candidatesBesides(byName.id) };
  }

  const closeRemembered = [...remembered]
    .filter(([, productId]) => exists(productId))
    .map(([name, productId]) => ({ id: productId, score: similarity(name, printed) }))
    .sort((first, second) => second.score - first.score)[0];
  if (closeRemembered && closeRemembered.score >= REMEMBERED_SIMILARITY) {
    return { productId: closeRemembered.id, how: "guess", candidateIds: candidatesBesides(closeRemembered.id) };
  }

  const best = scored[0];
  if (best && best.score >= GUESS_THRESHOLD) {
    return { productId: best.id, how: "guess", candidateIds: candidatesBesides(best.id) };
  }
  return { productId: null, how: "none", candidateIds: candidatesBesides(null) };
};

/**
 * Lines with the same price whose readings are close may be the same print read differently. A line takes
 * another reading only when that exact reading came out at least twice: misreads of one print repeat, while
 * different flavours of one brand at one price (as close as two misreads) each appear once.
 */
export const unifyRepeats = (lines: readonly { name: string; line_total: number }[]) =>
  lines.map((line) => {
    const key = normalizeReceiptName(line.name);
    const group = lines.filter(
      (other) => other.line_total === line.line_total && similarity(normalizeReceiptName(other.name), key) >= REMEMBERED_SIMILARITY,
    );
    const countOf = (name: string) => group.filter((member) => member.name === name).length;
    const common = group.map((member) => member.name).reduce((best, next) => (countOf(next) > countOf(best) ? next : best), line.name);
    return countOf(common) >= 2 && countOf(common) > countOf(line.name) ? common : line.name;
  });

/** Your earlier fix for this misreading (keyed by the normalized OCR text), or for a close one. */
export const correctedName = (read: string, corrections: ReadonlyMap<string, string>) => {
  const key = normalizeReceiptName(read);
  const exact = corrections.get(key);
  if (exact !== undefined) return exact;
  const closest = [...corrections]
    .map(([misread, text]) => ({ text, score: similarity(misread, key) }))
    .sort((first, second) => second.score - first.score)[0];
  return closest && closest.score >= SAVED_FIX_SIMILARITY ? closest.text : read;
};
