import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Rules every Pantrywood package shares. Apps that bring their own TypeScript rules (Next) use this. */
export const base = [{ ignores: ["dist/**", ".next/**", "node_modules/**"] }, js.configs.recommended];

/** Base + typescript-eslint, for plain TypeScript packages. */
export default tseslint.config(...base, ...tseslint.configs.recommended);
