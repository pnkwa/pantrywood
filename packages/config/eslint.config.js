import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Shared ESLint base for every Pantrywood package. Apps extend it with their own rules. */
export default tseslint.config(
  { ignores: ["dist/**", ".next/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
