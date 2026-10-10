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

export type GrocyBody = Record<
  string,
  string | number | boolean | null | undefined
>;

const sendToGrocy = async (
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body?: GrocyBody,
) => {
  const response = await fetch(proxyUrl(path), {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) await throwGrocyError(response);
  return response;
};

/** For Grocy actions whose response body isn't needed. */
export const grocyPost = async (
  path: string,
  body: GrocyBody,
): Promise<void> => {
  await sendToGrocy("POST", path, body);
};

export const grocyPut = async (
  path: string,
  body: GrocyBody,
): Promise<void> => {
  await sendToGrocy("PUT", path, body);
};

export const grocyDelete = async (path: string): Promise<void> => {
  await sendToGrocy("DELETE", path);
};

export const grocyPostFor = async <T>(
  path: string,
  body: GrocyBody,
  schema: z.ZodType<T>,
): Promise<T> => {
  const response = await sendToGrocy("POST", path, body);
  return schema.parse(await response.json());
};
