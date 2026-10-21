// How leaves are earned. No "@/" imports: scripts/leaves.test.mjs runs this file directly with Node.

export const LEAVES_FOR_USING_IN_TIME = 10;
export const LEAVES_PER_RECEIPT = 20;

/** Grocy's date for stock that never expires (NEVER_EXPIRES_DATE in @pantrywood/shared). */
const NEVER_EXPIRES = "2999-12-31";

/** Leaves for using up stock: only when it had a real date and was still within it. Things that never expire earn nothing. */
export const leavesForUsing = (bestBeforeDate: string | null, today: string) =>
  bestBeforeDate !== null && bestBeforeDate !== NEVER_EXPIRES && bestBeforeDate >= today ? LEAVES_FOR_USING_IN_TIME : 0;
