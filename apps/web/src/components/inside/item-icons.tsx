import type { ReactNode } from "react";

// The 24 default item icons from docs/mockups/ItemIcons.dc.html, drawn on a 64 × 64 grid.
export const ITEM_ICONS = {
  water: (
    <>
      <ellipse cx="32" cy="59" rx="14" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="27" y="7" width="10" height="7" rx="2" fill="#A9C9DA" /><path d="M26,14 h12 l3,6 v32 a6,6 0 0 1 -6,6 h-6 a6,6 0 0 1 -6,-6 v-32 z" fill="#E8F2F4" stroke="#B5CBD1" strokeWidth="1.5" /><rect x="23" y="30" width="18" height="12" fill="#A9C9DA" /><path d="M27,46 v8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  soySauce: (
    <>
      <ellipse cx="32" cy="59" rx="12" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="27" y="6" width="10" height="6" rx="2" fill="#C8755A" /><path d="M28,12 h8 v10 l5,6 v26 a4,4 0 0 1 -4,4 h-10 a4,4 0 0 1 -4,-4 v-26 l5,-6 z" fill="#5E4430" /><rect x="25" y="34" width="14" height="13" rx="2" fill="#FFF6E2" /><rect x="28" y="38" width="8" height="2" fill="#C8755A" />
    </>
  ),
  fishSauce: (
    <>
      <ellipse cx="32" cy="59" rx="12" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="27" y="6" width="10" height="6" rx="2" fill="#8FA67A" /><path d="M28,12 h8 v8 l6,5 v29 a4,4 0 0 1 -4,4 h-12 a4,4 0 0 1 -4,-4 v-29 l6,-5 z" fill="#C08A45" /><path d="M26,30 h4 v22" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="2" fill="none" /><rect x="24" y="34" width="16" height="12" rx="2" fill="#FFFBF3" /><circle cx="32" cy="40" r="3" fill="#8FA67A" />
    </>
  ),
  cookingOil: (
    <>
      <ellipse cx="32" cy="59" rx="15" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="22" y="8" width="9" height="7" rx="2" fill="#D9604A" /><path d="M20,15 h14 l4,6 h4 a4,4 0 0 1 4,4 v29 a4,4 0 0 1 -4,4 h-22 a4,4 0 0 1 -4,-4 v-35 z" fill="#F2D27A" /><path d="M38,22 h4 v12 h-4 z" fill="#F6F0DC" /><rect x="20" y="34" width="22" height="12" rx="2" fill="#FFFBF3" /><path d="M27,40 c0,-4 2,-6 5,-6 0,3 -2,6 -5,6z" fill="#8FA67A" />
    </>
  ),
  milkBottle: (
    <>
      <ellipse cx="32" cy="59" rx="12" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="27" y="5" width="10" height="5" rx="2" fill="#A9C9DA" /><path d="M28,10 h8 v8 q6,4 6,12 v24 a4,4 0 0 1 -4,4 h-12 a4,4 0 0 1 -4,-4 v-24 q0,-8 6,-12 z" fill="#FFFFFF" stroke="#E2DCCF" strokeWidth="1.5" /><rect x="22" y="36" width="20" height="10" fill="#A9C9DA" opacity=".7" />
    </>
  ),
  juice: (
    <>
      <ellipse cx="32" cy="59" rx="12" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="26" y="6" width="12" height="7" rx="2" fill="#8FA67A" /><path d="M27,13 h10 l4,7 v34 a4,4 0 0 1 -4,4 h-10 a4,4 0 0 1 -4,-4 v-34 z" fill="#E9A54F" /><circle cx="32" cy="38" r="7" fill="#FFF1C9" /><circle cx="32" cy="38" r="4" fill="#E9A54F" />
    </>
  ),
  saltShaker: (
    <>
      <ellipse cx="32" cy="59" rx="11" ry="2.5" fill="#4A3B2E" opacity=".1" /><path d="M24,24 q0,-12 8,-12 q8,0 8,12 z" fill="#C9CAC5" /><g fill="#7A6654"><circle cx="29" cy="18" r="1" /><circle cx="35" cy="18" r="1" /><circle cx="32" cy="15" r="1" /></g><rect x="23" y="24" width="18" height="34" rx="5" fill="#FFFFFF" stroke="#E2DCCF" strokeWidth="1.5" /><rect x="25" y="40" width="14" height="16" rx="3" fill="#F3EEE4" />
    </>
  ),
  pepperGrinder: (
    <>
      <ellipse cx="32" cy="59" rx="10" ry="2.5" fill="#4A3B2E" opacity=".1" /><circle cx="32" cy="9" r="3.5" fill="#6E4E33" /><path d="M25,14 h14 l-2,10 q5,4 5,14 v16 a4,4 0 0 1 -4,4 h-12 a4,4 0 0 1 -4,-4 v-16 q0,-10 5,-14 z" fill="#A47551" /><path d="M27,30 v24" stroke="#C49770" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  chiliFlakes: (
    <>
      <ellipse cx="32" cy="59" rx="13" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="20" y="16" width="24" height="9" rx="3" fill="#4A3B2E" /><rect x="21" y="25" width="22" height="33" rx="6" fill="#FBF7EF" stroke="#E2DCCF" strokeWidth="1.5" /><rect x="23" y="34" width="18" height="22" rx="4" fill="#D9604A" /><g fill="#F2D27A"><circle cx="27" cy="40" r="1.2" /><circle cx="35" cy="44" r="1.2" /><circle cx="30" cy="50" r="1.2" /><circle cx="37" cy="52" r="1.2" /></g>
    </>
  ),
  sugarJar: (
    <>
      <ellipse cx="32" cy="59" rx="15" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="17" y="18" width="30" height="8" rx="3" fill="#8FA67A" /><circle cx="32" cy="15" r="3" fill="#8FA67A" /><rect x="18" y="26" width="28" height="32" rx="7" fill="#FBF7EF" stroke="#E2DCCF" strokeWidth="1.5" /><rect x="20" y="36" width="24" height="20" rx="5" fill="#FFFFFF" /><rect x="24" y="30" width="16" height="8" rx="2" fill="#FFF6E2" stroke="#E2DCCF" />
    </>
  ),
  squeezeSauce: (
    <>
      <ellipse cx="32" cy="59" rx="12" ry="2.5" fill="#4A3B2E" opacity=".1" /><path d="M29,4 h6 l1,5 h-8 z" fill="#FFFBF3" stroke="#E2DCCF" /><rect x="25" y="9" width="14" height="7" rx="2" fill="#FFFBF3" stroke="#E2DCCF" /><path d="M24,16 h16 q4,6 4,20 q0,18 -6,22 h-12 q-6,-4 -6,-22 q0,-14 4,-20 z" fill="#D9604A" /><rect x="25" y="30" width="14" height="14" rx="3" fill="#FFF6E2" /><circle cx="32" cy="37" r="3" fill="#D9604A" />
    </>
  ),
  spiceTin: (
    <>
      <ellipse cx="32" cy="58" rx="17" ry="3" fill="#4A3B2E" opacity=".1" /><path d="M16,34 v18 a16,5 0 0 0 32,0 v-18" fill="#E9C077" /><ellipse cx="32" cy="34" rx="16" ry="5" fill="#F2D98F" /><ellipse cx="32" cy="34" rx="12" ry="3.5" fill="#E3BD62" /><rect x="22" y="42" width="20" height="8" rx="2" fill="#FFFBF3" />
    </>
  ),
  cereal: (
    <>
      <ellipse cx="32" cy="59" rx="15" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="18" y="8" width="24" height="50" rx="2" fill="#E9C077" /><path d="M42,8 l5,3 v47 h-5 z" fill="#D9A84E" /><circle cx="30" cy="34" r="7" fill="#FFFBF3" /><g fill="#E3BD62"><circle cx="28" cy="33" r="1.8" /><circle cx="32" cy="35" r="1.8" /><circle cx="30" cy="31" r="1.5" /></g><rect x="21" y="14" width="18" height="6" rx="1" fill="#C8755A" />
    </>
  ),
  pasta: (
    <>
      <ellipse cx="32" cy="59" rx="18" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="12" y="20" width="36" height="38" rx="2" fill="#A9C9DA" /><path d="M48,20 l5,-3 v38 l-5,3 z" fill="#8FB3C4" /><path d="M12,20 l5,-3 h36 l-5,3 z" fill="#C9DDE6" /><rect x="17" y="32" width="26" height="12" rx="3" fill="#FFF6E2" /><path d="M19,38 h22 M19,35 h22 M19,41 h22" stroke="#E9C077" strokeWidth="1.5" />
    </>
  ),
  tea: (
    <>
      <ellipse cx="32" cy="59" rx="17" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="15" y="28" width="32" height="30" rx="2" fill="#8FA67A" /><path d="M47,28 l4,-3 v30 l-4,3 z" fill="#6F8A5E" /><path d="M15,28 l4,-3 h32 l-4,3 z" fill="#A9BC95" /><path d="M27,48 c0,-8 5,-12 11,-12 0,7 -5,12 -11,12z" fill="#FFFBF3" /><path d="M27,48 l7,-7" stroke="#8FA67A" strokeWidth="1.5" />
    </>
  ),
  eggCarton: (
    <>
      <ellipse cx="32" cy="59" rx="22" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="8" y="36" width="48" height="20" rx="4" fill="#E7D3B0" /><path d="M8,40 q6,8 12,0 q6,8 12,0 q6,8 12,0 q6,8 12,0" fill="none" stroke="#D2BC94" strokeWidth="2" /><g fill="#FBF4E6"><ellipse cx="16" cy="34" rx="6" ry="7" /><ellipse cx="28" cy="34" rx="6" ry="7" /><ellipse cx="40" cy="34" rx="6" ry="7" /><ellipse cx="52" cy="34" rx="5" ry="7" fill="#F3DFC2" /></g>
    </>
  ),
  tissueBox: (
    <>
      <ellipse cx="32" cy="59" rx="19" ry="2.5" fill="#4A3B2E" opacity=".1" /><path d="M24,30 q2,-14 8,-14 q4,0 2,6 q6,-4 7,2 q1,4 -5,6 z" fill="#FFFFFF" stroke="#E2DCCF" strokeWidth="1.5" /><rect x="12" y="30" width="40" height="28" rx="3" fill="#F3E9D6" /><rect x="24" y="28" width="16" height="5" rx="2.5" fill="#D9C9AE" /><path d="M12,44 h40" stroke="#E9A9A9" strokeWidth="4" />
    </>
  ),
  milkCarton: (
    <>
      <ellipse cx="32" cy="59" rx="13" ry="2.5" fill="#4A3B2E" opacity=".1" /><path d="M22,22 l10,-12 l10,12 z" fill="#A9C9DA" /><rect x="29" y="6" width="6" height="5" rx="1" fill="#8FB3C4" /><rect x="22" y="22" width="20" height="36" fill="#FFFFFF" stroke="#E2DCCF" strokeWidth="1.5" /><rect x="24" y="32" width="16" height="14" rx="2" fill="#A9C9DA" /><path d="M29,40 c3,-6 6,-6 6,0" fill="none" stroke="#FFFBF3" strokeWidth="2" />
    </>
  ),
  tote: (
    <>
      <ellipse cx="32" cy="59" rx="18" ry="2.5" fill="#4A3B2E" opacity=".1" /><path d="M38,26 l8,-20" stroke="#7FA05E" strokeWidth="5" strokeLinecap="round" /><path d="M40,26 l2,-18" stroke="#A9BC95" strokeWidth="4" strokeLinecap="round" /><path d="M24,24 q0,-14 8,-14 q8,0 8,14" fill="none" stroke="#7E9A68" strokeWidth="3" /><path d="M14,24 h36 l-3,34 h-30 z" fill="#A9BC95" /><path d="M18,30 h28" stroke="#FFFBF3" strokeWidth="1.5" strokeDasharray="3 3" /><path d="M28,46 c0,-6 3,-9 8,-9 0,5 -3,9 -8,9z" fill="#FFFBF3" />
    </>
  ),
  paperBag: (
    <>
      <ellipse cx="32" cy="59" rx="18" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="22" y="4" width="8" height="26" rx="4" fill="#E3BD62" transform="rotate(-12 26 17)" /><path d="M34,22 q2,-12 8,-14 q2,8 -4,14 z" fill="#8FA67A" /><path d="M38,22 q6,-10 12,-8 q-2,8 -10,10 z" fill="#A9BC95" /><path d="M14,22 h36 v36 h-36 z" fill="#C9A77C" /><path d="M14,22 l4,4 4,-4 4,4 4,-4 4,4 4,-4 4,4 4,-4 4,4" fill="none" stroke="#B48E5E" strokeWidth="1.5" /><rect x="22" y="36" width="20" height="12" rx="2" fill="#B48E5E" opacity=".35" />
    </>
  ),
  plasticBag: (
    <>
      <ellipse cx="32" cy="59" rx="17" ry="2.5" fill="#4A3B2E" opacity=".1" /><path d="M20,24 q-2,-14 4,-16 q4,0 4,10 M44,24 q2,-14 -4,-16 q-4,0 -4,10" fill="none" stroke="#C9DDE6" strokeWidth="4" /><path d="M14,22 q18,6 36,0 l-2,32 q-16,6 -32,0 z" fill="#E8F2F4" stroke="#B5CBD1" strokeWidth="1.5" /><circle cx="25" cy="40" r="5" fill="#D9604A" opacity=".55" /><circle cx="36" cy="38" r="6" fill="#8FA67A" opacity=".55" />
    </>
  ),
  riceSack: (
    <>
      <ellipse cx="32" cy="59" rx="19" ry="2.5" fill="#4A3B2E" opacity=".1" /><path d="M24,14 q8,-6 16,0 l-2,4 h-12 z" fill="#EFE4CF" /><rect x="25" y="16" width="14" height="4" rx="2" fill="#C8755A" /><path d="M26,20 h12 q12,6 12,24 q0,12 -6,14 h-24 q-6,-2 -6,-14 q0,-18 12,-24 z" fill="#EFE4CF" /><path d="M18,32 h28 M16,40 h32 M16,48 h32" stroke="#D9C9AE" strokeWidth="1.2" /><rect x="22" y="34" width="20" height="14" rx="3" fill="#FFFBF3" /><text x="32" y="45" textAnchor="middle" fontSize="9" fontWeight="600" fill="#5E7550" fontFamily="IBM Plex Sans Thai, sans-serif">ข้าว</text>
    </>
  ),
  snackBag: (
    <>
      <ellipse cx="32" cy="59" rx="15" ry="2.5" fill="#4A3B2E" opacity=".1" /><path d="M18,10 h28 l-2,6 q4,18 2,36 l2,6 h-28 l2,-6 q-2,-18 2,-36 z" fill="#E9A9A9" /><path d="M18,10 l2,2 2,-2 2,2 2,-2 2,2 2,-2 2,2 2,-2 2,2 2,-2 2,2 2,-2 2,2 2,-2 M18,58 l2,-2 2,2 2,-2 2,2 2,-2 2,2 2,-2 2,2 2,-2 2,2 2,-2 2,2 2,-2 2,2" fill="none" stroke="#D98B8B" strokeWidth="1.2" /><ellipse cx="32" cy="34" rx="9" ry="7" fill="#F2D27A" /><path d="M27,34 q5,-5 10,0" stroke="#E3BD62" strokeWidth="2" fill="none" />
    </>
  ),
  frozenBag: (
    <>
      <ellipse cx="32" cy="59" rx="18" ry="2.5" fill="#4A3B2E" opacity=".1" /><rect x="14" y="12" width="36" height="46" rx="6" fill="#DDEBEE" stroke="#B5CBD1" strokeWidth="1.5" /><path d="M14,20 h36" stroke="#8FB3C4" strokeWidth="3" /><g fill="#FFFFFF"><path d="M24,36 l2,-6 2,6 -2,6 z" /><path d="M38,44 l2,-5 2,5 -2,5 z" /><circle cx="34" cy="30" r="1.5" /><circle cx="22" cy="48" r="1.5" /></g><rect x="22" y="40" width="20" height="10" rx="3" fill="#FFFBF3" opacity=".9" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type ItemIconName = keyof typeof ITEM_ICONS;
