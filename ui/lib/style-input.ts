import "server-only";
import type { StyleEditable } from "@/lib/queries";

type Parsed =
  | { fields: Partial<StyleEditable> }
  | { error: string; status: number };

const STATUSES = ["active", "inactive"];
const MAX_IMAGE_CHARS = 500_000; // ~350 KB image as base64

// Parse + validate a style request body. Only present keys are copied (so PATCH
// is partial). `requireName` enforces a style name on create.
export async function parseStyleBody(
  request: Request,
  opts: { requireName: boolean },
): Promise<Parsed> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return { error: "Invalid JSON body", status: 400 };
  }

  const fields: Partial<StyleEditable> = {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  if (has("styleName")) {
    const styleName = typeof body.styleName === "string" ? body.styleName.trim() : "";
    if (!styleName) return { error: "Style name is required.", status: 400 };
    fields.styleName = styleName;
  } else if (opts.requireName) {
    return { error: "Style name is required.", status: 400 };
  }

  if (has("seasonId")) fields.seasonId = str(body.seasonId);
  if (has("department")) fields.department = str(body.department);
  if (has("brand")) fields.brand = str(body.brand);
  if (has("productType")) fields.productType = str(body.productType);
  if (has("styleType")) fields.styleType = str(body.styleType);
  if (has("templateId")) fields.templateId = str(body.templateId);
  if (has("templateName")) fields.templateName = str(body.templateName);
  if (has("matkl")) fields.matkl = str(body.matkl);
  if (has("businessUnit")) fields.businessUnit = str(body.businessUnit);

  if (has("status")) {
    const status = typeof body.status === "string" ? body.status : "";
    if (!STATUSES.includes(status)) {
      return { error: "Status must be active or inactive.", status: 400 };
    }
    fields.status = status;
  }

  // "Fill later" production fields, editable on the style detail page.
  if (has("pack")) fields.pack = str(body.pack);
  if (has("dropName")) fields.dropName = str(body.dropName);
  if (has("supplierRequest")) fields.supplierRequest = str(body.supplierRequest);
  if (has("colorCombo")) fields.colorCombo = str(body.colorCombo);
  if (has("vendors")) fields.vendors = str(body.vendors);

  if (has("imageUrl")) {
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
    if (imageUrl && imageUrl.length > MAX_IMAGE_CHARS) {
      return { error: "Image is too large.", status: 413 };
    }
    fields.imageUrl = imageUrl;
  }

  if (has("issueDate")) {
    const raw = str(body.issueDate);
    if (raw) {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) {
        return { error: "Invalid issue date.", status: 400 };
      }
      fields.issueDate = date.toISOString();
    } else {
      fields.issueDate = null;
    }
  }

  return { fields };
}
