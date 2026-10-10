/**
 * Code 128 (set B) for Pantrywood's printed labels. Each pattern lists bar/space widths
 * in modules, starting with a bar; values 0–102 are data, 104 is Start B, 106 is Stop.
 */
const PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
];

const START_B = 104;
const STOP = 106;
const FIRST_PRINTABLE = 32;
const LAST_PRINTABLE = 126;
const CHECKSUM_MODULO = 103;

export const isCode128Encodable = (text: string) =>
  text.length > 0 &&
  [...text].every((character) => {
    const code = character.charCodeAt(0);
    return code >= FIRST_PRINTABLE && code <= LAST_PRINTABLE;
  });

export const encodeCode128 = (text: string): number[] => {
  if (!isCode128Encodable(text)) {
    throw new Error("Code 128 set B only encodes printable ASCII.");
  }
  const values = [...text].map(
    (character) => character.charCodeAt(0) - FIRST_PRINTABLE,
  );
  const checksum =
    values.reduce(
      (total, value, index) => total + value * (index + 1),
      START_B,
    ) % CHECKSUM_MODULO;
  return [START_B, ...values, checksum, STOP].flatMap((value) =>
    [...(PATTERNS[value] ?? "")].map(Number),
  );
};

const LABEL_PREFIX = "PW";
const LABEL_DIGITS = 6;

/** A Pantrywood label code for a product without a barcode, e.g. "PW000012". */
export const labelCodeFor = (productId: number) =>
  `${LABEL_PREFIX}${String(productId).padStart(LABEL_DIGITS, "0")}`;
