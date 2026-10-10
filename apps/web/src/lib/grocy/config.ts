import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  MOCK_GROCY: z.enum(["true", "false"]).optional(),
  GROCY_URL: z.url().optional(),
  GROCY_API_KEY: z.string().min(1).optional(),
});

export type GrocyConfig =
  | { mode: "mock" }
  | { mode: "live"; baseUrl: string; apiKey: string }
  | { mode: "unconfigured"; problem: string };

/** Server-only: reads the Grocy connection from apps/web/.env.local. Never import this in client code. */
export function getGrocyConfig(): GrocyConfig {
  const env = EnvSchema.safeParse(process.env);
  if (!env.success) {
    return { mode: "unconfigured", problem: z.prettifyError(env.error) };
  }
  const { MOCK_GROCY, GROCY_URL, GROCY_API_KEY } = env.data;
  if (MOCK_GROCY === "true") return { mode: "mock" };
  if (!GROCY_URL || !GROCY_API_KEY) {
    return {
      mode: "unconfigured",
      problem: "Set GROCY_URL and GROCY_API_KEY in apps/web/.env.local, or MOCK_GROCY=true.",
    };
  }
  // Keep a trailing slash so Grocy can live under a sub-path (https://host/grocy/).
  return { mode: "live", baseUrl: GROCY_URL.replace(/\/*$/, "/"), apiKey: GROCY_API_KEY };
}
