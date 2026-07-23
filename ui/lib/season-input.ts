import "server-only";
import type { SeasonInput } from "@/lib/queries";

const MAX_IMAGE_CHARS = 500_000; // ~350 KB image as base64
const STATUSES = ["active", "inactive"];

// Best-effort short code from a season name, e.g. "Burnt Toast AW 26" → "AW26".
// Mirrors the client helper so direct API callers get the same behaviour.
export function deriveGeneric(name: string): string | null {
  const match = name.match(/\b(SS|AW|SP|FW|PF|RS)\s*'?\s*(\d{2,4})\b/i);
  return match ? `${match[1].toUpperCase()}${match[2]}` : null;
}

type Parsed =
  | { fields: Partial<SeasonInput> }
  | { error: string; status: number };

// Parse + validate a season request body. Only keys actually present are copied,
// so PATCH does partial updates. `requireName` enforces a non-empty name on POST.
export async function parseSeasonBody(
  request: Request,
  opts: { requireName: boolean },
): Promise<Parsed> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return { error: "Invalid JSON body", status: 400 };
  }

  const fields: Partial<SeasonInput> = {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  if (has("name")) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return { error: "Season name is required.", status: 400 };
    fields.name = name;
  } else if (opts.requireName) {
    return { error: "Season name is required.", status: 400 };
  }

  if (has("generic")) fields.generic = str(body.generic);
  if (has("businessUnit")) fields.businessUnit = str(body.businessUnit);
  if (has("department")) fields.department = str(body.department);

  if (has("imageUrl")) {
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
    if (imageUrl && imageUrl.length > MAX_IMAGE_CHARS) {
      return { error: "Image is too large.", status: 413 };
    }
    fields.imageUrl = imageUrl;
  }

  if (has("seasonCompleteDate")) {
    const raw = str(body.seasonCompleteDate);
    if (raw) {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) {
        return { error: "Invalid season complete date.", status: 400 };
      }
      fields.seasonCompleteDate = date.toISOString();
    } else {
      fields.seasonCompleteDate = null;
    }
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
