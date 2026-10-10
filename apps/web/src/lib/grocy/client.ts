import { z } from "zod";

export class GrocyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GrocyError";
  }
}

const ErrorBodySchema = z.object({ error_message: z.string() });

const proxyUrl = (path: string) => `/api/grocy/${path.replace(/^\/+/, "")}`;

const throwGrocyError = async (response: Response): Promise<never> => {
  const body = ErrorBodySchema.safeParse(
    await response.json().catch(() => null),
  );
  throw new GrocyError(
    body.success
      ? body.data.error_message
      : `Grocy answered ${response.status}.`,
    response.status,
  );
};

export const grocyFetch = async <T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(proxyUrl(path), {
    ...init,
    headers: { accept: "application/json", ...init?.headers },
  });
  if (!response.ok) await throwGrocyError(response);
  return schema.parse(await response.json());
};

type GrocyBody = Record<string, string | number | boolean | undefined>;

/** For Grocy actions; their response bodies are not used. */
export const grocyPost = async (
  path: string,
  body: GrocyBody,
): Promise<void> => {
  const response = await fetch(proxyUrl(path), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) await throwGrocyError(response);
};
