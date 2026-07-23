import "server-only";
import type { ColorComboInput } from "@/lib/queries";

type Parsed =
  | { fields: Partial<ColorComboInput> }
  | { error: string; status: number };

const STATUSES = ["active", "inactive"];
const MAX_IMAGE_CHARS = 500_000; // ~350 KB image as base64

// Parse + validate a color-combo body. `requireName` enforces the (required)
// combo name on create; everything else is optional.
export async function parseComboBody(
  request: Request,
  opts: { requireName: boolean },
): Promise<Parsed> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return { error: "Invalid JSON body", status: 400 };
  }

  const fields: Partial<ColorComboInput> = {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  if (has("name")) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return { error: "Colour combo name is required.", status: 400 };
    fields.name = name;
  } else if (opts.requireName) {
    return { error: "Colour combo name is required.", status: 400 };
  }

  if (has("colorwaySelection")) fields.colorwaySelection = str(body.colorwaySelection);
  if (has("pantoneCode")) fields.pantoneCode = str(body.pantoneCode);
  if (has("colorPalette")) fields.colorPalette = str(body.colorPalette);
  if (has("colourFamily")) fields.colourFamily = str(body.colourFamily);
  if (has("generic")) fields.generic = str(body.generic);
  if (has("pack")) fields.pack = str(body.pack);
  if (has("dropName")) fields.dropName = str(body.dropName);
  if (has("month")) fields.month = str(body.month);

  if (has("imageUrl")) {
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
    if (imageUrl && imageUrl.length > MAX_IMAGE_CHARS) {
      return { error: "Image is too large.", status: 413 };
    }
    fields.imageUrl = imageUrl;
  }

  if (has("status")) {
    const status = typeof body.status === "string" ? body.status : "";
    if (!STATUSES.includes(status)) {
      return { error: "Status must be active or inactive.", status: 400 };
    }
    fields.status = status;
  }

  return { fields };
}
