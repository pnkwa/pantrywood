import type { NextRequest } from "next/server";
import { isAllowedGrocyPath } from "@/lib/grocy/allowed-paths";
import { getGrocyConfig } from "@/lib/grocy/config";
import { handleMockRequest } from "@/lib/grocy/mock/handler";

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type"];
const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "last-modified",
  "etag",
];
const TIMEOUT_MILLISECONDS = 15_000;

const grocyError = (status: number, message: string) =>
  Response.json({ error_message: message }, { status });

const proxy = async (
  request: NextRequest,
  context: RouteContext<"/api/grocy/[...path]">,
) => {
  const { path } = await context.params;
  if (
    path.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    return grocyError(400, "Invalid path.");
  }
  if (!isAllowedGrocyPath(request.method, path.join("/"))) {
    return grocyError(403, "Pantrywood doesn't use this Grocy endpoint.");
  }

  const config = getGrocyConfig();
  if (config.mode === "mock") return handleMockRequest(request, path);
  if (config.mode === "unconfigured")
    return grocyError(500, `Grocy is not configured. ${config.problem}`);

  const target = new URL(
    `api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
    config.baseUrl,
  );

  const headers = new Headers({ "GROCY-API-KEY": config.apiKey });
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MILLISECONDS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    return grocyError(
      timedOut ? 504 : 502,
      timedOut ? "Grocy took too long to answer." : "Could not reach Grocy.",
    );
  }

  const responseHeaders = new Headers({ "cache-control": "no-store" });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
