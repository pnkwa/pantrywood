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
// A product name found inside a longer line must cover this much of it, unless the line starts with it.
const MIN_COVERAGE = 0.5;

/**
 * Whether a product name stands for the whole line, not just a word in it: "มาม่า ต้มยำกุ้ง" (tom yum shrimp
 * noodles) contains "กุ้ง" (shrimp) but isn't shrimp. Thai puts the head noun first and the flavour after, so
 * a name the line starts with, or one covering most of it, counts; a printed word inside a longer product
 * name ("ทิชชู่" in "กระดาษทิชชู่") always does.
 */
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
        // A name that's only a small word in the line ("กุ้ง" in a tom yum noodle line) shares all its letter
        // pairs with it, which would make it a confident guess; it stays a suggestion instead.
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

  const rememberedId = remembered.get(normalizeReceiptName(printedName));
  if (rememberedId !== undefined && products.some((product) => product.id === rememberedId)) {
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

  const best = scored[0];
  if (best && best.score >= GUESS_THRESHOLD) {
    return { productId: best.id, how: "guess", candidateIds: candidatesBesides(best.id) };
  }
  return { productId: null, how: "none", candidateIds: candidatesBesides(null) };
};
