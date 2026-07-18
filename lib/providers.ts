// =============================================================
// Pollinations.ai — sinh ảnh MIỄN PHÍ, không cần API key
// - Text-to-image: model flux / turbo
// - Image-to-image: model kontext, ảnh gốc truyền bằng URL công khai
// Trả về danh sách data URL.
// =============================================================

export type GenMode = "text-to-image" | "image-to-image";

export interface GenerateInput {
  prompt: string;
  mode?: GenMode;
  model?: string; // "flux" | "turbo" | "kontext"
  size?: string; // "1024x1024"
  n?: number; // số ảnh
  imageUrl?: string; // ảnh gốc cho image-to-image (URL công khai)
  token?: string; // token Pollinations (bắt buộc cho img2img/kontext, lấy tại enter.pollinations.ai)
}

export interface GenerateResult {
  images: string[]; // data URL (data:image/...;base64,...)
}

export const MODELS = [
  { value: "flux", label: "flux (chất lượng cao)" },
  { value: "turbo", label: "turbo (nhanh)" },
];

export const SIZES = ["1024x1024", "1024x1792", "1792x1024", "512x512"];

async function toDataUrl(res: Response): Promise<string> {
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "image/jpeg";
  const mime = ct.startsWith("image/") ? ct : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function generateOne(input: GenerateInput): Promise<string> {
  const { prompt, mode = "text-to-image", size = "1024x1024" } = input;
  const [w, h] = size.split("x");
  const seed = Math.floor(Math.random() * 1_000_000);

  // Image-to-image dùng model kontext + tham số image (URL công khai)
  const isImg2Img = mode === "image-to-image";
  const model = isImg2Img ? "kontext" : input.model || "flux";

  let url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w || 1024}&height=${h || 1024}&model=${encodeURIComponent(model)}` +
    `&seed=${seed}&nologo=true`;

  if (isImg2Img) {
    if (!input.imageUrl?.trim()) throw new Error("Cần URL ảnh gốc cho image-to-image");
    if (!input.token?.trim())
      throw new Error(
        "Image-to-image (model kontext) cần TOKEN Pollinations. Lấy token miễn phí tại https://enter.pollinations.ai rồi dán vào ô Token."
      );
    url += `&image=${encodeURIComponent(input.imageUrl.trim())}`;
  }

  const headers: Record<string, string> = {};
  if (input.token?.trim()) headers.Authorization = `Bearer ${input.token.trim()}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.message || j?.error || "";
    } catch {}
    throw new Error(`Pollinations lỗi ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return toDataUrl(res);
}

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  if (!input.prompt?.trim()) throw new Error("Thiếu prompt");
  const n = Math.min(Math.max(input.n || 1, 1), 4);
  const images = await Promise.all(Array.from({ length: n }, () => generateOne(input)));
  return { images };
}
