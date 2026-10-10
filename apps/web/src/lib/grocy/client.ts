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

export const grocyFetch = async <T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(`/api/grocy/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: { accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = ErrorBodySchema.safeParse(
      await response.json().catch(() => null),
    );
    throw new GrocyError(
      body.success
        ? body.data.error_message
        : `Grocy answered ${response.status}.`,
      response.status,
    );
  }

  return schema.parse(await response.json());
};
