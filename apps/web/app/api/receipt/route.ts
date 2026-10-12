import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ReceiptScanSchema } from "@pantrywood/shared";
import { z } from "zod";
import { getGrocyConfig } from "@/lib/grocy/config";
import { SAMPLE_RECEIPT } from "@/lib/receipt/sample-receipt";

const MODEL = "claude-opus-5-5";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
type ImageType = "image/jpeg" | "image/png" | "image/webp";
const IMAGE_TYPES: ImageType[] = ["image/jpeg", "image/png", "image/webp"];
const MAX_GROUP_NAMES = 60;

const failure = (status: number, message: string) =>
  Response.json({ error_message: message }, { status });

const isImageType = (type: string): type is ImageType =>
  IMAGE_TYPES.some((allowed) => allowed === type);

const GroupNamesSchema = z.array(z.string().max(60)).max(MAX_GROUP_NAMES);

const instructionsFor = (groupNames: string[]) =>
  [
    "Read this shopping receipt photo. It is often Thai, sometimes English or mixed.",
    "List every purchased item line. Keep the printed text in `name`; give a short English product name in `name_en`.",
    "If a line has a multiplier (e.g. 2 x 25.00), set quantity and unit_price from it. Weights like 5kg stay in the name with quantity 1.",
    "Leave out subtotals, VAT, rounding, cash, change, member points and discounts.",
    "Convert Buddhist-era years (e.g. 2569) to Gregorian (2026).",
    groupNames.length > 0
      ? `Pick suggested_group from these product groups only: ${groupNames.join(", ")}.`
      : "Set suggested_group to null.",
  ].join("\n");

export const POST = async (request: Request) => {
  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File)) return failure(400, "Send the receipt photo as `image`.");
  if (!isImageType(image.type)) return failure(415, "The photo must be a JPEG, PNG or WebP image.");
  if (image.size > MAX_IMAGE_BYTES) return failure(413, "That photo is too large. Try a smaller one.");
  const groups = GroupNamesSchema.safeParse(form?.getAll("group") ?? []);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    if (getGrocyConfig().mode === "mock") return Response.json(SAMPLE_RECEIPT);
    return failure(500, "Receipt scanning needs ANTHROPIC_API_KEY in apps/web/.env.local.");
  }

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(ReceiptScanSchema) },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.type,
                data: Buffer.from(await image.arrayBuffer()).toString("base64"),
              },
            },
            { type: "text", text: instructionsFor(groups.success ? groups.data : []) },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return failure(422, "Couldn't read this receipt. Try a sharper, flatter photo.");
    }
    return Response.json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return failure(500, "The ANTHROPIC_API_KEY was not accepted.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      return failure(429, "Too many receipts at once. Try again in a minute.");
    }
    if (error instanceof Anthropic.APIError) {
      return failure(502, `The receipt reader answered ${error.status ?? "with an error"}.`);
    }
    return failure(502, "Couldn't reach the receipt reader.");
  }
};
