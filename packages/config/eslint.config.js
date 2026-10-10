import js from "@eslint/js";
import tseslint from "typescript-eslint";

export const base = [
  { ignores: ["dist/**", ".next/**", "node_modules/**"] },
  js.configs.recommended,
];

export default tseslint.config(...base, ...tseslint.configs.recommended);
