import type { NextRequest } from "next/server";
import { getGrocyConfig } from "@/lib/grocy/config";
import { handleMockRequest } from "@/lib/grocy/mock/handler";

/*
 * Server-side proxy to Grocy: /api/grocy/<path> → <GROCY_URL>/api/<path>.
 * The API key is added here and never reaches the browser.
 */

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-disposition", "last-modified", "etag"];
const TIMEOUT_MS = 15_000;

function grocyError(status: number, message: string) {
  // Same shape as Grocy's own errors, so the client handles both the same way.
  return Response.json({ error_message: message }, { status });
}

async function proxy(request: NextRequest, ctx: RouteContext<"/api/grocy/[...path]">) {
  const { path } = await ctx.params;
  if (path.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return grocyError(400, "Invalid path.");
  }

  const config = getGrocyConfig();
  if (config.mode === "mock") {
    return handleMockRequest(request.method, path);
  }
  if (config.mode === "unconfigured") {
    return grocyError(500, `Grocy is not configured. ${config.problem}`);
  }

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
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return grocyError(timedOut ? 504 : 502, timedOut ? "Grocy took too long to answer." : "Could not reach Grocy.");
  }

  const responseHeaders = new Headers({ "cache-control": "no-store" });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
